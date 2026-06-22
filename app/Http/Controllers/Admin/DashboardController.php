<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Test;
use App\Models\TestUser;
// use App\Models\Result; // Tidak wajib jika tidak dipakai di stats
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        return inertia('Admin/Dashboard', [
            // 1. STATS (Fungsi Lama Tetap Aman)
            'stats' => [
                'totalUsers'   => User::where('role', 'peserta')->count(),
                'totalTests'   => Test::count(),
                'activeTests'  => Test::where('is_active', true)->count(),
                'ongoingTests' => TestUser::where('status', 'ongoing')->count(),
            ],

            // 2. LATEST TESTS (Diperbarui untuk ambil Modul & Topik)
            'latestTests' => Test::with(['topics.module']) // Load relasi
                ->latest()
                ->limit(5)
                ->get()
                ->map(function ($test) {
                    return [
                        'id'          => $test->id,
                        'title'       => $test->title,
                        // Format tanggal agar rapi di tabel (Opsional, bisa dihapus formatnya jika mau raw)
                        'start_time'  => Carbon::parse($test->start_time)->format('d M Y H:i'),
                        'end_time'    => Carbon::parse($test->end_time)->format('d M Y H:i'),

                        // Logika untuk mengambil Nama Topik (Gabung koma jika banyak)
                        'topic_name'  => $test->topics->pluck('name')->join(', ') ?: '-',

                        // Logika untuk mengambil Nama Modul (Unique agar tidak duplikat)
                        'module_name' => $test->topics->pluck('module.name')->unique()->join(', ') ?: '-',
                    ];
                }),
        ]);
    }
}
