<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'npm',
        'role',
        'is_active',
        'active_session_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    /* ================= RELATIONS ================= */

    // User ↔ Angkatan
    public function groups()
    {
        return $this->belongsToMany(Group::class, 'user_groups');
    }

    // Riwayat ujian yang diikuti user
    public function testUsers()
    {
        return $this->hasMany(TestUser::class);
    }

    // Nilai yang divalidasi oleh admin ini
    public function validatedResults()
    {
        return $this->hasMany(Result::class, 'validated_by');
    }
}
