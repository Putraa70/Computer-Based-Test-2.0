import React, { useEffect } from "react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  preventClose = false,
  loading = false,
}) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && !preventClose && !loading) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose, preventClose, loading]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-5xl",
    full: "max-w-[95vw]",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      {/* Backdrop click */}
      <div
        className="absolute inset-0"
        onClick={() => !preventClose && !loading && onClose()}></div>

      <div
        className={`
                relative bg-white w-full shadow-2xl transition-all transform
                rounded-t-3xl sm:rounded-2xl overflow-hidden
                flex flex-col max-h-[90vh] sm:max-h-[95vh]
                ${sizes[size]}
            `}>
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-semibold">
            {title}
          </h3>
          {!preventClose && (
            <button
              onClick={onClose}
              disabled={loading}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <span className="material-icons text-gray-500">close</span>
            </button>
          )}
        </div>

        {/* Body - Scrollable */}
        <div className="p-6 overflow-y-auto custom-scrollbar relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
              <div className="h-8 w-8 border-4 border-gray-200 border-t-[#00a65a] rounded-full animate-spin"></div>
            </div>
          )}
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t bg-gray-50 flex flex-col sm:flex-row justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
