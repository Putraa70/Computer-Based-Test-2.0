import React from 'react';
import { router } from '@inertiajs/react';

export default function SubmitModal({ isOpen, onClose, testUserId, answeredCount = 0, totalQuestions = 0, onSubmit, isSubmitting = false }) {
    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (isSubmitting) {
            return;
        }

        if (typeof onSubmit === 'function') {
            await onSubmit();
            onClose();
            return;
        }

        router.post(route('peserta.tests.submit', testUserId), {}, {
            onFinish: () => onClose(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={isSubmitting ? undefined : onClose} />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
                <h3 className="text-xl font-bold mb-2">Kumpulkan Ujian?</h3>
                            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                Apakah Anda yakin untuk menyelesaikan ujian?
                            </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 rounded-xl text-white font-bold hover:opacity-90 transition-opacity shadow-lg
                            bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"

                        >
                            {isSubmitting ? 'Mengirim...' : 'Ya, Kumpulkan'}
                        </button>
                    </div>
                </div>
            </div>

    );
}
