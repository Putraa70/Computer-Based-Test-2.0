import React, { useState, useEffect } from "react";

export default function EssayInput({ question, selectedAnswer, onAnswer, onQueueSave }) {
    const [text, setText] = useState("");
    const [status, setStatus] = useState("idle"); // idle, saving, saved, error

    // Load jawaban yang sudah ada (jika user kembali ke soal ini)
    useEffect(() => {
        if (selectedAnswer?.answerText) {
            setText(selectedAnswer.answerText);
        } else {
            setText("");
        }
        setStatus("idle");
    }, [selectedAnswer]);

    const saveEssayAnswer = async () => {
        try {
            await onQueueSave?.(question.id, {
                answerId: null,
                answerText: text,
            });
            setStatus("saved");
            setTimeout(() => setStatus("idle"), 1200);
            return true;
        } catch (error) {
            console.error(error);
            setStatus("error");
            return false;
        } finally {
            return;
        }
    };

    const handleSave = async () => {
        setStatus("saving");
        onAnswer({ answerText: text });

        try {
            await saveEssayAnswer();
        } catch (error) {
            console.error(error);
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
