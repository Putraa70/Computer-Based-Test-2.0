import React from "react";
import Button from "@/Components/UI/Button";

export default function GroupingHeader({ totalGroups, onAddClick }) {
  return (
    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5">
            <span className="material-icons text-gray-700">group</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Manajemen Grup
            </h1>
            <p className="text-[11px] text-gray-500 font-semibold">
              {totalGroups} Grup Terdaftar
            </p>
          </div>
        </div>

        <Button
          onClick={onAddClick}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-[0.7rem] py-2 text-sm transition-colors flex items-center gap-2">
          <span className="material-icons text-base">group_add</span>
          <span>Tambah Grup</span>
        </Button>
      </div>
    </div>
  );
}
