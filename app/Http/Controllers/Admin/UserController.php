<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Pagination\LengthAwarePaginator;
use App\Models\User;
use App\Models\Group;
use App\Models\TestUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Admin\GroupController;

class UserController extends Controller
{

    public function index(Request $request)
    {
        $section = $request->input('section', 'management');

        if ($section === 'online') {
            return $this->handleOnline($request);
        }

        if ($section === 'groups') {
            return $this->handleGroups($request);
        }

        if ($section === 'selection') {
            return $this->handleSelection($request);
        }

        if ($section === 'individual') {
            return $this->handleIndividualResult($request);
        }


        // sisanya balik ke manajemen user biasa
        return $this->handleManagement($request);
    }

    private function handleGroups(Request $request)
    {
        $groups = GroupController::getGroupData($request);
        return inertia('Admin/Users/Index', [
            'section' => 'groups',
            'groups' => $groups, // data grup dikirim kesini
            'filters' => $request->only(['search']),
        ]);
    }


    // logic buat nampilin siapa aja yang lagi online

    private function handleOnline(Request $request)
    {
        // butuh semua data dulu untuk menentukan siapa yang online di seluruh database
        $allUsers = User::select('id', 'name', 'npm', 'role', 'email')->get();

        // Mapping & Inject Data dari cache, validasi 1 Kali
        // Kita hitung timestamp aktivitasnya untuk bahan sorting
        $processedUsers = $allUsers->map(function ($user) {
            $cacheKey = 'user-online-' . $user->id;
            $data = Cache::get($cacheKey);

            $user->is_online = $data ? true : false;
            $user->ip_address = $data['ip'] ?? '-';
            $user->last_activity = $data['last_activity'] ?? null;

            // Konversi waktu ke timestamp angka agar mudah disortir , 0 kalo offline
            $user->sort_time = $data && isset($data['last_activity'])
                ? strtotime($data['last_activity'])
                : 0;

            return $user;
        });

        // Sorting server side supaya yang terakhir online bakal ditaruh diatas
        $sortedUsers = $processedUsers->sortByDesc('sort_time')->values();

        // Hitung Total Online untuk Badge Frontend
        $totalOnlineCount = $sortedUsers->where('is_online', true)->count();

        $perPage = 10;
        $currentPage = LengthAwarePaginator::resolveCurrentPage();
        $currentItems = $sortedUsers->slice(($currentPage - 1) * $perPage, $perPage)->values()->all();
        $paginatedUsers = new LengthAwarePaginator(
            $currentItems,
            $sortedUsers->count(),
            $perPage,
            $currentPage,
            [
                'path' => LengthAwarePaginator::resolveCurrentPath(),
                'query' => $request->query(),
            ]
        );

        return inertia('Admin/Users/Index', [
            'section' => 'online',
            'users' => $paginatedUsers,
            'totalOnline' => $totalOnlineCount,
        ]);
    }

    // logic buat nampilin tabel seleksi massal
    private function handleSelection(Request $request)
    {
        $query = User::with('groups');

        // filter pencarian
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('npm', 'like', "%{$request->search}%");
            });
        }

        // filter grup
        if ($request->group_id) {
            $query->whereHas('groups', fn($q) => $q->where('groups.id', $request->group_id));
        }

        // Sorting: Admin first (0), then peserta (1), then by ID descending
        $query->orderByRaw("CASE WHEN role = 'admin' THEN 0 WHEN role = 'peserta' THEN 1 ELSE 2 END")
            ->orderBy('id', 'desc');

        return inertia('Admin/Users/Index', [
            'section' => 'selection',
            // pake withQueryString dengan appends biar gada error
            'users' => $query->paginate(50)->appends($request->query()),
            'groups' => Group::select('id', 'name')->get(),
            'filters' => $request->only(['search', 'group_id']),
        ]);
    }


    public function assignGroups(Request $request)
    {
        //Validasi Input
        $request->validate([
            'user_ids' => 'required|array|min:1',
            'group_ids' => 'required|array|min:1',
        ]);

        // Eksekusi Massal
        $users = User::whereIn('id', $request->user_ids)->get();

        DB::transaction(function () use ($users, $request) {
            foreach ($users as $user) {
                // syncWithoutDetaching agar grup lama ga ilang
                $user->groups()->syncWithoutDetaching($request->group_ids);
            }
        });

        return redirect()->route('admin.users.index', ['section' => 'selection'])
            ->with('success', count($users) . ' pengguna berhasil ditambahkan ke grup baru.');
    }

    public function bulkDelete(Request $request)
    {
        // Validasi Input
        $request->validate([
            'user_ids' => 'required|array|min:1',
        ]);

        try {
            DB::transaction(function () use ($request) {
                // Hapus user yang terpilih, kecuali admin yang sedang login
                $deletedCount = User::whereIn('id', $request->user_ids)
                    ->where('id', '!=', auth()->id()) // Jangan hapus user yang sedang login
                    ->delete();

                if ($deletedCount === 0) {
                    throw new \Exception('Tidak ada pengguna yang dapat dihapus.');
                }
            });

            return redirect()->route('admin.users.index', ['section' => 'selection'])
                ->with('success', count($request->user_ids) . ' pengguna berhasil dihapus.');
        } catch (\Exception $e) {
            return redirect()->route('admin.users.index', ['section' => 'selection'])
                ->with('error', 'Gagal menghapus pengguna: ' . $e->getMessage());
        }
    }

    // logic buat nampilin rapor atau hasil individu
    private function handleIndividualResult(Request $request)
    {
        $selectedUserId = $request->input('user_id');
        $selectedGroupId = $request->input('group_id');

        $groups = Group::select('id', 'name')->orderBy('name')->get();

        $usersInGroup = [];
        if ($selectedGroupId) {
            $usersInGroup = User::whereHas('groups', fn($q) => $q->where('groups.id', $selectedGroupId))
                ->select('id', 'name', 'npm')
                ->orderBy('name')
                ->get();
        }

        $studentReport = null;
        $studentStats = null;

        if ($selectedUserId) {
            $studentReport = TestUser::with(['test', 'result'])
                ->where('user_id', $selectedUserId)
                ->latest()
                ->get()
                ->map(function ($tu) {
                    return [
                        'test_title' => $tu->test->title ?? '-',
                        'start_time' => $tu->started_at,
                        'end_time'   => $tu->finished_at,
                        'status'     => $tu->status,
                        'score'      => $tu->result->total_score ?? 0,
                    ];
                });

            $studentStats = [
                'total_exams' => $studentReport->count(),
                'avg_score'   => round($studentReport->avg('score'), 1),
                'passed'      => $studentReport->where('score', '>=', 60)->count(),
            ];
        }

        return inertia('Admin/Users/Index', [
            'section' => 'individual',
            'groups' => $groups,
            'usersInGroup' => $usersInGroup,
            'studentReport' => $studentReport,
            'studentStats' => $studentStats,
            'filters' => [
                'group_id' => $selectedGroupId,
                'user_id' => $selectedUserId
            ]
        ]);
    }

    // logic default buat crud user biasa
    private function handleManagement(Request $request)
    {
        $query = User::with('groups');

        // filter pencarian nama / npm
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('npm', 'like', "%{$request->search}%");
            });
        }

        // filter grup (angkatan) - logic baru
        if ($request->group_id) {
            $query->whereHas('groups', function ($q) use ($request) {
                $q->where('groups.id', $request->group_id);
            });
        }

        // Sorting: Admin first (0), then peserta (1), then by ID descending
        $query->orderByRaw("CASE WHEN role = 'admin' THEN 0 WHEN role = 'peserta' THEN 1 ELSE 2 END")
            ->orderBy('id', 'desc');

        $users = $query->paginate(50)->appends($request->query());

        return inertia('Admin/Users/Index', [
            'section' => 'management',
            'users' => $users,
            'groups' => Group::select('id', 'name')->orderBy('name')->get(),
            'filters' => $request->only(['search', 'group_id']),
        ]);
    }

    public function create()
    {
        return inertia('Admin/Users/Create', [
            'groups' => Group::all(),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'npm' => 'nullable|string|unique:users,npm',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:admin,peserta',
            'groups' => 'nullable|array',
        ]);

        DB::transaction(function () use ($request) {
            // Untuk admin, gunakan password default atau bisa custom
            // Untuk peserta, gunakan NPM sebagai password
            $password = $request->role === 'admin'
                ? ($request->password ?: 'admin123')
                : $request->npm;

            $user = User::create([
                'name' => $request->name,
                'npm' => $request->npm,
                'email' => $request->email,
                'password' => Hash::make($password),
                'role' => $request->role,
                'is_active' => true,
            ]);

            // Sync groups hanya jika ada
            if ($request->groups) {
                $user->groups()->sync($request->groups);
            }
        });

        $message = $request->role === 'admin'
            ? 'User admin berhasil ditambahkan'
            : 'User peserta berhasil ditambahkan';

        return redirect()->route('admin.users.index', ['section' => 'management'])
            ->with('success', $message);
    }

    public function show(User $user)
    {
        return inertia('Admin/Users/Show', [
            'user' => $user->load('groups', 'testUsers.test'),
        ]);
    }

    public function edit(User $user)
    {
        return inertia('Admin/Users/Edit', [
            'user' => $user,
            'groups' => Group::all(),
        ]);
    }

    public function update(Request $request, User $user)
    {
        // 1. TAMPUNG hasil validasi ke variabel $validated
        // (Kode lama Anda tidak menampungnya, jadi variabel $validated tidak ada isinya)
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'npm' => 'nullable|string|max:20|unique:users,npm,' . $user->id,
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|min:8',
            'role' => 'required|in:admin,peserta',
            'groups' => 'nullable|array',
        ]);

        // 2. Logika Password
        if (empty($validated['password'])) {
            // Hapus key 'password' dari array agar Laravel TIDAK mengupdate kolom password
            unset($validated['password']);
        } else {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        // 4. Sync Group (hanya jika ada groups)
        if (isset($validated['groups'])) {
            $user->groups()->sync($validated['groups']);
        }

        return redirect()->route('admin.users.index')
            ->with('success', 'User berhasil diperbarui');
    }

    public function destroy(User $user)
    {
        $user->delete();
        return redirect()->route('admin.users.index')
            ->with('success', 'User berhasil dihapus');
    }
}
