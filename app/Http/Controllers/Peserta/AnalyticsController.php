<?php

namespace App\Http\Controllers\Peserta;

use App\Http\Controllers\Controller;
use App\Services\Statistics\StudentStatisticsService;
use Illuminate\Support\Facades\Auth;

class AnalyticsController extends Controller
{
    public function index()
    {
        return inertia('Peserta/Statistics', [
            'summary' => StudentStatisticsService::details(Auth::id()),
        ]);
    }
}
