import React, { useState, useEffect } from "react";
import axios from 'axios';
import Swal from 'sweetalert2';

export default function EssayInput({ question, selectedAnswer, testUserId, onAnswer, onFatalError }) {
    const [text, setText] = useState("");
    const [status, setStatus] = useState("idle"); // idle, saving, saved, error
    const NETWORK_TIMEOUT = 6000;

    // Load jawaban yang sudah ada (jika user kembali ke soal ini)
    useEffect(() => {
        if (selectedAnswer?.answerText) {
            setText(selectedAnswer.answerText);
        } else {
            setText("");
        }
        setStatus("idle");
    }, [selectedAnswer]);

    const buildErrorMessage = (error) => {
        const networkHint = "Jawaban belum tersimpan karena koneksi terputus. Periksa kabel LAN atau jaringan Anda, lalu coba lagi.";
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            return networkHint;
        }
        if (!error?.response || error?.code === "ERR_NETWORK" || error?.code === "ERR_CANCELED") {
            return networkHint;
        }
        return "Terjadi kesalahan saat menyimpan jawaban. Silakan coba lagi.";
    };

    const triggerFatalError = (error) => {
        const message = buildErrorMessage(error);
        onFatalError?.({ status: 503, message });
    };

    useEffect(() => {
        const handleOffline = () => {
            triggerFatalError();
        };

        window.addEventListener('offline', handleOffline);
        return () => window.removeEventListener('offline', handleOffline);
    }, []);

    const saveEssayAnswer = async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);

        try {
            await axios.post(route("peserta.tests.answer", { testUser: testUserId }), {
                question_id: question.id,
                answer_text: text,
                answer_id: null,
            }, {
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

    const handleSave = async () => {
        setStatus("saving");
        onAnswer({ answerText: text });

        try {
            await saveEssayAnswer();

            setStatus("saved");
            setTimeout(() => setStatus("idle"), 2000);
        } catch (error) {
            console.error(error);
            setStatus("error");
            triggerFatalError(error);
        }
    };

    return (
        <div className="space-y-2">
            <textarea
                value={text}
                onChange={(e) => {
                    setText(e.target.value);
                    onAnswer({ answerText: e.target.value });
                }}
                onBlur={handleSave}
                placeholder="Tulis jawaban Anda di sini..."
                className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all min-h-[200px] text-gray-800 leading-relaxed"
            />

            <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">
                    Klik di luar area teks untuk menyimpan.
                </span>

                {status === "saving" && (
                    <span className="text-emerald-600 animate-pulse font-medium">Menyimpan...</span>
                )}
                {status === "saved" && (
                    <span className="text-green-600 font-medium">✓ Tersimpan</span>
                )}
            </div>
        </div>
    );
}
