<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\TestUser;
use App\Services\CBT\ExamTimeService;

class EnsureExamTimeIsValid
{
    public function handle($request, Closure $next)
    {
        $testUser = $request->route('testUser');

        if ($testUser instanceof TestUser) {
            if (!ExamTimeService::isStillRunning($testUser)) {
                abort(403, 'Waktu ujian telah habis');
            }
        }

        return $next($request);
    }
}
