# 🪟 Setup Computer-Based-Test di Windows + Laragon

## 📋 Prerequisites

Pastikan sudah install:

- ✅ Git for Windows (https://git-scm.com/download/win)
- ✅ Laragon (https://laragon.org/download/)
- ✅ k6 (untuk load testing - optional: https://k6.io/docs/getting-started/installation/#windows)

---

## 🚀 Step-by-Step Setup

### **1. Clone Repository**

```cmd
:: Buka Command Prompt atau PowerShell
cd C:\laragon\www

:: Clone repository
git clone git@github.com:Putraa70/Computer-Based-Test-2.0.git cbt
cd cbt
```

### **2. Install Laragon Components**

Buka **Laragon Menu** (klik icon di system tray):

```
Laragon → Services → Toggle ALL ON:
  ✓ Nginx
  ✓ Apache  (atau skip kalau pake Nginx)
  ✓ MySQL
  ✓ PHP
  ✓ Redis
  ✓ Memcached (optional)
```

**Verify Services Running:**

```
Laragon → Services → Check Status
Semua harus berwarna HIJAU
```

### **3. Copy & Configure .env**

```cmd
:: Copy env template
copy .env.example .env

:: Generate app key
php artisan key:generate
```

**Edit `.env` file** (buka dengan Notepad/VS Code):

```env
APP_NAME="Computer Based Test"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cbt_db
DB_USERNAME=root
DB_PASSWORD=

# Cache & Session (PENTING untuk performance!)
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# Mail (optional, untuk development bisa gunakan log)
MAIL_DRIVER=log

# File storage
FILESYSTEM_DISK=public
```

### **4. Install PHP Dependencies**

```cmd
cd C:\laragon\www\cbt

:: Install composer packages
composer install

:: Jika ada error, gunakan Laragon Terminal untuk consistency
:: Klik Laragon Menu → Web (atau Terminal)
```

### **5. Setup Database**

**Di Command Prompt atau Laragon Terminal:**

```cmd
:: Run migrations (buat table)
php artisan migrate

:: Optional: Jalankan seeder (untuk test data)
php artisan db:seed

:: Buat storage symlink (untuk file uploads)
php artisan storage:link
```

**Verify Database Created:**

- Buka browser → http://localhost/adminer (Laragon built-in)
- Login: root / (kosong)
- Database `cbt_db` harus ada dengan tables

### **6. Cache Warming**

```cmd
:: Pre-compile laravel caches
php artisan config:cache
php artisan route:cache
php artisan view:cache

:: Optional: Warm Redis cache untuk test questions
php artisan cache:warm
```

### **7. Verify Installation**

```cmd
:: Test artisan commands
php artisan tinker
>>> exit

:: Check services
php artisan route:list

:: Start dev server (optional, Nginx sudah running)
php artisan serve
```

**Test di Browser:**

```
http://localhost  atau  http://127.0.0.1
```

---

## 🧪 Testing with k6 (Load Test)

### **Option A: k6 Installed Locally**

```cmd
:: Navigate to project folder
cd C:\laragon\www\cbt

:: Run load test (default: 150 user × 3 sesi)
k6 run load-test/full-exam-flow.js

:: Atau custom configuration
k6 run load-test/full-exam-flow.js `
  -e BASE_URL=http://localhost `
  -e TOTAL_USERS=150 `
  -e TOTAL_QUESTIONS=150
```

### **Option B: Docker k6 (Recommended jika k6 belum install)**

```cmd
:: Pastikan Docker Desktop running

:: Run k6 dalam container, test ke localhost host
docker run -v "%CD%\load-test":/scripts `
  -e BASE_URL=http://host.docker.internal `
  grafana/k6 run /scripts/full-exam-flow.js
```

### **Option C: Using npm k6 module (Paling simple)**

```cmd
:: Install npm packages terlebih dahulu
npm install

:: Run via npm script
npm run test:load
```

---

## ⚙️ Troubleshooting Windows Setup

### **1. PHP Command Not Found**

**Masalah:** `php` tidak dikenali di Command Prompt

**Solusi:**

```cmd
:: Gunakan Laragon Terminal
Laragon Menu → Terminal

:: Atau tambah PHP ke PATH (Advanced)
setx PATH "%PATH%;C:\laragon\bin\php\php-version"
```

### **2. Composer Not Found**

**Masalah:** `composer` command error

**Solusi:**

```cmd
:: Gunakan full path
php composer.phar install

:: Atau gunakan Laragon's Composer
Laragon → Tools → Composer
```

### **3. Redis Connection Error**

**Masalah:** `REDIS_CONNECTION_REFUSED`

**Solusi:**

```cmd
:: Pastikan Redis ON di Laragon
Laragon → Services → Redis (toggle ON)

:: Test Redis connection
redis-cli -h 127.0.0.1 -p 6379
:: Harus muncul: 127.0.0.1:6379>
```

### **4. MySQL Connection Error**

**Masalah:** `ERROR 1045 Access Denied`

**Solusi:**

```cmd
:: Verify MySQL running
Laragon → Services → MySQL (harus HIJAU)

:: Restart MySQL
Laragon → Services → Restart All

:: Cek .env DB_PASSWORD kosong atau correct
DB_PASSWORD=  (biarkan kosong untuk default Laragon)
```

### **5. Port Already in Use (Port 80, 3306, 6379)**

**Masalah:** NGINX/MySQL tidak bisa start karena port sudah terpakai

**Solusi - untuk Windows:**

```cmd
:: Find process using port 80
netstat -ano | findstr :80

:: Kill process (ganti PID sesuai output)
taskkill /PID 1234 /F

:: Atau gunakan Laragon untuk switch port
Laragon Menu → Preferences → Port settings
```

### **6. Artisan Migrate Error "No such table"**

**Masalah:** Database tables belum ada

**Solusi:**

```cmd
:: Pastikan DB_DATABASE=cbt_db sudah dibuat di MySQL
mysql -u root -e "CREATE DATABASE IF NOT EXISTS cbt_db;"

:: Baru run migrate
php artisan migrate

:: Atau fresh migrate (delete & recreate semua)
php artisan migrate:fresh
```

### **7. k6 Script Permission Denied**

**Masalah:** Windows tidak bisa execute script

**Solusi:**

```cmd
:: Windows tidak perlu chmod, gunakan langsung:
k6 run load-test/full-exam-flow.js

:: Jika error script not found:
k6 run .\load-test\full-exam-flow.js  (dengan backslash Windows)
```

---

## 📊 Configuration Files untuk Windows

### **.env.windows (Template)**

```env
APP_NAME="CBT - Windows Dev"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cbt_db
DB_USERNAME=root
DB_PASSWORD=

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_DRIVER=log
FILESYSTEM_DISK=public
```

### **php-fpm-cbt.conf (untuk Laragon - jika customize)**

Laragon sudah punya default, tapi jika perlu custom:

```
# C:\laragon\etc\php\php.ini

memory_limit = 512M
max_execution_time = 300
post_max_size = 100M
upload_max_filesize = 100M

[opcache]
opcache.enable = 1
opcache.memory_consumption = 256
opcache.interned_strings_buffer = 16
```

### **MySQL Config (jika customize)**

```
# C:\laragon\etc\mysql\my.ini

[mysqld]
max_connections = 200
innodb_buffer_pool_size = 1GB
```

---

## 🚀 Quick Start Commands Summary

```cmd
:: 1. Clone
git clone git@github.com:Putraa70/Computer-Based-Test-2.0.git cbt
cd cbt

:: 2. Setup .env
copy .env.example .env
php artisan key:generate

:: 3. Database
php artisan migrate

:: 4. Start Laragon Services
Laragon → Toggle All Services On

:: 5. Warm cache
php artisan config:cache
php artisan route:cache
php artisan view:cache

:: 6. Test
php artisan tinker
>>> DB::table('users')->count();
>>> Redis::ping();
>>> exit

:: 7. Load test (jika k6 installed)
k6 run load-test/full-exam-flow.js

:: 8. View in browser
http://localhost
```

---

## ✅ Verification Checklist

- [ ] Laragon semua services ON (Nginx, MySQL, PHP, Redis)
- [ ] `.env` sudah configured (DB, Redis, Cache)
- [ ] `php artisan migrate` berhasil tanpa error
- [ ] Database tables exist di MySQL
- [ ] `php artisan tinker` bisa connect ke DB & Redis
- [ ] Browser bisa buka http://localhost tanpa error
- [ ] k6 script bisa run (jika install k6)

---

## 📝 Development Workflow

```cmd
:: Terminal 1: Laragon Services (already running in background)

:: Terminal 2: Watch CSS/JS changes
npm run dev

:: Terminal 3: Run load tests
k6 run load-test/full-exam-flow.js

:: Terminal 4: Check logs (jika perlu)
tail -f storage/logs/laravel.log  (Linux-style, Windows pakai: type storage/logs/laravel.log)
```

---

## 🎯 Next Steps After Setup

1. ✅ **Verify everything works locally**
    - Login page loads
    - Can create test
    - Can answer questions
    - Can submit exam

2. ✅ **Run k6 load test locally**
    - Baseline performance: p90 should be 100-200ms (local machine)
    - Compare with server performance

3. ✅ **Deploy to actual server** (when ready)
    - Use DEPLOY_PRODUCTION.sh on Ubuntu server
    - Or setup manual on Windows server

4. ✅ **Monitor production**
    - Keep checking PRODUCTION_READY_SIGN_OFF.md
    - Compare test baseline vs production metrics

---

## 💡 Performance Tuning for Windows

**Windows Performance Tips:**

- Windows file I/O slower than Linux → expect 20-30% slower p90
- Disable antivirus scanning on Laravel folders:
    ```
    Windows Defender → Virus & threat protection →
    Manage settings → Add exclusions → C:\laragon\www\cbt
    ```
- Allocate more CPU/RAM to Laragon if running tests:
    ```
    Laragon → Preferences → CPU, RAM settings
    ```

---

## 📞 Need Help?

Common issues:

- **Port conflicts:** Check ports 80, 3306, 6379 not in use
- **Redis fails:** Make sure Redis toggle ON in Laragon services
- **MySQL fails:** Restart MySQL via Laragon
- **PHP not found:** Use Laragon Terminal instead of system Command Prompt
