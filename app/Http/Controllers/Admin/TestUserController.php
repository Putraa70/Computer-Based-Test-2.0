<?php

namespace App\Http\Controllers\Admin;

use App\Services\CBT\ScoringService;
use App\Http\Controllers\Controller;
use App\Models\TestUser;
use Illuminate\Support\Carbon;
use App\Models\Result;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Exports\TestResultsExport;

class TestUserController extends Controller
{
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
     * Lock a single test user
     */
    public function lock(TestUser $testUser, Request $request)
    {
        $request->validate([
            'lock_reason' => 'required|string|max:500',
        ]);

        $testUser->update([
            'is_locked' => true,
            'lock_reason' => $request->lock_reason,
            'locked_by' => auth()->id(),
            'locked_at' => now(),
        ]);

        return back()->with('success', 'Peserta berhasil dikunci!');
    }

    /**
     * Unlock a single test user
     */
    public function unlock(TestUser $testUser)
    {
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

        return back()->with('success', 'Peserta berhasil dibuka kunci!');
    }

    /**
     * Add time for single user
     */
    public function addTime(TestUser $testUser, Request $request)
    {
        $validated = $request->validate([
            'minutes' => 'required|integer|min:1|max:120',
        ]);

        $testUser->increment('extra_time', $validated['minutes']);

        return back()->with('success', "Waktu ujian ditambah {$validated['minutes']} menit!");
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
            $query = TestUser::with(['user', 'test.topics.questions', 'answers', 'result'])
                ->join('users', 'test_users.user_id', '=', 'users.id')
                ->leftJoin('results', 'test_users.id', '=', 'results.test_user_id')
                ->select('test_users.*');

            if ($testId) $query->where('test_users.test_id', $testId);
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('users.name', 'like', "%{$search}%")
                        ->orWhere('users.npm', 'like', "%{$search}%");
                });
            }

            // Fetch data tanpa sorting dulu
            $data = $query->get();

            // Hitung custom score untuk setiap item
            foreach ($data as $item) {
                $totalQ = 0;
                if ($item->test && $item->test->topics) {
                    foreach ($item->test->topics as $topic) {
                        $totalQ += $topic->questions->count();
                    }
                }

                if ($totalQ > 0) {
                    $correct = $item->answers->where('is_correct', 1)->count();
                    $raw = ($correct / $totalQ) * 100;
                    $item->custom_score = number_format($raw, 2, '.', '');
                    $item->custom_score_raw = $raw; // Simpan nilai raw untuk sorting
                } else {
                    $dbScore = $item->result->total_score ?? 0;
                    $item->custom_score = number_format((float)$dbScore, 2, '.', '');
                    $item->custom_score_raw = (float)$dbScore;
                }
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

            $pdf = Pdf::loadView('admin.exports.results_pdf', [
                'data' => $data
            ]);

            return $pdf->download('laporan_hasil_ujian.pdf');
        }
    }


    /**
     * Tambah Waktu Massal (Bulk Add Time)
     */
    public function bulkAddTime(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'minutes' => 'required|integer|min:1'
        ]);

        // increment() otomatis menambahkan nilai lama + nilai baru untuk semua ID terpilih
        TestUser::whereIn('id', $request->ids)->increment('extra_time', $request->minutes);

        return back()->with('success', 'Waktu berhasil ditambahkan untuk ' . count($request->ids) . ' peserta.');
    }

    /**
     * Kunci Massal (Bulk Lock)
     */
    public function bulkLock(Request $request)
    {
        $request->validate(['ids' => 'required|array']);

        // Update Massal dengan mencatat waktu locked_at
        TestUser::whereIn('id', $request->ids)->update([
            'is_locked' => true,
            'locked_at' => now(),
            'lock_reason' => $request->lock_reason ?? 'Dikunci massal'
        ]);

        return back()->with('success', 'Peserta terpilih berhasil dikunci.');
    }

    public function bulkUnlock(Request $request)
    {
        $request->validate(['ids' => 'required|array']);

        $testUsers = TestUser::whereIn('id', $request->ids)->get();

        foreach ($testUsers as $testUser) {
            $dataToUpdate = [
                'is_locked' => false,
                'lock_reason' => null,
                'locked_at' => null
            ];

            // Hitung kompensasi waktu per user
            if ($testUser->locked_at) {
                $lockedAt = \Carbon\Carbon::parse($testUser->locked_at);
                $now = now();

                $diffInSeconds = $lockedAt->diffInSeconds($now);
                $bufferLag = 15;
                $totalSecondsToAdd = $diffInSeconds + $bufferLag;
                $minutesToAdd = (int) ceil($totalSecondsToAdd / 60);

                $testUser->extra_time = ($testUser->extra_time ?? 0) + $minutesToAdd;
            }

            $testUser->update($dataToUpdate);
        }

        return back()->with('success', 'Peserta terpilih dibuka & waktu dikompensasi.');
    }

    public function bulkValidate(Request $request)
    {
        // Validasi: pastikan ada ID yang dikirim
        $request->validate(['ids' => 'required|array']);

        // Ambil semua sesi ujian yang dipilih
        $testUsers = TestUser::whereIn('id', $request->ids)->get();
        $count = 0;

        foreach ($testUsers as $testUser) {
            // Hitung ulang skor pake service
            $score = ScoringService::calculate($testUser);

            // Simpan/update hasil dengan status 'validated'
            // Pakai updateOrCreate biar aman buat data lama yang belum punya result
            Result::updateOrCreate(
                ['test_user_id' => $testUser->id],
                [
                    'total_score' => $score,
                    'status' => 'validated',
                    'validated_by' => auth()->id(),
                    'validated_at' => now()
                ]
            );

            $count++;
        }

        return back()->with('success', "$count Hasil peserta berhasil dipublikasikan & dinilai ulang.");
    }
    /**
     * Hapus Massal (Bulk Delete)
     */
    public function bulkDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array']);

        // Hapus data peserta ujian (Otomatis hapus jawaban & nilai karena cascading di DB)
        TestUser::whereIn('id', $request->ids)->delete();

        return back()->with('success', count($request->ids) . ' Peserta berhasil dihapus beserta seluruh jawabannya.');
    }
}
