<?php

namespace App\Services\Statistics;

use App\Models\TestUser;
use App\Models\Question;
use App\Models\Test;
use Illuminate\Support\Facades\DB;

class TestStatisticsService
{
    public static function summary(int $testId): array
    {
        // 1. Ambil total soal
        $totalQuestions = Question::whereHas('topic.tests', function ($q) use ($testId) {
            $q->where('tests.id', $testId);
        })->count();

        // 2. Ambil data peserta
        $results = TestUser::with(['result', 'user', 'answers'])
            ->where('test_id', $testId)
            ->where('status', 'submitted')
            ->get();

        $totalParticipants = $results->count();

        // 3. Hitung Ulang Nilai (Recalculate)
        $processedResults = $results->map(function ($testUser) use ($totalQuestions) {
            $correctCount = $testUser->answers->where('is_correct', 1)->count();
            $calculatedScore = $totalQuestions > 0
                ? round(($correctCount / $totalQuestions) * 100, 2)
                : 0;
            $testUser->calculated_score = $calculatedScore;
            return $testUser;
        });

        $scores = $processedResults->pluck('calculated_score');

        // 4. Statistik Global
        $stats = [
            'total_participants' => $totalParticipants,
            'average_score' => $totalParticipants > 0 ? round($scores->avg(), 2) : 0,
            'highest_score' => $totalParticipants > 0 ? $scores->max() : 0,
            'lowest_score' => $totalParticipants > 0 ? $scores->min() : 0,
            'passed_count' => $scores->filter(fn($s) => $s >= 76)->count(),
            'failed_count' => $scores->filter(fn($s) => $s < 76)->count(),
        ];

        // 5. Ambil Data Jawaban User (Join ke Users untuk ambil Nama)
        $allUserAnswers = DB::table('user_answers')
            ->join('test_users', 'user_answers.test_user_id', '=', 'test_users.id')
            ->join('users', 'test_users.user_id', '=', 'users.id')
            ->where('test_users.test_id', $testId)
            ->where('test_users.status', 'submitted')
            ->select(
                'user_answers.id as user_answer_id',
                'user_answers.question_id',
                'user_answers.answer_id',
                'user_answers.is_correct',
                'user_answers.answer_text',
                'users.name as student_name'
            )
            ->get();

        // 6. Analisis Butir Soal ( UPDATE: Ambil Foto Soal & Jawaban)
        $questions = Question::with(['answers'])
            ->whereHas('topic.tests', function ($q) use ($testId) {
                $q->where('tests.id', $testId);
            })->get();

        $questionAnalysis = $questions->map(function ($q) use ($allUserAnswers, $totalParticipants) {
            $responses = $allUserAnswers->where('question_id', $q->id);

            // Hitung Statistik
            $correctCount = $responses->where('is_correct', 1)->count();
            $wrongCount = $responses->where('is_correct', 0)->count();

            $waitingCount = $responses->filter(function ($res) {
                return is_null($res->is_correct) &&
                    (!is_null($res->answer_id) || (!is_null($res->answer_text) && trim($res->answer_text) !== ''));
            })->count();

            $unansweredCount = $totalParticipants - ($correctCount + $wrongCount + $waitingCount);

            $answersStats = $q->answers->map(function ($ans) use ($responses, $totalParticipants) {
                $count = $responses->where('answer_id', $ans->id)->count();
                return [
                    'answer_text' => $ans->answer_text,
                    // PERBAIKAN: Kirim Gambar Jawaban
                    'answer_image' => $ans->answer_image,
                    'is_correct' => $ans->is_correct,
                    'selection_count' => $count,
                    'selection_pct' => $totalParticipants > 0 ? round(($count / $totalParticipants) * 100, 1) : 0,
                ];
            });

            // Data Essay
            $studentResponses = [];
            if ($q->answers->isEmpty()) {
                $studentResponses = $responses->filter(function ($res) {
                    return !is_null($res->answer_text) && trim($res->answer_text) !== '';
                })->map(function ($res) {
                    $status = 'waiting';
                    if ($res->is_correct === 1) $status = 'correct';
                    if ($res->is_correct === 0) $status = 'wrong';

                    return [
                        'id' => $res->user_answer_id,
                        'student_name' => $res->student_name,
                        'text' => $res->answer_text,
                        'status' => $status
                    ];
                })->values();
            }

            return [
                'id' => $q->id,
                'question_text' => $q->question_text,
                // PERBAIKAN: Kirim Gambar Soal
                'question_image' => $q->question_image,
                'stats' => [
                    'recurrence' => $totalParticipants,
                    'correct' => $correctCount,
                    'correct_pct' => $totalParticipants > 0 ? round(($correctCount / $totalParticipants) * 100, 1) : 0,
                    'wrong' => $wrongCount,
                    'wrong_pct' => $totalParticipants > 0 ? round(($wrongCount / $totalParticipants) * 100, 1) : 0,
                    'waiting' => $waitingCount,
                    'waiting_pct' => $totalParticipants > 0 ? round(($waitingCount / $totalParticipants) * 100, 1) : 0,
                    'unanswered' => $unansweredCount,
                    'unanswered_pct' => $totalParticipants > 0 ? round(($unansweredCount / $totalParticipants) * 100, 1) : 0,
                ],
                'answers' => $answersStats,
                'student_responses' => $studentResponses
            ];
        });

        return [
            'stats' => $stats,
            'distribution' => [
                '0-20' => $scores->filter(fn($s) => $s >= 0 && $s <= 20)->count(),
                '21-40' => $scores->filter(fn($s) => $s > 20 && $s <= 40)->count(),
                '41-60' => $scores->filter(fn($s) => $s > 40 && $s <= 60)->count(),
                '61-80' => $scores->filter(fn($s) => $s > 60 && $s <= 80)->count(),
                '81-100' => $scores->filter(fn($s) => $s > 80 && $s <= 100)->count(),
            ],
            'top_students' => $processedResults->sortByDesc('calculated_score')->take(5)->map(function ($item) {
                return [
                    'name' => $item->user->name ?? 'Unknown',
                    'score' => $item->calculated_score,
                    'finished_at' => $item->finished_at ? $item->finished_at->diffForHumans() : '-',
                ];
            })->values(),
            'questions' => $questionAnalysis,
        ];
    }
}
