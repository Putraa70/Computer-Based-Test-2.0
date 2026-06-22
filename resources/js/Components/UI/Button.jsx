import React from "react";
import { Loader2 } from "lucide-react";

export default function Button({
  children,
  type = "button",
  onClick,
  isLoading = false,
  variant = "primary",
  className = "",
}) {
  const baseStyles =
    "font-semibold rounded-lg transition-all flex items-center justify-center gap-1 py-2 px-[0.7rem] text-sm md:text-base active:scale-95 disabled:active:scale-100";

  const variants = {
    primary: "bg-[#00a65a] hover:bg-[#008d4c] text-white shadow-sm",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-sm",
    warning: "bg-yellow-400 hover:bg-yellow-500 text-bold shadow-sm",
    outline:
      "border-2 border-gray-200 bg-transparent hover:bg-gray-50 text-gray-700",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading}
      className={`
                ${baseStyles} 
                ${variants[variant] || variants.primary} 
                ${isLoading ? "opacity-70 cursor-not-allowed" : ""}
                ${className}
            `}>
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="opacity-90">Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
