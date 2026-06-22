import React, { useState, useEffect } from "react";
import { Check, ArrowRightCircle } from "lucide-react";
import Modal from "@/Components/UI/Modal";
import Button from "@/Components/UI/Button";

export default function AssignGroupModal({
  isOpen,
  onClose,
  groups,
  selectedCount,
  onConfirm,
  isLoading,
}) {
  const [targetGroupIds, setTargetGroupIds] = useState([]);

  // Reset pilihan saat modal dibuka
  useEffect(() => {
    if (isOpen) setTargetGroupIds([]);
  }, [isOpen]);

  const toggleGroup = (groupId) => {
    setTargetGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId],
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Tambahkan ${selectedCount} Pengguna ke Grup`}
      size="md">
      <div className="p-6">
        <p className="text-sm text-gray-500 mb-4">
          Pilih grup tujuan. Pengguna akan <strong>ditambahkan</strong> ke grup
          berikut (grup lama tidak hilang):
        </p>

        {/* List Grup */}
        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-1 bg-gray-50 mb-6">
          {groups.length > 0 ? (
            groups.map((group) => {
              const isSelected = targetGroupIds.includes(group.id);
              return (
                <div
                  key={group.id}
                  onClick={() => toggleGroup(group.id)}
                  className={`flex items-center gap-3 p-3 cursor-pointer rounded-md transition-all ${
                    isSelected
                      ? "bg-indigo-50 border border-indigo-100"
                      : "hover:bg-white"
                  }`}>
                  <div
                    className={`w-5 h-5 flex items-center justify-center border rounded ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600"
                        : "border-gray-300 bg-white"
                    }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span
                    className={`text-sm font-medium ${isSelected ? "text-indigo-700" : "text-gray-700"}`}>
                    {group.name}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-sm text-gray-400">
              Belum ada grup tersedia.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button
            onClick={() => onConfirm(targetGroupIds)}
            disabled={targetGroupIds.length === 0 || isLoading}
            loading={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <ArrowRightCircle className="w-4 h-4 mr-2" />
            Proses
          </Button>
        </div>
      </div>
    </Modal>
  );
}
