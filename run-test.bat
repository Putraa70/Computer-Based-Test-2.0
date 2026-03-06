@echo off
REM ============================================
REM CBT k6 Load Test Runner for Windows
REM ============================================
REM Usage: run-test.bat [option]
REM Options:
REM   (none)        - Run with default settings (150 VU)
REM   warm          - Warm-up test (50 users)
REM   light         - Light test (100 users)
REM   medium        - Medium test (300 users)
REM   heavy         - Heavy test (500 users)
REM ============================================

setlocal enabledelayedexpansion

REM Default: medium load
set LOAD_TYPE=medium
set TOTAL_USERS=150

if not "%~1"=="" (
    set LOAD_TYPE=%~1
)

REM Set VU based on load type
if "%LOAD_TYPE%"=="warm" (
    set TOTAL_USERS=50
    set DESCRIPTION=Warm-up Test (50 VU, 150 soal)
) else if "%LOAD_TYPE%"=="light" (
    set TOTAL_USERS=100
    set DESCRIPTION=Light Test (100 VU, 150 soal)
) else if "%LOAD_TYPE%"=="medium" (
    set TOTAL_USERS=150
    set DESCRIPTION=Medium Test (150 VU, 150 soal)
) else if "%LOAD_TYPE%"=="heavy" (
    set TOTAL_USERS=500
    set DESCRIPTION=Heavy Test (500 VU, 150 soal)
) else (
    echo ✗ Unknown load type: %LOAD_TYPE%
    echo.
    echo Usage: run-test.bat [option]
    echo Options: warm (50), light (100), medium (150), heavy (500)
    exit /b 1
)

echo.
echo =====================================
echo %DESCRIPTION%
echo =====================================
echo.

REM Check if BASE_URL is set
set BASE_URL=http://localhost
echo Base URL: %BASE_URL%

REM Check k6
where k6 >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ✗ k6 not found in PATH
    echo.
    echo Install from: https://k6.io/docs/getting-started/installation/
    echo Or use: npm install -g k6
    echo.
    exit /b 1
)

echo Starting test in 3 seconds... (Press Ctrl+C to cancel)
timeout /t 3 /nobreak

REM Run k6 test
echo.
k6 run load-test/full-exam-flow.js ^
    -e BASE_URL=%BASE_URL% ^
    -e TOTAL_USERS=%TOTAL_USERS% ^
    -e TOTAL_QUESTIONS=150

if %errorlevel% neq 0 (
    echo.
    echo ✗ Test failed with error code %errorlevel%
    exit /b %errorlevel%
)

echo.
echo ✓ Test completed successfully!
echo.

pause
