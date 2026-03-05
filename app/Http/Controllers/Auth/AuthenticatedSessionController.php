<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuthenticatedSessionController extends Controller
{
    public function create()
    {
        return inertia('Auth/Login');
    }

    public function store(LoginRequest $request)
    {
        $previousSessionId = $request->session()->getId();

        $request->authenticate();

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $userId = $user->id;

        DB::transaction(function () use ($request, $userId, $previousSessionId, &$user) {
            // Lock row user untuk mencegah race condition pada concurrent login
            $user = \App\Models\User::where('id', $userId)
                ->lockForUpdate()
                ->first();

            // Cek apakah user punya session lama di browser/perangkat lain
            if ($user->active_session_id && $user->active_session_id !== $previousSessionId) {

                $currentTimestamp = now()->timestamp;
                $sessionLifetime = (int) config('session.lifetime') * 60;
                $minimumLastActivity = $currentTimestamp - $sessionLifetime;

                // Query langsung dengan kondisi, lebih cepat daripada fetch lalu compare
                $sessionMasihAktif = DB::table('sessions')
                    ->where('id', $user->active_session_id)
                    ->where('user_id', $user->id)
                    ->where('last_activity', '>=', $minimumLastActivity)
                    ->exists();

                // Jika session masih aktif → blok login
                if ($sessionMasihAktif) {
                    Auth::logout();
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();

                    throw ValidationException::withMessages([
                        'login' => 'Akun Anda sedang digunakan di perangkat lain.',
                    ]);
                }

                // Session sudah expired/tidak ada → reset
                $user->active_session_id = null;
            }

            // Regenerate session & update active_session_id
            $request->session()->regenerate();
            $user->active_session_id = $request->session()->getId();
            $user->save();
        });

        return $user->role === 'admin'
            ? redirect()->intended(route('admin.dashboard'))
            : redirect()->intended(route('peserta.dashboard'));
    }

    public function destroy()
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::user();

        if ($user) {
            $user->update([
                'active_session_id' => null
            ]);
        }

        Auth::logout();

        request()->session()->invalidate();
        request()->session()->regenerateToken();

        return redirect()->route('login');
    }
}
