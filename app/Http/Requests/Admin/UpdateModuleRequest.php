<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateModuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255|unique:modules,name,' . $this->module->id,
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ];
    }
}
