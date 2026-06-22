import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import Table from '@/Components/UI/Table';
import axios from 'axios';

export default function Dashboard({ stats, latestTests }) {
    const [serverTime, setServerTime] = useState(new Date());

    useEffect(() => {
    const fetchServerTime = async () => {
        try {
            const response = await fetch('/api/time', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if(data.server_time) {
                    setServerTime(new Date(data.server_time));
                }
            }
        } catch (error) {
            console.error("Sync error:", error);
        }
    };

        fetchServerTime();
        const syncInterval = setInterval(fetchServerTime, 60_000);
        const tickInterval = setInterval(() => {
            setServerTime(prev => new Date(prev.getTime() + 1000));
        }, 1000);

        return () => {
            clearInterval(syncInterval);
            clearInterval(tickInterval);
        };
    }, []);

    const testColumns = [
        { 
            label: 'Judul Ujian', 
            key: 'title',
            render: (val) => <span className="font-semibold text-gray-900">{val}</span>
        },
        { 
            label: 'Modul', 
            key: 'module_name', 
            render: (val) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                    {val || '-'}
                </span>
            )
        },
        { 
            label: 'Topik', 
            key: 'topic_name',
            render: (val) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
                    {val || '-'}
                </span>
            )
        },
        { label: 'Waktu Mulai', key: 'start_time' },
        { label: 'Waktu Selesai', key: 'end_time' },
        { 
            label: 'Aksi', 
            key: 'id', 
            render: (id) => (
                <button className="text-emerald-600 hover:text-emerald-800 hover:underline text-xs font-bold transition-colors">
                    Detail
                </button>
            ) 
        },
    ];

    return (
        <AdminLayout>
            <Head title="Dasboard Admin" />

            <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
                {/* 1. Header Section */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Monitor Sistem</h1>
                    <p className="text-gray-500 text-sm mt-1">Status real-time sistem manajemen CBT FK UNILA.</p>
                </div>

                {/* 2. Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <StatCard 
                        label="Total Peserta" 
                        value={stats.totalUsers} 
                        icon="people" 
                        color="bg-blue-500" 
                    />
                    <StatCard 
                        label="Total Ujian" 
                        value={stats.totalTests} 
                        icon="assignment" 
                        color="bg-[#00a65a]" 
                    />
                    <StatCard 
                        label="Ujian Aktif" 
                        value={stats.activeTests} 
                        icon="verified" 
                        color="bg-orange-500" 
                    />
                    <StatCard 
                        label="Sesi Berlangsung" 
                        value={stats.ongoingTests} 
                        icon="timer" 
                        color="bg-purple-600" 
                    />
                </div>

                {/* 3. Tabel Ujian Terbaru (Sekarang Full Width) */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                        <span className="material-icons text-gray-400 text-sm">history</span>
                        <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Jadwal Ujian Terbaru</h2>
                    </div>
                    <div className="p-5 overflow-x-auto">
                        <Table 
                            columns={testColumns} 
                            data={latestTests} 
                            emptyMessage="Belum ada ujian yang dijadwalkan."
                        />
                    </div>
                </div>

                {/* 4. Panel Kondisi Sistem (Footer Style - Di Bawah) */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                        <span className="material-icons text-gray-400 text-sm">dns</span>
                        <h2 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Status Infrastruktur</h2>
                    </div>
                    
                    {/* Layout Grid Horizontal agar terlihat seperti Status Bar */}
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
                        <HealthItem label="Koneksi Database" status="stabil" />
                        <HealthItem label="Protokol Inertia" status="aktif" />
                        <HealthItem label="Layanan Mesin CBT" status="siap" />
                        
                        {/* Jam Server */}
                        <div className="flex flex-col md:items-end border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Waktu Server</p>
                            <div className="flex items-center gap-2 text-gray-900">
                                <span className="material-icons text-gray-400 text-sm">schedule</span>
                                <span className="text-lg font-mono font-bold tracking-tight">
                                    {serverTime.toLocaleTimeString('id-ID', { hour12: false })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </AdminLayout>
    );
}

// Kartu Statistik
const StatCard = ({ label, value, icon, color }) => (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center gap-4">
        <div className={`${color} p-3 rounded-lg text-white shadow-sm`}>
            <span className="material-icons text-2xl">{icon}</span>
        </div>
        <div>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

// Item Status (Dipercantik)
const HealthItem = ({ label, status }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {status}
        </span>
    </div>
);