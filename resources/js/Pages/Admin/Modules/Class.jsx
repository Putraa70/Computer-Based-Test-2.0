import React, { useState } from "react";
import { router } from "@inertiajs/react";
import Button from "@/Components/UI/Button";
import DataFilter from "@/Components/Shared/DataFilter"; // Sekarang komponen ini DIPAKAI

// Import Komponen Modular
import ClassTable from "./Class-Components/ClassTable";
import ClassForm from "./Class-Components/ClassForm";
import ClassEmpty from "./Class-Components/ClassEmpty";

import { PlusIcon, AcademicCapIcon } from "@heroicons/react/24/outline";

export default function Class({ modules, filters }) {
  // State
  const [search, setSearch] = useState(filters?.search || "");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // --- HANDLERS ---

  // 1. Search Handler (Server-side)
  const handleSearch = (val) => {
    setSearch(val);
    router.get(
      route("admin.modules.index"),
      { section: "class", search: val },
      { preserveState: true, preserveScroll: true, replace: true },
    );
  };

  // 2. Reset Handler (Bersihkan pencarian)
  const handleReset = () => {
    setSearch("");
    router.get(route("admin.modules.index"), { section: "class" });
  };

  // 3. CRUD Handlers
  const handleSubmit = (formData) => {
    const options = {
      onSuccess: () => {
        setShowModal(false);
        setEditingItem(null);
      },
      preserveScroll: true,
    };

    if (editingItem) {
      router.put(
        route("admin.modules.update", editingItem.id),
        formData,
        options,
      );
    } else {
      router.post(route("admin.modules.store"), formData, options);
    }
  };

  const destroy = (id) => {
    if (
      !confirm(
        "Yakin ingin menghapus Modul ini? Semua Topik dan Soal di dalamnya juga akan terhapus!",
      )
    )
      return;
    router.delete(route("admin.modules.destroy", id), { preserveScroll: true });
  };

  const openCreate = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  // --- RENDER ---
  const hasData = modules?.data?.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <AcademicCapIcon className="w-6 h-6 text-emerald-600" />
            Manajemen Modul
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Kelola modul akademik utama (contoh: Blok Biomedik, Blok Klinis).
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 flex items-center gap-2">
          <span className="material-icons text-base">bookmark</span>
          Tambah Modul
        </Button>
      </div>

      {/* FILTER BAR (Sekarang menggunakan DataFilter Component) */}
      <DataFilter
        searchPlaceholder="Cari nama modul..."
        searchValue={search}
        onSearchChange={handleSearch}
        onReset={handleReset}
        hideReset={!search}
      />

      {/* CONTENT: TABLE ATAU EMPTY STATE */}
      {!hasData ? (
        <ClassEmpty
          icon={AcademicCapIcon}
          title="Tidak Ditemukan"
          desc={
            search
              ? `Tidak ada modul dengan nama "${search}".`
              : "Belum ada modul yang dibuat."
          }
          action={
            !search && (
              <Button onClick={openCreate} variant="outline">
                Buat Modul Pertama
              </Button>
            )
          }
        />
      ) : (
        <ClassTable modules={modules} onEdit={openEdit} onDelete={destroy} />
      )}

      {/* MODAL FORM */}
      <ClassForm
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        initialData={editingItem}
      />
    </div>
  );
}
