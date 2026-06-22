<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Module;
use App\Models\Topic;
use App\Models\Question;
use App\Models\Answer;
use Illuminate\Support\Facades\DB;

class MassQuestionSeeder extends Seeder
{
    public function run(): void
    {
        // Gunakan Transaction agar seeding super cepat dan aman
        DB::transaction(function () {

            // 1. Setup Modul & Topik
            $module = Module::firstOrCreate(['name' => 'Ujian tengah semester PSPD']);

            $topic = Topic::firstOrCreate([
                'module_id' => $module->id,
                'name' => 'Latihan Soal Vignette (150 Soal)',
            ], ['is_active' => true]);

            // 2. Bank Template Soal (Supaya terlihat real)
            $templates = [
                "Seorang laki-laki berusia 50 tahun datang ke IGD dengan keluhan nyeri dada kiri menjalar ke rahang. EKG menunjukkan ST elevasi di lead II, III, aVF.",
                "Pasien anak usia 5 tahun dibawa ibu dengan keluhan sesak napas dan bunyi 'ngik'. Riwayat alergi dingin positif.",
                "Seorang wanita 30 tahun mengeluh jantung berdebar-debar, keringat banyak, dan berat badan turun meski nafsu makan meningkat.",
                "Laki-laki 65 tahun mengeluh batuk berdahak lebih dari 3 bulan berturut-turut dalam 2 tahun terakhir. Riwayat merokok berat.",
                "Pasien wanita mengeluh nyeri ulu hati tembus ke belakang, disertai mual muntah hebat setelah makan makanan berlemak."
            ];

            $diagnosaBenar = ['STEMI Inferior', 'Asma Bronkial', 'Hipertiroid (Graves)', 'PPOK', 'Kolesistitis Akut'];
            $diagnosaSalah = ['Gastritis', 'Pneumonia', 'Angina Pectoris', 'TBC Paru', 'Anemia', 'Gagal Jantung', 'Perikarditis', 'GERD'];

            $this->command->info('Memulai generate 150 soal...');

            // 3. Looping 150 Soal
            for ($i = 1; $i <= 150; $i++) {

                // Pilih template acak
                $templateIndex = array_rand($templates);
                $soalText = "Vignette No. $i: " . $templates[$templateIndex] . " Diagnosis yang paling tepat adalah?";

                // Tentukan Tipe Soal 
                $type = ($i % 50 == 0) ? 'essay' : 'multiple_choice';

                // Simpan Soal
                $question = Question::create([
                    'topic_id'      => $topic->id,
                    'type'          => $type,
                    'question_text' => $soalText,
                    'score'         => ($type == 'essay') ? 5 : 1, // Bobot beda
                    'is_active'     => true,
                ]);

                // Jika Pilihan Ganda, Buat Jawaban
                if ($type == 'multiple_choice') {

                    $options = [];

                    // 1 Jawaban Benar
                    $options[] = [
                        'text' => $diagnosaBenar[$templateIndex] . " (Kunci Jawaban)",
                        'is_correct' => true
                    ];

                    // 4 Jawaban Pengecoh (Ambil acak dari array salah)
                    $keys = array_rand($diagnosaSalah, 4);
                    foreach ($keys as $key) {
                        $options[] = [
                            'text' => $diagnosaSalah[$key],
                            'is_correct' => false
                        ];
                    }

                    // Agar kunci jawaban tidak selalu A
                    shuffle($options);

                    // Simpan ke Database
                    foreach ($options as $opt) {
                        Answer::create([
                            'question_id' => $question->id,
                            'answer_text' => $opt['text'],
                            'is_correct'  => $opt['is_correct'],
                        ]);
                    }
                }
                // Jika Esai, tidak perlu isi tabel answers
            }
        });

        $this->command->info(' Berhasil membuat 150 Soal Simulasi!');
    }
}
