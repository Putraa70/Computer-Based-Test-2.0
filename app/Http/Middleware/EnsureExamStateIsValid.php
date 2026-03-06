<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\TestUser;
use App\Services\CBT\ExamStateService;

class EnsureExamStateIsValid
{
    public function handle($request, Closure $next)
    {
        $routeMiddlewares = $request->route()?->gatherMiddleware() ?? [];

        if (
            in_array('exam.time', $routeMiddlewares, true)
            || in_array(EnsureExamTimeIsValid::class, $routeMiddlewares, true)
        ) {
            return $next($request);
        }

        $testUser = $request->route('testUser');

        if ($testUser instanceof TestUser) {
            ExamStateService::autoExpire($testUser);
        }

        return $next($request);
    }
}
