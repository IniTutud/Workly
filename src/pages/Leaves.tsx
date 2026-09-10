import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { 
  Check,
  X,
  ChevronDown,
  FileText,
  Settings,
  Calendar,
  Award
} from "lucide-react";

type Leave = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  rawStartDate: string;
  documentUrl: string | null;
  createdAt: string; // Tambahan untuk referensi sorting waktu pengajuan
};

function Leaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  const [leaveSetting, setLeaveSetting] = useState<{
    year: number;
    total_days: number;
  } | null>(null);

  const [leaveDays, setLeaveDays] = useState("");
  const [savingLeaveSetting, setSavingLeaveSetting] = useState(false);
  const [showSettingModal, setShowSettingModal] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    fetchLeaves();    
    fetchLeaveSetting();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, statusFilter]);

  const fetchLeaveSetting = async () => {
    const currentYear = new Date().getFullYear();

    const { data, error } = await supabase
      .from("leave_settings")
      .select("year, total_days")
      .eq("year", currentYear)
      .maybeSingle();

    if (error) {
      console.error("Gagal mengambil pengaturan cuti:", error);
      return;
    }

    setLeaveSetting(data);
    setLeaveDays(data ? String(data.total_days) : "");
  };

  const handleSaveLeaveSetting = async () => {
    const currentYear = new Date().getFullYear();
    const totalDays = Number(leaveDays);

    if (!Number.isInteger(totalDays) || totalDays < 0) {
      alert("Jatah cuti harus berupa angka 0 atau lebih.");
      return;
    }

    setSavingLeaveSetting(true);

    const { data, error } = await supabase
      .from("leave_settings")
      .upsert(
        {
          year: currentYear,
          total_days: totalDays,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "year",
        }
      )
      .select("year, total_days")
      .single();

    setSavingLeaveSetting(false);

    if (error) {
      console.error("Gagal menyimpan pengaturan cuti:", error);
      alert(`Gagal menyimpan pengaturan cuti: ${error.message}`);
      return;
    }

    setLeaveSetting(data);
    setLeaveDays(String(data.total_days));
    setShowSettingModal(false);

    alert(`Jatah cuti tahun ${currentYear} berhasil disimpan.`);
  };

  const fetchLeaves = async () => {
    setLoading(true);
    
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name");

    const profileMap = new Map();
    if (profilesData) {
      profilesData.forEach((p: any) => profileMap.set(p.id, p.full_name));
    }
    
    const { data, error } = await supabase
      .from("leaves")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal mengambil data cuti:", error);
      alert("Gagal mengambil data pengajuan cuti.");
      setLoading(false);
      return;
    }

    const formattedLeavesPromises = (data || []).map(async (item: any) => {
      let fullDocumentUrl = null;

      if (item.document_url) {
        let filePath = item.document_url;
              
        if (filePath.includes("/public/leave_documents/")) {
          const parts = filePath.split("/public/leave_documents/");
          if (parts.length > 1) {
            filePath = parts[1];
          }
        }

        if (filePath.startsWith("http")) {
          fullDocumentUrl = filePath;
        } else {                
          const { data: signedUrlData } = await supabase.storage
            .from("leave_documents") 
            .createSignedUrl(filePath, 3600); 

          if (signedUrlData) {
            fullDocumentUrl = signedUrlData.signedUrl;
          }
        }
      }
      
      const employeeName = 
        profileMap.get(item.user_id) || 
        profileMap.get(item.employee_id) || 
        item.name || 
        "Unknown";

      return {
        id: item.id,
        name: employeeName,
        startDate: formatDate(item.start_date),
        endDate: formatDate(item.end_date),
        reason: item.reason || "-",
        status: item.status,
        rawStartDate: item.start_date,
        documentUrl: fullDocumentUrl,
        createdAt: item.created_at || "",
      };
    });

    const formattedLeaves = await Promise.all(formattedLeavesPromises);

    // =========================================================
    // SORTING: Prioritaskan status 'pending' di urutan paling atas
    // =========================================================
    formattedLeaves.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      // Jika statusnya sama, urutkan berdasarkan waktu pengajuan terbaru (created_at)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setLeaves(formattedLeaves);
    setLoading(false);
  };

  const formatDate = (date: string) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleStatus = async (
    id: string,
    status: "approved" | "rejected"
  ) => {
    const action =
      status === "approved"
        ? "menyetujui"
        : "menolak";

    const confirmed = window.confirm(
      `Apakah kamu yakin ingin ${action} pengajuan cuti ini?`
    );

    if (!confirmed) return;

    try {
      const { data, error } = await supabase.functions.invoke(
        "approve-leaves",
        {
          body: {
            leave_id: id,
            action: status === "approved" ? "APPROVED" : "REJECTED",
          },
        }
      );

      if (error) {
        console.error("EDGE FUNCTION ERROR:", error);
        alert(`Gagal memproses pengajuan cuti: ${error.message}`);
        return;
      }

      console.log("Edge Function berhasil:", data);

      await fetchLeaves();

      alert(
        status === "approved"
          ? "Pengajuan cuti berhasil disetujui."
          : "Pengajuan cuti berhasil ditolak."
      );
    } catch (error: any) {
      console.error("ERROR:", error);
      alert(`Terjadi kesalahan: ${error.message}`);
    }
  };
  
  const filteredLeaves = leaves.filter((leave) => {
    const matchDate = selectedDate ? leave.rawStartDate === selectedDate : true;
    const matchStatus = statusFilter === "Semua" ? true : leave.status === statusFilter;
    return matchDate && matchStatus;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredLeaves.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedLeaves = filteredLeaves.slice(startIndex, startIndex + rowsPerPage);

  const getStatusLabel = (val: string) => {
    if (val === "pending") return "Pending";
    if (val === "approved") return "Approved";
    if (val === "rejected") return "Rejected";
    return "Semua Status";
  };

  return (
    <div className="scrollbar-none space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Persetujuan Cuti</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola izin dan pengajuan cuti karyawan secara terpusat</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Award size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Jatah Cuti ({leaveSetting?.year || new Date().getFullYear()})</p>
              <p className="text-sm font-bold text-slate-800">{leaveSetting ? `${leaveSetting.total_days} Hari` : "Belum diatur"}</p>
            </div>
          </div>

          <button
            onClick={() => setShowSettingModal(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Settings size={18} className="text-slate-500" /> Atur Jatah Cuti
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Calendar size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-300 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-blue-500"
            />
          </div>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate("")}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              Reset Tanggal
            </button>
          )}
        </div>

        <div className="relative md:ml-auto w-full md:w-auto">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all hover:bg-slate-50 focus:border-blue-500 md:w-48"
          >
            <span>{getStatusLabel(statusFilter)}</span>
            <ChevronDown size={18} className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDropdownOpen && (
            <>          
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              ></div>
              
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                {["Semua", "pending", "approved", "rejected"].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      statusFilter === status
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 font-medium">Nama Karyawan</th>             
                <th className="px-6 py-4 font-medium">Tanggal Cuti</th>
                <th className="px-6 py-4 font-medium">Alasan</th>
                <th className="px-6 py-4 font-medium">Lampiran</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    Memuat data pengajuan cuti...
                  </td>
                </tr>
              ) : paginatedLeaves.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    Tidak ada data pengajuan cuti yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedLeaves.map((leave) => (
                  <tr
                    key={leave.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {leave.name}
                    </td>               

                    <td className="px-6 py-4 text-slate-600">
                      {leave.startDate} - {leave.endDate}
                    </td>

                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                      {leave.reason}
                    </td>
                    
                    <td className="px-6 py-4">
                      {leave.documentUrl ? (
                        <button
                          onClick={() => setSelectedImage(leave.documentUrl)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition"
                        >
                          <FileText size={14} />
                          Lihat Lampiran
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Tidak ada</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          leave.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : leave.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {leave.status === "pending"
                          ? "Pending"
                          : leave.status === "approved"
                          ? "Approved"
                          : "Rejected"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      {leave.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleStatus(leave.id, "approved")}
                            className="rounded-lg border border-green-200 bg-green-50 p-2 text-green-600 hover:bg-green-100 transition"
                            title="Setujui Cuti"
                          >
                            <Check size={16} />
                          </button>

                          <button
                            onClick={() => handleStatus(leave.id, "rejected")}
                            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 transition"
                            title="Tolak Cuti"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Selesai diproses</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && filteredLeaves.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-white px-5 py-3 shadow-sm">
          <p className="text-xs text-slate-500">
            Menampilkan <span className="font-medium text-slate-700">{startIndex + 1}</span> - <span className="font-medium text-slate-700">{Math.min(startIndex + rowsPerPage, filteredLeaves.length)}</span> dari <span className="font-medium text-slate-700">{filteredLeaves.length}</span> pengajuan cuti
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="text-xs font-medium text-slate-600">
              Hal. {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
      
      {showSettingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Pengaturan Jatah Cuti</h2>
                <p className="mt-0.5 text-xs text-slate-500">Tentukan kuota hari cuti tahunan untuk seluruh karyawan.</p>
              </div>
              <button 
                onClick={() => setShowSettingModal(false)} 
                disabled={savingLeaveSetting}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Tahun Berlaku</label>
                <input
                  type="text"
                  value={leaveSetting?.year || new Date().getFullYear()}
                  readOnly
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Jumlah Jatah Hari</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={leaveDays}
                    onChange={(e) => setLeaveDays(e.target.value)}
                    placeholder="Contoh: 12"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-14"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Hari</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setShowSettingModal(false)}
                disabled={savingLeaveSetting}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveLeaveSetting}
                disabled={savingLeaveSetting}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {savingLeaveSetting ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] rounded-2xl bg-white p-4 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition"
            >
              ×
            </button>
            
            <img
              src={selectedImage}
              alt="Lampiran Surat Cuti / Sakit"
              className="max-h-[75vh] max-w-[80vw] rounded-xl object-contain bg-slate-50 border border-slate-100 p-2"
            />
            
            <a
              href={selectedImage}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              Buka di Tab Baru / Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default Leaves;