import React, { useState } from "react";
import { router } from "@inertiajs/react";
import Button from "@/Components/UI/Button";
import Pagination from "@/Components/UI/Pagination";
import CreateQuestion from "./CreateQuestion";

import {
    PencilSquareIcon, TrashIcon, PlusIcon,
    DocumentTextIcon, FolderIcon, BookOpenIcon,
    FunnelIcon, CheckCircleIcon, ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

import "katex/dist/katex.min.css";
import "react-quill/dist/quill.snow.css";

export default function Questions({ modules = [], topics = [], questions = null, filters = {} }) {
    const [isLoading, setIsLoading] = useState(false);

    // State untuk Modal
    const [showModal, setShowModal] = useState(false);
    const [mode, setMode] = useState("create");
    const [editingQuestion, setEditingQuestion] = useState(null);

    // --- LOGIC FILTERING ---
    const handleModuleChange = (moduleId) => {
        setIsLoading(true);
        router.get(
            route('admin.modules.index'),
            { section: 'questions', module_id: moduleId },
            { preserveState: true, preserveScroll: true, only: ['topics', 'questions', 'filters'], onFinish: () => setIsLoading(false) }
        );
    };

    const handleTopicChange = (topicId) => {
        setIsLoading(true);
        router.get(
            route('admin.modules.index'),
            { section: 'questions', module_id: filters.module_id, topic_id: topicId },
            { preserveState: true, preserveScroll: true, only: ['questions', 'filters'], onFinish: () => setIsLoading(false) }
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
        if(confirm('Apakah Anda yakin ingin menghapus soal ini beserta jawabannya?')) {
            router.delete(route("admin.questions.destroy", id), { preserveScroll: true });
        }
    };

    const questionList = questions?.data || [];

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
                    <h3 className="font-bold text-sm uppercase tracking-wide">Filter Data</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Pilih Modul</label>
                        <div className="relative">
                            <select
                                value={filters.module_id || ""}
                                onChange={(e) => handleModuleChange(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-gray-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:bg-white hover:shadow-sm"
                            >
                                <option value="">-- Semua Modul --</option>
                                {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <FolderIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                        </div>
                    </div>

                    <div className={`transition-all duration-300 ${!filters.module_id ? 'opacity-50 pointer-events-none' : ''}`}>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Pilih Topik / Subject</label>
                        <div className="relative">
                            <select
                                value={filters.topic_id || ""}
                                onChange={(e) => handleTopicChange(e.target.value)}
                                disabled={!filters.module_id}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-gray-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:bg-white hover:shadow-sm disabled:bg-gray-100"
                            >
                                <option value="">-- Pilih Topik --</option>
                                {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                            {filters.topic_id && questions?.total
                                ? <>Menampilkan <span className="font-bold text-gray-900">{questions.from}-{questions.to}</span> dari <span className="font-bold text-gray-900">{questions.total}</span> soal</>
                                : "Silakan pilih filter di atas untuk menampilkan data"
                            }
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
                            <h3 className="text-lg font-bold text-gray-800 mb-1">Filter Belum Lengkap</h3>
                            <p className="text-gray-500 max-w-sm">Pilih <strong>Modul</strong> dan <strong>Topik</strong> pada panel filter di atas.</p>
                        </div>
                    )}

                    {/* State: Data Kosong */}
                    {filters.topic_id && questionList.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 border border-blue-100">
                                <ExclamationTriangleIcon className="w-10 h-10 text-blue-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">Topik Ini Belum Ada Soal</h3>
                            <Button onClick={openCreate} className="mt-4">Buat Soal Pertama</Button>
                        </div>
                    )}

                    {/* State: List Data */}
                    <div className="space-y-4">
                        {questionList.map((q, index) => (
                            <div key={q.id} className="group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 relative">

                                {/* Header Soal (Nomor, Tipe, Tombol Aksi) */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-mono text-sm font-bold ring-1 ring-gray-200">
                                            {(questions.current_page - 1) * questions.per_page + index + 1}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${q.type === 'multiple_choice' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-teal-50 text-teal-700 border-teal-100'}`}>
                                            {q.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => openEdit(q)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDelete(q.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
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
                                            dangerouslySetInnerHTML={{ __html: q.question_text }}
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
                                    {q.type === "multiple_choice" && q.answers?.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {q.answers.map((a) => (
                                                <div key={a.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${a.is_correct ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-gray-50/50 border-gray-100 text-gray-600"}`}>

                                                    {/* Indikator Benar/Salah */}
                                                    <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border ${a.is_correct ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 bg-white'}`}>
                                                        {a.is_correct && <CheckCircleIcon className="w-3.5 h-3.5" />}
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
                                                                className={`text-sm prose prose-sm max-w-none ${a.is_correct ? 'font-semibold' : ''}`}
                                                                dangerouslySetInnerHTML={{ __html: a.answer_text }}
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
