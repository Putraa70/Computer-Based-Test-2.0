<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('answers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('question_id')
                ->constrained()
                ->cascadeOnDelete();

            // Isi jawaban (boleh kosong jika pakai gambar)
            $table->text('answer_text')->nullable();

            // Gambar jawaban (opsional)
            $table->string('answer_image')->nullable();

            // Penanda jawaban benar
            $table->boolean('is_correct')->default(false);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('answers');
    }
};
