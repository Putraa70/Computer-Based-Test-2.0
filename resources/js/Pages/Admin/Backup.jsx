import React from "react";
import { Head } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";

export default function Backup({ database }) {
  const driverLabel = database?.driver ? database.driver.toUpperCase() : "-";
  const databaseName = database?.database || "-";

  return (
    <AdminLayout>
      <Head title="Backup Database" />

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Backup Database</h1>
          <p className="text-sm text-gray-500 mt-1">
            Unduh salinan database untuk kebutuhan arsip atau pemulihan sistem.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Informasi Koneksi
              </p>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Driver</span>
                  <span className="font-semibold text-gray-900">{driverLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Database</span>
                  <span className="font-semibold text-gray-900">{databaseName}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Catatan
              </p>
              <ul className="mt-3 text-sm text-gray-600 space-y-2">
                <li>Backup dibuat secara instan dari database aktif.</li>
                <li>Pastikan menyimpan file di lokasi aman.</li>
                <li>Untuk MySQL/PostgreSQL, server harus memiliki alat dump.</li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Unduh Backup</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Klik tombol di bawah untuk mengunduh file backup terbaru.
                </p>
              </div>

              <a
                href={route("admin.backup.download")}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors">
                <span className="material-icons text-base">cloud_download</span>
                Download Backup
              </a>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  Rekomendasi
                </p>
                <p className="text-sm text-emerald-700 mt-2">
                  Lakukan backup rutin setelah input data besar atau sebelum ujian dimulai.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Perhatian
                </p>
                <p className="text-sm text-amber-700 mt-2">
                  Jangan membagikan file backup ke pihak yang tidak berwenang.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
