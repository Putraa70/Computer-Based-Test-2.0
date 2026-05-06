#!/bin/bash
# Quick warm-up test - 100 users to test before heavy load
echo "🔥 Quick Warm-up Test: 100 users before heavy load"
echo ""
TEST_ID=5 VUS=100 TOTAL_USERS=100 TOTAL_QUESTIONS=150 ./production-test.sh
