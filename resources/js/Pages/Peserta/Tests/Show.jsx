import { Head, Link } from '@inertiajs/react';
import PesertaLayout from '@/Layouts/PesertaLayout';
import { ArrowLeft, CheckCircle, XCircle, Calendar, Clock, Award, FileText } from 'lucide-react';

export default function Show({ testUser }) {
    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calculateDuration = () => {
        if (!testUser.started_at || !testUser.finished_at) return '-';
        const start = new Date(testUser.started_at);
        const end = new Date(testUser.finished_at);
        const diff = Math.floor((end - start) / 1000 / 60);
        return `${diff} menit`;
    };

    const totalQuestions = testUser.answers?.length || 0;
    const correctAnswers = testUser.answers?.filter(a => a.is_correct === 1).length || 0;
    const wrongAnswers = testUser.answers?.filter(a => a.is_correct === 0).length || 0;
    const accuracy = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(1) : 0;

    return (
        <PesertaLayout>
            <Head title={`Hasil - ${testUser.test.title}`} />

            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Back Button */}
                    <Link
                        href="/peserta/results"
                        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Daftar Hasil
                    </Link>

                    {/* Header Card */}
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h1 className="text-2xl font-bold text-gray-900 mb-2">{testUser.test.title}</h1>
                                {testUser.test.description && (
                                    <p className="text-gray-600 mb-4">{testUser.test.description}</p>
                                )}
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>{formatDate(testUser.finished_at)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span>Durasi: {calculateDuration()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-5xl font-bold text-blue-600 mb-2">
                                    {testUser.result.total_score}
                                </div>
                                <span className="text-sm text-gray-600">Nilai Akhir</span>
                            </div>
                        </div>

                        {/* Statistics */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{totalQuestions}</div>
                                <div className="text-sm text-gray-600">Total Soal</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
                                <div className="text-sm text-gray-600">Benar</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">{wrongAnswers}</div>
                                <div className="text-sm text-gray-600">Salah</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{accuracy}%</div>
                                <div className="text-sm text-gray-600">Akurasi</div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Answers */}
                    <div className="bg-white rounded-lg shadow-md">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Detail Jawaban</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            {testUser.answers && testUser.answers.length > 0 ? (
                                testUser.answers.map((answer, idx) => {
                                    const question = answer.question;
                                    const isCorrect = answer.is_correct === 1;
                                    const correctAnswer = question.answers?.find(a => a.is_correct === 1);

                                    return (
                                        <div key={answer.id} className="border border-gray-200 rounded-lg p-6">
                                            {/* Question */}
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                                    isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    {question.question_image && (
                                                        <img
                                                            src={`/storage/${question.question_image}`}
                                                            alt="Soal"
                                                            className="mb-3 max-w-full h-auto rounded-lg"
                                                        />
                                                    )}
                                                    <p className="text-gray-900 whitespace-pre-wrap">{question.question_text}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isCorrect ? (
                                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                                    ) : (
                                                        <XCircle className="w-6 h-6 text-red-600" />
                                                    )}
                                                    <span className="font-bold text-gray-900">
                                                        {answer.score || 0} poin
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Multiple Choice Answer */}
                                            {question.type === 'multiple_choice' && (
                                                <div className="ml-11 space-y-2">
                                                    {question.answers?.map((option) => {
                                                        const isUserAnswer = answer.answer_id === option.id;
                                                        const isCorrectOption = option.is_correct === 1;
                                                        
                                                        let bgColor = 'bg-gray-50';
                                                        let borderColor = 'border-gray-200';
                                                        let textColor = 'text-gray-700';
                                                        
                                                        if (isCorrectOption) {
                                                            bgColor = 'bg-green-50';
                                                            borderColor = 'border-green-300';
                                                            textColor = 'text-green-900';
                                                        } else if (isUserAnswer && !isCorrect) {
                                                            bgColor = 'bg-red-50';
                                                            borderColor = 'border-red-300';
                                                            textColor = 'text-red-900';
                                                        }

                                                        return (
                                                            <div
                                                                key={option.id}
                                                                className={`p-3 border rounded-lg ${bgColor} ${borderColor}`}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    {option.answer_image && (
                                                                        <img
                                                                            src={`/storage/${option.answer_image}`}
                                                                            alt="Pilihan"
                                                                            className="max-w-xs h-auto rounded"
                                                                        />
                                                                    )}
                                                                    <div className="flex-1">
                                                                        <span className={`${textColor} font-medium`}>
                                                                            {option.answer_text}
                                                                        </span>
                                                                        <div className="mt-1 flex items-center gap-2 text-xs">
                                                                            {isCorrectOption && (
                                                                                <span className="inline-flex items-center gap-1 text-green-700">
                                                                                    <CheckCircle className="w-3 h-3" />
                                                                                    Jawaban Benar
                                                                                </span>
                                                                            )}
                                                                            {isUserAnswer && !isCorrect && (
                                                                                <span className="inline-flex items-center gap-1 text-red-700">
                                                                                    <XCircle className="w-3 h-3" />
                                                                                    Jawaban Anda
                                                                                </span>
                                                                            )}
                                                                            {isUserAnswer && isCorrect && (
                                                                                <span className="inline-flex items-center gap-1 text-green-700">
                                                                                    <CheckCircle className="w-3 h-3" />
                                                                                    Jawaban Anda (Benar)
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Essay/Short Answer */}
                                            {(question.type === 'essay' || question.type === 'short_answer') && (
                                                <div className="ml-11 space-y-3">
                                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                        <p className="text-sm font-medium text-blue-900 mb-2">Jawaban Anda:</p>
                                                        <p className="text-gray-900 whitespace-pre-wrap">
                                                            {answer.answer_text || <span className="italic text-gray-500">Tidak dijawab</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* True/False Answer */}
                                            {question.type === 'true_false' && (
                                                <div className="ml-11">
                                                    <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                                        <p className="text-sm font-medium mb-2">
                                                            Jawaban Anda: <span className="font-bold">{answer.answer_id === 1 ? 'Benar' : 'Salah'}</span>
                                                        </p>
                                                        {!isCorrect && correctAnswer && (
                                                            <p className="text-sm text-gray-700">
                                                                Jawaban yang benar: <span className="font-bold text-green-700">{correctAnswer.answer_text}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12">
                                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                                    <p className="mt-2 text-sm text-gray-600">Tidak ada detail jawaban tersedia</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </PesertaLayout>
    );
}