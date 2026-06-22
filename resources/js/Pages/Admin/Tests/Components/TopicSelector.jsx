import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { ChevronDown, Search, Check, BookOpen, X } from "lucide-react";

export default function TopicSelector({
  topics = [],
  selectedTopics = [],
  onChange,
  error,
  disabled,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropUp, setDropUp] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const extractTopicId = (value) => {
    if (!value) return "";
    if (Array.isArray(value)) {
      return extractTopicId(value[0]);
    }
    if (typeof value === "object") {
      return value.id ?? "";
    }
    return value;
  };

  const selectedId = extractTopicId(selectedTopics);
  const normalizedSelectedId = selectedId ? String(selectedId) : "";

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

  const currentTopic = topics.find(
    (t) => String(t.id) === normalizedSelectedId,
  );
  const filtered = topics.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className={`space-y-1 relative ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
      ref={dropdownRef}>
      <label className="text-[11px] font-bold text-gray-500">
        Pilih Mata Kuliah / Topik
      </label>
      <div
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-[42px] px-4 bg-white border rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
          isOpen ? "border-blue-500 ring-4 ring-blue-500/5" : "border-gray-200"
        }`}>
        <BookOpen
          className={`w-4 h-4 ${
            currentTopic ? "text-blue-600" : "text-gray-400"
          }`}
        />
        <div className="flex-1 truncate">
          <span
            className={`text-xs ${
              currentTopic ? "font-bold text-gray-700" : "text-gray-400"
            }`}>
            {disabled
              ? "PILIH MODUL DAHULU"
              : currentTopic
              ? currentTopic.name
              : "Pilih Mata Kuliah..."}
          </span>
        </div>

        {currentTopic && !disabled && (
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
          className={`absolute z-[110] w-full bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-200 ${
            dropUp
              ? "bottom-full mb-2 slide-in-from-bottom-2"
              : "top-full mt-2 slide-in-from-top-2"
          }`}>
          <div className="p-2 border-b bg-gray-50/50">
            <input
              type="text"
              placeholder="Cari Mata Kuliah..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-white border rounded-lg text-xs outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-52 overflow-y-auto custom-scrollbar p-1">
            {filtered.length > 0 ? (
              filtered.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={`flex flex-col px-3 py-2.5 rounded-xl cursor-pointer ${
                    String(t.id) === normalizedSelectedId
                      ? "bg-blue-50 text-blue-700"
                      : "hover:bg-gray-50 text-gray-600"
                  }`}>
                  <span className="text-xs font-bold uppercase">{t.name}</span>
                  <span className="text-[9px] opacity-60 font-black">
                    Mata Kuliah di Modul ini
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-gray-400">
                Tidak ada topik tersedia
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
