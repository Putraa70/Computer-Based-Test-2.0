import React, { useState, useEffect } from "react";
import { router, Link } from "@inertiajs/react";
import { Clock, RefreshCw, Hash, Eye, ChevronDown } from "lucide-react";

export default function Analitics({ tests = [], currentTestId, participants = [] }) {
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Auto Refresh
  useEffect(() => {
    let interval;
    if (isAutoRefresh) {
      interval = setInterval(() => {
        router.reload({
          only: ['participants'],
          preserveScroll: true,
          onSuccess: () => setLastUpdated(new Date())
        });
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isAutoRefresh]);

  const handleTestChange = (e) => {
    const testId = e.target.value;
    if (!testId) return;

    setIsLoading(true); // Mulai loading
    router.get(route('admin.tests.index'), {
        section: 'analytics',
        test_id: testId
    }, {
        onFinish: () => setIsLoading(false) // Selesai loading
    });
  };

  // Helper Warna Status (Sama seperti sebelumnya)
  const getStatusBadge = (status) => {
    switch(status) {
        case 'ongoing': return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full animate-pulse">Mengerjakan</span>;
        case 'submitted': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Selesai</span>;
        default: return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">Belum Mulai</span>;
    }
  };

  return (
    <div className="space-y-6 pb-20">

        {/* Header Controller */}
       <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-2/3">
                <div className="p-3 bg-blue-50 rounded-xl shrink-0">
                    <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 w-full relative">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
                        Pilih Ujian {isLoading && <span className="text-blue-500 animate-pulse ml-2">(Memuat...)</span>}
                    </label>

                    {/*  PERBAIKAN DROPDOWN DISINI */}
                    <div className="relative">
                        <select
                            value={currentTestId || ''}
                            onChange={handleTestChange}
                            disabled={isLoading}
                            className="block w-full pl-4 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg shadow-sm transition-all appearance-none cursor-pointer bg-white text-gray-900 font-medium disabled:bg-gray-100 disabled:text-gray-400"
                        >
                            <option value="" disabled>-- Pilih Jadwal Ujian --</option>
                            {Array.isArray(tests) && tests.length > 0 ? (
                                tests.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.title} — {t.duration} Menit
                                    </option>
                                ))
                            ) : (
                                <option disabled>Data ujian tidak tersedia</option>
                            )}
                        </select>
                        {/* Custom Icon Panah */}
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                            <ChevronDown className="h-4 w-4" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between w-full md:w-auto gap-4 pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0">
                <div className="text-left md:text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Update Terakhir</p>
                    <p className="text-sm font-mono font-bold text-gray-700">{lastUpdated.toLocaleTimeString()}</p>
                </div>
                <button
                    onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition shadow-sm border ${
                        isAutoRefresh
                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                >
                    <RefreshCw className={`w-4 h-4 ${isAutoRefresh ? 'animate-spin' : ''}`} />
                    {isAutoRefresh ? 'Live' : 'Paused'}
                </button>
            </div>
        </div>

        {/* Tabel Peserta (Kode tabel Anda tetap sama, tidak saya ubah agar fokus ke dropdown) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {Array.isArray(participants) && participants.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-bold w-16 text-center">No</th>
                                <th className="px-6 py-4 font-bold w-32">NPM</th>
                                <th className="px-6 py-4 font-bold">Nama Peserta</th>
                                <th className="px-6 py-4 font-bold text-center">Status</th>
                                <th className="px-6 py-4 font-bold text-center">Progress</th>
                                <th className="px-6 py-4 font-bold text-center">Mulai</th>
                                <th className="px-6 py-4 font-bold text-center">Selesai</th>
                                <th className="px-6 py-4 font-bold text-center">Nilai</th>
                                <th className="px-6 py-4 font-bold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {participants.map((p, index) => (
                                <tr key={p.id} className="hover:bg-blue-50/50 transition">
                                    <td className="px-6 py-4 text-center font-bold text-gray-500">{index + 1}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-gray-700 font-mono font-bold bg-gray-100 px-2 py-1 rounded w-fit text-xs">
                                            <Hash className="w-3 h-3 text-gray-400" />
                                            {p.user?.npm || p.user?.username || '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                {p.user?.name?.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-gray-900 truncate max-w-[200px]" title={p.user?.name}>
                                                    {p.user?.name}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                                    {p.user?.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">{getStatusBadge(p.status)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                                            {p.answered_count} Jawab
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-xs text-gray-500 font-mono">
                                        {p.started_at ? new Date(p.started_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center text-xs text-gray-500 font-mono">
                                        {p.finished_at ? new Date(p.finished_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : <span className="text-gray-300">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`inline-flex items-center gap-1 font-bold px-3 py-1 rounded-lg border ${p.score >= 70 ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                            {p.score ?? 0}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={route('admin.analytics.show', p.id)} className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">
                                            <Eye className="w-3.5 h-3.5" /> Detail
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50">
                    <div className="bg-white p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                        <Clock className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Belum ada peserta</h3>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">Silakan pilih ujian di atas atau tunggu peserta mulai login.</p>
                </div>
            )}
        </div>
    </div>
  );
}
