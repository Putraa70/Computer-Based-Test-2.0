<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('topic_id')
                ->constrained()
                ->cascadeOnDelete();

            // Jenis soal
            $table->enum('type', [
                'multiple_choice',
                'essay',
                'true_false',
                'short_answer'
            ]);

            // Isi soal (boleh kosong jika pakai gambar)
            $table->text('question_text')->nullable();

            // Gambar soal (opsional)
            $table->string('question_image')->nullable();

            // Skor per soal (opsional, default 1)
            $table->unsignedInteger('score')->default(1);

            $table->boolean('is_active')->default(true);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
