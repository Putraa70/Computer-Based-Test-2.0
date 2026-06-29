<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TestUser;
use App\Services\CBT\ScoringService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ResultController extends Controller
{
    public function index(Request $request)
    {
        $resultsQuery = TestUser::with('user', 'test', 'result')
            ->select('test_users.*')
            ->whereHas('result');

        ScoringService::selectFinalScore($resultsQuery);
        ScoringService::orderByFinalScore($resultsQuery);

        $perPageFilter = $this->resolvePerPageFilter($request);

        return inertia('Admin/Results/Index', [
            'results' => $resultsQuery
                ->paginate($this->resolvePerPage($request, $resultsQuery))
                ->appends(array_merge($request->query(), ['per_page' => $perPageFilter])),
            'filters' => ['per_page' => $perPageFilter],
        ]);
    }

    private function resolvePerPage(Request $request, $query = null): int
    {
        if ($request->input('per_page') === 'all' && $query) {
            return max(1, (clone $query)->count());
        }

        $perPage = (int) $request->input('per_page', 100);

        return in_array($perPage, [100, 500], true) ? $perPage : 100;
    }

    private function resolvePerPageFilter(Request $request): int|string
    {
        if ($request->input('per_page') === 'all') {
            return 'all';
        }

        $perPage = (int) $request->input('per_page', 100);

        return in_array($perPage, [100, 500], true) ? $perPage : 100;
    }
}
