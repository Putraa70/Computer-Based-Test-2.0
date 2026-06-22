import React from "react";
import Table from "@/Components/UI/Table"; // Pastikan path ini benar sesuai struktur project Anda
import {
  PencilSquareIcon,
  TrashIcon,
  DocumentTextIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";

export default function TopicTable({ topics, onEdit, onDelete, onManage }) {
  // Definisi Kolom Tabel
  const columns = [
    {
      label: "Topik / Mata Kuliah",
      key: "name",
      className: "w-1/3",
      render: (value, row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 border border-blue-100">
            <BookOpenIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">{value}</div>
            <div className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded w-fit mt-0.5 border border-gray-200">
              {row.module?.name || "Tanpa Modul"}
            </div>
          </div>
        </div>
      ),
    },
    {
      label: "Deskripsi",
      key: "description",
      className: "w-1/3 hidden md:table-cell",
      render: (value) => (
        <span className="text-gray-500 text-xs leading-relaxed line-clamp-2">
          {value || "-"}
        </span>
      ),
    },
    {
      label: "Bank Soal",
      key: "questions_count",
      className: "text-center",
      render: (count) => (
        <div className="flex justify-center">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${count > 0 ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-gray-50 text-gray-400 border-gray-100"}`}>
            <DocumentTextIcon className="w-3.5 h-3.5" />
            {count ?? 0} Soal
          </span>
        </div>
      ),
    },
  ];

  // Tombol Aksi (Edit, Hapus, Kelola Soal)
  const renderActions = (row) => (
    <div className="flex justify-end gap-2">
      {/* Tombol Pintas ke Questions (Fitur Utama) */}
      <button
        onClick={() => onManage(row.id)}
        className="flex items-center gap-1 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all border border-blue-200 text-xs font-bold shadow-sm"
        title="Kelola Bank Soal">
        <DocumentTextIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Kelola Soal</span>
      </button>

      <button
        onClick={() => onEdit(row)}
        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
        title="Edit Topik">
        <PencilSquareIcon className="w-5 h-5" />
      </button>

      <button
        onClick={() => onDelete(row.id)}
        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
        title="Hapus Topik">
        <TrashIcon className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <Table
        data={topics}
        columns={columns}
        renderActions={renderActions}
        emptyMessage="Belum ada topik ditemukan pada modul ini."
      />
    </div>
  );
}
