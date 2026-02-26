<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Test;
use App\Models\TestUser;

class EnsureSafeExamBrowser
{
    public function handle(Request $request, Closure $next)
    {
        // Coba ambil test dari route parameter
        $test = null;

        // Untuk route /tests/{test}/start
        if ($request->route('test')) {
            $test = $request->route('test') instanceof Test
                ? $request->route('test')
                : Test::find($request->route('test'));
        }

        // Untuk route /tests/{testUser}/answer, /submit, /update-progress
        if (!$test && $request->route('testUser')) {
            $testUser = $request->route('testUser') instanceof TestUser
                ? $request->route('testUser')
                : TestUser::find($request->route('testUser'));

            if ($testUser) {
                $test = $testUser->test;
            }
        }

        // Jika test ditemukan dan memerlukan SEB, cek user agent
        if ($test && $test->require_seb) {
            $userAgent = $request->userAgent();

            // Deteksi Safe Exam Browser
            if (!$userAgent || !str_contains($userAgent, 'SEB')) {
                abort(403, 'Ujian ini hanya dapat diakses menggunakan Safe Exam Browser (SEB)');
            }
        }

        return $next($request);
    }
}
