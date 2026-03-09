import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, CheckCircle } from 'lucide-react';
import Swal from 'sweetalert2';

export default function AnswerOptions({ question, selectedAnswer, testUserId, onAnswer, onFatalError }) {
    const [isSaving, setIsSaving] = useState(false);
    const NETWORK_TIMEOUT = 6000; // 6 detik untuk deteksi cepat offline/kabel terputus

    const buildErrorMessage = (error) => {
        const networkHint = "Gagal menyimpan jawaban. Periksa koneksi jaringan atau kabel LAN Anda, lalu coba lagi.";
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            return networkHint;
        }
        if (!error?.response || error?.code === "ERR_NETWORK" || error?.code === "ERR_CANCELED") {
            return networkHint;
        }
        return "Gagal menyimpan jawaban. Silakan coba lagi.";
    };

    const triggerFatalError = (error) => {
        const message = buildErrorMessage(error);
        onFatalError?.({ status: 503, message });
    };

    useEffect(() => {
        const handleOffline = () => {
            setIsSaving(false);
            triggerFatalError();
        };

        window.addEventListener('offline', handleOffline);
        return () => window.removeEventListener('offline', handleOffline);
    }, []);

    const saveAnswer = async (payload) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);

        try {
            await axios.post(route('peserta.tests.answer', testUserId), payload, {
                signal: controller.signal,
            });

            // ✅ Show success notification
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            });

        } finally {
            clearTimeout(timeoutId);
        }
    };

    // Logic Pilih Jawaban
    const handleSelect = async (answerId, answerText) => {
        if (isSaving || selectedAnswer?.answerId === answerId) return;

        const previousAnswer = selectedAnswer ? { ...selectedAnswer } : null;
        onAnswer({ answerId, answerText });

        setIsSaving(true);
        try {
            await saveAnswer({
                question_id: question.id,
                answer_id: answerId,
            });
        } catch (error) {
            console.error("Gagal menyimpan jawaban", error);
            onAnswer(previousAnswer || null);
            triggerFatalError(error);
        } finally {
            setIsSaving(false);
        }
    };

    // Logic Batal Jawab
    const handleClear = async () => {
        if (isSaving || !selectedAnswer?.answerId) return;

        const previousAnswer = selectedAnswer ? { ...selectedAnswer } : null;
        onAnswer(null);

        setIsSaving(true);
        try {
            await saveAnswer({
                question_id: question.id,
                answer_id: null,
                answer_text: null
            });
        } catch (error) {
            console.error("Gagal menghapus jawaban", error);
            onAnswer(previousAnswer || null);
            triggerFatalError(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-3">
            {/* Loop Jawaban */}
            {question.answers.map((option) => {
                const isSelected = selectedAnswer?.answerId === option.id;

                return (
                    <button
                        key={option.id}
                        onClick={() => handleSelect(option.id, option.answer_text)}
                        disabled={isSaving}
                        className={`
                            w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-4 group relative overflow-hidden
                            ${isSelected
                                ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-1 ring-emerald-200'
                                : 'border-gray-100 hover:border-emerald-200 hover:bg-gray-50'
                            }
                            ${isSaving ? 'cursor-wait opacity-70' : 'cursor-pointer'}
                        `}
                    >
                        <div className={`
                            w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
                            ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 group-hover:border-emerald-400'}
                        `}>
                            {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>

                        <div className="flex-1 min-w-0"> {/* min-w-0 agar text wrap */}
                            {option.answer_image && (
                                <img
                                    src={`/storage/${option.answer_image}`}
                                    className="mb-2 max-h-40 rounded-lg border border-gray-200 object-contain bg-white"
                                    alt="Opsi Gambar"
                                />
                            )}

                            {/*  GANTI DISINI: Support HTML & Rumus */}
                            <div
                                className={`text-base leading-relaxed prose prose-sm max-w-none ${isSelected ? 'text-emerald-900 font-medium' : 'text-gray-700'}`}
                                dangerouslySetInnerHTML={{ __html: option.answer_text }}
                            />
                        </div>

                        {isSelected && (
                            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
                        )}
                    </button>
                );
            })}

            {/* Footer Action (Tombol Batal & Loading) - TETAP SAMA */}
            <div className="flex justify-between items-center pt-2 mt-4 border-t border-gray-50">
                <div>
                    {selectedAnswer?.answerId && (
                        <button
                            onClick={handleClear}
                            disabled={isSaving}
                            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors font-medium"
                        >
                            <Trash2 className="w-4 h-4" />
                            Batal Jawab
                        </button>
                    )}
                </div>

                <div className="h-5 flex items-center">
                    {isSaving && (
                        <span className="text-xs text-emerald-600 animate-pulse font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-ping"></span>
                            Menyimpan...
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
