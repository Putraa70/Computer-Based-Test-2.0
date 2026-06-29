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
use App\Services\CBT\ExamTimeService;
use App\Services\CBT\QuestionGeneratorService;
use App\Services\CBT\ScoringService;
use App\Services\CBT\SecureExamToken;
use App\Services\AuditService;
use App\Guards\ExamOwnershipGuard;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Bus\Batch;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\QueryException;

class TestController extends Controller
{
    private function examConfigVersion(TestUser $testUser): string
    {
        $testUser->loadMissing('test');

        return $testUser->test
            ? QuestionGeneratorService::configVersion($testUser->test)
            : md5('missing-test:' . $testUser->test_id);
    }

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
        $startedAt = microtime(true);

        if (now() > $test->end_time) {
            return redirect()->route('peserta.tests.index')->withErrors('Waktu habis.');
        }

        $testUser = TestUser::firstOrCreate(
            ['test_id' => $test->id, 'user_id' => $user->id],
            ['started_at' => now(), 'status' => 'ongoing']
        );

        // ✅ P0: Verify ownership
        try {
            ExamOwnershipGuard::validate($testUser);
        } catch (\Exception $e) {
            return redirect()->route('peserta.dashboard')->withErrors('Akses ditolak.');
        }

        if (is_null($testUser->started_at)) {
            $testUser->update(['started_at' => now(), 'status' => 'ongoing']);
            AuditService::logExamEvent('start', $testUser->id, ['test_id' => $test->id]);
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

        $test->loadMissing('topics');
        $questions = collect();
        $questionError = null;

        for ($attempt = 1; $attempt <= 2; $attempt++) {
            try {
                $questions = QuestionGeneratorService::getQuestions($test, $user->id);
                $questionError = null;
                break;
            } catch (\Throwable $e) {
                $questionError = $e;

                if ($attempt === 1) {
                    usleep(50000);
                }
            }
        }

        if ($questionError) {
            Log::warning('exam.start.question_resolution_failed', [
                'test_id' => $test->id,
                'user_id' => $user->id,
                'error' => $questionError->getMessage(),
            ]);
        }

        $configuredTotalQuestions = (int) $test->topics->sum(function ($topic) {
            return (int) ($topic->pivot->total_questions ?? 0);
        });
        $totalQuestions = $questions->count() > 0
            ? $questions->count()
            : $configuredTotalQuestions;

        if ($totalQuestions <= 0) {
            $totalQuestions = (int) $test->topics
                ->flatMap(fn ($topic) => $topic->questions)
                ->where('is_active', true)
                ->count();
        }

        $currentQuestionIds = $questions->pluck('id')->map(fn ($id) => (int) $id)->all();
        $validAnswerIds = $questions
            ->flatMap(fn ($question) => collect($question['answers'] ?? [])->pluck('id'))
            ->map(fn ($id) => (int) $id)
            ->all();

        $existingAnswers = $testUser->answers()
            ->select('question_id', 'answer_id', 'answer_text')
            ->when(!empty($currentQuestionIds), fn ($query) => $query->whereIn('question_id', $currentQuestionIds))
            ->get()
            ->mapWithKeys(function ($ans) use ($validAnswerIds) {
                $answerId = $ans->answer_id ? (int) $ans->answer_id : null;

                if ($answerId && !in_array($answerId, $validAnswerIds, true)) {
                    $answerId = null;
                }

                return [
                    $ans->question_id => [
                        'answerId' => $answerId,
                        'answerText' => $ans->answer_text
                    ]
                ];
            });

        $answeredCount = $existingAnswers
            ->filter(fn ($answer) => !is_null($answer['answerId']) || trim((string) ($answer['answerText'] ?? '')) !== '')
            ->count();

        $lastIndex = min((int) ($testUser->current_index ?? 0), max(0, $totalQuestions - 1));
        if ((int) $testUser->current_index !== $lastIndex) {
            $testUser->update([
                'current_index' => $lastIndex,
                'last_question_id' => $questions[$lastIndex]['id'] ?? null,
            ]);
        }

        // ✅ P0: Use secure encrypted token instead of predictable base64 token
        $examToken = SecureExamToken::generate($testUser->id);

        $response = inertia('Peserta/Tests/Start', [
            'test' => $test,
            'testUserId' => $testUser->id,
            'questions' => $questions,
            'totalQuestions' => $totalQuestions,
            'answeredCount' => $answeredCount,
            'remainingSeconds' => ExamTimeService::remainingSeconds($testUser),
            'existingAnswers' => $existingAnswers,
            'currentUser' => $user,
            'lastIndex' => $lastIndex,
            'examToken' => $examToken,  // ✅ Secure encrypted token
            'examConfigVersion' => $this->examConfigVersion($testUser),
        ]);

        Log::info('exam.start.completed', [
            'test_id' => $test->id,
            'user_id' => $user->id,
            'test_user_id' => $testUser->id,
            'question_count' => $questions->count(),
            'total_questions' => $totalQuestions,
            'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
        ]);

        return $response;
    }

    public function updateProgress(Request $request, TestUser $testUser)
    {
        // ✅ P0: Ownership validation
        try {
            ExamOwnershipGuard::validate($testUser);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 403);
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
        // ✅ P0: Ownership validation
        try {
            ExamOwnershipGuard::validate($testUser);
        } catch (\Exception $e) {
            AuditService::logSecurityEvent(
                'answer_ownership_violation',
                $testUser->id,
                "Unauthorized answer attempt",
                ['question_id' => $request->question_id]
            );
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 403);
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

        AuditService::logAnswerEvent(
            $testUser->id,
            $data['question_id'],
            $data['answer_id'] ?? null,
            false
        );

        $this->touchActivityIfNeeded($testUser);

        return response()->json(['status' => 'saved']);
    }

    /**
     * Batch save multiple answers at once (optimized for performance)
     * FIX KRITIS #1: Changed to synchronous upsert to prevent data loss
     *
     * @param BatchAnswerRequest $request
     * @param TestUser $testUser
     * @return \Illuminate\Http\JsonResponse
     */
    public function batchAnswer(BatchAnswerRequest $request, TestUser $testUser)
    {
        // ✅ P0: Ownership validation
        try {
            ExamOwnershipGuard::validate($testUser);
        } catch (\Exception $e) {
            AuditService::logSecurityEvent(
                'batch_answer_ownership_violation',
                $testUser->id,
                "Unauthorized batch answer attempt",
                ['answer_count' => count($request->answers ?? [])]
            );
            return response()->json(['error' => $e->getMessage()], 403);
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

        try {
            // ✅ PERBAIKAN KRITIS #1: Synchronous upsert with transaction
            // Prevents data loss from queue failures
            DB::transaction(function () use ($testUser, $answers) {
                AnswerService::upsertBatch($testUser->id, $answers);
                $testUser->update(['last_activity_at' => now()]);
            });

            // ✅ Shadow cache untuk stateless polling
            Cache::put(
                "user_answers:{$testUser->id}",
                count($answers),
                300
            );

            AuditService::logAnswerEvent(
                $testUser->id,
                0,  // Not a single question
                null,
                true  // is_batch
            );

            return response()->json([
                'status' => 'saved',
                'answer_count' => count($answers),
            ], 200);

        } catch (\Exception $e) {
            Log::error('Batch answer sync save failed', [
                'test_user_id' => $testUser->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyimpan jawaban, refresh halaman',
            ], 500);
        }
    }

    public function submit(TestUser $testUser)
    {
        // ✅ P0: Ownership validation
        try {
            ExamOwnershipGuard::validate($testUser);
        } catch (\Exception $e) {
            AuditService::logSecurityEvent(
                'submit_ownership_violation',
                $testUser->id,
                "Unauthorized submit attempt"
            );
            return abort(403, $e->getMessage());
        }

        $lockKey = "cbt:submit:test_user:{$testUser->id}";
        $lockTtlSeconds = 20;
        $lockWaitSeconds = 5;

        try {
            // Lapisan lock cache mencegah autosubmit + manual submit overlap lintas request.
            $lock = Cache::lock($lockKey, $lockTtlSeconds);

            $result = $lock->block($lockWaitSeconds, function () use ($testUser) {
                // Pessimistic lock di DB menjaga konsistensi row walau lock cache tidak aktif.
                return DB::transaction(function () use ($testUser) {
                    $lockedTestUser = TestUser::where('id', $testUser->id)
                        ->lockForUpdate()
                        ->firstOrFail();

                    if ($lockedTestUser->is_locked) {
                        throw new \Exception('Exam is locked', 403);
                    }

                    if ($lockedTestUser->status === 'expired' || !ExamTimeService::isStillRunning($lockedTestUser)) {
                        throw new \RuntimeException('Exam time has expired');
                    }

                    // Idempotent: request submit ulang tidak mengulang insert dan dianggap sukses.
                    if ($lockedTestUser->status === 'submitted') {
                        $existingResult = $lockedTestUser->result()->first();

                        Log::warning('exam.submit.duplicate_detected', [
                            'test_user_id' => $lockedTestUser->id,
                            'result_exists' => (bool) $existingResult,
                        ]);

                        if (!$existingResult) {
                            $totalScore = ScoringService::calculate($lockedTestUser);
                            $test = $lockedTestUser->test;
                            $resultStatus = $test->results_to_users ? 'validated' : 'pending';

                            $lockedTestUser->result()->updateOrCreate(
                                ['test_user_id' => $lockedTestUser->id],
                                [
                                    'total_score' => $totalScore,
                                    'status' => $resultStatus,
                                    'validated_at' => $resultStatus === 'validated' ? now() : null,
                                    'validated_by' => $resultStatus === 'validated' ? auth()->id() : null,
                                ]
                            );

                            Log::warning('exam.submit.result_recovered_after_duplicate', [
                                'test_user_id' => $lockedTestUser->id,
                                'total_score' => $totalScore,
                                'status' => $resultStatus,
                            ]);
                        } else {
                            Log::info('exam.submit.existing_result_reused', [
                                'test_user_id' => $lockedTestUser->id,
                                'result_id' => $existingResult->id,
                            ]);
                        }

                        return [
                            'already_submitted' => true,
                        ];
                    }

                    $lockedTestUser->update([
                        'status' => 'submitted',
                        'finished_at' => now(),
                    ]);

                    $totalScore = ScoringService::calculate($lockedTestUser);
                    $test = $lockedTestUser->test;
                    $resultStatus = $test->results_to_users ? 'validated' : 'pending';

                    $result = $lockedTestUser->result()->updateOrCreate(
                        ['test_user_id' => $lockedTestUser->id],
                        [
                            'total_score' => $totalScore,
                            'status' => $resultStatus,
                            'validated_at' => $resultStatus === 'validated' ? now() : null,
                            'validated_by' => $resultStatus === 'validated' ? auth()->id() : null,
                        ]
                    );

                    Log::info('exam.submit.race_condition_prevented', [
                        'test_user_id' => $lockedTestUser->id,
                        'result_id' => $result->id,
                        'total_score' => $totalScore,
                        'status' => $resultStatus,
                    ]);

                    AuditService::logExamEvent('submit', $lockedTestUser->id, [
                        'total_score' => $totalScore,
                        'status' => $resultStatus,
                    ]);

                    QuestionGeneratorService::clear(
                        $lockedTestUser->test_id,
                        $lockedTestUser->user_id
                    );

                    return [
                        'already_submitted' => false,
                    ];
                }, attempts: 5);
            });

            if ($result['already_submitted'] ?? false) {
                return redirect()
                    ->route('peserta.dashboard')
                    ->with('success', 'Ujian sudah selesai. Silakan kembali ke dashboard.');
            }
        } catch (LockTimeoutException $e) {
            Log::warning('exam.submit.lock_timeout_duplicate_submit', [
                'test_user_id' => $testUser->id,
                'lock_key' => $lockKey,
            ]);

            return redirect()
                ->route('peserta.dashboard')
                ->with('success', 'Submit sedang diproses. Hasil akan tetap tersimpan.');
        } catch (QueryException $e) {
            // Proteksi terakhir jika ada race dari jalur lain di luar lock.
            if (
                (string) $e->getCode() === '23000' &&
                str_contains(strtolower($e->getMessage()), 'results_test_user_id_unique')
            ) {
                Log::warning('exam.submit.duplicate_key_recovered', [
                    'test_user_id' => $testUser->id,
                    'sql_state' => $e->getCode(),
                    'error' => $e->getMessage(),
                ]);

                return redirect()
                    ->route('peserta.dashboard')
                    ->with('success', 'Ujian sudah tersubmit. Hasil yang ada digunakan.');
            }

            throw $e;
        } catch (\Throwable $e) {
            $message = strtolower($e->getMessage());

            if (
                str_contains($message, 'exam already completed') ||
                str_contains($message, 'exam time has expired')
            ) {
                return redirect()
                    ->route('peserta.dashboard')
                    ->with('success', 'Ujian sudah selesai. Silakan kembali ke dashboard.');
            }

            throw $e;
        }

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
            'exam_config_version' => $this->examConfigVersion($testUser),
        ]);
    }

    /**
     * Stateless polling using secure token (no session reads, replay-safe)
     * ✅ P0: Uses SecureExamToken for encryption + tamper detection
     * ✅ P1: Reduced cache TTL to prevent stale lock information
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

        // ✅ P0: Verify secure token (detects tampering, prevents forgery)
        $payload = SecureExamToken::verify($token);

        if (!$payload) {
            AuditService::logSecurityEvent(
                'invalid_token_polling',
                null,
                'Invalid or tampered token in polling',
                ['ip' => request()->ip()]
            );
            return response()->json(['error' => 'Invalid or expired token'], 401);
        }

        $testUserId = $payload['test_user_id'];

        // ✅ P1: Reduced cache TTL from 5min to 30s to prevent stale lock information
        // If admin locks exam, client knows within 30 seconds instead of up to 5 minutes
        $status = Cache::remember(
            "exam_status:{$testUserId}",
            30,  // ✅ Reduced from 300s to 30s for faster update propagation
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
                    'exam_config_version' => $this->examConfigVersion($testUser),
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
            'exam_config_version' => $status['exam_config_version'],
        ]);
    }
}
