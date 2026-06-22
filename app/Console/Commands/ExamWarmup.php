<?php

namespace App\Console\Commands;

use App\Models\Test;
use App\Services\CBT\QuestionGeneratorService;
use Illuminate\Console\Command;

class ExamWarmup extends Command
{
    protected $signature = 'exam:warmup {test_id : ID ujian yang akan dipre-generate}';

    protected $description = 'Pre-generate paket soal semua peserta ke Redis/cache sebelum ujian dimulai';

    public function handle(): int
    {
        $testId = (int) $this->argument('test_id');

        $test = Test::with(['topics', 'testUsers:id,test_id,user_id'])->find($testId);

        if (!$test) {
            $this->error("Ujian dengan ID {$testId} tidak ditemukan.");
            return self::FAILURE;
        }

        if ($test->testUsers->isEmpty()) {
            $this->warn("Tidak ada peserta terdaftar untuk ujian {$test->title}.");
            return self::SUCCESS;
        }

        $this->info("Memulai warmup paket soal untuk ujian: {$test->title}");
        $this->line('Peserta: ' . $test->testUsers->count());

        $result = QuestionGeneratorService::warmup($test);

        $this->info(sprintf(
            'Warmup selesai. Peserta diproses: %d | Durasi: %d ms',
            $result['participants'] ?? 0,
            $result['duration_ms'] ?? 0
        ));

        return self::SUCCESS;
    }
}