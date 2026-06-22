<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Group extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
    ];

    // Angkatan ↔ User
    public function users()
    {
        return $this->belongsToMany(User::class, 'user_groups');
    }

    // Angkatan ↔ Ujian
    public function tests()
    {
        return $this->belongsToMany(Test::class, 'test_groups');
    }
}
