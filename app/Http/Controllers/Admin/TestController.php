<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTestRequest;
use App\Http\Requests\Admin\UpdateTestRequest;
use App\Models\Test;
use App\Models\Group;
use App\Models\Module;
use App\Models\Topic;
use App\Models\TestUser;
use App\Models\Question; // Pastikan import ini ada untuk fitur grading
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Inertia\Inertia;



class TestController extends Controller
{
    /* ================= INDEX ================= */
    public function index(Request $request)
    {
        $section = strtolower((string) $request->input('section', 'tests'));
        if ($section === 'analitics') {
            $section = 'analytics';
        }

        if ($section === 'analytics') {

            // 1. Ambil SEMUA ujian aktif
            $tests = Test::where('is_active', true)
                ->orderBy('created_at', 'desc')
                ->select('id', 'title', 'duration')
                ->get();

            // 2. Tentukan ujian mana yang dipilih
            $currentTestId = $request->input('test_id') ?? ($tests->first()->id ?? null);
            $participants = [];

            if ($currentTestId) {
                // Hitung total soal dengan optimized SQL (bukan eager load topics.questions)
                $totalQuestions = DB::table('questions')
                    ->join('topics', 'questions.topic_id', '=', 'topics.id')
                    ->join('test_topics', 'topics.id', '=', 'test_topics.topic_id')
                    ->where('test_topics.test_id', $currentTestId)
                    ->where('questions.is_active', true)
                    ->count();

                if ($totalQuestions == 0) $totalQuestions = 1;

                // Ambil peserta dengan skor dari results table (optimized SQL, bukan eager load answers)
                $participantsQuery = DB::table('test_users')
                    ->join('users', 'test_users.user_id', '=', 'users.id')
                    ->leftJoin('results', 'test_users.id', '=', 'results.test_user_id')
                    ->where('test_users.test_id', $currentTestId)
                    ->orderByDesc('test_users.updated_at');

                // Aggregate answered count per test_user
                $answeredCountsRaw = DB::table('user_answers')
                    ->selectRaw('test_user_id, COUNT(*) as answer_count')
                    ->groupBy('test_user_id')
                    ->get()
                    ->keyBy('test_user_id');

                $participants = $participantsQuery
                    ->select([
                        'test_users.id',
                        'test_users.test_id',
                        'test_users.status',
                        'test_users.started_at',
                        'test_users.finished_at',
                        'users.id as user_id',
                        'users.name as user_name',
                        'users.npm',
                        'users.role',
                        'results.total_score',
                    ])
                    ->get()
                    ->map(function ($p) use ($answeredCountsRaw) {
                        $answeredCount = $answeredCountsRaw[$p->id]->answer_count ?? 0;
                        return [
                            'id' => $p->id,
                            'test_id' => $p->test_id,
                            'user' => (object) [
                                'id' => $p->user_id,
                                'name' => $p->user_name,
                                'npm' => $p->npm,
                                'role' => $p->role,
                            ],
                            'status' => $p->status,
                            'started_at' => $p->started_at,
                            'finished_at' => $p->finished_at,
                            'answered_count' => (int) $answeredCount,
                            'score' => number_format((float) ($p->total_score ?? 0), 2),
                        ];
                    });
            }

            return inertia('Admin/Tests/Index', [
                'tests' => $tests,
                'currentTestId' => (int)$currentTestId,
                'participants' => $participants,
                'testUsers' => [],
                'testUsersStats' => $this->calculateTestUsersStats($request),
            ]);
        }

        if ($section === 'results') {
            $selectedTestId = $this->resolveResultsTestId($request);
            $perPage = 100;

            $testUsers = $this->buildResultsQuery($request, $selectedTestId)
                ->paginate($perPage)
                ->appends(array_merge($request->query(), [
                    'section' => 'results',
                    'test_id' => $selectedTestId,
                    'per_page' => $perPage,
                ]));

            return inertia('Admin/Tests/Index', [
                'testUsers' => $testUsers,
                'testUsersStats' => $this->calculateTestUsersStats($request, $selectedTestId),
                'resultsTestOptions' => $this->getResultsTestOptions($selectedTestId),
                'resultsFilters' => array_merge(
                    $request->only(['search', 'sort']),
                    [
                        'test_id' => $selectedTestId,
                        'per_page' => $perPage,
                    ]
                ),
            ]);
        }

        if ($section === 'statistic') {
            $statsTestsQuery = Test::query()->select([
                'id',
                'title',
                'duration',
                'start_time',
                'end_time',
                'is_active',
                'created_at',
            ])->latest('created_at');

            if ($request->search) {
                $statsTestsQuery->where('title', 'like', "%{$request->search}%");
            }

            if ($request->module_id) {
                $statsTestsQuery->whereHas('topics', function ($q) use ($request) {
                    $q->where('module_id', $request->module_id);
                });
            }

            if ($request->group_id) {
                $statsTestsQuery->whereHas('groups', function ($q) use ($request) {
                    $q->where('groups.id', $request->group_id);
                });
            }

            return inertia('Admin/Tests/Index', [
                'tests' => $statsTestsQuery->paginate(20)->appends(array_merge($request->query(), ['section' => 'statistic'])),
                'modules' => Module::select('id', 'name')->where('is_active', true)->orderBy('name')->get(),
                'groups' => Group::select('id', 'name')->orderBy('name')->get(),
                'topics' => [],
                'filters' => $request->only(['search', 'module_id', 'group_id']),
            ]);
        }

        // ==========================================================
        // 🔵 2. LOGIKA DEFAULT (DAFTAR UJIAN & HASIL)
        // ==========================================================

        $query = Test::with('groups', 'topics')->latest();

        if ($request->search) {
            $query->where('title', 'like', "%{$request->search}%");
        }

        if ($request->module_id) {
            $query->whereHas('topics', function ($q) use ($request) {
                $q->where('module_id', $request->module_id);
            });
        }

        if ($request->group_id) {
            $query->whereHas('groups', function ($q) use ($request) {
                $q->where('groups.id', $request->group_id);
            });
        }

        return inertia('Admin/Tests/Index', [
            // List Ujian (Pagination 20 agar daftar lebih panjang)
            'tests' => $query->paginate(20)->appends($request->query()),

            // Data Dropdown
            'modules' => Module::select('id', 'name')->where('is_active', true)->orderBy('name')->get(),
            'groups' => Group::select('id', 'name')->orderBy('name')->get(),
            'topics' => Topic::with('module')->where('is_active', true)->get(),

            'filters' => $request->only(['search', 'module_id', 'group_id']),
        ]);
    }

    /**
     * Calculate stats for ALL test users (not paginated)
     * Used for dashboard summary cards
     */
    private function buildResultsQuery(Request $request, ?int $selectedTestId = null)
    {
        // OPTIMIZED: Use join instead of whereHas to avoid N+1 queries
        $query = TestUser::query()
            ->select('test_users.*')
            ->with([
                'user:id,name,npm',
                'test:id,title,duration',
                'result:id,test_user_id,total_score,status'
            ])
            ->join('users', 'test_users.user_id', '=', 'users.id');

        if ($selectedTestId) {
            $query->where('test_users.test_id', $selectedTestId);
        } elseif ($request->filled('test_id')) {
            $query->where('test_users.test_id', (int) $request->input('test_id'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('users.name', 'like', "%{$search}%")
                    ->orWhere('users.npm', 'like', "%{$search}%");
            });
        }

        $sort = (string) $request->input('sort', 'latest');
        if ($sort === 'oldest') {
            $query->orderBy('test_users.started_at');
        } elseif ($sort === 'submitted') {
            $query->orderByDesc('test_users.finished_at')->orderByDesc('test_users.started_at');
        } else {
            $query->orderByDesc('test_users.started_at');
        }

        return $query->distinct('test_users.id');
    }

    private function calculateTestUsersStats(Request $request, ?int $selectedTestId = null)
    {
        try {
            // OPTIMIZED: Use join for search instead of whereExists
            $statsQuery = DB::table('test_users')
                ->join('users', 'test_users.user_id', '=', 'users.id')
                ->leftJoin('results', 'results.test_user_id', '=', 'test_users.id');

            if ($selectedTestId) {
                $statsQuery->where('test_users.test_id', $selectedTestId);
            } elseif ($request->filled('test_id')) {
                $statsQuery->where('test_users.test_id', (int) $request->input('test_id'));
            }

            if ($request->filled('search')) {
                $search = trim((string) $request->input('search'));
                $statsQuery->where(function ($q) use ($search) {
                    $q->where('users.name', 'like', "%{$search}%")
                        ->orWhere('users.npm', 'like', "%{$search}%");
                });
            }

            $stats = $statsQuery
                ->selectRaw('COUNT(DISTINCT test_users.id) as total')
                ->selectRaw('SUM(CASE WHEN test_users.finished_at IS NOT NULL THEN 1 ELSE 0 END) as completed')
                ->selectRaw('AVG(results.total_score) as avg_score')
                ->first();

            $total = (int) ($stats->total ?? 0);
            $completed = (int) ($stats->completed ?? 0);

            return [
                'total' => $total,
                'completed' => $completed,
                'pending' => max(0, $total - $completed),
                'avgScore' => number_format((float) ($stats->avg_score ?? 0), 2),
            ];
        } catch (\Exception $e) {
            // Return default fallback values
            return [
                'total' => 0,
                'completed' => 0,
                'pending' => 0,
                'avgScore' => '0.00',
            ];
        }
    }

    private function resolveResultsTestId(Request $request): ?int
    {
        if ($request->filled('test_id')) {
            return (int) $request->input('test_id');
        }

        return Test::query()
            ->where('is_active', true)
            ->latest('start_time')
            ->value('id');
    }

    private function getResultsTestOptions(?int $selectedTestId = null)
    {
        $query = Test::query()
            ->select('id', 'title')
            ->where('is_active', true)
            ->orderByDesc('start_time');

        if ($selectedTestId) {
            $query->orWhere('id', $selectedTestId);
        }

        return $query->get();
    }

    public function create()
    {
        return inertia('Admin/Tests/Create', [
            'groups' => Group::all(),
            'topics' => Topic::with('module')->where('is_active', true)->get(),
            'modules' => Module::select('id', 'name')
                ->where('is_active', true)
                ->orderBy('name')
                ->get(),
        ]);
    }
    /* ================= STORE ================= */
    public function store(StoreTestRequest $request)
    {
        try {
            $data = $request->validated();

            // Tambahkan pengecekan manual untuk demo alert
            $exists = Test::where('start_time', $data['start_time'])
                ->where('title', $data['title'])
                ->exists();

            if ($exists) {
                return back()->with('error', 'Judul dan waktu ujian sudah terdaftar!')->withInput();
            }

            DB::beginTransaction();

            $test = Test::create([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'duration' => $data['duration'],
                'start_time' => $data['start_time'],
                'end_time' => $data['end_time'],
                'is_active' => $data['is_active'] ?? true,
                'results_to_users' => $data['results_to_users'] ?? false,
                'require_seb' => $data['require_seb'] ?? true,
            ]);

            if (isset($data['groups'])) {
                $test->groups()->sync($data['groups']);
            }

            if (isset($data['topics'])) {
                $syncTopics = [];
                foreach ($data['topics'] as $topic) {
                    $syncTopics[$topic['id']] = [
                        'total_questions' => $topic['total_questions'],
                        'question_type' => $topic['question_type'] ?? 'mixed',
                    ];
                }
                $test->topics()->sync($syncTopics);
            }

            DB::commit();

            return redirect()->route('admin.tests.index')->with('success', 'Ujian berhasil dibuat');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gagal menyimpan: ' . $e->getMessage())->withInput();
        }
    }

    /* ================= SHOW ================= */
    public function show(Test $test)
    {
        $test->load('groups', 'topics.module');
        return inertia('Admin/Tests/Show', ['test' => $test]);
    }

    /* ================= EDIT ================= */
    public function edit(Test $test)
    {
        $test->load('groups', 'topics');
        return inertia('Admin/Tests/Edit', [
            'test' => $test,
            'groups' => Group::all(),
            'topics' => Topic::with('module')->where('is_active', true)->get(),
            'modules' => Module::select('id', 'name')
                ->where('is_active', true)
                ->orderBy('name')
                ->get(),
        ]);
    }

    /* ================= UPDATE ================= */
    public function update(UpdateTestRequest $request, Test $test)
    {
        $data = $request->validated();

        $test->update([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'duration' => $data['duration'],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'],
            'is_active' => $data['is_active'] ?? $test->is_active,
            'results_to_users' => $data['results_to_users'] ?? $test->results_to_users,
            'require_seb' => $data['require_seb'] !== null ? $data['require_seb'] : true,
        ]);

        if (isset($data['groups'])) {
            $test->groups()->sync($data['groups']);
        }

        if (isset($data['topics'])) {
            $syncTopics = [];
            foreach ($data['topics'] as $topic) {
                $syncTopics[$topic['id']] = [
                    'total_questions' => $topic['total_questions'],
                    'question_type' => $topic['question_type'] ?? 'mixed',
                ];
            }
            $test->topics()->sync($syncTopics);
        }

        return redirect()->route('admin.tests.index')->with('success', 'Ujian berhasil diperbarui');
    }

    /* ================= DESTROY ================= */
    public function destroy(Test $test)
    {
        $test->delete();
        return redirect()->route('admin.tests.index')->with('success', 'Ujian berhasil dihapus');
    }

    /* ================= GRADE ESSAY ================= */
    public function gradeEssay(Request $request)
    {
        $request->validate([
            'answer_id' => 'required|exists:user_answers,id',
            'is_correct' => 'required|boolean'
        ]);

        $userAnswer = DB::table('user_answers')->where('id', $request->answer_id)->first();

        if (!$userAnswer) {
            return back()->withErrors('Data jawaban tidak ditemukan.');
        }

        $question = Question::find($userAnswer->question_id);
        $score = $request->is_correct ? $question->score : 0;

        DB::table('user_answers')
            ->where('id', $request->answer_id)
            ->update([
                'is_correct' => $request->is_correct,
                'score'      => $score
            ]);

        return back()->with('success', 'Nilai berhasil disimpan.');
    }
}
