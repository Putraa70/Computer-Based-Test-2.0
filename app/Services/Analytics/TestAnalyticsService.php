<?php

namespace App\Services\Analytics;

/**
 * Compatibility wrapper for old Analytics service name.
 * Redirects calls to the new Statistics service.
 */
class TestAnalyticsService
{
    public static function summary(int $testId): array
    {
        return \App\Services\Statistics\TestStatisticsService::summary($testId);
    }
}
