<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TestUser;
use App\Services\CBT\ForceSubmitService;
use App\Services\AuditService;
use Illuminate\Support\Facades\Auth;
use Exception;

class ForceSubmitController extends Controller
{
    public function submit(TestUser $testUser)
    {
        try {
            // ✅ Admin authorization (middleware already checks role:admin)
            if (!Auth::user() || Auth::user()->role !== 'admin') {
                throw new Exception('Unauthorized', 403);
            }

            // ✅ Log intent
            AuditService::logAdminAction(
                'force_submit_initiated',
                $testUser->id,
                'Admin initiated force submission',
                ['admin_id' => Auth::id()]
            );

            // ✅ Execute force submit with P0 protections
            ForceSubmitService::force($testUser, Auth::id());

            return redirect()
                ->back()
                ->with('success', 'Ujian peserta berhasil di-force submit');

        } catch (Exception $e) {
            // ✅ Log the error
            AuditService::logSecurityEvent(
                'force_submit_failed',
                $testUser->id,
                "Force submit failed: {$e->getMessage()}",
                ['error' => $e->getMessage()]
            );

            return redirect()
                ->back()
                ->withErrors('Gagal melakukan force submit: ' . $e->getMessage());
        }
    }
}
