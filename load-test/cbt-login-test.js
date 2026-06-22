import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // naik ke 50
    { duration: '30s', target: 100 },  // naik ke 100
    { duration: '1m',  target: 100 },  // tahan 100 user
    { duration: '30s', target: 0 },    // turun
  ],
};

const BASE_URL = 'http://127.0.0.1:8000';

export default function () {
  // 1️⃣ GET CSRF cookie dari Sanctum
  let csrfRes = http.get(`${BASE_URL}/sanctum/csrf-cookie`);
  check(csrfRes, {
    'csrf cookie obtained': (r) => r.status === 204,
  });

  // 2️⃣ Login dengan form-urlencoded (Laravel standard form login)
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
    'login berhasil': (r) => r.status === 200 || r.status === 302,
  });

  sleep(1);
}
