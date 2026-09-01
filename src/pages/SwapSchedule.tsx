import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import {
  Check,
  X,
  ChevronDown
} from "lucide-react";

type SwapStatus = "pending" | "approved" | "rejected";

type SwapRequest = {
  id: string;
  requester_id: string;
  target_user_id: string;
  date_from: string;
  date_to: string;
  reason: string;
  status: SwapStatus;
  created_at: string;
  requester_name: string;
  target_name: string;
};

function SwapSchedule() {
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("Semua");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchSwapRequests();
  }, []);

  const fetchSwapRequests = async () => {
    setLoading(true);

    try {      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (profilesError) {
        console.error("Gagal mengambil profiles:", profilesError);
        alert("Gagal mengambil data karyawan.");
        return;
      }
      
      const profileMap = new Map<string, string>();

      (profilesData || []).forEach((profile) => {
        profileMap.set(profile.id, profile.full_name);
      });
      
      const { data, error } = await supabase
        .from("shift_swap_requests")
        .select(
          "id, requester_id, target_user_id, date_from, date_to, reason, status, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal mengambil pengajuan swap:", error);
        alert("Gagal mengambil data pengajuan tukar jadwal.");
        return;
      }

      const formattedData: SwapRequest[] = (data || []).map((item: any) => ({
        id: String(item.id),
        requester_id: item.requester_id,
        target_user_id: item.target_user_id,
        date_from: item.date_from,
        date_to: item.date_to,
        reason: item.reason || "-",
        status: item.status,
        created_at: item.created_at,
        requester_name:
          profileMap.get(item.requester_id) || "Karyawan tidak ditemukan",
        target_name:
          profileMap.get(item.target_user_id) || "Karyawan tidak ditemukan",
      }));

      setRequests(formattedData);
    } catch (error) {
      console.error("ERROR:", error);
      alert("Terjadi kesalahan saat mengambil data pengajuan.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date: string) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleStatus = async (
    requestId: string,
    action: "APPROVED" | "REJECTED"
  ) => {
    const request = requests.find((item) => item.id === requestId);

    if (!request) return;

    const actionText = action === "APPROVED" ? "menyetujui" : "menolak";

    const confirmed = window.confirm(
      `Apakah kamu yakin ingin ${actionText} pengajuan tukar jadwal dari ${request.requester_name}?`
    );

    if (!confirmed) return;

    setProcessingId(requestId);

    try {
      const { data, error } = await supabase.functions.invoke(
        "swap-approval",
        {
          body: {
            swap_request_id: requestId,
            action,
          },
        }
      );

      if (error) {
        console.error("EDGE FUNCTION ERROR:", error);
        alert(`Gagal memproses pengajuan: ${error.message}`);
        return;
      }

      console.log("Swap approval response:", data);
      
      const newStatus: SwapStatus =
        action === "APPROVED" ? "approved" : "rejected";

      setRequests((currentRequests) =>
        currentRequests.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status: newStatus,
              }
            : item
        )
      );

      alert(
        action === "APPROVED"
          ? "Pengajuan tukar jadwal berhasil disetujui."
          : "Pengajuan tukar jadwal berhasil ditolak."
      );
    } catch (error) {
      console.error("ERROR:", error);
      alert("Terjadi kesalahan saat memproses pengajuan.");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "pending") return "Pending";
    if (status === "approved") return "Approved";
    if (status === "rejected") return "Rejected";

    return status;
  };

  const getStatusClass = (status: SwapStatus) => {
    if (status === "pending") {
      return "bg-yellow-100 text-yellow-700";
    }

    if (status === "approved") {
      return "bg-green-100 text-green-700";
    }

    return "bg-red-100 text-red-700";
  };

  const filteredRequests = requests.filter((request) => {
    if (statusFilter === "Semua") {
      return true;
    }

    return request.status === statusFilter;
  });

  return (
    <div>      
      <div className="mb-8">
        <div className="flex items-center gap-3">          
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Pengajuan Tukar Jadwal
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Kelola dan review pengajuan pertukaran jadwal karyawan
            </p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div>
          <p className="text-sm text-slate-500">
            Total Pengajuan
          </p>

          <p className="mt-1 text-lg font-semibold text-slate-900">
            {filteredRequests.length}
          </p>
        </div>

        <div className="relative md:ml-auto">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition-all hover:bg-slate-50 focus:border-blue-500 md:w-48"
          >
            <span>{getStatusLabel(statusFilter)}</span>

            <ChevronDown
              size={18}
              className={`text-slate-400 transition-transform ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />

              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                {["Semua", "pending", "approved", "rejected"].map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        statusFilter === status
                          ? "bg-blue-50 font-medium text-blue-700"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {getStatusLabel(status)}
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-250 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-medium">
                  Pengaju
                </th>

                <th className="px-6 py-4 font-medium">
                  Ditukar Dengan
                </th>

                <th className="px-6 py-4 font-medium">
                  Jadwal Pengaju
                </th>

                <th className="px-6 py-4 font-medium">
                  Jadwal Target
                </th>

                <th className="px-6 py-4 font-medium">
                  Alasan
                </th>

                <th className="px-6 py-4 font-medium">
                  Diajukan
                </th>

                <th className="px-6 py-4 font-medium">
                  Status
                </th>

                <th className="px-6 py-4 text-right font-medium">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    Memuat data pengajuan...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    Tidak ada pengajuan tukar jadwal.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-slate-50"
                  >
                    {/* Pengaju */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {request.requester_name}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        ID: {request.requester_id.slice(0, 8)}...
                      </div>
                    </td>

                    {/* Target */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {request.target_name}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        ID: {request.target_user_id.slice(0, 8)}...
                      </div>
                    </td>

                    {/* Date From */}
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(request.date_from)}
                    </td>

                    {/* Date To */}
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(request.date_to)}
                    </td>

                    {/* Reason */}
                    <td className="max-w-55 px-6 py-4 text-slate-500">
                      <div className="truncate" title={request.reason}>
                        {request.reason}
                      </div>
                    </td>

                    {/* Created At */}
                    <td className="px-6 py-4 text-slate-500">
                      {formatDateTime(request.created_at)}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          request.status
                        )}`}
                      >
                        {getStatusLabel(request.status)}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right">
                      {request.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              handleStatus(
                                request.id,
                                "APPROVED"
                              )
                            }
                            disabled={processingId === request.id}
                            className="rounded-md border border-slate-300 bg-slate-200 p-2 text-green-600 transition hover:bg-slate-300 hover:text-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Setujui"
                          >
                            <Check size={16} />
                          </button>

                          <button
                            onClick={() =>
                              handleStatus(
                                request.id,
                                "REJECTED"
                              )
                            }
                            disabled={processingId === request.id}
                            className="rounded-md border border-slate-300 bg-slate-200 p-2 text-red-600 transition hover:bg-slate-300 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Tolak"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Selesai
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SwapSchedule;