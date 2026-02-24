<?php

namespace App\Exports;

use App\Models\TestUser;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnFormatting; // 👈 TAMBAHAN 1
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;     // 👈 TAMBAHAN 2
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TestResultsExport implements FromQuery, WithHeadings, WithMapping, ShouldAutoSize, WithStyles, WithColumnFormatting
{
    protected $testId;
    protected $search;
    protected $sort;

    public function __construct($testId, $search, $sort = 'started_at')
    {
        $this->testId = $testId;
        $this->search = $search;
        $this->sort = $sort;
    }

    public function query()
    {
        $query = TestUser::query()
            ->with(['user', 'test.topics.questions', 'answers', 'result'])
            ->join('users', 'test_users.user_id', '=', 'users.id')
            ->leftJoin('results', 'test_users.id', '=', 'results.test_user_id')
            ->select('test_users.*', 'users.name as user_name', 'users.npm as user_npm', 'results.total_score');

        if ($this->testId) $query->where('test_users.test_id', $this->testId);

        if ($this->search) {
            $query->where(function ($q) {
                $q->where('users.name', 'like', "%{$this->search}%")
                    ->orWhere('users.email', 'like', "%{$this->search}%")
                    ->orWhere('users.npm', 'like', "%{$this->search}%");
            });
        }

        switch ($this->sort) {
            case 'npm_asc':
                $query->orderBy('users.npm', 'asc');
                break;
            case 'score_desc':
                $query->orderBy('results.total_score', 'desc');
                break;
            case 'score_asc':
                $query->orderBy('results.total_score', 'asc');
                break;
            default:
                $query->orderBy('test_users.started_at', 'desc');
                break;
        }

        return $query;
    }

    public function headings(): array
    {
        return [
            'NPM',
            'Nama Peserta',
            'Judul Ujian',
            'Status',
            'Nilai',
            'Waktu Mulai',
            'Waktu Selesai',
            'Durasi'
        ];
    }

    public function map($testUser): array
    {
        $duration = '-';
        if ($testUser->started_at && $testUser->finished_at) {
            $duration = $testUser->finished_at->diffInMinutes($testUser->started_at) . ' menit';
        }

        //  LOGIKA HITUNG NILAI REALTIME (FLOAT)
        $score = 0.00; // Default float
        $totalQuestions = 0;

        // Hitung total soal via Topics
        if ($testUser->test && $testUser->test->topics) {
            foreach ($testUser->test->topics as $topic) {
                $totalQuestions += $topic->questions->count();
            }
        }

        // Jika soal ditemukan, hitung nilai
        if ($totalQuestions > 0) {
            $correctAnswers = $testUser->answers->where('is_correct', 1)->count();
            // Simpan sebagai angka asli (float), JANGAN di-string agar Excel bisa format
            $score = ($correctAnswers / $totalQuestions) * 100;
        } else {
            // Fallback ke DB jika hitungan gagal, tapi cast ke float
            $score = (float) ($testUser->result->total_score ?? 0);
        }

        return [
            $testUser->user->npm ?? '-',
            $testUser->user->name,
            $testUser->test->title,
            ucfirst($testUser->status),
            $score, //  Kirim Raw Number (misal: 31.77777)
            $testUser->started_at,
            $testUser->finished_at ?? '-',
            $duration
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [1 => ['font' => ['bold' => true]]];
    }

    /**
     *  FORCE FORMAT EXCEL AGAR 2 DESIMAL
     */
    public function columnFormats(): array
    {
        return [
            'E' => '0.00', // Kolom E (Nilai) dipaksa format angka 2 desimal
        ];
    }
}
