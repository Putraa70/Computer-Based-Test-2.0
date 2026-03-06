<?php

namespace App\Http\Controllers\Peserta;

use App\Http\Controllers\Controller;
use App\Http\Requests\Peserta\SaveAnswerRequest;
use App\Http\Requests\Peserta\BatchAnswerRequest;
use App\Jobs\BatchSaveAnswers;
use App\Models\Test;
use App\Models\TestUser;
use App\Services\CBT\AnswerService;
use App\Services\CBT\ExamStateService;
//  PASTIKAN IMPORT INI BENAR (MENGARAH KE CBT)
use App\Services\CBT\ExamTimeService;
use App\Services\CBT\QuestionGeneratorService;
use App\Services\CBT\ScoringService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Bus\Batch;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;

class TestController extends Controller
{
    private function touchActivityIfNeeded(TestUser $testUser): void
    {
        $now = now();
        $threshold = (clone $now)->subSeconds(20);

        TestUser::whereKey($testUser->id)
            ->where(function ($query) use ($threshold) {
                $query->whereNull('last_activity_at')
                    ->orWhere('last_activity_at', '<', $threshold);
            })
            ->update([
                'last_activity_at' => $now,
            ]);
    }

    private function resolveAnswerMeta(int $questionId, ?int $answerId): array
    {
        if (!$answerId) {
            return [
                'isCorrect' => null,
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
                'isCorrect' => null,
                'score' => 0,
            ];
        }

        $isCorrect = (bool) $answerMeta->is_correct;

        return [
            'isCorrect' => $isCorrect,
            'score' => $isCorrect ? (int) $answerMeta->score : 0,
        ];
    }

    public function index()
    {
        $user = Auth::user();

        $tests = Test::whereHas('groups', function ($q) use ($user) {
            $q->whereIn('groups.id', $user->groups->pluck('id'));
        })
            ->where('is_active', true)
            ->get()
            ->map(function ($test) use ($user) {
                $testUser = TestUser::where('test_id', $test->id)
                    ->where('user_id', $user->id)
                    ->first();

                $now = now();
                $status = 'KERJAKAN';
                $priority = 2;

                if ($testUser) {
                    if ($testUser->status == 'submitted') {
                        $status = 'SELESAI';
                        $priority = 4;
                    } elseif ($testUser->status == 'expired') {
                        $status = 'KADALUARSA';
                        $priority = 5;
                    } elseif ($testUser->status == 'ongoing') {
                        if ($now > $test->end_time) {
                            $status = 'KADALUARSA';
                            $priority = 5;
                        } else {
                            $status = 'LANJUTKAN';
                            $priority = 1;
                        }
                    }
                } else {
                    if ($now < $test->start_time) {
                        $status = 'BELUM_MULAI';
                        $priority = 3;
                    } elseif ($now > $test->end_time) {
                        $status = 'KADALUARSA';
                        $priority = 5;
                    } else {
                        $status = 'KERJAKAN';
                        $priority = 2;
                    }
                }

                $test->user_status = $status;
                $test->sort_priority = $priority;
                return $test;
            })
            ->sortBy([
                ['sort_priority', 'asc'],
                ['start_time', 'desc'],
            ])
            ->values();

        return inertia('Peserta/Tests/Index', compact('tests'));
    }

    public function start(Test $test)
    {
        $user = Auth::user();

        if (now() > $test->end_time) {
            return redirect()->route('peserta.tests.index')->withErrors('Waktu habis.');
        }

        $testUser = TestUser::firstOrCreate(
            ['test_id' => $test->id, 'user_id' => $user->id],
            ['started_at' => now(), 'status' => 'ongoing']
        );

        if (is_null($testUser->started_at)) {
            $testUser->update(['started_at' => now(), 'status' => 'ongoing']);
        }

        $testUser->update(['last_activity_at' => now()]);

        ExamStateService::autoExpire($testUser);
        if ($testUser->status === 'expired' || $testUser->status === 'submitted') {
            return redirect()->route('peserta.dashboard')->withErrors('Akses ditutup.');
        }

        if ($testUser->is_locked) {
            return redirect()->route('peserta.dashboard')
                ->withErrors(['error' => 'Akun ujian Anda dikunci: ' . ($testUser->lock_reason ?? 'Hubungi pengawas.')]);
        }

        $questions = QuestionGeneratorService::getQuestions($test, $user->id);

        $existingAnswers = $testUser->answers()
            ->select('question_id', 'answer_id', 'answer_text')
            ->get()
            ->mapWithKeys(function ($ans) {
                return [
                    $ans->question_id => [
                        'answerId' => $ans->answer_id,
                        'answerText' => $ans->answer_text
                    ]
                ];
            });

        // ✅ Generate stateless token for polling (no session locking)
        $examToken = \App\Services\CBT\ExamStatusToken::issue($testUser->id);

        return inertia('Peserta/Tests/Start', [
            'test' => $test,
            'testUserId' => $testUser->id,
            'questions' => $questions,
            'remainingSeconds' => ExamTimeService::remainingSeconds($testUser),
            'existingAnswers' => $existingAnswers,
            'currentUser' => $user,
            'lastIndex' => $testUser->current_index ?? 0,
            'examToken' => $examToken,  // ✅ For stateless polling
        ]);
    }

    public function updateProgress(Request $request, TestUser $testUser)
    {
        if ($testUser->user_id !== Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($testUser->status !== 'ongoing') {
            return response()->json(['status' => 'stopped', 'message' => 'Ujian telah berakhir'], 403);
        }

        if ($testUser->is_locked) {
            return response()->json([
                'status' => 'locked',
                'message' => 'Ujian Anda sedang dikunci oleh pengawas.'
            ], 403);
        }

        $validated = $request->validate([
            'index' => 'required|integer|min:0',
            'question_id' => 'nullable|exists:questions,id'
        ]);

        $newQuestionId = $validated['question_id'] ?? null;
        $updatePayload = [];

        if ((int) $testUser->current_index !== (int) $validated['index']) {
            $updatePayload['current_index'] = (int) $validated['index'];
        }

        if ($testUser->last_question_id != $newQuestionId) {
            $updatePayload['last_question_id'] = $newQuestionId;
        }

        if (!empty($updatePayload)) {
            TestUser::whereKey($testUser->id)->update($updatePayload);
        }

        $this->touchActivityIfNeeded($testUser);

        return response()->json(['status' => 'saved']);
    }

    public function answer(SaveAnswerRequest $request, TestUser $testUser)
    {
        if ($testUser->status !== 'ongoing') {
            return response()->json(['status' => 'error', 'message' => 'Ujian telah berakhir.'], 403);
        }

        if ($testUser->is_locked) {
            return response()->json([
                'status' => 'locked',
                'message' => 'Ujian Anda sedang dikunci oleh pengawas.'
            ], 403);
        }

        $data = $request->validated();

        $answerMeta = $this->resolveAnswerMeta(
            (int) $data['question_id'],
            isset($data['answer_id']) ? (int) $data['answer_id'] : null
        );

        AnswerService::save(
            $testUser->id,
            $data['question_id'],
            $data['answer_id'] ?? null,
            $data['answer_text'] ?? null,
            $answerMeta['isCorrect'],
            $answerMeta['score']
        );

        $this->touchActivityIfNeeded($testUser);

        return response()->json(['status' => 'saved']);
    }

    /**
     * Batch save multiple answers at once (optimized for performance)
     *
     * @param BatchAnswerRequest $request
     * @param TestUser $testUser
     * @return \Illuminate\Http\JsonResponse
     */
    public function batchAnswer(BatchAnswerRequest $request, TestUser $testUser)
    {
        if ($testUser->user_id !== Auth::id()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        if ($testUser->status !== 'ongoing') {
            return response()->json(['status' => 'error', 'message' => 'Ujian telah berakhir.'], 403);
        }

        if ($testUser->is_locked) {
            return response()->json([
                'status' => 'locked',
                'message' => 'Ujian Anda sedang dikunci oleh pengawas.'
            ], 403);
        }

        $validated = $request->validated();
        $answers = $validated['answers'] ?? [];

        if (empty($answers)) {
            return response()->json(['status' => 'skipped'], 202);
        }

        // ✅ Queue async batch save instead of synchronous DB write
        // This prevents lock contention and improves response time to <50ms
        Bus::dispatch(new BatchSaveAnswers($testUser->id, $answers));

        // Return immediately (202 Accepted) - don't wait for save to complete
        return response()->json([
            'status' => 'queued',
            'message' => 'Answers queued for processing',
        ], 202);
    }

    public function submit(TestUser $testUser)
    {
        if ($testUser->user_id !== Auth::id()) {
            abort(403);
        }

        $testUser->update([
            'status' => 'submitted',
            'finished_at' => now()
        ]);

        $totalScore = ScoringService::calculate($testUser);
        $test = $testUser->test;
        $status = $test->results_to_users ? 'validated' : 'pending';

        $testUser->result()->create([
            'total_score'  => $totalScore,
            'status'       => $status,
            'validated_at' => $status === 'validated' ? now() : null,
            'validated_by' => $status === 'validated' ? auth()->id() : null,
        ]);

        QuestionGeneratorService::clear(
            $testUser->test_id,
            $testUser->user_id
        );

        return redirect()
            ->route('peserta.dashboard')
            ->with('success', 'Ujian berhasil diselesaikan.');
    }

    /**
     * Cek Status & Sisa Waktu (Polling)
     */
    public function checkStatus(TestUser $testUser)
    {
        $remaining = ExamTimeService::remainingSeconds($testUser);

        return response()->json([
            'status' => $testUser->is_locked ? 'locked' : 'ongoing',
            'remaining_seconds' => max(0, $remaining),
            'message' => $testUser->lock_reason,
        ]);
    }

    /**
     * Stateless polling using token (no session reads)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function checkStatusStateless(Request $request)
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Missing token'], 401);
        }

        // Verify token without reading session
        $payload = \App\Services\CBT\ExamStatusToken::verify($token);

        if (!$payload) {
            return response()->json(['error' => 'Invalid or expired token'], 401);
        }

        $testUserId = $payload['test_user_id'];

        // ✅ Query Redis directly (or cache, no session lock)
        $status = Cache::remember(
            "exam_status:{$testUserId}",
            300,  // 5-minute cache
            function () use ($testUserId) {
                $testUser = TestUser::find($testUserId);

                if (!$testUser) {
                    return null;
                }

                return [
                    'is_locked' => $testUser->is_locked,
                    'lock_reason' => $testUser->lock_reason,
                    'extra_time' => $testUser->extra_time,
                    'status' => $testUser->status,
                ];
            }
        );

        if (!$status) {
            return response()->json(['error' => 'Test user not found'], 404);
        }

        $testUser = TestUser::find($testUserId);
        $remaining = ExamTimeService::remainingSeconds($testUser);

        return response()->json([
            'status' => $status['is_locked'] ? 'locked' : 'ongoing',
            'remaining_seconds' => max(0, $remaining),
            'message' => $status['lock_reason'],
        ]);
    }
}
