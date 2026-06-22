<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AuditLog extends Model
{
    use HasFactory;

    protected $table = 'audit_logs';
    
    protected $fillable = [
        'user_id',
        'test_user_id',
        'action',
        'resource_type',
        'resource_id',
        'ip_address',
        'user_agent',
        'description',
        'metadata',
        'severity',
    ];

    protected $casts = [
        'metadata' => 'json',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Audit Log → User (who did it)
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Audit Log → TestUser (affected exam)
     */
    public function testUser()
    {
        return $this->belongsTo(TestUser::class)->withTrashed();
    }

    /**
     * Scope: recent audits
     */
    public function scopeRecent($query, $minutes = 60)
    {
        return $query->where('created_at', '>=', now()->subMinutes($minutes));
    }

    /**
     * Scope: security events only
     */
    public function scopeSecurity($query)
    {
        return $query->whereIn('severity', ['critical', 'warning']);
    }

    /**
     * Scope: for specific action
     */
    public function scopeForAction($query, $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope: for specific user
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope: for specific test user
     */
    public function scopeForTestUser($query, $testUserId)
    {
        return $query->where('test_user_id', $testUserId);
    }
}
