import React from "react";

export default function ClassEmpty({ icon: Icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-300 text-center">
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      <p className="text-gray-500 text-sm mb-4 max-w-sm mx-auto">{desc}</p>
      {action && action}
    </div>
  );
}
