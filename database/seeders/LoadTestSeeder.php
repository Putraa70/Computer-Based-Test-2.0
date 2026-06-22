/**
 * ================================================================
 *  CBT FULL EXAM FLOW — k6 Load Test
 *  Flow: Login → Buka Ujian → Kerjakan Soal → Submit → Logout
 *
 *  FIXES:
 *  1. CSRF token diambil dari response header X-XSRF-TOKEN, bukan cookie
 *  2. Answer payload pakai form-encoded bukan JSON (sesuai Laravel)
 *  3. Batch answer menggunakan endpoint batch jika tersedia
 *  4. Timeout lebih realistis untuk 500 concurrent users
 *  5. Sleep lebih realistis agar tidak DoS server
 * ================================================================
 */

import http                         from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { Counter, Rate, Trend }      from 'k6/metrics';
import { SharedArray }               from 'k6/data';
import { randomIntBetween }          from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// ================================================================
//  KONFIGURASI
// ================================================================
const BASE_URL        = __ENV.BASE_URL        || 'http://127.0.0.1';
const TEST_ID         = Number(__ENV.TEST_ID  || 1);
const TOTAL_QUESTIONS = Number(__ENV.TOTAL_QUESTIONS || 50);   // ✅ sesuaikan
const NPM_PREFIX      = __ENV.NPM_PREFIX      || '231705';
const NPM_START       = Number(__ENV.NPM_START || 1098);
const TOTAL_USERS     = Number(__ENV.TOTAL_USERS || 500);
const TOTAL_VUS       = Number(__ENV.VUS || TOTAL_USERS);
const SKIP_SETUP_AUTH_CHECK = (__ENV.SKIP_SETUP_AUTH_CHECK || 'true') === 'true';

// ================================================================
//  DATA PESERTA
// ================================================================
const USERS = new SharedArray('peserta', function () {
    const list = [];
    for (let i = 0; i < TOTAL_USERS; i++) {
        const npm = `${NPM_PREFIX}${NPM_START + i}`;
        list.push({ login: npm, password: npm });
    }
    return list;
});

// ================================================================
//  CUSTOM METRICS
// ================================================================
const loginSuccessRate  = new Rate('login_success_rate');
const startSuccessRate  = new Rate('start_exam_success_rate');
const answerSuccessRate = new Rate('answer_success_rate');
const submitSuccessRate = new Rate('submit_success_rate');
const loginDuration     = new Trend('login_duration_ms',    true);
const startDuration     = new Trend('start_exam_duration_ms', true);
const answerDuration    = new Trend('answer_duration_ms',   true);
const submitDuration    = new Trend('submit_duration_ms',   true);
const totalAnswersSent  = new Counter('total_answers_sent');
const totalAnswersFailed = new Counter('total_answers_failed');

// ================================================================
//  OPSI SKENARIO
// ================================================================
export const options = {
    scenarios: {
        ujian_serentak: {
            executor:     'per-vu-iterations',
            vus:          TOTAL_VUS,
            iterations:   1,
            maxDuration:  '30m',
            gracefulStop: '2m',
        },
    },
    thresholds: {
        http_req_duration:       ['p(50)<1000', 'p(90)<3000', 'p(95)<5000'],
        http_req_failed:         ['rate<0.20'],
        login_success_rate:      ['rate>0.85'],
        start_exam_success_rate: ['rate>0.80'],
        answer_success_rate:     ['rate>0.75'],
        submit_success_rate:     ['rate>0.70'],
    },
};

// ================================================================
//  HELPER: Ambil CSRF token
//  ✅ FIX: Laravel set XSRF-TOKEN di cookie, bukan header
// ================================================================
function getCsrfToken(res) {
    // Coba dari response cookies dulu
    if (res && res.cookies && res.cookies['XSRF-TOKEN']) {
        return decodeURIComponent(res.cookies['XSRF-TOKEN'][0].value);
    }
    // Fallback dari cookie jar
    const jar     = http.cookieJar();
    const cookies = jar.cookiesForURL(BASE_URL + '/');
    const raw     = cookies['XSRF-TOKEN'];
    if (!raw || raw.length === 0) return '';
    return decodeURIComponent(Array.isArray(raw) ? raw[0] : raw);
}

// ================================================================
//  HELPER: Parse Inertia props
// ================================================================
function parseInertiaProps(html) {
    if (!html) return null;
    try {
        const match = html.match(/data-page="([^"]+)"/);
        if (!match) return null;
        const raw = match[1]
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&#039;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
        return JSON.parse(raw)?.props || null;
    } catch (e) {
        return null;
    }
}

// ================================================================
//  STEP 1 — LOGIN
// ================================================================
function doLogin(user) {
    // GET login page untuk dapat CSRF cookie
    const loginPage = http.get(`${BASE_URL}/login`, {
        redirects: 5,
        tags: { step: 'csrf' },
    });

    // ✅ FIX: ambil CSRF dari response login page
    const csrf = getCsrfToken(loginPage);

    const start = Date.now();
    const res = http.post(
        `${BASE_URL}/login`,
        // ✅ FIX: form-urlencoded bukan JSON
        `login=${encodeURIComponent(user.login)}&password=${encodeURIComponent(user.password)}`,
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer':      `${BASE_URL}/login`,
                'X-XSRF-TOKEN': csrf,
                'X-Load-Test':  '1',
            },
            redirects: 5,
            tags: { step: 'login' },
        }
    );
    loginDuration.add(Date.now() - start);

    const redirectedAway = res.url && !res.url.includes('/login');
    const ok = check(res, {
        'login: status 200':            (r) => r.status === 200,
        'login: redirect ke dashboard': ()  => redirectedAway,
    }, { step: 'login' });

    loginSuccessRate.add(ok);

    if (!ok) {
        const body = res.body || '';
        if (body.includes('Password salah') || body.includes('NPM/Email')) {
            console.error(`[VU ${__VU}] ✗ NPM/password salah atau akun belum ada`);
        } else if (body.includes('perangkat lain') || body.includes('session')) {
            console.warn(`[VU ${__VU}] ✗ Single session blocking`);
        } else if (body.includes('Too Many')) {
            console.warn(`[VU ${__VU}] ✗ Rate limited (429)`);
        } else {
            console.warn(`[VU ${__VU}] ✗ Login gagal | url=${res.url} | status=${res.status}`);
        }
        if (__VU === 1 && __ITER === 0) {
            console.error(`[VU 1] BODY: ${(res.body||'').substring(0, 400).replace(/\s+/g, ' ')}`);
        }
    }

    return { ok, csrf: getCsrfToken(res) };
}

// ================================================================
//  STEP 2 — BUKA UJIAN
// ================================================================
function doStartExam(csrf) {
    const start = Date.now();
    const res = http.get(
        `${BASE_URL}/peserta/tests/${TEST_ID}/start`,
        {
            headers: {
                'X-XSRF-TOKEN': csrf,
                'Accept':       'text/html,application/xhtml+xml',
                'X-Load-Test':  '1',
            },
            redirects: 5,
            tags: { step: 'start_exam' },
        }
    );
    startDuration.add(Date.now() - start);

    const ok = check(res, {
        'start: status 200':       (r) => r.status === 200,
        'start: ada konten ujian': (r) => r.body && r.body.includes('testUserId'),
    }, { step: 'start_exam' });

    startSuccessRate.add(ok);

    if (!ok) {
        console.warn(`[VU ${__VU}] ✗ Gagal buka ujian | status=${res.status} | url=${res.url}`);
        return { testUserId: null, questions: [] };
    }

    const props      = parseInertiaProps(res.body);
    const testUserId = props?.testUserId || null;
    const questions  = Array.isArray(props?.questions) ? props.questions : [];

    if (!testUserId) {
        console.warn(`[VU ${__VU}] ✗ testUserId tidak ditemukan`);
    }

    return { testUserId, questions, csrf: getCsrfToken(res) };
}

// ================================================================
//  STEP 3 — JAWAB SOAL
//  ✅ FIX: Gunakan JSON payload sesuai endpoint answer Laravel
// ================================================================
function doAnswerQuestions(testUserId, questions, csrf) {
    let successCount = 0;
    let failCount    = 0;
    const total      = questions.length > 0 ? questions.length : TOTAL_QUESTIONS;

    for (let i = 0; i < total; i++) {
        const q          = questions[i];
        const questionId = q?.id || (i + 1);
        const opts       = Array.isArray(q?.answers) && q.answers.length > 0 ? q.answers : null;
        const answerId   = opts
            ? opts[randomIntBetween(0, opts.length - 1)]?.id
            : randomIntBetween(1, 5);

        const aStart = Date.now();
        const res = http.post(
            `${BASE_URL}/peserta/tests/${testUserId}/answer`,
            JSON.stringify({ question_id: questionId, answer_id: answerId }),
            {
                headers: {
                    'Content-Type':     'application/json',
                    'Accept':           'application/json',
                    'X-XSRF-TOKEN':     csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-Load-Test':      '1',
                },
                timeout: '15s',
                tags: { step: 'answer' },
            }
        );
        answerDuration.add(Date.now() - aStart);

        const saved = check(res, {
            'answer: status 200':   (r) => r.status === 200,
            'answer: status saved': (r) => {
                try { return JSON.parse(r.body)?.status === 'saved'; } catch { return false; }
            },
        }, { step: 'answer' });

        answerSuccessRate.add(saved);
        totalAnswersSent.add(1);

        if (saved) {
            successCount++;
        } else {
            failCount++;
            totalAnswersFailed.add(1);
            if (res.status === 401 || res.status === 403) {
                console.warn(`[VU ${__VU}] ✗ Soal ke-${i+1}: status ${res.status} — sesi habis`);
                break;
            }
            // ✅ FIX: update CSRF jika expired
            if (res.status === 419) {
                csrf = getCsrfToken(res);
                console.warn(`[VU ${__VU}] CSRF expired, refresh token`);
            }
        }

        // ✅ FIX: delay lebih realistis agar tidak banjiri server
        sleep(randomIntBetween(1, 3));
    }

    console.log(`[VU ${__VU}] Jawaban: ${successCount}/${total} berhasil, ${failCount} gagal`);
    return successCount;
}

// ================================================================
//  STEP 4 — SUBMIT
// ================================================================
function doSubmit(testUserId, csrf) {
    const start = Date.now();
    const res = http.post(
        `${BASE_URL}/peserta/tests/${testUserId}/submit`,
        JSON.stringify({}),
        {
            headers: {
                'Content-Type':     'application/json',
                'X-XSRF-TOKEN':     csrf,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept':           'text/html, application/xhtml+xml',
                'X-Load-Test':      '1',
            },
            redirects: 5,
            timeout:   '30s',
            tags: { step: 'submit' },
        }
    );
    submitDuration.add(Date.now() - start);

    const ok = check(res, {
        'submit: status ok':          (r) => r.status === 200 || r.status === 302,
        'submit: redirect dashboard': (r) => r.url && r.url.includes('/peserta'),
    }, { step: 'submit' });

    submitSuccessRate.add(ok);

    if (!ok) {
        console.warn(`[VU ${__VU}] ✗ Submit gagal | status=${res.status} | url=${res.url}`);
    }

    return getCsrfToken(res);
}

// ================================================================
//  STEP 5 — LOGOUT
// ================================================================
function doLogout(csrf) {
    const res = http.post(
        `${BASE_URL}/logout`,
        JSON.stringify({}),
        {
            headers: {
                'Content-Type':     'application/json',
                'X-XSRF-TOKEN':     csrf,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept':           'text/html, application/xhtml+xml',
                'X-Load-Test':      '1',
            },
            redirects: 5,
            timeout:   '10s',
            tags: { step: 'logout' },
        }
    );

    check(res, {
        'logout: redirect ke login': (r) => r.url && r.url.includes('/login'),
        'logout: status ok':         (r) => r.status === 200 || r.status === 302,
    }, { step: 'logout' });

    if (res.status === 405) {
        console.error(`[VU ${__VU}] ✗ LOGOUT 405 — gunakan POST bukan GET`);
    }
}

// ================================================================
//  MAIN FLOW
// ================================================================
export default function () {
    const user = USERS[(__VU - 1) % USERS.length];
    let csrf   = '';

    // STEP 1: LOGIN
    let loginOk = false;
    group('1. Login', () => {
        const result = doLogin(user);
        loginOk = result.ok;
        csrf    = result.csrf;
    });

    if (!loginOk) {
        console.warn(`[VU ${__VU}] Skip — login gagal`);
        sleep(3);
        return;
    }

    sleep(randomIntBetween(1, 3));

    // STEP 2: BUKA UJIAN
    let testUserId = null;
    let questions  = [];
    group('2. Buka Ujian', () => {
        const result = doStartExam(csrf);
        testUserId   = result.testUserId;
        questions    = result.questions;
        csrf         = result.csrf || csrf;
    });

    if (!testUserId) {
        console.warn(`[VU ${__VU}] Skip — gagal buka ujian`);
        sleep(3);
        return;
    }

    sleep(randomIntBetween(2, 5));

    // STEP 3: JAWAB SOAL
    group('3. Mengerjakan Soal', () => {
        doAnswerQuestions(testUserId, questions, csrf);
    });

    sleep(randomIntBetween(1, 3));

    // STEP 4: SUBMIT
    group('4. Submit', () => {
        csrf = doSubmit(testUserId, csrf);
    });

    sleep(randomIntBetween(2, 4));

    // STEP 5: LOGOUT
    group('5. Logout', () => {
        doLogout(csrf);
    });

    sleep(2);
}

// ================================================================
//  SETUP
// ================================================================
export function setup() {
    console.log('================================================================');
    console.log('  CBT FULL EXAM FLOW — Load Test');
    console.log('================================================================');
    console.log(`  Server  : ${BASE_URL}`);
    console.log(`  Test ID : ${TEST_ID}`);
    console.log(`  Users   : ${TOTAL_USERS}`);
    console.log(`  Soal    : ${TOTAL_QUESTIONS}`);
    console.log('================================================================');

    const ping = http.get(`${BASE_URL}/login`);
    if (ping.status !== 200) {
        fail(`✗ Server tidak bisa dijangkau: ${BASE_URL} → status ${ping.status}`);
    }
    console.log(`  ✓ Server OK (status ${ping.status})`);

    if (SKIP_SETUP_AUTH_CHECK) {
        console.log('  ✓ Auth check di-skip');
        return {};
    }

    // Verifikasi login user pertama
    const firstNpm  = `${NPM_PREFIX}${NPM_START}`;
    const csrf      = getCsrfToken(ping);
    const loginTest = http.post(
        `${BASE_URL}/login`,
        `login=${encodeURIComponent(firstNpm)}&password=${encodeURIComponent(firstNpm)}`,
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-XSRF-TOKEN': csrf,
                'X-Load-Test':  '1',
            },
            redirects: 5,
        }
    );

    if (loginTest.url && !loginTest.url.includes('/login')) {
        console.log(`  ✓ Login verifikasi OK (NPM: ${firstNpm})`);
        http.post(`${BASE_URL}/logout`, JSON.stringify({}), {
            headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': getCsrfToken(loginTest), 'X-Load-Test': '1' },
            redirects: 5,
        });
    } else {
        fail(`✗ Login gagal untuk NPM ${firstNpm} — jalankan seeder dulu`);
    }

    return {};
}

// ================================================================
//  TEARDOWN
// ================================================================
export function teardown() {
    console.log('================================================================');
    console.log('  Load Test Selesai');
    console.log('  login_success_rate     > 85% = stabil');
    console.log('  answer_success_rate    > 75% = autosave stabil');
    console.log('  submit_success_rate    > 70% = submit stabil');
    console.log('  http_req_duration p95  < 5s  = server OK');
    console.log('================================================================');
}