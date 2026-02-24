<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ImportUsersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                //  PERBAIKAN: Tambahkan 'txt' agar CSV yang terbaca sebagai text tidak error
                'mimes:xlsx,xls,csv,xml,txt',
                'max:10240', // Maksimal 10MB
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'File wajib diunggah.',
            // Update pesan error agar user tidak bingung
            'file.mimes'    => 'Format file harus berupa: .xlsx, .xls, .csv, atau .xml.',
            'file.max'      => 'Ukuran file maksimal 10MB.',
        ];
    }
}
