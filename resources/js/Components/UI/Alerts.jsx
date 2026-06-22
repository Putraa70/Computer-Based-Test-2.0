import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { usePage } from '@inertiajs/react';

export default function Alerts({ errors = {} }) {
    const { flash } = usePage().props;
    
    // Cek apakah ada error validasi atau flash error
    const hasErrors = Object.keys(errors).length > 0;
    const hasFlashError = flash?.error;

    if (!hasErrors && !hasFlashError) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 shadow-sm flex items-start gap-3"
            >
                <div className="p-2 bg-red-100 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                
                <div className="flex-1 pt-1">
                    <h4 className="text-sm font-bold text-red-800 mb-1">
                        Terjadi Kesalahan:
                    </h4>
                    <ul className="text-xs text-red-600 font-medium list-disc list-inside space-y-0.5 opacity-90">
                        {/* Menampilkan pesan flash error (seperti jadwal bentrok) */}
                        {hasFlashError && <li>{flash.error}</li>}
                        
                        {/* Menampilkan semua error validasi form */}
                        {Object.values(errors).map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                    </ul>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}