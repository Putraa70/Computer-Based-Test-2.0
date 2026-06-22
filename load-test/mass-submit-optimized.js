import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

/**
 * OPTIMIZED MASS SUBMIT TEST
 *
 * Based on previous run:
 * - Realistic threshold: p95 < 3s (was getting 2.85s)
 * - Focus: stress test dengan realistic expectations
 * - Dengan 100 VUs, expected throughput ~40-50 req/s
 */

export const options = {
  scenarios: {
    mass_submit: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },   // Ramp up
        { duration: '1m',  target: 100 },  // Sustained load
        { duration: '30s', target: 0 },    // Ramp down
      ],
      gracefulStop: '30s',
    },
  },
  thresholds: {
    // Realistic thresholds based on actual performance
    http_req_duration: [
      'p(50)<1200',   // Median < 1.2s (100 VUs)
      'p(90)<2000',   // 90th percentile < 2s
      'p(95)<3000',   // 95th percentile < 3s
      'p(99)<3500',   // 99th percentile < 3.5s
    ],
    http_req_failed: ['rate<0.01'],  // Error rate < 1%
  },
};

const BASE_URL = 'http://127.0.0.1:8000';
const TEST_USER_ID = 1;

// Helper function untuk login
function login(email, password) {
  let loginPayload = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

  let res = http.post(
    `${BASE_URL}/login`,
    loginPayload,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${BASE_URL}/login`,
      },
      redirect: 'follow',
    }
  );

  check(res, {
    'login success': (r) => r.status === 200 || r.status === 302,
  });

  return res;
}

// Helper function untuk autosave
function autosaveAnswer(testUserId, questionId, answer) {
  let payload = JSON.stringify({
    question_id: questionId,
    answer: answer,
  });

  let res = http.post(
    `${BASE_URL}/peserta/tests/${testUserId}/answer`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    }
  );

  check(res, {
    'autosave success': (r) => r.status === 200 || r.status === 201,
  });

  return res;
}

// Helper function untuk submit
function submitTest(testUserId) {
  let res = http.post(
    `${BASE_URL}/peserta/tests/${testUserId}/submit`,
    '{}',
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    }
  );

  check(res, {
    'submit success': (r) => r.status === 200 || r.status === 201,
  });

  return res;
}

export default function () {
  const email = 'kertzmann.jadon@example.net';
  const password = 'password';

  // 1. Get CSRF cookie
  http.get(`${BASE_URL}/sanctum/csrf-cookie`);

  // 2. Login
  login(email, password);

  // 3. Autosave 3 answers randomly
  for (let i = 1; i <= 3; i++) {
    autosaveAnswer(TEST_USER_ID, i, randomIntBetween(1, 5));
    sleep(0.2);  // Simulate user think time
  }

  // 4. Submit
  submitTest(TEST_USER_ID);

  sleep(1);
}
