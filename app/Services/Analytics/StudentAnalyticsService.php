<?php

namespace App\Services\Analytics;

/**
 * Compatibility wrapper for old StudentAnalyticsService.
 * Forwards calls to the new StudentStatisticsService.
 */
class StudentAnalyticsService
{
    public static function details(int $userId): array
    {
        return \App\Services\Statistics\StudentStatisticsService::details($userId);
    }
}
