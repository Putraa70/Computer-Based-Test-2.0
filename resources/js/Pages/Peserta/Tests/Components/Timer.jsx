import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export default function Timer({ initialSeconds, onExpire }) {
    const [seconds, setSeconds] = useState(initialSeconds);

    //  PERBAIKAN UTAMA DI SINI
    // Fungsi ini mendeteksi jika 'initialSeconds' berubah (karena Admin menambah waktu)
    // Lalu memaksa state 'seconds' untuk update mengikuti waktu baru tersebut.
    useEffect(() => {
        setSeconds(initialSeconds);
    }, [initialSeconds]);

    // Logic Hitung Mundur (Tetap sama)
    useEffect(() => {
        if (seconds <= 0) {
            onExpire(); // Panggil fungsi selesai jika waktu habis
            return;
        }

        const interval = setInterval(() => {
            setSeconds(prev => Math.max(0, prev - 1)); // Pakai prev agar lebih akurat & tidak minus
        }, 1000);

        return () => clearInterval(interval);
    }, [seconds, onExpire]); // Dependency diperbaiki

    const format = (s) => {
        const h = Math.floor(s / 3600).toString().padStart(2, '0');
        const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return (
            <span className="tracking-widest">
                {h}<span className="animate-pulse">:</span>{m}<span className="animate-pulse">:</span>{sec}
            </span>
        );
    };

    const isCritical = seconds < 300; // Kurang dari 5 menit (Merah)
    const isWarning = seconds < 600 && seconds >= 300; // Kurang dari 10 menit (Kuning)

    return (
        <div className={`
            flex flex-col items-center justify-center w-full py-2 rounded-lg transition-colors border
            ${isCritical
                ? 'bg-red-50 text-red-600 border-red-100'
                : isWarning
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-100'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-100'
            }
        `}>
            <div className="flex items-center gap-2 mb-1">
                {isCritical ? <AlertTriangle className="w-4 h-4 animate-bounce" /> : <Clock className="w-4 h-4" />}
                <span className="text-xs font-semibold uppercase tracking-wider">Sisa Waktu</span>
            </div>
            <div className="text-3xl font-mono font-bold leading-none">
                {format(seconds)}
            </div>
        </div>
    );
}
