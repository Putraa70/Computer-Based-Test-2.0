<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Group;

class GroupSeeder extends Seeder {

    public function run(): void {
        $groups = [
            'Farmasi 2021',
            'Farmasi 2022',
            'Farmasi 2023',
            'Farmasi 2024',
            'Angkatan 2021',
            'Angkatan 2022',
            'Angkatan 2023',
            'Angkatan 2024',
            'Angkatan 2025',
        ];

        foreach ($groups as $groupName) {
            Group::firstOrCreate(['name' => $groupName]);
        }
    }
}
