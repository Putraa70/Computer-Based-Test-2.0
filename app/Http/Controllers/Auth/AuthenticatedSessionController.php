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

        $request->session()->regenerate();

        /** @var \App\Models\User $user */
        $user = Auth::user();

        // 🔒 INVALIDATE SESSION LAMA (Logout dari device lain)
        if ($user->active_session_id) {
            // Hapus session lama dari tabel sessions
            DB::table('sessions')->where('id', $user->active_session_id)->delete();
        }

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

