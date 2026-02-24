import React from "react";
import { Head, Link, router } from "@inertiajs/react"; // Pastikan import router ada
import PesertaLayout from "@/Layouts/PesertaLayout";
import Table from "@/Components/UI/Table";
import Pagination from "@/Components/UI/Pagination";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  FileText,
} from "lucide-react";

export default function Index({ auth, results }) {
  // Helper Format Tanggal
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <PesertaLayout
      user={auth.user}
      header={
        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
          Riwayat Hasil Ujian
        </h2>
      }>
      <Head title="Riwayat Hasil" />

      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 mb-8 text-white shadow-lg flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Riwayat Hasil Ujian</h1>
              <p className="text-blue-100 max-w-xl">
                Lihat kembali jejak ujian yang telah Anda selesaikan. Pembahasan
                detail dan nilai akhir tersedia setelah divalidasi oleh Admin.
              </p>
            </div>
            <div className="hidden md:block bg-white/10 p-4 rounded-xl backdrop-blur-sm">
              <Award className="w-10 h-10 text-yellow-300" />
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white overflow-hidden shadow-sm sm:rounded-xl border border-gray-200">
            <div className="p-6">
              <Table
                data={results.data}
                emptyMessage="Anda belum memiliki riwayat ujian yang selesai."
                columns={[
                  {
                    label: "Ujian",
                    key: "test.title",
                    // Gunakan 'row.test.title' langsung biar aman dari bug "titik"
                    render: (_, row) => (
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-base">
                          {row.test?.title || "-"}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(row.finished_at)}
                        </span>
                      </div>
                    ),
                  },
                  {
                    label: "Status Nilai",
                    key: "status_nilai", // Ganti key jadi bebas aja, karena kita pakai 'row'
                    className: "text-center",
                    render: (_, row) => {
                      //  FIX DISINI: Ambil langsung dari 'row.result'
                      const resultData = row.result;

                      // 1. Jika Data Result Belum Ada (Data Lama / Belum di-Publish)
                      if (!resultData) {
                        return (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                            <Clock className="w-3 h-3" />
                            Belum Dinilai
                          </span>
                        );
                      }

                      // 2. Jika Status VALIDATED (Cek langsung ke objectnya)
                      if (resultData.status === "validated") {
                        return (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Divalidasi
                          </span>
                        );
                      }

                      // 3. Sisanya (Pending)
                      return (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                          <Clock className="w-3 h-3" />
                          Menunggu
                        </span>
                      );
                    },
                  },
                  {
                    label: "Nilai Akhir",
                    key: "total_score",
                    className: "text-center",
                    render: (_, row) => {
                      const resultData = row.result;

                      // Hanya tampilkan jika Validated
                      if (resultData && resultData.status === "validated") {
                        const score = resultData.total_score; // Ambil nilai
                        const isLulus = score >= (row.test?.kkm || 60);

                        return (
                          <div className="flex flex-col items-center">
                            <span
                              className={`text-lg font-black ${isLulus ? "text-green-600" : "text-red-600"}`}>
                              {score}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <span className="text-gray-400 text-xs italic">--</span>
                      );
                    },
                  },
                  {
                    label: "Aksi",
                    key: "actions",
                    className: "text-center",
                    render: (_, row) => (
                      <div className="flex justify-center">
                        <Link
                          href={route("peserta.results.show", row.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-bold text-xs border border-blue-200">
                          <Eye className="w-4 h-4" />
                          Detail
                        </Link>
                      </div>
                    ),
                  },
                ]}
              />

              <div className="mt-6">
                <Pagination links={results.links} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PesertaLayout>
  );
}
