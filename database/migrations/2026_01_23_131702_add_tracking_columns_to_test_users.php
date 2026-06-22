<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('test_users', function (Blueprint $table) {
            // Menyimpan index array soal (0, 1, 2...)
            $table->integer('current_index')->default(0)->after('finished_at');

            // Menyimpan ID soal aktual (untuk validasi keamanan)
            $table->foreignId('last_question_id')
                ->nullable()
                ->after('current_index')
                ->constrained('questions')
                ->onDelete('set null');

            // Mencatat aktivitas terakhir
            $table->timestamp('last_activity_at')->nullable()->after('last_question_id');
        });
    }

    public function down()
    {
        Schema::table('test_users', function (Blueprint $table) {
            $table->dropForeign(['last_question_id']);
            $table->dropColumn(['current_index', 'last_question_id', 'last_activity_at']);
        });
    }
};
