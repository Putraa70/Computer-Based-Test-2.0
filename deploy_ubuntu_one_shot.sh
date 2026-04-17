#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_IP="${SERVER_IP:-10.9.4.2}"
APP_NAME="${APP_NAME:-CBT FK}"
APP_ENV="${APP_ENV:-production}"
APP_DEBUG="${APP_DEBUG:-false}"
WEB_USER="${WEB_USER:-www-data}"

DB_CONNECTION="${DB_CONNECTION:-mysql}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_DATABASE="${DB_DATABASE:-cbt_fk}"
DB_USERNAME="${DB_USERNAME:-cbt_server}"
DB_PASSWORD="${DB_PASSWORD:-cbt_pasword}"
DB_APP_HOST="${DB_APP_HOST:-127.0.0.1}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-}"
INSTALL_MYSQL="${INSTALL_MYSQL:-true}"

REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"
OPEN_FIREWALL="${OPEN_FIREWALL:-true}"
LAN_CIDR="${LAN_CIDR:-10.9.0.0/16}"

echo "=============================================================="
echo "  CBT Ubuntu One-Shot Deploy"
echo "  APP_DIR   : ${APP_DIR}"
echo "  SERVER_IP : ${SERVER_IP}"
echo "=============================================================="

if [[ "$EUID" -ne 0 ]]; then
  echo "Error: jalankan script ini dengan sudo/root"
  exit 1
fi

APT_GET_OPTS=(
  "-o" "Acquire::Retries=5"
  "-o" "Acquire::http::Timeout=30"
  "-o" "Acquire::https::Timeout=30"
)

switch_apt_mirror_to_global() {
  if [[ -f /etc/apt/sources.list ]]; then
    sed -i 's|id.archive.ubuntu.com|archive.ubuntu.com|g' /etc/apt/sources.list || true
  fi

  if [[ -f /etc/apt/sources.list.d/ubuntu.sources ]]; then
    sed -i 's|http://id.archive.ubuntu.com/ubuntu|http://archive.ubuntu.com/ubuntu|g' /etc/apt/sources.list.d/ubuntu.sources || true
  fi
}

apt_update_with_retry() {
  export DEBIAN_FRONTEND=noninteractive

  if apt-get "${APT_GET_OPTS[@]}" update -y; then
    return 0
  fi

  echo "APT update gagal, mencoba fallback mirror ke archive.ubuntu.com..."
  switch_apt_mirror_to_global
  apt-get "${APT_GET_OPTS[@]}" update -y
}

apt_install_with_retry() {
  export DEBIAN_FRONTEND=noninteractive

  if apt-get "${APT_GET_OPTS[@]}" install -y --fix-missing "$@"; then
    return 0
  fi

  echo "APT install gagal, mencoba ulang setelah fallback mirror..."
  switch_apt_mirror_to_global
  apt-get "${APT_GET_OPTS[@]}" update -y
  apt-get "${APT_GET_OPTS[@]}" install -y --fix-missing "$@"
}

detect_php_fpm_service() {
  local candidates=(php8.3-fpm php8.2-fpm php8.1-fpm php-fpm)
  for svc in "${candidates[@]}"; do
    if systemctl list-unit-files | grep -q "^${svc}\.service"; then
      echo "$svc"
      return 0
    fi
  done
  return 1
}

detect_mysql_service() {
  local candidates=(mysql mariadb)
  for svc in "${candidates[@]}"; do
    if systemctl list-unit-files | grep -q "^${svc}\.service"; then
      echo "$svc"
      return 0
    fi
  done
  return 1
}

ensure_server_ip_bound() {
  if ip -4 addr show | grep -q "\b${SERVER_IP}/"; then
    echo "IP server terdeteksi pada interface: ${SERVER_IP}"
    return 0
  fi

  echo "PERINGATAN: IP ${SERVER_IP} belum terpasang di interface server."
  echo "Aplikasi tetap di-deploy, tetapi client LAN tidak bisa akses sebelum IP ini aktif."
  echo "Cek: ip -4 addr"
}

install_base_packages() {
  apt_update_with_retry
  apt_install_with_retry \
    software-properties-common \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    unzip \
    git \
    nginx \
    redis-server

  if ! command -v php >/dev/null 2>&1; then
    add-apt-repository -y ppa:ondrej/php
    apt_update_with_retry
  fi

  apt_install_with_retry \
    php8.3-fpm \
    php8.3-cli \
    php8.3-common \
    php8.3-mysql \
    php8.3-xml \
    php8.3-mbstring \
    php8.3-curl \
    php8.3-zip \
    php8.3-bcmath \
    php8.3-intl \
    php8.3-gd

  if [[ "$INSTALL_MYSQL" == "true" ]]; then
    apt_install_with_retry mysql-server
  fi

  if ! command -v composer >/dev/null 2>&1; then
    EXPECTED_SIGNATURE="$(curl -s https://composer.github.io/installer.sig)"
    php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
    ACTUAL_SIGNATURE="$(php -r "echo hash_file('sha384', 'composer-setup.php');")"
    if [[ "$EXPECTED_SIGNATURE" != "$ACTUAL_SIGNATURE" ]]; then
      echo "ERROR: Invalid composer installer signature"
      rm -f composer-setup.php
      exit 1
    fi
    php composer-setup.php --install-dir=/usr/local/bin --filename=composer
    rm -f composer-setup.php
  fi

  if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//;s/\..*//')" -lt 18 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt_install_with_retry nodejs
  fi
}

run_mysql_root_query() {
  local query="$1"

  if [[ -n "$MYSQL_ROOT_PASSWORD" ]]; then
    mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "$query"
    return 0
  fi

  if mysql -uroot -e "SELECT 1" >/dev/null 2>&1; then
    mysql -uroot -e "$query"
    return 0
  fi

  echo "Error: tidak bisa login sebagai root MySQL. Set env MYSQL_ROOT_PASSWORD jika root pakai password."
  return 1
}

setup_mysql_database() {
  if [[ "$DB_CONNECTION" != "mysql" ]]; then
    echo "Skip setup MySQL karena DB_CONNECTION=${DB_CONNECTION}"
    return 0
  fi

  local mysql_service
  mysql_service="$(detect_mysql_service || true)"

  if [[ -z "$mysql_service" ]]; then
    echo "Error: service MySQL/MariaDB tidak ditemukan"
    return 1
  fi

  systemctl enable "$mysql_service"
  systemctl restart "$mysql_service"

  local esc_db esc_user esc_pass esc_host
  esc_db="${DB_DATABASE//\`/}"
  esc_user="${DB_USERNAME//\'/\\\'}"
  esc_pass="${DB_PASSWORD//\'/\\\'}"
  esc_host="${DB_APP_HOST//\'/\\\'}"

  run_mysql_root_query "CREATE DATABASE IF NOT EXISTS \`${esc_db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  run_mysql_root_query "CREATE USER IF NOT EXISTS '${esc_user}'@'${esc_host}' IDENTIFIED BY '${esc_pass}';"
  run_mysql_root_query "ALTER USER '${esc_user}'@'${esc_host}' IDENTIFIED BY '${esc_pass}';"
  run_mysql_root_query "GRANT ALL PRIVILEGES ON \`${esc_db}\`.* TO '${esc_user}'@'${esc_host}'; FLUSH PRIVILEGES;"

  echo "MySQL siap: DB=${DB_DATABASE}, USER=${DB_USERNAME}@${DB_APP_HOST}"
}

prepare_env() {
  cd "$APP_DIR"

  if [[ ! -f .env ]]; then
    cp .env.example .env
  fi

  sed -i "s|^APP_NAME=.*|APP_NAME=\"${APP_NAME}\"|" .env || true
  sed -i "s|^APP_ENV=.*|APP_ENV=${APP_ENV}|" .env || true
  sed -i "s|^APP_DEBUG=.*|APP_DEBUG=${APP_DEBUG}|" .env || true
  sed -i "s|^APP_URL=.*|APP_URL=http://${SERVER_IP}|" .env || true

  sed -i "s|^DB_CONNECTION=.*|DB_CONNECTION=${DB_CONNECTION}|" .env || true
  sed -i "s|^DB_HOST=.*|DB_HOST=${DB_HOST}|" .env || true
  sed -i "s|^DB_PORT=.*|DB_PORT=${DB_PORT}|" .env || true
  sed -i "s|^DB_DATABASE=.*|DB_DATABASE=${DB_DATABASE}|" .env || true
  sed -i "s|^DB_USERNAME=.*|DB_USERNAME=${DB_USERNAME}|" .env || true
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|" .env || true

  if grep -q "^CACHE_DRIVER=" .env; then
    sed -i "s|^CACHE_DRIVER=.*|CACHE_DRIVER=redis|" .env
  else
    echo "CACHE_DRIVER=redis" >> .env
  fi

  if grep -q "^SESSION_DRIVER=" .env; then
    sed -i "s|^SESSION_DRIVER=.*|SESSION_DRIVER=redis|" .env
  else
    echo "SESSION_DRIVER=redis" >> .env
  fi

  if grep -q "^QUEUE_CONNECTION=" .env; then
    sed -i "s|^QUEUE_CONNECTION=.*|QUEUE_CONNECTION=redis|" .env
  else
    echo "QUEUE_CONNECTION=redis" >> .env
  fi

  if grep -q "^REDIS_HOST=" .env; then
    sed -i "s|^REDIS_HOST=.*|REDIS_HOST=${REDIS_HOST}|" .env
  else
    echo "REDIS_HOST=${REDIS_HOST}" >> .env
  fi

  if grep -q "^REDIS_PORT=" .env; then
    sed -i "s|^REDIS_PORT=.*|REDIS_PORT=${REDIS_PORT}|" .env
  else
    echo "REDIS_PORT=${REDIS_PORT}" >> .env
  fi
}

configure_nginx() {
  local php_fpm_service="$1"
  local php_ver
  php_ver="$(echo "$php_fpm_service" | sed -E 's/php([0-9]+\.[0-9]+)-fpm/\1/')"

  local sock="/run/php/php${php_ver}-fpm.sock"
  if [[ ! -S "$sock" ]]; then
    sock="/run/php/${php_fpm_service}.sock"
  fi

  cat > /etc/nginx/sites-available/cbt-exam <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_IP} localhost 127.0.0.1;

    root ${APP_DIR}/public;
    index index.php;

    access_log /var/log/nginx/cbt-access.log;
    error_log /var/log/nginx/cbt-error.log warn;

    client_max_body_size 100m;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:${sock};
        fastcgi_read_timeout 120s;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}

configure_firewall() {
  if [[ "$OPEN_FIREWALL" != "true" ]]; then
    echo "Skip firewall config (OPEN_FIREWALL=${OPEN_FIREWALL})"
    return 0
  fi

  if ! command -v ufw >/dev/null 2>&1; then
    apt_install_with_retry ufw
  fi

  if ufw status | grep -q "Status: active"; then
    ufw allow from "${LAN_CIDR}" to any port 80 proto tcp || true
    ufw allow 22/tcp || true
    echo "UFW aktif: port 80 dibuka untuk LAN ${LAN_CIDR}"
  else
    echo "UFW tidak aktif, skip rule."
  fi
}
EOF

  ln -sf /etc/nginx/sites-available/cbt-exam /etc/nginx/sites-enabled/cbt-exam
  if [[ -f /etc/nginx/sites-enabled/default ]]; then
    rm -f /etc/nginx/sites-enabled/default
  fi

  nginx -t
}

configure_queue_worker() {
  cat > /etc/systemd/system/cbt-queue.service <<EOF
[Unit]
Description=CBT Laravel Queue Worker
After=network.target redis-server.service

[Service]
User=${WEB_USER}
Group=${WEB_USER}
Restart=always
RestartSec=3
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/php ${APP_DIR}/artisan queue:work redis --sleep=1 --tries=3 --timeout=90
StandardOutput=append:${APP_DIR}/storage/logs/queue-worker.log
StandardError=append:${APP_DIR}/storage/logs/queue-worker-error.log

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable cbt-queue.service
}

deploy_app() {
  cd "$APP_DIR"

  chown -R "${WEB_USER}:${WEB_USER}" "$APP_DIR"
  chmod -R 775 storage bootstrap/cache

  composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

  npm install
  npm run build

  if ! grep -q "^APP_KEY=base64:" .env; then
    php artisan key:generate --force
  fi

  php artisan storage:link || true

  php artisan cache:clear
  php artisan config:clear
  php artisan route:clear
  php artisan view:clear

  php artisan migrate --force

  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
  php artisan optimize
}

start_services() {
  local php_fpm_service="$1"

  systemctl enable redis-server
  systemctl restart redis-server

  systemctl enable "$php_fpm_service"
  systemctl restart "$php_fpm_service"

  systemctl enable nginx
  systemctl restart nginx

  systemctl restart cbt-queue.service
}

health_check() {
  echo
  echo "==================== HEALTH CHECK ===================="
  redis-cli ping
  if [[ "$DB_CONNECTION" == "mysql" ]]; then
    if mysqladmin ping -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USERNAME}" -p"${DB_PASSWORD}" --silent; then
      echo "MySQL OK"
    else
      echo "MySQL check gagal"
    fi
  fi
  systemctl --no-pager --full status nginx | head -n 5
  systemctl --no-pager --full status cbt-queue.service | head -n 8
  curl -I "http://${SERVER_IP}" || true
  echo "======================================================"
  echo "Deploy selesai. Akses aplikasi: http://${SERVER_IP}"
}

install_base_packages
ensure_server_ip_bound

PHP_FPM_SERVICE="$(detect_php_fpm_service || true)"
if [[ -z "${PHP_FPM_SERVICE}" ]]; then
  echo "Error: service PHP-FPM tidak ditemukan"
  exit 1
fi

prepare_env
setup_mysql_database
configure_nginx "$PHP_FPM_SERVICE"
configure_firewall
configure_queue_worker
deploy_app
start_services "$PHP_FPM_SERVICE"
health_check
