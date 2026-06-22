<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Facades\Log;
use Exception;

class AuditService
{
    /**
     * Log an audit event (safe - won't crash if logging fails)
     */
    public static function log(
        string $action,
        ?int $testUserId = null,
        ?string $description = null,
        ?array $metadata = null,
        string $severity = 'info',
        ?string $resourceType = null,
        ?int $resourceId = null
    ): void {
        try {
            AuditLog::create([
                'user_id' => Auth::id(),
                'test_user_id' => $testUserId,
                'action' => $action,
                'resource_type' => $resourceType,
                'resource_id' => $resourceId,
                'ip_address' => Request::ip(),
                'user_agent' => Request::userAgent(),
                'description' => $description,
                'metadata' => $metadata,
                'severity' => $severity,
            ]);

            // Also log critical events to Laravel logs
            if ($severity === 'critical') {
                Log::warning("SECURITY AUDIT: {$action}", [
                    'user_id' => Auth::id(),
                    'test_user_id' => $testUserId,
                    'description' => $description,
                    'ip' => Request::ip(),
                    'metadata' => $metadata,
                ]);
            }
        } catch (Exception $e) {
            // Silent fail - don't interrupt exam flow
            // But log the failure for debugging
            Log::error('AuditService failed to log', [
                'error' => $e->getMessage(),
                'action' => $action,
            ]);
        }
    }

    /**
     * Log exam-related events
     */
    public static function logExamEvent(string $event, int $testUserId, ?array $data = null): void
    {
        self::log(
            action: "exam_" . $event,
            testUserId: $testUserId,
            description: "Exam event: {$event}",
            metadata: $data,
            severity: 'info'
        );
    }

    /**
     * Log security events (ownership violations, token issues, etc.)
     */
    public static function logSecurityEvent(
        ?string $event = null,
        ?int $testUserId = null,
        ?string $description = null,
        ?array $metadata = null,
        // Support alternate parameter names for flexibility
        ?string $action = null,
        ?int $test_user_id = null,
        ?int $user_id = null
    ): void {
        // Map alternate parameter names
        $finalEvent = $event ?? $action;
        $finalTestUserId = $testUserId ?? $test_user_id;
        
        self::log(
            action: $finalEvent,
            testUserId: $finalTestUserId,
            description: $description,
            metadata: $metadata,
            severity: 'critical',
            resourceType: 'security'
        );
    }

    /**
     * Log answer events
     */
    public static function logAnswerEvent(
        int $testUserId,
        int $questionId,
        ?int $answerId = null,
        bool $isBatch = false
    ): void {
        self::log(
            action: $isBatch ? 'batch_answer_save' : 'answer_save',
            testUserId: $testUserId,
            resourceType: 'answer',
            resourceId: $answerId,
            metadata: [
                'question_id' => $questionId,
                'answer_id' => $answerId,
                'is_batch' => $isBatch,
            ]
        );
    }

    /**
     * Log admin actions with flexible parameters
     * Accepts both old (admin_id, test_user_id) and new (testUserId) naming conventions
     */
    public static function logAdminAction(
        string $action = '',
        ?int $testUserId = null,
        ?string $description = null,
        ?array $metadata = null,
        ?string $reason = null,
        ?array $data = null,
        // Support old parameter names
        ?int $admin_id = null,
        ?int $test_user_id = null
    ): void {
        // Map old parameter names to new ones
        $finalTestUserId = $testUserId ?? $test_user_id;
        
        // Merge data sources (handle both old and new calling conventions)
        $finalMetadata = array_merge(
            ['reason' => $reason],
            $data ?? [],
            $metadata ?? []
        );

        self::log(
            action: "admin_" . $action,
            testUserId: $finalTestUserId,
            description: $description ?? "Admin action: {$action}",
            metadata: $finalMetadata,
            severity: 'warning',
            resourceType: 'admin_action'
        );
    }

    /**
     * Get suspicious activity report
     */
    public static function getSuspiciousActivity($minutes = 60): array
    {
        return AuditLog::security()
            ->recent($minutes)
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('user_id')
            ->map(function ($logs) {
                return [
                    'count' => $logs->count(),
                    'events' => $logs->map(fn($log) => [
                        'action' => $log->action,
                        'time' => $log->created_at,
                        'ip' => $log->ip_address,
                    ]),
                ];
            })
            ->toArray();
    }
}
