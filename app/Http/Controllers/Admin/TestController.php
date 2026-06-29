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
use App\Services\CBT\QuestionGeneratorService;
use App\Services\CBT\QuestionCacheService;
use App\Services\CBT\ScoringService;
use Illuminate\Support\Facades\Cache;
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
                $participantsQuery = TestUser::with([
                    'user:id,name,npm,role',
                    'test:id,title',
                ])
                    ->select('test_users.*')
                    ->where('test_id', $currentTestId);

                ScoringService::selectFinalScore($participantsQuery);
                ScoringService::orderByFinalScore($participantsQuery);

                // Aggregate answered count per test_user
                $answeredCountsRaw = DB::table('user_answers')
                    ->join('test_users', 'user_answers.test_user_id', '=', 'test_users.id')
                    ->where('test_users.test_id', $currentTestId)
                    ->whereNotNull('user_answers.answer_id')
                    ->selectRaw('user_answers.test_user_id, COUNT(*) as answer_count')
                    ->groupBy('user_answers.test_user_id')
                    ->get()
                    ->keyBy('test_user_id');

                $participants = $participantsQuery
                    ->get()
                    ->map(function (TestUser $p) use ($answeredCountsRaw) {
                        $score = (float) ($p->final_score ?? ScoringService::calculate($p));
                        $answeredCount = $answeredCountsRaw[$p->id]->answer_count ?? 0;

                        return [
                            'id' => $p->id,
                            'test_id' => $p->test_id,
                            'user' => $p->user,
                            'status' => $p->status,
                            'started_at' => $p->started_at,
                            'finished_at' => $p->finished_at,
                            'answered_count' => (int) $answeredCount,
                            'score' => $score,
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
            $resultsQuery = $this->buildResultsQuery($request, $selectedTestId);
            $perPage = $this->resolvePerPage($request, $resultsQuery);
            $perPageFilter = $this->resolvePerPageFilter($request);

            $testUsers = $resultsQuery
                ->paginate($perPage)
                ->appends(array_merge($request->query(), [
                    'section' => 'results',
                    'test_id' => $selectedTestId,
                    'per_page' => $perPageFilter,
                ]));

            $testUsers->getCollection()->transform(function ($testUser) {
                $score = (float) ($testUser->final_score ?? ScoringService::calculate($testUser));
                $testUser->realtime_score = $score;

                if ($testUser->result) {
                    $testUser->result->total_score = $score;
                }

                return $testUser;
            });

            return inertia('Admin/Tests/Index', [
                'testUsers' => $testUsers,
                'testUsersStats' => $this->calculateTestUsersStats($request, $selectedTestId),
                'resultsTestOptions' => $this->getResultsTestOptions($selectedTestId),
                'resultsFilters' => array_merge(
                    $request->only(['search', 'sort']),
                    [
                        'test_id' => $selectedTestId,
                        'per_page' => $perPageFilter,
                    ]
                ),
            ]);
        }

        if ($section === 'statistic') {
            $perPageFilter = $this->resolvePerPageFilter($request);
            // ✅ OPTIMIZED: Use join instead of whereHas to avoid N+1 queries
            $statsTestsQuery = Test::query()
                ->select('tests.id', 'tests.title', 'tests.duration', 'tests.start_time', 'tests.end_time', 'tests.is_active', 'tests.created_at')
                ->distinct()
                ->latest('tests.created_at');

            if ($request->search) {
                $statsTestsQuery->where('tests.title', 'like', "%{$request->search}%");
            }

            if ($request->module_id) {
                $statsTestsQuery
                    ->join('test_topics', 'tests.id', '=', 'test_topics.test_id')
                    ->join('topics', 'test_topics.topic_id', '=', 'topics.id')
                    ->where('topics.module_id', $request->module_id);
            }

            if ($request->group_id) {
                $statsTestsQuery
                    ->join('group_test', 'tests.id', '=', 'group_test.test_id')
                    ->where('group_test.group_id', $request->group_id);
            }

            return inertia('Admin/Tests/Index', [
                'tests' => $statsTestsQuery
                    ->paginate($this->resolvePerPage($request, $statsTestsQuery))
                    ->appends(array_merge($request->query(), ['section' => 'statistic', 'per_page' => $perPageFilter])),
                'modules' => Module::select('id', 'name')->where('is_active', true)->orderBy('name')->get(),
                'groups' => Group::select('id', 'name')->orderBy('name')->get(),
                'topics' => [],
                'filters' => array_merge($request->only(['search', 'module_id', 'group_id']), ['per_page' => $perPageFilter]),
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
            'tests' => $query
                ->paginate($this->resolvePerPage($request, $query))
                ->appends(array_merge($request->query(), ['per_page' => $this->resolvePerPageFilter($request)])),

            // Data Dropdown
            'modules' => Module::select('id', 'name')->where('is_active', true)->orderBy('name')->get(),
            'groups' => Group::select('id', 'name')->orderBy('name')->get(),
            'topics' => Topic::with('module')->where('is_active', true)->get(),

            'filters' => array_merge($request->only(['search', 'module_id', 'group_id']), ['per_page' => $this->resolvePerPageFilter($request)]),
        ]);
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
     * Calculate stats for ALL test users (not paginated)
     * Used for dashboard summary cards
     */
    private function buildResultsQuery(Request $request, ?int $selectedTestId = null)
    {
        // OPTIMIZED: Use join instead of whereHas to avoid N+1 queries
        $query = TestUser::query()
            ->select('test_users.*', 'users.npm as sort_npm')
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

        ScoringService::selectFinalScore($query);

        $sort = (string) $request->input('sort', 'started_at');
        switch ($sort) {
            case 'npm_asc':
                $query->orderBy('sort_npm', 'asc')
                    ->orderBy('test_users.id');
                break;
            case 'oldest':
                $query->orderBy('test_users.started_at')
                    ->orderBy('test_users.id');
                break;
            case 'submitted':
                $query->orderByDesc('test_users.finished_at')
                    ->orderByDesc('test_users.started_at')
                    ->orderBy('test_users.id');
                break;
            case 'score_asc':
                ScoringService::orderByFinalScore($query, 'asc');
                break;
            case 'score_desc':
                ScoringService::orderByFinalScore($query, 'desc');
                break;
            case 'latest':
            case 'started_at':
            default:
                $query->orderByDesc('test_users.started_at')
                    ->orderBy('test_users.id');
                break;
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
                ->first();

            $total = (int) ($stats->total ?? 0);
            $completed = (int) ($stats->completed ?? 0);

            $testUsers = TestUser::with('test')
                ->select('test_users.*')
                ->join('users', 'test_users.user_id', '=', 'users.id')
                ->leftJoin('results', 'results.test_user_id', '=', 'test_users.id');

            if ($selectedTestId) {
                $testUsers->where('test_users.test_id', $selectedTestId);
            } elseif ($request->filled('test_id')) {
                $testUsers->where('test_users.test_id', (int) $request->input('test_id'));
            }

            if ($request->filled('search')) {
                $search = trim((string) $request->input('search'));
                $testUsers->where(function ($q) use ($search) {
                    $q->where('users.name', 'like', "%{$search}%")
                        ->orWhere('users.npm', 'like', "%{$search}%");
                });
            }

            $scores = $testUsers->distinct('test_users.id')->get()->map(fn (TestUser $testUser) => ScoringService::calculate($testUser));

            return [
                'total' => $total,
                'completed' => $completed,
                'pending' => max(0, $total - $completed),
                'avgScore' => number_format((float) ($scores->avg() ?? 0), 2, '.', ''),
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

        DB::transaction(function () use ($data, $test) {
            $test->update([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'duration' => $data['duration'],
                'start_time' => $data['start_time'],
                'end_time' => $data['end_time'],
                'is_active' => $data['is_active'] ?? $test->is_active,
                'results_to_users' => $data['results_to_users'] ?? $test->results_to_users,
                'require_seb' => array_key_exists('require_seb', $data) ? $data['require_seb'] : true,
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

                $maxIndex = max(0, collect($data['topics'])->sum(fn($topic) => (int) $topic['total_questions']) - 1);
                TestUser::where('test_id', $test->id)
                    ->whereIn('status', ['ongoing', 'not_started'])
                    ->where('current_index', '>', $maxIndex)
                    ->update([
                        'current_index' => $maxIndex,
                        'last_question_id' => null,
                    ]);
            }
        });

        QuestionGeneratorService::clearForTest($test->id);
        QuestionCacheService::invalidateTest($test->id);
        Cache::forget("statistics:test:summary:{$test->id}");

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
