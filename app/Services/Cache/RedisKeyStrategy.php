<?php

namespace App\Services\Cache;

/**
 * ✅ P1: Redis Key Naming Convention & Isolation Strategy
 * 
 * Purpose:
 * - Prevent cache key collisions
 * - Enable safe multi-tenant/multi-app deployments on single Redis instance
 * - Facilitate debugging and monitoring
 * - Enable per-namespace TTL and eviction policies
 * 
 * Pattern: {app}:{environment}:{namespace}:{key}
 * Example: cbt:prod:exam:question:123:randomization
 */
class RedisKeyStrategy
{
    // Application identifier
    private static string $appName = 'cbt';
    
    // Environment
    private static string $environment = '';

    /**
     * Initialize key strategy with app name and environment
     */
    public static function init(?string $appName = null, ?string $environment = null): void
    {
        if ($appName) {
            self::$appName = $appName;
        }
        if ($environment) {
            self::$environment = $environment;
        } else {
            self::$environment = app()->environment();
        }
    }

    /**
     * Get full key with namespace prefix
     * 
     * @param string $namespace Category (exam, question, session, etc.)
     * @param string $key Specific key identifier
     * @return string Full prefixed key
     * 
     * Example: getKey('exam', 'status:123') => 'cbt:prod:exam:status:123'
     */
    public static function getKey(string $namespace, string $key): string
    {
        $app = self::$appName;
        $env = self::$environment;
        return "{$app}:{$env}:{$namespace}:{$key}";
    }

    /**
     * ✅ EXAM CACHE KEYS - Exam state, status, timing
     */
    public static function examKey(string $subkey): string
    {
        return self::getKey('exam', $subkey);
    }

    /**
     * Get exam status cache key
     * Used by: checkStatusStateless(), locking mechanism
     * TTL: 30s (reduced from 5min for faster lock propagation)
     */
    public static function examStatusKey(int $testUserId): string
    {
        return self::examKey("status:{$testUserId}");
    }

    /**
     * Get exam lock key (admin force-submit lock)
     */
    public static function examLockKey(int $testUserId): string
    {
        return self::examKey("lock:{$testUserId}");
    }

    /**
     * Get exam time remaining key
     */
    public static function examTimeKey(int $testUserId): string
    {
        return self::examKey("time:{$testUserId}");
    }

    /**
     * ✅ QUESTION CACHE KEYS - Question data, randomization
     */
    public static function questionKey(string $subkey): string
    {
        return self::getKey('question', $subkey);
    }

    /**
     * Get question randomization seed key
     * Used to: Maintain consistent randomization across requests
     * TTL: 1 hour (persist during exam)
     */
    public static function questionRandomizationKey(int $testUserId, int $questionId): string
    {
        return self::questionKey("randomize:{$testUserId}:{$questionId}");
    }

    /**
     * Get question details cache key (with eager-loaded answers)
     * TTL: 1 hour
     */
    public static function questionDataKey(int $questionId): string
    {
        return self::questionKey("data:{$questionId}");
    }

    /**
     * Get topic questions cache key (all questions in topic)
     * TTL: 1 hour
     */
    public static function topicQuestionsKey(int $topicId): string
    {
        return self::questionKey("topic:{$topicId}");
    }

    /**
     * ✅ SESSION CACHE KEYS - User sessions, tokens
     */
    public static function sessionKey(string $subkey): string
    {
        return self::getKey('session', $subkey);
    }

    /**
     * Get exam token verification key (encrypted token nonce)
     * Used by: SecureExamToken::verify()
     * TTL: Exam duration + 5min buffer
     */
    public static function examTokenKey(int $testUserId): string
    {
        return self::sessionKey("token:{$testUserId}");
    }

    /**
     * Get exam token nonce key (replay protection)
     */
    public static function examTokenNonceKey(string $nonce): string
    {
        return self::sessionKey("nonce:{$nonce}");
    }

    /**
     * ✅ ANALYTICS CACHE KEYS - Results, scores, statistics
     */
    public static function analyticsKey(string $subkey): string
    {
        return self::getKey('analytics', $subkey);
    }

    /**
     * Get test statistics cache key
     * TTL: 1 hour
     */
    public static function testStatsKey(int $testId): string
    {
        return self::analyticsKey("stats:{$testId}");
    }

    /**
     * Get user result summary key
     * TTL: Until result status changes
     */
    public static function userResultKey(int $testUserId): string
    {
        return self::analyticsKey("result:{$testUserId}");
    }

    /**
     * ✅ QUEUE CACHE KEYS - Job tracking
     */
    public static function queueKey(string $subkey): string
    {
        return self::getKey('queue', $subkey);
    }

    /**
     * Get batch answer job key
     */
    public static function batchAnswerJobKey(string $jobId): string
    {
        return self::queueKey("job:{$jobId}");
    }

    /**
     * ✅ RATE LIMIT CACHE KEYS - Throttle counters
     */
    public static function rateLimitKey(string $subkey): string
    {
        return self::getKey('ratelimit', $subkey);
    }

    /**
     * ✅ INVALIDATION HELPERS
     */

    /**
     * Invalidate all exam-related cache for a user
     */
    public static function invalidateExamKeys(int $testUserId): void
    {
        $keys = [
            self::examStatusKey($testUserId),
            self::examLockKey($testUserId),
            self::examTimeKey($testUserId),
            self::examTokenKey($testUserId),
        ];

        foreach ($keys as $key) {
            cache()->forget($key);
        }
    }

    /**
     * Invalidate question cache when question is updated
     */
    public static function invalidateQuestionKeys(int $questionId, int $topicId): void
    {
        cache()->forget(self::questionDataKey($questionId));
        cache()->forget(self::topicQuestionsKey($topicId));
    }

    /**
     * Invalidate analytics when result changes
     */
    public static function invalidateAnalyticsKeys(int $testId, int $testUserId): void
    {
        cache()->forget(self::testStatsKey($testId));
        cache()->forget(self::userResultKey($testUserId));
    }

    /**
     * Get namespace pattern for debugging/monitoring
     */
    public static function getNamespacePattern(string $namespace): string
    {
        $app = self::$appName;
        $env = self::$environment;
        return "{$app}:{$env}:{$namespace}:*";
    }
}
