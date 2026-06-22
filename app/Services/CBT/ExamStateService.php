<?php

namespace App\Services\CBT;

use App\Models\TestUser;

class ExamStateService
{
    public static function autoExpire(TestUser $testUser): void
    {
        if ($testUser->status !== 'ongoing') {
            return;
        }

        if (!ExamTimeService::isStillRunning($testUser)) {
            $testUser->update([
                'status' => 'expired',
                'finished_at' => now(),
            ]);
        }
    }
}
