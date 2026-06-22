import React from "react";
import { Head, Link } from "@inertiajs/react";
import {
    AlertTriangle,
    ArrowLeft,
    Home,
    RefreshCw,
    Search,
    ShieldAlert,
    ServerCrash,
    Construction,
    Clock3,
    WifiOff,
    Ban,
} from "lucide-react";

const ERROR_MAP = {
    403: {
        title: "Akses Ditolak",
        description: "Anda tidak memiliki izin untuk membuka halaman ini.",
        icon: ShieldAlert,
        tone: "from-emerald-50 via-white to-emerald-100",
        accent: "text-emerald-600",
        dot: "bg-emerald-500",
        ring: "ring-emerald-200",
        badge: "403",
        actionHint: "Silakan kembali ke beranda atau hubungi pengawas.",
        allowRefresh: false,
    },
    404: {
        title: "Halaman Tidak Ditemukan",
        description: "Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.",
        icon: Search,
            tone: "from-emerald-50 via-white to-emerald-100",
            accent: "text-emerald-600",
            dot: "bg-emerald-500",
            ring: "ring-emerald-200",
        badge: "404",
        actionHint: "Silakan kembali ke beranda atau gunakan tombol kembali.",
        allowRefresh: false,
    },
    405: {
        title: "Akses Tidak Valid",
        description: "Permintaan yang Anda lakukan tidak diizinkan.",
        icon: Ban,
        tone: "from-emerald-50 via-white to-emerald-100",
        accent: "text-emerald-600",
        dot: "bg-emerald-500",
        ring: "ring-emerald-200",
        badge: "405",
        actionHint: "Kembali ke halaman sebelumnya atau beranda.",
        allowRefresh: false,
    },
    419: {
        title: "Sesi Berakhir",
        description: "Silakan login kembali.",
        icon: Clock3,
        tone: "from-emerald-50 via-white to-emerald-100",
        accent: "text-emerald-600",
        dot: "bg-emerald-500",
        ring: "ring-emerald-200",
        badge: "419",
        actionHint: "Sesi Anda sudah kadaluarsa. Silakan muat ulang atau login ulang.",
        allowRefresh: true,
    },
    429: {
        title: "Terlalu Banyak Permintaan",
        description: "Aktivitas terlalu cepat. Silakan tunggu sebentar lalu coba lagi.",
        icon: WifiOff,
        tone: "from-emerald-50 via-white to-emerald-100",
        accent: "text-emerald-600",
        dot: "bg-emerald-500",
        ring: "ring-emerald-200",
        badge: "429",
        actionHint: "Tunggu sebentar sebelum mencoba kembali.",
        allowRefresh: true,
    },
    500: {
        title: "Terjadi Kesalahan Server",
        description: "Sistem sedang mengalami gangguan.",
        icon: ServerCrash,
        tone: "from-emerald-50 via-white to-emerald-100",
        accent: "text-emerald-600",
        dot: "bg-emerald-500",
        ring: "ring-emerald-200",
        badge: "500",
        actionHint: "Coba muat ulang atau kembali ke beranda.",
        allowRefresh: true,
    },
    503: {
        title: "Layanan Tidak Tersedia",
        description: "Server sedang dalam pemeliharaan atau beban tinggi.",
        icon: Construction,
        tone: "from-emerald-50 via-white to-emerald-100",
        accent: "text-emerald-600",
        dot: "bg-emerald-500",
        ring: "ring-emerald-200",
        badge: "503",
        actionHint: "Silakan coba lagi beberapa saat kemudian.",
        allowRefresh: true,
    },
};

const DEFAULT_ERROR = {
    title: "Terjadi Kesalahan",
    description: "Sistem tidak dapat memproses permintaan saat ini.",
    icon: AlertTriangle,
    tone: "from-emerald-50 via-white to-emerald-100",
    accent: "text-emerald-600",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
    badge: "Error",
    actionHint: "Silakan kembali ke beranda atau muat ulang halaman.",
    allowRefresh: true,
};

const ACTIONS = {
    403: { primary: 'home', secondary: null },
    404: { primary: 'home', secondary: 'back' },
    405: { primary: 'back', secondary: 'home' },
    419: { primary: 'login', secondary: 'refresh' },
    429: { primary: 'refresh', secondary: 'back' },
    500: { primary: 'refresh', secondary: 'home' },
    503: { primary: 'refresh', secondary: 'home' },
};

function safeStatus(status) {
    const parsed = Number(status);
    return Number.isFinite(parsed) ? parsed : null;
}

function truncateText(value) {
    if (!value) return null;
    return String(value).replace(/<[^>]*>?/gm, "").trim();
}

export default function DynamicError({ status, message }) {
    const code = safeStatus(status);
    const config = (code && ERROR_MAP[code]) || DEFAULT_ERROR;
    const actions = (code && ACTIONS[code]) || { primary: 'home', secondary: 'back' };
    const Icon = config.icon;
    const rawDescription = truncateText(message);

    const shouldShowRefresh = config.allowRefresh;
    const description = rawDescription || config.description;
    const title = code ? `${code} · ${config.title}` : config.title;

    const handleBack = () => {
        if (window.history.length > 1) {
            window.history.back();
            return;
        }

        window.location.href = "/";
    };

    const handleDashboard = () => {
        window.location.href = "/";
    };

    const handleLogin = () => {
        window.location.href = "/login";
    };

    const renderButton = (kind) => {
        switch (kind) {
            case 'back':
                return (
                    <button
                        key="back"
                        type="button"
                        onClick={handleBack}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Kembali
                    </button>
                );
            case 'refresh':
                return (
                    <button
                        key="refresh"
                        type="button"
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                );
            case 'login':
                return (
                    <button
                        key="login"
                        type="button"
                        onClick={handleLogin}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
                    >
                        <Home className="h-4 w-4" />
                        Login Kembali
                    </button>
                );
            case 'home':
            default:
                return (
                    <button
                        key="home"
                        type="button"
                        onClick={handleDashboard}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
                    >
                        <Home className="h-4 w-4" />
                        Beranda
                    </button>
                );
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-emerald-950 text-slate-100">
            <Head title={title} />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_30%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_28%),radial-gradient(circle_at_bottom,rgba(6,95,70,0.18),transparent_35%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(6,78,59,0.54),rgba(6,95,70,0.86))]" />

            <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
                <div className={`w-full max-w-xl rounded-[1.75rem] border border-white/10 bg-white/95 text-slate-900 shadow-xl shadow-black/20 backdrop-blur-xl ${config.ring}`}>
                    <div className={`rounded-[1.75rem] p-6 sm:p-7 bg-gradient-to-br ${config.tone}`}>
                        <div className="flex flex-col gap-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-emerald-700 shadow-sm border border-white/80">
                                    <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                                    CBT Production Error
                                </div>
                                <div className="rounded-full bg-emerald-900/90 px-4 py-2 text-sm font-black text-white shadow-lg">
                                    {config.badge}
                                </div>
                            </div>

                            <div className="flex flex-col items-center text-center gap-4">
                                <div className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-lg shadow-emerald-100/80 ring-1 ring-white/70 ${config.accent}`}>
                                    <Icon className="h-12 w-12" />
                                </div>

                                <div className="space-y-2">
                                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                                        {config.title}
                                    </h1>
                                    <p className="mx-auto max-w-lg text-sm sm:text-base leading-7 text-slate-600">
                                        {description}
                                    </p>
                                </div>

                                <div className="max-w-lg rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                                    {config.actionHint}
                                </div>
                            </div>

                            <div className={`grid grid-cols-1 gap-3 ${actions.secondary ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
                                {renderButton(actions.primary)}
                                {actions.secondary
                                    ? (shouldShowRefresh && actions.primary !== 'refresh'
                                        ? renderButton('refresh')
                                        : renderButton(actions.secondary))
                                    : null}
                            </div>

                            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                                CBT FK UNILA @ 2026
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}