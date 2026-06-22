import React, { useMemo } from "react";
import { Head, usePage } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";

import Class from "./Class";
import Questions from "./Questions";
import Topic from "./Topic";
import Results from "./Results";
import ImportPage from "./Import";

export default function Index(props) {
  const { url } = usePage();

  const section = useMemo(() => {
    const params = new URLSearchParams(url.split("?")[1]);
    return params.get("section") || "class";
  }, [url]);

  const renderSection = () => {
    switch (section) {
      case "class":
        return <Class {...props} />;

      case "questions":
        return <Questions {...props} />;

      case "subjects":
        return <Topic {...props} />;

      case "results":
        return <Results {...props} />;

      case "import":
        return <ImportPage {...props} />;

      default:
        return <Class {...props} />;
    }
  };

  return (
    <AdminLayout>
      <Head title={`Modules - ${section}`} />

      <div className="space-y-6">
        <div key={section}>
          {renderSection()}
        </div>
      </div>
    </AdminLayout>
  );
}
