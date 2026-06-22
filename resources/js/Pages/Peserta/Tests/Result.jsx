import React from 'react';
import { Head, Link } from '@inertiajs/react';
import PesertaLayout from '@/Layouts/PesertaLayout';
import { CheckCircle, Eye, Calendar, Award } from 'lucide-react';
import EmptyState from '../Components/EmptyState';

export default function Index({ results }) {
    return (
        <PesertaLayout>
            <Head title="Riwayat Hasil Ujian" />

            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Riwayat Hasil</h1>
                    <p className="text-gray-500 mt-1">Lihat nilai dan detail jawaban ujian yang telah Anda selesaikan.</p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-5">Nama Ujian</div>
                        <div className="col-span-3">Tanggal Selesai</div>
                        <div className="col-span-2">Nilai Akhir</div>
                        <div className="col-span-2 text-right">Aksi</div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {results.length > 0 ? (
                            results.map((item) => (
                                <div key={item.id} className="p-4 sm:px-6 md:grid md:grid-cols-12 md:gap-4 md:items-center hover:bg-gray-50 transition-colors group">
                                    <div className="col-span-5 mb-2 md:mb-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-900">{item.test?.title}</h3>
                                                <p className="text-xs text-gray-500 line-clamp-1">{item.test?.description || 'Tanpa deskripsi'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-3 text-sm text-gray-600 flex items-center gap-2 mb-2 md:mb-0">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                        {new Date(item.finished_at).toLocaleDateString('id-ID', {
                                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </div>

                                    <div className="col-span-2 mb-3 md:mb-0">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                                            item.result?.total_score >= 70 
                                                ? 'bg-green-50 text-green-700 border-green-200' 
                                                : 'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                            <Award className="w-3.5 h-3.5" />
                                            {item.result?.total_score}
                                        </span>
                                    </div>

                                    <div className="col-span-2 flex justify-end">
                                        <Link 
                                            href={route('peserta.results.show', item.id)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            Detail
                                        </Link>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <EmptyState message="Belum ada riwayat ujian yang selesai." />
                        )}
                    </div>
                </div>
            </div>
        </PesertaLayout>
    );
}