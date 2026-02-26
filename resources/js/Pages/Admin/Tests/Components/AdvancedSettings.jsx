import React from "react";

export default function AdvancedSettings({ data, setData }) {
    return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-left space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
                <span className="material-icons">construction</span>
                <h4 className="text-xs font-black uppercase tracking-widest">
                    Pengaturan Utama
                </h4>
            </div>

            {/* SEB Toggle */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">
                    Safe Exam Browser (SEB)
                </label>
                <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-all">
                    <input
                        type="checkbox"
                        id="require_seb"
                        checked={data.require_seb || false}
                        onChange={(e) =>
                            setData("require_seb", e.target.checked)
                        }
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                    <label
                        htmlFor="require_seb"
                        className="text-sm text-gray-600 cursor-pointer flex-1"
                    >
                        Wajib menggunakan Safe Exam Browser (SEB) untuk ujian
                        ini
                    </label>
                    {data.require_seb && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                            AKTIF
                        </span>
                    )}
                    {!data.require_seb && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                            PROTEKSI APLIKASI ON
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-amber-700 italic">
                    {data.require_seb
                        ? "Ketika diaktifkan, peserta hanya dapat mengakses ujian melalui Safe Exam Browser."
                        : "⚠️ Ketika SEB dinonaktifkan, proteksi anti-copy, anti-screenshot, dan anti-devtools akan otomatis aktif di aplikasi untuk keamanan ujian."}
                </p>
            </div>

            {/* Placeholder untuk pengaturan lainnya di masa depan */}
            <div className="grid grid-cols-2 gap-6 opacity-30 select-none grayscale pt-4 border-t border-amber-200">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase">
                        No Answer Policy
                    </label>
                    <div className="h-8 bg-white border border-gray-200 rounded-lg"></div>
                </div>
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase">
                        Randomization
                    </label>
                    <div className="h-8 bg-white border border-gray-200 rounded-lg"></div>
                </div>
            </div>
        </div>
    );
}
