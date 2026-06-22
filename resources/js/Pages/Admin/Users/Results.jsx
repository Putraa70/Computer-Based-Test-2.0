import React from "react";
// HAPUS import AdminLayout
import Table from "@/Components/UI/Table";
import Button from "@/Components/UI/Button";

// Menerima props 'users' (atau sesuaikan jika controller mengirim prop khusus hasil)
export default function Results({ users = [] }) {
  const columns = [
    { label: "Waktu mulai", key: "start_time" },
    {
      label: "Durasi",
      key: "duration",
      render: (val) => <span>{val || "0 menit"}</span>,
    },
    {
      label: "Skor",
      key: "score",
      render: (val) => (
        <span>{val || 0}</span>
      ),
    },
    {
      label: "Correct",
      key: "correct",
      render: (val) => (
        <span>{val || 0}</span>
      ),
    },
    {
      label: "Wrong",
      key: "wrong",
      render: (val) => <span>{val || 0}</span>,
    },
    {
      label: "Status",
      key: "status",
      render: (val) => (
        <span className="px-2 py-1 bg-gray-100 rounded text-[10px]">
          {val || "Tidak Diketahui"}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden text-left">
      <div className="p-6 border-b border-gray-100 flex items-center">
        <div className="p-3 rounded-md">
          <span className="material-icons">analytics</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-800 tracking-tight">
          Hasil Nilai Individu
        </h1>
      </div>

      <div className="p-8">
        <h2 className="text-gray-600 text-xl font-bold mb-4">
          Ringkasan Mahasiswa
        </h2>

        {/* Filter Section */}
        <div className="space-y-3 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200">
          <ResultFilter label="Group" icon="groups" />
          <ResultFilter label="User" icon="person" />
          <ResultFilter label="Test" icon="assignment" />
          <div className="flex md:ml-[120px] mt-4">
            <Button className="bg-blue-600 px-12 text-xs">
              Filter Data
            </Button>
          </div>
        </div>

        <Table
          columns={columns}
          data={users}
          emptyMessage="No result records found for this criteria."
        />

        {/* Export Section */}
        <div className="mt-8 flex flex-col items-center gap-3 border-t pt-8">
          <p className="text-blue-600 font-bold text-base ">
            Ekspor Hasil
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button className="bg-red-500 px-4 text-xs font-semibold">
              Ekspor Pdf
            </Button>
            <Button className="bg-green-600 px-5 text-xs font-semibold">
              Ekspor Excel/CSV
            </Button>
            <Button className="bg-[#00a65a] px-5 text-xs font-semibold">
              XML
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ResultFilter = ({ label, icon }) => (
  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
    <label className="text-sm font-bold text-green-700 md:w-24 flex items-center gap-2">
      <span className="material-icons text-md">{icon}</span>
      {label} 
    </label>
    <div className="flex-1 max-w-xl">
      <input
        className="w-full border border-gray-300 p-2 rounded-lg outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-inner bg-white text-sm"
        placeholder={`Filter by ${label}...`}
      />
    </div>
  </div>
);
