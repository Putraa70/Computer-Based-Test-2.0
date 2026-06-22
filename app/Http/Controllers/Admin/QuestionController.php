<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\Answer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class QuestionController extends Controller
{
    public function store(Request $request)
    {
        // 1. Validasi
        $validated = $request->validate([
            'topic_id'      => 'required|exists:topics,id',
            'type'          => 'required|in:essay,multiple_choice,short_answer,true_false',
            'question_text' => 'nullable|string', // Boleh null jika ada gambar

            // Validasi Gambar Soal (Max 5MB)
            'question_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',

            'options'              => 'nullable|array',

            // Validasi Text Jawaban (Boleh null jika ada gambar)
            'options.*.text'       => 'nullable|string',
            'options.*.is_correct' => 'boolean',

            // Validasi Gambar Jawaban (Max 5MB)
            'options.*.image'      => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        DB::transaction(function () use ($validated, $request) {

            // 2. Upload Gambar Soal (Jika ada)
            $qImagePath = null;
            if ($request->hasFile('question_image')) {
                $qImagePath = $request->file('question_image')->store('questions', 'public');
            }

            // 3. Simpan Soal
            $question = Question::create([
                'topic_id'       => $validated['topic_id'],
                'type'           => $validated['type'],
                'question_text'  => $validated['question_text'],
                'question_image' => $qImagePath,
                'is_active'      => true,
            ]);

            // 4. Logic Khusus Pilihan Ganda
            if ($validated['type'] === 'multiple_choice') {

                $options = $validated['options'] ?? [];

                // Cek minimal 2 opsi
                if (count($options) < 2) {
                    abort(422, 'Multiple choice harus memiliki minimal 2 opsi jawaban.');
                }

                // Cek harus ada 1 kunci jawaban
                $hasCorrect = collect($options)->contains(fn($o) => !empty($o['is_correct']));
                if (!$hasCorrect) {
                    abort(422, 'Pilih salah satu jawaban yang benar.');
                }

                // Loop simpan jawaban + gambar
                foreach ($options as $index => $opt) {

                    $ansImagePath = null;

                    // Upload Gambar Jawaban (Cek berdasarkan index array)
                    // Frontend mengirim: options[0][image], options[1][image]
                    if ($request->hasFile("options.$index.image")) {
                        $ansImagePath = $request->file("options.$index.image")->store('answers', 'public');
                    }

                    Answer::create([
                        'question_id'  => $question->id,
                        'answer_text'  => $opt['text'] ?? null,
                        'answer_image' => $ansImagePath, // Simpan path gambar jawaban
                        'is_correct'   => $opt['is_correct'] ?? false,
                    ]);
                }
            }
        });

        return redirect()
            ->back()
            ->with('success', 'Soal berhasil ditambahkan');
    }

    public function update(Request $request, Question $question)
    {
        $validated = $request->validate([
            'topic_id'      => 'required|exists:topics,id',
            'type'          => 'required|in:essay,multiple_choice,short_answer,true_false',
            'question_text' => 'nullable|string',
            'question_image' => 'nullable|image|max:5120',

            'options'              => 'nullable|array',
            'options.*.text'       => 'nullable|string',
            'options.*.is_correct' => 'boolean',
            'options.*.image'      => 'nullable|image|max:5120',
        ]);

        DB::transaction(function () use ($validated, $request, $question) {

            // 1. Update Gambar Soal
            if ($request->hasFile('question_image')) {
                // Hapus gambar lama
                if ($question->question_image && Storage::disk('public')->exists($question->question_image)) {
                    Storage::disk('public')->delete($question->question_image);
                }
                $question->question_image = $request->file('question_image')->store('questions', 'public');
            }

            // 2. Update Data Soal
            $question->update([
                'topic_id'      => $validated['topic_id'],
                'type'          => $validated['type'],
                'question_text' => $validated['question_text'],
                // question_image sudah dihandle di atas
            ]);

            // 3. Update Jawaban (Strategy: Hapus Semua Lama -> Buat Baru)

            // Hapus gambar jawaban lama dari storage dulu agar bersih
            foreach ($question->answers as $oldAns) {
                if ($oldAns->answer_image && Storage::disk('public')->exists($oldAns->answer_image)) {
                    Storage::disk('public')->delete($oldAns->answer_image);
                }
            }
            // Hapus record jawaban dari DB
            $question->answers()->delete();

            // 4. Buat Ulang Jawaban Baru
            if ($validated['type'] === 'multiple_choice') {
                $options = $validated['options'] ?? [];

                if (count($options) < 2) abort(422, 'Minimal 2 opsi.');
                if (!collect($options)->contains(fn($o) => !empty($o['is_correct']))) {
                    abort(422, 'Pilih kunci jawaban.');
                }

                foreach ($options as $index => $opt) {
                    $ansImagePath = null;

                    // Cek upload gambar jawaban baru
                    if ($request->hasFile("options.$index.image")) {
                        $ansImagePath = $request->file("options.$index.image")->store('answers', 'public');
                    }

                    Answer::create([
                        'question_id'  => $question->id,
                        'answer_text'  => $opt['text'] ?? null,
                        'answer_image' => $ansImagePath,
                        'is_correct'   => $opt['is_correct'] ?? false,
                    ]);
                }
            }
        });

        return redirect()
            ->back()
            ->with('success', 'Soal berhasil diperbarui');
    }

    public function destroy(Question $question)
    {
        DB::transaction(function () use ($question) {

            // 1. Hapus Gambar Soal
            if ($question->question_image && Storage::disk('public')->exists($question->question_image)) {
                Storage::disk('public')->delete($question->question_image);
            }

            // 2. Hapus Gambar Jawaban
            foreach ($question->answers as $ans) {
                if ($ans->answer_image && Storage::disk('public')->exists($ans->answer_image)) {
                    Storage::disk('public')->delete($ans->answer_image);
                }
            }

            // 3. Hapus Data
            $question->answers()->delete(); // Hapus jawaban dulu (jika cascade tidak jalan)
            $question->delete();
        });

        return redirect()
            ->route('admin.modules.index', ['section' => 'questions'])
            ->with('success', 'Soal berhasil dihapus');
    }

    /**
     * Bulk delete questions
     */
    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:questions,id'
        ]);

        $count = 0;

        DB::transaction(function () use ($request, &$count) {
            $questions = Question::with('answers')->whereIn('id', $request->ids)->get();

            foreach ($questions as $question) {
                // 1. Hapus Gambar Soal
                if ($question->question_image && Storage::disk('public')->exists($question->question_image)) {
                    Storage::disk('public')->delete($question->question_image);
                }

                // 2. Hapus Gambar Jawaban
                foreach ($question->answers as $ans) {
                    if ($ans->answer_image && Storage::disk('public')->exists($ans->answer_image)) {
                        Storage::disk('public')->delete($ans->answer_image);
                    }
                }

                // 3. Hapus Data
                $question->answers()->delete();
                $question->delete();
                $count++;
            }
        });

        return back()->with('success', "{$count} soal berhasil dihapus beserta jawabannya.");
    }
}
