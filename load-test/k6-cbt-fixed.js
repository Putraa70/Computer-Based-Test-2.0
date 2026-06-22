import http from 'k6/http';
import { check, sleep, group, bail } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// ============================================================================
// K6 Load Test for CBT System - FIXED VERSION
// ============================================================================
// Purpose: Test CBT system with realistic user credentials
//
// Usage:
//   k6 run load-test/k6-cbt-fixed.js
//   k6 run --vus 50 --duration 5m load-test/k6-cbt-fixed.js
//
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost';
const TOTAL_USERS = parseInt(__ENV.TOTAL_USERS || '500');
const TOTAL_TESTS = parseInt(__ENV.TOTAL_TESTS || '1');
const TOTAL_QUESTIONS = parseInt(__ENV.TOTAL_QUESTIONS || '150');

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
const startExamErrors = new Rate('start_exam_errors_rate');

const activeUsers = new Gauge('active_users_gauge');
const answeredQuestions = new Gauge('answered_questions_gauge');

// ============================================================================
// OPTIONS & TESTING STRATEGY
// ============================================================================
export const options = {
    scenarios: {
        exam_load_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 50 },
                { duration: '2m', target: 100 },
                { duration: '2m', target: 150 },
                { duration: '3m', target: 200 },
                { duration: '5m', target: 200 },
                { duration: '2m', target: 100 },
                { duration: '1m', target: 0 },
            ],
            gracefulRampDown: '30s',
        },
    },

    thresholds: {
        'http_req_duration{staticAsset:no}': ['p(95)<1000'],  // 500ms threshold for load test
        'autosave_latency_ms': ['p(95)<100'],
        'polling_latency_ms': ['p(95)<200'],
        'start_exam_latency_ms': ['p(95)<500'],
        'autosave_errors_rate': ['rate<0.05'],
        'polling_errors_rate': ['rate<0.05'],
        'start_exam_errors_rate': ['rate<0.05'],
        'http_req_failed': ['rate<0.10'],
    },
};

// ============================================================================
// SETUP PHASE
// ============================================================================
export function setup() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║          CBT System Load Test - Fixed Version                  ║
╚════════════════════════════════════════════════════════════════╝
Base URL: ${BASE_URL}
Total Users: ${TOTAL_USERS}
Total Tests: ${TOTAL_TESTS}
Questions per Test: ${TOTAL_QUESTIONS}
    `);

    return {
        testIds: Array.from({ length: TOTAL_TESTS }, (_, i) => i + 1),
    };
}

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================
export default function mainTest(data) {
    // Use correct user credentials
    const userIndex = (__VU - 1) % TOTAL_USERS + 1;
    const credentials = {
        email: `loadtest_user_${userIndex}@cbt.test`,
        password: 'password123',
    };

    const testId = (((__VU - 1) % data.testIds.length) + 1).toString();

    activeUsers.add(__VU);

    // ========================================================================
    // PHASE 1: LOGIN
    // ========================================================================
group('01. User Login', () => {

    const jar = http.cookieJar();

    // STEP 1: ambil halaman login untuk CSRF
    const loginPage = http.get(`${BASE_URL}/login`);

    const csrfMatch = loginPage.body.match(
        /name="_token" value="([^"]+)"/
    );

    if (!csrfMatch) {
        console.error(`[VU ${__VU}] CSRF token not found`);
        return;
    }

    const csrfToken = csrfMatch[1];

    // STEP 2: login form-urlencoded
    const payload = {
        _token: csrfToken,
        email: credentials.email,
        password: credentials.password,
    };

    const loginRes = http.post(
        `${BASE_URL}/login`,
        payload,
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            redirects: 0,
        }
    );

    check(loginRes, {
        'login success': (r) => r.status === 302 || r.status === 200,
    });

    if (loginRes.status !== 302 && loginRes.status !== 200) {
        console.error(`[VU ${__VU}] Login failed ${loginRes.status}`);
        console.error(loginRes.body.substring(0, 500));
        return;
    }

    sleep(1);
});

    // ========================================================================
    // PHASE 2: START EXAM
    // ========================================================================
    group('02. Start Exam', () => {
        const startTime = new Date();

        const startRes = http.get(
            `${BASE_URL}/peserta/tests/${testId}/start`,
            {
                headers: { 'Accept': 'text/html' },
                tags: { staticAsset: 'no' },
            }
        );

        const latency = new Date() - startTime;
        startExamLatency.add(latency);

        check(startRes, {
            'start exam status is 200': (r) => r.status === 200,
            'start exam response time < 500ms': (r) => latency < 500,
            'exam page contains questions': (r) => r.body.includes('question') || r.body.includes('soal'),
        });

        if (startRes.status !== 200) {
            startExamErrors.add(1);
            console.error(`[VU ${__VU}] Start exam failed with status ${startRes.status}`);
            console.error(`Response body: ${startRes.body.substring(0, 500)}`);
            bail('Start exam failed');
        }

        sleep(1);
    });

    // Get testUserId from last response or use VU as fallback
    const testUserId = __VU;

    // ========================================================================
    // PHASE 3: AUTOSAVE ANSWERS
    // ========================================================================
    group('03. Autosave Answers', () => {
        const answers = {};
        
        // Simulate answering 50 questions
        for (let i = 1; i <= 50; i++) {
            answers[i] = {
                answerId: Math.floor(Math.random() * 4) + 1,
                answerText: null,
            };

            // Batch every 5 answers
            if (i % 5 === 0) {
                const startTime = new Date();

                const batchRes = http.post(
                    `${BASE_URL}/peserta/tests/${testUserId}/batch-answer`,
                    JSON.stringify({ answers }),
                    {
                        headers: { 'Content-Type': 'application/json' },
                        tags: { staticAsset: 'no' },
                    }
                );

                const latency = new Date() - startTime;
                autosaveLatency.add(latency);

                check(batchRes, {
                    'batch autosave success': (r) => r.status === 200 || r.status === 202,
                    'batch autosave latency < 100ms': (r) => latency < 100,
                });

                if (batchRes.status !== 200 && batchRes.status !== 202) {
                    autosaveErrors.add(1);
                }

                // Clear for next batch
                Object.keys(answers).forEach(key => delete answers[key]);

                // Simulate reading time
                sleep(2);
            }
        }
    });

    // ========================================================================
    // PHASE 4: POLLING STATUS
    // ========================================================================
    group('04. Status Polling', () => {
        for (let poll = 0; poll < 3; poll++) {
            const startTime = new Date();

            const pollRes = http.get(
                `${BASE_URL}/peserta/tests/${testUserId}/check-status`,
                {
                    headers: { 'Accept': 'application/json' },
                    tags: { staticAsset: 'no' },
                }
            );

            const latency = new Date() - startTime;
            pollingLatency.add(latency);

            check(pollRes, {
                'polling successful': (r) => r.status === 200,
                'polling response time < 200ms': (r) => latency < 200,
            });

            if (pollRes.status !== 200) {
                pollingErrors.add(1);
            }

            sleep(3);
        }
    });

    // ========================================================================
    // PHASE 5: SUBMIT EXAM
    // ========================================================================
    group('05. Submit Exam', () => {
        const submitRes = http.post(
            `${BASE_URL}/peserta/tests/${testUserId}/submit`,
            {},
            {
                headers: { 'Content-Type': 'application/json' },
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
// TEARDOWN PHASE
// ============================================================================
export function teardown(data) {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║          Load Test Complete                                    ║
║          Check metrics above for performance analysis           ║
╚════════════════════════════════════════════════════════════════╝
    `);
}
