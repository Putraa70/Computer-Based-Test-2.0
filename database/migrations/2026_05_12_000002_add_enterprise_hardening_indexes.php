<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /**
         * ✅ P1: Enterprise hardening indexes for concurrent operations
         * 
         * These indexes address:
         * - Concurrent autosave (batch upsert)
         * - Polling queries
         * - Scoring queries
         * - Admin lookups
         * - Audit trail queries
         */

        // 1. TestUser additional indexes
        if (!Schema::hasTable('test_users')) return;

        Schema::table('test_users', function (Blueprint $table) {
            // Composite index for force_submitted status lookup + audit
            $table->index(['status', 'created_at'], 'idx_force_submitted_time');

            // For tracking active exams
            $table->index(['test_id', 'user_id', 'status'], 'idx_active_exams');
        });

        // 2. UserAnswer indexes for bulk operations
        if (Schema::hasTable('user_answers')) {
            Schema::table('user_answers', function (Blueprint $table) {
                // For rapid concurrent upserts
                $table->index(['test_user_id', 'question_id', 'updated_at'], 'idx_answer_priority');

                // For scoring queries (count is_correct per test_user)
                $table->index(['test_user_id', 'is_correct'], 'idx_score_lookup');
            });
        }

        // 3. Result indexes for result queries
        if (Schema::hasTable('results')) {
            Schema::table('results', function (Blueprint $table) {
                // For finding recent results
                $table->index(['test_user_id', 'created_at'], 'idx_result_time');
            });
        }

        // 4. Question indexes for caching
        if (Schema::hasTable('questions')) {
            Schema::table('questions', function (Blueprint $table) {
                // For filtering by type and active status
                $table->index(['topic_id', 'type', 'is_active'], 'idx_question_filter');
            });
        }

        // 5. Answer indexes for options display
        if (Schema::hasTable('answers')) {
            Schema::table('answers', function (Blueprint $table) {
                // For retrieving answer options
                $table->index(['question_id', 'is_correct'], 'idx_answer_display');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('test_users')) {
            Schema::table('test_users', function (Blueprint $table) {
                $table->dropIndexIfExists('idx_force_submitted_time');
                $table->dropIndexIfExists('idx_active_exams');
            });
        }

        if (Schema::hasTable('user_answers')) {
            Schema::table('user_answers', function (Blueprint $table) {
                $table->dropIndexIfExists('idx_answer_priority');
                $table->dropIndexIfExists('idx_score_lookup');
            });
        }

        if (Schema::hasTable('results')) {
            Schema::table('results', function (Blueprint $table) {
                $table->dropIndexIfExists('idx_result_time');
            });
        }

        if (Schema::hasTable('questions')) {
            Schema::table('questions', function (Blueprint $table) {
                $table->dropIndexIfExists('idx_question_filter');
            });
        }

        if (Schema::hasTable('answers')) {
            Schema::table('answers', function (Blueprint $table) {
                $table->dropIndexIfExists('idx_answer_display');
            });
        }
    }
};

