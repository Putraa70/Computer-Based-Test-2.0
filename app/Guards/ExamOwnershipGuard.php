<?php

namespace App\Guards;

use App\Models\TestUser;
use App\Services\AuditService;
use Illuminate\Support\Facades\Auth;
use Exception;

class ExamOwnershipGuard
{
    /**
     * Validate that authenticated user owns the test user (exam session)
     * 
     * @param TestUser $testUser
     * @throws Exception if ownership check fails
     */
    public static function validate(TestUser $testUser): void
    {
        if (!Auth::check()) {
            throw new Exception('Unauthenticated', 401);
        }

        if ($testUser->user_id !== Auth::id()) {
            // Log security incident
            AuditService::logSecurityEvent(
                event: 'ownership_violation_attempt',
                testUserId: $testUser->id,
                description: "User {Auth::id()} attempted to access exam belonging to {$testUser->user_id}",
                metadata: [
                    'attempted_user_id' => Auth::id(),
                    'actual_owner_id' => $testUser->user_id,
                    'test_id' => $testUser->test_id,
                ]
            );

            throw new Exception('Unauthorized - Exam ownership mismatch', 403);
        }
    }

    /**
     * Check ownership without throwing (returns boolean)
     */
    public static function check(TestUser $testUser): bool
    {
        if (!Auth::check()) {
            return false;
        }

        return $testUser->user_id === Auth::id();
    }

    /**
     * Validate and return testUser if valid
     * 
     * @param TestUser $testUser
     * @return TestUser
     * @throws Exception
     */
    public static function validateAndReturn(TestUser $testUser): TestUser
    {
        self::validate($testUser);
        return $testUser;
    }
}
