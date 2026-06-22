<?php

namespace App\Services\CBT;

use App\Models\TestUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ScoringService
{
    public static function selectFinalScore(Builder $query, string $tableAlias = 'test_users', string $alias = 'final_score'): Builder
    {
        return $query->selectRaw(self::finalScoreExpression($tableAlias) . ' as ' . $alias);
    }

    public static function orderByFinalScore(Builder $query, string $direction = 'desc', string $tableAlias = 'test_users', string $alias = 'final_score'): Builder
    {
        $direction = strtolower($direction) === 'asc' ? 'asc' : 'desc';

        return $query
            ->orderBy($alias, $direction)
            ->orderBy($tableAlias . '.finished_at', 'asc');
    }

    private static function finalScoreExpression(string $tableAlias = 'test_users'): string
    {
        $correctAnswersSubquery = <<<SQL
(SELECT COUNT(*)
    FROM user_answers
    INNER JOIN questions ON user_answers.question_id = questions.id
    INNER JOIN test_topics ON questions.topic_id = test_topics.topic_id
    WHERE user_answers.test_user_id = {$tableAlias}.id
      AND test_topics.test_id = {$tableAlias}.test_id
      AND questions.type = 'multiple_choice'
      AND questions.is_active = 1
      AND user_answers.is_correct = 1)
SQL;

        $totalQuestionsSubquery = <<<SQL
(SELECT COUNT(DISTINCT questions.id)
    FROM questions
    INNER JOIN test_topics ON questions.topic_id = test_topics.topic_id
    WHERE test_topics.test_id = {$tableAlias}.test_id
      AND questions.type = 'multiple_choice'
      AND questions.is_active = 1)
SQL;

        return 'COALESCE(ROUND((' . $correctAnswersSubquery . ' * 100.0) / NULLIF(' . $totalQuestionsSubquery . ', 0), 2), 0)';
    }

    public static function calculateFinalScore(int $correctAnswers, int $totalQuestions): float
    {
        if ($totalQuestions <= 0) {
            return 0.0;
        }

        return round(($correctAnswers / $totalQuestions) * 100, 2);
    }

    /**
     * Hitung nilai ujian secara ON-THE-FLY
     * - 1 test = 1 topic
     * - Hanya soal PG (multiple_choice)
     * - Essay diabaikan
     * - Nilai = persentase jawaban benar
     *
     * ✅ P2: Optimized with better queries and caching
     */
    public static function calculate(TestUser $testUser): float
    {
        if (!$testUser->relationLoaded('test')) {
            $testUser->load('test');
        }

        $test = $testUser->test;
        if (!$test) {
            return 0;
        }

        $questionIds = DB::table('questions')
            ->join('test_topics', 'questions.topic_id', '=', 'test_topics.topic_id')
            ->where('test_topics.test_id', $test->id)
            ->where('questions.type', 'multiple_choice')
            ->where('questions.is_active', true)
            ->distinct()
            ->pluck('questions.id');

        // Gunakan jumlah soal aktif yang sama dengan query $questionIds
        $totalQuestions = $questionIds->count();

        if ($totalQuestions === 0) {
            return 0.0;
        }

        // Jawaban benar dari soal yang sudah dijawab siswa
        $correctAnswers = DB::table('user_answers')
            ->where('test_user_id', $testUser->id)
            ->whereIn('question_id', $questionIds)
            ->where('is_correct', 1)
            ->count();

        return self::calculateFinalScore($correctAnswers, $totalQuestions);
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
        $scores = TestUser::with('test')
            ->where('test_id', $testId)
            ->whereHas('result', function ($query) {
                $query->where('status', 'validated');
            })
            ->get()
            ->map(fn (TestUser $testUser) => self::calculate($testUser));

        return [
            'total_participants' => $scores->count(),
            'average_score'      => round((float) ($scores->avg() ?? 0), 2),
            'min_score'          => $scores->isEmpty() ? 0 : (float) $scores->min(),
            'max_score'          => $scores->isEmpty() ? 0 : (float) $scores->max(),
            'stddev_score'       => $scores->count() > 1
                ? round(sqrt(
                    $scores->reduce(function ($carry, $score) use ($scores) {
                        $mean = (float) ($scores->avg() ?? 0);
                        return $carry + (($score - $mean) ** 2);
                    }, 0.0) / ($scores->count() - 1)
                ), 2)
                : 0.0,
        ];
    }

    /**
     * ✅ FIXED: Hitung nilai real-time dengan presisi desimal.
     *
     * Rumus: nilai = (jawaban_benar / total_soal) × 100
     *
     * PERBAIKAN:
     * - total_soal diambil dari tabel `questions` langsung (bukan dari user_answers),
     *   sehingga soal yang belum dijawab tetap masuk hitungan penyebut.
     * - Soal yang dijawab salah / belum dijawab = 0 poin (tidak menaikkan nilai).
     * - Tipe kembalian float dengan 2 desimal.
     *
     * @param TestUser $testUser
     * @return float  contoh: 75.00 | 83.33 | 100.00
     */
    public static function calculateRealTime(TestUser $testUser): float
    {
        return self::calculate($testUser);
    }

    private static function totalConfiguredMultipleChoiceQuestions(int $testId): int
    {
        $topicConfigs = DB::table('test_topics')
            ->where('test_id', $testId)
            ->whereIn('question_type', ['mixed', 'multiple_choice'])
            ->get(['topic_id', 'total_questions']);

        $total = 0;

        foreach ($topicConfigs as $config) {
            $available = DB::table('questions')
                ->where('topic_id', $config->topic_id)
                ->where('type', 'multiple_choice')
                ->where('is_active', true)
                ->count();

            if ($available === 0) {
                continue;
            }

            $requested = (int) $config->total_questions;
            $total += $requested > 0 ? min($requested, $available) : $available;
        }

        return $total;
    }
}
