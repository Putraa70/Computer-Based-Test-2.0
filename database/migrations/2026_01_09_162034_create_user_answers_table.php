<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_answers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('test_user_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('question_id')
                ->constrained()
                ->cascadeOnDelete();

            // Jawaban PG
            $table->foreignId('answer_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();

            // Jawaban essay / short answer
            $table->text('answer_text')->nullable();

            // Skor per soal (PG otomatis, essay diisi admin)
            $table->integer('score')->nullable();

            // Benar / salah (khusus PG)
            $table->boolean('is_correct')->nullable();

            $table->timestamps();

            // 1 jawaban per soal
            $table->unique(['test_user_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_answers');
    }
};
