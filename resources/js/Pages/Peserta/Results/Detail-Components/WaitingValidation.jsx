import React from "react";
import { Link } from "@inertiajs/react";
import { Clock, ArrowLeft } from "lucide-react";

export default function WaitingValidation({ message }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm animate-in fade-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mb-6">
        <Clock className="w-10 h-10 text-yellow-500 animate-pulse" />
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Menunggu Konfirmasi
      </h2>

      <p className="text-gray-500 max-w-md mb-8 leading-relaxed">
        {message ||
          "Hasil ujian Anda telah direkam dan sedang diperiksa. Detail pembahasan dan nilai akhir akan muncul setelah divalidasi oleh Admin."}
      </p>

      <div className="flex gap-3">
        <Link
          href={route("peserta.results.index")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Riwayat
        </Link>
      </div>
    </div>
  );
}
