<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'duration' => 'required|integer|min:1',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'is_active' => 'nullable|boolean',
            'require_seb' => 'nullable|boolean',

            'groups' => 'required|array|min:1',
            'groups.*' => 'exists:groups,id',

            'topics' => 'required|array|min:1',
            'topics.*.id' => 'required|exists:topics,id',
            'topics.*.total_questions' => 'required|integer|min:1',
            'topics.*.question_type' => 'nullable|string',

            'results_to_users' => 'nullable|boolean',
        ];
    }
    public function messages(): array
    {
        return [
            'end_time.after' => 'Waktu selesai harus sesudah waktu mulai.',
            'groups.required' => 'Pilih minimal satu angkatan/grup.',
            'topics.required' => 'Pilih minimal satu topik ujian.',
        ];
    }
}
