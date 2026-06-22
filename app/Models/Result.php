<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Result extends Model
{
    use HasFactory;

    protected $fillable = [
        'test_user_id',
        'total_score',
        'status',
        'validated_by',
        'validated_at',
    ];

    // Nilai → TestUser
    public function testUser()
    {
        return $this->belongsTo(TestUser::class);
    }

    // Nilai → Admin validator
    public function validator()
    {
        return $this->belongsTo(User::class, 'validated_by');
    }
}
