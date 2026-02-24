import React, { useState, useEffect, useRef } from "react";
import { router } from "@inertiajs/react";
import Button from "@/Components/UI/Button";
import { XMarkIcon, PhotoIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

// --- IMPORT EDITOR & RUMUS ---
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import katex from "katex";
import "katex/dist/katex.min.css";

// Pasang KaTeX ke window
if (typeof window !== "undefined") {
  window.katex = katex;
}

// --- SIMBOL MEDIS LENGKAP ---
const MEDICAL_SYMBOLS = [
    { char: '♂', name: 'Laki-laki' }, { char: '♀', name: 'Perempuan' },
    { char: '°C', name: 'Celcius' }, { char: '°', name: 'Derajat' },
    { char: 'µ', name: 'Mikro' }, { char: '‰', name: 'Permil' },
    { char: 'Ø', name: 'Diameter/Pembukaan' }, { char: '±', name: 'Plus Minus' },
    { char: '≤', name: 'Kurang dr' }, { char: '≥', name: 'Lebih dr' },
    { char: '≈', name: 'Kira-kira' }, { char: '≠', name: 'Tidak Sama' },
    { char: '↑', name: 'Naik' }, { char: '↓', name: 'Turun' },
    { char: '→', name: 'Menjalar' }, { char: '↔', name: 'Kiri-Kanan' },
    { char: 'α', name: 'Alpha' }, { char: 'β', name: 'Beta' },
    { char: 'γ', name: 'Gamma' }, { char: 'Δ', name: 'Delta' },
];

// Konfigurasi Toolbar (Versi Mini untuk Jawaban agar tidak makan tempat)
const modulesAnswer = {
  toolbar: [
    ['bold', 'italic', 'sub', 'super'], // Format dasar & subscript
    ['formula'], // Rumus
    ['clean']
  ],
};

const modulesQuestion = {
toolbar: [
        ['bold', 'italic', { 'script': 'sub' }, { 'script': 'super' }],

        ['formula'],
        ['clean']
    ],
};

export default function CreateQuestion({ show, onClose, mode, questionData, topicId }) {

    const initialForm = {
        topic_id: topicId || "",
        type: "multiple_choice",
        question_text: "",
        question_image: null,
        options: [
            { text: "", is_correct: true, image: null, image_url: null },
            { text: "", is_correct: false, image: null, image_url: null },
            { text: "", is_correct: false, image: null, image_url: null },
            { text: "", is_correct: false, image: null, image_url: null },
        ],
    };

    const [form, setForm] = useState(initialForm);
    const [imagePreview, setImagePreview] = useState(null);

    //  STATE BARU: Melacak Editor mana yang sedang aktif
    // 'question' = Editor Soal
    // 0, 1, 2, 3 = Index Editor Jawaban
    const [activeField, setActiveField] = useState('question');

    //  REFS UNTUK BANYAK EDITOR
    const questionRef = useRef(null);
    const answerRefs = useRef([]); // Array of refs untuk jawaban

    // Cleanup Memory
    useEffect(() => {
        return () => {
            if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
            form.options.forEach(opt => {
                if (opt.image_url && opt.image_url.startsWith('blob:')) URL.revokeObjectURL(opt.image_url);
            });
        };
    }, [show]);

    // Populate Data
    useEffect(() => {
        if (show) {
            if (mode === 'edit' && questionData) {
                setForm({
                    topic_id: questionData.topic_id,
                    type: questionData.type,
                    question_text: questionData.question_text || "",
                    question_image: null,
                    options: questionData.type === "multiple_choice"
                        ? (questionData.answers || []).map((a) => ({
                            text: a.answer_text || "",
                            is_correct: !!a.is_correct,
                            image: null,
                            image_url: a.answer_image ? `/storage/${a.answer_image}` : null
                        }))
                        : initialForm.options,
                });
                setImagePreview(questionData.question_image_url || (questionData.question_image ? `/storage/${questionData.question_image}` : null));
            } else {
                setForm({ ...initialForm, topic_id: topicId });
                setImagePreview(null);
            }
            // Reset active field ke soal saat buka modal
            setActiveField('question');
        }
    }, [show, mode, questionData, topicId]);

    // --- LOGIC INSERT SIMBOL (CERDAS) ---
    const insertSymbol = (char) => {
        let editor = null;

        // 1. Tentukan Editor mana yang mau diisi
        if (activeField === 'question') {
            editor = questionRef.current?.getEditor();
        } else if (typeof activeField === 'number') {
            editor = answerRefs.current[activeField]?.getEditor();
        }

        // 2. Masukkan Simbol
        if (editor) {
            // Cek apakah editor dalam keadaan focus, jika tidak paksa focus dulu (opsional)
            const range = editor.getSelection();
            const cursorPosition = range ? range.index : editor.getLength() - 1;
            editor.insertText(cursorPosition, char);
            // Pindahkan kursor ke depannya dan fokus balik
            editor.setSelection(cursorPosition + 1);
        }
    };

    // Handler Gambar Soal
    const handleImageChange = (e) => {
        const file = e.target.files?.[0] || null;
        setForm((prev) => ({ ...prev, question_image: file }));
        if (file) setImagePreview(URL.createObjectURL(file));
        else setImagePreview(null);
    };

    const removeImage = (e) => {
        e.stopPropagation();
        setForm(prev => ({ ...prev, question_image: null }));
        setImagePreview(null);
    };

    // Handler Opsi Jawaban
    const setCorrectOption = (idx) => {
        setForm((prev) => ({ ...prev, options: prev.options.map((o, i) => ({ ...o, is_correct: i === idx })) }));
    };

    //  GANTI: Handle Text Quill untuk Opsi
    const handleOptionTextChange = (idx, content) => {
        setForm(prev => ({
            ...prev,
            options: prev.options.map((o, i) => i === idx ? { ...o, text: content } : o)
        }));
    };

    const handleOptionImageChange = (idx, e) => {
        const file = e.target.files?.[0];
        if (file) {
            setForm(prev => ({
                ...prev,
                options: prev.options.map((o, i) => i === idx ? { ...o, image: file, image_url: URL.createObjectURL(file) } : o)
            }));
        }
    };

    const removeOptionImage = (idx) => {
        setForm(prev => ({ ...prev, options: prev.options.map((o, i) => i === idx ? { ...o, image: null, image_url: null } : o) }));
    };

    const addOption = () => {
        setForm((prev) => ({ ...prev, options: [...prev.options, { text: "", is_correct: false, image: null, image_url: null }] }));
    };

    const removeOption = (idx) => {
        setForm((prev) => {
            const next = prev.options.filter((_, i) => i !== idx);
            if (!next.some((o) => o.is_correct) && next.length > 0) next[0].is_correct = true;
            return { ...prev, options: next };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validasi Text Kosong (Strip HTML tags)
        const stripHtml = (html) => html.replace(/<(.|\n)*?>/g, '').trim();
        const isQuestionEmpty = stripHtml(form.question_text).length === 0;

        if (isQuestionEmpty && !form.question_image && !imagePreview) {
             alert("Pertanyaan wajib diisi!"); return;
        }

        const formData = new FormData();
        formData.append('topic_id', form.topic_id);
        formData.append('type', form.type);
        formData.append('question_text', form.question_text);
        if (form.question_image instanceof File) formData.append('question_image', form.question_image);

        if (form.type === "multiple_choice") {
            form.options.forEach((opt, index) => {
                formData.append(`options[${index}][text]`, opt.text || "");
                formData.append(`options[${index}][is_correct]`, opt.is_correct ? '1' : '0');
                if (opt.image instanceof File) formData.append(`options[${index}][image]`, opt.image);
            });
        }

        const options = {
            preserveScroll: true, preserveState: true, forceFormData: true,
            onSuccess: () => onClose(),
        };

        if (mode === "create") {
            router.post(route("admin.questions.store"), formData, options);
        } else {
            formData.append('_method', 'PUT');
            router.post(route("admin.questions.update", questionData.id), formData, options);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-20">
                    <h2 className="text-xl font-bold text-gray-800">{mode === "create" ? "Tambah Soal Baru" : "Edit Soal"}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><XMarkIcon className="w-6 h-6 text-gray-500" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* KOLOM KIRI: SOAL */}
                        <div className="lg:col-span-7 space-y-6">

                            {/*  PANEL SIMBOL (GLOBAL) */}
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 sticky top-[70px] z-10 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] font-bold text-blue-700 uppercase">
                                        Bank Simbol Medis
                                    </p>
                                    <span className="text-[10px] text-blue-500 italic">
                                        Aktif di: {activeField === 'question' ? 'Pertanyaan' : `Pilihan ${activeField + 1}`}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto custom-scrollbar">
                                    {MEDICAL_SYMBOLS.map((sym) => (
                                        <button
                                            key={sym.char}
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault(); // Mencegah fokus pindah ke tombol
                                                insertSymbol(sym.char);
                                            }}
                                            className="min-w-[28px] h-7 flex items-center justify-center bg-white text-gray-700 text-xs font-bold rounded shadow-sm border border-gray-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                                            title={sym.name}
                                        >
                                            {sym.char}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Pertanyaan (Vignette)</label>
                                <div className={`rounded-xl overflow-hidden border transition-all ${activeField === 'question' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}>
                                    <ReactQuill
                                        ref={questionRef}
                                        theme="snow"
                                        value={form.question_text}
                                        onChange={(content) => setForm(prev => ({ ...prev, question_text: content }))}
                                        onFocus={() => setActiveField('question')} //  SET AKTIF KE SOAL
                                        modules={modulesQuestion}
                                        placeholder="Tulis skenario klinis di sini..."
                                        className="h-[250px] mb-12 bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Gambar Penunjang</label>
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleImageChange} />
                                    {imagePreview ? (
                                        <div className="relative inline-block">
                                            <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg shadow-sm" />
                                            <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"><XMarkIcon className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <div className="py-8 text-gray-400 flex flex-col items-center gap-2"><PhotoIcon className="w-12 h-12 text-gray-300" /><span className="text-sm">Upload gambar di sini</span></div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* KOLOM KANAN: JAWABAN */}
                        <div className="lg:col-span-5 space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Tipe Soal</label>
                                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
                                    {["multiple_choice", "essay"].map((type) => (
                                        <button key={type} type="button" onClick={() => setForm(prev => ({ ...prev, type: type }))} className={`py-2 px-4 rounded-md text-sm font-bold transition-all ${form.type === type ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                                            {type === "multiple_choice" ? "Pilihan Ganda" : "Essay"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {form.type === "multiple_choice" && (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="text-xs font-bold uppercase text-gray-400">Opsi Jawaban</label>
                                        <button type="button" onClick={addOption} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"><PlusIcon className="w-3 h-3" /> Tambah Opsi</button>
                                    </div>

                                    <div className="space-y-6"> {/* Space lebih besar karena editor butuh ruang */}
                                        {form.options.map((opt, idx) => (
                                            <div key={idx} className={`flex flex-col gap-2 p-3 rounded-lg border shadow-sm relative group bg-white ${activeField === idx ? 'ring-2 ring-blue-200 border-blue-400' : 'border-gray-200'}`}>

                                                <div className="flex items-start gap-3">
                                                    {/* Radio Button */}
                                                    <div className="pt-3">
                                                        <input type="radio" name={`correct_option_${topicId || 'new'}`} checked={opt.is_correct} onChange={() => setCorrectOption(idx)} className="w-5 h-5 text-green-600 focus:ring-green-500 cursor-pointer border-gray-300" />
                                                    </div>

                                                    {/*  REACT QUILL UNTUK OPSI */}
                                                    <div className="flex-1 relative min-w-0">
                                                        <ReactQuill
                                                            ref={(el) => (answerRefs.current[idx] = el)} // Simpan ref ke array
                                                            theme="snow"
                                                            value={opt.text}
                                                            onChange={(content) => handleOptionTextChange(idx, content)}
                                                            onFocus={() => setActiveField(idx)} //  SET AKTIF KE OPSI INI
                                                            modules={modulesAnswer} // Toolbar lebih simpel
                                                            placeholder={`Pilihan ${idx + 1}...`}
                                                            className="bg-white ql-compact" // Custom class jika perlu
                                                        />

                                                        {/* Tombol Upload Image Kecil */}
                                                        <label className="cursor-pointer text-gray-400 hover:text-blue-600 absolute right-2 bottom-2 z-10 bg-white/80 p-1 rounded">
                                                            <PhotoIcon className="w-5 h-5" />
                                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleOptionImageChange(idx, e)} />
                                                        </label>
                                                    </div>

                                                    {/* Tombol Hapus */}
                                                    {form.options.length > 2 && (
                                                        <div className="pt-3">
                                                            <button type="button" onClick={() => removeOption(idx)} className="text-gray-300 hover:text-red-500 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Preview Gambar Jawaban */}
                                                {opt.image_url && (
                                                    <div className="ml-8 relative inline-block w-max">
                                                        <img src={opt.image_url} alt="Option" className="h-20 w-auto rounded border border-gray-200" />
                                                        <button type="button" onClick={() => removeOptionImage(idx)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-0.5 hover:bg-red-200"><XMarkIcon className="w-4 h-4" /></button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-4 text-center">*Klik radio button untuk kunci jawaban.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={onClose} className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-none">Batal</Button>
                        <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200">{mode === "create" ? "Simpan Soal" : "Simpan Perubahan"}</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
