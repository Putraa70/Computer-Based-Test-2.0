# ============================================
# CBT Windows + Laragon Quick Setup Script
# ============================================
# Usage: .\setup-windows.ps1
# Prerequisites: Laragon installed & running
# PowerShell execution policy:
#   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# ============================================

Write-Host "`n====================================="
Write-Host "CBT Windows Setup - Laragon" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if Laragon services are running
Write-Host "[1/7] Checking Laragon services..." -ForegroundColor Yellow

$mysqlRunning = Get-NetTCPConnection -LocalPort 3306 -ErrorAction SilentlyContinue
if (-not $mysqlRunning) {
    Write-Host "✗ MySQL not running. Please start Laragon services first!" -ForegroundColor Red
    Write-Host "  Laragon Menu > Services > Toggle ALL ON" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ MySQL running" -ForegroundColor Green

$redisRunning = Get-NetTCPConnection -LocalPort 6379 -ErrorAction SilentlyContinue
if (-not $redisRunning) {
    Write-Host "✗ Redis not running. Please start Laragon services first!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Redis running" -ForegroundColor Green
Write-Host ""

# 2. Copy .env file
Write-Host "[2/7] Setting up .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✓ .env already exists (skipping)" -ForegroundColor Green
} else {
    if (Test-Path ".env.windows.example") {
        Copy-Item ".env.windows.example" ".env"
        Write-Host "✓ .env created from .env.windows.example" -ForegroundColor Green
    } else {
        Copy-Item ".env.example" ".env"
        Write-Host "✓ .env created from .env.example" -ForegroundColor Green
    }
}
Write-Host ""

# 3. Generate app key
Write-Host "[3/7] Generating application key..." -ForegroundColor Yellow
php artisan key:generate
Write-Host ""

# 4. Install composer dependencies
Write-Host "[4/7] Installing Composer dependencies..." -ForegroundColor Yellow
composer install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Composer install failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 5. Create database
Write-Host "[5/7] Setting up database..." -ForegroundColor Yellow
$createDb = "CREATE DATABASE IF NOT EXISTS cbt_db;"
mysql -u root -e $createDb 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Could not create database via CLI. Run manually:" -ForegroundColor Yellow
    Write-Host "    mysql -u root -e `"$createDb`"" -ForegroundColor Gray
}

php artisan migrate --force
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Migration failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Database ready" -ForegroundColor Green
Write-Host ""

# 6. Cache configuration
Write-Host "[6/7] Optimizing for performance..." -ForegroundColor Yellow
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan storage:link 2>$null
Write-Host "✓ Caches generated" -ForegroundColor Green
Write-Host ""

# 7. Verification
Write-Host "[7/7] Verifying installation..." -ForegroundColor Yellow
php artisan tinker --execute="exit" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Verification failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ All systems operational" -ForegroundColor Green
Write-Host ""

Write-Host "====================================" -ForegroundColor Green
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access at: http://localhost" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Run load test:" -ForegroundColor Cyan
Write-Host "   k6 run load-test/full-exam-flow.js" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   - Make sure Laragon services stay ON" -ForegroundColor Gray
Write-Host "   - Check http://localhost/adminer for database" -ForegroundColor Gray
Write-Host "   - Use Laragon Terminal for consistent PHP/Composer" -ForegroundColor Gray
Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to close"
