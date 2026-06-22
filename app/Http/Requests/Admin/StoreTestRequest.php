<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Validation\ValidationException;
use App\Models\Question;
use Carbon\Carbon;

class StoreTestRequest extends FormRequest {
    /**
     * pastikan hanya admin yang bisa mengakses request ini
     */
    public function authorize(): bool {
        return $this->user() && $this->user()->role === 'admin';
    }

    protected function failedValidation(Validator $validator) {
        // redirect ke 'admin.tests.index' membawa error & input lama
        throw new ValidationException(
            $validator,
            redirect()->route('admin.tests.index')
                ->withErrors($validator)
                ->withInput()
        );
    }

    public function rules(): array {
        return [
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'duration'    => [
                'required',
                'integer',
                'min:1',
                function ($attribute, $value, $fail) {
                    $start = $this->input('start_time');
                    $end = $this->input('end_time');

                    if ($start && $end) {
                        $startTime = Carbon::parse($start);
                        $endTime = Carbon::parse($end);
                        $diffInMinutes = $startTime->diffInMinutes($endTime);

                        if ($value > $diffInMinutes) {
                            $fail("Durasi Ujian ($value menit) tidak boleh melebihi rentang waktu ujian yang tersedia ($diffInMinutes menit).");
                        }
                    }
                }
            ],

            'start_time'  => 'required|date',
            'end_time'    => 'required|date|after:start_time',
            'is_active'   => 'nullable|boolean',
            'require_seb' => 'nullable|boolean',

            'groups'   => 'required|array|min:1',
            'groups.*' => 'exists:groups,id',

            'topics' => 'required|array|min:1',
            'topics.*.id' => 'required|exists:topics,id',

            // validasi tipe soal yang diizinkan
            'topics.*.question_type' => [
                'nullable',
                'string',
                Rule::in(['multiple_choice', 'essay', 'short_answer', 'mixed'])
            ],

            // validasi jumlah soal berdasarkan stok yang tersedia di database
            'topics.*.total_questions' => [
                'required',
                'integer',
                'min:1',
                function ($attribute, $value, $fail) {
                    $index = explode('.', $attribute)[1];
                    $topicId = $this->input("topics.{$index}.id");
                    $type    = $this->input("topics.{$index}.question_type");

                    // hitung jumlah soal aktif yang tersedia untuk topik dan tipe tertentu
                    $query = Question::where('topic_id', $topicId)->where('is_active', true);
                    if ($type && $type !== 'mixed') {
                        $query->where('type', $type);
                    }
                    $availableCount = $query->count();

                    // tolak jika permintaan melebihi stok yang tersedia
                    if ($value > $availableCount) {
                        $fail("Stok kurang. Topik ini hanya punya {$availableCount} soal aktif.");
                    }
                },
            ],
        ];
    }

    public function messages(): array {
        return [
            'end_time.after' => 'Waktu selesai harus sesudah waktu mulai.',
            'groups.required' => 'Wajib memilih minimal satu grup peserta.',
            'topics.required' => 'Wajib memilih minimal satu topik/modul.',
        ];
    }

    // konversi nilai is_active dan require_seb menjadi boolean sebelum validasi
    protected function prepareForValidation() {
        $this->merge([
            'is_active' => $this->boolean('is_active'),
            'require_seb' => $this->boolean('require_seb'),
        ]);
    }
}
