<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Group;
use App\Models\Module;
use App\Models\Topic;
use App\Models\Question;
use App\Models\Answer;
use App\Models\Test;

/**
 * ================================================================
 *  LOAD TEST SEEDER
 *  Membuat data lengkap untuk k6 load test (full-exam-flow.js):
 *  500 peserta + group + 150 soal + 1 ujian aktif
 * ================================================================
 *
 *  CARA JALANKAN (di CMD Laragon / terminal server):
 *  php artisan db:seed --class=LoadTestSeeder
 *
 *  HAPUS SEMUA DATA LOAD TEST:
 *  php artisan db:seed --class=LoadTestSeeder --fresh   ← tidak ada fresh di seeder
 *  (gunakan Tinker: App\Models\Group::where('name','Load Test K6')->first()->delete())
 *
 *  SETELAH SELESAI TEST, CATAT ID ujian yang dibuat, lalu update di:
 *  load-test/full-exam-flow.js → const TEST_ID = <ID yang dicatat>
 * ================================================================
 */
class LoadTestSeeder extends Seeder
{
    // ── Konfigurasi NPM (sesuaikan dengan k6 script) ──────────────
    const NPM_PREFIX  = '231705';
    const NPM_START   = 1098;      // NPM pertama: 2317051098
    const TOTAL_USERS = 500;       // Buat 500 peserta

    public function run(): void
    {
        $this->command->info('');
        $this->command->info('╔══════════════════════════════════════════════╗');
        $this->command->info('║       CBT LOAD TEST SEEDER                  ║');
        $this->command->info('╚══════════════════════════════════════════════╝');

        DB::transaction(function () {

            // ═══════════════════════════════════════════════════════
            //  STEP 1: BUAT GROUP
            // ═══════════════════════════════════════════════════════
            $this->command->info('');
            $this->command->info('[1/4] Membuat group "Load Test K6"...');

            $group = Group::firstOrCreate([
                'name' => 'Load Test K6',
            ]);

            $this->command->info("      ✓ Group ID: {$group->id}");

            // ═══════════════════════════════════════════════════════
            //  STEP 2: BUAT 500 PESERTA
            //  NPM: 2317051098 sampai 2317051597
            //  Password = NPM masing-masing
            // ═══════════════════════════════════════════════════════
            $this->command->info('');
            $this->command->info('[2/4] Membuat ' . self::TOTAL_USERS . ' peserta (NPM 2317051098 - 2317051597)...');

            $userIds = [];
            $created = 0;
            $skipped = 0;

            for ($i = 0; $i < self::TOTAL_USERS; $i++) {
                $npm   = self::NPM_PREFIX . (self::NPM_START + $i);
                $email = "loadtest_{$npm}@cbt.test";

                // Gunakan firstOrCreate agar aman dijalankan ulang
                $user = User::firstOrCreate(
                    ['npm' => $npm],
                    [
                        'name'      => "Peserta Load Test {$npm}",
                        'email'     => $email,
                        'npm'       => $npm,
                        'password'  => Hash::make($npm), // password = NPM
                        'role'      => 'peserta',
                        'is_active' => true,
                    ]
                );

                // Selalu clear active_session_id agar tidak diblokir single-session guard
                if ($user->active_session_id) {
                    DB::table('sessions')->where('id', $user->active_session_id)->delete();
                    $user->update(['active_session_id' => null]);
                }

                if ($user->wasRecentlyCreated) {
                    $created++;
                } else {
                    $skipped++;
                }

                // Attach ke group (hindari duplikat)
                if (!$user->groups()->where('groups.id', $group->id)->exists()) {
                    $user->groups()->attach($group->id);
                }

                $userIds[] = $user->id;
            }

            $this->command->info("      ✓ Dibuat baru : {$created} peserta");
            $this->command->info("      ✓ Sudah ada   : {$skipped} peserta (di-skip)");
            $this->command->info("      ✓ Total di group: " . count($userIds) . " peserta");

            // ═══════════════════════════════════════════════════════
            //  STEP 3: BUAT MODUL, TOPIK, DAN 150 SOAL PG
            // ═══════════════════════════════════════════════════════
            $this->command->info('');
            $this->command->info('[3/4] Membuat modul + topik + 150 soal pilihan ganda...');

            $module = Module::firstOrCreate([
                'name' => 'Load Test Module',
            ]);

            $topic = Topic::firstOrCreate(
                [
                    'module_id' => $module->id,
                    'name'      => 'Load Test Topic (150 Soal PG)',
                ],
                ['is_active' => true]
            );

            // Hitung soal yang sudah ada di topik ini
            $existingCount = Question::where('topic_id', $topic->id)->count();

            if ($existingCount >= 150) {
                $this->command->info("      ✓ Topik sudah punya {$existingCount} soal, skip generate.");
            } else {
                $toGenerate = 150 - $existingCount;
                $this->command->info("      Topik punya {$existingCount} soal, generate {$toGenerate} lagi...");

                // Template soal-soal kedokteran realistis
                $vignettes = [
                    "Seorang laki-laki 55 tahun datang dengan nyeri dada kiri menjalar ke lengan kiri, keringat dingin, dan sesak. EKG: ST elevasi di V1-V4. Apakah diagnosis paling tepat?",
                    "Pasien anak 4 tahun datang dengan stridor inspirasi, demam, dan suara serak mendadak sejak semalam. Foto leher lateral menunjukkan tanda 'thumb sign'. Diagnosis?",
                    "Wanita 28 tahun hamil 32 minggu datang dengan tekanan darah 160/110 mmHg, edema tungkai, dan proteinuria +++. Diagnosis?",
                    "Laki-laki 70 tahun mengeluh tremor saat istirahat, wajah seperti topeng (masked face), dan langkah kecil-kecil. Pemeriksaan: rigiditas cogwheel. Diagnosis?",
                    "Perempuan 35 tahun mengeluh jantung berdebar, berkeringat banyak, berat badan turun, dan mata membesar. TSH <0,01, FT4 meningkat. Diagnosis?",
                    "Bayi 2 hari dibawa dengan muntah hijau proyektil sejak lahir. Foto polos abdomen: double bubble sign. Diagnosis?",
                    "Laki-laki 45 tahun perokok berat datang dengan batuk kronik > 3 bulan selama 2 tahun berturut-turut, produksi sputum banyak. Diagnosis?",
                    "Wanita 60 tahun mengeluh nyeri lutut bilateral yang memburuk saat naik tangga, disertai krepitasi. Röntgen: penyempitan celah sendi. Diagnosis?",
                    "Pasien 22 tahun datang dengan luka tusuk di dada kiri, hipoksia, dan suara napas menghilang di sisi kiri. Trakea deviasi ke kanan. Diagnosis?",
                    "Laki-laki 50 tahun dengan riwayat DM datang dengan kaki kanan kehitaman, berbau, dan tidak terasa nyeri. Diagnosis?",
                ];

                $kunciBenar = [
                    'STEMI Anterior',
                    'Epiglotitis',
                    'Preeklampsia Berat',
                    'Penyakit Parkinson',
                    'Hipertiroid (Graves)',
                    'Atresia Duodenum',
                    'PPOK (Bronkitis Kronik)',
                    'Osteoartritis Genu',
                    'Tension Pneumothorax',
                    'Kaki Diabetik (Gangren)',
                ];

                $pengecoh = [
                    'Angina Pectoris',
                    'Pneumonia',
                    'Gastritis Akut',
                    'Epilepsi',
                    'Hipotiroid',
                    'Hernia Diafragmatika',
                    'Asma Bronkial',
                    'Artritis Reumatoid',
                    'Pneumothorax Spontan',
                    'Peripheral Artery Disease',
                    'Perikarditis',
                    'Laringomalasia',
                    'Hipertensi Gestasional',
                    'Essential Tremor',
                    'Cushing Syndrome',
                    'Volvulus',
                    'Bronkiektasis',
                    'Gout Arthritis',
                    'Hematotoraks',
                    'Selulitis',
                ];

                $questionsBatch = [];
                $answersBatch   = [];

                for ($j = 1; $j <= $toGenerate; $j++) {
                    $index   = ($existingCount + $j - 1) % count($vignettes);
                    $soalNum = $existingCount + $j;

                    $question = Question::create([
                        'topic_id'      => $topic->id,
                        'type'          => 'multiple_choice',
                        'question_text' => "Soal No. {$soalNum}: " . $vignettes[$index],
                        'score'         => 1,
                        'is_active'     => true,
                    ]);

                    // 1 jawaban benar
                    Answer::create([
                        'question_id' => $question->id,
                        'answer_text' => $kunciBenar[$index % count($kunciBenar)],
                        'is_correct'  => true,
                    ]);

                    // 4 jawaban pengecoh (ambil 4 berbeda)
                    $pengecohKeys = array_rand($pengecoh, 4);
                    foreach ($pengecohKeys as $k) {
                        Answer::create([
                            'question_id' => $question->id,
                            'answer_text' => $pengecoh[$k],
                            'is_correct'  => false,
                        ]);
                    }
                }

                $this->command->info("      ✓ {$toGenerate} soal berhasil dibuat");
            }

            // ═══════════════════════════════════════════════════════
            //  STEP 4: BUAT UJIAN (150 soal, 150 menit, aktif)
            // ═══════════════════════════════════════════════════════
            $this->command->info('');
            $this->command->info('[4/4] Membuat ujian "Ujian Load Test K6 (150 Soal)"...');

            // Cek apakah ujian load test sudah ada
            $test = Test::firstOrCreate(
                ['title' => 'Ujian Load Test K6 (150 Soal)'],
                [
                    'title'       => 'Ujian Load Test K6 (150 Soal)',
                    'description' => 'Ujian otomatis untuk k6 load testing. 500 peserta, 150 soal, 150 menit.',
                    'duration'    => 150,                    // 150 menit
                    'start_time'  => now()->subMinutes(5),   // Sudah dimulai
                    'end_time'    => now()->addHours(6),     // Aktif 6 jam ke depan
                    'is_active'   => true,
                    'require_seb' => false,                  // WAJIB false — k6 bukan Safe Exam Browser
                ]
            );

            // Selalu refresh window waktu agar tidak expired saat tes dijalankan ulang
            $test->update([
                'start_time'  => now()->subMinutes(5),
                'end_time'    => now()->addHours(6),
                'is_active'   => true,
                'require_seb' => false,                  // WAJIB false — k6 bukan Safe Exam Browser
            ]);

            // Hapus TestUser lama agar prevent.retake tidak memblokir run ulang
            \App\Models\TestUser::where('test_id', $test->id)
                ->whereIn('user_id', $userIds)
                ->delete();
            $this->command->info("      ✓ TestUser lama dihapus (ready for fresh run)");

            // Attach topik (dengan config soal)
            if (!$test->topics()->where('topics.id', $topic->id)->exists()) {
                $test->topics()->attach($topic->id, [
                    'total_questions'  => 150,
                    'question_type'    => 'multiple_choice',
                    'random_questions' => true,
                    'random_answers'   => true,
                    'max_answers'      => 5,
                ]);
            }

            // Attach group
            if (!$test->groups()->where('groups.id', $group->id)->exists()) {
                $test->groups()->attach($group->id);
            }

            $this->command->info("      ✓ Test ID: {$test->id}");
            $this->command->info("      ✓ Durasi : 150 menit");
            $this->command->info("      ✓ Aktif  : " . now()->subMinutes(5)->format('H:i') . " - " . now()->addHours(6)->format('H:i'));
        }); // end transaction

        // ═══════════════════════════════════════════════════════════
        //  RINGKASAN
        // ═══════════════════════════════════════════════════════════
        $test = Test::where('title', 'Ujian Load Test K6 (150 Soal)')->first();

        $this->command->info('');
        $this->command->info('╔══════════════════════════════════════════════╗');
        $this->command->info('║   ✓  SEEDER SELESAI — Ringkasan Data        ║');
        $this->command->info('╚══════════════════════════════════════════════╝');
        $this->command->info('');
        $this->command->info("  Group    : Load Test K6");
        $this->command->info("  Peserta  : " . self::TOTAL_USERS . " user");
        $this->command->info("  NPM Range: " . self::NPM_PREFIX . self::NPM_START . " s/d " . self::NPM_PREFIX . (self::NPM_START + self::TOTAL_USERS - 1));
        $this->command->info("  Password : NPM masing-masing (misal: 2317051098)");
        $this->command->info("  Soal     : 150 soal pilihan ganda (5 pilihan/soal)");
        $this->command->info("  TEST ID  : " . ($test?->id ?? '???'));
        $this->command->info('');
        $this->command->warn('  ⚠  UPDATE k6 SCRIPT sebelum test:');
        $this->command->warn("     const TEST_ID = " . ($test?->id ?? '???') . ";  ← di full-exam-flow.js");
        $this->command->info('');
        $this->command->info('  CARA JALANKAN K6:');
        $this->command->info('  k6 run load-test/full-exam-flow.js');
        $this->command->info('');
    }
}
