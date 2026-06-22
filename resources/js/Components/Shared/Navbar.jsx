import React from "react";
import { Menu, UserCircle } from "lucide-react";

export default function Navbar({ pageTitle, onMenuClick }) {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 z-20 shrink-0">
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        {/* Mobile Menu Toggle - Lucide Menu Icon */}
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100 lg:hidden shrink-0 transition-colors"
          aria-label="Open Menu">
          <Menu className="w-6 h-6" />
        </button>

        <h2 className="text-lg md:text-xl font-semibold text-gray-800 truncate leading-tight">
          {pageTitle}
        </h2>
      </div>

      <div className="flex items-center gap-4 ml-4 shrink-0">
        {/* User Profile Section - Lucide UserCircle Icon */}
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 sm:bg-transparent py-1.5 px-2 sm:p-0 rounded-lg">
          <UserCircle className="w-6 h-6 text-gray-400 shrink-0" />
          <span className="hidden sm:inline-block truncate max-w-[100px] md:max-w-none">
            Admin
          </span>
        </div>
      </div>
    </header>
  );
}
