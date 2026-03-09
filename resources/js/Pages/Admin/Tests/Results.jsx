import React, { useMemo, useState, useEffect, useRef } from "react";
import { router, Head, Link } from "@inertiajs/react";
import {
  Clock, CheckCircle2, XCircle, HelpCircle, Filter, User, BookOpen,
  Lock, Unlock, AlertCircle, PlusCircle, CheckSquare, Square, Eye,
  FileCheck, FileSpreadsheet, FileText, Trash2
} from "lucide-react";

export default function Results({ testUsers = [], test, testUsersStats = null, resultsFilters = {}, resultsTestOptions = [] }) {
  const [filterTest, setFilterTest] = useState(resultsFilters?.test_id ? parseInt(resultsFilters.test_id) : null);
  const [searchUser, setSearchUser] = useState("");
  const [sortBy, setSortBy] = useState("started_at");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshInFlight = useRef(false);

  useEffect(() => {
    setFilterTest(resultsFilters?.test_id ? parseInt(resultsFilters.test_id) : null);
  }, [resultsFilters?.test_id]);

  const withResultsSection = (url) => {
    if (!url) return url;
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set("section", "results");
    return `${parsed.pathname}${parsed.search}`;
  };

  //  FIX UTAMA: Deteksi apakah data paginated atau array biasa
  const dataList = testUsers.data ? testUsers.data : testUsers;

  // Selection State
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals State
  const [lockModal, setLockModal] = useState(false);
  const [lockReason, setLockReason] = useState("");
  const [addTimeModal, setAddTimeModal] = useState(false);
  const [addMinutes, setAddMinutes] = useState(10);

  // Auto Refresh
  useEffect(() => {
    const interval = setInterval(() => {
        if (!lockModal && !addTimeModal && !refreshInFlight.current && !document.hidden) {
            refreshInFlight.current = true;
            router.reload({
              only: ['testUsers', 'testUsersStats'],
                preserveScroll: true,
                preserveState: true,
                onStart: () => setIsRefreshing(true),
                onFinish: () => {
                  refreshInFlight.current = false;
                  setIsRefreshing(false);
                },
                onError: () => {
                  refreshInFlight.current = false;
                  setIsRefreshing(false);
                },
            });
        }
    }, 10000);
    return () => clearInterval(interval);
  }, [lockModal, addTimeModal]);

  const calculateScore = (testUser) => {
    // ✅ Use realtime_score for ongoing tests, result.total_score for submitted tests
    let rawScore = 0;

    if (testUser.status === 'ongoing' || testUser.status === 'not_started') {
      // Use realtime calculated score
      rawScore = testUser.realtime_score ?? 0;
    } else {
      // Use saved result score
      rawScore = testUser.result?.total_score ?? 0;
    }

    return Number(rawScore).toFixed(2);
  };

  // Filter Logic (Pakai dataList)
  const filteredData = useMemo(() => {
    let data = dataList; //  Ganti testUsers jadi dataList
    if (searchUser) {
      const lowerSearch = searchUser.toLowerCase();
      data = data.filter((tu) =>
          tu.user?.name?.toLowerCase().includes(lowerSearch) ||
          tu.user?.email?.toLowerCase().includes(lowerSearch) ||
          tu.user?.npm?.toLowerCase().includes(lowerSearch)
      );
    }
    data = [...data].sort((a, b) => {
      const scoreA = parseFloat(calculateScore(a));
      const scoreB = parseFloat(calculateScore(b));
      if (sortBy === "started_at") return new Date(b.started_at) - new Date(a.started_at);
      else if (sortBy === "score_desc") return scoreB - scoreA;
      else if (sortBy === "score_asc") return scoreA - scoreB;
      else if (sortBy === "npm_asc") {
        const npmA = a.user?.npm || "";
        const npmB = b.user?.npm || "";
        return npmA.localeCompare(npmB, undefined, { numeric: true });
      }
      return 0;
    });
    return data;
  }, [dataList, filterTest, searchUser, sortBy]);

  // STATS: Use backend stats if available and no filters applied, otherwise calculate from filtered data
  const stats = useMemo(() => {
    // Backend stats always represent server-side filtered dataset (test_id)
    if (!searchUser && testUsersStats) {
      return {
        total: testUsersStats.total,
        completed: testUsersStats.completed,
        pending: testUsersStats.pending,
        avgScore: testUsersStats.avgScore
      };
    }

    // If filters applied, calculate from filtered data (client-side)
    const total = filteredData.length;
    const completed = filteredData.filter((tu) => tu.finished_at).length;
    const pending = total - completed;
    let totalScore = 0;
    if (total > 0) totalScore = filteredData.reduce((sum, tu) => sum + parseFloat(calculateScore(tu)), 0);
    const avgScore = total > 0 ? (totalScore / total).toFixed(2) : "0.00";
    return { total, completed, pending, avgScore };
  }, [filteredData, filterTest, searchUser, testUsersStats]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("id-ID", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const getDurationTaken = (testUser) => {
    if (!testUser.started_at || !testUser.finished_at) return "-";
    const start = new Date(testUser.started_at);
    const end = new Date(testUser.finished_at);
    const minutes = Math.floor((end - start) / 60000);
    return `${minutes} menit`;
  };

  const getTimeStatus = (testUser) => {
    if (!testUser.started_at) return { text: "-", color: "gray" };
    const start = new Date(testUser.started_at);
    const now = testUser.finished_at ? new Date(testUser.finished_at) : new Date();
    const elapsedMinutes = Math.floor((now - start) / 60000);
    const remaining = (testUser.test?.duration || 0) - elapsedMinutes;
    if (remaining < 0) return { text: `Terlampaui ${Math.abs(remaining)}m`, color: "red" };
    else if (remaining === 0) return { text: "Selesai waktu", color: "orange" };
    else return { text: `Sisa ${remaining}m`, color: remaining < 5 ? "orange" : "green" };
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) setSelectedIds([]);
    else setSelectedIds(filteredData.map(d => d.id));
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  // --- HANDLERS ---
  const handleBulkLock = () => {
    if (selectedIds.length === 0) return;
    setLockModal(true);
    setLockReason("");
  };

  const submitBulkLock = () => {
    if (!lockReason.trim()) { alert("Alasan penguncian harus diisi!"); return; }
    router.post(route("admin.test-users.bulk-lock"), { ids: selectedIds, lock_reason: lockReason }, {
      preserveScroll: true, preserveState: true,
      onSuccess: () => { setLockModal(false); setSelectedIds([]); setLockReason(""); }
    });
  };

  const handleBulkUnlock = () => {
     if (selectedIds.length === 0) return;
     if (confirm(`Buka kunci ${selectedIds.length} peserta terpilih?`)) {
        router.post(route("admin.test-users.bulk-unlock"), { ids: selectedIds }, {
            preserveScroll: true, preserveState: true,
            onSuccess: () => setSelectedIds([])
        });
     }
  };

  const handleBulkAddTime = () => {
    if (selectedIds.length === 0) return;
    setAddTimeModal(true);
    setAddMinutes(10);
  };

  const submitBulkAddTime = () => {
     router.post(route("admin.test-users.bulk-add-time"), { ids: selectedIds, minutes: addMinutes }, {
        preserveScroll: true, preserveState: true,
        onSuccess: () => { setAddTimeModal(false); setSelectedIds([]); }
     });
  };

  const handleBulkValidate = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Publish hasil ${selectedIds.length} peserta?\nPeserta akan dapat melihat nilai mereka.`)) {
        router.post(route("admin.test-users.bulk-validate"), { ids: selectedIds }, {
            preserveScroll: true, preserveState: true,
            onSuccess: () => setSelectedIds([])
        });
     }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`⚠️ PERINGATAN BAHAYA!\n\nAnda akan MENGHAPUS ${selectedIds.length} data peserta secara permanen.\nNilai, jawaban, dan riwayat ujian mereka akan hilang dan TIDAK BISA DIKEMBALIKAN.\n\nApakah Anda yakin ingin melanjutkan?`)) {
        router.post(route("admin.test-users.bulk-delete"), { ids: selectedIds }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setSelectedIds([])
        });
    }
  };

  const handleExport = (type) => {
      const params = { type: type, test_id: filterTest, search: searchUser, sort: sortBy };
      const url = route('admin.test-users.export', params);
      window.open(url, '_blank');
  };

  const handleFilterTestChange = (nextValue) => {
    const nextTestId = nextValue ? parseInt(nextValue) : null;
    setFilterTest(nextTestId);
    router.get(route('admin.tests.index'), {
      section: 'results',
      test_id: nextTestId,
      per_page: 100,
    }, {
      preserveScroll: true,
      preserveState: false,
      replace: true,
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Peserta</p><p className="text-2xl font-black text-blue-900 mt-1">{stats.total}</p></div>
            <User className="w-10 h-10 text-blue-300" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-bold text-green-600 uppercase tracking-wider">Selesai</p><p className="text-2xl font-black text-green-900 mt-1">{stats.completed}</p></div>
            <CheckCircle2 className="w-10 h-10 text-green-300" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-bold text-yellow-600 uppercase tracking-wider">Pending</p><p className="text-2xl font-black text-yellow-900 mt-1">{stats.pending}</p></div>
            <Clock className="w-10 h-10 text-yellow-300" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Rata-rata Nilai</p><p className="text-2xl font-black text-purple-900 mt-1">{stats.avgScore}</p></div>
            <BookOpen className="w-10 h-10 text-purple-300" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-end">
            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-3/4">
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">
                        Filter Ujian {isRefreshing && <span className="ml-2 text-blue-500 text-[10px] animate-pulse">● Live Updating...</span>}
                    </label>
                    <select value={filterTest || ""} onChange={(e) => handleFilterTestChange(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {resultsTestOptions.map((testOption) => (
                      <option key={testOption.id} value={testOption.id}>{testOption.title}</option>
                    ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">Cari Peserta</label>
                    <input type="text" value={searchUser} onChange={(e) => setSearchUser(e.target.value)} placeholder="Nama, Email, atau NPM..." className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex-1">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">Urutkan</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="started_at">Terbaru Mulai</option>
                        <option value="npm_asc">NPM Terkecil (A-Z)</option>
                        <option value="score_desc">Nilai Tertinggi</option>
                        <option value="score_asc">Nilai Terendah</option>
                    </select>
                </div>
            </div>
            <div className="flex gap-2 w-full xl:w-auto justify-end">
                <button onClick={() => handleExport('excel')} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition shadow-sm">
                    <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
                <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition shadow-sm">
                    <FileText className="w-4 h-4" /> PDF
                </button>
            </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
         <div className="sticky top-0 z-20 bg-blue-600 text-white rounded-xl shadow-lg p-4 mb-4 flex justify-between items-center animate-in slide-in-from-top-2 duration-300">
            <div className="font-bold flex items-center gap-2">
               <CheckCircle2 className="w-5 h-5" /> {selectedIds.length} Peserta Dipilih
            </div>
            <div className="flex gap-2">
               <button onClick={handleBulkValidate} className="flex items-center gap-1 bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-indigo-600 transition shadow-sm border border-indigo-400">
                  <FileCheck className="w-4 h-4" /> Publish
               </button>
               <button onClick={handleBulkAddTime} className="flex items-center gap-1 bg-white text-blue-700 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-blue-50 transition">
                  <PlusCircle className="w-4 h-4" /> + Waktu
               </button>
               <button onClick={handleBulkLock} className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-red-600 transition">
                  <Lock className="w-4 h-4" /> Kunci
               </button>
               <button onClick={handleBulkUnlock} className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-green-600 transition">
                  <Unlock className="w-4 h-4" /> Buka
               </button>
               <button onClick={handleBulkDelete} className="flex items-center gap-1 bg-red-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-red-800 transition shadow-sm border border-red-800 ml-2">
                  <Trash2 className="w-4 h-4" /> Hapus
               </button>
               <button onClick={() => setSelectedIds([])} className="ml-2 text-white/80 hover:text-white text-xs underline">Batal</button>
            </div>
         </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
                <th className="px-4 py-3 w-10 text-center">
                    <button onClick={toggleSelectAll} className="text-gray-600 hover:text-blue-600">
                        {selectedIds.length === filteredData.length && filteredData.length > 0 ? (<CheckSquare className="w-4 h-4" />) : (<Square className="w-4 h-4" />)}
                    </button>
                </th>
                <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">NPM</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Mulai</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Waktu</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700 uppercase tracking-wider">Nama</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Nilai</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Publish</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="11" className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center gap-2"><HelpCircle className="w-12 h-12 opacity-20" /> Belum ada hasil ujian</div>
                  </td>
                </tr>
              )}
              {filteredData.map((testUser, index) => {
                const timeStatus = getTimeStatus(testUser);
                const statusColor = timeStatus.color === "red" ? "bg-red-100 text-red-700" : timeStatus.color === "orange" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
                const isSelected = selectedIds.includes(testUser.id);
                const isValidated = testUser.result?.status === 'validated';
                const rowNumber = (testUsers?.from || 1) + index;

                return (
                  <tr key={testUser.id} className={`border-b border-gray-100 transition ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 text-center">
                        <button onClick={() => toggleSelectOne(testUser.id)} className={`${isSelected ? 'text-blue-600' : 'text-gray-300 hover:text-gray-500'}`}>
                            {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-600">{rowNumber}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono font-bold">{testUser.user?.npm || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono">{formatDateTime(testUser.started_at)}</td>
                    <td className="px-4 py-3 text-gray-600">{getDurationTaken(testUser)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-gray-900">{testUser.user?.name || "-"}</p>
                        {testUser.user?.email && (
                          <p className="text-gray-500 text-xs">{testUser.user.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="font-black text-lg text-blue-600">{calculateScore(testUser)}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                        {isValidated ? (
                            <span className="text-green-600 flex justify-center" title="Sudah Dipublish"><CheckCircle2 className="w-5 h-5" /></span>
                        ) : (
                            <span className="text-gray-300 flex justify-center" title="Belum Publish"><XCircle className="w-5 h-5" /></span>
                        )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {testUser.is_locked ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200 font-bold text-[10px] uppercase">
                            <Lock className="w-3 h-3" /> Dikunci
                        </div>
                      ) : testUser.finished_at ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold inline-block uppercase tracking-wide bg-green-100 text-green-700">
                            Selesai
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block uppercase tracking-wide ${statusColor}`}>
                            Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                         <button onClick={() => router.visit(route("admin.analytics.show", testUser.id))} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition font-bold text-xs">
                           <Eye className="w-3 h-3" /> Detail
                         </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          <p>
            Menampilkan {testUsers.from || 1} - {testUsers.to || filteredData.length} dari {testUsers.total || filteredData.length} hasil ujian
            {(testUsers.current_page && testUsers.last_page) ? ` • Halaman ${testUsers.current_page} / ${testUsers.last_page}` : ''}
          </p>
        </div>

        {testUsers.links && testUsers.links.length > 3 && (
          <div className="flex gap-2">
            {testUsers.links.map((link, index) => {
              if (link.url === null) return null;

              return (
                <Link
                  key={index}
                  href={withResultsSection(link.url)}
                  preserveState
                  preserveScroll
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    link.active
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                />
              );
            })}
          </div>
        )}
      </div>

      {lockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-4"><AlertCircle className="w-6 h-6 text-red-600" /><h3 className="text-lg font-bold text-gray-900">Kunci {selectedIds.length} Peserta</h3></div>
            <p className="text-sm text-gray-600 mb-4">Peserta yang dipilih tidak akan bisa melanjutkan ujian.</p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Alasan</label>
              <textarea value={lockReason} onChange={(e) => setLockReason(e.target.value)} placeholder="Contoh: Kecurangan, dll..." rows="3" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setLockModal(false)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg text-sm">Batal</button>
              <button onClick={submitBulkLock} className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-sm">Kunci</button>
            </div>
          </div>
        </div>
      )}

      {addTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-4"><PlusCircle className="w-6 h-6 text-blue-600" /><h3 className="text-lg font-bold text-gray-900">Tambah Waktu ({selectedIds.length} Peserta)</h3></div>
            <p className="text-sm text-gray-600 mb-4">Waktu tambahan (menit).</p>
            <div className="mb-4">
              <input type="number" min="1" value={addMinutes} onChange={(e) => setAddMinutes(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAddTimeModal(false)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg text-sm">Batal</button>
              <button onClick={submitBulkAddTime} className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
