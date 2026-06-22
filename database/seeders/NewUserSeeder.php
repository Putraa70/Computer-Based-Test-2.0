<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Group;
use Illuminate\Support\Facades\Hash;

class NewUserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Buat Grup Baru
        $group = Group::firstOrCreate([
            'name' => 'Angkatan 2026'
        ]);

        // 2. Buat 3 User Peserta Baru
        $users = [
            [
                'name' => 'Budi Santoso',
                'email' => 'budi2026@fk.unila.ac.id',
                'npm' => '2317051101',
            ],
            [
                'name' => 'Siti Aminah',
                'email' => 'siti2026@fk.unila.ac.id',
                'npm' => '2317051102',
            ],
            [
                'name' => 'Rizky Pratama',
                'email' => 'rizky2026@fk.unila.ac.id',
                'npm' => '2317051103',
            ]
        ];

        foreach ($users as $userData) {
            $user = User::create([
                'name' => $userData['name'],
                'email' => $userData['email'],
                'npm' => $userData['npm'],
                'password' => Hash::make('password'), // Password default
                'role' => 'peserta',
                'is_active' => true,
            ]);

            // Masukkan user ke grup Angkatan 2026
            $user->groups()->attach($group->id);
        }
    }
}
