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

        if ($request->input('section') === 'analitics') {

            // 1. Ambil SEMUA ujian aktif
            $tests = Test::where('is_active', true)
                ->orderBy('created_at', 'desc')
                ->select('id', 'title', 'duration')
                ->get();

            // 2. Tentukan ujian mana yang dipilih
            $currentTestId = $request->input('test_id') ?? ($tests->first()->id ?? null);
            $participants = [];

            if ($currentTestId) {
                // Hitung total soal
                $testObj = Test::with('topics.questions')->find($currentTestId);
                $totalQuestions = 0;

                if ($testObj && $testObj->topics) {
                    foreach ($testObj->topics as $topic) {
                        $totalQuestions += $topic->questions()->where('is_active', true)->count();
                    }
                }

                if ($totalQuestions == 0 && $testObj) {
                    $totalQuestions = $testObj->questions()->count();
                }
                if ($totalQuestions == 0) $totalQuestions = 1;

                // Ambil peserta & hitung skor
                $participants = TestUser::with(['user', 'answers'])
                    ->where('test_id', $currentTestId)
                    ->latest('updated_at')
                    ->get()
                    ->map(function ($p) use ($totalQuestions) {
                        $answeredCount = $p->answers->count();
                        $correctCount = $p->answers->where('is_correct', 1)->count();
                        $rawScore = ($correctCount / $totalQuestions) * 100;
                        $score = number_format($rawScore, 2);

                        return [
                            'id' => $p->id,
                            'test_id' => $p->test_id,
                            'user' => $p->user,
                            'status' => $p->status,
                            'started_at' => $p->started_at,
                            'finished_at' => $p->finished_at,
                            'answered_count' => $answeredCount,
                            'score' => $score,
                        ];
                    });
            }

            return inertia('Admin/Tests/Index', [
                'tests' => $tests,
                'currentTestId' => (int)$currentTestId,
                'participants' => $participants,
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
            'tests' => $query->paginate(20)->withQueryString(),

            // Data Dropdown
            'modules' => Module::select('id', 'name')->where('is_active', true)->orderBy('name')->get(),
            'groups' => Group::select('id', 'name')->orderBy('name')->get(),
            'topics' => Topic::with('module')->where('is_active', true)->get(),

            //  DATA HASIL UJIAN (PAGINATION 200)
            'testUsers' => TestUser::with([
                'user:id,name,email,npm',
                'test:id,title,duration,description',
                'test.topics:id,name',
                'test.topics.questions:id,topic_id',
                'answers:id,test_user_id,question_id,answer_id,is_correct',
                'result:id,test_user_id,total_score,status',
                'locker:id,name'
            ])
                ->latest('started_at')
                ->paginate(200)
                ->through(function ($testUser) {
                    $questionsCount = 0;
                    if ($testUser->test && $testUser->test->topics) {
                        $questionsCount = $testUser->test->topics->sum(function ($topic) {
                            return $topic->questions ? $topic->questions->count() : 0;
                        });
                    }
                    $testUser->test->questions_count = $questionsCount;
                    return $testUser;
                }),

            'filters' => $request->only(['search', 'module_id', 'group_id']),
        ]);
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
