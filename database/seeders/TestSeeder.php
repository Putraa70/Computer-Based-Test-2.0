<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Test;
use App\Models\Topic;
use App\Models\Group;

class TestSeeder extends Seeder
{
    public function run(): void
    {
        $test = Test::create([
            'title' => 'Try Out AKT 2026',
            'duration' => 30,
            'start_time' => now()->subMinutes(5),
            'end_time' => now()->addHours(2),
            'is_active' => true,
        ]);

        // Assign topic
        $topic = Topic::first();
        $test->topics()->attach($topic->id, [
            'total_questions' => 2,
            'question_type' => 'multiple_choice',
        ]);

        // Assign group
        $group = Group::where('name', 'Angkatan 2025')->first();
        $test->groups()->attach($group->id);
    }
}
