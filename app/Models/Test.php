<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Test extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'duration',
        'start_time',
        'end_time',
        'is_active',
        'results_to_users',
        'require_seb',
    ];

    // ==========================================
    //  RELASI UTAMA (DATABASE)
    // ==========================================

    // Ujian ↔ Topik
    public function topics()
    {
        return $this->belongsToMany(Topic::class, 'test_topics')
            ->withPivot([
                'total_questions',
                'question_type',
                'random_questions',
                'random_answers',
                'max_answers',
                'answer_mode'
            ])
            ->withTimestamps();
    }

    // Ujian ↔ Angkatan
    public function groups()
    {
        return $this->belongsToMany(Group::class, 'test_groups');
    }

    // Ujian → Peserta
    public function testUsers()
    {
        return $this->hasMany(TestUser::class);
    }

    /**
     * Accessor untuk memanggil $test->questions
     * Menggabungkan semua soal dari topik-topik yang ada di ujian ini.
     */
    public function getQuestionsAttribute()
    {
        // Pastikan topik sudah di-load untuk performa terbaik
        return $this->topics->flatMap(function ($topic) {
            return $topic->questions;
        });
    }
}
