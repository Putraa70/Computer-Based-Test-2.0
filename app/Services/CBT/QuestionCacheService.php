<?php

namespace App\Services\CBT;

use App\Models\Test;
use Illuminate\Support\Facades\Cache;

class QuestionCacheService
{
    /**
     * Get cached questions for a test (with fallback to DB)
     * Uses multi-level caching: session → template → database
     *
     * @param int $testId
     * @return array
     */
    public static function getTestQuestions(int $testId): array
    {
        $cacheKey = "test_questions_{$testId}";

        // ✅ L1: Check template cache (Redis, valid for 24 hours)
        return Cache::remember($cacheKey, 86400, function () use ($testId) {
            $test = Test::with([
                'topics' => fn($q) => $q->where('is_active', true),
                'topics.questions' => fn($q) => $q->where('is_active', true),
                'topics.questions.answers' => fn($q) => $q->whereNotNull('answer_text'),
            ])->find($testId);

            if (!$test) {
                return []; // Test not found
            }

            return $test->topics
                ->flatMap(fn($topic) => $topic->questions)
                ->toArray();
        });
    }

    /**
     * Cache user's randomized question assignment
     *
     * @param int $testId
     * @param int $userId
     * @param array $questionIds
     */
    public static function cacheUserAssignment(int $testId, int $userId, array $questionIds): void
    {
        $sessionKey = "exam_questions_{$testId}_{$userId}";

        // Cache per-user assignment for 8 hours
        Cache::put($sessionKey, $questionIds, 28800);
    }

    /**
     * Get user's cached question assignment
     *
     * @param int $testId
     * @param int $userId
     * @return array|null
     */
    public static function getUserAssignment(int $testId, int $userId): ?array
    {
        $sessionKey = "exam_questions_{$testId}_{$userId}";
        return Cache::get($sessionKey);
    }

    /**
     * Invalidate cache on test update
     *
     * @param int $testId
     */
    public static function invalidateTest(int $testId): void
    {
        $cacheKey = "test_questions_{$testId}";
        Cache::forget($cacheKey);
    }

    /**
     * Invalidate user assignment on exam end
     *
     * @param int $testId
     * @param int $userId
     */
    public static function invalidateUserAssignment(int $testId, int $userId): void
    {
        $sessionKey = "exam_questions_{$testId}_{$userId}";
        Cache::forget($sessionKey);
    }
}
