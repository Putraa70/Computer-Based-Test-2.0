<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;

class BackupController extends Controller
{
    public function index()
    {
        $driver = config('database.default');
        $connection = config("database.connections.{$driver}", []);

        return inertia('Admin/Backup', [
            'database' => [
                'driver' => $driver,
                'database' => $connection['database'] ?? null,
                'host' => $connection['host'] ?? null,
                'port' => $connection['port'] ?? null,
            ],
        ]);
    }

    public function download()
    {
        $driver = config('database.default');
        $connection = config("database.connections.{$driver}", []);
        $timestamp = now()->format('Ymd_His');
        $database = $connection['database'] ?? 'database';

        if ($driver === 'sqlite') {
            if ($database === ':memory:' || empty($database) || !is_file($database)) {
                return back()->with('error', 'Database SQLite tidak ditemukan untuk diunduh.');
            }

            $filename = "backup-{$timestamp}.sqlite";

            return response()->download(
                $database,
                $filename,
                ['Content-Type' => 'application/x-sqlite3']
            );
        }

        if ($driver === 'mysql') {
            $username = $connection['username'] ?? null;
            $password = $connection['password'] ?? null;
            $host = $connection['host'] ?? '127.0.0.1';
            $port = $connection['port'] ?? 3306;

            // Use full path to mysqldump for Laragon
            $mysqldump = 'C:\\laragon\\bin\\mysql\\mysql-8.0.30-winx64\\bin\\mysqldump.exe';
            $safeDatabase = Str::slug($database, '_');
            $tempFile = storage_path("backups\\backup-{$safeDatabase}-{$timestamp}.sql");

            // Create backups directory if not exists
            if (!is_dir(dirname($tempFile))) {
                mkdir(dirname($tempFile), 0755, true);
            }

            $env = [];
            if (!empty($password)) {
                $env['MYSQL_PWD'] = $password;
            }

            // Build command with proper Windows path handling
            $command = sprintf(
                '"%s" --no-defaults --user=%s --host=%s --port=%d --single-transaction --quick --skip-lock-tables --no-tablespaces %s',
                $mysqldump,
                $username,
                $host,
                $port,
                $database
            );

            // Set env vars and execute via shell redirect
            foreach ($env as $key => $value) {
                putenv("$key=$value");
            }

            // Use shell to capture output and redirect to file
            $fullCommand = sprintf('%s > "%s" 2>&1', $command, $tempFile);
            exec($fullCommand, $output, $exitCode);

            \Log::info('Backup process executed', [
                'exit_code' => $exitCode,
                'temp_file_exists' => file_exists($tempFile),
                'temp_file_size' => file_exists($tempFile) ? filesize($tempFile) : 0,
            ]);

            if ($exitCode !== 0 || !file_exists($tempFile) || filesize($tempFile) === 0) {
                $errorMessage = file_exists($tempFile) ? file_get_contents($tempFile) : 'Backup failed with exit code: ' . $exitCode;
                \Log::error('Backup database gagal', [
                    'driver' => $driver,
                    'host' => $host,
                    'port' => $port,
                    'database' => $database,
                    'command' => $command,
                    'error' => $errorMessage,
                ]);
                if (file_exists($tempFile)) {
                    unlink($tempFile);
                }
                return back()->with('error', 'Backup gagal: ' . substr($errorMessage, 0, 150));
            }

            $filename = "backup-{$safeDatabase}-{$timestamp}.sql";
            return response()->download($tempFile, $filename, ['Content-Type' => 'application/sql'])->deleteFileAfterSend();
        }

        if ($driver === 'pgsql') {
            $username = $connection['username'] ?? null;
            $password = $connection['password'] ?? null;
            $host = $connection['host'] ?? '127.0.0.1';
            $port = $connection['port'] ?? 5432;

            // Use full path to pg_dump for Laragon
            $pgDump = 'C:\\laragon\\bin\\postgresql\\postgresql-14.5-1\\bin\\pg_dump.exe';
            $safeDatabase = Str::slug($database, '_');
            $tempFile = storage_path("backups\\backup-{$safeDatabase}-{$timestamp}.sql");

            // Create backups directory if not exists
            if (!is_dir(dirname($tempFile))) {
                mkdir(dirname($tempFile), 0755, true);
            }

            $env = [];
            if (!empty($password)) {
                $env['PGPASSWORD'] = $password;
            }

            // Build command with proper Windows path handling
            $command = sprintf(
                '"%s" --username=%s --host=%s --port=%d --no-owner --no-privileges %s',
                $pgDump,
                $username,
                $host,
                $port,
                $database
            );

            // Set env vars and execute via shell redirect
            foreach ($env as $key => $value) {
                putenv("$key=$value");
            }

            // Use shell to capture output and redirect to file
            $fullCommand = sprintf('%s > "%s" 2>&1', $command, $tempFile);
            exec($fullCommand, $output, $exitCode);

            if ($exitCode !== 0 || !file_exists($tempFile) || filesize($tempFile) === 0) {
                $errorMessage = file_exists($tempFile) ? file_get_contents($tempFile) : 'Backup failed with exit code: ' . $exitCode;
                \Log::error('Backup database gagal', [
                    'driver' => $driver,
                    'host' => $host,
                    'port' => $port,
                    'database' => $database,
                    'error' => $errorMessage,
                ]);
                if (file_exists($tempFile)) {
                    unlink($tempFile);
                }
                return back()->with('error', 'Backup gagal: ' . substr($errorMessage, 0, 150));
            }

            $filename = "backup-{$safeDatabase}-{$timestamp}.sql";
            return response()->download($tempFile, $filename, ['Content-Type' => 'application/sql'])->deleteFileAfterSend();
        }

        return back()->with('error', 'Driver database tidak didukung untuk backup otomatis.');
    }
}
