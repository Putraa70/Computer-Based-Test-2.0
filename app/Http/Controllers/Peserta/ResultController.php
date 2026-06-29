<?php

namespace App\Http\Controllers\Peserta;

use App\Http\Controllers\Controller;
use App\Models\TestUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ResultController extends Controller {
    public function index(Request $request) {
        $query = TestUser::with(['test', 'result'])
            ->where('user_id', Auth::id())
            ->whereIn('status', ['submitted', 'expired'])
            ->latest();

        $perPageFilter = $this->resolvePerPageFilter($request);

        return inertia('Peserta/Results/Index', [
            'results' => $query
                ->paginate($this->resolvePerPage($request, $query))
                ->appends(array_merge($request->query(), ['per_page' => $perPageFilter])),
            'filters' => ['per_page' => $perPageFilter],
        ]);
    }

    private function resolvePerPage(Request $request, $query = null): int
    {
        if ($request->input('per_page') === 'all' && $query) {
            return max(1, (clone $query)->count());
        }

        $perPage = (int) $request->input('per_page', 100);

        return in_array($perPage, [100, 500], true) ? $perPage : 100;
    }

    private function resolvePerPageFilter(Request $request): int|string
    {
        if ($request->input('per_page') === 'all') {
            return 'all';
        }

        $perPage = (int) $request->input('per_page', 100);

        return in_array($perPage, [100, 500], true) ? $perPage : 100;
    }

    public function show(TestUser $testUser)
    {
        // Cek: ini hasil ujiannya sendiri?
        if ($testUser->user_id !== Auth::id()) abort(403);
        
        // Load data dasar
        $testUser->load(['test', 'result']);
        $isValidated = $testUser->result && $testUser->result->status === 'validated';
        
        $reviewData = [];

        if ($isValidated) {
            // Ambil semua soal + opsi jawaban & jawaban user
            $testUser->load(['test.topics.questions.answers', 'answers']);
            
            // Gabungin soal dengan jawaban user
            $allQuestions = $testUser->test->topics->flatMap->questions;
            $userAnswersMap = $testUser->answers->keyBy('question_id');

            $reviewData = $allQuestions->map(function($question, $index) use ($userAnswersMap) {
                $userAnswer = $userAnswersMap->get($question->id);
                
                return [
                    'no' => $index + 1,
                    'question_text' => $question->question_text,
                    'type' => $question->type,
                    'options' => $question->answers,
                    'user_answer_id' => $userAnswer?->answer_id,
                    'user_essay' => $userAnswer?->essay_answer,
                    'is_correct' => $userAnswer?->is_correct ?? false,
                    'is_answered' => !!$userAnswer,
                ];
            });
        }

        // Hitung statistik jawaban
        if ($isValidated) {
            $totalQ = count($reviewData);
            $correct = $testUser->answers->where('is_correct', 1)->count();
            $answered = $testUser->answers->count();
            
            $testUser->result->total_correct = $correct;
            $testUser->result->total_incorrect = $answered - $correct;
            $testUser->result->total_unanswered = $totalQ - $answered;
        }

        return inertia('Peserta/Results/Detail', [
            'testUser' => $testUser,
            'isValidated' => $isValidated,
            'reviewData' => $reviewData,
            'message' => !$isValidated ? 'Menunggu validasi Admin.' : null
        ]);
    }
}
