<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RedirectIfAuthenticated
{
    public function handle(Request $request, Closure $next)
    {
        if (auth()->check()) {
            return auth()->user()->role === 'admin'
                ? redirect()->route('admin.dashboard')
                : redirect()->route('peserta.dashboard');
        }

        return $next($request);
    }
}
