import ExamStatusBadge from "./ExamStatusBadge";

export default function TestCard({ testUser }) {
    const { test, status, result } = testUser;

    return (
        <div className="border rounded-lg p-4 flex items-center justify-between">
            <div>
                <h3 className="font-semibold text-gray-800">
                    {test.title}
                </h3>
                <p className="text-sm text-gray-500">
                    Durasi: {test.duration} menit
                </p>
            </div>

            <div className="flex items-center gap-4">
                <ExamStatusBadge status={status} result={result} />
            </div>
        </div>
    );
}
