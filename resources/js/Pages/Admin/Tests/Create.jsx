import React from "react";
import { Head, useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import TestForm from "./Components/TestForm";
import Alert from '@/Components/UI/Alerts';

export default function Create({ groups, topics, modules }) {
  const { data, setData, post, processing, errors } = useForm({
    title: "",
    description: "",
    duration: 10,
    start_time: "",
    end_time: "",
    is_active: 1,
    groups: [],
    topics: [],
    module_id: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    post(route("admin.tests.store"));
  };

  return (
    <AdminLayout>
      <Head title="Buat Ujian Baru" />
      
      <div className="max-w-5xl mx-auto">
        {/* HEADER HALAMAN */}
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Buat Konfigurasi Ujian</h1>
            <p className="text-sm text-gray-500">Tentukan jadwal, durasi, dan topik pertanyaan.</p>
        </div>

        {/* ALERT ERROR VALIDASI */}
        <Alert errors={errors} />

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <TestForm
            data={data}
            setData={setData}
            errors={errors}
            processing={processing}
            groups={groups}
            topics={topics}
            modules={modules}
            submit={handleSubmit}
          />
        </div>
      </div>
    </AdminLayout>
  );
}