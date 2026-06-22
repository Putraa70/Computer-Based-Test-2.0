<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {

    DB::statement('SET FOREIGN_KEY_CHECKS=0;');


        User::truncate();


        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // ADMIN 1
        User::create([
            'name' => 'Putra Dev',
            'npm' => null,
            'email' => 'putra@fk.unila.ac.id',
            'password' => Hash::make('putra123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Penda Wardani',
            'npm' => null,
            'email' => 'penda@fk.unila.ac.id',
            'password' => Hash::make('penda@123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        // ADMIN 2
        User::create([
            'name' => 'Nahrowi',
            'npm' => null,
            'email' => 'nahrowi@fk.unila.ac.id',
            'password' => Hash::make('nahrowi@123'),
            'role' => 'admin',
            'is_active' => true,
        ]);
    }
}
