import http from 'k6/http';
import { check, sleep, group, bail } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// ============================================================================
// K6 Load Test for CBT System - 100 Concurrent Users
// ============================================================================
// Purpose: Validate that the optimized architecture can handle 100 concurrent
//          users answering 100 questions each with <100ms response time
//
// Usage:
//   k6 run load-test/optimal-cbt-test.js
//   k6 run --vus 100 --duration 10m load-test/optimal-cbt-test.js
//
// Real-time output: https://cloud.k6.io/login (if cloud enabled)
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const TOTAL_USERS = parseInt(__ENV.TOTAL_USERS || '100');
const TOTAL_TESTS = parseInt(__ENV.TOTAL_TESTS || '1');
const TOTAL_QUESTIONS = parseInt(__ENV.TOTAL_QUESTIONS || '100');

// ============================================================================
// CUSTOM METRICS
// ============================================================================
const autosaveLatency = new Trend('autosave_latency_ms');
const pollingLatency = new Trend('polling_latency_ms');
const loginLatency = new Trend('login_latency_ms');
const startExamLatency = new Trend('start_exam_latency_ms');

const autosaveErrors = new Rate('autosave_errors_rate');
const pollingErrors = new Rate('polling_errors_rate');
const loginErrors = new Rate('login_errors_rate');

const activeUsers = new Gauge('active_users_gauge');
const answeredQuestions = new Gauge('answered_questions_gauge');

// ============================================================================
// OPTIONS & TESTING STRATEGY
// ============================================================================
export const options = {
    scenarios: {
        // Ramp up to 100 users over 2 minutes
        exam_load_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 10 },    // Ramp to 10 (warmup)
                { duration: '1m', target: 50 },     // Ramp to 50
                { duration: '1m', target: 100 },    // Ramp to 100
                { duration: '5m', target: 100 },    // Sustained load (5 minutes)
                { duration: '30s', target: 50 },    // Ramp down
                { duration: '30s', target: 0 },     // Cool down
            ],
            gracefulRampDown: '30s',
        },
    },

    // ========================================================================
    // THRESHOLDS: Pass/Fail Criteria for <100ms requirement
    // ========================================================================
    thresholds: {
        // 🎯 PRIMARY METRIC: Response time <100ms (p95)
        'http_req_duration{staticAsset:no}': ['p(95)<100', 'p(99)<150'],

        // Autosave performance
        'autosave_latency_ms': ['p(95)<50', 'p(99)<70'],

        // Polling performance
        'polling_latency_ms': ['p(95)<100', 'p(99)<120'],

        // Error rates
        'autosave_errors_rate': ['rate<0.01'],    // <1% error rate
        'polling_errors_rate': ['rate<0.01'],
        'login_errors_rate': ['rate<0.01'],
        'http_req_failed': ['rate<0.001'],        // <0.1% overall failure

        // Connection status
        'http_req_connecting': ['p(99)<5'],       // <5ms to connect
    },

    // Bail on too many errors
    ext: {
        loadimpact: {
            // Cloud execution (if using cloud)
            // projectID: 3388888,
            // name: 'CBT System Load Test',
        },
    },
};

// ============================================================================
// SETUP PHASE: Initialize test data
// ============================================================================
export function setup() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║          CBT System Load Test - Setup Phase                    ║
╚════════════════════════════════════════════════════════════════╝
Base URL: ${BASE_URL}
Total Users: ${TOTAL_USERS}
Total Tests: ${TOTAL_TESTS}
Questions per Test: ${TOTAL_QUESTIONS}
    `);

    // Setup phase - executed once before main test
    return {
        testIds: Array.from({ length: TOTAL_TESTS }, (_, i) => i + 1),
    };
}

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================
export default function mainTest(data) {
    const userId = `user_${__VU}_${__ITER}`;
    const testId = (((__VU - 1) % data.testIds.length) + 1).toString();
    const credentials = {
        email: `${userId}@test.local`,
        password: 'password',
    };

    activeUsers.add(__VU);

    // ========================================================================
    // PHASE 1: LOGIN
    // ========================================================================
    group('01. User Login', () => {
        const startTime = new Date();
        const loginRes = http.post(`${BASE_URL}/login`, credentials, {
            headers: { 'Content-Type': 'application/json' },
            tags: { staticAsset: 'no' },
        });

        const latency = new Date() - startTime;
        loginLatency.add(latency);

        if (loginRes.status !== 200 && loginRes.status !== 302) {
            loginErrors.add(1, { error: loginRes.status });
            bail('Login failed: ' + loginRes.status);
        }

        check(loginRes, {
            'login status is 200 or 302': (r) => r.status === 200 || r.status === 302,
            'login response time < 100ms': (r) => latency < 100,
        });

        sleep(0.5);
    });

    // Extract CSRF token and session if needed
    const indexRes = http.get(`${BASE_URL}/peserta/tests`, {
        tags: { staticAsset: 'no' },
    });

    // ========================================================================
    // PHASE 2: START EXAM
    // ========================================================================
    group('02. Start Exam', () => {
        const startTime = new Date();
        const startRes = http.get(`${BASE_URL}/peserta/tests/${testId}/start`, {
            headers: { 'Accept': 'text/html' },
            tags: { staticAsset: 'no' },
        });

        const latency = new Date() - startTime;
        startExamLatency.add(latency);

        check(startRes, {
            'exam started successfully': (r) => r.status === 200,
            'start exam response time < 200ms': (r) => latency < 200,
        });

        sleep(1); // Simulate reading exam instructions
    });

    // ========================================================================
    // PHASE 3: ANSWER QUESTIONS (Batched Autosave)
    // ========================================================================
    group('03. Answer Questions (Batched Autosave)', () => {
        const batchSize = 5;  // Accumulate 5 answers before batch save
        const answers = {};

        for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
            // Generate answer for question
            answers[i] = {
                answerId: (Math.floor(Math.random() * 4) + 1).toString(),
                answerText: null,
            };

            // Send batch every N answers
            if (i % batchSize === 0) {
                const startTime = new Date();

                const batchRes = http.post(
                    `${BASE_URL}/peserta/tests/${userId}/batch-answer`,
                    JSON.stringify({ answers }),
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        tags: { staticAsset: 'no' },
                    }
                );

                const latency = new Date() - startTime;
                autosaveLatency.add(latency);

                check(batchRes, {
                    'batch autosave queued (202)': (r) => r.status === 202 || r.status === 200,
                    'batch autosave latency < 50ms': (r) => latency < 50,
                });

                if (batchRes.status !== 202 && batchRes.status !== 200) {
                    autosaveErrors.add(1, { batchSize });
                }

                answeredQuestions.add(i);

                // Clear answers dict for next batch
                Object.keys(answers).forEach(key => delete answers[key]);

                // Simulate reading time between questions (2-4 seconds)
                sleep(2 + Math.random() * 2);
            }
        }

        // Save remaining answers
        if (Object.keys(answers).length > 0) {
            const startTime = new Date();

            const finalRes = http.post(
                `${BASE_URL}/peserta/tests/${userId}/batch-answer`,
                JSON.stringify({ answers }),
                {
                    tags: { staticAsset: 'no' },
                }
            );

            const latency = new Date() - startTime;
            autosaveLatency.add(latency);

            check(finalRes, {
                'final batch saved': (r) => r.status === 202 || r.status === 200,
            });
        }
    });

    // ========================================================================
    // PHASE 4: POLLING (Status Checks)
    // ========================================================================
    group('04. Status Polling (Every 8 seconds)', () => {
        for (let poll = 0; poll < 3; poll++) {
            const startTime = new Date();

            const pollRes = http.get(
                `${BASE_URL}/peserta/tests/${userId}/check-status`,
                {
                    headers: { 'Accept': 'application/json' },
                    tags: { staticAsset: 'no' },
                }
            );

            const latency = new Date() - startTime;
            pollingLatency.add(latency);

            check(pollRes, {
                'polling successful': (r) => r.status === 200,
                'polling response time < 100ms': (r) => latency < 100,
                'has remaining_seconds': (r) => {
                    try {
                        return r.json()?.remaining_seconds !== undefined;
                    } catch {
                        return false;
                    }
                },
            });

            if (pollRes.status !== 200) {
                pollingErrors.add(1);
            }

            // Simulate polling interval (8 seconds)
            sleep(8);
        }
    });

    // ========================================================================
    // PHASE 5: SUBMIT EXAM
    // ========================================================================
    group('05. Submit Exam', () => {
        const submitRes = http.post(
            `${BASE_URL}/peserta/tests/${userId}/submit`,
            {},
            {
                tags: { staticAsset: 'no' },
            }
        );

        check(submitRes, {
            'submit successful': (r) => r.status === 200 || r.status === 302,
        });
    });

    activeUsers.add(-1);
}

// ============================================================================
// TEARDOWN PHASE: Cleanup & Summary
// ============================================================================
export function teardown(data) {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║          Test Complete - Check Results Above                   ║
╚════════════════════════════════════════════════════════════════╝
    `);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract JWT or session token from response headers
 */
function extractToken(response) {
    // Look for Authorization header
    const authHeader = response.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    // Look for Set-Cookie
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
        // Parse session ID from cookie
        return setCookie.split(';')[0];
    }

    return '';
}

// ============================================================================
// EXPECTED RESULTS (with optimizations)
// ============================================================================
// If all thresholds pass:
//
// ✅ http_req_duration (p95): 85ms          (Target: <100ms)
// ✅ autosave_latency (p95): 45ms           (From 500ms baseline)
// ✅ polling_latency (p95): 90ms            (From 300ms baseline)
// ✅ autosave_errors: 0.3%                  (From 5% baseline)
// ✅ polling_errors: 0.2%
// ✅ RPS sustained: ~800 req/sec             (100 users × 8 req/sec)
//
// System Performance:
// - PHP-FPM: 256 workers × ~2-3 requests/sec = ~600 RPS capacity
// - Batch saves: 100 questions × 100 users = 10,000 writes
//   → Reduced to 2,000 batch operations (5x reduction)
// - Session locks: Eliminated (move from DB sessions to Redis)
// - DB transaction conflicts: Reduced via batching & async queue
//
// ============================================================================
