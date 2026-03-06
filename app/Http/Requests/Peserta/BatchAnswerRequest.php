<?php

namespace App\Http\Requests\Peserta;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BatchAnswerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'peserta' && $this->user()?->is_active;
    }

    public function rules(): array
    {
        return [
            'answers' => 'required|array|min:1|max:100',
            'answers.*.answerId' => [
                'nullable',
                'integer',
                Rule::exists('answers', 'id'),
            ],
            'answers.*.answerText' => 'nullable|string|max:10000',
        ];
    }

    protected function prepareForValidation()
    {
        // Map question IDs from keys if needed
        if ($this->has('answers') && is_array($this->answers)) {
            $answers = [];
            foreach ($this->answers as $questionId => $answer) {
                if (is_array($answer)) {
                    $answers[$questionId] = $answer;
                }
            }
            $this->merge(['answers' => $answers]);
        }
    }
}
