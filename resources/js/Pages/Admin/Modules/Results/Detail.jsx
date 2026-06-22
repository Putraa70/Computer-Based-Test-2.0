import React from "react";
import AdminLayout from "@/Layouts/AdminLayout";
import Button from "@/Components/UI/Button";

export default function ResultDetail() {
  return (
    <AdminLayout title="Exam Analytics Detail">
      <div className="space-y-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase">
                Exam Performance Analysis
              </h2>
              <p className="text-sm text-gray-500 font-medium">
                Topic: Anatomy I | Date: 2025-12-22
              </p>
            </div>
            <Button variant="outline" className="border-2">
              Export Comprehensive Report (PDF)
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-[10px] font-black text-blue-400 uppercase">
                KR-20 Reliability
              </p>
              <p className="text-2xl font-black text-blue-700">0.82</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <p className="text-[10px] font-black text-green-400 uppercase">
                Discrimination Index
              </p>
              <p className="text-2xl font-black text-green-700">0.34</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <p className="text-[10px] font-black text-orange-400 uppercase">
                Mean Difficulty
              </p>
              <p className="text-2xl font-black text-orange-700">0.62</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <p className="text-[10px] font-black text-purple-400 uppercase">
                Standard Deviation
              </p>
              <p className="text-2xl font-black text-purple-700">12.4</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden p-20 text-center">
          <span className="material-icons text-7xl text-gray-200 mb-4">
            query_stats
          </span>
          <p className="text-gray-400 italic">
            Item Analysis charts and Distractor Efficiency data will be rendered
            here upon backend synchronization.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
