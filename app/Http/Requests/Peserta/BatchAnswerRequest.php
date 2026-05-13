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

    /**
     * Prepare data and validate question ownership
     * ✅ P1: Added question validation to prevent cross-exam answer injection
     */
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

    /**
     * Custom validation after basic rules pass
     * ✅ P1: Validate that all question IDs belong to the exam
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Get the test user from route
            $testUser = $this->route('testUser');
            if (!$testUser) {
                return;
            }

            // Get all question IDs from the test
            $validQuestionIds = $testUser->test
                ->topics
                ->flatMap(function ($topic) {
                    return $topic->questions->pluck('id');
                })
                ->toArray();

            // Check each answer's question_id
            $answers = $this->answers ?? [];
            foreach ($answers as $questionId => $answer) {
                if (!in_array($questionId, $validQuestionIds)) {
                    $validator->errors()->add(
                        'answers',
                        "Question ID $questionId does not belong to this exam."
                    );
                }
            }
        });
    }
}

