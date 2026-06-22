<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Question;
use Illuminate\Http\Request;

class AnswerController extends Controller
{
    public function store(Request $request, Question $question)
    {
        $request->validate([
            'answers' => 'required|array|min:2',
        ]);

        foreach ($request->answers as $answer) {
            $question->answers()->create([
                'answer_text' => $answer['text'],
                'is_correct' => $answer['is_correct'] ?? false,
            ]);
        }

        return redirect()->back()
            ->with('success', 'Jawaban berhasil ditambahkan');
    }
}
