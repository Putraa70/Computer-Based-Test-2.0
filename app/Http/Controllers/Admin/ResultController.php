<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TestUser;
use App\Services\CBT\ScoringService;
use Inertia\Inertia;

class ResultController extends Controller
{
    public function index()
    {
        $resultsQuery = TestUser::with('user', 'test', 'result')
            ->select('test_users.*')
            ->whereHas('result');

        ScoringService::selectFinalScore($resultsQuery);
        ScoringService::orderByFinalScore($resultsQuery);

        return inertia('Admin/Results/Index', [
            'results' => $resultsQuery
                ->paginate(10)
        ]);
    }
}
