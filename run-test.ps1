# ============================================
# CBT k6 Load Test Runner for Windows
# ============================================
# Usage: .\run-test.ps1 [option]
# Options:
#   (none)   - Run with default settings (150 VU)
#   warm     - Warm-up test (50 users)
#   light    - Light test (100 users)
#   medium   - Medium test (300 users)
#   heavy    - Heavy test (500 users)
# ============================================

param(
    [ValidateSet("warm", "light", "medium", "heavy", IgnoreCase=$true)]
    [string]$LoadType = "medium"
)

$loadConfig = @{
    "warm"   = @{VU = 50;  Desc = "Warm-up Test (50 VU, 150 soal)" }
    "light"  = @{VU = 100; Desc = "Light Test (100 VU, 150 soal)" }
    "medium" = @{VU = 150; Desc = "Medium Test (150 VU, 150 soal)" }
    "heavy"  = @{VU = 500; Desc = "Heavy Test (500 VU, 150 soal)" }
}

$config = $loadConfig[$LoadType]
$baseUrl = "http://localhost"

Write-Host "`n====================================="
Write-Host $config.Desc -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray
Write-Host ""

# Check k6
$k6Path = Get-Command k6 -ErrorAction SilentlyContinue
if (-not $k6Path) {
    Write-Host "✗ k6 not found in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install from: https://k6.io/docs/getting-started/installation/" -ForegroundColor Yellow
    Write-Host "Or run: npm install -g k6" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "Starting test in 3 seconds... (Press Ctrl+C to cancel)" -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""

# Run k6 test
& k6 run load-test/full-exam-flow.js `
    -e BASE_URL=$baseUrl `
    -e TOTAL_USERS=$config.VU `
    -e TOTAL_QUESTIONS=150

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ Test failed with error code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "✓ Test completed successfully!" -ForegroundColor Green
Write-Host ""
