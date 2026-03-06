<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Module;
use App\Models\Topic;
use App\Models\Question;
use App\Http\Requests\Admin\StoreModuleRequest;
use App\Http\Requests\Admin\UpdateModuleRequest;
use Illuminate\Http\Request;

class ModuleController extends Controller
{
    public function index(Request $request)
    {
        // 1. Cek Section/Tab saat ini
        $section = $request->input('section', 'class');

        // Data dasar
        $data = [
            'modules' => Module::latest()->get(),
            'section' => $section,
        ];

        if ($section === 'class') {
            $query = Module::withCount('topics') // Hitung jumlah topik
                ->latest();

            // Fitur Pencarian
            if ($request->search) {
                $query->where(function ($q) use ($request) {
                    $q->where('name', 'like', "%{$request->search}%")
                        ->orWhere('description', 'like', "%{$request->search}%");
                });
            }

            // Gunakan Pagination untuk tabel utama
            $data['modules'] = $query->paginate(10)->appends($request->query());

            // Kirim filter balik ke frontend agar input search tidak hilang
            $data['filters'] = $request->only(['search']);
        }

        // ==========================================
        //  TAMBAHKAN INI: LOGIC UNTUK TAB IMPORT
        // ==========================================
        if ($section === 'import') {
            $moduleId = $request->input('module_id');

            // Ambil Topik (hanya jika modul dipilih)
            $topics = [];
            if ($moduleId) {
                $topics = Topic::select('id', 'name', 'module_id')
                    ->where('module_id', $moduleId)
                    ->orderBy('name')
                    ->get();
            }

            // Return langsung ke View Import
            return inertia('Admin/Modules/Import', [
                'modules' => Module::select('id', 'name')->orderBy('name')->get(),
                'topics'  => $topics,
                'filters' => ['module_id' => $moduleId],
                'section' => 'import' // Penting agar sidebar/tab aktif
            ]);
        }
        // ==========================================

        // 2. LOGIC TAB 'QUESTIONS'
        if ($section === 'questions') {
            $moduleId = $request->input('module_id');
            $topicId  = $request->input('topic_id');

            $data['modules'] = Module::select('id', 'name')->orderBy('name')->get();

            $data['topics'] = $moduleId
                ? Topic::select('id', 'name', 'module_id')
                ->where('module_id', $moduleId)
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
                : [];

            // ═══════════════════════════════════════════════════════════════════════
            // PENTING: Hitung SUMMARY DULU (sebelum pagination) untuk data LENGKAP
            // Summary harus menampilkan TOTAL SEMUA SOAL, bukan hanya 50 per halaman
            // ═══════════════════════════════════════════════════════════════════════
            if ($topicId) {
                $summaryQuestions = Question::with('answers')
                    ->where('topic_id', $topicId)
                    ->get();  // ← Ambil SEMUA soal, tidak dipaginate

                $multipleChoice = $summaryQuestions->where('type', 'multiple_choice');
                $optionCounts = [];
                $expectedOptions = 5;
                $noCorrectAnswer = 0;
                $incompleteOptions = 0;

                foreach ($multipleChoice as $question) {
                    $answerCount = $question->answers->count();
                    $optionCounts[$answerCount] = ($optionCounts[$answerCount] ?? 0) + 1;

                    if ($answerCount < $expectedOptions) {
                        $incompleteOptions++;
                    }

                    if (!$question->answers->contains('is_correct', true)) {
                        $noCorrectAnswer++;
                    }
                }

                // ← Summary dihitung dari SEMUA soal, bukan hanya halaman saat ini
                $data['summary'] = [
                    'total' => $summaryQuestions->count(),
                    'multipleChoice' => $multipleChoice->count(),
                    'noCorrectAnswer' => $noCorrectAnswer,
                    'incompleteOptions' => $incompleteOptions,
                    'optionCounts' => $optionCounts,
                    'hasIssues' => $noCorrectAnswer > 0 || $incompleteOptions > 0,
                ];
            } else {
                $data['summary'] = null;
            }

            // ═══════════════════════════════════════════════════════════════════════
            // Questions: Pagination 50 per halaman untuk display list
            // ═══════════════════════════════════════════════════════════════════════
            $data['questions'] = $topicId
                ? Question::with('answers')
                ->where('topic_id', $topicId)
                ->latest()
                ->paginate(50)  // ← Halaman hanya 50 items
                ->withQueryString()
                : null;

            $data['filters'] = [
                'module_id' => $moduleId,
                'topic_id'  => $topicId,
            ];
        }

        // 3. LOGIC TAB 'SUBJECTS'
        if ($section === 'subjects') {
            $data['topics'] = Topic::with('module')
                ->withCount('questions')
                ->where('is_active', true)
                ->latest()
                ->get();
        }

        // Default render halaman Index
        return inertia('Admin/Modules/Index', $data);
    }

    /**
     * Form tambah modul
     */
    public function create()
    {
        return inertia('Admin/Modules/Create');
    }

    /**
     * Simpan modul baru
     */
    public function store(StoreModuleRequest $request)
    {
        Module::create($request->validated());

        return redirect()
            ->route('admin.modules.index', ['section' => 'class'])
            ->with('success', 'Modul berhasil ditambahkan');
    }

    /**
     * Detail modul
     */
    public function show(Module $module)
    {
        return inertia('Admin/Modules/Show', [
            'module' => $module->load('topics'),
        ]);
    }

    /**
     * Form edit modul
     */
    public function edit(Module $module)
    {
        return inertia('Admin/Modules/Edit', [
            'module' => $module,
        ]);
    }

    /**
     * Update modul
     */
    public function update(UpdateModuleRequest $request, Module $module)
    {
        $module->update($request->validated());

        return redirect()
            ->route('admin.modules.index', ['section' => 'class'])
            ->with('success', 'Modul berhasil diperbarui');
    }

    /**
     * Hapus modul
     */
    public function destroy(Module $module)
    {
        $module->delete();

        return redirect()
            ->route('admin.modules.index', ['section' => 'class'])
            ->with('success', 'Modul berhasil dihapus');
    }
}
