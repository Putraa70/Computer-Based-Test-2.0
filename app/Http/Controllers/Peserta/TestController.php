<?php

namespace App\Http\Controllers\Peserta;

use App\Http\Controllers\Controller;
use App\Http\Requests\Peserta\SaveAnswerRequest;
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
use App\Models\Answer;
use App\Models\Question;
use Illuminate\Support\Facades\DB;

class TestController extends Controller
{
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

        return inertia('Peserta/Tests/Start', [
            'test' => $test,
            'testUserId' => $testUser->id,
            'questions' => $questions,
            'remainingSeconds' => ExamTimeService::remainingSeconds($testUser),
            'existingAnswers' => $existingAnswers,
            'currentUser' => $user,
            'lastIndex' => $testUser->current_index ?? 0,
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

        $testUser->update([
            'current_index' => $validated['index'],
            'last_question_id' => $validated['question_id'] ?? null,
            'last_activity_at' => now()
        ]);

        return response()->json(['status' => 'saved']);
    }

    public function answer(SaveAnswerRequest $request, TestUser $testUser)
    {
        ExamStateService::autoExpire($testUser);

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

        $isCorrect = null;
        $score = null;

        // Logika Scoring hanya untuk Multiple Choice (jika ada answer_id)
        if (!empty($data['answer_id'])) {
            $answer = Answer::find($data['answer_id']);
            if ($answer) {
                $isCorrect = (bool) $answer->is_correct;
                if ($isCorrect) {
                    $question = Question::find($data['question_id']);
                    $score = $question?->score ?? 0;
                } else {
                    $score = 0;
                }
            }
        }
        // Jika Essay (answer_id kosong tapi answer_text ada)
        // isCorrect dan score tetap null agar nanti bisa dinilai manual oleh admin
        else if (!empty($data['answer_text'])) {
            $isCorrect = null;
            $score = null;
        }

        // Pindahkan AnswerService::save ke luar IF agar Essay tetap tersimpan
        AnswerService::save(
            $testUser->id,
            $data['question_id'],
            $data['answer_id'] ?? null,
            $data['answer_text'] ?? null,
            $isCorrect,
            $score
        );

        $testUser->update(['last_activity_at' => now()]);

        return response()->json(['status' => 'saved']);
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
        $baseDuration = ($testUser->test->duration + $testUser->extra_time) * 60; // detik

        if ($testUser->is_locked && $testUser->locked_at) {
            // Hanya hitung sampai waktu dikunci
            $elapsed = $testUser->locked_at->diffInSeconds($testUser->started_at);
            $remaining = $baseDuration - $elapsed;
        } else {
            // Normal
            $elapsed = now()->diffInSeconds($testUser->started_at);
            $remaining = $baseDuration - $elapsed;
        }

        return response()->json([
            'status' => $testUser->is_locked ? 'locked' : 'ongoing',
            'remaining_seconds' => max(0, $remaining),
            'message' => $testUser->lock_reason,
        ]);
    }
}
