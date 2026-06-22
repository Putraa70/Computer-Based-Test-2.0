<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Cache;
use Exception;

class HealthCheckController extends Controller
{
    /**
     * Overall health check endpoint
     * Returns: 200 OK if healthy, 503 Service Unavailable if issues
     */
    public function check()
    {
        $health = [
            'status' => 'healthy',
            'timestamp' => now()->toIso8601String(),
            'services' => [],
        ];

        // Check Database
        $health['services']['database'] = $this->checkDatabase();
        if ($health['services']['database']['status'] !== 'healthy') {
            $health['status'] = 'degraded';
        }

        // Check Redis
        $health['services']['redis'] = $this->checkRedis();
        if ($health['services']['redis']['status'] !== 'healthy') {
            $health['status'] = 'degraded';
        }

        // Check Queue
        $health['services']['queue'] = $this->checkQueue();

        // Check Disk Space
        $health['services']['disk'] = $this->checkDiskSpace();
        if ($health['services']['disk']['status'] !== 'healthy') {
            $health['status'] = 'degraded';
        }

        // Determine HTTP status code
        $httpStatus = $health['status'] === 'healthy' ? 200 : 503;

        return response()->json($health, $httpStatus);
    }

    /**
     * Check database connectivity
     */
    private function checkDatabase(): array
    {
        try {
            DB::connection()->getPdo();
            
            // Check test_users table for issues
            $count = DB::table('test_users')->count();
            
            return [
                'status' => 'healthy',
                'response_time' => 'ok',
                'message' => "Database connected. {$count} active test sessions.",
            ];
        } catch (Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
                'message' => 'Database connection failed',
            ];
        }
    }

    /**
     * Check Redis connectivity and memory
     */
    private function checkRedis(): array
    {
        try {
            Redis::connection()->ping();
            
            // Get Redis info
            $info = Redis::connection()->info();
            $usedMemory = $info['used_memory_human'] ?? 'unknown';
            $maxMemory = $info['maxmemory_human'] ?? 'unlimited';
            $evictedKeys = $info['evicted_keys'] ?? 0;

            // Warn if evictions happening
            if ($evictedKeys > 0) {
                return [
                    'status' => 'degraded',
                    'memory_used' => $usedMemory,
                    'memory_limit' => $maxMemory,
                    'evicted_keys' => $evictedKeys,
                    'warning' => 'Redis is evicting keys - memory pressure detected',
                ];
            }

            return [
                'status' => 'healthy',
                'memory_used' => $usedMemory,
                'memory_limit' => $maxMemory,
                'message' => 'Redis connected and healthy',
            ];
        } catch (Exception $e) {
            return [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
                'message' => 'Redis connection failed',
            ];
        }
    }

    /**
     * Check queue status
     */
    private function checkQueue(): array
    {
        try {
            // Count failed jobs
            $failedCount = DB::table('failed_jobs')->count();
            
            // Check for old failed jobs
            $oldFailedJobs = DB::table('failed_jobs')
                ->where('failed_at', '<', now()->subHours(1))
                ->count();

            $status = $failedCount > 100 ? 'degraded' : 'healthy';

            return [
                'status' => $status,
                'failed_jobs' => $failedCount,
                'old_failed_jobs' => $oldFailedJobs,
                'message' => "Queue {$status}. {$failedCount} failed jobs in queue.",
            ];
        } catch (Exception $e) {
            return [
                'status' => 'healthy',  // Queue table may not exist yet
                'message' => 'Queue check skipped',
            ];
        }
    }

    /**
     * Check disk space
     */
    private function checkDiskSpace(): array
    {
        try {
            $total = disk_total_space('/');
            $free = disk_free_space('/');
            $used = $total - $free;
            $usagePercent = round(($used / $total) * 100, 2);

            // Warn if >80% full
            $status = $usagePercent > 80 ? 'warning' : 'healthy';

            return [
                'status' => $status,
                'usage_percent' => $usagePercent,
                'free_gb' => round($free / 1024 / 1024 / 1024, 2),
                'total_gb' => round($total / 1024 / 1024 / 1024, 2),
                'message' => "Disk {$usagePercent}% full",
            ];
        } catch (Exception $e) {
            return [
                'status' => 'unknown',
                'error' => $e->getMessage(),
            ];
        }
    }
}
