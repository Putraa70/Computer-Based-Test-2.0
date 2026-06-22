import React, { useState } from 'react';
import SidebarPeserta from '@/Components/Shared/SidebarPeserta';
import NavbarPeserta from '@/Components/Shared/NavbarPeserta';
import { palettePeserta } from '@/constants/palette';

export default function PesertaLayout({ children }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const theme = palettePeserta.luxuryNature;

    return (
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: theme.bg }}>
            {/* Sidebar */}
            <SidebarPeserta 
                isOpen={isMobileMenuOpen} 
                setIsOpen={setIsMobileMenuOpen} 
                theme={theme}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <NavbarPeserta 
                    toggleSidebar={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                    theme={theme}
                />

                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto animate-fade-in-up">
                        {children}
                    </div>
                </main>
            </div>
            
            {/* Overlay for Mobile */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 md:hidden glass-effect"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}