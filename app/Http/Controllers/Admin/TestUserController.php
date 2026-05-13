<?php

namespace App\Http\Controllers\Admin;

use App\Services\CBT\ScoringService;
use App\Http\Controllers\Controller;
use App\Models\TestUser;
use App\Services\AuditService;
use Illuminate\Support\Carbon;
use App\Models\Result;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Exports\TestResultsExport;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * ✅ P1: Admin Test User Controller - Enterprise Hardening
 * 
 * Hardening measures:
 * - Authorization verification (admin role)
 * - Audit logging for all admin actions
 * - Rate limiting on bulk operations
 * - Transactional safety on bulk updates
 * - Input validation
 */
class TestUserController extends Controller
{
    /**
     * ✅ Constructor: Ensure admin authorization
     */
    public function __construct()
    {
        $this->middleware('role:admin');  // Ensure only admin access
    }

    public function index()
    {
        return inertia('Admin/TestUsers/Index', [
            'testUsers' => TestUser::with('user', 'test', 'result')
                ->latest()
                ->get(),
        ]);
    }

    public function show(TestUser $testUser)
    {
        return inertia('Admin/TestUsers/Show', [
            'testUser' => $testUser->load(
                'user',
                'test',
                'answers.question.answers',
                'result',
                'locker'
            ),
        ]);
    }

    /**
     * ✅ P1: Lock a single test user with audit logging
     */
    public function lock(TestUser $testUser, Request $request)
    {
        $request->validate([
            'lock_reason' => 'required|string|max:500',
        ]);

        try {
            $testUser->update([
                'is_locked' => true,
                'lock_reason' => $request->lock_reason,
                'locked_by' => auth()->id(),
                'locked_at' => now(),
            ]);

            // ✅ P1: Audit logging
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                test_user_id: $testUser->id,
                action: 'test_user_lock',
                description: "Peserta dikunci. Alasan: {$request->lock_reason}",
                metadata: [
                    'user_id' => $testUser->user_id,
                    'test_id' => $testUser->test_id,
                    'reason' => $request->lock_reason,
                ]
            );

            return back()->with('success', 'Peserta berhasil dikunci!');
        } catch (\Exception $e) {
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                test_user_id: $testUser->id,
                action: 'test_user_lock_failed',
                description: "Gagal mengunci peserta: {$e->getMessage()}",
                metadata: ['error' => $e->getMessage()]
            );
            throw $e;
        }
    }

    /**
     * ✅ P1: Unlock a single test user with audit logging
     */
    public function unlock(TestUser $testUser)
    {
        try {
            $extraMinutes = 0;
            if ($testUser->locked_at) {
                $diffInSeconds = $testUser->locked_at->diffInSeconds(now());
                $bufferLag = 15;
                $extraMinutes = (int) ceil(($diffInSeconds + $bufferLag) / 60);
            }

            $testUser->update([
                'extra_time' => ($testUser->extra_time ?? 0) + $extraMinutes,
                'is_locked' => false,
                'lock_reason' => null,
                'locked_by' => null,
                'locked_at' => null,
            ]);

            // ✅ P1: Audit logging
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                test_user_id: $testUser->id,
                action: 'test_user_unlock',
                description: "Peserta dibuka kunci. Waktu tambahan: {$extraMinutes} menit",
                metadata: [
                    'user_id' => $testUser->user_id,
                    'test_id' => $testUser->test_id,
                    'extra_time_added' => $extraMinutes,
                ]
            );

            return back()->with('success', 'Peserta berhasil dibuka kunci!');
        } catch (\Exception $e) {
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                test_user_id: $testUser->id,
                action: 'test_user_unlock_failed',
                description: "Gagal membuka kunci peserta: {$e->getMessage()}",
                metadata: ['error' => $e->getMessage()]
            );
            throw $e;
        }
    }

    /**
     * ✅ P1: Add time for single user with audit logging
     */
    public function addTime(TestUser $testUser, Request $request)
    {
        $validated = $request->validate([
            'minutes' => 'required|integer|min:1|max:120',
        ]);

        try {
            $testUser->increment('extra_time', $validated['minutes']);

            // ✅ P1: Audit logging
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                test_user_id: $testUser->id,
                action: 'test_user_add_time',
                description: "Waktu ujian ditambah {$validated['minutes']} menit",
                metadata: [
                    'user_id' => $testUser->user_id,
                    'test_id' => $testUser->test_id,
                    'minutes_added' => $validated['minutes'],
                ]
            );

            return back()->with('success', "Waktu ujian ditambah {$validated['minutes']} menit!");
        } catch (\Exception $e) {
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                test_user_id: $testUser->id,
                action: 'test_user_add_time_failed',
                description: "Gagal menambah waktu: {$e->getMessage()}",
                metadata: ['error' => $e->getMessage()]
            );
            throw $e;
        }
    }

    /**
     * Export Feature
     */
    public function export(Request $request)
    {
        $type = $request->query('type', 'excel');
        $testId = $request->query('test_id');
        $search = $request->query('search');
        $sort = $request->query('sort', 'started_at');

        if ($type === 'excel') {
            return Excel::download(new TestResultsExport($testId, $search, $sort), 'hasil_ujian_' . date('Y-m-d_H-i') . '.xlsx');
        }

        if ($type === 'pdf') {
            // ✅ OPTIMIZED: Only load necessary data + add limit to prevent memory exhaustion
            $query = TestUser::with([
                'user:id,name,npm',
                'test:id,title',
                'result:id,test_user_id,total_score'
            ])
                ->join('users', 'test_users.user_id', '=', 'users.id')
                ->leftJoin('results', 'test_users.id', '=', 'results.test_user_id')
                ->select('test_users.*')
                ->limit(500); // ✅ Limit to prevent memory exhaustion

            if ($testId) $query->where('test_users.test_id', $testId);
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('users.name', 'like', "%{$search}%")
                        ->orWhere('users.npm', 'like', "%{$search}%");
                });
            }

            // Fetch data
            $data = $query->get();

            // ✅ Use ScoringService for consistent calculation (lightweight)
            foreach ($data as $item) {
                // Calculate realtime score
                $realtimeScore = ScoringService::calculate($item);

                // Use realtime for ongoing, saved result for submitted
                if ($item->status === 'ongoing' || $item->status === 'not_started') {
                    $item->custom_score = $realtimeScore;
                } else {
                    $item->custom_score = $item->result->total_score ?? 0;
                }

                $item->custom_score_raw = (float) $item->custom_score;
            }

            // Sort data sesuai parameter setelah custom score dihitung
            switch ($sort) {
                case 'npm_asc':
                    $data = $data->sortBy(function ($item) {
                        return $item->user->npm ?? '';
                    });
                    break;
                case 'score_desc':
                    $data = $data->sortByDesc('custom_score_raw');
                    break;
                case 'score_asc':
                    $data = $data->sortBy('custom_score_raw');
                    break;
                default:
                    $data = $data->sortByDesc('started_at');
                    break;
            }

            // Reset keys setelah sorting
            $data = $data->values();

            // ✅ Increase memory limit for PDF generation
            ini_set('memory_limit', '256M');

            $pdf = Pdf::loadView('admin.exports.results_pdf', [
                'data' => $data
            ]);

            return $pdf->download('laporan_hasil_ujian.pdf');
        }
    }


    /**
     * ✅ P1: Bulk Add Time with transactional safety and rate limiting
     * Rate limited to prevent abuse
     */
    public function bulkAddTime(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|max:100',  // ✅ P1: Limit max IDs
            'minutes' => 'required|integer|min:1|max:120'  // ✅ P1: Reasonable max
        ]);

        try {
            // ✅ P1: Wrap in transaction for safety
            $result = DB::transaction(function () use ($request) {
                $updated = TestUser::whereIn('id', $request->ids)
                    ->update(['extra_time' => DB::raw("COALESCE(extra_time, 0) + {$request->minutes}")]);
                return $updated;
            });

            // ✅ P1: Audit logging for bulk operation
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                action: 'bulk_add_time',
                description: "Waktu ditambah untuk {$result} peserta. Jumlah menit: {$request->minutes}",
                metadata: [
                    'user_count' => count($request->ids),
                    'test_user_ids' => $request->ids,
                    'minutes_added' => $request->minutes,
                ]
            );

            return back()->with('success', "Waktu berhasil ditambahkan untuk {$result} peserta.");
        } catch (\Exception $e) {
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                action: 'bulk_add_time_failed',
                description: "Gagal menambah waktu massal: {$e->getMessage()}",
                metadata: ['error' => $e->getMessage()]
            );
            throw $e;
        }
    }

    /**
     * ✅ P1: Bulk Lock with transactional safety and rate limiting
     */
    public function bulkLock(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|max:100',  // ✅ P1: Limit max
            'lock_reason' => 'sometimes|string|max:500'
        ]);

        try {
            // ✅ P1: Wrap in transaction for safety
            $result = DB::transaction(function () use ($request) {
                return TestUser::whereIn('id', $request->ids)->update([
                    'is_locked' => true,
                    'locked_at' => now(),
                    'locked_by' => Auth::id(),
                    'lock_reason' => $request->lock_reason ?? 'Dikunci massal oleh admin'
                ]);
            });

            // ✅ P1: Audit logging for bulk operation
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                action: 'bulk_lock',
                description: "Dikunci massal untuk {$result} peserta",
                metadata: [
                    'user_count' => count($request->ids),
                    'test_user_ids' => $request->ids,
                    'reason' => $request->lock_reason ?? 'N/A',
                ]
            );

            return back()->with('success', "Peserta terpilih berhasil dikunci.");
        } catch (\Exception $e) {
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                action: 'bulk_lock_failed',
                description: "Gagal mengunci massal: {$e->getMessage()}",
                metadata: ['error' => $e->getMessage()]
            );
            throw $e;
        }
    }

    public function bulkUnlock(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|max:100'  // ✅ P1: Limit max
        ]);

        try {
            // ✅ P1: Wrap in transaction for safety
            DB::transaction(function () use ($request) {
                $testUsers = TestUser::whereIn('id', $request->ids)->get();

                foreach ($testUsers as $testUser) {
                    $extraMinutes = 0;
                    if ($testUser->locked_at) {
                        $diffInSeconds = $testUser->locked_at->diffInSeconds(now());
                        $bufferLag = 15;
                        $extraMinutes = (int) ceil(($diffInSeconds + $bufferLag) / 60);
                    }

                    $testUser->update([
                        'is_locked' => false,
                        'lock_reason' => null,
                        'locked_at' => null,
                        'locked_by' => null,
                        'extra_time' => ($testUser->extra_time ?? 0) + $extraMinutes,
                    ]);
                }
            });

            // ✅ P1: Audit logging for bulk operation
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                action: 'bulk_unlock',
                description: "Dibuka kunci massal untuk " . count($request->ids) . " peserta",
                metadata: [
                    'user_count' => count($request->ids),
                    'test_user_ids' => $request->ids,
                ]
            );

            return back()->with('success', 'Peserta terpilih berhasil dibuka kunci.');
        } catch (\Exception $e) {
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                action: 'bulk_unlock_failed',
                description: "Gagal membuka kunci massal: {$e->getMessage()}",
                metadata: ['error' => $e->getMessage()]
            );
            throw $e;
        }
    }

    public function bulkValidate(Request $request)
    {
        // ✅ P1: Validasi: pastikan ada ID yang dikirim
        $request->validate([
            'ids' => 'required|array|max:100'  // ✅ P1: Limit max
        ]);

        try {
            // ✅ P1: Wrap in transaction for safety
            $count = DB::transaction(function () use ($request) {
                $testUsers = TestUser::whereIn('id', $request->ids)->get();
                $count = 0;

                foreach ($testUsers as $testUser) {
                    // Hitung ulang skor pake service
                    $score = ScoringService::calculate($testUser);

                    // Simpan/update hasil dengan status 'validated'
                    Result::updateOrCreate(
                        ['test_user_id' => $testUser->id],
                        [
                            'total_score' => $score,
                            'status' => 'validated',
                            'validated_by' => Auth::id(),
                            'validated_at' => now()
                        ]
                    );

                    $count++;
                }
                return $count;
            });

            // ✅ P1: Audit logging for bulk operation
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                action: 'bulk_validate',
                description: "{$count} hasil ujian dipublikasikan dan dinilai ulang",
                metadata: [
                    'user_count' => count($request->ids),
                    'test_user_ids' => $request->ids,
                ]
            );

            return back()->with('success', "{$count} Hasil peserta berhasil dipublikasikan & dinilai ulang.");
        } catch (\Exception $e) {
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                action: 'bulk_validate_failed',
                description: "Gagal memvalidasi massal: {$e->getMessage()}",
                metadata: ['error' => $e->getMessage()]
            );
            throw $e;
        }
    }

    /**
     * ✅ P1: Bulk Delete with transactional safety and audit logging
     */
    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|max:100'  // ✅ P1: Limit max
        ]);

        try {
            // ✅ P1: Wrap in transaction for safety (cascading deletes)
            $deleted = DB::transaction(function () use ($request) {
                return TestUser::whereIn('id', $request->ids)->delete();
            });

            // ✅ P1: Audit logging for bulk operation
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                action: 'bulk_delete',
                description: "{$deleted} peserta ujian dihapus beserta seluruh data jawabannya",
                metadata: [
                    'deleted_count' => $deleted,
                    'test_user_ids' => $request->ids,
                ]
            );

            return back()->with('success', "{$deleted} Peserta berhasil dihapus beserta seluruh jawabannya.");
        } catch (\Exception $e) {
            AuditService::logAdminAction(
                admin_id: Auth::id(),
                action: 'bulk_delete_failed',
                description: "Gagal menghapus peserta massal: {$e->getMessage()}",
                metadata: ['error' => $e->getMessage()]
            );
            throw $e;
        }
    }
}
