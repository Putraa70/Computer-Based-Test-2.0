<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Models\TestUser;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MonitoringController extends Controller
{
    /**
     * Halaman Monitoring Realtime
     */
    public function index(Request $request)
    {
        // 1. Ambil daftar ujian yang aktif untuk dropdown
        $tests = Test::where('is_active', true)
            ->orderBy('created_at', 'desc')
            ->select('id', 'title', 'duration')
            ->get();

        // 2. Tentukan ujian mana yang dipilih (default: yang pertama)
        $currentTestId = $request->input('test_id', $tests->first()->id ?? null);

        $participants = [];

        if ($currentTestId) {
            // 3. Ambil peserta HANYA untuk ujian yang dipilih & belum selesai
            $participants = TestUser::with([
                'user',
                'test.questions.answers', // Load soal & opsi utk detail view
                'answers'                 // Load jawaban user
            ])
                ->where('test_id', $currentTestId)
                ->whereNull('finished_at') // Hanya yang sedang mengerjakan
                ->latest('updated_at')
                ->get();
        }

        return Inertia::render('Admin/Monitoring/Index', [
            'tests' => $tests,
            'currentTestId' => (int)$currentTestId,
            'participants' => $participants,
        ]);
    }

    /**
     * Tambah Waktu / Force Submit
     */
    public function forceSubmit(Request $request, $id)
    {
        $testUser = TestUser::findOrFail($id);

        // Jika request penambahan waktu
        if ($request->has('extend_minutes')) {
            // Asumsi: Anda punya kolom 'extra_time' di tabel test_users
            // Jika belum ada, buat migration: $table->integer('extra_time')->default(0);
            $testUser->increment('extra_time', $request->extend_minutes);
            return back()->with('success', "Waktu peserta berhasil ditambah {$request->extend_minutes} menit.");
        }

        // Jika force stop
        $testUser->update([
            'status' => 'submitted',
            'finished_at' => now()
        ]);

        return back()->with('success', 'Ujian peserta dihentikan paksa.');
    }
}
