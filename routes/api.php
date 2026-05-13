<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HealthCheckController;

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// ✅ P2: Health check endpoint for monitoring
Route::get('/health', [HealthCheckController::class, 'check'])
    ->withoutMiddleware([\App\Http\Middleware\HandleInertiaRequests::class]);

// routes/web.php

Route::get('/api/time', function () {
    return response()->json([
        'server_time' => now()->toDateTimeString(),
    ]);
})->withoutMiddleware([\App\Http\Middleware\HandleInertiaRequests::class]);
