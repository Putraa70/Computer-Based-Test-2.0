import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { ChevronDown, Search, Check, Layers, X } from "lucide-react";

export default function ModuleSelector({
  modules = [],
  value,
  onChange,
  error,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropUp, setDropUp] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  // Logic Deteksi Sisa Ruang Layar 
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setDropUp(spaceBelow < 250 && spaceAbove > spaceBelow);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedModule = modules.find((m) => m.id === value);
  const filtered = modules.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (id) => {
    onChange(id);
    setIsOpen(false);
    setSearchTerm("");
  };

  // Fungsi untuk membatalkan pilihan
  const clearSelection = (e) => {
    e.stopPropagation(); // Mencegah dropdown terbuka saat klik X
    onChange("");
    setSearchTerm("");
  };

  return (
    <div className="space-y-1 relative" ref={dropdownRef}>
      <label className="text-[11px] font-bold text-gray-500">
        Pilih Kelompok Modul
      </label>
      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[42px] px-4 bg-white border rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
          isOpen ? "border-blue-500 ring-4 ring-blue-500/5" : "border-gray-200"
        }`}>
        <Layers
          className={`w-4 h-4 ${
            selectedModule ? "text-blue-600" : "text-gray-400"
          }`}
        />
        <div className="flex-1 truncate text-xs font-bold text-gray-700">
          {selectedModule
            ? selectedModule.name.toUpperCase()
            : "PILIH MODUL..."}
        </div>

        {/* Tombol X untuk membatalkan pilihan */}
        {selectedModule && (
          <button
            type="button"
            onClick={clearSelection}
            className="p-1 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {isOpen && (
        <div
          className={`absolute z-[120] w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-200 ${
            dropUp
              ? "bottom-full mb-2 slide-in-from-bottom-2"
              : "top-full mt-2 slide-in-from-top-2"
          }`}>
          <div className="p-2 border-b bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <input
                type="text"
                placeholder="Cari Modul..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border rounded-lg text-[11px] outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto custom-scrollbar p-1">
            {filtered.length > 0 ? (
              filtered.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleSelect(m.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer ${
                    m.id === value
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-gray-50 text-gray-600"
                  }`}>
                  <span className="text-xs font-bold">
                    {m.name.toUpperCase()}
                  </span>
                  {m.id === value && <Check className="w-3.5 h-3.5" />}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-gray-400 italic">
                Data modul tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
      {error && (
        <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
