<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('test_users', function (Blueprint $table) {
            $table->id();

            // Relasi utama
            $table->foreignId('test_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            // State ujian (WAJIB)
            $table->enum('status', [
                'not_started',
                'ongoing',
                'submitted',
                'expired',
            ])->default('not_started');

            // Waktu ujian
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();

            $table->timestamps();

            // Optional: cegah user ikut test yg sama 2x
            $table->unique(['test_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_users');
    }
};
