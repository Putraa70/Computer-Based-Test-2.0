<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class EnsureSingleSession
{
    public function handle(Request $request, Closure $next)
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::user();

        // 1. Lewati jika belum login atau jika dia Admin
        if (!$user || $user->role === 'admin') {
            return $next($request);
        }

        $currentSessionId = session()->getId();

        // 2. Jika di DB berbeda dengan browser sekarang
        if ($user->active_session_id && $user->active_session_id !== $currentSessionId) {

            //  CEK VALIDITAS SESSION LAMA
            // Ambil dari tabel sessions bawaan Laravel
            $sessionMasihAktif = DB::table('sessions')
                ->where('id', $user->active_session_id)
                ->exists();

            if (!$sessionMasihAktif) {
                // Jika session lama sudah hangus/tidak ada di tabel, update otomatis (Self-Healing)
                $user->update(['active_session_id' => $currentSessionId]);
                return $next($request);
            }

            // 3. Jika BENAR-BENAR masih aktif di perangkat lain
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->withErrors([
                'login' => 'Akun Anda sedang digunakan di perangkat lain.'
            ]);
        }

        return $next($request);
    }
}
