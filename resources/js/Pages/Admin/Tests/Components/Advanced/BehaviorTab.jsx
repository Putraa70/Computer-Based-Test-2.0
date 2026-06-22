import React from "react";

export default function BehaviorTab({ data, setData }) {
  const toggles = [
    { label: "Tampilkan Hasil ke Peserta", key: "results_to_users" },
  ];

  return (
    <div className="space-y-6 text-left">
      <h4 className="text-[11px] font-bold text-gray-400">
      </h4>

      <div className="grid grid-cols-1 gap-4">
        {toggles.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <span className="text-[12px] font-bold text-gray-700">
              {item.label}
            </span>
            <button
              type="button"
              onClick={() => setData(item.key, data[item.key] === 1 ? 0 : 1)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                data[item.key] === 1 ? "bg-blue-600" : "bg-gray-300"
              }`}>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  data[item.key] === 1 ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-[13px] font-bold">
          IP yang diizinkan
        </label>
        <input
          type="text"
          value={data.authorized_ip}
          onChange={(e) => setData("authorized_ip", e.target.value)}
          placeholder="Contoh: 192.168.1.*"
          className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
        />
      </div>
    </div>
  );
}
