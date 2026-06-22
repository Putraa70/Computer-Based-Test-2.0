<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Test;
use App\Models\Topic;
use App\Models\Group;

class NewTestSeeder extends Seeder
{
    public function run(): void
    {
        // Ambil Topik yang baru dibuat (yang punya 150 soal)
        $topic = Topic::where('name', 'Pengetahuan Umum Kedokteran')->first();

        // Ambil Grup Target
        $group = Group::where('name', 'Angkatan 2026')->first();

        // --- TEST 1: Ujian Cepat (50 Soal, 5 Menit) ---
        $test1 = Test::create([
            'title' => 'Ujian Quiz Cepat (50 Soal)',
            'description' => 'Ujian kecepatan dengan 50 soal dalam 5 menit.',
            'duration' => 5, // 5 Menit
            'start_time' => now(),
            'end_time' => now()->addDays(7), // Aktif selama seminggu
            'is_active' => true,
        ]);

        // Hubungkan Test 1 ke Topik (Ambil 50 soal acak)
        $test1->topics()->attach($topic->id, [
            'total_questions' => 50,
            'question_type' => 'multiple_choice',
            'random_questions' => true,
            'random_answers' => true,
            'max_answers' => 5,
        ]);

        // Hubungkan ke Grup
        $test1->groups()->attach($group->id);


        // --- TEST 2: Ujian Marathon (100 Soal, 10 Menit) ---
        $test2 = Test::create([
            'title' => 'Ujian Marathon (100 Soal)',
            'description' => 'Ujian ketahanan dengan 100 soal dalam 10 menit.',
            'duration' => 10, // 10 Menit
            'start_time' => now(),
            'end_time' => now()->addDays(7),
            'is_active' => true,
        ]);

        // Hubungkan Test 2 ke Topik (Ambil 100 soal acak)
        $test2->topics()->attach($topic->id, [
            'total_questions' => 100,
            'question_type' => 'multiple_choice',
            'random_questions' => true,
            'random_answers' => true,
            'max_answers' => 5,
        ]);

        // Hubungkan ke Grup
        $test2->groups()->attach($group->id);
    }
}
