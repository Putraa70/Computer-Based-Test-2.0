<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1️⃣ TestUser queries - CRITICAL for concurrent exams
        Schema::table('test_users', function (Blueprint $table) {
            $table->index(['test_id', 'status', 'updated_at'], 'idx_test_status_updated');
            $table->index(['user_id', 'status'], 'idx_user_status');
            $table->index(['is_locked', 'locked_at'], 'idx_locked_state');
            $table->index(['started_at', 'finished_at'], 'idx_exam_time');
        });

        // 2️⃣ UserAnswer queries - HIGH VOLUME for autosave
        Schema::table('user_answers', function (Blueprint $table) {
            $table->index(['test_user_id', 'question_id'], 'idx_answer_lookup');
            $table->index(['question_id', 'is_correct'], 'idx_question_correctness');
            // Full-text search for essay answers (if applicable)
            if (Schema::hasColumn('user_answers', 'answer_text')) {
                $table->fullText(['answer_text'], 'fulltext_answer_text');
            }
        });

        // 3️⃣ Question lookups - for caching & filtering
        Schema::table('questions', function (Blueprint $table) {
            $table->index(['topic_id', 'is_active'], 'idx_topic_active');
            $table->index(['type'], 'idx_question_type');
        });

        // 4️⃣ Sessions table - optimized for user session lookups
        if (Schema::hasTable('sessions')) {
            Schema::table('sessions', function (Blueprint $table) {
                $table->index(['user_id', 'last_activity'], 'idx_user_session_activity');
            });
        }

        // 5️⃣ Results validation queries
        Schema::table('results', function (Blueprint $table) {
            $table->index(['test_user_id', 'status'], 'idx_result_validation');
            if (Schema::hasColumn('results', 'validated_at')) {
                $table->index(['validated_at', 'status'], 'idx_result_audit');
            }
        });

        // 6️⃣ Test queries for active exams
        Schema::table('tests', function (Blueprint $table) {
            $table->index(['is_active', 'start_time'], 'idx_active_test_schedule');
        });

        // 7️⃣ Topic queries for question generation
        Schema::table('topics', function (Blueprint $table) {
            $table->index(['is_active'], 'idx_topic_active_status');
        });

        // 8️⃣ Answer queries for displaying options
        Schema::table('answers', function (Blueprint $table) {
            $table->index(['question_id', 'is_correct'], 'idx_answer_question_correct');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop indexes
        Schema::table('test_users', function (Blueprint $table) {
            $table->dropIndex('idx_test_status_updated');
            $table->dropIndex('idx_user_status');
            $table->dropIndex('idx_locked_state');
            $table->dropIndex('idx_exam_time');
        });

        Schema::table('user_answers', function (Blueprint $table) {
            $table->dropIndex('idx_answer_lookup');
            $table->dropIndex('idx_question_correctness');
            if (Schema::hasTable('user_answers')) {
                try {
                    $table->dropFullText('fulltext_answer_text');
                } catch (\Exception $e) {
                    // Index may not exist
                }
            }
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->dropIndex('idx_topic_active');
            $table->dropIndex('idx_question_type');
        });

        if (Schema::hasTable('sessions')) {
            Schema::table('sessions', function (Blueprint $table) {
                $table->dropIndex('idx_user_session_activity');
            });
        }

        Schema::table('results', function (Blueprint $table) {
            $table->dropIndex('idx_result_validation');
            if (Schema::hasColumn('results', 'validated_at')) {
                $table->dropIndex('idx_result_audit');
            }
        });

        Schema::table('tests', function (Blueprint $table) {
            $table->dropIndex('idx_active_test_schedule');
        });

        Schema::table('topics', function (Blueprint $table) {
            $table->dropIndex('idx_topic_active_status');
        });

        Schema::table('answers', function (Blueprint $table) {
            $table->dropIndex('idx_answer_question_correct');
        });
    }
};
