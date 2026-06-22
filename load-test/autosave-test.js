import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
  scenarios: {
    autosave_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 50 },
        { duration: '20s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],       // error < 1%
    http_req_duration: ['p(95)<3000'],    // p95 < 3 detik
  },
};

const BASE_URL = 'http://127.0.0.1:8000';
const TEST_USER_ID = 1;  // Ganti dengan ID test_user yang valid
const EMAIL = 'peserta@example.com';  // Email peserta untuk login
const PASSWORD = 'password';  // Password peserta

export default function () {
  // Login untuk mendapatkan session cookie
  const loginRes = http.post(`${BASE_URL}/login`, {
    email: EMAIL,
    password: PASSWORD,
  });

  check(loginRes, {
    'login success': (r) => r.status === 200 || r.status === 302,
  });

  // Ambil cookie dari response login
  const jar = http.cookieJar();
  const cookies = jar.cookiesForURL(BASE_URL);

  // Kirim jawaban (autosave)
  const payload = JSON.stringify({
    question_id: randomIntBetween(1, 50),
    answer: randomIntBetween(1, 5),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  };

  const res = http.post(
    `${BASE_URL}/peserta/tests/${TEST_USER_ID}/answer`,
    payload,
    params
  );

  check(res, {
    'autosave status 200': (r) => r.status === 200,
  });

  sleep(5); // interval autosave tiap 5 detik
}
