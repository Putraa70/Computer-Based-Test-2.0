<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_groups', function (Blueprint $table) {
            $table->id();

            $table->foreignId('test_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('group_id')
                ->constrained()
                ->cascadeOnDelete();

            // Mencegah test di-assign ke group yang sama dua kali
            $table->unique(['test_id', 'group_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_groups');
    }
};
