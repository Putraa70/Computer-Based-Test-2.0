import React, { useState, useEffect } from "react";
import { 
    CheckCircleIcon, 
    ExclamationCircleIcon, 
    XCircleIcon, 
    XMarkIcon 
} from "@heroicons/react/24/outline";

export default function ImportAlert({ flash }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Jika ada pesan baru (sukses/warning/error), tampilkan alert
        if (flash.success || flash.warning || flash.error) {
            setVisible(true);

            // Timer: Hilang otomatis setelah 3 detik (3000ms)
            const timer = setTimeout(() => {
                setVisible(false);
            }, 3000);

            // Bersihkan timer jika komponen di-unmount atau pesan berubah
            return () => clearTimeout(timer);
        }
    }, [flash]);

    if (!visible) return null;

    return (
        <div className="mb-8 space-y-4 relative animate-fade-in-down">
            
            {/* --- SUKSES (HIJAU) --- */}
            {flash.success && (
                <div className="relative rounded-lg bg-emerald-50 p-4 border border-emerald-200 shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <CheckCircleIcon className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3 pr-8">
                            <h3 className="text-sm font-bold text-emerald-800">Import Berhasil</h3>
                            <div className="mt-1 text-sm text-emerald-700">{flash.success}</div>
                        </div>
                        {/* Tombol Close */}
                        <button 
                            onClick={() => setVisible(false)} 
                            className="absolute top-4 right-4 text-emerald-500 hover:text-emerald-700"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* --- WARNING / DUPLIKAT (KUNING) --- */}
            {flash.warning && (
                <div className="relative rounded-lg bg-amber-50 p-4 border border-amber-200 shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <ExclamationCircleIcon className="h-5 w-5 text-amber-500" aria-hidden="true" />
                        </div>
                        <div className="ml-3 pr-8">
                            <h3 className="text-sm font-bold text-amber-800">Perhatian</h3>
                            <div className="mt-1 text-sm text-amber-700 leading-relaxed">
                                {flash.warning}
                            </div>
                        </div>
                        <button 
                            onClick={() => setVisible(false)} 
                            className="absolute top-4 right-4 text-amber-500 hover:text-amber-700"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* --- ERROR (MERAH) --- */}
            {flash.error && (
                <div className="relative rounded-lg bg-red-50 p-4 border border-red-200 shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3 pr-8">
                            <h3 className="text-sm font-bold text-red-800">Gagal Mengimport</h3>
                            <div className="mt-1 text-sm text-red-700">{flash.error}</div>
                        </div>
                        <button 
                            onClick={() => setVisible(false)} 
                            className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}