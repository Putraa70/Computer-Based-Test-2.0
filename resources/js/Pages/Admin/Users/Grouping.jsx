import React, { useState, useMemo } from "react";
import { router, usePage, useForm } from "@inertiajs/react";
import { Pencil, Trash2 } from "lucide-react";
import Table from "@/Components/UI/Table";
import Button from "@/Components/UI/Button";
import Pagination from "@/Components/UI/Pagination";
import DataFilter from "@/Components/Shared/DataFilter";

// Import Komponen Baru
import GroupingHeader from "./Grouping-Components/GroupingHeader";
import GroupingModal from "./Grouping-Components/GroupingModal";

// Helper format tanggal
const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("id-ID", { dateStyle: "medium" })
    : "-";

export default function Grouping({ groups }) {
  const { filters } = usePage().props;

  const [search, setSearch] = useState(filters?.search || "");
  const [perPage, setPerPage] = useState(filters?.per_page || 100);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const {
    data,
    setData,
    post,
    put,
    delete: destroy,
    processing,
    errors,
    reset,
    clearErrors,
  } = useForm({
    name: "",
    description: "",
  });

  // logic search
  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      router.get(
        route("admin.users.index"),
        { section: "groups", search: val, per_page: perPage },
        { preserveState: true, preserveScroll: true, replace: true },
      );
    }, 400);
  };

  const handlePerPageChange = (value) => {
    setPerPage(value);
    router.get(
      route("admin.users.index"),
      { section: "groups", search, per_page: value },
      { preserveState: true, preserveScroll: true, replace: true },
    );
  };

  // logic crud
  const openModal = (group = null) => {
    clearErrors();
    setEditMode(!!group);
    setSelectedId(group?.id || null);
    setData({ name: group?.name || "", description: group?.description || "" });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const options = {
      onSuccess: () => {
        setIsModalOpen(false);
        reset();
      },
      preserveScroll: true,
    };
    editMode
      ? put(route("admin.groups.update", selectedId), options)
      : post(route("admin.groups.store"), options);
  };

  const handleDelete = (id) => {
    if (
      confirm("Hapus grup ini? User di dalamnya akan kehilangan status grup.")
    ) {
      destroy(route("admin.groups.destroy", id), { preserveScroll: true });
    }
  };

  const columns = useMemo(
    () => [
      { label: "Nama Grup", key: "name", className: "font-bold text-gray-800" },
      {
        label: "Jumlah Mahasiswa",
        key: "users_count",
        className: "text-center",
        render: (n) => (
          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">
            {n}
          </span>
        ),
      },
      {
        label: "Keterangan",
        key: "description",
        className: "text-gray-500",
        render: (v) => v || "-",
      },
      {
        label: "Dibuat pada",
        key: "created_at",
        className: "text-sm font-bold",
        render: (v) => formatDate(v),
      },
      {
        label: "Aksi",
        key: "actions",
        className: "text-center",
        render: (_, row) => (
          <div className="flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => openModal(row)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200 hover:border-amber-300"
              title="Edit Grup">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleDelete(row.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300"
              title="Hapus Grup">
              <Trash2 className="w-3.5 h-3.5" /> Hapus
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 1. Header */}
      <GroupingHeader
        totalGroups={groups.total || 0}
        onAddClick={() => openModal()}
      />

      <div className="p-6">
        {/* 2. Filter */}
        <DataFilter
          searchPlaceholder="Cari grup..."
          searchValue={search}
          onSearchChange={handleSearch}
          filters={[]}
          onReset={() => {
            setSearch("");
            setPerPage(100);
            router.get(
              route("admin.users.index"),
              { section: "groups", search: "", per_page: 100 },
              { preserveState: true, preserveScroll: true, replace: true },
            );
          }}
        />

        <div className="mb-4 flex items-center justify-end gap-2 text-xs text-gray-600">
          <span className="font-bold uppercase tracking-wide">Tampilkan</span>
          <select
            value={perPage}
            onChange={(e) => handlePerPageChange(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
            <option value="100">100</option>
            <option value="500">500</option>
            <option value="all">Semua</option>
          </select>
        </div>

        {/* 3. Table */}
        <Table
          data={groups.data || []}
          emptyMessage="Belum ada grup dibuat."
          columns={columns}
        />

        {/* 4. Pagination */}
        <div className="mt-4">
          {groups.links && <Pagination links={groups.links} />}
        </div>
      </div>

      {/* 5. Modal */}
      <GroupingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isEditMode={editMode}
        data={data}
        setData={setData}
        errors={errors}
        processing={processing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
