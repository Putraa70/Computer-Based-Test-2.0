<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\Test;
use App\Models\TestUser;
use Illuminate\Support\Facades\Auth;

class EnsureTestAccess
{
    public function handle($request, Closure $next)
    {
        $user = Auth::user();

        // Ambil test dari route
        $test = $request->route('test');

        if (!$test instanceof Test) {
            // route pakai testUser
            $testUser = $request->route('testUser');
            $test = $testUser?->test;
        }

        if (!$test) {
            abort(404, 'Ujian tidak ditemukan');
        }

        // 1. Test aktif
        if (!$test->is_active) {
            abort(403, 'Ujian belum aktif');
        }

        // 2. Window waktu
        if (now()->lt($test->start_time) || now()->gt($test->end_time)) {
            abort(403, 'Ujian belum tersedia atau sudah berakhir');
        }

        // 3. Cek group user
        $userGroupIds = $user->groups->pluck('id');

        if (!$test->groups()->whereIn('groups.id', $userGroupIds)->exists()) {
            abort(403, 'Anda tidak terdaftar pada ujian ini');
        }

        return $next($request);
    }
}
