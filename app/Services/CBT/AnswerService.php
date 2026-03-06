<?php

namespace App\Services\CBT;

use App\Models\UserAnswer;

class AnswerService
{
    public static function save(
        int $testUserId,
        int $questionId,
        ?int $answerId = null,
        ?string $answerText = null,
        ?bool $isCorrect = null,
        ?int $score = 0
    ): void {
        UserAnswer::updateOrCreate(
            [
                'test_user_id' => $testUserId,
                'question_id'  => $questionId,
            ],
            [
                'answer_id'   => $answerId,
                'answer_text' => $answerText,
                'is_correct'  => $isCorrect,
                'score'       => $score,
            ]
        );
    }
}
