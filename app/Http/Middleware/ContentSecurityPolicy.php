<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ContentSecurityPolicy
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        if (app()->environment('local')) {
            // DEV (Vite + Inertia)
            $csp = "
                default-src 'self';
                script-src 'self' http://localhost:5173;
                style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
                font-src 'self' https://fonts.gstatic.com;
                connect-src 'self' ws://localhost:5173 http://localhost:5173;
                img-src 'self' data:;
            ";
        } else {
            // PROD / CBT / SEB
            $csp = "
                default-src 'self';
                script-src 'self';
                style-src 'self';
                font-src 'self';
                connect-src 'self';
                img-src 'self' data:;
            ";
        }

        $response->headers->set(
            'Content-Security-Policy',
            preg_replace('/\s+/', ' ', trim($csp))
        );

        return $response;
    }
}
