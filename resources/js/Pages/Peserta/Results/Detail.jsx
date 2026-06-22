import React from "react";
import { Head, Link } from "@inertiajs/react";
import PesertaLayout from "@/Layouts/PesertaLayout";
import { ArrowLeft } from "lucide-react";

// Import Komponen Modular
import ResultHeader from "./Detail-Components/ResultHeader";
import ResultStats from "./Detail-Components/ResultStats";
import QuestionReview from "./Detail-Components/QuestionReview";
import WaitingValidation from "./Detail-Components/WaitingValidation";

export default function Detail({ auth, testUser, isValidated, message, reviewData }) {
  
  // PERBAIKAN 1: Hitung total dari reviewData (Total seluruh soal ujian)
  // Jangan pakai testUser.answers.length karena itu cuma jumlah yang dijawab user.
  const totalQuestions = reviewData?.length || 0;

  return (
    <PesertaLayout 
      user={auth.user}
      header={
        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
          Detail Hasil Ujian
        </h2>
      }
    >
      <Head title={`Hasil: ${testUser.test?.title || 'Ujian'}`} />

      <div className="py-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Tombol Kembali */}
        <div className="mb-6">
            <Link 
                href={route('peserta.results.index')} 
                className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Kembali ke Daftar Riwayat
            </Link>
        </div>

        {/* LOGIC GATE: Validasi Admin */}
        {!isValidated ? (
          <WaitingValidation message={message} />
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            
            <ResultHeader testUser={testUser} />

            <ResultStats result={testUser.result} totalQuestions={totalQuestions} />

            {/* PERBAIKAN 2: Gunakan prop 'questions', BUKAN 'answers' */}
            <QuestionReview questions={reviewData} />
            
          </div>
        )}

      </div>
    </PesertaLayout>
  );
}