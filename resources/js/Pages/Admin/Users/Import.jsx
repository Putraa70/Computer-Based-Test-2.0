import React from "react";
import Button from "@/Components/UI/Button";
import { useForm, usePage } from "@inertiajs/react";
import {
    CloudArrowUpIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ArrowDownTrayIcon,
    InformationCircleIcon,
    QuestionMarkCircleIcon,
    ArrowRightIcon,
    DocumentDuplicateIcon
} from "@heroicons/react/24/outline";

//  Import Component Alert yang baru dibuat
// Sesuaikan path import ini dengan struktur folder Anda
import ImportAlert from "@/Pages/Admin/Components/ImportAlert";

export default function Import() {
  const { data, setData, post, processing, errors, reset } = useForm({
    file: null,
  });

  // Ambil flash message dari server
  const { flash } = usePage().props;

  const handleFileUpload = (e) => {
    setData("file", e.target.files[0]);
  };

  const submitImport = (e) => {
    e.preventDefault();
    post(route("admin.import.users"), {
      forceFormData: true,
      onSuccess: () => {
          reset();
          // Reset input file browser secara manual
          const fileInput = document.getElementById('file-upload');
          if(fileInput) fileInput.value = null;
      },
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Import Pengguna
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Unggah data peserta secara massal via Excel, CSV, atau XML.
          </p>
        </div>

        <a
          href={route("admin.import.template")}
          className="inline-flex items-center justify-center gap-2 bg-gray-800 text-white hover:bg-gray-700 border border-transparent px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md group"
        >
          <ArrowDownTrayIcon className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
          Unduh Template
        </a>
      </div>

      {/* --- ALERT COMPONENT --- */}
      {/* Cukup panggil satu baris ini */}
      <ImportAlert flash={flash} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* --- KOLOM KIRI: FORM UPLOAD --- */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
               <CloudArrowUpIcon className="w-5 h-5 text-blue-600" />
               <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                 Area Upload
               </h2>
            </div>

            <div className="p-6 md:p-8">
              <form onSubmit={submitImport}>

                {/* DROPZONE AREA */}
                <div className="mb-6">
                  <div
                    className={`relative w-full border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out group ${
                      data.file
                        ? "border-emerald-400 bg-emerald-50/30"
                        : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      accept=".csv,.xml,.xlsx,.xls"
                      onChange={handleFileUpload}
                    />

                    <div className="p-10 flex flex-col items-center justify-center text-center">
                      {data.file ? (
                        <div className="animate-fade-in-up">
                          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 mx-auto shadow-sm">
                            <DocumentTextIcon className="w-8 h-8" />
                          </div>
                          <p className="text-sm font-bold text-gray-900 truncate max-w-xs">
                            {data.file.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 font-mono">
                            {formatFileSize(data.file.size)}
                          </p>
                          <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                            <CheckCircleIcon className="w-4 h-4" />
                            Siap diunggah
                          </div>
                          <p className="text-xs text-gray-400 mt-4 group-hover:text-gray-600 transition-colors">
                            Klik atau drag file lain untuk mengganti
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4 mx-auto group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors duration-200">
                            <CloudArrowUpIcon className="w-8 h-8" />
                          </div>
                          <p className="text-base font-semibold text-gray-900">
                            Klik untuk upload <span className="font-normal text-gray-500">atau drag & drop</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            Mendukung: .xlsx, .xls, .csv, .xml (Maks. 10MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {errors.file && (
                    <div className="mt-3 flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
                      <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
                      <span>{errors.file}</span>
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  {data.file && (
                    <Button
                      type="button"
                      className="bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 hover:text-gray-900 px-6 py-2.5 shadow-sm font-bold"
                      onClick={() => reset()}
                    >
                      Batal
                    </Button>
                  )}

                  <Button
                    type="submit"
                    loading={processing}
                    disabled={!data.file}
                    className={`px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-all text-sm font-bold tracking-wide ${
                      !data.file
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                        : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md border border-transparent"
                    }`}
                  >
                    {processing ? "Memproses..." : "Import Data"}
                    {!processing && <ArrowRightIcon className="w-4 h-4" />}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* --- KOLOM KANAN: INFORMASI --- */}
        <div className="lg:col-span-1 space-y-6">

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <InformationCircleIcon className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-bold text-gray-800">
                    Ketentuan File
                </h3>
            </div>
            <div className="p-5">
              <ul className="space-y-4">
                <li className="flex gap-3 text-sm text-gray-600">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold border border-blue-100">1</div>
                  <div>
                    <strong className="block text-gray-900 text-xs uppercase mb-0.5 tracking-wide">Format Kolom</strong>
                    Nama, NPM, Email, Angkatan (Group).
                  </div>
                </li>
                <li className="flex gap-3 text-sm text-gray-600">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold border border-blue-100">2</div>
                  <div>
                    <strong className="block text-gray-900 text-xs uppercase mb-0.5 tracking-wide">Header</strong>
                    Baris pertama (judul kolom) akan dilewati oleh sistem.
                  </div>
                </li>
                <li className="flex gap-3 text-sm text-gray-600">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs font-bold border border-blue-100">3</div>
                  <div>
                    <strong className="block text-gray-900 text-xs uppercase mb-0.5 tracking-wide">Duplikasi</strong>
                    Jika User sudah ada, sistem akan memasukkannya ke Grup baru (jika belum masuk).
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
            <h4 className="text-blue-800 font-bold text-sm mb-2 flex items-center gap-2">
              <QuestionMarkCircleIcon className="w-5 h-5" />
              Butuh Bantuan?
            </h4>
            <p className="text-xs text-blue-600 leading-relaxed mb-3">
              Gunakan template resmi agar data masuk dengan sempurna tanpa error format.
            </p>
            <a
              href={route("admin.import.template")}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 group"
            >
              <DocumentDuplicateIcon className="w-3 h-3 group-hover:scale-110 transition-transform" />
              Unduh Contoh File
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
