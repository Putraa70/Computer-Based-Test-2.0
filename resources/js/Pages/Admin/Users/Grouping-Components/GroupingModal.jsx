import React from "react";
import Modal from "@/Components/UI/Modal";
import Input from "@/Components/UI/Input";
import Button from "@/Components/UI/Button";

export default function GroupingModal({
  isOpen,
  onClose,
  isEditMode,
  data,
  setData,
  errors,
  processing,
  onSubmit,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Grup" : "Tambah Grup"}>
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        <Input
          label="Nama Grup"
          value={data.name}
          onChange={(e) => setData("name", e.target.value)}
          error={errors.name}
          placeholder="Contoh: Angkatan 2024"
          autoFocus
        />

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
            Keterangan
          </label>
          <textarea
            className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none min-h-[80px]"
            value={data.description}
            onChange={(e) => setData("description", e.target.value)}
            placeholder="Opsional..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            loading={processing}
            className="bg-green-600 text-white hover:bg-green-700">
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  );
}
