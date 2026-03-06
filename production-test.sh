#!/bin/bash
# ================================================================
# Production-Ready Load Test Script
# Target: <100ms response time
# ================================================================

set -e

echo "================================================================"
echo "  CBT Production Load Test - Target <100ms Response"
echo "================================================================"
echo ""

# Check server
echo "→ Checking server status..."
if ! pgrep -x "nginx" > /dev/null; then
    echo "✗ Nginx not running! Start with: sudo systemctl start nginx"
    exit 1
fi

if ! pgrep -x "php-fpm8.3" > /dev/null; then
    echo "✗ PHP-FPM not running! Start with: sudo systemctl start php8.3-fpm"
    exit 1
fi

if ! redis-cli ping > /dev/null 2>&1; then
    echo "✗ Redis not running! Start with: sudo systemctl start redis"
    exit 1
fi

echo "✓ All services running"
echo ""

# Check PHP workers
PHP_WORKERS=$(ps aux | grep php-fpm | grep -v grep | wc -l)
echo "→ PHP-FPM workers: $PHP_WORKERS"

if [ "$PHP_WORKERS" -lt 20 ]; then
    echo "⚠ Warning: Only $PHP_WORKERS workers (recommend 50+ for 100 concurrent users)"
fi
echo ""

# Optimize Laravel
echo "→ Optimizing Laravel..."
php artisan config:cache > /dev/null 2>&1
php artisan route:cache > /dev/null 2>&1
php artisan view:cache > /dev/null 2>&1
php artisan optimize > /dev/null 2>&1
echo "✓ Laravel optimized"
echo ""

# Warm up Redis cache (if exists)
if [ -f "artisan" ]; then
    echo "→ Warming Redis cache..."
    php artisan cache:warm > /dev/null 2>&1 || echo "  (cache:warm command not found, skip)"
fi
echo ""

# Run k6 test
echo "→ Starting k6 load test..."
echo "  Target: 500 concurrent users (HEAVY LOAD)"
echo "  Questions: 150 per user"
echo "  Threshold: p(90) < 1500ms (realistic for 500 concurrent)"
echo ""

# Default values (can be overridden)
BASE_URL=${BASE_URL:-http://127.0.0.1}
TEST_ID=${TEST_ID:-1}
TOTAL_USERS=${TOTAL_USERS:-500}
TOTAL_QUESTIONS=${TOTAL_QUESTIONS:-150}
VUS=${VUS:-500}

echo "  BASE_URL: $BASE_URL"
echo "  TEST_ID: $TEST_ID"
echo "  USERS: $TOTAL_USERS"
echo "  QUESTIONS: $TOTAL_QUESTIONS"
echo ""
echo "================================================================"
echo ""

# Run k6 with production settings
BASE_URL=$BASE_URL \
TEST_ID=$TEST_ID \
TOTAL_USERS=$TOTAL_USERS \
TOTAL_QUESTIONS=$TOTAL_QUESTIONS \
VUS=$VUS \
k6 run load-test/full-exam-flow.js

echo ""
echo "================================================================"
echo "  Test Complete!"
echo "================================================================"
echo ""
echo "  Check results above for:"
echo "  • http_req_duration p(90) < 100ms    ← TARGET"
echo "  • http_req_failed < 5%"
echo "  • login_success_rate > 95%"
echo "  • answer_success_rate > 90%"
echo ""
echo "  If thresholds PASSED → Ready for production migration!"
echo "  If thresholds FAILED → Check server capacity & query optimization"
echo ""
