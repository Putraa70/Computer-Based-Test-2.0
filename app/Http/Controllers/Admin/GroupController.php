<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Group;
use Illuminate\Http\Request;

class GroupController extends Controller {
    public function index() {
        return inertia('Admin/Groups/Index', [
            'groups' => Group::latest()->get(),
        ]);
    }

    public function create() {
        return inertia('Admin/Groups/Create');
    }

    public static function getGroupData(Request $request) {
        $query = Group::withCount('users')->latest();

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        return $query->paginate(10)->appends($request->query());
    }

    public function store(Request $request) {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        Group::create($request->all());

        return redirect()
            ->route('admin.users.index', ['section' => 'groups'])
            ->with('success', 'Grup berhasil dibuat.'); // Flash message aman
    }

    public function show(Group $group) {
        return inertia('Admin/Groups/Show', [
            'group' => $group->load('users'),
        ]);
    }

    public function edit(Group $group) {
        return inertia('Admin/Groups/Edit', [
            'group' => $group,
        ]);
    }

    public function update(Request $request, Group $group) {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $group->update($request->all());
        return redirect()
            ->route('admin.users.index', ['section' => 'groups'])
            ->with('success', 'Grup berhasil diperbarui.');
    }

    public function destroy(Group $group) {
        $group->delete();
        return redirect()
            ->route('admin.users.index', ['section' => 'groups'])
            ->with('success', 'Grup berhasil dihapus.');
    }
}
