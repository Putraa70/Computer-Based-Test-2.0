import React from "react";
import { Head, Link } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";

export default function Show({ test }) {
  return (
    <AdminLayout>
      <Head title={`Detail Ujian: ${test.title}`} />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-left max-w-4xl mx-auto">
        <div className="flex justify-between items-start border-b pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
              {test.title}
            </h1>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">
              ID Ujian: #{test.id}
            </p>
          </div>
          <Link
            href={route("admin.tests.index")}
            className="text-xs font-bold text-gray-400 hover:text-blue-600 uppercase flex items-center gap-1">
            <span className="material-icons text-sm">arrow_back</span> Kembali
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Informasi Waktu
            </h3>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2 font-mono text-xs">
              <p>Mulai: {test.start_time}</p>
              <p>Selesai: {test.end_time}</p>
              <p>Durasi: {test.duration} Menit</p>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Topik Terdaftar
            </h3>
            <div className="flex flex-wrap gap-2">
              {test.topics?.map((t) => (
                <span
                  key={t.id}
                  className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold border border-blue-100 uppercase">
                  {t.name} ({t.pivot.total_questions} Soal)
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
