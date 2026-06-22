import React from "react";
import { Award, Clock, Calendar, CheckCircle2, XCircle } from "lucide-react";

export default function ResultHeader({ testUser }) {
  const { test, result } = testUser;

  // Hitung durasi (bisa disesuaikan dengan utilitas format waktu Anda)
  const getDuration = () => {
    if (!testUser.started_at || !testUser.finished_at) return "-";
    const start = new Date(testUser.started_at);
    const end = new Date(testUser.finished_at);
    const minutes = Math.floor((end - start) / 60000);
    return `${minutes} Menit`;
  };

  // Tentukan Status Lulus/Tidak (Asumsi KKM 60, bisa diambil dari test.kkm jika ada)
  const kkm = test.kkm || 60;
  const isPassed = result?.total_score >= kkm;

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mb-6 relative">
      {/* Background Decor */}
      <div
        className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${isPassed ? "from-green-400 to-emerald-500" : "from-red-400 to-rose-500"}`}></div>

      <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Kiri: Info Ujian */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-2">
            {test.title}
          </h1>
          <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-500 font-medium">
            <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
              <Calendar className="w-4 h-4 text-blue-500" />
              {new Date(testUser.finished_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
              <Clock className="w-4 h-4 text-orange-500" />
              {getDuration()}
            </span>
          </div>
        </div>

        {/* Kanan: Nilai Besar */}
        <div className="flex items-center gap-6">

          <div
            className={`relative w-24 h-24 md:w-32 md:h-32 rounded-full flex flex-col items-center justify-center border-4 ${isPassed ? "border-green-100 bg-green-50 text-green-700" : "border-red-100 bg-red-50 text-red-700"}`}>
            <span className="text-3xl md:text-4xl font-black tracking-tighter">
              {result?.total_score ?? 0}
            </span>
            <span className="text-[10px] uppercase font-bold opacity-60">
              Nilai Akhir
            </span>

            {/* Badge Icon */}
            <div
              className={`absolute -bottom-2 -right-2 p-2 rounded-full border-4 border-white ${isPassed ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
              {isPassed ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
