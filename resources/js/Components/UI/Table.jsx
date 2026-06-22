import React from "react";

export default function Table({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = "Tidak ada data ditemukan",
  onRowClick,
  renderActions,
}) {
  if (isLoading) {
    return (
      <div className="w-full bg-white p-6 rounded-xl border border-gray-200">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-100 rounded w-full"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-50 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
        <span className="material-icons text-5xl mb-2">inventory_2</span>
        <p className="font-bold uppercase tracking-widest text-sm">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      {/* Desktop View: Traditional Table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full border-collapse bg-white text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-4 text-gray-700 ${col.className || ""}`}>
                  {col.label}
                </th>
              ))}
              {renderActions && (
                <th className="px-6 py-4 text-right font-bold text-gray-600">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, idx) => (
              <tr
                key={idx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`
                                    transition-colors
                                    ${onRowClick ? "cursor-pointer" : ""}
                                capitalize`}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-6 py-4 font-medium text-gray-700 ${col.className || ""}`}>
                    {col.render ? col.render(row[col.key], row, idx) : row[col.key]}
                  </td>
                ))}
                {renderActions && (
                  <td
                    className="px-6 py-4 text-right"
                    onClick={(e) => e.stopPropagation()}>
                    {renderActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View: Card List */}
      <div className="md:hidden space-y-4">
        {data.map((row, idx) => (
          <div
            key={idx}
            className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            {columns.map((col) => (
              <div
                key={col.key}
                className="flex justify-between items-start border-b border-gray-50 pb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {col.label}
                </span>
                <span className="text-sm font-bold text-gray-700 text-right">
                  {col.render ? col.render(row[col.key], row, idx) : row[col.key]}
                </span>
              </div>
            ))}
            {renderActions && (
              <div className="flex justify-end pt-2">{renderActions(row)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
