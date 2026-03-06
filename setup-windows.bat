@echo off
REM ============================================
REM CBT Windows + Laragon Quick Setup Script
REM ============================================
REM Usage: setup-windows.bat
REM Prerequisites: Laragon installed & running
REM ============================================

setlocal enabledelayedexpansion

echo.
echo =====================================
echo CBT Windows Setup - Laragon
echo =====================================
echo.

REM 1. Check if Laragon services are running
echo [1/7] Checking Laragon services...
netstat -ano | findstr ":3306" >nul
if %errorlevel% neq 0 (
    echo ⚠️  MySQL not running. Please start Laragon services first!
    echo    Laragon Menu ^> Services ^> Toggle ALL ON
    exit /b 1
)
echo ✓ MySQL running

netstat -ano | findstr ":6379" >nul
if %errorlevel% neq 0 (
    echo ⚠️  Redis not running. Please start Laragon services first!
    exit /b 1
)
echo ✓ Redis running
echo.

REM 2. Copy .env file
echo [2/7] Setting up .env file...
if exist .env (
    echo ✓ .env already exists (skipping)
) else (
    if exist .env.windows.example (
        copy .env.windows.example .env >nul
        echo ✓ .env created from .env.windows.example
    ) else (
        copy .env.example .env >nul
        echo ✓ .env created from .env.example
    )
)
echo.

REM 3. Generate app key
echo [3/7] Generating application key...
php artisan key:generate
echo.

REM 4. Install composer dependencies
echo [4/7] Installing Composer dependencies...
composer install
if %errorlevel% neq 0 (
    echo ✗ Composer install failed
    exit /b 1
)
echo.

REM 5. Create database
echo [5/7] Setting up database...
mysql -u root -e "CREATE DATABASE IF NOT EXISTS cbt_db;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Could not create database via CLI. Run manually:
    echo    mysql -u root -e "CREATE DATABASE IF NOT EXISTS cbt_db;"
)

php artisan migrate --force
if %errorlevel% neq 0 (
    echo ✗ Migration failed
    exit /b 1
)
echo ✓ Database ready
echo.

REM 6. Cache configuration
echo [6/7] Optimizing for performance...
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan storage:link >nul 2>&1
echo ✓ Caches generated
echo.

REM 7. Verification
echo [7/7] Verifying installation...
php artisan tinker <<EOF >nul 2>&1
exit
EOF

if %errorlevel% neq 0 (
    echo ✗ Verification failed
    exit /b 1
)
echo ✓ All systems operational
echo.

echo =====================================
echo ✅ Setup Complete!
echo =====================================
echo.
echo 🌐 Access at: http://localhost
echo.
echo 📊 Run load test:
echo    k6 run load-test/full-exam-flow.js
echo.
echo 💡 Tips:
echo    - Make sure Laragon services stay ON
echo    - Check http://localhost/adminer for database
echo    - Use Laragon Terminal for consistent PHP/Composer
echo.
echo =====================================

pause
