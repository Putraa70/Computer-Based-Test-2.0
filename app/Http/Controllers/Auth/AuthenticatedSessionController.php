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
        $request->authenticate();

        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 🔒 CEK APAKAH USER SUDAH LOGIN DI PERANGKAT LAIN
        if ($user->active_session_id) {
            // Cek apakah session lama masih valid di DB
            $oldSessionExists = DB::table('sessions')
                ->where('id', $user->active_session_id)
                ->exists();

            if ($oldSessionExists) {
                // Jika session lama masih aktif, TOLAK LOGIN
                Auth::logout();
                request()->session()->invalidate();
                request()->session()->regenerateToken();

                throw ValidationException::withMessages([
                    'email' => 'Akun Anda sedang digunakan di perangkat lain. Hubungi administrator jika ingin logout paksa.',
                ]);
            }
        }

        $request->session()->regenerate();

        // Update session baru
        $user->update(['active_session_id' => session()->getId()]);

        return $user->role === 'admin'
            ? redirect()->intended(route('admin.dashboard'))
            : redirect()->intended(route('peserta.dashboard'));
    }

    public function destroy()
    {
        $user = Auth::user();
        if ($user) {
            $user->update(['active_session_id' => null]);
        }

        Auth::logout();
        request()->session()->invalidate();
        request()->session()->regenerateToken();

        return redirect()->route('login');
    }
}


