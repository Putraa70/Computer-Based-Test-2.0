<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ImportQuestionsRequest;
use App\Imports\QuestionsImport;
use App\Models\Topic;
use App\Models\Module;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ImportQuestionController extends Controller
{
    public function create(Request $request)
    {
        // 1. Tangkap module_id dari URL
        $moduleId = $request->input('module_id');

        // 2. Ambil List Modul
        $modules = Module::select('id', 'name')->orderBy('name')->get();

        // 3. Ambil Topik (Server-Side Filter)
        $topics = [];
        if ($moduleId) {
            $topics = Topic::select('id', 'name', 'module_id')
                ->where('module_id', $moduleId)
                // ->where('is_active', true) // Filter aktif dimatikan dulu biar data pasti muncul
                ->orderBy('name')
                ->get();
        }

        //  PERBAIKAN DISINI: Sesuaikan dengan lokasi file Anda (Admin/Modules/Import)
        return inertia('Admin/Modules/Import', [
            'modules' => $modules,
            'topics'  => $topics,
            'filters' => ['module_id' => $moduleId]
        ]);
    }

    /**
     * Proses Upload CSV
     */
    public function store(ImportQuestionsRequest $request)
    {
        // ... (kode validasi & import di atas tetap sama) ...
        $file = $request->file('file');
        $topicId = $request->topic_id;

        DB::beginTransaction();
        try {
            $importer = new QuestionsImport($topicId);
            Excel::import($importer, $file);
            DB::commit();


            return redirect()
                ->route('admin.modules.index', ['section' => 'import'])
                ->with('success', "Berhasil mengimport {$importer->importedCount} soal!");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error($e->getMessage());

            // Jika gagal, kembalikan juga ke section import dengan error
            return redirect()
                ->route('admin.modules.index', ['section' => 'import'])
                ->withErrors(['file' => 'Gagal Import: ' . $e->getMessage()]);
        }
    }

    /**
     * Download Template CSV (Tanpa Kolom Score)
     */
    public function downloadTemplate()
    {
        $filename = 'template_bank_soal_indo.csv';

        $headers = [
            "Content-type"        => "text/csv; charset=utf-8",
            "Content-Disposition" => "attachment; filename=$filename",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        //  HEADER BAHASA INDONESIA
        $columns = [
            'Teks Soal',
            'Tipe Soal (pilihan_ganda / esai)',
            'Pilihan A',
            'Pilihan B',
            'Pilihan C',
            'Pilihan D',
            'Pilihan E',
            'Kunci Jawaban (A/B/C/D/E)'
        ];

        // Contoh 1: Pilihan Ganda
        $example1 = [
            'Tulang terpanjang dan terkuat pada tubuh manusia yang terletak di bagian paha adalah...', // Soal
            'pilihan_ganda',        // Tipe
            'Tibia',                // A
            'Fibula',               // B
            'Femur',                // C
            'Humerus',              // D
            'Radius',               // E
            'C'                     // Kunci Jawaban (Femur)
        ];






        // CONTOH 2: ESAI (ANATOMI & FISIOLOGI)
        $example2 = [
            'Sebutkan 4 (empat) katup utama yang terdapat pada jantung manusia!', // Soal
            'esai',                 // Tipe
            '',                     // A (Kosong)
            '',                     // B (Kosong)
            '',                     // C (Kosong)
            '',                     // D (Kosong)
            '',                     // E (Kosong)
            ''                      // Kunci (Kosong)
        ];

        $callback = function () use ($columns, $example1, $example2) {
            $file = fopen('php://output', 'w');
            fputs($file, "\xEF\xBB\xBF"); // BOM agar Excel baca UTF-8 aman

            fputcsv($file, $columns);
            fputcsv($file, $example1);
            fputcsv($file, $example2);

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
