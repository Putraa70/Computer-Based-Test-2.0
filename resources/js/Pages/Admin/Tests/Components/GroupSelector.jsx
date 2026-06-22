import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { ChevronDown, Search, X, Check, Users } from "lucide-react";

export default function GroupSelector({
  groups = [],
  selectedGroups = [],
  onChange,
  error,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropUp, setDropUp] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const selectedId = Array.isArray(selectedGroups)
    ? selectedGroups[0]
    : selectedGroups;

  // Smart Positioning Logic
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

  const handleSelect = (id) => {
    onChange([id]);
    setIsOpen(false);
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange([]);
    setSearchTerm("");
  };

  const currentGroup = groups.find((g) => g.id === selectedId);

  return (
    <div className="space-y-1 relative" ref={dropdownRef}>
      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
        Target Grup Mahasiswa
      </label>

      <div
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[42px] px-4 bg-white border rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
          isOpen
            ? "border-green-500 ring-4 ring-green-500/5"
            : "border-gray-200"
        }`}>
        <Users
          className={`w-4 h-4 ${
            currentGroup ? "text-green-600" : "text-gray-400"
          }`}
        />
        <div className="flex-1 truncate text-xs font-bold text-gray-700">
          {currentGroup ? currentGroup.name : "Pilih Grup..."}
        </div>

        {currentGroup && (
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
          className={`absolute z-[150] w-full bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-in  duration-200 ${
            dropUp
              ? "bottom-full mb-2 slide-in-from-bottom-2"
              : "top-full mt-2 slide-in-from-top-2"
          }`}>
          <div className="p-2 border-b bg-gray-50/50">
            <input
              type="text"
              placeholder="Cari grup..."
              className="w-full px-3 py-2 bg-white border rounded-lg text-xs outline-none focus:border-green-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="max-h-52 overflow-y-auto custom-scrollbar p-1">
            {groups
              .filter((g) =>
                g.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((g) => (
                <div
                  key={g.id}
                  onClick={() => handleSelect(g.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer ${
                    g.id === selectedId
                      ? "bg-green-50 text-green-700"
                      : "hover:bg-gray-50 text-gray-600"
                  }`}>
                  <span className="text-xs font-bold">{g.name}</span>
                  {g.id === selectedId && <Check className="w-3.5 h-3.5" />}
                </div>
              ))}
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
