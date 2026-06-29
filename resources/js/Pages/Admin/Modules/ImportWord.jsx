import React, { useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import axios from "axios";
import ReactQuill from "react-quill";
import AdminLayout from "@/Layouts/AdminLayout";
import {
    AlertCircle,
    BookOpen,
    CheckCircle2,
    FileText,
    Folder,
    Image,
    Loader2,
    Plus,
    Trash2,
    Upload,
    X,
} from "lucide-react";

import "react-quill/dist/quill.snow.css";

const optionLabel = (index) => String.fromCharCode(65 + index);

const stripHtml = (html = "") => html.replace(/<[^>]*>/g, "").trim();

export default function ImportWord({ modules = [], topics = [], filters = {} }) {
    const [data, setData] = useState({
        module_id: filters.module_id || "",
        topic_id: "",
        content: "",
    });
    const [draftQuestions, setDraftQuestions] = useState([]);
    const [parseErrors, setParseErrors] = useState([]);
    const [isLoadingTopics, setIsLoadingTopics] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [errors, setErrors] = useState({});

    const editorModules = useMemo(
        () => ({
            toolbar: [
                ["bold", "italic", "underline"],
                [{ color: [] }, { background: [] }],
                [{ list: "ordered" }, { list: "bullet" }],
                ["clean"],
            ],
            clipboard: { matchVisual: false },
        }),
        [],
    );

    const compactEditorModules = useMemo(
        () => ({
            toolbar: [["bold", "italic", "underline"], [{ color: [] }], ["clean"]],
            clipboard: { matchVisual: false },
        }),
        [],
    );

    const draftErrors = useMemo(() => validateDraft(draftQuestions), [draftQuestions]);
    const hasDraft = draftQuestions.length > 0;
    const canImport = hasDraft && draftErrors.length === 0 && !isPreviewing && !isImporting;

    const normalizePreview = (questions = []) =>
        questions.map((question, questionIndex) => ({
            number: question.number || questionIndex + 1,
            question_html: question.question_html || "",
            question_image: null,
            question_image_url: null,
            options: (question.options || []).map((option, optionIndex) => ({
                label: option.label || optionLabel(optionIndex),
                html: option.html || "",
                is_correct: !!option.is_correct,
                image: null,
                image_url: null,
            })),
        }));

    const handleModuleChange = (event) => {
        const moduleId = event.target.value;

        setData((current) => ({ ...current, module_id: moduleId, topic_id: "" }));
        setDraftQuestions([]);
        setParseErrors([]);
        setErrors({});
        setIsLoadingTopics(true);

        router.get(
            route("admin.modules.index"),
            { section: "import-word", module_id: moduleId },
            {
                preserveState: true,
                preserveScroll: true,
                only: ["topics", "filters"],
                onFinish: () => setIsLoadingTopics(false),
            },
        );
    };

    const normalizeAxiosErrors = (error) => {
        const responseErrors = error.response?.data?.errors;

        if (Array.isArray(responseErrors)) {
            return { content: responseErrors };
        }

        return responseErrors || {
            content: [error.response?.data?.message || "Terjadi kesalahan."],
        };
    };

    const submitPreview = async (event) => {
        event.preventDefault();
        setIsPreviewing(true);
        setErrors({});
        setParseErrors([]);
        setDraftQuestions([]);

        try {
            const response = await axios.post(
                route("admin.questions.import-word.preview"),
                data,
            );

            setDraftQuestions(normalizePreview(response.data.questions));
            setParseErrors(response.data.errors || []);
        } catch (error) {
            setErrors(normalizeAxiosErrors(error));
        } finally {
            setIsPreviewing(false);
        }
    };

    const submitImport = async () => {
        setIsImporting(true);
        setErrors({});

        const formData = new FormData();
        formData.append("module_id", data.module_id);
        formData.append("topic_id", data.topic_id);
        formData.append("questions", JSON.stringify(serializeDraft(draftQuestions)));

        draftQuestions.forEach((question, questionIndex) => {
            if (question.question_image instanceof File) {
                formData.append(`question_image_${questionIndex}`, question.question_image);
            }

            question.options.forEach((option, optionIndex) => {
                if (option.image instanceof File) {
                    formData.append(`option_image_${questionIndex}_${optionIndex}`, option.image);
                }
            });
        });

        try {
            const response = await axios.post(
                route("admin.questions.import-word.store"),
                formData,
                { headers: { "Content-Type": "multipart/form-data" } },
            );

            if (response.data.redirect) {
                router.visit(response.data.redirect);
            }
        } catch (error) {
            const nextErrors = normalizeAxiosErrors(error);
            setErrors(nextErrors);

            if (Array.isArray(error.response?.data?.errors)) {
                setParseErrors(error.response.data.errors);
            }
        } finally {
            setIsImporting(false);
        }
    };

    const updateQuestion = (questionIndex, patch) => {
        setParseErrors([]);
        setDraftQuestions((current) =>
            current.map((question, index) =>
                index === questionIndex ? { ...question, ...patch } : question,
            ),
        );
    };

    const updateOption = (questionIndex, optionIndex, patch) => {
        setParseErrors([]);
        setDraftQuestions((current) =>
            current.map((question, qIndex) => {
                if (qIndex !== questionIndex) return question;

                return {
                    ...question,
                    options: question.options.map((option, oIndex) =>
                        oIndex === optionIndex ? { ...option, ...patch } : option,
                    ),
                };
            }),
        );
    };

    const setCorrectOption = (questionIndex, optionIndex) => {
        setParseErrors([]);
        setDraftQuestions((current) =>
            current.map((question, qIndex) => {
                if (qIndex !== questionIndex) return question;

                return {
                    ...question,
                    options: question.options.map((option, oIndex) => ({
                        ...option,
                        is_correct: oIndex === optionIndex,
                    })),
                };
            }),
        );
    };

    const addOption = (questionIndex) => {
        setParseErrors([]);
        setDraftQuestions((current) =>
            current.map((question, qIndex) => {
                if (qIndex !== questionIndex) return question;

                return {
                    ...question,
                    options: [
                        ...question.options,
                        {
                            label: optionLabel(question.options.length),
                            html: "",
                            is_correct: false,
                            image: null,
                            image_url: null,
                        },
                    ],
                };
            }),
        );
    };

    const removeOption = (questionIndex, optionIndex) => {
        setParseErrors([]);
        setDraftQuestions((current) =>
            current.map((question, qIndex) => {
                if (qIndex !== questionIndex) return question;

                const options = question.options
                    .filter((_, oIndex) => oIndex !== optionIndex)
                    .map((option, nextIndex) => ({
                        ...option,
                        label: optionLabel(nextIndex),
                    }));

                if (!options.some((option) => option.is_correct) && options.length > 0) {
                    options[0].is_correct = true;
                }

                return { ...question, options };
            }),
        );
    };

    const removeQuestion = (questionIndex) => {
        setParseErrors([]);
        setDraftQuestions((current) =>
            current
                .filter((_, index) => index !== questionIndex)
                .map((question, index) => ({ ...question, number: index + 1 })),
        );
    };

    const setQuestionImage = (questionIndex, file) => {
        updateQuestion(questionIndex, {
            question_image: file,
            question_image_url: file ? URL.createObjectURL(file) : null,
        });
    };

    const setOptionImage = (questionIndex, optionIndex, file) => {
        updateOption(questionIndex, optionIndex, {
            image: file,
            image_url: file ? URL.createObjectURL(file) : null,
        });
    };

    const renderError = (field) => {
        const fieldErrors = errors[field];
        if (!fieldErrors) return null;

        const messages = Array.isArray(fieldErrors) ? fieldErrors : [fieldErrors];

        return (
            <div className="mt-2 space-y-1">
                {messages.map((message, index) => (
                    <p key={index} className="text-sm text-red-600">
                        {message}
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Head title="Import Soal Word" />

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                    Import Soal Word
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Bank Soal / Import Soal Word
                </p>
            </div>

            <form
                onSubmit={submitPreview}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                        Editor Soal dari Word
                    </h2>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Pilih Modul <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={data.module_id}
                                    onChange={handleModuleChange}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 pl-10 py-2.5 appearance-none bg-white"
                                >
                                    <option value="">-- Silakan Pilih Modul --</option>
                                    {modules.map((module) => (
                                        <option key={module.id} value={module.id}>
                                            {module.name}
                                        </option>
                                    ))}
                                </select>
                                <Folder className="w-5 h-5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                                {isLoadingTopics && (
                                    <Loader2 className="w-4 h-4 text-blue-600 absolute right-10 top-3 animate-spin" />
                                )}
                            </div>
                            {renderError("module_id")}
                        </div>

                        <div
                            className={`transition-all duration-300 ${
                                !data.module_id ? "opacity-50 pointer-events-none" : ""
                            }`}
                        >
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Pilih Topik <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={data.topic_id}
                                    onChange={(event) => {
                                        setData((current) => ({
                                            ...current,
                                            topic_id: event.target.value,
                                        }));
                                        setDraftQuestions([]);
                                        setParseErrors([]);
                                    }}
                                    disabled={!data.module_id || isLoadingTopics}
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 pl-10 py-2.5 appearance-none bg-white disabled:bg-gray-100"
                                >
                                    <option value="">
                                        {isLoadingTopics
                                            ? "Memuat Topik..."
                                            : data.module_id
                                              ? "-- Silakan Pilih Topik --"
                                              : "-- Pilih Modul Terlebih Dahulu --"}
                                    </option>
                                    {topics.map((topic) => (
                                        <option key={topic.id} value={topic.id}>
                                            {topic.name}
                                        </option>
                                    ))}
                                </select>
                                <BookOpen className="w-5 h-5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                            </div>
                            {renderError("topic_id")}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Konten Soal <span className="text-red-500">*</span>
                        </label>
                        <div className="rounded-lg border border-gray-300 overflow-hidden bg-white">
                            <ReactQuill
                                theme="snow"
                                value={data.content}
                                onChange={(value) => {
                                    setData((current) => ({ ...current, content: value }));
                                    setDraftQuestions([]);
                                    setParseErrors([]);
                                }}
                                modules={editorModules}
                            />
                        </div>
                        {renderError("content")}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="submit"
                            disabled={isPreviewing || isImporting}
                            className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-400 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all"
                        >
                            {isPreviewing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <FileText className="w-4 h-4" />
                            )}
                            Preview
                        </button>

                        <button
                            type="button"
                            onClick={submitImport}
                            disabled={!canImport}
                            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all"
                        >
                            {isImporting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                            Import
                        </button>
                    </div>
                </div>
            </form>

            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/70 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                        Preview dan Edit Sebelum Import
                    </h2>
                </div>

                <div className="p-6 space-y-5">
                    {!hasDraft && (
                        <div className="min-h-56 flex flex-col items-center justify-center text-center text-gray-500">
                            <FileText className="w-12 h-12 text-gray-300 mb-3" />
                            <p className="text-sm font-semibold">Belum ada preview.</p>
                        </div>
                    )}

                    {(parseErrors.length > 0 || draftErrors.length > 0) && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                                <div>
                                    <h3 className="text-sm font-bold text-red-800">
                                        Perlu diperbaiki sebelum import
                                    </h3>
                                    <ul className="list-disc ml-5 mt-2 space-y-1 text-sm text-red-700">
                                        {[...parseErrors, ...draftErrors].map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {draftQuestions.map((question, questionIndex) => (
                        <div
                            key={`${question.number}-${questionIndex}`}
                            className="border border-gray-200 rounded-xl p-5 bg-white"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
                                <h3 className="text-sm font-black text-gray-900">
                                    Soal {question.number}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => removeQuestion(questionIndex)}
                                    className="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Hapus Soal
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                                <div className="lg:col-span-7 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                                            Pertanyaan
                                        </label>
                                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                                            <ReactQuill
                                                theme="snow"
                                                value={question.question_html}
                                                onChange={(value) =>
                                                    updateQuestion(questionIndex, {
                                                        question_html: value,
                                                    })
                                                }
                                                modules={editorModules}
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>

                                    <ImageInput
                                        label="Gambar Soal"
                                        imageUrl={question.question_image_url}
                                        onChange={(file) => setQuestionImage(questionIndex, file)}
                                        onRemove={() => setQuestionImage(questionIndex, null)}
                                    />
                                </div>

                                <div className="lg:col-span-5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-bold uppercase text-gray-500">
                                            Opsi Jawaban
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => addOption(questionIndex)}
                                            disabled={question.options.length >= 10}
                                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Tambah Opsi
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {question.options.map((option, optionIndex) => (
                                            <div
                                                key={`${option.label}-${optionIndex}`}
                                                className={`rounded-lg border p-3 ${
                                                    option.is_correct
                                                        ? "border-emerald-300 bg-emerald-50"
                                                        : "border-gray-200 bg-gray-50"
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <input
                                                        type="radio"
                                                        name={`correct_${questionIndex}`}
                                                        checked={option.is_correct}
                                                        onChange={() =>
                                                            setCorrectOption(
                                                                questionIndex,
                                                                optionIndex,
                                                            )
                                                        }
                                                        className="mt-3 w-5 h-5 text-emerald-600 focus:ring-emerald-500"
                                                    />

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                            <span className="text-sm font-black text-gray-800">
                                                                {option.label}
                                                            </span>
                                                            {question.options.length > 2 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removeOption(
                                                                            questionIndex,
                                                                            optionIndex,
                                                                        )
                                                                    }
                                                                    className="text-gray-400 hover:text-red-600"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="rounded border border-gray-200 overflow-hidden bg-white">
                                                            <ReactQuill
                                                                theme="snow"
                                                                value={option.html}
                                                                onChange={(value) =>
                                                                    updateOption(
                                                                        questionIndex,
                                                                        optionIndex,
                                                                        { html: value },
                                                                    )
                                                                }
                                                                modules={compactEditorModules}
                                                            />
                                                        </div>
                                                        <div className="mt-3">
                                                            <ImageInput
                                                                label="Gambar Opsi"
                                                                compact
                                                                imageUrl={option.image_url}
                                                                onChange={(file) =>
                                                                    setOptionImage(
                                                                        questionIndex,
                                                                        optionIndex,
                                                                        file,
                                                                    )
                                                                }
                                                                onRemove={() =>
                                                                    setOptionImage(
                                                                        questionIndex,
                                                                        optionIndex,
                                                                        null,
                                                                    )
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ImageInput({ label, imageUrl, onChange, onRemove, compact = false }) {
    return (
        <div>
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">
                {label}
            </label>
            <div
                className={`relative border-2 border-dashed border-gray-200 rounded-lg text-center hover:bg-gray-50 transition-colors ${
                    compact ? "p-3" : "p-4"
                }`}
            >
                <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(event) => onChange(event.target.files?.[0] || null)}
                />

                {imageUrl ? (
                    <div className="relative inline-block">
                        <img
                            src={imageUrl}
                            alt={label}
                            className={`${compact ? "max-h-24" : "max-h-56"} rounded-lg border border-gray-200 shadow-sm`}
                        />
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onRemove();
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className={`${compact ? "py-3" : "py-7"} text-gray-400 flex flex-col items-center gap-2`}>
                        <Image className={`${compact ? "w-7 h-7" : "w-10 h-10"} text-gray-300`} />
                        <span className="text-xs font-semibold">Upload gambar</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function serializeDraft(questions) {
    return questions.map((question, questionIndex) => ({
        number: question.number || questionIndex + 1,
        question_html: question.question_html || "",
        options: question.options.map((option, optionIndex) => ({
            label: option.label || optionLabel(optionIndex),
            html: option.html || "",
            is_correct: !!option.is_correct,
        })),
    }));
}

function validateDraft(questions) {
    const errors = [];

    questions.forEach((question, questionIndex) => {
        const number = question.number || questionIndex + 1;

        if (!stripHtml(question.question_html)) {
            errors.push(`Soal ${number}: teks soal tidak boleh kosong.`);
        }

        if (question.options.length < 2) {
            errors.push(`Soal ${number}: minimal 2 pilihan jawaban.`);
        }

        if (question.options.length > 10) {
            errors.push(`Soal ${number}: maksimal 10 pilihan jawaban.`);
        }

        const correctCount = question.options.filter((option) => option.is_correct).length;
        if (correctCount !== 1) {
            errors.push(`Soal ${number}: harus ada tepat satu jawaban benar.`);
        }

        question.options.forEach((option) => {
            if (!stripHtml(option.html)) {
                errors.push(`Soal ${number}: pilihan ${option.label} tidak boleh kosong.`);
            }
        });
    });

    return errors;
}

ImportWord.layout = (page) => <AdminLayout>{page}</AdminLayout>;
