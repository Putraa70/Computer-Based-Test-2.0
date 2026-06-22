<?php

namespace App\Imports;

use App\Models\User;
use App\Models\Group;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Maatwebsite\Excel\Concerns\ToCollection;

class UsersImport implements ToCollection
{
    public $skipped = [];
    public $importedCount = 0;

    public function collection(Collection $rows)
    {
        $rows = $rows->slice(1); // Skip header

        foreach ($rows as $row) {
            $data = [
                'name'      => trim($row[0] ?? ''),
                'npm'       => trim($row[1] ?? ''),
                'email'     => trim($row[2] ?? ''),
                'groupName' => trim($row[3] ?? ''),
            ];

            $result = self::saveUser($data);

            if ($result['status'] === 'skipped') {
                $this->skipped[] = $result['message'];
            } else {
                $this->importedCount++;
            }
        }
    }

    public static function saveUser(array $data)
    {
        $name      = $data['name'];
        $npm       = $data['npm'];
        $email     = $data['email'];
        $groupName = $data['groupName'];

        if (!$name || !$email || !$groupName) {
            return ['status' => 'skipped', 'message' => "Data tidak lengkap: $name"];
        }

        // 1. Cari atau Buat Group
        $group = Group::firstOrCreate(['name' => $groupName]);

        // 2. Cek User Existing by NPM
        $user = User::where('npm', $npm)->first();

        if ($user) {
            // --- KONDISI USER SUDAH ADA ---

            // Cek apakah user ini sudah ada di group yang dituju?
            if ($user->groups()->where('group_id', $group->id)->exists()) {
                // SKIP: User sudah ada & sudah masuk grup ini
                return ['status' => 'skipped', 'message' => "$name ($npm) sudah ada di grup $groupName"];
            }

            // UPDATE: User ada tapi belum masuk grup ini -> Masukkan!
            $user->groups()->attach($group->id);
            return ['status' => 'success', 'message' => 'User lama ditambahkan ke grup baru'];
        }

        // 3. Cek Email (jika NPM beda tapi Email sama, ini potensi konflik)
        if (User::where('email', $email)->exists()) {
            return ['status' => 'skipped', 'message' => "$name (Email $email sudah digunakan orang lain)"];
        }

        // 4. --- KONDISI USER BARU ---
        $newUser = User::create([
            'name'      => $name,
            'npm'       => $npm,
            'email'     => $email,
            'password'  => Hash::make($npm),
            'role'      => 'peserta',
            'is_active' => true,
        ]);

        $newUser->groups()->attach($group->id);

        return ['status' => 'success', 'message' => 'User baru dibuat'];
    }
}
