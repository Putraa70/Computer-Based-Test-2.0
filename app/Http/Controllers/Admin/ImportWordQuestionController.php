<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Answer;
use App\Models\Module;
use App\Models\Question;
use App\Models\Topic;
use App\Services\WordQuestionImportParser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ImportWordQuestionController extends Controller
{
    public function create(Request $request)
    {
        $moduleId = $request->input('module_id');

        $topics = [];
        if ($moduleId) {
            $topics = Topic::select('id', 'name', 'module_id')
                ->where('module_id', $moduleId)
                ->where('is_active', true)
                ->orderBy('name')
                ->get();
        }

        return inertia('Admin/Modules/ImportWord', [
            'modules' => Module::select('id', 'name')->orderBy('name')->get(),
            'topics' => $topics,
            'filters' => ['module_id' => $moduleId],
            'section' => 'import-word',
        ]);
    }

    public function preview(Request $request, WordQuestionImportParser $parser)
    {
        $validated = $request->validate([
            'module_id' => 'required|exists:modules,id',
            'topic_id' => 'required|exists:topics,id',
            'content' => 'required|string',
        ], $this->messages());

        $this->validateTopicBelongsToModule((int) $validated['topic_id'], (int) $validated['module_id']);

        $result = $parser->parse($validated['content']);

        return response()->json($result);
    }

    public function store(Request $request, WordQuestionImportParser $parser)
    {
        $validated = $request->validate([
            'module_id' => 'required|exists:modules,id',
            'topic_id' => 'required|exists:topics,id',
            'content' => 'nullable|string',
            'questions' => 'nullable|string',
        ], $this->messages());

        $this->validateTopicBelongsToModule((int) $validated['topic_id'], (int) $validated['module_id']);
        $this->validateUploadedImages($request);

        if ($request->filled('questions')) {
            $result = $this->decodeEditedQuestions($request->input('questions'));
        } else {
            $request->validate([
                'content' => 'required|string',
            ], $this->messages());

            $result = $parser->parse($validated['content']);
        }

        if (!empty($result['errors'])) {
            return response()->json([
                'message' => 'Import dibatalkan. Perbaiki error pada preview terlebih dahulu.',
                'errors' => $result['errors'],
                'questions' => $result['questions'],
            ], 422);
        }

        DB::beginTransaction();
        try {
            foreach ($result['questions'] as $questionIndex => $item) {
                $questionImagePath = null;
                if ($request->hasFile("question_image_{$questionIndex}")) {
                    $questionImagePath = $request->file("question_image_{$questionIndex}")->store('questions', 'public');
                }

                $question = Question::create([
                    'topic_id' => $validated['topic_id'],
                    'type' => 'multiple_choice',
                    'question_text' => $item['question_html'],
                    'question_image' => $questionImagePath,
                    'score' => 1,
                    'is_active' => true,
                ]);

                foreach ($item['options'] as $optionIndex => $option) {
                    $answerImagePath = null;
                    if ($request->hasFile("option_image_{$questionIndex}_{$optionIndex}")) {
                        $answerImagePath = $request->file("option_image_{$questionIndex}_{$optionIndex}")->store('answers', 'public');
                    }

                    Answer::create([
                        'question_id' => $question->id,
                        'answer_text' => $option['html'],
                        'answer_image' => $answerImagePath,
                        'is_correct' => $option['is_correct'],
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Berhasil mengimport ' . count($result['questions']) . ' soal dari Word.',
                'redirect' => route('admin.modules.index', [
                    'section' => 'questions',
                    'module_id' => $validated['module_id'],
                    'topic_id' => $validated['topic_id'],
                ]),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Import soal Word gagal: ' . $e->getMessage(), [
                'topic_id' => $validated['topic_id'],
            ]);

            return response()->json([
                'message' => 'Gagal import: ' . $e->getMessage(),
                'errors' => ['Gagal import: ' . $e->getMessage()],
            ], 500);
        }
    }

    private function decodeEditedQuestions(string $payload): array
    {
        $questions = json_decode($payload, true);

        if (!is_array($questions)) {
            return [
                'questions' => [],
                'errors' => ['Data preview tidak valid. Klik Preview ulang.'],
            ];
        }

        $normalized = [];
        $errors = [];

        foreach ($questions as $index => $question) {
            $number = (int) ($question['number'] ?? ($index + 1));
            $questionHtml = $this->sanitizeImportedHtml($question['question_html'] ?? '');
            $options = is_array($question['options'] ?? null) ? $question['options'] : [];

            if (trim(strip_tags($questionHtml)) === '') {
                $errors[] = "Soal {$number}: teks soal tidak boleh kosong.";
            }

            if (count($options) < 2) {
                $errors[] = "Soal {$number}: minimal 2 pilihan jawaban.";
            }

            if (count($options) > 10) {
                $errors[] = "Soal {$number}: maksimal 10 pilihan jawaban.";
            }

            $normalizedOptions = [];
            $correctCount = 0;

            foreach ($options as $optionIndex => $option) {
                $label = strtoupper($option['label'] ?? chr(65 + $optionIndex));
                $html = $this->sanitizeImportedHtml($option['html'] ?? '');
                $isCorrect = filter_var($option['is_correct'] ?? false, FILTER_VALIDATE_BOOL);

                if (trim(strip_tags($html)) === '') {
                    $errors[] = "Soal {$number}: pilihan {$label} tidak boleh kosong.";
                }

                if ($isCorrect) {
                    $correctCount++;
                }

                $normalizedOptions[] = [
                    'label' => $label,
                    'html' => $html,
                    'text' => trim(strip_tags($html)),
                    'is_bold' => false,
                    'is_correct' => $isCorrect,
                ];
            }

            if ($correctCount !== 1) {
                $errors[] = "Soal {$number}: harus ada tepat satu jawaban benar.";
            }

            $normalized[] = [
                'number' => $number,
                'question_html' => $questionHtml,
                'question_text' => trim(strip_tags($questionHtml)),
                'options' => $normalizedOptions,
                'answer_key' => null,
            ];
        }

        return [
            'questions' => $normalized,
            'errors' => $errors,
        ];
    }

    private function sanitizeImportedHtml(string $html): string
    {
        $html = preg_replace('/<\s*(script|style)[^>]*>.*?<\s*\/\s*\1\s*>/is', '', $html);
        $html = preg_replace('/\son\w+\s*=\s*(".*?"|\'.*?\'|[^\s>]+)/i', '', $html);
        $html = preg_replace('/\s(href|src)\s*=\s*("|\')\s*javascript:.*?\2/i', '', $html);

        return trim($html);
    }

    private function validateTopicBelongsToModule(int $topicId, int $moduleId): void
    {
        $exists = Topic::where('id', $topicId)
            ->where('module_id', $moduleId)
            ->exists();

        if (!$exists) {
            throw ValidationException::withMessages([
                'topic_id' => 'Topik tidak sesuai dengan modul yang dipilih.',
            ]);
        }
    }

    private function validateUploadedImages(Request $request): void
    {
        $rules = [];

        foreach ($request->files->keys() as $key) {
            if (preg_match('/^(question_image_\d+|option_image_\d+_\d+)$/', $key)) {
                $rules[$key] = 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120';
            }
        }

        if (empty($rules)) {
            return;
        }

        Validator::make($request->allFiles(), $rules, [
            '*.image' => 'File harus berupa gambar.',
            '*.mimes' => 'Format gambar harus jpg, jpeg, png, atau webp.',
            '*.max' => 'Ukuran gambar maksimal 5MB.',
        ])->validate();
    }

    private function messages(): array
    {
        return [
            'module_id.required' => 'Anda wajib memilih Modul.',
            'module_id.exists' => 'Modul yang dipilih tidak valid.',
            'topic_id.required' => 'Anda wajib memilih Topik.',
            'topic_id.exists' => 'Topik yang dipilih tidak valid.',
            'content.required' => 'Konten soal dari Word tidak boleh kosong.',
        ];
    }
}
