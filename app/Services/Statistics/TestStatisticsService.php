<?php

namespace App\Services\Statistics;

use App\Models\Question;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class TestStatisticsService
{
    public static function summary(int $testId): array
    {
        $cacheKey = "statistics:test:summary:{$testId}";

        return Cache::remember($cacheKey, now()->addSeconds(60), function () use ($testId) {
            return self::buildSummary($testId);
        });
    }

    private static function buildSummary(int $testId): array
    {
        $questionIds = DB::table('questions')
            ->join('topics', 'questions.topic_id', '=', 'topics.id')
            ->join('test_topics', 'topics.id', '=', 'test_topics.topic_id')
            ->where('test_topics.test_id', $testId)
            ->where('questions.is_active', true)
            ->orderBy('questions.id')
            ->pluck('questions.id');

        $totalQuestions = $questionIds->count();

        if ($totalQuestions === 0) {
            return self::getEmptyStats();
        }

        $questionIds = $questionIds->take(100)->values();

        $participantsQuery = DB::table('test_users')
            ->where('test_users.test_id', $testId)
            ->where('test_users.status', 'submitted');

        $totalParticipants = (int) $participantsQuery->count();

        if ($totalParticipants === 0) {
            return self::getEmptyStats();
        }

        $scoresData = DB::table('test_users')
            ->leftJoin('results', 'test_users.id', '=', 'results.test_user_id')
            ->where('test_users.test_id', $testId)
            ->where('test_users.status', 'submitted')
            ->selectRaw('COALESCE(results.total_score, 0) as total_score')
            ->pluck('total_score')
            ->map(fn($score) => (float) $score);

        $avgScore = (float) ($scoresData->avg() ?? 0);
        $stats = [
            'total_participants' => $totalParticipants,
            'average_score' => round($avgScore, 2),
            'highest_score' => (float) ($scoresData->max() ?? 0),
            'lowest_score' => (float) ($scoresData->min() ?? 0),
            'passed_count' => $scoresData->filter(fn($score) => $score >= 76)->count(),
            'failed_count' => $scoresData->filter(fn($score) => $score < 76)->count(),
        ];

        $distribution = [
            '0-20' => $scoresData->filter(fn($score) => $score >= 0 && $score <= 20)->count(),
            '21-40' => $scoresData->filter(fn($score) => $score > 20 && $score <= 40)->count(),
            '41-60' => $scoresData->filter(fn($score) => $score > 40 && $score <= 60)->count(),
            '61-80' => $scoresData->filter(fn($score) => $score > 60 && $score <= 80)->count(),
            '81-100' => $scoresData->filter(fn($score) => $score > 80 && $score <= 100)->count(),
        ];

        $questions = Question::with(['answers:id,question_id,answer_text,answer_image,is_correct'])
            ->whereIn('id', $questionIds)
            ->select(['id', 'question_text', 'question_image'])
            ->get()
            ->sortBy(function ($question) use ($questionIds) {
                return $questionIds->search($question->id);
            })
            ->values();

        $questionStats = DB::table('user_answers')
            ->join('test_users', 'user_answers.test_user_id', '=', 'test_users.id')
            ->where('test_users.test_id', $testId)
            ->where('test_users.status', 'submitted')
            ->whereIn('user_answers.question_id', $questionIds)
            ->selectRaw('user_answers.question_id')
            ->selectRaw('COUNT(*) as total_responses')
            ->selectRaw('SUM(CASE WHEN user_answers.is_correct = 1 THEN 1 ELSE 0 END) as correct_count')
            ->selectRaw('SUM(CASE WHEN user_answers.is_correct = 0 THEN 1 ELSE 0 END) as wrong_count')
            ->selectRaw('SUM(CASE WHEN user_answers.is_correct IS NULL AND (user_answers.answer_id IS NOT NULL OR TRIM(COALESCE(user_answers.answer_text, "")) != "") THEN 1 ELSE 0 END) as waiting_count')
            ->groupBy('user_answers.question_id')
            ->get()
            ->keyBy('question_id');

        $answerCountsRows = DB::table('user_answers')
            ->join('test_users', 'user_answers.test_user_id', '=', 'test_users.id')
            ->where('test_users.test_id', $testId)
            ->where('test_users.status', 'submitted')
            ->whereIn('user_answers.question_id', $questionIds)
            ->whereNotNull('user_answers.answer_id')
            ->selectRaw('user_answers.question_id, user_answers.answer_id, COUNT(*) as selection_count')
            ->groupBy('user_answers.question_id', 'user_answers.answer_id')
            ->get();

        $answerCountsByQuestion = [];
        foreach ($answerCountsRows as $row) {
            $questionId = (int) $row->question_id;
            $answerId = (int) $row->answer_id;
            $answerCountsByQuestion[$questionId][$answerId] = (int) $row->selection_count;
        }

        $essayQuestionIds = $questions
            ->filter(fn($question) => $question->answers->isEmpty())
            ->pluck('id')
            ->values();

        $essayResponsesByQuestion = [];
        if ($essayQuestionIds->isNotEmpty()) {
            $essayRowsSub = DB::table('user_answers')
                ->join('test_users', 'user_answers.test_user_id', '=', 'test_users.id')
                ->join('users', 'test_users.user_id', '=', 'users.id')
                ->where('test_users.test_id', $testId)
                ->where('test_users.status', 'submitted')
                ->whereIn('user_answers.question_id', $essayQuestionIds)
                ->whereRaw('TRIM(COALESCE(user_answers.answer_text, "")) != ""')
                ->selectRaw('user_answers.id')
                ->selectRaw('user_answers.question_id')
                ->selectRaw('user_answers.answer_text')
                ->selectRaw('user_answers.is_correct')
                ->selectRaw('users.name as student_name')
                ->selectRaw('ROW_NUMBER() OVER (PARTITION BY user_answers.question_id ORDER BY user_answers.id DESC) as rn');

            $essayRows = DB::query()
                ->fromSub($essayRowsSub, 'ranked_essay')
                ->where('rn', '<=', 20)
                ->orderBy('question_id')
                ->orderByDesc('id')
                ->get([
                    'id',
                    'question_id',
                    'answer_text',
                    'is_correct',
                    'student_name',
                ]);

            $essayResponsesByQuestion = $essayRows
                ->groupBy('question_id')
                ->map(function ($items) {
                    return $items->map(function ($item) {
                        $status = 'waiting';
                        if ((int) $item->is_correct === 1) {
                            $status = 'correct';
                        }
                        if ((int) $item->is_correct === 0) {
                            $status = 'wrong';
                        }

                        return [
                            'id' => $item->id,
                            'student_name' => $item->student_name,
                            'text' => $item->answer_text,
                            'status' => $status,
                        ];
                    })->values();
                })
                ->toArray();
        }

        $questionAnalysis = $questions->map(function ($question) use (
            $questionStats,
            $totalParticipants,
            $answerCountsByQuestion,
            $essayResponsesByQuestion
        ) {
            $statsRow = $questionStats->get($question->id);
            $correctCount = (int) ($statsRow->correct_count ?? 0);
            $wrongCount = (int) ($statsRow->wrong_count ?? 0);
            $waitingCount = (int) ($statsRow->waiting_count ?? 0);
            $totalResponses = (int) ($statsRow->total_responses ?? 0);
            $unansweredCount = max(0, $totalParticipants - $totalResponses);

            $countsForQuestion = $answerCountsByQuestion[$question->id] ?? [];
            $answersStats = $question->answers->map(function ($answer) use ($countsForQuestion, $totalParticipants) {
                $count = (int) ($countsForQuestion[$answer->id] ?? 0);

                return [
                    'answer_text' => $answer->answer_text,
                    'answer_image' => $answer->answer_image,
                    'is_correct' => $answer->is_correct,
                    'selection_count' => $count,
                    'selection_pct' => $totalParticipants > 0 ? round(($count / $totalParticipants) * 100, 1) : 0,
                ];
            })->values();

            return [
                'id' => $question->id,
                'question_text' => $question->question_text,
                'question_image' => $question->question_image,
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
                'student_responses' => $essayResponsesByQuestion[$question->id] ?? [],
            ];
        })->values();

        return [
            'stats' => $stats,
            'distribution' => $distribution,
            'top_students' => self::getTopStudents($testId, $totalQuestions),
            'questions' => $questionAnalysis,
        ];
    }

    private static function getTopStudents(int $testId, int $totalQuestions): array
    {
        $topStudents = DB::table('test_users')
            ->join('users', 'test_users.user_id', '=', 'users.id')
            ->leftJoin('results', 'test_users.id', '=', 'results.test_user_id')
            ->where('test_users.test_id', $testId)
            ->where('test_users.status', 'submitted')
            ->select('users.name', 'test_users.finished_at')
            ->selectRaw('COALESCE(results.total_score, 0) as score')
            ->orderByDesc('score')
            ->limit(5)
            ->get();

        return $topStudents->map(function ($item) {
            $score = (float) $item->score;

            return [
                'name' => $item->name,
                'score' => $score,
                'finished_at' => $item->finished_at ? \Carbon\Carbon::parse($item->finished_at)->diffForHumans() : '-',
            ];
        })->toArray();
    }

    private static function getEmptyStats(): array
    {
        return [
            'stats' => [
                'total_participants' => 0,
                'average_score' => 0,
                'highest_score' => 0,
                'lowest_score' => 0,
                'passed_count' => 0,
                'failed_count' => 0,
            ],
            'distribution' => [
                '0-20' => 0,
                '21-40' => 0,
                '41-60' => 0,
                '61-80' => 0,
                '81-100' => 0,
            ],
            'top_students' => [],
            'questions' => [],
        ];
    }
}
