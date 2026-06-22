import React from 'react';
import { Link } from '@inertiajs/react';
import { Clock, Calendar, CheckCircle, Lock, AlertCircle, Play } from 'lucide-react';
import ExamStatusBadge from './ExamStatusBadge';

export default function TestListItem({ test, theme }) {
    // Helper: Render Tombol Aksi
    const renderActionButton = () => {
        const status = test.user_status;
        const baseBtnClasses = "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border w-full sm:w-auto";

        if (status === 'SELESAI') {
            return (
                <button disabled className={`${baseBtnClasses} text-emerald-700 bg-emerald-50 border-emerald-100 cursor-not-allowed opacity-70`}>
                    <CheckCircle className="w-3.5 h-3.5" /> Selesai
                </button>
            );
        }

        if (status === 'KADALUARSA') {
            return (
                <button disabled className={`${baseBtnClasses} text-red-600 bg-red-50 border-red-100 cursor-not-allowed opacity-70`}>
                    <Lock className="w-3.5 h-3.5" /> Ditutup
                </button>
            );
        }

        if (status === 'BELUM_MULAI') {
            return (
                <button disabled className={`${baseBtnClasses} text-gray-500 bg-gray-50 border-gray-200 cursor-not-allowed`}>
                    <AlertCircle className="w-3.5 h-3.5" /> Belum Mulai
                </button>
            );
        }

        // Action: LANJUTKAN atau KERJAKAN
        const isResume = status === 'LANJUTKAN';
        return (
            <Link
                href={route('peserta.tests.start', test.id)}
                className={`${baseBtnClasses} text-white shadow-sm hover:shadow-md hover:-translate-y-0.5`}
                style={{ background: theme.primary, borderColor: theme.primary }}
            >
                {isResume ? <Clock className="w-3.5 h-3.5 animate-pulse" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                {isResume ? 'Lanjutkan' : 'Kerjakan'}
            </Link>
        );
    };

    return (
        <div className={`group relative hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-0 ${test.user_status === 'LANJUTKAN' ? 'bg-blue-50/30' : ''}`}>
            <div className="p-4 sm:px-6 md:grid md:grid-cols-12 md:gap-4 md:items-center">
                
                {/* Column 1: Info Utama (Nama & Deskripsi) - Lebar 6 kolom */}
                <div className="md:col-span-6 mb-3 md:mb-0">
                    <div className="flex items-start gap-3">
                        <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 bg-gray-100 border border-gray-200 ${test.user_status === 'LANJUTKAN' ? 'bg-blue-100 text-blue-600 border-blue-200' : ''}`}>
                            {test.user_status === 'LANJUTKAN' ? <Clock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                                {test.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                {test.description || 'Tidak ada deskripsi tambahan.'}
                            </p>
                            {/* Mobile Meta (Hanya muncul di HP) */}
                            <div className="flex md:hidden items-center gap-3 mt-2 text-xs text-gray-400">
                                <span>{test.duration} Menit</span>
                                <span>•</span>
                                <span>{new Date(test.start_time).toLocaleDateString('id-ID')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: Waktu (Desktop Only) - Lebar 2 kolom */}
                <div className="hidden md:block md:col-span-2">
                    <div className="flex flex-col">
                        <span className="text-sm text-gray-700 font-medium tabular-nums">
                            {new Date(test.start_time).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {test.duration} mnt
                        </span>
                    </div>
                </div>

                {/* Column 3: Status - Lebar 2 kolom */}
                <div className="flex items-center justify-between md:block md:col-span-2 mb-3 md:mb-0">
                    <span className="md:hidden text-xs font-medium text-gray-500">Status:</span>
                    <ExamStatusBadge status={test.user_status} />
                </div>

                {/* Column 4: Action Button - Lebar 2 kolom */}
                <div className="flex justify-end md:col-span-2">
                    {renderActionButton()}
                </div>
            </div>
        </div>
    );
}