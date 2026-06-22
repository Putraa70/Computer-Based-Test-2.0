<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Group;

class DatabaseSeeder extends Seeder {
    public function run(): void {
        $this->call([
            GroupSeeder::class,
            UserSeeder::class,
            // ModuleSeeder::class,
            // TopicSeeder::class,
            // QuestionSeeder::class,
            // TestSeeder::class,
            // MassQuestionSeeder::class,
            // NewTestSeeder::class,

        ]);
    }
}
