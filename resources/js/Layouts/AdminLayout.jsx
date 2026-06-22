import React, { useState } from "react";
import { Head } from "@inertiajs/react";
import Sidebar from "@/Components/Shared/Sidebar";
import Navbar from "@/Components/Shared/Navbar";
import FlashMessage from "@/Components/Shared/FlashMessage";

export default function AdminLayout({ children, title }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="h-screen w-full bg-gray-100 flex overflow-hidden">
      <Head title={title} />
    
      <Sidebar isVisible={isSidebarOpen} onToggle={toggleSidebar} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar pageTitle={title} onMenuClick={toggleSidebar} />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8 custom-scrollbar">
          <FlashMessage />
          <div className="max-w-7xl mx-auto min-h-full">
            {children}
          </div>
          
          <footer className="py-8 text-center text-xs text-blue-600/60 border-t mt-12">
            Sistem CBT  - Fakultas Kedokteran
          </footer>
        </main>
      </div>
    </div>
  );
}