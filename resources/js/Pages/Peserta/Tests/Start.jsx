import React, { useState, useEffect, useRef } from "react";
import { Head, usePage, router, Link } from "@inertiajs/react";
import axios from "axios";
import {
    Menu,
    Clock,
    BookOpen,
    Calendar,
    AlertCircle,
    Lock,
    LogOut,
} from "lucide-react";
import Swal from "sweetalert2";
import DynamicError from "@/Pages/Errors/DynamicError";
import { useSecurityProtection } from "@/utils/preventCopy";

// Import Komponen Anak
import QuestionCard from "./Components/QuestionCard";
import Navigation from "./Components/Navigation";
import SubmitModal from "./Components/SubmitModal";

export default function Start({
    test,
    testUserId,
    questions,
    remainingSeconds,
    existingAnswers,
    lastIndex,
    currentUser,
}) {
    const { auth } = usePage().props;

    // 🔒 Enable anti-copy & anti-screenshot protection ketika SEB dinonaktifkan
    useSecurityProtection(test.require_seb);

    // --- STATE ---
    const [currentIndex, setCurrentIndex] = useState(lastIndex || 0);
    const [answers, setAnswers] = useState(existingAnswers || {});
    const [timeLeft, setTimeLeft] = useState(remainingSeconds);

    //  1. STATE LOCK (WAJIB ADA)
    const [isLocked, setIsLocked] = useState(false);
    const [lockMessage, setLockMessage] = useState("");

    //  2. REF (WAJIB ADA UNTUK INTERVAL)
    const isLockedRef = useRef(false);
    const timeLeftRef = useRef(timeLeft);

    // UI State
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [fatalError, setFatalError] = useState(null);

    const currentQuestion = questions[currentIndex];

    // --- HELPERS ---
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const answeredCount = questions.filter((q) => {
        const userAnswer = answers[q.id];
        return (
            userAnswer &&
            (userAnswer.answerId !== null ||
                (userAnswer.answerText && userAnswer.answerText.trim() !== ""))
        );
    }).length;

    // --- EFFECTS ---

    useEffect(() => {
        timeLeftRef.current = timeLeft;
    }, [timeLeft]);

    useEffect(() => {
        if (fatalError) return;
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [fatalError]);

    // --- LOGIC UTAMA: TIMER & POLLING ---
    useEffect(() => {
        if (fatalError) return;
        // A. Timer Mundur (Visual)
        const countdown = setInterval(() => {
            //  KODE INI YANG MEMBUAT WAKTU BERHENTI
            if (isLockedRef.current) {
                return; // Jangan kurangi waktu jika dikunci
            }

            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(countdown);
                    handleAutoSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // B. Polling Server
        const checkServerStatus = async () => {
            try {
                const url =
                    route("peserta.tests.check-status", testUserId) +
                    "?_t=" +
                    new Date().getTime();
                const response = await axios.get(url);
                const data = response.data;

                // --- HANDLE LOCKED ---
                if (data.status === "locked") {
                    if (!isLockedRef.current) {
                        isLockedRef.current = true;
                        setIsLocked(true);

                        // Update pesan admin
                        setLockMessage(
                            data.message || "Ujian dijeda pengawas.",
                        );

                        Swal.fire({
                            title: "UJIAN DIJEDA",
                            text: data.message,
                            icon: "warning",
                            showConfirmButton: false,
                            timer: 3000,
                        });
                    }
                    //  JANGAN UPDATE WAKTU DARI SERVER SAAT LOCKED
                    return;
                }

                // --- HANDLE UNLOCK ---
                if (isLockedRef.current && data.status === "ongoing") {
                    isLockedRef.current = false;
                    setIsLocked(false);
                    Swal.fire({
                        title: "Dilanjutkan!",
                        icon: "success",
                        timer: 1500,
                        showConfirmButton: false,
                    });
                }

                // --- SINKRONISASI WAKTU (Hanya saat TIDAK locked) ---
                if (!isLockedRef.current && data.remaining_seconds) {
                    const diff = data.remaining_seconds - timeLeftRef.current;

                    if (diff >= 45) {
                        const addedMinutes = Math.max(1, Math.round(diff / 60));
                        Swal.fire({
                            title: "Waktu Ditambah",
                            text: `Admin menambahkan ${addedMinutes} menit ke waktu ujian Anda.`,
                            icon: "info",
                            showConfirmButton: false,
                            timer: 2000,
                            timerProgressBar: true,
                        });
                    }

                    if (Math.abs(diff) > 3) setTimeLeft(data.remaining_seconds);
                }

                // --- HANDLE STOP ---
                if (
                    data.force_stop ||
                    data.status === "submitted" ||
                    data.status === "expired"
                ) {
                    window.location.href = route("peserta.dashboard");
                }
            } catch (error) {
                console.error(error);
            }
        };

        const poller = setInterval(checkServerStatus, 5000);

        return () => {
            clearInterval(countdown);
            clearInterval(poller);
        };
    }, [fatalError]);

    // --- NAVIGASI & UTILS ---
    useEffect(() => {
        const handleContext = (e) => e.preventDefault();
        document.addEventListener("contextmenu", handleContext);
        return () => document.removeEventListener("contextmenu", handleContext);
    }, []);

    const changeQuestion = (newIndex) => {
        if (isLockedRef.current) return; // Cegah ganti soal saat lock
        if (newIndex < 0 || newIndex >= questions.length) return;
        setCurrentIndex(newIndex);
        setIsSidebarOpen(false);
        axios
            .post(route("peserta.tests.update_progress", testUserId), {
                index: newIndex,
                question_id: questions[newIndex].id,
            })
            .catch(() => {});
    };

    const submitTest = () => {
        router.post(
            route("peserta.tests.submit", testUserId),
            {},
            { replace: true },
        );
    };

    const handleAutoSubmit = () => {
        Swal.fire({
            title: "Waktu Habis!",
            timer: 2000,
            showConfirmButton: false,
        }).then(() => submitTest());
    };

    const dateOption = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    };

    if (fatalError) {
        return (
            <DynamicError
                status={fatalError.status || 503}
                message={
                    fatalError.message ||
                    "Koneksi terputus. Silakan hubungi pengawas dan periksa jaringan Anda."
                }
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col relative">
            <Head title={`Ujian: ${test.title}`} />

            {/*  4. OVERLAY SCREEN SAAT DIKUNCI */}
            {isLocked && (
                <div className="fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur flex flex-col items-center justify-center text-white p-6 text-center transition-all duration-300">
                    <div className="bg-white/10 p-6 rounded-full mb-6 animate-pulse">
                        <Lock className="w-16 h-16 text-red-400" />
                    </div>

                    <h1 className="text-4xl font-bold mb-4 tracking-tight">
                        UJIAN DIJEDA
                    </h1>

                    <div className="bg-white/10 px-6 py-4 rounded-xl max-w-lg mb-8 border border-white/10">
                        <p className="text-yellow-300 font-bold mb-1 text-sm uppercase tracking-wider">
                            Pesan Pengawas:
                        </p>
                        <p className="text-white text-lg leading-relaxed">
                            "{lockMessage}"
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 items-center">
                        {/* Timer Statis (Beku) */}
                        <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10">
                            <Clock className="w-6 h-6 text-gray-400" />
                            <span className="font-mono text-2xl font-bold tracking-widest text-gray-400">
                                {formatTime(timeLeft)}
                            </span>
                        </div>

                        {/* Tombol Kembali ke Dashboard */}
                        <Link
                            href={route("peserta.dashboard")}
                            className="mt-4 flex items-center gap-2 px-6 py-2 bg-transparent border border-gray-600 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-all text-sm font-medium"
                        >
                            <LogOut className="w-4 h-4" />
                            Kembali ke Dashboard
                        </Link>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center px-4 md:px-6 fixed top-0 inset-x-0 z-30 justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-sm md:text-lg font-bold text-gray-900 line-clamp-1">
                            {test.title}
                        </h1>
                        <p className="text-xs text-gray-500">
                            Soal {currentIndex + 1} dari {questions.length}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Security Status Indicator */}
                    <div
                        className={`hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg ${
                            test.require_seb
                                ? "bg-blue-100 text-blue-700 border border-blue-300"
                                : "bg-red-100 text-red-700 border border-red-300"
                        }`}
                    >
                        <Lock className="w-3.5 h-3.5" />
                        <span>
                            {test.require_seb
                                ? "SEB Protected"
                                : "App Protected"}
                        </span>
                    </div>

                    {/* Time Display */}
                    <div className="hidden md:flex items-center gap-3 text-xs md:text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="font-mono font-bold text-gray-800">
                            {currentTime.toLocaleTimeString("id-ID")}
                        </span>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main
                className={`exam-protected flex-1 pt-20 pb-8 px-4 md:px-6 max-w-[1600px] mx-auto w-full grid grid-cols-12 gap-6 items-start ${isLocked ? "blur-sm pointer-events-none" : ""}`}
            >
                {/* Sidebar Navigasi */}
                <aside
                    className={`lg:col-span-3 lg:block lg:sticky lg:top-24 space-y-4 ${isSidebarOpen ? "fixed inset-0 z-40 bg-white p-4 overflow-y-auto block" : "hidden"}`}
                >
                    <div className="flex justify-between items-center lg:hidden mb-4">
                        <h3 className="font-bold text-lg">Navigasi Soal</h3>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="text-gray-500 p-2 hover:bg-gray-100 rounded-full"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="font-bold text-gray-800 mb-4 flex justify-between items-center text-sm">
                            Progress
                            <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-200">
                                {answeredCount}/{questions.length}
                            </span>
                        </h3>
                        <Navigation
                            questions={questions}
                            current={currentIndex}
                            answers={answers}
                            onJump={changeQuestion}
                        />
                    </div>
                    <button
                        onClick={() => setShowSubmitModal(true)}
                        disabled={isLocked}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all text-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Selesai Ujian
                    </button>
                </aside>

                {/* Kartu Soal */}
                <section className="col-span-12 lg:col-span-6 flex flex-col gap-6">
                    <QuestionCard
                        key={currentQuestion.id}
                        question={currentQuestion}
                        selectedAnswer={answers[currentQuestion.id]}
                        testUserId={testUserId}
                        onAnswer={(val) =>
                            !isLocked &&
                            setAnswers((prev) => ({
                                ...prev,
                                [currentQuestion.id]: val,
                            }))
                        }
                        onFatalError={setFatalError}
                    />
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm md:bg-transparent md:border-0 md:shadow-none md:p-0">
                        <button
                            onClick={() => changeQuestion(currentIndex - 1)}
                            disabled={currentIndex === 0 || isLocked}
                            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-50 font-bold shadow-sm transition-all"
                        >
                            ← Sebelumnya
                        </button>
                        <button
                            onClick={() => changeQuestion(currentIndex + 1)}
                            disabled={
                                currentIndex === questions.length - 1 ||
                                isLocked
                            }
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-bold shadow-md transition-all"
                        >
                            Selanjutnya →
                        </button>
                    </div>
                </section>

                {/* Sidebar Kanan (Timer) */}
                <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-24 space-y-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div
                            className={`px-5 py-3 border-b border-gray-200 text-xs font-bold uppercase tracking-wider flex justify-between items-center ${timeLeft < 300 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"}`}
                        >
                            <span>Sisa Waktu</span>
                            {isLocked ? (
                                <Lock className="w-4 h-4 text-red-500" />
                            ) : (
                                timeLeft < 300 && (
                                    <AlertCircle className="w-4 h-4 animate-pulse" />
                                )
                            )}
                        </div>
                        <div className="p-6 flex justify-center">
                            <div
                                className={`text-4xl font-mono font-bold tracking-widest ${isLocked ? "text-gray-400" : timeLeft < 300 ? "text-red-600 animate-pulse" : "text-gray-800"}`}
                            >
                                {isLocked ? "PAUSED" : formatTime(timeLeft)}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Peserta Ujian
                        </div>
                        <div className="p-5">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md shrink-0">
                                    {currentUser?.name?.charAt(0) || "U"}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h4 className="font-bold text-gray-900 text-sm truncate mb-1">
                                        {currentUser?.name || auth.user.name}
                                    </h4>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100 w-fit">
                                        <BookOpen className="w-3 h-3 text-gray-400" />
                                        <span className="font-mono tracking-wide">
                                            {currentUser?.npm ||
                                                auth.user.username ||
                                                "-"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </main>

            <SubmitModal
                isOpen={showSubmitModal}
                onClose={() => setShowSubmitModal(false)}
                testUserId={testUserId}
                unanswered={questions.length - answeredCount}
                onSubmit={submitTest}
            />
        </div>
    );
}
