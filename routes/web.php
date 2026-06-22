<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::post('/login', [AuthenticatedSessionController::class, 'store']);
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

/*
|--------------------------------------------------------------------------
| ROOT (SMART REDIRECT – ANTI LOOP)
|--------------------------------------------------------------------------
*/
Route::get('/', function () {
    if (auth()->check()) {
        return auth()->user()->role === 'admin'
            ? redirect()->route('admin.dashboard')
            : redirect()->route('peserta.dashboard');
    }

    if (session()->has('errors') || session()->has('error')) {
        return redirect()->route('login');
    }

    return Inertia::render('Welcome');
});

Route::get('/api/time', function () {
    // Gunakan response()->json() untuk memaksa output menjadi JSON murni
    return response()->json([
        'time' => now()->toDateTimeString(),
        'timestamp' => now()->timestamp
    ]);
})->withoutMiddleware([\App\Http\Middleware\HandleInertiaRequests::class]);
