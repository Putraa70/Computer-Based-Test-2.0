<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ImportUsersRequest;
use App\Imports\UsersImport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ImportUserController extends Controller
{
    public function store(ImportUsersRequest $request)
    {
        $file = $request->file('file');
        $extension = $file->getClientOriginalExtension();

        $skippedData = [];
        $successCount = 0;

        DB::beginTransaction();
        try {
            if ($extension === 'xml') {
                // --- HANDLER XML ---
                $result = $this->importXml($file);
                $skippedData = $result['skipped'];
                $successCount = $result['count'];
            } else {
                // --- HANDLER EXCEL/CSV ---
                $importer = new UsersImport;
                Excel::import($importer, $file);

                $skippedData = $importer->skipped;
                $successCount = $importer->importedCount;
            }

            DB::commit();

            // --- SKENARIO 1: ADA DATA YANG DILEWATI (WARNING) ---
            if (count($skippedData) > 0) {
                $message = "Import Selesai. $successCount berhasil.";
                $message .= " Namun " . count($skippedData) . " data dilewati karena duplikat: ";

                // Ambil 3 contoh nama pertama
                $examples = array_slice($skippedData, 0, 3);
                $message .= implode(", ", $examples);

                if (count($skippedData) > 3) {
                    $message .= ", dan lainnya.";
                }

                // Redirect Back dengan pesan Warning
                return redirect()->back()->with('warning', $message);
            }

            // --- SKENARIO 2: BERHASIL SEMUA (SUCCESS) ---
            //  PASTIKAN BARIS INI TIDAK DI-KOMENTAR
            return redirect()->back()->with('success', "Berhasil mengimport $successCount user peserta baru.");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Import Error: " . $e->getMessage());
            return redirect()->back()->withErrors(['file' => 'Gagal Import: ' . $e->getMessage()]);
        }
    }

    private function importXml($file)
    {
        $skipped = [];
        $count = 0;

        try {
            $xmlData = simplexml_load_file($file->getRealPath());

            foreach ($xmlData->row as $row) {
                $data = [
                    'name'      => trim((string) $row->name),
                    'npm'       => trim((string) $row->npm),
                    'email'     => trim((string) $row->email),
                    'groupName' => trim((string) $row->group),
                ];

                $res = UsersImport::saveUser($data);

                if ($res['status'] === 'skipped') {
                    $skipped[] = $res['message'];
                } else {
                    $count++;
                }
            }
        } catch (\Exception $e) {
            throw $e;
        }

        return ['count' => $count, 'skipped' => $skipped];
    }

    public function downloadTemplate()
    {
        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=template_users.csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];
        $columns = ['Name', 'NPM', 'Email', 'Group'];

        // Contoh data template
        $example = ['Putra.dev', '2317051098', 'Putra@gmail.com', 'Angkatan 2023'];

        $callback = function () use ($columns, $example) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);
            fputcsv($file, $example);
            fclose($file);
        };
        return response()->stream($callback, 200, $headers);
    }
}
