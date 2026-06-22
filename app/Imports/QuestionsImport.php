<?php

namespace App\Imports;

use App\Models\Question;
use App\Models\Answer;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;

class QuestionsImport implements ToCollection
{

    public function chunkSize(): int
    {
        return 100; // Proses per 100 baris agar memori hemat
    }

    public $topic_id;
    public $importedCount = 0;
    public $skipped = [];

    public function __construct($topic_id)
    {
        $this->topic_id = $topic_id;
    }

    public function collection(Collection $rows)
    {
        $rows = $rows->slice(1); // Lewati Header

        foreach ($rows as $index => $row) {
            $rowNum = $index + 2; // Baris Excel (mulai dari 1, header 1, jadi data mulai 2)

            // --- MAPPING KOLOM ---
            $qText   = trim($row[0] ?? '');
            $rawType = strtolower(trim($row[1] ?? '')); // Ambil tipe (pilihan_ganda / esai)

            // Score default 0 (dihitung nanti di Ujian)
            $score = 0;

            // Opsi Jawaban
            $options = [
                'A' => trim($row[2] ?? ''),
                'B' => trim($row[3] ?? ''),
                'C' => trim($row[4] ?? ''),
                'D' => trim($row[5] ?? ''),
                'E' => trim($row[6] ?? ''),
            ];

            $correctKey = strtoupper(trim($row[7] ?? ''));

            //  LOGIKA PENERJEMAH (Bahasa Indonesia -> Database)
            if (in_array($rawType, ['pilihan_ganda', 'multiple_choice', 'pg', 'pilgan'])) {
                $type = 'multiple_choice';
            } elseif (in_array($rawType, ['esai', 'essay', 'uraian'])) {
                $type = 'essay';
            } else {
                $type = 'multiple_choice'; // Default jika kosong/typo
            }

            // --- VALIDASI ---
            if (empty($qText)) {
                $this->skipped[] = "Baris $rowNum: Pertanyaan kosong.";
                continue;
            }

            if ($type === 'multiple_choice' && (empty($options['A']) || empty($options['B']))) {
                $this->skipped[] = "Baris $rowNum: Soal PG minimal harus punya Pilihan A dan B.";
                continue;
            }

            // --- SIMPAN DATA ---
            $question = Question::create([
                'topic_id'      => $this->topic_id,
                'question_text' => $qText,
                'type'          => $type, // Masuk DB tetap bahasa inggris (standar sistem)
                'score'         => $score,
                'is_active'     => true,
            ]);

            if ($type === 'multiple_choice') {
                foreach ($options as $key => $text) {
                    if (!empty($text)) {
                        Answer::create([
                            'question_id' => $question->id,
                            'answer_text' => $text,
                            'is_correct'  => ($key === $correctKey),
                        ]);
                    }
                }
            }

            $this->importedCount++;
        }
    }
}
