<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\TestUser;
use Illuminate\Http\Request;
use Inertia\Inertia;
//  1. IMPORT SERVICE
use App\Services\CBT\ExamTimeService;
use App\Services\CBT\ScoringService;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        // ... (KODE INDEX TETAP SAMA, TIDAK PERLU DIUBAH) ...
        // Agar hemat tempat, saya skip bagian index karena tidak ada perubahan logic di sana
        $tests = Test::orderBy('created_at', 'desc')->select('id', 'title', 'duration')->get();
        $currentTestId = $request->input('test_id') ?? ($tests->first()->id ?? null);
        $participants = [];

        if ($currentTestId) {
            $testObj = Test::find($currentTestId);
            $totalQuestions = $testObj ? $testObj->questions->count() : 0;

            $participantsQuery = TestUser::with('user')
                ->select('test_users.*')
                ->where('test_id', $currentTestId);

            ScoringService::selectFinalScore($participantsQuery);
            ScoringService::orderByFinalScore($participantsQuery);

            $answeredCountsRaw = DB::table('user_answers')
                ->join('test_users', 'user_answers.test_user_id', '=', 'test_users.id')
                ->where('test_users.test_id', $currentTestId)
                ->whereNotNull('user_answers.answer_id')
                ->selectRaw('user_answers.test_user_id, COUNT(*) as answer_count')
                ->groupBy('user_answers.test_user_id')
                ->get()
                ->keyBy('test_user_id');

            $participants = $participantsQuery
                ->get()
                ->map(function ($p) use ($totalQuestions, $answeredCountsRaw) {
                    // ✅ Use ScoringService for consistent realtime calculation
                    $score = (float) ($p->final_score ?? ScoringService::calculate($p));
                    $answeredCount = $answeredCountsRaw[$p->id]->answer_count ?? 0;

                    return [
                        'id' => $p->id,
                        'user' => $p->user,
                        'status' => $p->status,
                        'started_at' => $p->started_at,
                        'finished_at' => $p->finished_at,
                        'answered_count' => (int) $answeredCount,
                        'score' => $score,
                    ];
                });
        }

        return Inertia::render('Admin/Tests/Analitics', [
            'tests' => $tests,
            'currentTestId' => (int)$currentTestId,
            'participants' => $participants,
        ]);
    }

    /**
     * Halaman 2: Detail Full Screen (ShowAnalytics.jsx)
     */
    public function show($id)
    {
        $testUser = TestUser::with([
            'user',
            'answers',
            'test.topics.questions.answers'
        ])->findOrFail($id);

        $allQuestions = $testUser->test->topics->flatMap(function ($topic) {
            return $topic->questions;
        });

        $testUser->test->setRelation('questions', $allQuestions);

        //  2. HITUNG SISA WAKTU DARI SERVER (YANG SUDAH SUPPORT LOCK)
        $remainingSeconds = ExamTimeService::remainingSeconds($testUser);

        //  3. HITUNG SCORE REALTIME
        $currentScore = ScoringService::calculate($testUser);

        return Inertia::render('Admin/Tests/ShowAnalytics', [
            'testUser' => $testUser,
            //  4. KIRIM KE FRONTEND
            'serverRemainingSeconds' => $remainingSeconds,
            'currentScore' => $currentScore
        ]);
    }

    /* ================= FORCE SUBMIT / TAMBAH WAKTU ================= */
    public function forceSubmit(Request $request, $id)
    {
        $testUser = \App\Models\TestUser::findOrFail($id);

        if ($request->has('extend_minutes') && $request->input('extend_minutes') > 0) {
            $testUser->increment('extra_time', (int)$request->extend_minutes);
            return redirect()->route('admin.analytics.show', $id)
                ->with('success', "Waktu berhasil ditambah {$request->extend_minutes} menit.");
        }

        $testUser->update([
            'status' => 'submitted',
            'finished_at' => now()
        ]);

        return redirect()->route('admin.analytics.show', $id)
            ->with('success', 'Ujian peserta berhasil dihentikan paksa.');
    }
}
