<?php

namespace App\Services\CBT;

use App\Models\TestUser;
use Illuminate\Support\Facades\DB;

class ScoringService
{
    /**
     * Hitung nilai ujian secara ON-THE-FLY
     * - 1 test = 1 topic
     * - Hanya soal PG (multiple_choice)
     * - Essay diabaikan
     * - Nilai = persentase jawaban benar
     * 
     * ✅ P2: Optimized with better queries and caching
     */
    public static function calculate(TestUser $testUser): int
    {
        // ✅ P2: Load relationship if not already loaded
        if (!$testUser->relationLoaded('test')) {
            $testUser->load('test');
        }

        $test = $testUser->test;
        if (!$test) {
            return 0;
        }

        // ✅ P2: Load once instead of separate queries
        if (!$test->relationLoaded('topics')) {
            $test->load('topics');
        }

        // Ambil 1 topic dari test (sesuai aturan bisnis)
        $topic = $test->topics()->first();

        if (!$topic) {
            return 0;
        }

        /**
         * ✅ P2: OPTIMIZED QUERIES - Use single query instead of 2+
         * Combine totalQuestions count + correctAnswers count in one query
         */
        $scoreStats = DB::table('user_answers as ua')
            ->join('questions as q', 'ua.question_id', '=', 'q.id')
            ->where('ua.test_user_id', $testUser->id)
            ->where('q.topic_id', $topic->id)
            ->where('q.type', 'multiple_choice')
            ->where('q.is_active', true)
            ->select(
                DB::raw('COUNT(DISTINCT q.id) as total_questions'),
                DB::raw('COUNT(DISTINCT CASE WHEN ua.is_correct = 1 THEN q.id END) as correct_answers')
            )
            ->first();

        $totalQuestions = $scoreStats->total_questions ?? 0;
        $correctAnswers = $scoreStats->correct_answers ?? 0;

        if ($totalQuestions === 0) {
            return 0;
        }

        /**
         * HITUNG NILAI (PERSENTASE)
         */
        $score = ($correctAnswers / $totalQuestions) * 100;

        return (int) round($score);
    }

    /**
     * ✅ P2: Batch scoring for multiple test users (efficient for exports, analytics)
     * 
     * @param array $testUserIds
     * @return array associative array [test_user_id => score]
     */
    public static function calculateBatch(array $testUserIds): array
    {
        if (empty($testUserIds)) {
            return [];
        }

        $testUsers = TestUser::with('test.topics')
            ->whereIn('id', $testUserIds)
            ->get();

        $scores = [];

        foreach ($testUsers as $testUser) {
            $scores[$testUser->id] = self::calculate($testUser);
        }

        return $scores;
    }

    /**
     * ✅ P2: Get score statistics (for analytics)
     * 
     * @param int $testId
     * @return array statistics
     */
    public static function getStatistics(int $testId): array
    {
        $results = DB::table('results as r')
            ->join('test_users as tu', 'r.test_user_id', '=', 'tu.id')
            ->where('tu.test_id', $testId)
            ->where('r.status', 'validated')
            ->select(
                DB::raw('COUNT(*) as total_participants'),
                DB::raw('AVG(r.total_score) as average_score'),
                DB::raw('MIN(r.total_score) as min_score'),
                DB::raw('MAX(r.total_score) as max_score'),
                DB::raw('STDDEV(r.total_score) as stddev_score')
            )
            ->first();

        return [
            'total_participants' => $results->total_participants ?? 0,
            'average_score' => round($results->average_score ?? 0, 2),
            'min_score' => $results->min_score ?? 0,
            'max_score' => $results->max_score ?? 0,
            'stddev_score' => round($results->stddev_score ?? 0, 2),
        ];
    }
}
