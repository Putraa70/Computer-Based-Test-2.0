import React from 'react';
import AnswerOptions from './AnswerOptions';
import EssayInput from './EssayInput';

//  Import CSS untuk Rumus (Wajib ada di parent/Start.jsx, tapi aman di sini juga)
import 'katex/dist/katex.min.css';
import 'react-quill/dist/quill.snow.css';

export default function QuestionCard({ question, selectedAnswer, testUserId, onAnswer, onFatalError, disableAutoSave = false }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 animate-fade-in">
            {/* 1. Bagian Soal (Teks & Gambar) */}
            <div className="mb-8">

                <div
                    className="prose max-w-none text-lg text-gray-800 font-medium leading-relaxed ql-editor"
                    style={{ padding: 0 }} // Reset padding bawaan Quill
                    dangerouslySetInnerHTML={{ __html: question.question_text }}
                />

                {question.question_image && (
                    <div className="mt-4">
                        <img
                            src={`/storage/${question.question_image}`}
                            alt="Visual Soal"
                            className="rounded-xl border border-gray-200 max-h-96 object-contain shadow-sm"
                        />
                    </div>
                )}
            </div>

            {/* 2. Bagian Input Jawaban */}
            <div className="border-t border-gray-100 pt-6">
                {question.type === 'multiple_choice' ? (
                    <AnswerOptions
                        question={question}
                        selectedAnswer={selectedAnswer}
                        testUserId={testUserId}
                        onAnswer={onAnswer}
                        onFatalError={onFatalError}
                        disableAutoSave={disableAutoSave}
                    />
                ) : (
                    <EssayInput
                        question={question}
                        selectedAnswer={selectedAnswer}
                        testUserId={testUserId}
                        onAnswer={onAnswer}
                        onFatalError={onFatalError}
                        disableAutoSave={disableAutoSave}
                    />
                )}
            </div>
        </div>
    );
}
