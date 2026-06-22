<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('test_users', function (Blueprint $table) {
            $table->double('extra_time', 8, 2)->default(0)->nullable()->after('finished_at');
        });
    }

    public function down()
    {
        Schema::table('test_users', function (Blueprint $table) {
            $table->dropColumn('extra_time');
        });
    }
};