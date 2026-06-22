import React, { useState, useEffect } from "react";
import Button from "@/Components/UI/Button";
import Modal from "@/Components/UI/Modal";

export default function ClassForm({ isOpen, onClose, onSubmit, initialData }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setForm({
        name: initialData.name || "",
        description: initialData.description || "",
      });
    } else {
      setForm({ name: "", description: "" });
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, is_active: true });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Modul" : "Tambah Modul Baru"}>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Nama Modul
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Contoh: Biomedik Dasar"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Deskripsi (Opsional)
          </label>
          <textarea
            rows="3"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Keterangan singkat mengenai modul ini..."
          />
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {initialData ? "Simpan Perubahan" : "Buat Modul"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
