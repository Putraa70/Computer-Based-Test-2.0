import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 50 },
    { duration: '20s', target: 100 },
    { duration: '20s', target: 150 },
    { duration: '40s', target: 150 },
    { duration: '20s', target: 0 },
  ],
};

const BASE_URL = 'http://127.0.0.1:8000';
const TEST_ID = 2;  // Ganti dengan ID test yang ingin di-load test

export default function () {
  // 1️⃣ GET CSRF cookie dari Sanctum
  let csrfRes = http.get(`${BASE_URL}/sanctum/csrf-cookie`);
  check(csrfRes, {
    'csrf cookie obtained': (r) => r.status === 204,
  });

  // 2️⃣ Login dengan form-urlencoded (NOT JSON)
  let loginPayload = 'email=kertzmann.jadon@example.net&password=password';

  let loginRes = http.post(
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

  check(loginRes, {
    'login ok': (r) => r.status === 200 || r.status === 302,
  });

  // 3️⃣ Klik START
  let startRes = http.get(`${BASE_URL}/peserta/tests/${TEST_ID}/start`);

  check(startRes, {
    'start ok': (r) => r.status === 200,
  });

  sleep(1);
}
