import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { 
  Check,
  X,
  ChevronDown,
  FileText,
} from "lucide-react";

type Leave = {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  rawStartDate: string;
  documentUrl: string | null;
};

function Leaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("leaves")
      .select(`
        id,
        user_id,
        start_date,
        end_date,
        reason,
        status,
        created_at,
        document_url,
        profiles (
          full_name
        )
      `)
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
        
        // Membersihkan path jika tersimpan full URL public Supabase
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
            .createSignedUrl(filePath, 3600); // Signed URL valid 1 jam

          if (signedUrlData) {
            fullDocumentUrl = signedUrlData.signedUrl;
          }
        }
      }

      return {
        id: item.id,
        name: item.profiles?.full_name || "Unknown",
        type: "Cuti / Sakit", 
        startDate: formatDate(item.start_date),
        endDate: formatDate(item.end_date),
        reason: item.reason || "-",
        status: item.status,
        rawStartDate: item.start_date,
        documentUrl: fullDocumentUrl,
      };
    });

    const formattedLeaves = await Promise.all(formattedLeavesPromises);

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

    const { error } = await supabase
      .from("leaves")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Gagal mengubah status cuti:", error);
      alert("Gagal mengubah status pengajuan cuti.");
      return;
    }

    setLeaves((currentLeaves) =>
      currentLeaves.map((leave) =>
        leave.id === id ? { ...leave, status } : leave
      )
    );
  };
  
  const filteredLeaves = leaves.filter((leave) => {
    const matchDate = selectedDate ? leave.rawStartDate === selectedDate : true;
    const matchStatus = statusFilter === "Semua" ? true : leave.status === statusFilter;
    return matchDate && matchStatus;
  });

  const getStatusLabel = (val: string) => {
    if (val === "pending") return "Pending";
    if (val === "approved") return "Approved";
    if (val === "rejected") return "Rejected";
    return "Semua Status";
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Pengajuan Cuti & Izin
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola dan review pengajuan cuti serta lampiran dokumen karyawan
        </p>
      </div>
      
      <div className="mb-6 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate("")}
              className="text-sm text-blue-500 hover:text-blue-700 hover:underline"
            >
              Reset Tanggal
            </button>
          )}
        </div>

        <div className="relative md:ml-auto">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition-all hover:bg-slate-50 focus:border-blue-500 md:w-48"
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
              
              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                {["Semua", "pending", "approved", "rejected"].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
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
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-medium">Nama</th>
                <th className="px-6 py-4 font-medium">Jenis Cuti</th>
                <th className="px-6 py-4 font-medium">Tanggal</th>
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
                    colSpan={7}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Memuat data...
                  </td>
                </tr>
              ) : filteredLeaves.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Data pengajuan cuti tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((leave) => (
                  <tr
                    key={leave.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {leave.name}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {leave.type}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {leave.startDate} - {leave.endDate}
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {leave.reason}
                    </td>

                    {/* TOMBOL LIHAT LAMPIRAN */}
                    <td className="px-6 py-4">
                      {leave.documentUrl ? (
                        <button
                          onClick={() => setSelectedImage(leave.documentUrl)}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition"
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
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
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
                        <>
                          <button
                            onClick={() => handleStatus(leave.id, "approved")}
                            className="mr-3 rounded-md border border-slate-300 bg-slate-200 p-1 text-green-600 hover:bg-slate-300 hover:text-green-800"
                            title="Setujui Cuti"
                          >
                            <Check size={16} />
                          </button>

                          <button
                            onClick={() => handleStatus(leave.id, "rejected")}
                            className="rounded-md border border-slate-300 bg-slate-200 p-1 text-red-600 hover:bg-slate-300 hover:text-red-800"
                            title="Tolak Cuti"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Preview Lampiran / Foto */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] rounded-xl bg-white p-3 shadow-xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-lg text-white hover:bg-black/80"
            >
              ×
            </button>
            
            <img
              src={selectedImage}
              alt="Lampiran Surat Cuti / Sakit"
              className="max-h-[75vh] max-w-[80vw] rounded-lg object-contain"
            />
            
            <a
              href={selectedImage}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700"
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