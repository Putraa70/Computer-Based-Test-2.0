<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class ActivityLogger
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            $userId = Auth::id();
            $throttleKey = 'user-online-throttle-' . $userId;

            // PENTING: Untuk answer endpoint, track setiap request (jangan throttle)
            if ($request->routeIs('peserta.tests.answer')) {
                // Answer endpoint = paling sering di-call saat mengerjakan soal
                // Selalu update Redis agar "Pengguna Online" ter-detect saat load test
                $key = 'user-online-' . $userId;
                \Illuminate\Support\Facades\Cache::put($key, [
                    'ip' => $request->ip(),
                    'last_activity' => now(),
                    'role' => Auth::user()->role,
                    'name' => Auth::user()->name,
                    'npm' => Auth::user()->npm ?? '-',
                ], 300); // 5 menit TTL
                return $next($request);
            }

            // Untuk endpoint lain, gunakan throttle (1 update per 60 detik)
            if (!Cache::add($throttleKey, true, 60)) {
                return $next($request);
            }

            // kunci cache unik per user
            $key = 'user-online-' . $userId;
            // disini untuk menyimpan hasil request data dan disimpan dalam 5 menit (300detik)
            \Illuminate\Support\Facades\Cache::put($key, [
                'ip' => $request->ip(),
                'last_activity' => now(),
                'role' => Auth::user()->role,
                'name' => Auth::user()->name,
                'npm' => Auth::user()->npm ?? '-',
            ], 300);
        }

        return $next($request);
    }
}
