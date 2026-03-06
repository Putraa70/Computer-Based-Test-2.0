<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class EnsureSingleSession
{
    private function shouldBypassForLoadTest(Request $request): bool
    {
        return (bool) config('app.load_test_bypass_single_session', false)
            && $request->headers->get('X-Load-Test') === '1';
    }

    private function singleSessionFeatureReady(): bool
    {
        return Schema::hasColumn('users', 'active_session_id')
            && Schema::hasTable('sessions')
            && Schema::hasColumn('sessions', 'user_id')
            && Schema::hasColumn('sessions', 'last_activity');
    }

    public function handle(Request $request, Closure $next)
    {
        if ($this->shouldBypassForLoadTest($request)) {
            return $next($request);
        }

        if (!$this->singleSessionFeatureReady()) {
            return $next($request);
        }

        /** @var \App\Models\User|null $user */
        $user = Auth::user();

        // 1. Lewati jika belum login atau jika dia Admin
        if (!$user || $user->role === 'admin') {
            return $next($request);
        }

        $currentSessionId = $request->session()->getId();

        // 2. Jika di DB berbeda dengan browser sekarang
        if ($user->active_session_id && $user->active_session_id !== $currentSessionId) {

            $currentTimestamp = now()->getTimestamp();
            $sessionLifetime = (int) config('session.lifetime') * 60;
            $minimumLastActivity = $currentTimestamp - $sessionLifetime;

            //  CEK VALIDITAS SESSION LAMA
            // Ambil dari tabel sessions bawaan Laravel
            $sessionMasihAktif = DB::table('sessions')
                ->where('id', $user->active_session_id)
                ->where('user_id', $user->id)
                ->whereBetween('last_activity', [$minimumLastActivity, $currentTimestamp + 300])
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
