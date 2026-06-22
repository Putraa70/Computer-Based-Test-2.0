<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Inertia\Inertia;
use Illuminate\Support\Facades\Route;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'login' => ['required', 'string'],
            'password' => ['required', 'string'],
        ];
    }
    protected function failedValidation(Validator $validator): void 
        {
            throw new HttpResponseException(
                Inertia::render('Auth/Login', [
                    'canResetPassword' => Route::has('password.request'),
                    'status' => session('status'),
                    'errors' => $validator->errors()->toArray()
                ]) -> toResponse($this)
            );
        }

    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $login = $this->input('login');

        $credentials = filter_var($login, FILTER_VALIDATE_EMAIL)
            ? ['email' => $login, 'password' => $this->password]
            : ['npm'   => $login, 'password' => $this->password];

        if (! Auth::attempt($credentials, $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey());

            $this->throwInertiaError([
                'login' => 'NPM/Email atau Password salah. Silakan periksa kembali.',
            ]);
        }

        RateLimiter::clear($this->throttleKey());
    }

    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        $this->throwInertiaError([
            'login' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    protected function throwInertiaError(array $errors): void
    {
        throw new HttpResponseException(
            Inertia::render('Auth/Login', [
                'canResetPassword' => Route::has('password.request'),
                'status' => session('status'),
                'errors' => $errors
            ])->toResponse($this)
        );
    }

    public function throttleKey(): string
    {
        return Str::transliterate(
            Str::lower($this->string('login')) . '|' . $this->ip()
        );
    }
}
