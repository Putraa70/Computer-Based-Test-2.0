<?php

namespace App\Jobs;

use App\Models\TestUser;
use App\Services\CBT\AnswerService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class BatchSaveAnswers implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 10;
    public $backoff = [1, 5, 10]; // Exponential backoff in seconds

    /**
     * Create a new job instance.
     *
     * @param int $testUserId
     * @param array $answers [ question_id => { answerId, answerText }, ... ]
     */
    public function __construct(
        private int $testUserId,
        private array $answers
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            // ✅ Batch insert with ON DUPLICATE KEY UPDATE
            // This performs a single INSERT...ON DUPLICATE KEY UPDATE statement
            // instead of individual inserts, significantly reducing lock contention
            AnswerService::upsertBatch($this->testUserId, $this->answers);

            // Update last_activity_at ONCE per batch instead of per answer
            TestUser::where('id', $this->testUserId)
                ->update(['last_activity_at' => now()]);

            Log::debug(
                'Batch saved answers',
                [
                    'test_user_id' => $this->testUserId,
                    'answer_count' => count($this->answers),
                ]
            );
        } catch (\Exception $e) {
            Log::error(
                'Batch save answers failed',
                [
                    'test_user_id' => $this->testUserId,
                    'error' => $e->getMessage(),
                    'attempt' => $this->attempts(),
                ]
            );

            // Retry or fail
            if ($this->attempts() > $this->tries) {
                $this->fail($e);
            } else {
                $this->release($this->backoff[$this->attempts() - 1] ?? 10);
            }
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::critical(
            'Batch save answers failed permanently',
            [
                'test_user_id' => $this->testUserId,
                'answers' => $this->answers,
                'error' => $exception->getMessage(),
            ]
        );

        // Optionally: notify admin, rollback, etc.
    }
}
