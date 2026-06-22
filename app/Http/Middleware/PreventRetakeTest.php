<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\TestUser;
use Illuminate\Support\Facades\Auth;

class PreventRetakeTest
{
    private function shouldBypassForLoadTest($request): bool
    {
        return (bool) config('app.load_test_bypass_single_session', false)
            && $request->headers->get('X-Load-Test') === '1';
    }

    public function handle($request, Closure $next)
    {
        if ($this->shouldBypassForLoadTest($request)) {
            return $next($request);
        }

        $user = Auth::user();
        $test = $request->route('test');

        if (!$test) {
            return $next($request);
        }

        $testUser = TestUser::where('test_id', $test->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$testUser) {
            return $next($request);
        }

        if (in_array($testUser->status, ['submitted', 'expired'])) {
            abort(403, 'Anda sudah menyelesaikan ujian ini');
        }

        return $next($request);
    }
}
