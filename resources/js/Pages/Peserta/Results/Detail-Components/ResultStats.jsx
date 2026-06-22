import React from "react";
import { CheckCircle2, XCircle, MinusCircle, Percent } from "lucide-react";

export default function ResultStats({ result, totalQuestions }) {
  // Hitung persentase jawaban benar (Akurasi)
  // totalQuestions diambil dari jumlah soal (bisa dipass dari parent)
  const accuracy =
    totalQuestions > 0
      ? Math.round((result.total_correct / totalQuestions) * 100)
      : 0;

  const stats = [
    {
      label: "Jawaban Benar",
      value: result.total_correct,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
    },
    {
      label: "Jawaban Salah",
      value: result.total_incorrect,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
    },
    {
      label: "Tidak Dijawab",
      value: result.total_unanswered || 0, // Fallback jika kolom belum ada
      icon: MinusCircle,
      color: "text-gray-500",
      bg: "bg-gray-50",
      border: "border-gray-100",
    },
    {
      label: "Akurasi Jawaban",
      value: `${accuracy}%`,
      icon: Percent,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((item, index) => (
        <div
          key={index}
          className={`p-4 rounded-2xl border ${item.border} ${item.bg} flex flex-col items-center justify-center text-center transition hover:shadow-sm`}>
          <div className={`mb-2 p-2 rounded-full bg-white/60 ${item.color}`}>
            <item.icon className="w-6 h-6" />
          </div>
          <div className={`text-2xl font-black ${item.color}`}>
            {item.value}
          </div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-1">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
