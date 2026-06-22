import React, { useState } from 'react';
import { Menu, Bell, User, LogOut, X } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NavbarPeserta({ toggleSidebar, theme }) {
    const { auth } = usePage().props;
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    return (
        <>
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20 px-6 py-3 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={toggleSidebar} className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-lg font-semibold text-gray-800 hidden md:block">
                            Selamat Datang, <span style={{ color: theme.primary }}>{auth.user.name}</span>
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Notification */}
                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full relative transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                        </button>

                        {/* Profile Section */}
                        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-gray-800">{auth.user.name}</p>
                                <p className="text-xs text-gray-500">Peserta Ujian</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-500">
                                <User className="w-5 h-5 text-emerald-700" />
                            </div>
                            
                            {/* Tombol Logout Baru */}
                            <button 
                                onClick={() => setShowLogoutModal(true)}
                                className="ml-2 flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all duration-200 font-bold text-sm border border-red-100"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Keluar</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Modal Konfirmasi Logout */}
            <AnimatePresence>
                {showLogoutModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Overlay */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLogoutModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        
                        {/* Modal Box */}
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 text-center overflow-hidden"
                        >
                            <div className="absolute top-4 right-4">
                                <button onClick={() => setShowLogoutModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <LogOut className="w-10 h-10 text-red-600" />
                            </div>

                            <h3 className="text-xl font-bold text-slate-800 mb-2">Yakin Ingin Keluar?</h3>
                            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                                Pastikan semua jawaban Anda telah tersimpan. Sesi Anda akan dihentikan setelah Anda keluar.
                            </p>

                            <div className="flex flex-col gap-3">
                                <Link 
                                    href={route('logout')} 
                                    method="post" 
                                    as="button"
                                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                                >
                                    Ya, Keluar Sekarang
                                </Link>
                                <button 
                                    onClick={() => setShowLogoutModal(false)}
                                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Batalkan
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}