import React, { useState, useMemo } from "react";
import { router, usePage } from "@inertiajs/react";
import { Pencil, Plus, Trash2 } from "lucide-react"; // import icon lucide
import Table from "@/Components/UI/Table";
import Button from "@/Components/UI/Button"; // pake komponen button kita
import Pagination from "@/Components/UI/Pagination";
import DataFilter from "@/Components/Shared/DataFilter";

export default function Management({ users, onAddClick, onEditClick }) {
  const { groups, filters } = usePage().props;

  const [params, setParams] = useState({
    search: filters?.search || "",
    group_id: filters?.group_id || "",
  });

  const refreshData = (newParams) => {
    setParams(newParams);
    router.get(
      route("admin.users.index"),
      { ...newParams, section: "management" },
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      },
    );
  };

  const filterConfig = useMemo(
    () => [
      {
        label: "Grup / Angkatan",
        value: params.group_id,
        options: groups.map((g) => ({ value: g.id, label: g.name })),
        onChange: (val) => refreshData({ ...params, group_id: val }),
      },
    ],
    [params, groups],
  );

  const onSearch = (val) => {
    setParams((prev) => ({ ...prev, search: val }));
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      router.get(
        route("admin.users.index"),
        { ...params, search: val, section: "management" },
        {
          preserveState: true,
          preserveScroll: true,
          replace: true,
        },
      );
    }, 400);
  };

  const handleDelete = (user) => {
    if (
      confirm(
        `Hapus pengguna ${user.name} (${user.role})?\nData ujian dan nilai pengguna ini juga akan ikut terhapus.`
      )
    ) {
      router.delete(route("admin.users.destroy", user.id), {
        preserveScroll: true,
      });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* header section */}
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5">
              <span className="material-icons">person</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Manajemen Pengguna
              </h1>
              <p className="text-[11px] text-gray-500 font-semibold">
                {users.total || 0} pengguna terdaftar dalam sistem
              </p>
            </div>
          </div>

          {/* tombol tambah pake component button + lucide icon */}
          <Button
            onClick={onAddClick}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-[0.7rem] py-2 text-sm transition-colors flex items-center gap-2">
            <span className="material-icons text-base">person_add</span>{" "}
            <span>Tambah Pengguna</span>
          </Button>
        </div>
      </div>

      <div className="p-6">
        <DataFilter
          searchPlaceholder="Cari nama atau NPM..."
          searchValue={params.search}
          onSearchChange={onSearch}
          filters={filterConfig}
          onReset={() => refreshData({ search: "", group_id: "" })}
        />

        <Table
          columns={[
            {
              label: "No",
              key: "no",
              className: "text-sm text-center w-16",
              render: (_, __, index) => {
                const currentPage = Number(users?.current_page) || 1;
                const perPage = Number(users?.per_page) || 50;
                const from = Number(users?.from) || ((currentPage - 1) * perPage + 1);
                const rowNumber = Number(from) + Number(index);
                return !isNaN(rowNumber) ? rowNumber : index + 1;
              },
            },
            {
              label: "NPM",
              key: "npm",
              className: "text-sm",
            },
            {
              label: "Nama",
              key: "name",
              className: "text-sm",
            },
            {
              label: "Role",
              key: "role",
              className: "text-sm text-center",
              render: (role) => (
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    role === "admin"
                      ? "bg-purple-100 text-purple-700 border border-purple-200"
                      : "bg-blue-100 text-blue-700 border border-blue-200"
                  }`}>
                  {role}
                </span>
              ),
            },
            {
              label: "Grup",
              className: "text-sm",
              key: "groups",
              render: (g) =>
                g && g.length > 0 ? (
                  g.map((i) => i.name).join(", ")
                ) : (
                  <span className="text-gray-400 italic">-</span>
                ),
            },
            // kolom aksi yang udah direfactor
            {
              label: "Aksi",
              key: "actions",
              className: "text-center",
              render: (_, user) => (
                <div className="flex justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick(user);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200 hover:border-amber-300"
                    title="Edit Data Pengguna">
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(user);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300"
                    title="Hapus Pengguna">
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                  </Button>
                </div>
              ),
            },
          ]}
          data={users.data || []}
          emptyMessage="Belum ada pengguna terdaftar"
          className="hover:bg-gray-50 transition-colors"
        />

        <div className="mt-4">
          {users.links && <Pagination links={users.links} />}
        </div>
      </div>
    </div>
  );
}
