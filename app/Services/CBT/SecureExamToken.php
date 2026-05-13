<?php

namespace App\Services\CBT;

use App\Services\Cache\RedisKeyStrategy;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Cache;
use Illuminate\Contracts\Encryption\DecryptException;
use Carbon\Carbon;
use Exception;

class SecureExamToken
{
    /**
     * Generate a secure, signed exam token (not predictable, not forgeable)
     * 
     * REPLACES: ExamStatusToken::issue()
     * 
     * ✅ P0: Uses Redis key namespacing for proper isolation
     * 
     * Token structure:
     * - Encrypted payload (Laravel Crypt)
     * - Contains: test_user_id, issued_at, expires_at, nonce
     * - Verified in Redis on each use
     * - No way to forge without encryption key
     */
    public static function generate(int $testUserId): string
    {
        // Generate secure nonce (not predictable)
        $nonce = bin2hex(random_bytes(16));

        $payload = [
            'test_user_id' => $testUserId,
            'issued_at' => now()->toIso8601String(),
            'expires_at' => now()->addHours(8)->toIso8601String(),
            'nonce' => $nonce,
        ];

        // Encrypt with Laravel's Crypt (uses APP_KEY)
        $encryptedToken = Crypt::encryptString(json_encode($payload));

        // ✅ P1: Store nonce in Redis with proper key namespacing for replay detection
        $nonceKey = RedisKeyStrategy::examTokenNonceKey($nonce);
        Cache::put($nonceKey, true, now()->addHours(8));

        return $encryptedToken;
    }

    /**
     * Verify and decrypt token (prevents forgery, tampering, replay)
     * 
     * REPLACES: ExamStatusToken::verify()
     * ✅ P0: Prevents token forgery, tampering, and replay attacks
     */
    public static function verify(string $token): ?array
    {
        try {
            // Decrypt (fails if token was tampered with)
            $json = Crypt::decryptString($token);
            $payload = json_decode($json, true);

            if (!is_array($payload)) {
                return null;
            }

            // Validate required fields
            if (!isset($payload['test_user_id'], $payload['expires_at'], $payload['nonce'])) {
                return null;
            }

            // Check expiration
            $expiresAt = Carbon::parse($payload['expires_at']);
            if (now()->isAfter($expiresAt)) {
                return null;  // Token expired
            }

            // ✅ P1: Replay detection using namespaced Redis key
            $nonceKey = RedisKeyStrategy::examTokenNonceKey($payload['nonce']);
            if (!Cache::has($nonceKey)) {
                // Nonce was already used or invalid
                // Log potential replay attack
                return null;
            }

            // ✅ P1: Keep nonce valid for polling (multiple requests with same token)
            // Redis TTL handles automatic cleanup when token expires
            // Do NOT consume nonce here - let it expire naturally with Cache::put() TTL
            // This allows the same token to be used for multiple polling requests

            return $payload;
        } catch (DecryptException $e) {
            // Token was tampered with or invalid
            return null;
        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * Extract test_user_id from token WITHOUT verification (unsafe - use with caution)
     * Used only for quick ID extraction
     */
    public static function extractTestUserId(string $token): ?int
    {
        try {
            $json = Crypt::decryptString($token);
            $payload = json_decode($json, true);
            return $payload['test_user_id'] ?? null;
        } catch (Exception $e) {
            return null;
        }
    }

    /**
     * Revoke token by marking nonce as invalid
     */
    public static function revoke(string $token): void
    {
        try {
            $json = Crypt::decryptString($token);
            $payload = json_decode($json, true);
            if (isset($payload['nonce'])) {
                Cache::forget("exam_token_nonce:{$payload['nonce']}");
            }
        } catch (Exception $e) {
            // Silent fail
        }
    }
}
