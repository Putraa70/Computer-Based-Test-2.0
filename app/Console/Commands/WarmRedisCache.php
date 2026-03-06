<?php

namespace App\Console\Commands;

use App\Models\Test;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class WarmRedisCache extends Command
{
    protected $signature = 'cache:warm';

    protected $description = 'Pre-load all active test question sets into Redis for faster retrieval';

    public function handle(): int
    {
        $this->info('🔥 Warming Redis cache with test questions...');

        $activeTests = Test::where('is_active', true)->get();

        if ($activeTests->isEmpty()) {
            $this->warn('No active tests found.');
            return self::SUCCESS;
        }

        $warmedCount = 0;

        foreach ($activeTests as $test) {
            try {
                // Load questions with answers for this test
                $questions = $test->topics()
                    ->with(['questions' => function ($q) {
                        $q->where('is_active', true);
                    }, 'questions.answers' => function ($a) {
                        $a->whereNotNull('answer_text');
                    }])
                    ->get()
                    ->flatMap(fn($t) => $t->questions);

                // Store in Redis with 24-hour TTL
                $cacheKey = "test_questions_{$test->id}";
                Cache::put($cacheKey, $questions->toArray(), 86400);

                $this->line(
                    "  ✓ <info>{$test->title}</info>: "
                        . "<comment>{$questions->count()}</comment> questions cached"
                );

                $warmedCount++;
            } catch (\Exception $e) {
                $this->error("  ✗ Failed to cache {$test->title}: {$e->getMessage()}");
            }
        }

        $this->info("\n✅ Cache warming complete: {$warmedCount} tests processed");
        return self::SUCCESS;
    }
}
