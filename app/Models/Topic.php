<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Topic extends Model
{
    use HasFactory;

    protected $fillable = [
        'module_id',
        'name',
        'description',
        'is_active',
    ];

    // Topik → Modul
    public function module()
    {
        return $this->belongsTo(Module::class);
    }

    // Topik → Soal
    public function questions()
    {
        return $this->hasMany(Question::class);
    }

    // Topik ↔ Ujian
    public function tests()
    {
        return $this->belongsToMany(Test::class, 'test_topics')
            ->withPivot(['total_questions', 'question_type']);
    }
}
