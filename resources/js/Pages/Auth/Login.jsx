import React from 'react'
import { Head, useForm, usePage } from '@inertiajs/react' // Tambah usePage
import { motion, AnimatePresence } from 'framer-motion'
import { 
    User, 
    LockKeyhole, 
    LogIn, 
    ShieldCheck, 
    Activity,
    AlertCircle // Icon untuk alert
} from 'lucide-react'

import Input from '@/Components/UI/Input'
import Button from '@/Components/UI/Button'

export default function Login() {
    // Ambil errors dan flash secara global dari props Inertia
    const { errors: globalErrors, flash } = usePage().props;

    const { data, setData, post, processing, errors, reset } = useForm({
        login: '',
        password: '',
        remember: false,
    })

    const submit = (e) => {
        e.preventDefault()
        post(route('login'), {
            onFinish: () => reset('password'),
        })
    }

    // Varians Animasi
    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: "easeOut" }
    }

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-gradient-to-br from-slate-50 to-slate-100 font-sans overflow-hidden">
            <Head title="Login CBT FK Unila" />
            
            {/* ================= LEFT (Visual & Branding) ================= */}
            <div className="relative hidden lg:flex items-center justify-center overflow-hidden">
                <motion.img
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1.05, opacity: 1 }}
                    transition={{ duration: 1.5 }}
                    src="/images/fk.jpg"
                    alt="Fakultas Kedokteran Unila"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-950/90 via-emerald-900/80 to-slate-900/90" />

                <motion.div 
                    initial="initial"
                    animate="animate"
                    className="relative z-10 max-w-xl px-16 text-white"
                >
                    <motion.div variants={fadeInUp} className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-400/20 rounded-lg backdrop-blur-md">
                            <ShieldCheck className="w-8 h-8 text-emerald-400" />
                        </div>
                        <span className="tracking-widest uppercase text-sm font-bold text-emerald-300">New System</span>
                    </motion.div>
                    
                    <motion.h1 variants={fadeInUp} className="text-6xl font-extrabold leading-tight tracking-tighter">
                        Computer<br />
                        <span className="text-emerald-400 font-black italic">Based Test</span>
                    </motion.h1>
                    
                    <motion.div variants={fadeInUp} className="mt-6 h-1.5 w-24 bg-emerald-400 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.6)]" />
                    
                    <motion.p variants={fadeInUp} className="mt-8 text-lg text-emerald-100/90 leading-relaxed font-light">
                        Platform ujian terkomputerisasi mutakhir 
                        <span className="block font-semibold text-white mt-1">Fakultas Kedokteran Universitas Lampung</span>
                    </motion.p>
                </motion.div>
            </div>

            {/* ================= RIGHT (Form Login) ================= */}
            <div className="flex items-center justify-center px-6 py-12 relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Activity className="w-64 h-64 text-emerald-900" />
                </div>

                <motion.div 
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="w-full max-w-md rounded-[2.5rem] bg-white/70 backdrop-blur-2xl border border-white shadow-2xl shadow-slate-200/50 overflow-hidden"
                >
                    <div className="px-10 pt-12 pb-4 text-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.5 }}
                        >
                            <img
                                src="/images/logo.png"
                                alt="Universitas Lampung"
                                className="mx-auto w-20 mb-4 drop-shadow-md"
                            />
                        </motion.div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                            Login CBT
                        </h2>
                        
                        {/* GLOBAL ERROR ALERT SYSTEM */}
                        <AnimatePresence mode="wait">
                            {(errors.login || flash?.error || globalErrors?.message) && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mt-4 mx-2 p-3 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 text-xs font-bold shadow-sm"
                                >
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <p className="text-left">
                                        {errors.login || flash?.error || globalErrors?.message || "Terjadi kesalahan sistem."}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <form onSubmit={submit} className="px-10 pb-12 space-y-5">
                        <div className="space-y-1">
                            <Input
                                label="Email / NPM"
                                value={data.login}
                                icon={User}
                                onChange={e => setData('login', e.target.value)}
                                placeholder="Masukkan Email atau NPM"
                                className="rounded-2xl border-slate-200 focus:ring-emerald-500 transition-all"
                            />
                        </div>

                        <div className="space-y-1">
                            <Input
                                label="Password"
                                type="password"
                                icon={LockKeyhole}
                                value={data.password}
                                onChange={e => setData('password', e.target.value)}
                                error={errors.password}
                                placeholder="••••••••"
                                className="rounded-2xl border-slate-200 focus:ring-emerald-500 transition-all"
                            />
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={e => setData('remember', e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 transition-colors"
                                />
                                <span className="group-hover:text-slate-900 transition-colors font-medium">Tetap masuk</span>
                            </label>
                            <a href="#" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">Lupa Password?</a>
                        </div>

                        <Button
                            type="submit"
                            isLoading={processing}
                            className="w-full py-4 text-white font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <LogIn className="w-5 h-5" />
                            Masuk Sekarang
                        </Button>

                        <p className="text-center text-[10px] text-slate-400 font-medium pt-4 uppercase tracking-widest">
                            &copy; {new Date().getFullYear()} Team IT FK Unila
                        </p>
                    </form>
                </motion.div>
            </div>
        </div>
    )
}