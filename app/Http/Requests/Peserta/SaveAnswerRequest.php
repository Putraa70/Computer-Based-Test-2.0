<?php

namespace App\Http\Requests\Peserta;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveAnswerRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Pastikan user aktif dan memiliki role peserta
        return $this->user()?->role === 'peserta' && $this->user()?->is_active;
    }

    public function rules(): array
    {
        return [
            'question_id' => 'required|exists:questions,id',

            // Validasi Answer ID (Untuk Pilihan Ganda)
            'answer_id' => [
                'nullable',
                //  SECURITY: Pastikan jawaban ini BENAR-BENAR milik soal tersebut
                // Mencegah siswa mengirim ID jawaban dari soal lain
                Rule::exists('answers', 'id')->where(function ($query) {
                    return $query->where('question_id', $this->question_id);
                }),
            ],

            // Validasi Essay (Batasi panjang karakter agar DB tidak error)
            'answer_text' => 'nullable|string|max:10000',
        ];
    }

    // Persiapkan data sebelum validasi (Opsional)
    protected function prepareForValidation()
    {
        // Hapus input berbahaya jika ada iseng yang mengirimnya
        $this->merge([
            'is_correct' => null,
            'score' => null,
        ]);
    }
}
