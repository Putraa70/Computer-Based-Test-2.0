import React from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function DataFilter({
  searchPlaceholder = "cari data...",
  searchValue,
  onSearchChange,
  filters = [], // ini array config buat dropdown nya
  onReset,
}) {
  // ngitung kolom grid biar rapi. 1 buat search + sisa nya buat filter dropdown
  const gridCols = `md:grid-cols-${1 + filters.length}`;

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
      {/* header filter & tombol reset */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            filter & pencarian
          </span>
        </div>

        {/* tombol reset cuma muncul kalo user udah ngetik atau milih filter */}
        {(searchValue || filters.some((f) => f.value)) && (
          <button
            onClick={onReset}
            className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase flex items-center gap-1 transition-colors">
            <XMarkIcon className="w-3 h-3" /> reset
          </button>
        )}
      </div>

      {/* area inputan filter */}
      <div className={`grid grid-cols-1 ${gridCols} gap-6`}>
        {/* 1. search bar (ini pasti selalu ada) */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            pencarian
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-gray-200 rounded-xl text-xs font-semibold focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:bg-white hover:shadow-sm placeholder-gray-400"
            />
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        {/* 2. dropdown filters (dinamis sesuai props) */}
        {filters.map((filter, index) => (
          <div key={index}>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
              {filter.label}
            </label>
            <div className="relative">
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-gray-200 rounded-xl text-xs font-semibold focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:bg-white hover:shadow-sm appearance-none">
                <option value="">
                  {filter.placeholder ||
                    `-- Semua ${filter.label} --`}
                </option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* render icon kalo ada di config */}
              {filter.icon && (
                <filter.icon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
