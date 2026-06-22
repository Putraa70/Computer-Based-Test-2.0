<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Topic;
use App\Models\Question;
use App\Models\Answer;

class QuestionSeeder extends Seeder
{
    public function run(): void
    {
        $topic = Topic::first();

        $q1 = Question::create([
            'topic_id' => $topic->id,
            'type' => 'multiple_choice',
            'question_text' => 'Organel sel penghasil energi adalah?',
            'score' => 1,
        ]);

        Answer::insert([
            ['question_id' => $q1->id, 'answer_text' => 'Mitokondria', 'is_correct' => true],
            ['question_id' => $q1->id, 'answer_text' => 'Ribosom', 'is_correct' => false],
            ['question_id' => $q1->id, 'answer_text' => 'Nukleus', 'is_correct' => false],
        ]);

        $q2 = Question::create([
            'topic_id' => $topic->id,
            'type' => 'multiple_choice',
            'question_text' => 'Bagian jantung yang memompa darah ke seluruh tubuh?',
            'score' => 1,
        ]);

        Answer::insert([
            ['question_id' => $q2->id, 'answer_text' => 'Ventrikel kiri', 'is_correct' => true],
            ['question_id' => $q2->id, 'answer_text' => 'Atrium kanan', 'is_correct' => false],
            ['question_id' => $q2->id, 'answer_text' => 'Vena cava', 'is_correct' => false],
        ]);
    }
}
