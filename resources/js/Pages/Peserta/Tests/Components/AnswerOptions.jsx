import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

export default function AnswerOptions({ question, selectedAnswer, onAnswer, onQueueSave }) {
    const [isSaving, setIsSaving] = useState(false);

    // Logic Pilih Jawaban
    const handleSelect = async (answerId, answerText) => {
        if (isSaving || selectedAnswer?.answerId === answerId) return;

        const previousAnswer = selectedAnswer ? { ...selectedAnswer } : null;
        onAnswer({ answerId, answerText });

        setIsSaving(true);
        try {
            await onQueueSave?.(question.id, {
                answerId,
                answerText: null,
            });
        } catch (error) {
            console.error("Gagal mengantrikan jawaban", error);
            onAnswer(previousAnswer || null);
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
            await onQueueSave?.(question.id, {
                answerId: null,
                answerText: null,
            });
        } catch (error) {
            console.error("Gagal mengantrikan penghapusan jawaban", error);
            onAnswer(previousAnswer || null);
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
