<?php

namespace App\Http\Controllers\Peserta;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\TestUser;
use App\Models\Result;
//  PENTING: Tambahkan Import Service Ini
use App\Services\CBT\ScoringService;
use App\Services\CBT\QuestionGeneratorService;
use App\Services\CBT\ExamStateService; // Opsional jika masih dipakai
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        // 1.  LOGIKA BARU: Force Submit Ujian yang Waktunya Habis
        // Ambil semua ujian yang statusnya masih 'ongoing' (sedang dikerjakan)
        $ongoingTests = TestUser::with('test')
            ->where('user_id', $user->id)
            ->where('status', 'ongoing')
            ->get();

        foreach ($ongoingTests as $testUser) {
            $test = $testUser->test;

            // Hitung kapan seharusnya ujian selesai (Started + Durasi)
            // Tambah toleransi 1 menit untuk latency jaringan
            $deadline = $testUser->started_at->addMinutes($test->duration)->addMinute();

            // Cek juga batas waktu global ujian (end_time)
            $globalDeadline = Carbon::parse($test->end_time);

            // Jika waktu SEKARANG sudah melewati batas waktu personal ATAU global
            if (now()->gt($deadline) || now()->gt($globalDeadline)) {

                // 🛑 FORCE SUBMIT: Ubah status jadi submitted, bukan expired
                $testUser->update([
                    'status' => 'submitted',
                    'finished_at' => now() // Set waktu selesai sekarang
                ]);

                // 🧮 HITUNG NILAI OTOMATIS
                $totalScore = ScoringService::calculate($testUser);

                // Simpan ke tabel results
                $testUser->result()->updateOrCreate(
                    ['test_user_id' => $testUser->id],
                    ['total_score' => $totalScore, 'status' => 'validated']
                );

                // Bersihkan sesi soal
                QuestionGeneratorService::clear($testUser->test_id, $testUser->user_id);
            }
        }

        // 2. 📊 Hitung Statistik Dashboard (Setelah force submit dijalankan)

        // Total Ujian = Semua ujian aktif untuk user ini
        $totalTests = Test::whereHas('groups', function ($q) use ($user) {
            $q->whereIn('groups.id', $user->groups->pluck('id'));
        })->where('is_active', true)->count();

        // Ujian Selesai = Yang statusnya 'submitted'
        $completedTests = TestUser::where('user_id', $user->id)
            ->where('status', 'submitted')
            ->count();


        // Rata-rata Nilai (Hanya yang sudah divalidasi oleh admin)
        $averageScore = Result::whereHas('testUser', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })
            ->where('status', 'validated') //  Tambahkan filter ini
            ->avg('total_score');

        $summary = [
            'total_tests' => $totalTests,
            'completed_tests' => $completedTests,
            'average_score' => $averageScore ? round($averageScore, 1) : 0,
        ];


        // 3. 📋 Ambil Daftar Ujian untuk Tampilan List
        $recentTests = Test::whereHas('groups', function ($q) use ($user) {
            $q->whereIn('groups.id', $user->groups->pluck('id'));
        })
            ->where('is_active', true)
            ->with(['testUsers' => function ($q) use ($user) {
                $q->where('user_id', $user->id);
            }, 'testUsers.result'])
            ->get()
            ->map(function ($test) {
                $testUser = $test->testUsers->first();

                $now = now();
                $status = 'KERJAKAN';
                $score = null;
                $sortPriority = 2;

                if ($testUser) {
                    $score = $testUser->result ? $testUser->result->total_score : null;

                    if ($testUser->status == 'submitted') {
                        $status = 'SELESAI';
                        $sortPriority = 4;
                    } elseif ($testUser->status == 'expired') {
                        // Jika masih ada yang expired (kasus lama), tetap tampilkan
                        $status = 'KADALUARSA';
                        $sortPriority = 5;
                    } elseif ($testUser->status == 'ongoing') {
                        if ($now > $test->end_time) {
                            // Ini hanya visual status, eksekusi submit sudah dilakukan di atas
                            $status = 'KADALUARSA';
                            $sortPriority = 5;
                        } else {
                            $status = 'LANJUTKAN';
                            $sortPriority = 1;
                        }
                    }
                } else {
                    if ($now < $test->start_time) {
                        $status = 'BELUM_MULAI';
                        $sortPriority = 3;
                    } elseif ($now > $test->end_time) {
                        $status = 'KADALUARSA';
                        $sortPriority = 5;
                    } else {
                        $status = 'KERJAKAN';
                        $sortPriority = 0;
                    }
                }

                return [
                    'id' => $test->id,
                    'title' => $test->title,
                    'description' => $test->description,
                    'duration' => $test->duration,
                    'start_time' => Carbon::parse($test->start_time)->toIso8601String(),
                    'user_status' => $status,
                    'score' => $score,
                    'sort_priority' => $sortPriority,
                ];
            })
            ->sortBy('sort_priority')
            ->values()
            ->take(10);

        return inertia('Peserta/Dashboard', [
            'summary' => $summary,
            'recentTests' => $recentTests,
        ]);
    }
}
