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
            $perPageFilter = $this->resolvePerPageFilter($request);
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
            $data['modules'] = $query
                ->paginate($this->resolvePerPage($request, $query))
                ->appends(array_merge($request->query(), ['per_page' => $perPageFilter]));

            // Kirim filter balik ke frontend agar input search tidak hilang
            $data['filters'] = array_merge($request->only(['search']), ['per_page' => $perPageFilter]);
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
            $search = trim((string) $request->input('search', ''));
            $perPageFilter = $this->resolvePerPageFilter($request);

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
            // Questions: Pagination default 100 per halaman untuk display list
            // ═══════════════════════════════════════════════════════════════════════
            if ($topicId) {
                $questionsQuery = Question::with('answers')
                    ->where('topic_id', $topicId)
                    ->latest();

                if ($search !== '') {
                    $questionsQuery->where(function ($query) use ($search) {
                        $query->where('question_text', 'like', "%{$search}%");

                        if (ctype_digit($search)) {
                            $query->orWhere('id', (int) $search);
                        }

                        $query->orWhereHas('answers', function ($answerQuery) use ($search) {
                                $answerQuery->where('answer_text', 'like', "%{$search}%");
                            });
                    });
                }

                $data['questions'] = $questionsQuery
                    ->paginate($this->resolvePerPage($request, $questionsQuery))
                    ->appends(array_merge($request->query(), ['per_page' => $perPageFilter]));
            } else {
                $data['questions'] = null;
            }

            $data['filters'] = [
                'module_id' => $moduleId,
                'topic_id'  => $topicId,
                'search'    => $search,
                'per_page'  => $perPageFilter,
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

    private function resolvePerPage(Request $request, $query = null): int
    {
        if ($request->input('per_page') === 'all' && $query) {
            return max(1, (clone $query)->count());
        }

        $perPage = (int) $request->input('per_page', 100);

        return in_array($perPage, [100, 500], true) ? $perPage : 100;
    }

    private function resolvePerPageFilter(Request $request): int|string
    {
        if ($request->input('per_page') === 'all') {
            return 'all';
        }

        $perPage = (int) $request->input('per_page', 100);

        return in_array($perPage, [100, 500], true) ? $perPage : 100;
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
