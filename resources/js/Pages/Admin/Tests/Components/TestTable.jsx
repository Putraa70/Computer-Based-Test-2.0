import React from "react";
import { Link } from "@inertiajs/react"; // 1. Import Link untuk navigasi
import { BarChart2 } from "lucide-react"; // 2. Import Icon untuk tombol statistik
import Table from "@/Components/UI/Table";
import { getColumns } from "../Config/TableColumns";
import Button from "@/Components/UI/Button";

export default function TestTable({
  tests,
  onEdit,
  onDelete,
  isLoading = false,
  isStatisticMode = false, // 3. Terima props isStatisticMode (Default false)
}) {
  const columns = getColumns().map((col) => {
    if (col.key === "duration") {
      return {
        ...col,
        render: (value) => `${value}m`,
      };
    }

    if (col.key === "is_active") {
      return {
        ...col,
        render: (value) => (
          <span
            className={`px-2 py-1 rounded text-[9px] font-bold ${
              value ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {value ? "AKTIF" : "NON-AKTIF"}
          </span>
        ),
      };
    }

    if (["start_time", "end_time"].includes(col.key)) {
      return {
        ...col,
        render: (value) => (
          <span className="text-[12px] font-mono leading-tight">{value}</span>
        ),
      };
    }

    return col;
  });

  // 4. Update Render Actions dengan Logika Kondisional
  const renderActions = (row) => {
    //  JIKA MODE STATISTIK: Tampilkan Tombol Analisis
    if (isStatisticMode) {
      return (
        <Link
          href={route("admin.statistics.test", row.id)}
          className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
        >
          <BarChart2 className="w-3 h-3" />
          Analisis
        </Link>
      );
    }

    //  JIKA MODE BIASA: Tampilkan Edit & Hapus (Kode Lama Anda)
    return (
      <div className="flex gap-1">
        <Button
          variant="primary"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row);
          }}
          className="text-[10px] py-1 px-2"
        >
          Edit
        </Button>
        <Button
          variant="danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row.id);
          }}
          className="text-[10px] py-1 px-2 bg-black text-white"
        >
          Hapus
        </Button>
      </div>
    );
  };

  return (
    <Table
      columns={columns}
      data={tests}
      isLoading={isLoading}
      emptyMessage="Belum ada ujian tersedia"
      renderActions={renderActions}
    />
  );
}
