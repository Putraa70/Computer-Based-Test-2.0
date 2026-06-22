<?php

namespace App\Services\CBT;

use App\Models\UserAnswer;
use Illuminate\Support\Facades\DB;

class AnswerService
{
    private static function resolveAnswerMeta(int $questionId, ?int $answerId): array
    {
        if ($answerId === null) {
            return [
                'is_correct' => null,
                'score' => null,
            ];
        }

        $answerMeta = DB::table('answers as a')
            ->join('questions as q', 'q.id', '=', 'a.question_id')
            ->where('a.id', $answerId)
            ->where('a.question_id', $questionId)
            ->select('a.is_correct', 'q.score')
            ->first();

        if (!$answerMeta) {
            return [
                'is_correct' => null,
                'score' => 0,
            ];
        }

        $isCorrect = (bool) $answerMeta->is_correct;

        return [
            'is_correct' => $isCorrect,
            'score' => $isCorrect ? 1 : 0,
        ];
    }

    /**
     * Build rows ready for user_answers upsert, including realtime scoring fields.
     *
     * @param array $answers [question_id => ['answerId' => int|null, 'answerText' => string|null]]
     */
    public static function buildUpsertRows(int $testUserId, array $answers): array
    {
        $now = now();
        $rows = [];

        foreach ($answers as $questionId => $answer) {
            $questionId = (int) $questionId;
            $answerId = isset($answer['answerId']) ? (int) $answer['answerId'] : null;
            $meta = self::resolveAnswerMeta($questionId, $answerId);

            $rows[] = [
                'test_user_id' => $testUserId,
                'question_id' => $questionId,
                'answer_id' => $answerId,
                'answer_text' => $answer['answerText'] ?? null,
                'is_correct' => $meta['is_correct'],
                'score' => $meta['score'],
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        return $rows;
    }

    public static function upsertBatch(int $testUserId, array $answers): void
    {
        $rows = self::buildUpsertRows($testUserId, $answers);

        if (empty($rows)) {
            return;
        }

        UserAnswer::upsert(
            $rows,
            ['test_user_id', 'question_id'],
            ['answer_id', 'answer_text', 'is_correct', 'score', 'updated_at']
        );
    }

    /**
     * Simpan jawaban siswa + hitung is_correct otomatis untuk multiple_choice.
     *
     * FIX: is_correct sebelumnya selalu NULL karena tidak pernah dihitung di sini.
     * Sekarang: jika answerId ada, cek langsung ke tabel answers apakah is_correct = 1.
     */
    public static function save(
        int $testUserId,
        int $questionId,
        ?int $answerId = null,
        ?string $answerText = null,
        ?bool $isCorrect = null,   // masih bisa di-override dari luar jika perlu
        ?int $score = null
    ): void {

        if ($answerId !== null && ($isCorrect === null || $score === null)) {
            $meta = self::resolveAnswerMeta($questionId, $answerId);
            $isCorrect = $isCorrect ?? $meta['is_correct'];
            $score = $score ?? $meta['score'];
        }

        UserAnswer::updateOrCreate(
            [
                'test_user_id' => $testUserId,
                'question_id'  => $questionId,
            ],
            [
                'answer_id'   => $answerId,
                'answer_text' => $answerText,
                'is_correct'  => $isCorrect,   // ✅ sekarang 0 atau 1, bukan null
                'score'       => $score,
            ]
        );
    }

    /**
     * ✅ BONUS: Perbaiki semua data lama yang is_correct/score-nya masih NULL.
     * Jalankan sekali via Artisan command atau Tinker:
     *   php artisan tinker
     *   >>> App\Services\CBT\AnswerService::fixNullIsCorrect();
     */
    public static function fixNullIsCorrect(): int
    {
        return DB::affectingStatement("
            UPDATE user_answers ua
            JOIN answers a ON ua.answer_id = a.id
            JOIN questions q ON q.id = ua.question_id
            SET ua.is_correct = a.is_correct
              , ua.score = CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END
            WHERE (
                  ua.is_correct IS NULL
                  OR ua.score IS NULL
                  OR ua.is_correct <> a.is_correct
                  OR ua.score <> CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END
              )
              AND ua.answer_id IS NOT NULL
              AND a.question_id = ua.question_id
        ");
    }
}
