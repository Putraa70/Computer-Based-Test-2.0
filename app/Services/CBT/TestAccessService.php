<?php

namespace App\Services\CBT;

use App\Models\Test;
use App\Models\User;

class TestAccessService
{
    public static function canAccess(User $user, Test $test): bool
    {
        // 1. Cek apakah ujian aktif
        if (!$test->is_active) {
            return false;
        }

        // 2. Cek waktu (Fix: Menambahkan return false jika diluar jadwal)
        // Menggunakan copy() agar instance asli tidak berubah jika ada manipulasi
        $now = now();
        if (!$now->between($test->start_time, $test->end_time)) {
            return false;
        }

        // 3. Cek angkatan/grup user
        return $test->groups()
            ->whereIn('groups.id', $user->groups->pluck('id'))
            ->exists();
    }
}
