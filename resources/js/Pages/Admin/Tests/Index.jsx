import React, { useMemo } from "react";
import { Head, usePage } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import Management from "./Components/TestManagement"; // Pastikan path ini benar
import Results from "./Results";
import Analitics from "./Analitics";

export default function Index(props) {
  const { url } = usePage();

  // Membaca section dari URL dengan lebih stabil
  const section = useMemo(() => {
    const urlObj = new URL(url, window.location.origin);
    const rawSection = (urlObj.searchParams.get("section") || "tests").toLowerCase();
    return rawSection === "analitics" ? "analytics" : rawSection;
  }, [url]);

  const renderContent = () => {
    switch (section) {
      case "tests":
        // Mode Management Biasa
        return <Management {...props} isStatisticMode={false} />;

      case "results":
        return <Results {...props} />;

      //  INI BAGIAN PENTING YANG KURANG
      case "statistic":
        // Panggil Management lagi, TAPI aktifkan mode statistik
        return <Management {...props} isStatisticMode={true} />;

      case "analytics":
        //  Analytics Mode - Tampilkan Analisis Data Ujian
        return <Analitics {...props} />;

      default:
        // Tampilan Construction (Default jika case tidak ditemukan)
        return (
          <div className="bg-white p-20 rounded-xl border border-dashed text-center text-gray-400">
            <span className="material-icons text-5xl mb-4">construction</span>
            <p className="font-bold uppercase tracking-widest italic">
              Modul {section.replace("_", " ")} Sedang Dikembangkan
            </p>
          </div>
        );
    }
  };

  return (
    <AdminLayout>
      <Head title={`Tests - ${section.toUpperCase()}`} />

      <div key={section} className="zoom-in-95 duration-300">
        {renderContent()}
      </div>
    </AdminLayout>
  );
}
