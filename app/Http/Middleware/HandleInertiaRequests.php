<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): string|null
    {
        return parent::version($request);
    }

    public function handle(Request $request, Closure $next)
    {
        // Jalankan mesin utama Inertia dulu (agar data shared terisi)
        $response = parent::handle($request, $next);

        // Tambahkan header anti-cache agar SEB tidak "freeze" state lama
        if (method_exists($response, 'header')) {
            $response->header('Cache-Control', 'no-cache, no-store, must-revalidate');
            $response->header('Pragma', 'no-cache');
            $response->header('Expires', '0');
        }

        return $response;
    }

    /**
     * Data yang dibagikan secara otomatis ke React
     */
    public function share(Request $request): array
    {
        return array_merge(parent::share($request), [
            'auth' => [
                // Gunakan optional agar tidak crash saat logout
                'user' => $request->user() ? $request->user() : null,
            ],
            // Menangkap pesan kilat (flash message)
            'flash' => [
                'success' => fn() => $request->session()->get('success'),
                'error'   => fn() => $request->session()->get('error'),
                'warning' => fn() => $request->session()->get('warning'),
            ],
            // Menangkap error validasi (Password salah, input kosong, dll)
            'errors' => function () use ($request) {
                return $request->session()->get('errors')
                    ? $request->session()->get('errors')->getBag('default')->getMessages()
                    : (object) [];
            },
        ]);
    }
}
