<?php

namespace Tests\Unit;

use App\Services\CBT\ScoringService;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class ScoringServiceTest extends TestCase
{
    #[DataProvider('scoreCases')]
    public function test_calculate_final_score_rounds_to_two_decimals(int $correctAnswers, int $totalQuestions, float $expected): void
    {
        $this->assertSame($expected, ScoringService::calculateFinalScore($correctAnswers, $totalQuestions));
    }

    public static function scoreCases(): array
    {
        return [
            '31 of 150' => [31, 150, 20.67],
            '5 of 50' => [5, 50, 10.00],
            '42 of 50' => [42, 50, 84.00],
        ];
    }
}