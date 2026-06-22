<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Module;
use App\Models\Topic;

class TopicSeeder extends Seeder
{
    public function run(): void
    {
        $module = Module::first();

        Topic::create([
            'module_id' => $module->id,
            'name' => 'Biomedik',
            'is_active' => true,
        ]);
    }
}
