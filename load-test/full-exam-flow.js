/**
 * ================================================================
 *  CBT FULL EXAM FLOW — k6 Load Test
 *  Flow: Login → Buka Ujian → Kerjakan 150 Soal → Submit
 *
 *  Target: Laragon Windows, RAM 8GB, LAN 500 PC
 *  Dibuat: 2026-03-05
 * ================================================================
 *
 *  PERSIAPAN (jalankan di server sebelum test):
 *  1. Pastikan ada 500 user peserta aktif di DB
 *  2. Pastikan ujian (TEST_ID) sudah aktif & dalam window waktu
 *  3. Pastikan setiap user masuk group yang punya akses ke ujian itu
 *  4. php artisan config:cache route:cache
 *  5. php artisan optimize
 *
 *  CARA JALANKAN:
 *  k6 run load-test/full-exam-flow.js
 *
 *  CARA JALANKAN + SIMPAN HASIL HTML:
 *  k6 run --out json=hasil.json load-test/full-exam-flow.js
 * ================================================================
 */

import http            from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { SharedArray }  from 'k6/data';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// ================================================================
//  KONFIGURASI — SESUAIKAN SEBELUM MENJALANKAN
// ================================================================

// IP/hostname server Laragon di LAN (cek via ipconfig di Windows server)
// Contoh LAN: 'http://192.168.1.10'  |  Lokal Laragon: 'http://127.0.0.1:8000'
// PRODUCTION: Gunakan Nginx port 80, BUKAN artisan serve port 8000
const BASE_URL       = __ENV.BASE_URL || 'http://127.0.0.1';

// ID ujian di tabel `tests` (pastikan is_active=1, waktu masih valid)
const TEST_ID        = Number(__ENV.TEST_ID || 1);

// Jumlah soal dalam ujian (sesuaikan dengan data sebenarnya)
const TOTAL_QUESTIONS = Number(__ENV.TOTAL_QUESTIONS || 150);

// ⚠️  LOGIN FIELD = 'login' (bukan 'email') — server terima NPM atau Email
// Format NPM: NPM_PREFIX + nomor urut
// Contoh: '231705' + 1098 = '2317051098', '2317051099', dst.
const NPM_PREFIX    = '231705';      // 6 digit awal NPM (sesuaikan angkatan)
const NPM_START     = 1098;          // nomor urut pertama (contoh: 2317051098)
const USER_PASSWORD = '2317051098';  // password default (ubah jika tiap user beda)
// HEAVY LOAD MODE: 500 concurrent users
const TOTAL_USERS   = Number(__ENV.TOTAL_USERS || 500);
const TOTAL_VUS     = Number(__ENV.VUS || TOTAL_USERS);
const SKIP_SETUP_AUTH_CHECK = (__ENV.SKIP_SETUP_AUTH_CHECK || 'true') === 'true';

// ================================================================
//  DATA PESERTA (Dibaca 1x, shared antar VU)
// ================================================================

const USERS = new SharedArray('peserta', function () {
    const list = [];
    for (let i = 0; i < TOTAL_USERS; i++) {
        // Generate NPM unik per VU: NPM_PREFIX + (NPM_START + i)
        // Contoh: 2317051098, 2317051099, 2317051100, ...
        const npm = `${NPM_PREFIX}${NPM_START + i}`;
        list.push({
            login:    npm,   // field 'login' (server terima NPM atau Email)
            password: npm,   // password = NPM masing-masing (ubah jika perlu)
            name:     `Peserta ${npm}`,
        });
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

const loginDuration    = new Trend('login_duration_ms',  true);
const startDuration    = new Trend('start_exam_duration_ms', true);
const answerDuration   = new Trend('answer_duration_ms', true);
const submitDuration   = new Trend('submit_duration_ms', true);

const totalAnswersSent    = new Counter('total_answers_sent');
const totalAnswersFailed  = new Counter('total_answers_failed');

// ================================================================
//  OPSI SKENARIO
// ================================================================

export const options = {
    scenarios: {
        ujian_serentak: {
            // ════════════════════════════════════════════════════
            //  KRITIS: per-vu-iterations bukan ramping-vus!
            //  ramping-vus → VU iterasi terus → login berulang
            //               → single.session blokir login ke-2
            //  per-vu-iterations → tiap VU hanya 1 iterasi
            //                    = 1 peserta mengerjakan 1 ujian
            // ════════════════════════════════════════════════════
            executor:    'per-vu-iterations',
            vus:         TOTAL_VUS,  // Dynamic dari TOTAL_USERS
            iterations:  1,          // WAJIB 1 — 1 VU = 1 ujian selesai
            maxDuration: '20m',      // Batas total (lebih dari cukup untuk 150 soal)
            gracefulStop: '60s',
        },
    },

    // ---- HEAVY LOAD THRESHOLDS: 500 concurrent users ----
    thresholds: {
        http_req_duration: [
            'p(50)<500',     // Median < 500ms
            'p(90)<1500',    // 90% request < 1.5s
            'p(95)<3000',    // 95% request < 3s
        ],
        http_req_failed: ['rate<0.15'],  // Total error < 15%

        login_success_rate:      ['rate>0.85'],
        start_exam_success_rate: ['rate>0.80'],
        answer_success_rate:     ['rate>0.75'],
        submit_success_rate:     ['rate>0.70'],
    },
};

// ================================================================
//  HELPER: Ambil CSRF token dari cookie XSRF-TOKEN Laravel
// ================================================================

function getCsrfToken() {
    const jar     = http.cookieJar();
    const cookies = jar.cookiesForURL(BASE_URL + '/');
    const raw     = cookies['XSRF-TOKEN'];
    if (!raw || raw.length === 0) return '';
    return decodeURIComponent(raw[0]);
}

// ================================================================
//  HELPER: Parse data Inertia dari HTML response
//  Laravel Inertia menyimpan props di: <div id="app" data-page="...">
// ================================================================

function parseInertiaProps(html) {
    if (!html) return null;
    try {
        // Cari atribut data-page="..."
        const match = html.match(/data-page="([^"]+)"/);
        if (!match) return null;

        // Decode HTML entities yang di-encode oleh template engine
        const raw = match[1]
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g,  '&')
            .replace(/&#039;/g, "'")
            .replace(/&lt;/g,   '<')
            .replace(/&gt;/g,   '>');

        return JSON.parse(raw)?.props || null;
    } catch (e) {
        return null;
    }
}

// ================================================================
//  STEP 1 — LOGIN
// ================================================================

function doLogin(user) {
    // 1a. GET halaman login agar Laravel set XSRF-TOKEN cookie
    http.get(`${BASE_URL}/login`, { redirects: 5, tags: { step: 'csrf' } });

    const csrf = getCsrfToken();

    // 1b. POST login — field 'login' menerima NPM atau Email
    const start = Date.now();
    const res = http.post(
        `${BASE_URL}/login`,
        `login=${encodeURIComponent(user.login)}&password=${encodeURIComponent(user.password)}`,
        {
            headers: {
                'Content-Type':  'application/x-www-form-urlencoded',
                'Referer':       `${BASE_URL}/login`,
                'X-XSRF-TOKEN':  csrf,
                    'X-Load-Test':   '1',
            },
            redirects: 5,
            tags: { step: 'login' },
        }
    );
    loginDuration.add(Date.now() - start);

    // Berhasil = URL sudah bukan /login lagi
    const redirectedAway = res.url && !res.url.includes('/login');

    const ok = check(res, {
        'login: status 200':            (r) => r.status === 200,
        'login: redirect ke dashboard': (_)  => redirectedAway,
    }, { step: 'login' });

    loginSuccessRate.add(ok);

    if (!ok) {
        const body = res.body || '';

        // ── Diagnosis spesifik ──────────────────────────────────────────
        if (body.includes('NPM/Email atau Password salah') || body.includes('Password salah')) {
            console.error(`[VU ${__VU}] ✗ NPM/password salah atau akun BELUM ADA → jalankan seeder di server`);
        } else if (body.includes('perangkat lain') || body.includes('session')) {
            console.warn(`[VU ${__VU}] ✗ Single session blocking`);
        } else if (body.includes('Unknown column') || body.includes('active_session_id')) {
            console.error(`[VU ${__VU}] ✗ MIGRATION BELUM JALAN di server → php artisan migrate`);
        } else if (body.includes('aktif') || body.includes('nonaktif')) {
            console.error(`[VU ${__VU}] ✗ Akun tidak aktif (is_active=0)`);
        } else if (body.includes('Too Many')) {
            console.warn(`[VU ${__VU}] ✗ Rate limited (429)`);
        } else {
            console.warn(`[VU ${__VU}] ✗ LOGIN GAGAL url=${res.url}`);
        }

        // ── Dump 300 karakter pertama body (hanya VU 1, sekali saja) ───
        // Berguna untuk melihat error PHP/Laravel yang sebenarnya
        if (__VU === 1 && __ITER === 0) {
            console.error(`[VU 1] BODY SNIPPET: ${body.substring(0, 400).replace(/\s+/g, ' ')}`);
        }
    }

    return ok;
}

// ================================================================
//  STEP 2 — BUKA UJIAN & AMBIL testUserId + daftar soal
// ================================================================

function doStartExam() {
    const csrf = getCsrfToken();

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
        console.warn(`[VU ${__VU}] ✗ Gagal buka ujian | status: ${res.status} | url: ${res.url}`);
        if (__VU === 1 && __ITER === 0) {
            const snippet = (res.body || '').substring(0, 500).replace(/\s+/g, ' ');
            console.warn(`[VU 1] START BODY SNIPPET: ${snippet}`);
        }
        return { testUserId: null, questions: [] };
    }

    // Ekstrak data Inertia props dari HTML
    const props = parseInertiaProps(res.body);
    const testUserId = props?.testUserId || null;

    // Ekstrak array soal beserta pilihan jawaban nyata
    // Struktur: [{id, type, answers: [{id, answer_text}]}]
    const questions = Array.isArray(props?.questions) ? props.questions : [];

    if (!testUserId) {
        console.warn(`[VU ${__VU}] ✗ testUserId tidak ditemukan di response`);
    } else {
        console.log(`[VU ${__VU}] ✓ testUserId=${testUserId}, ${questions.length} soal diterima`);
    }

    return { testUserId, questions };
}

// ================================================================
//  STEP 3 — KERJAKAN SOAL (AUTOSAVE)
//  Mengirim jawaban satu per satu seperti peserta sungguhan
// ================================================================

function doAnswerQuestions(testUserId, questions) {
    const csrf        = getCsrfToken();
    let   successCount = 0;
    let   failCount    = 0;

    // Jika data soal berhasil diparsing, gunakan ID nyata dari DB
    // Jika tidak, fallback ke range ID hardcoded
    const totalToAnswer = questions.length > 0 ? questions.length : TOTAL_QUESTIONS;

    for (let i = 0; i < totalToAnswer; i++) {
        const q = questions[i];

        // Pilih answer_id secara acak dari pilihan yang tersedia (nyata)
        // Fallback ke range ID jika soal gagal diparsing
        let questionId, answerId;
        if (q && q.id) {
            questionId = q.id;
            const opts = Array.isArray(q.answers) && q.answers.length > 0 ? q.answers : null;
            answerId   = opts ? opts[randomIntBetween(0, opts.length - 1)]?.id : null;
        } else {
            // Fallback: gunakan ID sequential (sesuaikan range dengan data DB Anda)
            questionId = i + 1;
            answerId   = randomIntBetween(1, 5);  // 5 pilihan jawaban per soal
        }

        const payload = JSON.stringify({
            question_id: questionId,
            answer_id:   answerId,
        });

        const aStart = Date.now();
        const res = http.post(
            `${BASE_URL}/peserta/tests/${testUserId}/answer`,
            payload,
            {
                headers: {
                    'Content-Type':     'application/json',
                    'Accept':           'application/json',
                    'X-XSRF-TOKEN':     csrf,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer':          `${BASE_URL}/peserta/tests/${TEST_ID}/start`,
                    'X-Load-Test':      '1',
                },
                timeout: '10s',
                tags: { step: 'answer' },
            }
        );
        answerDuration.add(Date.now() - aStart);

        const saved = check(res, {
            'answer: status 200':     (r) => r.status === 200,
            'answer: status saved':   (r) => {
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
            // Jika di-kick karena session/expired, hentikan lebih awal
            if (res.status === 401 || res.status === 403) {
                console.warn(`[VU ${__VU}] ✗ Soal ke-${i+1}: status ${res.status} — kemungkinan sesi habis atau expired`);
                break;
            }
        }

        // Production test: minimal delay untuk max throughput test
        sleep(0.5);
    }

    console.log(`[VU ${__VU}] Jawaban: ${successCount}/${totalToAnswer} berhasil, ${failCount} gagal`);
    return successCount;
}

// ================================================================
//  STEP 4 — SUBMIT UJIAN
// ================================================================

function doSubmit(testUserId) {
    const csrf = getCsrfToken();

    const start = Date.now();
    const res = http.post(
        `${BASE_URL}/peserta/tests/${testUserId}/submit`,
        // Laravel Inertia POST submit — kirim body kosong bukan null
        JSON.stringify({}),
        {
            headers: {
                'Content-Type':     'application/json',
                'X-XSRF-TOKEN':     csrf,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept':           'text/html, application/xhtml+xml',
                'Referer':          `${BASE_URL}/peserta/tests/${TEST_ID}/start`,
                'X-Load-Test':      '1',
            },
            redirects: 5,
            timeout:   '15s',
            tags: { step: 'submit' },
        }
    );
    submitDuration.add(Date.now() - start);

    const ok = check(res, {
        'submit: status ok':          (r) => r.status === 200 || r.status === 302,
        'submit: redirect dashboard': (r) => r.url && r.url.includes('/peserta/dashboard'),
    }, { step: 'submit' });

    submitSuccessRate.add(ok);

    if (ok) {
        console.log(`[VU ${__VU}] ✓ Submit berhasil — testUser ${testUserId}`);
    } else {
        console.warn(`[VU ${__VU}] ✗ Submit gagal | status: ${res.status} | url: ${res.url}`);
    }
}

// ================================================================
//  STEP 5 — LOGOUT (POST — bukan GET!)
//  Laravel route: POST /logout (405 jika pakai GET)
// ================================================================

function doLogout() {
    const csrf = getCsrfToken();

    // WAJIB POST — route Laravel logout tidak menerima GET
    const res = http.post(
        `${BASE_URL}/logout`,
        JSON.stringify({}),
        {
            headers: {
                'Content-Type':     'application/json',
                'X-XSRF-TOKEN':     csrf,
                'X-Load-Test':  '1',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept':           'text/html, application/xhtml+xml',
                'Referer':          `${BASE_URL}/peserta/dashboard`,
            },
            redirects: 5,
            timeout:  '10s',
            tags: { step: 'logout' },
        }
    );

    check(res, {
        // Setelah logout, Laravel redirect ke /login
        'logout: redirect ke login': (r) => r.url && r.url.includes('/login'),
        'logout: status ok':        (r) => r.status === 200 || r.status === 302,
    }, { step: 'logout' });

    if (res.status === 405) {
        console.error(`[VU ${__VU}] ✗ LOGOUT 405 — jangan akses /logout via GET! Selalu gunakan POST.`);
    }
}

// ================================================================
//  MAIN FLOW — Dijalankan tiap iterasi tiap VU
// ================================================================

export default function () {

    // Pilih user unik per VU — VU 1 → USERS[0], VU 2 → USERS[1], dst.
    // Dengan per-vu-iterations + iterations:1, tiap VU dijamin hanya login 1x
    const user = USERS[(__VU - 1) % USERS.length];

    // ─── STEP 1: LOGIN ────────────────────────────────────────
    let loginOk = false;
    group('1. Login', () => {
        loginOk = doLogin(user);
    });

    // KRITIS: cek di LUAR group() — return di dalam group() tidak stop fungsi ini
    if (!loginOk) {
        console.warn(`[VU ${__VU}] Skip — login gagal, tidak lanjut ke ujian`);
        sleep(3);
        return;
    }

    // Cek session cookie ada
    const cookies    = http.cookieJar().cookiesForURL(BASE_URL + '/');
    const hasSession = Object.keys(cookies).some(k => k.includes('session'));
    if (!hasSession) {
        console.warn(`[VU ${__VU}] Tidak ada session cookie setelah login — cek APP_NAME di .env`);
        sleep(3);
        return;
    }

    // Jeda seperti peserta membaca instruksi
    sleep(randomIntBetween(1, 3));

    // ─── STEP 2: BUKA UJIAN ───────────────────────────────────
    let testUserId = null;
    let questions  = [];
    group('2. Buka Ujian', () => {
        const result = doStartExam();
        testUserId = result.testUserId;
        questions  = result.questions;
    });

    if (!testUserId) {
        console.warn(`[VU ${__VU}] Skip — gagal buka ujian (testUserId null)`);
        sleep(3);
        return;
    }

    // Jeda membaca soal pertama
    sleep(randomIntBetween(2, 5));

    // ─── STEP 3: KERJAKAN 150 SOAL ────────────────────────────
    group('3. Mengerjakan Soal', () => {
        doAnswerQuestions(testUserId, questions);
    });

    // Jeda review sebelum submit
    sleep(randomIntBetween(1, 3));

    // ─── STEP 4: SUBMIT ───────────────────────────────────────
    group('4. Submit', () => {
        doSubmit(testUserId);
    });

    // Jeda loading dashboard
    sleep(randomIntBetween(2, 4));

    // ─── STEP 5: LOGOUT ──────────────────────────────────────
    group('5. Logout', () => {
        doLogout();
    });

    // Selesai — per-vu-iterations menjamin tidak ada iterasi ke-2
    sleep(2);
}

// ================================================================
//  PERINGATAN AWAL (ditampilkan saat k6 mulai)
// ================================================================

export function setup() {
    console.log('');
    console.log('================================================================');
    console.log('  CBT FULL EXAM FLOW — Load Test Dimulai');
    console.log('================================================================');
    console.log(`  Server  : ${BASE_URL}`);
    console.log(`  Test ID : ${TEST_ID}`);
    console.log(`  Users   : ${TOTAL_USERS} peserta`);
    console.log(`  Soal    : ${TOTAL_QUESTIONS} soal per peserta`);
    console.log('================================================================');
    console.log('  PASTIKAN:');
    console.log(`  ✓ ${TOTAL_USERS} akun peserta sudah ada di DB server`);
    console.log(`  ✓ NPM: ${NPM_PREFIX}${NPM_START} s/d ${NPM_PREFIX}${NPM_START + TOTAL_USERS - 1}`);
    console.log(`  ✓ Ujian ID=${TEST_ID} aktif & dalam window waktu`);
    console.log('  ✓ Semua migration sudah dijalankan (active_session_id exists)');
    console.log('  ✓ php artisan optimize && config:cache && route:cache');
    console.log('================================================================');
    console.log('');

    // ── Tes 1: Cek server bisa dijangkau ────────────────────────────
    const ping = http.get(`${BASE_URL}/login`);
    if (ping.status !== 200) {
        fail(`✗ Server tidak dapat dijangkau: ${BASE_URL} → status ${ping.status}`);
    }
    console.log(`  ✓ Server dapat dijangkau (status ${ping.status})`);

    if (SKIP_SETUP_AUTH_CHECK) {
        console.log('  ✓ Setup auth pre-check di-skip (SKIP_SETUP_AUTH_CHECK=true)');
        console.log('');
        return {};
    }

    // ── Tes 2: Coba login dengan akun pertama (verifikasi seeder) ──
    // Jika ini gagal → STOP sebelum test besar dimulai
    const firstNpm  = `${NPM_PREFIX}${NPM_START}`;
    const csrfPing  = ping.cookies['XSRF-TOKEN'];
    const csrfVal   = csrfPing ? decodeURIComponent(csrfPing[0].value) : '';

    const loginTest = http.post(
        `${BASE_URL}/login`,
        `login=${encodeURIComponent(firstNpm)}&password=${encodeURIComponent(firstNpm)}`,
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer':      `${BASE_URL}/login`,
                'X-XSRF-TOKEN': csrfVal,
                    'X-Load-Test':  '1',
            },
            redirects: 5,
        }
    );

    const loginOk = loginTest.url && !loginTest.url.includes('/login');
    if (loginOk) {
        console.log(`  ✓ Verifikasi login berhasil (NPM: ${firstNpm})`);

        // ── Tes 3: Coba buka halaman start ujian (deteksi prevent.retake/session) ──
        const startCheck = http.get(`${BASE_URL}/peserta/tests/${TEST_ID}/start`, {
            redirects: 5,
        });

        const startOk = startCheck.status === 200 && startCheck.body && startCheck.body.includes('testUserId');
        if (!startOk) {
            const startBody = startCheck.body || '';
            if (startBody.includes('Anda sudah menyelesaikan ujian ini') || startBody.includes('Akses ditutup')) {
                fail(`✗ VERIFIKASI GAGAL: User ${firstNpm} sudah punya attempt sebelumnya (submitted/expired).\n` +
                     `  Jalankan: php artisan db:seed --class=LoadTestSeeder\n` +
                     `  atau hapus record test_users untuk TEST_ID=${TEST_ID} sebelum k6 run.`);
            }

            fail(`✗ VERIFIKASI GAGAL: Start ujian tidak berhasil untuk TEST_ID=${TEST_ID}.\n` +
                 `  Status: ${startCheck.status} | URL akhir: ${startCheck.url}\n` +
                 `  Cek test masih aktif, window waktu valid, dan user terdaftar di group test.`);
        }
        console.log(`  ✓ Verifikasi start ujian berhasil (TEST_ID: ${TEST_ID})`);

        // Logout agar tidak konflik dengan VU nanti
        http.post(`${BASE_URL}/logout`, JSON.stringify({}), {
            headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfVal, 'X-Load-Test': '1' },
            redirects: 5,
        });
        console.log(`  ✓ Logout verifikasi berhasil`);
    } else {
        const body = loginTest.body || '';
        if (body.includes('Password salah') || body.includes('NPM/Email')) {
            fail(`✗ VERIFIKASI GAGAL: NPM "${firstNpm}" tidak ditemukan di DB!\n` +
                 `  Jalankan dulu di server: php artisan db:seed --class=LoadTestSeeder`);
        } else if (body.includes('perangkat lain') || body.includes('session')) {
            fail(`✗ VERIFIKASI GAGAL: Akun ${firstNpm} masih terikat session lama (single-session guard).\n` +
                 `  Jalankan: php artisan db:seed --class=LoadTestSeeder\n` +
                 `  atau clear manual sessions + active_session_id sebelum k6 run.`);
        } else {
            fail(`✗ VERIFIKASI GAGAL: Login dengan NPM ${firstNpm} tidak berhasil.\n` +
                 `  URL akhir: ${loginTest.url}\n` +
                 `  Cek apakah seeder sudah dijalankan dan password = NPM.`);
        }
    }
    console.log('');
}

export function teardown() {
    console.log('');
    console.log('================================================================');
    console.log('  CBT Load Test Selesai — Cek hasil di atas');
    console.log('================================================================');
    console.log('  Panduan Baca Hasil:');
    console.log('  • login_success_rate     > 90%  = login stabil');
    console.log('  • answer_success_rate    > 80%  = autosave stabil');
    console.log('  • submit_success_rate    > 75%  = submit stabil');
    console.log('  • http_req_duration p95  < 10s  = server bisa napas');
    console.log('  • http_req_failed        < 10%  = error masih wajar');
    console.log('');
    console.log('  Jika ada 405 di logout → pastikan script kirim POST, bukan GET');
    console.log('  Jika banyak FAIL → server butuh optimasi (lihat README)');
    console.log('================================================================');
    console.log('');
}
