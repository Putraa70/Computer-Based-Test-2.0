import React from 'react';

export default function ExamStatusBadge({ status }) {
    const config = {
        SELESAI:     { color: 'bg-green-500', text: 'text-green-700', label: 'Selesai' },
        KADALUARSA:  { color: 'bg-red-500', text: 'text-red-700', label: 'Berakhir' },
        BELUM_MULAI: { color: 'bg-gray-400', text: 'text-gray-600', label: 'Belum Mulai' },
        LANJUTKAN:   { color: 'bg-blue-500', text: 'text-blue-700', label: 'Sedang Berjalan' },
        KERJAKAN:    { color: 'bg-emerald-500', text: 'text-emerald-700', label: 'Tersedia' }
    };

    const current = config[status] || config.KERJAKAN;

    return (
        <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${current.color}`}></span>
            <span className={`text-xs font-semibold ${current.text}`}>{current.label}</span>
        </div>
    );
}