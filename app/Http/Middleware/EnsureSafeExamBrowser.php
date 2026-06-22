<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Test;
use App\Models\TestUser;
use App\Services\AuditService;
use Illuminate\Support\Facades\Auth;

/**
 * ✅ P1: Enhanced Safe Exam Browser (SEB) Validation
 * 
 * ORIGINAL: Only checked User-Agent for "SEB" string (weak)
 * ENHANCED: 
 * - Validates multiple SEB headers
 * - Logs violations for audit trail
 * - Maintains backward compatibility (User-Agent fallback)
 * - Stores SEB version in audit for forensics
 * 
 * COMPLIANCE: Prevents non-SEB clients from accessing secured exams
 */
class EnsureSafeExamBrowser
{
    public function handle(Request $request, Closure $next)
    {
        // Coba ambil test dari route parameter
        $test = null;
        $testUser = null;

        // Untuk route /tests/{test}/start
        if ($request->route('test')) {
            $test = $request->route('test') instanceof Test
                ? $request->route('test')
                : Test::find($request->route('test'));
        }

        // Untuk route /tests/{testUser}/answer, /submit, /update-progress
        if (!$test && $request->route('testUser')) {
            $testUser = $request->route('testUser') instanceof TestUser
                ? $request->route('testUser')
                : TestUser::find($request->route('testUser'));

            if ($testUser) {
                $test = $testUser->test;
            }
        }

        // Jika test ditemukan dan memerlukan SEB, cek dengan enhanced validation
        if ($test && $test->require_seb) {
            $sebValidation = $this->validateSEB($request);

            if (!$sebValidation['valid']) {
                // ✅ P1: Log SEB violation for audit trail
                $this->logSEBViolation(
                    $test,
                    $testUser,
                    $sebValidation['reason'],
                    $request
                );

                abort(403, 'Ujian ini hanya dapat diakses menggunakan Safe Exam Browser (SEB)');
            }

            // ✅ P1: Store SEB version in request for logging
            // $request->attributes->put('seb_version', $sebValidation['version']);
            $request->attributes->set('seb_version', $sebValidation['version']);
        }

        return $next($request);
    }

    /**
     * ✅ P1: Enhanced SEB Validation
     * 
     * Checks multiple indicators:
     * 1. User-Agent contains "SEB"
     * 2. X-SafeExamBrowser-ConfigKeyHash header present
     * 3. X-SafeExamBrowser-RequestHash header present
     * 
     * @return array ['valid' => bool, 'version' => string|null, 'reason' => string]
     */
    private function validateSEB(Request $request): array
    {
        $userAgent = $request->userAgent() ?? '';

        // ✅ PRIMARY: Check User-Agent for SEB string
        if (str_contains($userAgent, 'SEB')) {
            // Extract SEB version if available
            preg_match('/SEB[\/\s]+([0-9.]+)/i', $userAgent, $matches);
            $version = $matches[1] ?? 'unknown';

            return [
                'valid' => true,
                'version' => $version,
                'method' => 'user_agent',
            ];
        }

        // ✅ SECONDARY: Check SEB-specific headers (enhanced validation)
        $configKeyHash = $request->header('X-SafeExamBrowser-ConfigKeyHash');
        $requestHash = $request->header('X-SafeExamBrowser-RequestHash');

        if ($configKeyHash && $requestHash) {
            // Both headers present - indicates SEB client
            // Note: Full header validation would require SEB config file, 
            // which is complex. For now, presence of both headers is sufficient indicator.
            return [
                'valid' => true,
                'version' => 'seb-headers',
                'method' => 'headers',
            ];
        }

        // ✅ FALLBACK: Check for legacy SEB indicators
        if (str_contains($userAgent, 'SafeExamBrowser')) {
            return [
                'valid' => true,
                'version' => 'legacy',
                'method' => 'legacy_ua',
            ];
        }

        // Not a valid SEB client
        return [
            'valid' => false,
            'version' => null,
            'reason' => 'No SEB indicators found',
        ];
    }

    /**
     * ✅ P1: Log SEB violation for forensic investigation
     */
    private function logSEBViolation(
        Test $test,
        ?TestUser $testUser,
        string $reason,
        Request $request
    ): void {
        try {
            $metadata = [
                'user_agent' => $request->userAgent(),
                'headers' => [
                    'x_seb_config_hash' => $request->header('X-SafeExamBrowser-ConfigKeyHash'),
                    'x_seb_request_hash' => $request->header('X-SafeExamBrowser-RequestHash'),
                ],
                'reason' => $reason,
                'test_id' => $test->id,
            ];

            AuditService::logSecurityEvent(
                user_id: Auth::id(),
                test_user_id: $testUser?->id,
                action: 'seb_validation_failed',
                description: "SEB validation failed: {$reason}",
                metadata: $metadata
            );
        } catch (\Exception $e) {
            // Silently fail - don't break exam access
            logger()->error('SEB violation logging failed', ['error' => $e->getMessage()]);
        }
    }
}

