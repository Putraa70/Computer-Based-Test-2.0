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
        Schema::table('test_users', function (Blueprint $table) {
            $table->boolean('is_locked')->default(false)->after('status');
            $table->text('lock_reason')->nullable()->after('is_locked');
            $table->foreignId('locked_by')->nullable()->constrained('users')->nullOnDelete()->after('lock_reason');
            $table->timestamp('locked_at')->nullable()->after('locked_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('test_users', function (Blueprint $table) {
            $table->dropColumn(['is_locked', 'lock_reason', 'locked_by', 'locked_at']);
        });
    }
};
