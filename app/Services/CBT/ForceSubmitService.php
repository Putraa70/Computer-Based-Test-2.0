<?php

namespace App\Services\CBT;

use App\Models\TestUser;
use Illuminate\Support\Facades\DB;
use App\Services\AuditService;

class ForceSubmitService
{
    /**
     * Force submit exam with P0 hardening:
     * - Pessimistic lock
     * - Transaction
     * - Idempotency guard
     * - No duplicate results
     */
    public static function force(TestUser $testUser, int $adminId): void
    {
        // ✅ P0: Use transaction with pessimistic lock to prevent race condition
        DB::transaction(function () use ($testUser, $adminId) {
            // ✅ Lock the row - prevents concurrent force submits
            $testUser = TestUser::where('id', $testUser->id)
                ->lockForUpdate()
                ->first();

            if (!$testUser) {
                throw new \Exception('Test user not found');
            }

            // Only force submit if status allows it
            if (!in_array($testUser->status, ['ongoing', 'expired', 'not_started'])) {
                return;  // Already submitted, already force_submitted, etc.
            }

            // ✅ Update status
            $testUser->update([
                'status' => 'force_submitted',
                'finished_at' => now(),
            ]);

            // ✅ CRITICAL: Use first-or-create pattern with lock to prevent duplicates
            // Check if result exists AFTER acquiring lock (prevents race)
            $result = $testUser->result;

            if (!$result) {
                $result = $testUser->result()->create([
                    'total_score' => ScoringService::calculate($testUser),
                    'status' => 'pending',
                    'validated_by' => null,
                    'validated_at' => null,
                ]);
            }

            // ✅ Log the admin action
            AuditService::logAdminAction(
                'force_submit',
                $testUser->id,
                'Admin forced exam submission',
                [
                    'admin_id' => $adminId,
                    'total_score' => $result->total_score,
                    'result_id' => $result->id,
                ]
            );

        }, attempts: 5);  // ✅ Retry on deadlock
    }
}
