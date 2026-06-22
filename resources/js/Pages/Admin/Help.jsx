import React from "react";
import { Head } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";

const helpSections = [
  {
    title: "Akun & Akses",
    description:
      "Panduan mengelola akun admin, keamanan akses, dan sesi login.",
    details: [
      "Gunakan email resmi institusi agar reset akses lebih mudah diproses.",
      "Jika sesi login sering terputus, pastikan koneksi stabil dan tidak membuka akun di banyak perangkat.",
      "Untuk perubahan peran atau aktivasi akun, lakukan melalui menu Pengguna atau hubungi super admin.",
    ],
  },
  {
    title: "Manajemen Pengguna",
    description:
      "Kelola peserta, pengelompokan, dan import data secara terstruktur.",
    details: [
      "Gunakan tab Management untuk tambah/edit data individu dan pastikan NPM unik.",
      "Tab Groups digunakan untuk menetapkan peserta ke grup/angkatan yang relevan.",
      "Tab Import untuk unggah massal. Pastikan format template benar sebelum upload.",
    ],
  },
  {
    title: "Modul & Bank Soal",
    description:
      "Bangun struktur materi dan bank soal agar ujian rapi dan mudah dipelihara.",
    details: [
      "Mulai dari membuat Modul, lalu Topik agar soal tersusun sesuai kurikulum.",
      "Gunakan tab Questions untuk melihat, filter, dan memastikan soal aktif.",
      "Untuk jumlah soal besar, gunakan Import dan cek kembali hasil unggahan.",
    ],
  },
  {
    title: "Ujian",
    description:
      "Atur jadwal ujian dan kontrol pelaksanaannya secara real-time.",
    details: [
      "Saat membuat ujian, pastikan rentang waktu sudah sesuai dan status aktif.",
      "Gunakan menu Hasil Ujian untuk melihat status selesai, sedang berjalan, atau terkunci.",
      "Menu Statistik membantu menilai performa dan distribusi nilai peserta.",
    ],
  },
  {
    title: "Monitoring & Analitik",
    description:
      "Pantau aktivitas ujian dan lakukan intervensi jika diperlukan.",
    details: [
      "Gunakan Analitik/Monitoring untuk melihat progres peserta secara live.",
      "Fitur force submit dipakai jika peserta terputus koneksi atau waktu habis.",
      "Catat kejadian khusus (mis. gangguan jaringan) untuk laporan pasca ujian.",
    ],
  },
  {
    title: "Backup",
    description:
      "Amankan data ujian dengan backup rutin dan penyimpanan yang benar.",
    details: [
      "Lakukan backup sebelum dan sesudah ujian penting.",
      "Simpan file di lokasi terpisah (mis. drive institusi) dan beri label tanggal.",
      "Jika backup gagal, pastikan tool dump tersedia di server (mysqldump/pg_dump).",
    ],
  },
  {
    title: "Troubleshooting Cepat",
    description:
      "Solusi singkat untuk masalah yang sering terjadi di lapangan.",
    details: [
      "Halaman putih: refresh browser dan cek koneksi internet.",
      "Data tidak muncul: pastikan filter/section yang dipilih sudah benar.",
      "Tidak bisa download: coba ulangi, pastikan izin browser untuk unduhan.",
    ],
  },
];

const quickTips = [
  "Mode ujian wajib menggunakan Safe Exam Browser (SEB).",
  "Satu akun hanya boleh aktif pada satu sesi (single session).",
  "Pastikan koneksi internet stabil sebelum memulai ujian.",
  "Jika tampilan tidak sesuai, refresh halaman dan login ulang.",
  "Backup rutin membantu pemulihan cepat saat terjadi gangguan.",
  "Gunakan perangkat admin yang sama selama sesi ujian.",
];

export default function Help() {
  return (
    <AdminLayout>
      <Head title="Help" />

      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Help Center</h1>
          <p className="text-sm text-gray-500 mt-1">
            Panduan singkat penggunaan sistem CBT untuk admin.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {helpSections.map((section) => (
              <div
                key={section.title}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start gap-3">
                  <span className="material-icons text-emerald-600 text-lg">
                    help_outline
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {section.title}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {section.description}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-gray-600">
                      {section.details.map((detail) => (
                        <li key={detail} className="flex items-start gap-2">
                          <span className="material-icons text-emerald-500 text-base">
                            check_circle
                          </span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-900">Tips Cepat</h2>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                {quickTips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="material-icons text-emerald-500 text-base">
                      check_circle
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5">
              <h2 className="text-base font-semibold text-emerald-700">
                Butuh Bantuan Lanjutan?
              </h2>
              <p className="text-sm text-emerald-700 mt-2">
                Hubungi tim pengelola CBT FK Unila untuk dukungan teknis atau
                permintaan fitur.
              </p>
              <div className="mt-4 text-sm text-emerald-800 font-medium">
                Email: itsupport@cbt-fkunila.ac.id
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
