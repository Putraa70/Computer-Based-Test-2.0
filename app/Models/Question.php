<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Question extends Model
{
    use HasFactory;

    protected $fillable = [
        'topic_id',
        'type',
        'question_text',
        'question_image',
        'score',
        'is_active',
    ];

    // Soal → Topik
    public function topic()
    {
        return $this->belongsTo(Topic::class);
    }

    // Soal → Jawaban (PG)
    public function answers()
    {
        return $this->hasMany(Answer::class);
    }

    // Soal → Jawaban Peserta
    public function userAnswers()
    {
        return $this->hasMany(UserAnswer::class);
    }
}
