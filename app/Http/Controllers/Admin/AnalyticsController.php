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

            $participants = TestUser::with('user')
                ->where('test_id', $currentTestId)
                ->latest('updated_at')
                ->get()
                ->map(function ($p) use ($totalQuestions) {
                    // ✅ Use ScoringService for consistent realtime calculation
                    $score = ScoringService::calculate($p);

                    return [
                        'id' => $p->id,
                        'user' => $p->user,
                        'status' => $p->status,
                        'started_at' => $p->started_at,
                        'finished_at' => $p->finished_at,
                        'answered_count' => $p->answers()->whereNotNull('answer_id')->count(),
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
