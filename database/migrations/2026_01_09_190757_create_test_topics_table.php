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
        Schema::create('test_topics', function (Blueprint $table) {
            $table->id();

            // Relasi ke test
            $table->foreignId('test_id')
                ->constrained('tests')
                ->cascadeOnDelete();

            // Relasi ke topic
            $table->foreignId('topic_id')
                ->constrained('topics')
                ->cascadeOnDelete();

            /**
             * Jumlah soal yang diambil dari topik ini
             * Contoh: 5, 10, 20
             */
            $table->unsignedInteger('total_questions');

            /**
             * Jenis soal
             * mixed = PG + essay
             * multiple_choice = PG saja
             * essay = essay saja
             */
            $table->enum('question_type', [
                'mixed',
                'multiple_choice',
                'essay',
            ])->default('mixed');

            /**
             * Acak urutan soal
             */
            $table->boolean('random_questions')
                ->default(true);

            /**
             * Acak urutan jawaban (PG)
             */
            $table->boolean('random_answers')
                ->default(true);

            /**
             * Maksimal opsi jawaban PG (2–5)
             */
            $table->unsignedTinyInteger('max_answers')
                ->default(4);

            /**
             * Mode jawaban
             * single = 1 jawaban benar
             * multiple = lebih dari 1 jawaban benar
             */
            $table->enum('answer_mode', [
                'single',
                'multiple',
            ])->default('single');

            $table->timestamps();

            // Mencegah topik duplikat dalam satu test
            $table->unique(['test_id', 'topic_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('test_topics');
    }
};
