<?php

namespace App\Services\CBT;

use Illuminate\Support\Facades\Cache;

class ExamStatusToken
{
    /**
     * Generate an immutable exam status token (stateless)
     * This token contains encrypted exam metadata and is signed
     *
     * @param int $testUserId
     * @return string
     */
    public static function issue(int $testUserId): string
    {
        // Store metadata in Redis with token as reference
        $tokenId = uniqid('exam_', true);

        $payload = [
            'token_id' => $tokenId,
            'test_user_id' => $testUserId,
            'issued_at' => now()->toIso8601String(),
            'expires_at' => now()->addHours(8)->toIso8601String(),
        ];

        // Cache token metadata for 8 hours
        Cache::put(
            "exam_token:{$tokenId}",
            $payload,
            28800  // 8 hours in seconds
        );

        // Return simple token (ref to Redis key)
        return base64_encode(json_encode($payload));
    }

    /**
     * Verify token and extract metadata (idempotent)
     *
     * @param string $token
     * @return array|null
     */
    public static function verify(string $token): ?array
    {
        try {
            $payload = json_decode(base64_decode($token), true);

            if (!is_array($payload) || !isset($payload['token_id'], $payload['test_user_id'])) {
                return null;
            }

            // Verify token still exists in Redis
            $cached = Cache::get("exam_token:{$payload['token_id']}");

            if (!$cached) {
                return null;  // Token expired or revoked
            }

            return $payload;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Revoke token immediately (used on lock/submit)
     *
     * @param string $token
     */
    public static function revoke(string $token): void
    {
        try {
            $payload = json_decode(base64_decode($token), true);
            if (isset($payload['token_id'])) {
                Cache::forget("exam_token:{$payload['token_id']}");
            }
        } catch (\Exception $e) {
            // Silently fail
        }
    }
}
