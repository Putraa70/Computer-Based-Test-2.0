import React, { useState, useMemo } from "react";
import { router } from "@inertiajs/react";
import Button from "@/Components/UI/Button";
import DataFilter from "@/Components/Shared/DataFilter";

import TopicForm from "./Topics-Components/TopicForm";
import TopicTable from "./Topics-Components/TopicTable";
import TopicEmpty from "./Topics-Components/TopicEmpty";

import {
  PlusIcon,
  BookOpenIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";

export default function Topics({ modules, topics }) {
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);

  // config filter
  const filterConfig = useMemo(
    () => [
      {
        label: "Filter Modul",
        value: selectedModuleId,
        options: [...modules.map((m) => ({ value: m.id, label: m.name }))],
        onChange: (val) => setSelectedModuleId(val),
      },
    ],
    [modules, selectedModuleId],
  );

  // logic filter
  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const matchModule = selectedModuleId
        ? t.module_id === Number(selectedModuleId)
        : true;
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
      return matchModule && matchSearch;
    });
  }, [topics, selectedModuleId, search]);

  const currentModule = selectedModuleId
    ? modules.find((m) => m.id === Number(selectedModuleId))
    : null;

  // handlers
  const handleSubmit = (formData) => {
    if (!selectedModuleId && !editingTopic) {
      alert(
        "Mohon pilih Modul di filter terlebih dahulu untuk menambahkan topik.",
      );
      return;
    }

    // Payload
    const payload = {
      module_id: editingTopic ? editingTopic.module_id : selectedModuleId,
      ...formData,
    };

    const options = {
      preserveScroll: true,
      onSuccess: () => {
        setShowModal(false);
        setEditingTopic(null);
      },
    };

    if (editingTopic) {
      router.put(
        route("admin.topics.update", editingTopic.id),
        payload,
        options,
      );
    } else {
      router.post(route("admin.topics.store"), payload, options);
    }
  };

  const handleReset = () => {
    setSearch("");
    setSelectedModuleId("");
  };

  const destroy = (id) => {
    if (!confirm("Hapus Topik ini? Soal di dalamnya juga akan terhapus!"))
      return;
    router.delete(route("admin.topics.destroy", id), { preserveScroll: true });
  };

  const openCreate = () => {
    if (!selectedModuleId) {
      alert("Silakan pilih spesifik Modul pada filter terlebih dahulu.");
      return;
    }
    setEditingTopic(null);
    setShowModal(true);
  };

  const openEdit = (topic) => {
    setEditingTopic(topic);
    setShowModal(true);
  };

  const goToQuestions = (topicId) => {
    router.get(route("admin.modules.index"), {
      section: "questions",
      module_id: selectedModuleId || "",
      topic_id: topicId,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpenIcon className="w-6 h-6 text-blue-600" />
            Manajemen Topik
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Daftar mata kuliah dan topik pembelajaran dapat dilihat di menu ini.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-green-600 shadow-lg shadow-blue-100 flex items-center gap-2">
          <span className="material-icons text-base">library_books</span>
          Tambah Topik
        </Button>
      </div>

      {/* filter bar */}
      <DataFilter
        searchPlaceholder="Cari nama topik..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filterConfig}
        hideReset={true}
        onReset={handleReset}
      />

      {/* table atau empty state */}
      {filteredTopics.length === 0 ? (
        <TopicEmpty
          icon={BookOpenIcon}
          title="Tidak Ditemukan"
          desc={
            selectedModuleId
              ? `Modul "${currentModule?.name}" belum memiliki topik.`
              : "Belum ada data topik yang sesuai pencarian."
          }
          action={
            selectedModuleId && (
              <Button onClick={openCreate} variant="outline">
                Buat Topik Pertama
              </Button>
            )
          }
        />
      ) : (
        // RENDER TABEL DISINI
        <TopicTable
          topics={filteredTopics}
          onEdit={openEdit}
          onDelete={destroy}
          onManage={goToQuestions}
        />
      )}

      {/* MODAL FORM */}
      <TopicForm
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        initialData={editingTopic}
      />
    </div>
  );
}
