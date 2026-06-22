import React, { useState } from "react";
import { Head, router } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import {
  ArrowLeft,
  Lock,
  Unlock,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  User,
  BookOpen,
  Calendar,
  Shield,
  Plus,
} from "lucide-react";

export default function Show({ testUser }) {
  const [showLockModal, setShowLockModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [lockReason, setLockReason] = useState("");
  const [addMinutes, setAddMinutes] = useState("");
  const [addTimeReason, setAddTimeReason] = useState("");

  // Calculate stats
  const getAnswerStats = () => {
    const answers = testUser.answers || [];
    const correct = answers.filter((a) => a.is_correct).length;
    const incorrect = answers.filter((a) => !a.is_correct && a.answer_id).length;
    const unanswered = (testUser.test?.questions?.length || answers.length) - correct - incorrect;

    return { correct, incorrect, unanswered, total: answers.length };
  };

  const stats = getAnswerStats();

  // Format datetime
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Calculate duration
  const getDuration = () => {
    if (!testUser.started_at || !testUser.finished_at) return "-";
    const start = new Date(testUser.started_at);
    const end = new Date(testUser.finished_at);
    const minutes = Math.floor((end - start) / 60000);
    return `${minutes} menit`;
  };

  // Handle lock
  const handleSubmitLock = () => {
    if (!lockReason.trim()) {
      alert("Alasan penguncian harus diisi!");
      return;
    }

    router.post(
      route("admin.test-users.lock", testUser.id),
      { lock_reason: lockReason },
      {
        onSuccess: () => {
          setShowLockModal(false);
          setLockReason("");
        },
      }
    );
  };

  // Handle add time
  const handleSubmitAddTime = () => {
    if (!addMinutes || parseInt(addMinutes) <= 0) {
      alert("Durasi waktu harus diisi dan minimal 1 menit!");
      return;
    }

    router.post(
      route("admin.test-users.addTime", testUser.id),
      { 
        minutes: parseInt(addMinutes),
        reason: addTimeReason 
      },
      {
        onSuccess: () => {
          setShowTimeModal(false);
          setAddMinutes("");
          setAddTimeReason("");
        },
      }
    );
  };

  // Handle unlock
  const handleUnlock = () => {
    if (confirm("Apakah Anda yakin ingin membuka kunci peserta ini?")) {
      router.post(route("admin.test-users.unlock", testUser.id));
    }
  };

  const score = testUser.result?.total_score || 0;
  const totalQuestions = testUser.test?.questions?.length || 0;
  const scorePercentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  return (
    <AdminLayout>
      <Head title={`Detail Peserta: ${testUser.user?.name}`} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900">
                Detail Peserta Ujian
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {testUser.user?.name} • {testUser.test?.title}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowTimeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Waktu
            </button>

            {testUser.is_locked ? (
              <button
                onClick={handleUnlock}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
              >
                <Unlock className="w-4 h-4" />
                Buka Kunci
              </button>
            ) : (
              <button
                onClick={() => setShowLockModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
              >
                <Lock className="w-4 h-4" />
                Kunci Peserta
              </button>
            )}
          </div>
        </div>

        {/* Lock Status Alert */}
        {testUser.is_locked && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-1">Peserta Dikunci</h3>
              <p className="text-sm text-red-700 mb-2">{testUser.lock_reason}</p>
              <p className="text-xs text-red-600">
                Dikunci oleh {testUser.locker?.name} pada{" "}
                {formatDateTime(testUser.locked_at)}
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Score */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Nilai
                </p>
                <p className="text-2xl font-black text-blue-900 mt-1">{score}</p>
                <p className="text-xs text-blue-600 mt-1">{scorePercentage}%</p>
              </div>
              <BookOpen className="w-10 h-10 text-blue-300" />
            </div>
          </div>

          {/* Correct */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">
                  Benar
                </p>
                <p className="text-2xl font-black text-green-900 mt-1">
                  {stats.correct}
                </p>
                <p className="text-xs text-green-600 mt-1">dari {totalQuestions}</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-300" />
            </div>
          </div>

          {/* Incorrect */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
                  Salah
                </p>
                <p className="text-2xl font-black text-red-900 mt-1">
                  {stats.incorrect}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {stats.incorrect > 0 ? Math.round((stats.incorrect / totalQuestions) * 100) : 0}%
                </p>
              </div>
              <XCircle className="w-10 h-10 text-red-300" />
            </div>
          </div>

          {/* Unanswered */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-yellow-600 uppercase tracking-wider">
                  Belum Dijawab
                </p>
                <p className="text-2xl font-black text-yellow-900 mt-1">
                  {stats.unanswered}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  {stats.unanswered > 0 ? Math.round((stats.unanswered / totalQuestions) * 100) : 0}%
                </p>
              </div>
              <HelpCircle className="w-10 h-10 text-yellow-300" />
            </div>
          </div>
        </div>

        {/* Peserta & Ujian Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Peserta Info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Data Peserta
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">
                  Nama
                </p>
                <p className="font-bold text-gray-900">{testUser.user?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">
                  Email
                </p>
                <p className="text-gray-700 break-all">{testUser.user?.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">
                  User ID
                </p>
                <p className="font-mono text-gray-700">#{testUser.user_id}</p>
              </div>
            </div>
          </div>

          {/* Waktu Ujian */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Waktu Ujian
              </h3>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">
                  Mulai
                </p>
                <p className="font-mono text-gray-700">
                  {formatDateTime(testUser.started_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">
                  Selesai
                </p>
                <p className="font-mono text-gray-700">
                  {testUser.finished_at ? formatDateTime(testUser.finished_at) : "Belum Selesai"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">
                  Durasi
                </p>
                <p className="font-bold text-gray-900">{getDuration()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Answers Detail */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
            Detail Jawaban
          </h3>

          <div className="space-y-6">
            {testUser.test?.questions?.map((question, idx) => {
              const userAnswer = testUser.answers?.find(
                (a) => a.question_id === question.id
              );
              const isCorrect = userAnswer?.is_correct;
              const selectedAnswerId = userAnswer?.answer_id;

              return (
                <div
                  key={question.id}
                  className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex gap-3 mb-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 mb-2">
                        {question.question_text}
                      </p>

                      <div className="space-y-2">
                        {question.answers?.map((answer) => {
                          const isSelected = selectedAnswerId === answer.id;
                          const isCorrectAnswer = answer.is_correct;

                          let bgColor = "bg-gray-50";
                          let borderColor = "border-gray-200";
                          let textColor = "text-gray-700";
                          let badge = null;

                          if (isSelected && isCorrect) {
                            bgColor = "bg-green-50";
                            borderColor = "border-green-300";
                            textColor = "text-green-900";
                            badge = (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            );
                          } else if (isSelected && !isCorrect) {
                            bgColor = "bg-red-50";
                            borderColor = "border-red-300";
                            textColor = "text-red-900";
                            badge = (
                              <XCircle className="w-4 h-4 text-red-600" />
                            );
                          } else if (isCorrectAnswer && !isSelected) {
                            bgColor = "bg-blue-50";
                            borderColor = "border-blue-200";
                            textColor = "text-blue-900";
                            badge = (
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            );
                          }

                          return (
                            <div
                              key={answer.id}
                              className={`border ${borderColor} ${bgColor} rounded-lg p-3 ${textColor} text-sm flex items-center gap-3`}
                            >
                              <input
                                type="radio"
                                disabled
                                checked={isSelected}
                                className="w-4 h-4"
                              />
                              <span className="flex-1">
                                {answer.answer_text}
                              </span>
                              {badge}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lock Modal */}
      {showLockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-bold text-gray-900">Kunci Peserta</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Anda akan mengunci peserta{" "}
              <span className="font-bold">{testUser.user?.name}</span> dari ujian
              ini. Peserta tidak akan bisa melanjutkan mengerjakan soal.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Alasan Penguncian
              </label>
              <textarea
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="Contoh: Curang, Kehabisan waktu, Gangguan teknis, dll"
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLockModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitLock}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition text-sm"
              >
                Kunci Peserta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Time Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">Tambah Waktu Ujian</h3>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Tambahkan waktu ujian untuk peserta{" "}
              <span className="font-bold">{testUser.user?.name}</span>.
            </p>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Durasi Tambahan (Menit)
                </label>
                <input
                  type="number"
                  value={addMinutes}
                  onChange={(e) => setAddMinutes(e.target.value)}
                  placeholder="Contoh: 5, 10, 15, 30"
                  min="1"
                  max="120"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Maksimal 120 menit</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Alasan (Opsional)
                </label>
                <textarea
                  value={addTimeReason}
                  onChange={(e) => setAddTimeReason(e.target.value)}
                  placeholder="Contoh: Gangguan teknis, Kendala jaringan, dll"
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTimeModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitAddTime}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition text-sm"
              >
                Tambah Waktu
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
