<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Test;
use App\Exports\TestResultsExport;
use Maatwebsite\Excel\Facades\Excel;

class ExportResultController extends Controller
{
    public function export(Test $test)
    {
        return Excel::download(
            new TestResultsExport($test->id),
            'hasil-ujian-' . $test->id . '.xlsx'
        );
    }
}
