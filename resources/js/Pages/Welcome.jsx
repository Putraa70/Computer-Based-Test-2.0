import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Zap, BarChart3, ArrowRight, Shield } from 'lucide-react';

export default function Welcome() {
    const [loading, setLoading] = useState(false);

    const handleLogin = () => {
        setLoading(true);
        setTimeout(() => {
            router.visit(route('login'));
        }, 700);
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 font-sans">
            <Head title="CBT FK Unila" />

            {/* ===== Animated Background Pattern ===== */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Base Image */}
                <div className="absolute inset-0">
                    <img
                        src="/images/fk1.jpg"
                        alt="FK Unila"
                        className="w-full h-full object-cover opacity-20"
                    />
                </div>
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-slate-950/90 to-cyan-950/40" />
                
                {/* Animated Grid */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
                                         linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)`,
                        backgroundSize: '50px 50px'
                    }} />
                </div>

                {/* Floating Orbs */}
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -100, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        x: [0, -100, 0],
                        y: [0, 100, 0],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"
                />
            </div>

            {/* ===== Main Content ===== */}
            <AnimatePresence>
                {!loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="relative z-10 w-full max-w-6xl px-6 mx-auto"
                    >
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            
                            {/* ===== Left Side: Branding ===== */}
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2, duration: 0.6 }}
                                className="text-white space-y-8"
                            >
                                {/* Logo + Institution */}
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-emerald-500/30 blur-xl rounded-full" />
                                        <div className="relative p-3 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 backdrop-blur-sm rounded-2xl border border-white/10">
                                            <img
                                                src="/images/logo.png"
                                                alt="Unila"
                                                className=" h-14 object-contain"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Main Title */}
                                <div className="space-y-4">
                                    <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                                        Computer Based
                                        <br />
                                        <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                            Test System
                                        </span>
                                    </h1>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1 w-16 bg-gradient-to-r from-emerald-500 to-transparent rounded-full" />
                                        <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase">
                                            Next Generation
                                        </span>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-lg text-slate-300 leading-relaxed max-w-lg">
                                    Platform ujian digital dengan teknologi terkini, 
                                    dirancang untuk memberikan pengalaman testing yang aman, 
                                    stabil, dan terintegrasi penuh.
                                </p>

                                {/* Features Grid */}
                                <div className="grid grid-cols-3 gap-4 pt-4">
                                    {[
                                        { icon: Lock, label: 'Secure', desc: 'Enkripsi E2E' },
                                        { icon: Zap, label: 'Fast', desc: 'Real-time Sync' },
                                        { icon: BarChart3, label: 'Smart', desc: 'Auto Analysis' }
                                    ].map((item, i) => (
                                        <motion.div
                                            key={item.label}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 + i * 0.1 }}
                                            className="group"
                                        >
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-emerald-500/30 transition-all duration-300">
                                                <item.icon className="w-6 h-6 text-emerald-400 mb-2" />
                                                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                                                    {item.label}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    {item.desc}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* ===== Right Side: Login Card ===== */}
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3, duration: 0.6 }}
                                className="relative"
                            >
                                {/* Glow Effect */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-3xl blur-2xl opacity-20" />
                                
                                {/* Card */}
                                <div className="relative bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-10 shadow-2xl">
                                    
                                    {/* Card Header */}
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-bold text-white mb-2">
                                            Selamat Datang
                                        </h2>
                                        <p className="text-sm text-slate-400">
                                            Masuk ke sistem untuk memulai ujian
                                        </p>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <div className="text-2xl font-bold text-emerald-400">99.9%</div>
                                            <div className="text-xs text-slate-400 mt-1">Uptime</div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                                            <div className="text-2xl font-bold text-cyan-400">24/7</div>
                                            <div className="text-xs text-slate-400 mt-1">Support</div>
                                        </div>
                                    </div>

                                    {/* Login Button */}
                                    <motion.button
                                        onClick={handleLogin}
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 p-[2px] transition-all duration-300"
                                    >
                                        <div className="relative bg-slate-900 rounded-xl px-8 py-5 transition-all duration-300 group-hover:bg-transparent">
                                            <span className="relative z-10 font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2">
                                                Masuk ke Sistem
                                                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                                            </span>
                                        </div>
                                    </motion.button>

                                    {/* Security Badge */}
                                    <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                                        <Shield className="w-4 h-4 text-emerald-500" />
                                        <span>Koneksi Aman & Terenkripsi</span>
                                    </div>

                                    {/* Footer */}
                                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                                        <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em] font-semibold">
                                            Team IT FK Unila © {new Date().getFullYear()}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== Loading State ===== */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm"
                    >
                        <div className="text-center space-y-6">
                            {/* Spinner */}
                            <div className="relative w-20 h-20 mx-auto">
                                <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full" />
                                <div className="absolute inset-0 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin" />
                                <div className="absolute inset-2 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
                            </div>
                            
                            {/* Text */}
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-white tracking-wider uppercase">
                                    Memuat Sistem
                                </p>
                                <div className="flex items-center justify-center gap-1">
                                    <motion.div
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                                        className="w-2 h-2 bg-emerald-500 rounded-full"
                                    />
                                    <motion.div
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                                        className="w-2 h-2 bg-emerald-500 rounded-full"
                                    />
                                    <motion.div
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                                        className="w-2 h-2 bg-emerald-500 rounded-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}