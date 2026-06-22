import React from "react";
import { Head, useForm } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import TestForm from "./Components/TestForm";

export default function Edit({ test, groups, topics, modules }) {
  const formatDT = (str) => (str ? str.replace(" ", "T").substring(0, 16) : "");
  const initialModuleId = test?.topics?.[0]?.module_id || "";

  const { data, setData, put, processing, errors } = useForm({
    title: test.title || "",
    description: test.description || "",
    duration: test.duration || 60,
    start_time: formatDT(test.start_time),
    end_time: formatDT(test.end_time),
    is_active: test.is_active,
    groups: test.groups ? test.groups.map((g) => g.id) : [],
    module_id: initialModuleId,
    topics: test.topics
      ? test.topics.map((t) => ({
          id: t.id,
          total_questions: t.pivot.total_questions,
          question_type: t.pivot.question_type,
        }))
      : [],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    put(route("admin.tests.update", test.id));
  };

  return (
    <AdminLayout>
      <Head title="Edit Ujian" />
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <TestForm
          data={data}
          setData={setData}
          errors={errors}
          processing={processing}
          groups={groups}
          topics={topics}
          modules={modules}
          submit={handleSubmit}
          editMode={true}
        />
      </div>
    </AdminLayout>
  );
}
