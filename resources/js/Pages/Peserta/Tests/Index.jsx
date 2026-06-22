import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import PesertaLayout from '@/Layouts/PesertaLayout';
import { palettePeserta } from '@/constants/palette';
import { Search, Filter } from 'lucide-react';
import TestListItem from '../Components/TestListItem';
import EmptyState from '../Components/EmptyState';

export default function Index({ tests }) {
    const theme = palettePeserta.luxuryNature;
    const [searchTerm, setSearchTerm] = useState('');

    // Client-side filtering (simple)
    const filteredTests = tests.filter(test => 
        test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (test.description && test.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <PesertaLayout>
            <Head title="Daftar Ujian" />

            <div className="space-y-6">
                {/* Header & Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Daftar Ujian</h1>
                        <p className="text-gray-500 mt-1">Cari dan pilih ujian yang ingin Anda kerjakan.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Cari ujian..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 w-full sm:w-64 transition-shadow"
                            />
                        </div>
                        <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors" title="Filter (Coming Soon)">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main Content List */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {/* Header Kolom (Desktop) */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-6">Detail Ujian</div>
                        <div className="col-span-2">Waktu</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2 text-right">Aksi</div>
                    </div>

                    {/* List Items */}
                    <div className="divide-y divide-gray-100">
                        {filteredTests.length > 0 ? (
                            filteredTests.map((test) => (
                                <TestListItem key={test.id} test={test} theme={theme} />
                            ))
                        ) : (
                            <EmptyState 
                                message={searchTerm ? "Tidak ditemukan ujian dengan kata kunci tersebut." : "Belum ada ujian yang tersedia saat ini."} 
                            />
                        )}
                    </div>

                    {/* Pagination Footer (Placeholder) */}
                    <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-xs text-gray-400">
                        Menampilkan {filteredTests.length} dari {tests.length} total ujian
                    </div>
                </div>
            </div>
        </PesertaLayout>
    );
}