import React, { useState, useMemo } from "react";
import { Head, usePage, useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import Modal from "@/Components/UI/Modal";
import Button from "@/Components/UI/Button";
import UserForm from "@/Features/UserManagement/Components/UserForm";

// Import Sub-views
import Management from "./Management";
import Grouping from "./Grouping";
import Online from "./Online";
import Selection from "./Selection";
import Import from "./Import";
import Results from "./Results";

export default function Index({ users = [], groups = [], totalOnline = 0 }) {
  const { url, props } = usePage();
  // Mengambil flash secara eksplisit dari props
  const { flash } = props;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Resolver Section berdasarkan query parameter ?section=
  const section = useMemo(() => {
    const params = new URLSearchParams(url.split("?")[1]);
    return params.get("section") || "management";
  }, [url]);

  // Form Hook untuk Management User
  const { data, setData, post, put, processing, errors, reset, clearErrors } =
    useForm({
      name: "",
      npm: "",
      email: "",
      role: "peserta",
      groups: [],
    });

  const openModal = (user = null) => {
    clearErrors();
    if (user) {
      setEditMode(true);
      setSelectedId(user.id);
      setData({
        name: user.name || "",
        npm: user.npm || "",
        email: user.email || "",
        role: user.role || "peserta",
        groups: user.groups ? user.groups.map((g) => g.id) : [],
      });
    } else {
      setEditMode(false);
      setSelectedId(null);
      reset();
    }
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

    if (editMode) {
      put(route("admin.users.update", selectedId), options);
    } else {
      post(route("admin.users.store"), options);
    }
  };

  const renderSection = () => {
    // Shared props yang akan diteruskan ke sub-views
    const commonProps = { users, groups, flash };

    switch (section) {
      case "management":
        return (
          <Management
            {...commonProps}
            onAddClick={() => openModal()}
            onEditClick={(user) => openModal(user)}
          />
        );
      case "groups":
        // Menambahkan flash agar notifikasi GroupController tampil
        return <Grouping groups={groups} flash={flash} />;
      case "selection":
        return <Selection {...commonProps} />;
      case "online":
        return (
          <Online {...commonProps} users={users} totalOnline={totalOnline} />
        );
      case "import":
        return <Import flash={flash} />;
      case "individual":
        return <Results users={users} />;
      default:
        return (
          <Management
            {...commonProps}
            onAddClick={() => openModal()}
            onEditClick={(user) => openModal(user)}
          />
        );
    }
  };

  return (
    <AdminLayout>
      <Head
        title={`Manajemen Pengguna - ${section.charAt(0).toUpperCase() + section.slice(1)}`}
      />

      <div className="space-y-6">
        {/* Render Sub-view aktif berdasarkan key section untuk reset animasi */}
        <div key={section} className="transition-all duration-300 ease-in-out">
          {renderSection()}
        </div>
      </div>

      {/* Modal CRUD User (Hanya untuk section Management/Selection) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editMode ? "Edit Pengguna" : "Tambah Pengguna Baru"}
        size="lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <UserForm
            data={data}
            setData={setData}
            errors={errors}
            groups={groups}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 text-sm font-medium">
              Batal
            </Button>
            <Button
              type="submit"
              loading={processing}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 text-sm font-medium transition-colors">
              {editMode ? "Perbarui" : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
