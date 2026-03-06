<?php

namespace App\Jobs;

use App\Models\TestUser;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class UpdateExamStatus implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 2;
    public $timeout = 5;

    /**
     * Create a new job instance.
     *
     * @param int $testUserId
     * @param array $updates [ field => value, ... ]
     */
    public function __construct(
        private int $testUserId,
        private array $updates
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            TestUser::where('id', $this->testUserId)
                ->update($this->updates);

            Log::debug('Exam status updated', [
                'test_user_id' => $this->testUserId,
                'updates' => $this->updates,
            ]);
        } catch (\Exception $e) {
            Log::error('Update exam status failed', [
                'test_user_id' => $this->testUserId,
                'error' => $e->getMessage(),
            ]);

            if ($this->attempts() > $this->tries) {
                $this->fail($e);
            } else {
                $this->release(5);
            }
        }
    }
}
