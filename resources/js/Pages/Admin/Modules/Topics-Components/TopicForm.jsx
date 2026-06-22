import React, { useState, useEffect } from "react";
import Button from "@/Components/UI/Button";
import Modal from "@/Components/UI/Modal";

export default function TopicForm({ isOpen, onClose, onSubmit, initialData }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  // Reset form saat modal dibuka/tutup atau data berubah
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
    // Kita kirim is_active: true secara default di belakang layar
    onSubmit({ ...form, is_active: true });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Topik" : "Tambah Topik Baru"}>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Nama Topik / Mata Kuliah
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="Contoh: Anatomi Dasar"
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
            className="w-full border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="Penjelasan singkat mengenai topik ini..."
          />
        </div>

        {/* Checkbox is_active SUDAH DIHAPUS DARI SINI */}

        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" className="bg-blue-600">
            {initialData ? "Simpan Perubahan" : "Buat Topik"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
