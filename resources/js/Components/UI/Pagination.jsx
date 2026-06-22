import React from 'react';
import { Link } from '@inertiajs/react';
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

export default function Pagination({ links = [] }) {
    // Jika link hanya 3 (Previous, 1, Next), berarti cuma 1 halaman. Tidak perlu tampil.
    if (links.length <= 3) return null;

    const isScrollable = links.length > 8;

    return (
        <div className={`${isScrollable ? 'overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pb-2' : ''}`}>
            <div className={`flex items-center gap-1 py-4 ${isScrollable ? 'min-w-max pr-6' : 'flex-wrap justify-center'}`}>
            {links.map((link, key) => {
                // Label handling (mengubah &laquo; menjadi icon)
                let label = link.label;
                if (link.label.includes('&laquo;')) label = <ChevronLeftIcon className="w-4 h-4" />;
                if (link.label.includes('&raquo;')) label = <ChevronRightIcon className="w-4 h-4" />;

                return link.url === null ? (
                    // Tombol Disabled (ex: Previous di halaman 1)
                    <div 
                        key={key} 
                        className="flex items-center justify-center min-w-[36px] h-9 px-3 text-sm text-gray-400 bg-white border border-gray-200 rounded-lg cursor-not-allowed opacity-60"
                    >
                        {label}
                    </div>
                ) : (
                    // Tombol Aktif
                    <Link
                        key={key}
                        href={link.url}
                        preserveScroll // Penting: Agar tidak scroll ke paling atas saat ganti page
                        preserveState // Penting: Agar filter modul/topik tidak hilang
                        className={`flex items-center justify-center min-w-[36px] h-9 px-3 text-sm font-medium border rounded-lg transition-all duration-200 ${
                            link.active 
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-100' 
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200'
                        }`}
                    >
                        {label}
                    </Link>
                );
            })}
            </div>
        </div>
    );
}