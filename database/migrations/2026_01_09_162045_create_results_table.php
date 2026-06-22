<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('results', function (Blueprint $table) {
            $table->id();

            $table->foreignId('test_user_id')
                ->constrained()
                ->cascadeOnDelete();

            // Nilai total ujian
            $table->integer('total_score')->nullable();

            // Status nilai
            $table->enum('status', [
                'pending',
                'validated'
            ])->default('pending');

            // Admin yang memvalidasi
            $table->foreignId('validated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->dateTime('validated_at')->nullable();

            $table->timestamps();

            // 1 result per ujian
            $table->unique('test_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('results');
    }
};
