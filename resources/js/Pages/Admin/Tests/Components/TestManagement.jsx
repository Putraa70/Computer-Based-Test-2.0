import React, { useState, useMemo } from "react";
import { useForm, router, usePage } from "@inertiajs/react";
import Modal from "@/Components/UI/Modal";
import Button from "@/Components/UI/Button";
import TestTable from "./TestTable";
import TestForm from "./TestForm";
import DataFilter from "@/Components/Shared/DataFilter";
import { initialForm, transformForEdit } from "../Config/FormSchema";
import Pagination from "@/Components/UI/Pagination";

export default function TestManagement({
  tests,
  groups,
  topics,
  modules,
  isStatisticMode = false,
}) {
  const { filters } = usePage().props;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [params, setParams] = useState({
    search: filters?.search || "",
    module_id: filters?.module_id || "",
    group_id: filters?.group_id || "",
  });

  const refreshData = (newParams) => {
    setParams(newParams);
    const currentUrlParams = new URLSearchParams(window.location.search);
    const section = currentUrlParams.get("section");

    router.get(
      route("admin.tests.index"),
      { ...newParams, section },
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
        label: "Modul",
        value: params.module_id,
        options: modules.map((m) => ({ value: m.id, label: m.name })),
        onChange: (val) => refreshData({ ...params, module_id: val }),
      },
      {
        label: "Target Grup",
        value: params.group_id,
        options: groups.map((g) => ({ value: g.id, label: g.name })),
        onChange: (val) => refreshData({ ...params, group_id: val }),
      },
    ],
    [params, modules, groups],
  );

  const onSearch = (val) => {
    setParams((prev) => ({ ...prev, search: val }));
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      const currentUrlParams = new URLSearchParams(window.location.search);
      const section = currentUrlParams.get("section");

      router.get(
        route("admin.tests.index"),
        { ...params, search: val, section },
        { preserveState: true, preserveScroll: true, replace: true },
      );
    }, 400);
  };

  const {
    data,
    setData,
    post,
    put,
    processing,
    errors,
    reset,
    clearErrors,
    transform,
  } = useForm(initialForm);

  //  PERBAIKAN DI SINI: Transform Data sebelum Submit
  transform((data) => ({
    ...data,
    start_time: data.start_time ? data.start_time.replace("T", " ") : null,
    end_time: data.end_time ? data.end_time.replace("T", " ") : null,
    description: data.description || "",
    groups: Array.isArray(data.groups) ? data.groups : [],
    topics: Array.isArray(data.topics)
      ? data.topics.map((item) => {
          // Ambil ID dengan aman
          const topicId = typeof item === "object" ? item.id : item;

          let qty =
            typeof item === "object" && item.total_questions
              ? parseInt(item.total_questions)
              : 0;
          if (qty <= 0) qty = 10;

          return {
            id: topicId,
            total_questions: qty,
            question_type:
              typeof item === "object" && item.question_type
                ? item.question_type
                : "mixed",
          };
        })
      : [],
  }));

  const openModal = (test = null) => {
    clearErrors();
    if (test) {
      setEditMode(true);
      setSelectedId(test.id);
      setData(transformForEdit(test));
    } else {
      setEditMode(false);
      reset();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    clearErrors();

    // create atau update
    const action = editMode ? put : post;
    const url = editMode
        ? route('admin.tests.update', data.id)
        : route('admin.tests.store');

    action(url, {
      preserveScroll: true,
      preserveState: true,

      onSuccess: () => {
        setIsModalOpen(false);
        reset();
      },

      onError: (errors) => {
        console.log("Gagal simpan:", errors);
      },
    });
  };

  const paginatedTests = useMemo(() => {
    if (tests?.data) return tests;
    return { data: Array.isArray(tests) ? tests : [], links: [], meta: null };
  }, [tests]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-left">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isStatisticMode ? "Statistik & Analisis Ujian" : "Manajemen Ujian"}
          </h1>
          <p className="text-[11px] text-gray-500 font-semibold">
            {isStatisticMode
              ? "Pilih ujian untuk melihat laporan detail & analisis butir soal"
              : "Kelola Daftar & Konfigurasi CBT"}
          </p>
        </div>

        {!isStatisticMode && (
          <Button
            onClick={() => openModal()}
            className="bg-gradient-to-r bg-green-600 text-white text-xs font-bold px-6">
            Tambah Ujian
          </Button>
        )}
      </div>

      <div className="p-8">
        <DataFilter
          searchPlaceholder="Cari judul ujian..."
          searchValue={params.search}
          onSearchChange={onSearch}
          filters={filterConfig}
          onReset={() =>
            refreshData({ search: "", module_id: "", group_id: "" })
          }
        />

        <TestTable
          tests={paginatedTests.data || []}
          isStatisticMode={isStatisticMode}
          onEdit={openModal}
          onDelete={(id) =>
            confirm("Hapus ujian ini beserta seluruh data nilainya?") &&
            router.delete(route("admin.tests.destroy", id))
          }
        />

        {paginatedTests.meta && (
          <p className="text-[11px] text-gray-500 mt-4">
            Menampilkan {paginatedTests.meta.from}-{paginatedTests.meta.to} dari {paginatedTests.meta.total} ujian
          </p>
        )}

        {paginatedTests.links && paginatedTests.links.length > 0 && (
          <div className="mt-4 -mx-4 px-4">
            <Pagination links={paginatedTests.links} />
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editMode ? "Edit Ujian" : "Tambah Ujian"}
        size="lg">
        <form onSubmit={handleSubmit} className="p-1">
          {/* WRAPPING TOMBOL KE DALAM TESTFORM */}
          <TestForm
            data={data}
            setData={setData}
            errors={errors}
            groups={groups}
            topics={topics}
            modules={modules}>
            {/* ANAK (CHILDREN) MULAI DISINI */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                loading={processing}
                className="bg-green-600 px-8 text-white">
                Simpan
              </Button>
            </div>
            {/* ANAK SELESAI */}
          </TestForm>
        </form>
      </Modal>
    </div>
  );
}
