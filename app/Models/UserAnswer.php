<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class UserAnswer extends Model
{
    use HasFactory;

    protected $fillable = [
        'test_user_id',
        'question_id',
        'answer_id',
        'answer_text',
        'is_correct', // Menyimpan status Benar (1) atau Salah (0)
        'score',      // Menyimpan Bobot Nilai Soal
    ];

    // Jawaban → TestUser
    public function testUser()
    {
        return $this->belongsTo(TestUser::class);
    }

    // Jawaban → Soal
    public function question()
    {
        return $this->belongsTo(Question::class);
    }

    // Jawaban → Opsi (PG)
    public function answer()
    {
        return $this->belongsTo(Answer::class);
    }
}
