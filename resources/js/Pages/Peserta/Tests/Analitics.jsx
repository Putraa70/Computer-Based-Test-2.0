import { Head } from '@inertiajs/react';
import PesertaLayout from '@/Layouts/PesertaLayout';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Award, Target, Calendar, CheckCircle } from 'lucide-react';

export default function Analytics({ summary }) {
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    // Data untuk chart
    const performanceData = summary?.performance_by_test?.map((item, idx) => ({
        name: `Ujian ${idx + 1}`,
        score: item.score || 0,
        maxScore: 100,
    })) || [];

    const topicData = summary?.performance_by_topic?.map((item) => ({
        name: item.topic_name || 'Unknown',
        score: item.average_score || 0,
        correct: item.correct_answers || 0,
        total: item.total_questions || 0,
    })) || [];

    const statusData = [
        { name: 'Selesai', value: summary?.completed_tests || 0, color: '#10b981' },
        { name: 'Sedang Berlangsung', value: summary?.ongoing_tests || 0, color: '#3b82f6' },
        { name: 'Belum Dimulai', value: summary?.not_started_tests || 0, color: '#6b7280' },
    ].filter(item => item.value > 0);

    const getScoreTrend = () => {
        if (!performanceData || performanceData.length < 2) return null;
        const recent = performanceData[performanceData.length - 1].score;
        const previous = performanceData[performanceData.length - 2].score;
        const diff = recent - previous;
        return { diff, isPositive: diff > 0 };
    };

    const scoreTrend = getScoreTrend();

    return (
        <PesertaLayout>
            <Head title="Analitik Pembelajaran" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">Analitik Pembelajaran</h1>
                        <p className="mt-2 text-gray-600">Pantau perkembangan dan pencapaian Anda</p>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Rata-rata Nilai</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">
                                        {summary?.average_score ? summary.average_score.toFixed(1) : '0.0'}
                                    </p>
                                    {scoreTrend && (
                                        <div className={`flex items-center gap-1 mt-2 text-sm ${scoreTrend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                            {scoreTrend.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                            <span>{Math.abs(scoreTrend.diff).toFixed(1)} dari ujian sebelumnya</span>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-blue-100 rounded-lg p-3">
                                    <Award className="w-8 h-8 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Nilai Tertinggi</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">
                                        {summary?.highest_score || 0}
                                    </p>
                                </div>
                                <div className="bg-green-100 rounded-lg p-3">
                                    <Target className="w-8 h-8 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Ujian</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">
                                        {summary?.total_tests || 0}
                                    </p>
                                </div>
                                <div className="bg-purple-100 rounded-lg p-3">
                                    <Calendar className="w-8 h-8 text-purple-600" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Tingkat Kelulusan</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">
                                        {summary?.pass_rate ? `${summary.pass_rate.toFixed(1)}%` : '0%'}
                                    </p>
                                </div>
                                <div className="bg-yellow-100 rounded-lg p-3">
                                    <CheckCircle className="w-8 h-8 text-yellow-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Performance Over Time */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Perkembangan Nilai</h2>
                            {performanceData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={performanceData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} name="Nilai" />
                                        <Line type="monotone" dataKey="maxScore" stroke="#e5e7eb" strokeWidth={2} strokeDasharray="5 5" name="Maks" />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-72 flex items-center justify-center text-gray-500">
                                    Belum ada data nilai
                                </div>
                            )}
                        </div>

                        {/* Test Status Distribution */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Ujian</h2>
                            {statusData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-72 flex items-center justify-center text-gray-500">
                                    Belum ada data status
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Performance by Topic */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performa per Topik</h2>
                        {topicData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={topicData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="score" fill="#3b82f6" name="Rata-rata Nilai" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-96 flex items-center justify-center text-gray-500">
                                Belum ada data topik
                            </div>
                        )}
                    </div>

                    {/* Detailed Topic Stats */}
                    {topicData.length > 0 && (
                        <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900">Detail Performa Topik</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Topik
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Benar
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total Soal
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Akurasi
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Rata-rata Nilai
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {topicData.map((topic, idx) => {
                                            const accuracy = topic.total > 0 ? ((topic.correct / topic.total) * 100).toFixed(1) : 0;
                                            return (
                                                <tr key={idx}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {topic.name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {topic.correct}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {topic.total}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <div className="flex items-center">
                                                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                                                <div
                                                                    className="bg-blue-600 h-2 rounded-full"
                                                                    style={{ width: `${accuracy}%` }}
                                                                />
                                                            </div>
                                                            <span>{accuracy}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {topic.score.toFixed(1)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PesertaLayout>
    );
}