<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Module;

class ModuleSeeder extends Seeder
{
    public function run(): void
    {
        Module::create([
            'name' => 'Ujian AKT 2025',
            'is_active' => true,
        ]);
    }
}
