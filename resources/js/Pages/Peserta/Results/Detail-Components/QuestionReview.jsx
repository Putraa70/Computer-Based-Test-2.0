import React from "react";
import { Check, X, Minus } from "lucide-react";

// Ganti props jadi 'questions' (biar sesuai konteks)
export default function QuestionReview({ questions = [] }) {
  
  if (!questions || questions.length === 0) {
    return (
      <div className="text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
        Belum ada data pembahasan soal.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
        Pembahasan Soal ({questions.length} Soal)
      </h3>

      <div className="grid gap-6">
        {questions.map((item) => {
          // Ambil data yang sudah dirapikan Controller
          const {
            no,
            question_text,
            type,
            options,
            user_answer_id,
            user_essay,
            is_correct,
            is_answered,
          } = item;

          // Tentukan warna border card
          let cardBorder = "border-gray-100"; // Default (Tidak dijawab)
          if (is_answered) {
            cardBorder = is_correct
              ? "border-green-200 shadow-sm ring-1 ring-green-100"
              : "border-red-200 shadow-sm";
          }

          return (
            <div
              key={no}
              className={`bg-white rounded-2xl p-6 border-2 transition-all ${cardBorder}`}>
              {/* Header Soal */}
              <div className="flex gap-4 mb-4">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${is_answered ? (is_correct ? "bg-green-500" : "bg-red-500") : "bg-gray-300"}`}>
                  {no}
                </div>
                <div className="flex-1">
                  {/* Status Label */}
                  {!is_answered && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 mb-2">
                      <Minus className="w-3 h-3" /> Tidak Dijawab
                    </span>
                  )}

                  <div
                    className="prose prose-sm max-w-none text-gray-800 font-medium"
                    dangerouslySetInnerHTML={{ __html: question_text }}
                  />
                </div>
              </div>

              {/* Pilihan Jawaban */}
              {type === "multiple_choice" && options && (
                <div className="space-y-2 ml-14">
                  {options.map((option) => {
                    const isSelected = option.id === user_answer_id;
                    const isKey = option.is_correct == 1;

                    let optionStyle = "border-gray-100 bg-white text-gray-600";
                    let icon = null;

                    if (isSelected) {
                      if (isKey) {
                        // User Benar
                        optionStyle =
                          "border-green-300 bg-green-50 text-green-800 font-bold";
                        icon = <Check className="w-5 h-5 text-green-600" />;
                      } else {
                        // User Salah
                        optionStyle =
                          "border-red-300 bg-red-50 text-red-800 font-bold";
                        icon = <X className="w-5 h-5 text-red-600" />;
                      }
                    } else if (isKey) {
                      // Kunci jawaban (Tampilkan biar user belajar)
                      optionStyle =
                        "border-blue-200 bg-blue-50 text-blue-800 ring-1 ring-blue-300";
                      icon = (
                        <span className="text-[10px] font-black bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded">
                          KUNCI
                        </span>
                      );
                    }

                    return (
                      <div
                        key={option.id}
                        className={`flex items-center justify-between p-3 rounded-lg border text-sm ${optionStyle}`}>
                        <div
                          className="flex-1"
                          dangerouslySetInnerHTML={{
                            __html: option.answer_text,
                          }}
                        />
                        {icon}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Jawaban Essay */}
              {type === "essay" && (
                <div className="ml-14 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1">
                    Jawaban Kamu:
                  </p>
                  <p className="text-gray-800">{user_essay || "-"}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
