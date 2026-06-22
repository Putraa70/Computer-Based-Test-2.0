import React from 'react';
import { Head, Link } from '@inertiajs/react';
import PesertaLayout from '@/Layouts/PesertaLayout';
import { palettePeserta } from '@/constants/palette';
import { Calendar, CheckCircle, Activity, ArrowRight } from 'lucide-react';

// Import Komponen Modular
import StatCard from './Components/StatCard';
import TestListItem from './Components/TestListItem'; 
import EmptyState from './Components/EmptyState'; // Asumsi file ini sudah ada dari screenshot

export default function Dashboard({ summary, recentTests }) {
    const theme = palettePeserta.luxuryNature;

    return (
        <PesertaLayout>
            <Head title="Dashboard" />

            <div className="space-y-8">
                {/* 1. Header & Greeting */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Peserta</h1>
                    <p className="text-gray-500 mt-1">Selamat datang! Berikut adalah ringkasan aktivitas ujian Anda.</p>
                </div>

                {/* 2. Statistik Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard 
                        title="Total Ujian" 
                        value={summary?.total_tests || 0} 
                        icon={Calendar} 
                        color="blue" 
                        theme={theme}
                    />
                    <StatCard 
                        title="Ujian Selesai" 
                        value={summary?.completed_tests || 0} 
                        icon={CheckCircle} 
                        color="emerald" 
                        theme={theme}
                    />
                    <StatCard 
                        title="Rata-rata Nilai" 
                        value={summary?.average_score ? Number(summary.average_score).toFixed(1) : '0'} 
                        icon={Activity} 
                        color="purple" 
                        theme={theme}
                    />
                </div>

                {/* 3. Tabel Jadwal Ujian (Modern SaaS List) */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    {/* Table Header */}
                    <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Jadwal Ujian Terbaru</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Prioritas ujian yang harus Anda kerjakan.</p>
                        </div>
                        <Link 
                            href="/peserta/tests" 
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 hover:underline"
                        >
                            Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {/* Table Column Titles (Desktop Only) */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-6">Detail Ujian</div>
                        <div className="col-span-2">Waktu</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2 text-right">Aksi</div>
                    </div>

                    {/* List Content */}
                    <div className="divide-y divide-gray-100">
                        {recentTests && recentTests.length > 0 ? (
                            recentTests.map((test) => (
                                <TestListItem key={test.id} test={test} theme={theme} />
                            ))
                        ) : (
                            // Fallback jika tidak ada data (menggunakan EmptyState.jsx atau custom div)
                            <div className="py-12 flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                    <Calendar className="w-6 h-6 text-gray-400" />
                                </div>
                                <h3 className="text-sm font-medium text-gray-900">Tidak ada jadwal aktif</h3>
                                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                                    Saat ini belum ada ujian yang ditugaskan kepada Anda.
                                </p>
                            </div>
                        )}
                    </div>
                    
                    {/* Table Footer */}
                    <div className="bg-gray-50 px-6 py-2 border-t border-gray-200">
                        <p className="text-[10px] text-gray-400 text-center sm:text-left">
                            Menampilkan {recentTests ? recentTests.length : 0} ujian terbaru
                        </p>
                    </div>
                </div>
            </div>
        </PesertaLayout>
    );
}