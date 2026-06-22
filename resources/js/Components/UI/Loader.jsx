import React from "react";

export default function Loader({
  type = "page",
  text = "Memproses data...",
  size = "md",
  overlay = true,
  blurBackground = false,
}) {
  // Ukuran Spinner
  const sizes = {
    sm: "h-5 w-5 border-2",
    md: "h-10 w-10 border-4",
    lg: "h-16 w-16 border-8",
  };

  if (type === "skeleton") {
    return (
      <div className="animate-pulse space-y-4 w-full"> 
        <div className="h-10 bg-gray-200 rounded w-full"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-gray-100 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`
                ${sizes[size]} 
                border-gray-200 border-t-[#00a65a] 
                rounded-full animate-spin
            `}></div>
      {text && (
        <p className="text-sm font-bold text-gray-600 uppercase tracking-widest">
          {text}
        </p>
      )}
    </div>
  );

  if (type === "inline") return spinner;

  return (
    <div
      className={`
            ${overlay ? "fixed inset-0 z-[9999]" : "relative py-20"}
            ${blurBackground ? "backdrop-blur-sm" : ""}
            ${overlay ? "bg-white/80" : ""}
            flex items-center justify-center
        `}>
      {spinner}
    </div>
  );
}
