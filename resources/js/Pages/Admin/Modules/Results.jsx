import React from "react";

export default function Results() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Avg Score", val: "78.2", color: "blue" },
          { label: "Highest", val: "98.0", color: "green" },
          { label: "Lowest", val: "42.1", color: "red" },
          { label: "Reliability", val: "0.84", color: "purple" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-4 rounded-lg border shadow-sm"
          >
            <p className="text-[10px] uppercase font-black text-gray-400">
              {stat.label}
            </p>
            <p className={`text-2xl font-black text-${stat.color}-600`}>
              {stat.val}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <span className="font-bold text-gray-700">
            Detailed Analytics Per Topic
          </span>
          <button className="text-blue-600 text-xs font-bold uppercase tracking-widest">
            Export Analysis (PDF)
          </button>
        </div>

        <div className="p-20 text-center space-y-4">
          <span className="material-icons text-6xl text-gray-200">
            query_stats
          </span>
          <p className="text-gray-400 italic text-sm">
            Visual charts for Item Difficulty Index (P) and Discrimination Index
            (D) will appear after exam data is synchronized.
          </p>
        </div>
      </div>
    </>
  );
}
