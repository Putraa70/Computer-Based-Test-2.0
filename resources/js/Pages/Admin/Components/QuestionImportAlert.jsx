import React, { useState, useEffect } from "react";
import { 
    CheckCircleIcon, 
    ExclamationCircleIcon, 
    XCircleIcon, 
    XMarkIcon 
} from "@heroicons/react/24/outline";

export default function QuestionImportAlert({ flash }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (flash.success || flash.warning || flash.error) {
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 3000); // 3 Detik
            return () => clearTimeout(timer);
        }
    }, [flash]);

    if (!visible) return null;

    return (
        <div className="mb-8 space-y-4 relative animate-fade-in-down">
            {/* SUCCESS */}
            {flash.success && (
                <div className="relative rounded-lg bg-emerald-50 p-4 border border-emerald-200 shadow-sm">
                    <div className="flex">
                        <CheckCircleIcon className="h-5 w-5 text-emerald-400 shrink-0" />
                        <div className="ml-3 pr-8">
                            <h3 className="text-sm font-bold text-emerald-800">Import Soal Berhasil</h3>
                            <div className="mt-1 text-sm text-emerald-700 whitespace-pre-line">{flash.success}</div>
                        </div>
                        <button onClick={() => setVisible(false)} className="absolute top-4 right-4 text-emerald-500 hover:text-emerald-700"><XMarkIcon className="w-5 h-5" /></button>
                    </div>
                </div>
            )}
            
            {/* WARNING */}
            {flash.warning && (
                <div className="relative rounded-lg bg-amber-50 p-4 border border-amber-200 shadow-sm">
                    <div className="flex">
                        <ExclamationCircleIcon className="h-5 w-5 text-amber-500 shrink-0" />
                        <div className="ml-3 pr-8">
                            <h3 className="text-sm font-bold text-amber-800">Perhatian</h3>
                            <div className="mt-1 text-sm text-amber-700 whitespace-pre-line">{flash.warning}</div>
                        </div>
                        <button onClick={() => setVisible(false)} className="absolute top-4 right-4 text-amber-500 hover:text-amber-700"><XMarkIcon className="w-5 h-5" /></button>
                    </div>
                </div>
            )}
            
            {/* ERROR */}
            {flash.error && (
                <div className="relative rounded-lg bg-red-50 p-4 border border-red-200 shadow-sm">
                    <div className="flex">
                        <XCircleIcon className="h-5 w-5 text-red-400 shrink-0" />
                        <div className="ml-3 pr-8">
                            <h3 className="text-sm font-bold text-red-800">Gagal Mengimport Soal</h3>
                            <div className="mt-1 text-sm text-red-700 whitespace-pre-line">{flash.error}</div>
                        </div>
                        <button onClick={() => setVisible(false)} className="absolute top-4 right-4 text-red-500 hover:text-red-700"><XMarkIcon className="w-5 h-5" /></button>
                    </div>
                </div>
            )}
        </div>
    );
}