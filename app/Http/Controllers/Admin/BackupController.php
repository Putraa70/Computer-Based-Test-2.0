<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Str;

class BackupController extends Controller
{
    public function index()
    {
        $driver = config('database.default');
        $connection = config("database.connections.{$driver}", []);

        return inertia('Admin/Backup', [
            'database' => [
                'driver'   => $driver,
                'database' => $connection['database'] ?? null,
                'host'     => $connection['host'] ?? null,
                'port'     => $connection['port'] ?? null,
            ],
        ]);
    }

    public function download()
    {
        $driver     = config('database.default');
        $connection = config("database.connections.{$driver}", []);
        $timestamp  = now()->format('Ymd_His');
        $database   = $connection['database'] ?? 'database';

        // ✅ SQLite — semua OS
        if ($driver === 'sqlite') {
            if ($database === ':memory:' || empty($database) || !is_file($database)) {
                return back()->with('error', 'Database SQLite tidak ditemukan.');
            }
            return response()->download(
                $database,
                "backup-{$timestamp}.sqlite",
                ['Content-Type' => 'application/x-sqlite3']
            );
        }

        // ✅ MySQL — auto detect OS
        if ($driver === 'mysql') {
            $username     = $connection['username'] ?? 'root';
            $password     = $connection['password'] ?? '';
            $host         = $connection['host'] ?? '127.0.0.1';
            $port         = $connection['port'] ?? 3306;
            $safeDatabase = Str::slug($database, '_');
            $tempFile     = storage_path("backups/backup-{$safeDatabase}-{$timestamp}.sql");

            if (!is_dir(dirname($tempFile))) {
                mkdir(dirname($tempFile), 0755, true);
            }

            // ✅ Auto detect mysqldump path sesuai OS
            $mysqldump = $this->findExecutable('mysqldump');

            if (!$mysqldump) {
                return back()->with('error', 'mysqldump tidak ditemukan. Pastikan MySQL sudah terinstall.');
            }

            // Set password via env agar tidak muncul di process list
            if (!empty($password)) {
                putenv("MYSQL_PWD={$password}");
            }

            $command = sprintf(
                '"%s" --no-defaults --user=%s --host=%s --port=%d --single-transaction --quick --skip-lock-tables --no-tablespaces %s > "%s" 2>&1',
                $mysqldump,
                escapeshellarg($username),
                escapeshellarg($host),
                (int) $port,
                escapeshellarg($database),
                $tempFile
            );

            exec($command, $output, $exitCode);

            if (!empty($password)) {
                putenv("MYSQL_PWD=");
            }

            if ($exitCode !== 0 || !file_exists($tempFile) || filesize($tempFile) === 0) {
                $errorMsg = file_exists($tempFile) ? file_get_contents($tempFile) : 'Exit code: ' . $exitCode;
                if (file_exists($tempFile)) unlink($tempFile);
                \Log::error('MySQL backup gagal', ['error' => $errorMsg, 'command' => $command]);
                return back()->with('error', 'Backup MySQL gagal: ' . substr($errorMsg, 0, 200));
            }

            return response()->download(
                $tempFile,
                "backup-{$safeDatabase}-{$timestamp}.sql",
                ['Content-Type' => 'application/sql']
            )->deleteFileAfterSend();
        }

        // ✅ PostgreSQL — auto detect OS
        if ($driver === 'pgsql') {
            $username     = $connection['username'] ?? 'postgres';
            $password     = $connection['password'] ?? '';
            $host         = $connection['host'] ?? '127.0.0.1';
            $port         = $connection['port'] ?? 5432;
            $safeDatabase = Str::slug($database, '_');
            $tempFile     = storage_path("backups/backup-{$safeDatabase}-{$timestamp}.sql");

            if (!is_dir(dirname($tempFile))) {
                mkdir(dirname($tempFile), 0755, true);
            }

            $pgDump = $this->findExecutable('pg_dump');

            if (!$pgDump) {
                return back()->with('error', 'pg_dump tidak ditemukan. Pastikan PostgreSQL sudah terinstall.');
            }

            if (!empty($password)) {
                putenv("PGPASSWORD={$password}");
            }

            $command = sprintf(
                '"%s" --username=%s --host=%s --port=%d --no-owner --no-privileges %s > "%s" 2>&1',
                $pgDump,
                escapeshellarg($username),
                escapeshellarg($host),
                (int) $port,
                escapeshellarg($database),
                $tempFile
            );

            exec($command, $output, $exitCode);

            if (!empty($password)) {
                putenv("PGPASSWORD=");
            }

            if ($exitCode !== 0 || !file_exists($tempFile) || filesize($tempFile) === 0) {
                $errorMsg = file_exists($tempFile) ? file_get_contents($tempFile) : 'Exit code: ' . $exitCode;
                if (file_exists($tempFile)) unlink($tempFile);
                \Log::error('PostgreSQL backup gagal', ['error' => $errorMsg]);
                return back()->with('error', 'Backup PostgreSQL gagal: ' . substr($errorMsg, 0, 200));
            }

            return response()->download(
                $tempFile,
                "backup-{$safeDatabase}-{$timestamp}.sql",
                ['Content-Type' => 'application/sql']
            )->deleteFileAfterSend();
        }

        return back()->with('error', 'Driver database tidak didukung: ' . $driver);
    }

    /**
     * ✅ Auto detect executable path lintas OS
     * Windows: cari di Laragon, XAMPP, PATH
     * Linux/Mac: cari di PATH langsung
     */
    private function findExecutable(string $name): ?string
    {
        // Linux / Mac — cari di PATH
        if (PHP_OS_FAMILY !== 'Windows') {
            $paths = [
                "/usr/bin/{$name}",
                "/usr/local/bin/{$name}",
                "/opt/homebrew/bin/{$name}", // Mac M1
            ];

            foreach ($paths as $path) {
                if (is_executable($path)) {
                    return $path;
                }
            }

            // Fallback: cek via which
            $which = trim(shell_exec("which {$name} 2>/dev/null"));
            if (!empty($which) && is_executable($which)) {
                return $which;
            }

            return null;
        }

        // Windows — cari di lokasi umum
        $windowsPaths = [
            // Laragon MySQL versions
            "C:\\laragon\\bin\\mysql\\mysql-8.0.30-winx64\\bin\\{$name}.exe",
            "C:\\laragon\\bin\\mysql\\mysql-8.0.31-winx64\\bin\\{$name}.exe",
            "C:\\laragon\\bin\\mysql\\mysql-8.0.32-winx64\\bin\\{$name}.exe",
            "C:\\laragon\\bin\\mysql\\mysql-8.0.33-winx64\\bin\\{$name}.exe",
            "C:\\laragon\\bin\\mysql\\mysql-8.1.0-winx64\\bin\\{$name}.exe",
            // Laragon PostgreSQL
            "C:\\laragon\\bin\\postgresql\\postgresql-14.5-1\\bin\\{$name}.exe",
            "C:\\laragon\\bin\\postgresql\\postgresql-15.0-1\\bin\\{$name}.exe",
            // XAMPP
            "C:\\xampp\\mysql\\bin\\{$name}.exe",
            // MySQL Installer default
            "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\{$name}.exe",
            "C:\\Program Files\\MySQL\\MySQL Server 8.1\\bin\\{$name}.exe",
            "C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin\\{$name}.exe",
        ];

        // Cari Laragon secara dinamis (versi MySQL bisa berbeda)
        $laragonMysqlBase = "C:\\laragon\\bin\\mysql";
        if (is_dir($laragonMysqlBase)) {
            foreach (glob("{$laragonMysqlBase}\\*\\bin\\{$name}.exe") ?: [] as $path) {
                if (file_exists($path)) {
                    return $path;
                }
            }
        }

        foreach ($windowsPaths as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        // Fallback: cek via where (Windows equivalent of which)
        $where = trim(shell_exec("where {$name} 2>nul"));
        if (!empty($where)) {
            $firstLine = explode("\n", $where)[0];
            if (file_exists(trim($firstLine))) {
                return trim($firstLine);
            }
        }

        return null;
    }
}