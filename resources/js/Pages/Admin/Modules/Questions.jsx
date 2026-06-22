import React, { useState, useMemo } from "react";
import { router } from "@inertiajs/react";
import Button from "@/Components/UI/Button";
import Pagination from "@/Components/UI/Pagination";
import CreateQuestion from "./CreateQuestion";

import {
    PencilSquareIcon,
    TrashIcon,
    PlusIcon,
    DocumentTextIcon,
    FolderIcon,
    BookOpenIcon,
    FunnelIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    CheckIcon,
} from "@heroicons/react/24/outline";

import "katex/dist/katex.min.css";
import "react-quill/dist/quill.snow.css";

export default function Questions({
    modules = [],
    topics = [],
    questions = null,
    summary = null,
    filters = {},
}) {
    const [isLoading, setIsLoading] = useState(false);

    // State untuk Modal
    const [showModal, setShowModal] = useState(false);
    const [mode, setMode] = useState("create");
    const [editingQuestion, setEditingQuestion] = useState(null);

    // State untuk bulk delete
    const [selectedIds, setSelectedIds] = useState([]);

    // --- LOGIC FILTERING ---
    const handleModuleChange = (moduleId) => {
        setIsLoading(true);
        router.get(
            route("admin.modules.index"),
            { section: "questions", module_id: moduleId },
            {
                preserveState: true,
                preserveScroll: true,
                only: ["topics", "questions", "summary", "filters"],
                onFinish: () => setIsLoading(false),
            },
        );
    };

    const handleTopicChange = (topicId) => {
        setIsLoading(true);
        router.get(
            route("admin.modules.index"),
            {
                section: "questions",
                module_id: filters.module_id,
                topic_id: topicId,
            },
            {
                preserveState: true,
                preserveScroll: true,
                only: ["questions", "filters"],
                onFinish: () => setIsLoading(false),
            },
        );
    };

    // --- LOGIC MODAL ---
    const openCreate = () => {
        setMode("create");
        setEditingQuestion(null);
        setShowModal(true);
    };

    const openEdit = (question) => {
        setMode("edit");
        setEditingQuestion(question);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingQuestion(null);
    };

    const handleDelete = (id) => {
        if (
            confirm(
                "Apakah Anda yakin ingin menghapus soal ini beserta jawabannya?",
            )
        ) {
            router.delete(route("admin.questions.destroy", id), {
                preserveScroll: true,
            });
        }
    };

    const questionList = questions?.data || [];

    // Bulk Delete Handler
    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        if (
            confirm(
                `⚠️ PERINGATAN!\n\nAnda akan menghapus ${selectedIds.length} soal beserta jawabannya.\nTindakan ini TIDAK BISA dibatalkan!\n\nLanjutkan?`,
            )
        ) {
            router.post(
                route("admin.questions.bulk-delete"),
                { ids: selectedIds },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => setSelectedIds([]),
                },
            );
        }
    };

    // Toggle select all
    const toggleSelectAll = () => {
        if (selectedIds.length === questionList.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(questionList.map((q) => q.id));
        }
    };

    // Toggle individual
    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
        );
    };

    // Checkbox Component
    const Checkbox = ({ checked }) => (
        <div
            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                checked
                    ? "bg-blue-600 border-blue-600"
                    : "bg-white border-gray-300 hover:border-blue-400"
            }`}
        >
            {checked && <CheckIcon className="w-4 h-4 text-white stroke-[3]" />}
        </div>
    );

    // Analysis & Recap
    const analysis = useMemo(() => {
        if (summary) return summary;
        if (!questionList.length) return null;

        const total = questionList.length;
        const expectedOptions = 5;
        const multipleChoice = questionList.filter(
            (q) => q.type === "multiple_choice",
        );

        // Soal PG tanpa jawaban benar
        const noCorrectAnswer = multipleChoice.filter(
            (q) => !q.answers?.some((a) => a.is_correct),
        );

        // Analisis jumlah opsi
        const optionCounts = {};
        multipleChoice.forEach((q) => {
            const count = q.answers?.length || 0;
            optionCounts[count] = (optionCounts[count] || 0) + 1;
        });

        // Soal dengan opsi kurang dari 2
        const incompleteOptions = multipleChoice.filter(
            (q) => (q.answers?.length || 0) < expectedOptions,
        );

        return {
            total,
            multipleChoice: multipleChoice.length,
            noCorrectAnswer: noCorrectAnswer.length,
            incompleteOptions: incompleteOptions.length,
            optionCounts,
            hasIssues:
                noCorrectAnswer.length > 0 || incompleteOptions.length > 0,
        };
    }, [summary, questionList]);

    return (
        <div className="space-y-6 duration-500">
            {/* --- SECTION 1: FILTER BAR --- */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
                {isLoading && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-100 overflow-hidden">
                        <div className="h-full bg-blue-500 animate-progress"></div>
                    </div>
                )}

                <div className="flex items-center gap-2 mb-4 text-gray-800">
                    <FunnelIcon className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-sm uppercase tracking-wide">
                        Filter Data
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Pilih Modul
                        </label>
                        <div className="relative">
                            <select
                                value={filters.module_id || ""}
                                onChange={(e) =>
                                    handleModuleChange(e.target.value)
                                }
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-gray-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:bg-white hover:shadow-sm"
                            >
                                <option value="">-- Semua Modul --</option>
                                {modules.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                            <FolderIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                        </div>
                    </div>

                    <div
                        className={`transition-all duration-300 ${!filters.module_id ? "opacity-50 pointer-events-none" : ""}`}
                    >
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Pilih Topik / Subject
                        </label>
                        <div className="relative">
                            <select
                                value={filters.topic_id || ""}
                                onChange={(e) =>
                                    handleTopicChange(e.target.value)
                                }
                                disabled={!filters.module_id}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-gray-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:bg-white hover:shadow-sm disabled:bg-gray-100"
                            >
                                <option value="">-- Pilih Topik --</option>
                                {topics.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                            <BookOpenIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECTION 2: LIST SOAL --- */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm min-h-[500px]">
                {/* Header Content */}
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                            Bank Soal
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {filters.topic_id && questions?.total ? (
                                <>
                                    Menampilkan{" "}
                                    <span className="font-bold text-gray-900">
                                        {questions.from}-{questions.to}
                                    </span>{" "}
                                    dari{" "}
                                    <span className="font-bold text-gray-900">
                                        {questions.total}
                                    </span>{" "}
                                    soal
                                </>
                            ) : (
                                "Silakan pilih filter di atas untuk menampilkan data"
                            )}
                        </p>
                    </div>

                    {filters.topic_id && (
                        <Button
                            onClick={openCreate}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Buat Soal Baru
                        </Button>
                    )}
                </div>

                {/* Content Body */}
                <div className="p-6">
                    {/* State: Filter Belum Dipilih */}
                    {!filters.topic_id && (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                                <FunnelIcon className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">
                                Filter Belum Lengkap
                            </h3>
                            <p className="text-gray-500 max-w-sm">
                                Pilih <strong>Modul</strong> dan{" "}
                                <strong>Topik</strong> pada panel filter di
                                atas.
                            </p>
                        </div>
                    )}

                    {/* State: Data Kosong */}
                    {filters.topic_id && questionList.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 border border-blue-100">
                                <ExclamationTriangleIcon className="w-10 h-10 text-blue-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">
                                Topik Ini Belum Ada Soal
                            </h3>
                            <Button onClick={openCreate} className="mt-4">
                                Buat Soal Pertama
                            </Button>
                        </div>
                    )}

                    {/* RECAP ANALYSIS - Tampil jika ada data */}
                    {filters.topic_id &&
                        questionList.length > 0 &&
                        analysis && (
                            <div className="mb-6 bg-gradient-to-br from-slate-50 via-white to-blue-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                                        <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                                        Ringkasan Bank Soal
                                    </h3>
                                    {analysis.hasIssues && (
                                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200 shadow-sm">
                                            ⚠️ Ada Masalah
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                    <div className="bg-white rounded-xl p-3 border border-blue-100 shadow-sm">
                                        <div className="text-xs text-gray-500 font-semibold mb-1">
                                            Total Soal
                                        </div>
                                        <div className="text-2xl font-black text-blue-600">
                                            {analysis.total}
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-sm">
                                        <div className="text-xs text-gray-500 font-semibold mb-1">
                                            Pilihan Ganda
                                        </div>
                                        <div className="text-2xl font-black text-purple-600">
                                            {analysis.multipleChoice}
                                        </div>
                                    </div>
                                    <div
                                        className={`bg-white rounded-xl p-3 border shadow-sm ${analysis.noCorrectAnswer > 0 ? "border-red-200 bg-red-50" : "border-emerald-100"}`}
                                    >
                                        <div className="text-xs text-gray-500 font-semibold mb-1">
                                            Tanpa Kunci
                                        </div>
                                        <div
                                            className={`text-2xl font-black ${analysis.noCorrectAnswer > 0 ? "text-red-600" : "text-emerald-600"}`}
                                        >
                                            {analysis.noCorrectAnswer}
                                        </div>
                                    </div>
                                    <div
                                        className={`bg-white rounded-xl p-3 border shadow-sm ${analysis.incompleteOptions > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-100"}`}
                                    >
                                        <div className="text-xs text-gray-500 font-semibold mb-1">
                                            Opsi Kurang (&lt;5)
                                        </div>
                                        <div
                                            className={`text-2xl font-black ${analysis.incompleteOptions > 0 ? "text-amber-600" : "text-emerald-600"}`}
                                        >
                                            {analysis.incompleteOptions}
                                        </div>
                                    </div>
                                </div>

                                {/* Detail Distribusi Opsi */}
                                {Object.keys(analysis.optionCounts).length >
                                    0 && (
                                    <div className="bg-white/80 rounded-xl p-3 border border-slate-200">
                                        <div className="text-xs font-bold text-gray-700 mb-2">
                                            Distribusi Jumlah Opsi:
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(
                                                analysis.optionCounts,
                                            )
                                                .sort(([a], [b]) => a - b)
                                                .map(([count, total]) => (
                                                    <span
                                                        key={count}
                                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                                            count < 2
                                                                ? "bg-red-100 text-red-700 border-red-200"
                                                                : count < 5
                                                                  ? "bg-amber-100 text-amber-700 border-amber-200"
                                                                  : "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                        }`}
                                                    >
                                                        {count} opsi: {total}{" "}
                                                        soal
                                                    </span>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Warning Messages */}
                                {analysis.hasIssues && (
                                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                                        <div className="flex items-start gap-2">
                                            <XCircleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-xs text-red-800">
                                                <strong className="font-bold">
                                                    Perhatian:
                                                </strong>
                                                <ul className="list-disc ml-4 mt-1 space-y-0.5">
                                                    {analysis.noCorrectAnswer >
                                                        0 && (
                                                        <li>
                                                            Ada{" "}
                                                            <strong>
                                                                {
                                                                    analysis.noCorrectAnswer
                                                                }{" "}
                                                                soal
                                                            </strong>{" "}
                                                            pilihan ganda tanpa
                                                            jawaban benar
                                                        </li>
                                                    )}
                                                    {analysis.incompleteOptions >
                                                        0 && (
                                                        <li>
                                                            Ada{" "}
                                                            <strong>
                                                                {
                                                                    analysis.incompleteOptions
                                                                }{" "}
                                                                soal
                                                            </strong>{" "}
                                                            dengan kurang dari 5
                                                            opsi jawaban
                                                        </li>
                                                    )}
                                                </ul>
                                                <p className="mt-1 text-xs">
                                                    Soal-soal ini tidak akan
                                                    berfungsi dengan baik dalam
                                                    ujian.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    {/* Bulk Action Bar - tampil ketika ada selection */}
                    {selectedIds.length > 0 && (
                        <div className="sticky top-0 z-20 bg-red-600 text-white rounded-xl shadow-lg p-4 mb-4 flex justify-between items-center animate-in slide-in-from-top-2">
                            <div className="font-bold flex items-center gap-2">
                                <TrashIcon className="w-5 h-5" />
                                {selectedIds.length} soal terpilih
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-bold text-sm transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-4 py-2 bg-red-800 hover:bg-red-900 rounded-lg font-bold text-sm transition flex items-center gap-2"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                    Hapus Semua
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Select All Checkbox - tampil jika ada data */}
                    {filters.topic_id && questionList.length > 0 && (
                        <div className="mb-4 flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <button
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2 text-sm font-bold text-gray-700 hover:text-blue-600 transition"
                            >
                                <Checkbox
                                    checked={
                                        selectedIds.length ===
                                        questionList.length
                                    }
                                />
                                {selectedIds.length === questionList.length
                                    ? "Batalkan Pilih Semua"
                                    : "Pilih Semua Soal"}
                            </button>
                            <span className="text-xs text-gray-500">
                                ({selectedIds.length} dari {questionList.length}{" "}
                                terpilih)
                            </span>
                        </div>
                    )}

                    {/* State: List Data */}
                    <div className="space-y-4">
                        {questionList.map((q, index) => (
                            <div
                                key={q.id}
                                className="group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative"
                            >
                                {/* Header Soal (Checkbox, Nomor, Tipe, Tombol Aksi) */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => toggleSelect(q.id)}
                                            className="flex-shrink-0"
                                        >
                                            <Checkbox
                                                checked={selectedIds.includes(
                                                    q.id,
                                                )}
                                            />
                                        </button>
                                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-mono text-sm font-bold ring-1 ring-gray-200">
                                            {(questions.current_page - 1) *
                                                questions.per_page +
                                                index +
                                                1}
                                        </span>
                                        <span
                                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${q.type === "multiple_choice" ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-teal-50 text-teal-700 border-teal-100"}`}
                                        >
                                            {q.type.replace("_", " ")}
                                        </span>
                                        {/* Badge Warning untuk soal bermasalah */}
                                        {q.type === "multiple_choice" && (
                                            <>
                                                {!q.answers?.some(
                                                    (a) => a.is_correct,
                                                ) && (
                                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-[9px] font-bold rounded border border-red-200">
                                                        ⚠️ TANPA KUNCI
                                                    </span>
                                                )}
                                                {(q.answers?.length || 0) <
                                                    5 && (
                                                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[9px] font-bold rounded border border-amber-200">
                                                        ⚠️ OPSI KURANG
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEdit(q)}
                                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(q.id)}
                                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Hapus"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="pl-[44px]">
                                    {/* 1. TEKS SOAL (Render HTML + Rumus) */}
                                    {q.question_text && (
                                        <div
                                            className="text-gray-800 font-medium leading-relaxed mb-4 prose prose-sm max-w-none text-justify ql-editor"
                                            style={{ padding: 0 }} // Reset padding bawaan Quill
                                            dangerouslySetInnerHTML={{
                                                __html: q.question_text,
                                            }}
                                        />
                                    )}

                                    {/* 2. GAMBAR SOAL */}
                                    {q.question_image && (
                                        <div className="mb-5">
                                            <img
                                                src={`/storage/${q.question_image}`}
                                                alt="Soal"
                                                className="max-h-60 rounded-xl border border-gray-200 shadow-sm"
                                            />
                                        </div>
                                    )}

                                    {/* 3. OPSI JAWABAN */}
                                    {q.type === "multiple_choice" &&
                                        q.answers?.length > 0 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {q.answers.map((a) => (
                                                    <div
                                                        key={a.id}
                                                        className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${a.is_correct ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-gray-50/50 border-gray-100 text-gray-600"}`}
                                                    >
                                                        {/* Indikator Benar/Salah */}
                                                        <div
                                                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border ${a.is_correct ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 bg-white"}`}
                                                        >
                                                            {a.is_correct && (
                                                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                                            )}
                                                        </div>

                                                        {/* Isi Jawaban */}
                                                        <div className="flex flex-col gap-1 w-full min-w-0">
                                                            {/* Gambar Jawaban */}
                                                            {a.answer_image && (
                                                                <img
                                                                    src={`/storage/${a.answer_image}`}
                                                                    alt="Jawaban"
                                                                    className="max-h-24 w-auto rounded border border-gray-200 mb-1 object-contain self-start"
                                                                />
                                                            )}
                                                            {/*  TEKS JAWABAN (Render HTML + Rumus) */}
                                                            {a.answer_text && (
                                                                <div
                                                                    className={`text-sm prose prose-sm max-w-none ${a.is_correct ? "font-semibold" : ""}`}
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: a.answer_text,
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                </div>
                            </div>
                        ))}

                        {/* Pagination */}
                        {questions?.links && (
                            <div className="pt-6 border-t border-gray-100">
                                <Pagination links={questions.links} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- SECTION 3: MODAL --- */}
            <CreateQuestion
                show={showModal}
                onClose={closeModal}
                mode={mode}
                questionData={editingQuestion}
                topicId={filters.topic_id}
            />
        </div>
    );
}
