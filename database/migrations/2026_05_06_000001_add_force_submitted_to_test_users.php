<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add 'force_submitted' to the enum
        // MySQL requires modifying the column definition
        DB::statement("ALTER TABLE test_users MODIFY COLUMN status ENUM('not_started', 'ongoing', 'submitted', 'expired', 'force_submitted') DEFAULT 'not_started'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE test_users MODIFY COLUMN status ENUM('not_started', 'ongoing', 'submitted', 'expired') DEFAULT 'not_started'");
    }
};
