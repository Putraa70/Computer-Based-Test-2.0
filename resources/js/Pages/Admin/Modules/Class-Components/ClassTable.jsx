import React from "react";
import Table from "@/Components/UI/Table";
import {
  PencilSquareIcon,
  TrashIcon,
  AcademicCapIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";

export default function ClassTable({ modules, onEdit, onDelete }) {
  const columns = [
    {
      label: "Nama Modul",
      key: "name",
      className: "w-1/3",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 border border-emerald-100">
            <AcademicCapIcon className="w-5 h-5" />
          </div>
          <span className="font-bold text-gray-900 text-sm">{value}</span>
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
      label: "Total Topik",
      key: "topics_count",
      className: "text-center",
      render: (count) => (
        <div className="flex justify-center">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${count > 0 ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-gray-50 text-gray-400 border-gray-100"}`}>
            <BookOpenIcon className="w-3.5 h-3.5" />
            {count ?? 0} Topik
          </span>
        </div>
      ),
    },
  ];

  const renderActions = (row) => (
    <div className="flex justify-end gap-2">
      <button
        onClick={() => onEdit(row)}
        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
        title="Edit Modul">
        <PencilSquareIcon className="w-5 h-5" />
      </button>

      <button
        onClick={() => onDelete(row.id)}
        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
        title="Hapus Modul">
        <TrashIcon className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <Table
        data={modules.data || []} // Handle data pagination
        pagination={modules.links} // Pass pagination links
        columns={columns}
        renderActions={renderActions}
        emptyMessage="Belum ada modul akademik yang dibuat."
      />
    </div>
  );
}
