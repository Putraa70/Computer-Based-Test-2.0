<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ImportQuestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'topic_id' => 'required|exists:topics,id',
            'file'     => 'required|file|mimes:xlsx,xls,csv,txt|max:10240',
        ];
    }

    public function messages(): array
    {
        return [
            'topic_id.required' => 'Anda wajib memilih Topik/Modul tujuan.',
            'topic_id.exists'   => 'Topik yang dipilih tidak valid.',
            'file.required'     => 'File Excel/CSV wajib diunggah.',
            'file.mimes'        => 'Format file harus berupa: .xlsx, .xls, atau .csv',
            'file.max'          => 'Ukuran file maksimal 10MB.',
        ];
    }
}
