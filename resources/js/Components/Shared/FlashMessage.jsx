//D:\Kuliah\Semester5\KP\TCExam\resources\js\Components\Shared\FlashMessage.jsx
import React, { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";

export default function FlashMessage() {
  const { flash } = usePage().props;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (flash.success || flash.error || flash.message) {
      setIsVisible(true);

      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [flash]);

  if (!isVisible) return null;

  return (
    /* Perbaikan: Menggunakan lebar responsif dan penempatan tengah pada mobile */
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 z-[9999] md:min-w-[300px] md:max-w-md animate-in fade-in slide-in-from-top-2 md:slide-in-from-right-4 duration-300">
      {/* Success Notification */}
      {flash.success && (
        <div
          className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 shadow-md rounded-r relative flex items-start sm:items-center"
          role="alert">
          <div className="flex items-center w-full pr-6">
            <span className="material-icons mr-2 shrink-0">check_circle</span>
            <div className="break-words overflow-hidden">
              <p className="font-bold leading-tight">Success</p>
              <p className="text-sm">{flash.success}</p>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 text-green-500 hover:text-green-700 focus:outline-none p-1">
            <span className="material-icons text-sm">close</span>
          </button>
        </div>
      )}

      {/* Error Notification */}
      {flash.error && (
        <div
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 shadow-md rounded-r relative flex items-start sm:items-center"
          role="alert">
          <div className="flex items-center w-full pr-6">
            <span className="material-icons mr-2 shrink-0">error</span>
            <div className="break-words overflow-hidden">
              <p className="font-bold leading-tight">Error</p>
              <p className="text-sm">{flash.error}</p>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700 focus:outline-none p-1">
            <span className="material-icons text-sm">close</span>
          </button>
        </div>
      )}

      {/* General Info Notification */}
      {flash.message && !flash.success && !flash.error && (
        <div
          className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 shadow-md rounded-r relative flex items-start sm:items-center"
          role="alert">
          <div className="flex items-center w-full pr-6">
            <span className="material-icons mr-2 shrink-0">info</span>
            <div className="break-words overflow-hidden">
              <p className="font-bold leading-tight">Information</p>
              <p className="text-sm">{flash.message}</p>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 text-blue-500 hover:text-blue-700 focus:outline-none p-1">
            <span className="material-icons text-sm">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
