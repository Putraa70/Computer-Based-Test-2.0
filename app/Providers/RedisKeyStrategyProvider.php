<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\Cache\RedisKeyStrategy;

/**
 * ✅ P1: Redis Enterprise Hardening Service Provider
 * 
 * Purpose: Initialize Redis key namespacing and isolation strategy
 * - Prevents cache key collisions in multi-app Redis instances
 * - Enables safe multi-tenant deployments
 * - Facilitates monitoring and debugging
 */
class RedisKeyStrategyProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Initialize Redis key strategy with app name and environment
        RedisKeyStrategy::init(
            config('app.name', 'cbt'),
            app()->environment()
        );
    }
}
