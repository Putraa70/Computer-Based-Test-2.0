<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;
use Inertia\Inertia;

class Handler extends ExceptionHandler
{
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    public function render($request, Throwable $e)
    {
        if ($request->expectsJson()) {
            return parent::render($request, $e);
        }

        $response = parent::render($request, $e);
        $status = $response->getStatusCode();

        // Centralized web error page for production CBT.
        $renderableStatuses = [403, 404, 405, 419, 429, 500, 503];

        if (in_array($status, $renderableStatuses, true)) {
            return Inertia::render('Errors/DynamicError', [
                'status' => $status,
            ])->toResponse($request)->setStatusCode($status);
        }

        return $response;
    }
}
