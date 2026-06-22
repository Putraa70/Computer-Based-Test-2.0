<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\User;
use App\Services\Statistics\TestStatisticsService;
use App\Services\Statistics\StudentStatisticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use App\Models\Question;

class StatisticsController extends Controller
{
    /**
     * Menampilkan halaman statistik per ujian
     * (Chart, Distribusi Nilai, Top Student, & Analisis Butir Soal)
     * Route: admin.statistics.test
     */
    public function test(Test $test)
    {
        $summaryData = TestStatisticsService::summary($test->id);

        // Render ke: resources/js/Pages/Admin/Tests/Statistics.jsx
        return inertia('Admin/Tests/Statistics', [
            'test' => $test,
            'summary' => $summaryData,
        ]);
    }

    /**
     * Menampilkan halaman statistik per siswa
     * (Riwayat Ujian, Grafik Perkembangan, Statistik Personal)
     * Route: admin.statistics.student
     */
    public function student(User $user)
    {
        $user->load('groups');

        // Render ke: resources/js/Pages/Admin/Statistics/Student.jsx
        return inertia('Admin/Statistics/Student', [
            'student' => $user,
            'data' => StudentStatisticsService::details($user->id),
        ]);
    }

    public function gradeEssay(Request $request)
    {
        $request->validate([
            'answer_id' => 'required|exists:user_answers,id',
        ]);

        // 1. Fetch the submitted answer and related question
        $answerId = $request->answer_id;
        $userAnswer = DB::table('user_answers')->where('id', $answerId)->first();

        if (!$userAnswer) {
            return back()->withErrors('Data tidak ditemukan');
        }

        $question = Question::find($userAnswer->question_id);
        $correctAnswer = DB::table('answers')
            ->where('question_id', $question->id)
            ->where('is_correct', true)
            ->first();

        // 2. Determine correctness dynamically
        $isCorrect = $correctAnswer && $correctAnswer->id === $userAnswer->answer_id;
        $score = $isCorrect ? $question->score : 0;

        // 3. Update the database
        DB::table('user_answers')
            ->where('id', $answerId)
            ->update([
                'is_correct' => $isCorrect,
                'score' => $score,
            ]);

        $testUser = DB::table('test_users')
            ->where('id', $userAnswer->test_user_id)
            ->select('test_id')
            ->first();

        if ($testUser) {
            Cache::forget("statistics:test:summary:{$testUser->test_id}");
        }

        return back()->with('success', 'Nilai berhasil disimpan.');
    }
}
