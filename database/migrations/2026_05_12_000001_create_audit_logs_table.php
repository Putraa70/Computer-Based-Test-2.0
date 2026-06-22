<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();

            // Who performed the action
            $table->foreignId('user_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            // Which test user affected (if applicable)
            $table->foreignId('test_user_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            // What action was performed
            $table->string('action');  // e.g., 'exam_start', 'answer_save', 'force_submit'

            // Resource context
            $table->string('resource_type')->nullable();  // e.g., 'exam', 'answer', 'result'
            $table->unsignedBigInteger('resource_id')->nullable();

            // Network context
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();

            // Details
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();  // Extra context as JSON

            // Severity for filtering
            $table->enum('severity', ['info', 'warning', 'critical'])->default('info');

            $table->timestamps();

            // Indexes for fast querying
            $table->index(['user_id', 'created_at']);
            $table->index(['test_user_id', 'action']);
            $table->index(['action', 'created_at']);
            $table->index(['severity', 'created_at']);
            $table->index(['ip_address', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
