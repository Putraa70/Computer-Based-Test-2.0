<?php

namespace App\Services\Statistics;

use App\Models\TestUser;
use App\Services\CBT\ScoringService;

class StudentStatisticsService
{
    public static function details(int $userId): array
    {
        // Ambil semua ujian yang SUDAH diselesaikan user ini
        $history = TestUser::with(['test', 'result'])
            ->where('user_id', $userId)
            ->where('status', 'submitted')
            ->orderBy('finished_at', 'desc')
            ->get();

        // Hitung Statistik Dasar
        $totalTests = $history->count();
        $scores = $history->map(fn (TestUser $testUser) => ScoringService::calculate($testUser))->values();

        $averageScore = $totalTests > 0 ? round((float) $scores->avg(), 2) : 0.0;

        $stats = [
            'total_tests' => $totalTests,
            'average_score' => $averageScore,
            'highest_score' => $totalTests > 0 ? (float) $scores->max() : 0,
            'lowest_score' => $totalTests > 0 ? (float) $scores->min() : 0,
            'passed_tests' => $scores->filter(fn ($score) => $score >= 76)->count(),
        ];

        // Data untuk Grafik (5 Ujian Terakhir)
        $chartData = $history->take(10)->reverse()->values()->map(function ($item) {
            return [
                'test_title' => $item->test->title,
                'score' => ScoringService::calculate($item),
                'date' => $item->finished_at->format('d M'),
            ];
        });

        // Data Tabel Histori
        $historyData = $history->map(function ($item) {
            $score = ScoringService::calculate($item);

            return [
                'id' => $item->id,
                'test_title' => $item->test->title,
                'finished_at' => $item->finished_at->format('d F Y H:i'),
                'score' => $score,
                'status' => $score >= 76 ? 'Lulus' : 'Tidak Lulus',
            ];
        });

        return [
            'stats' => $stats,
            'chart' => $chartData,
            'history' => $historyData,
        ];
    }
}
