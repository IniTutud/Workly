import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";

type Attendance = {
  id: string;
  user_id: string;
  clock_in: string | null;
  clock_out: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
};

type Leave = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  document_url: string | null;
  created_at: string;
};

export default function RekapAbsensi() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth()
  );

  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      // User yang sedang login
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("User belum login");
        return;
      }

      // =========================
      // DATA ATTENDANCE
      // =========================
      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("attendances")
          .select("*")
          .eq("user_id", user.id)
          .order("clock_in", { ascending: false });

      if (attendanceError) {
        console.error(
          "Gagal mengambil attendance:",
          attendanceError
        );
      } else {
        setAttendance(attendanceData || []);
      }

      // =========================
      // DATA CUTI
      // =========================
      const { data: leaveData, error: leaveError } =
        await supabase
          .from("leaves")
          .select("*")
          .eq("user_id", user.id)
          .order("start_date", { ascending: false });

      if (leaveError) {
        console.error(
          "Gagal mengambil data cuti:",
          leaveError
        );
      } else {
        setLeaves(leaveData || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // FILTER ATTENDANCE BERDASARKAN BULAN
  // ==========================================

  const filteredAttendance = attendance.filter((item) => {
    if (!item.clock_in) return false;

    const date = new Date(item.clock_in);

    return (
      date.getMonth() === selectedMonth &&
      date.getFullYear() === selectedYear
    );
  });

  // ==========================================
  // FILTER CUTI BERDASARKAN BULAN
  // ==========================================

  const filteredLeaves = leaves.filter((item) => {
    const startDate = new Date(item.start_date);
    const endDate = new Date(item.end_date);

    const monthStart = new Date(
      selectedYear,
      selectedMonth,
      1
    );

    const monthEnd = new Date(
      selectedYear,
      selectedMonth + 1,
      0
    );

    // Cek apakah periode cuti bersinggungan
    // dengan bulan yang dipilih
    return startDate <= monthEnd && endDate >= monthStart;
  });

  // ==========================================
  // NORMALISASI STATUS ATTENDANCE
  // ==========================================

  const getAttendanceStatus = (status: string) => {
    const value = status.toLowerCase();

    if (
      value === "hadir" ||
      value === "present" ||
      value === "on_time"
    ) {
      return "Hadir";
    }

    if (
      value === "terlambat" ||
      value === "late"
    ) {
      return "Terlambat";
    }

    if (
      value === "sakit" ||
      value === "sick"
    ) {
      return "Sakit";
    }

    return status;
  };

  // ==========================================
  // NORMALISASI STATUS CUTI
  // ==========================================

  const getLeaveStatus = (status: string) => {
    const value = status.toLowerCase();

    if (
      value === "approved" ||
      value === "disetujui" ||
      value === "approve"
    ) {
      return "Disetujui";
    }

    if (
      value === "pending" ||
      value === "menunggu"
    ) {
      return "Menunggu";
    }

    if (
      value === "rejected" ||
      value === "ditolak"
    ) {
      return "Ditolak";
    }

    return status;
  };


  const totalHadir = filteredAttendance.filter(
    (item) =>
      getAttendanceStatus(item.status) === "Hadir"
  ).length;

  const totalTerlambat = filteredAttendance.filter(
    (item) =>
      getAttendanceStatus(item.status) === "Terlambat"
  ).length;

  const totalSakit = filteredAttendance.filter(
    (item) =>
      getAttendanceStatus(item.status) === "Sakit"
  ).length;

  const approvedLeaves = filteredLeaves.filter(
    (item) => {
      const status = item.status.toLowerCase();

      return (
        status === "approved" ||
        status === "disetujui" ||
        status === "approve"
      );
    }
  );

  const totalCuti = approvedLeaves.reduce(
    (total, leave) => {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);

      const monthStart = new Date(
        selectedYear,
        selectedMonth,
        1
      );

      const monthEnd = new Date(
        selectedYear,
        selectedMonth + 1,
        0
      );

      const actualStart =
        start < monthStart ? monthStart : start;

      const actualEnd =
        end > monthEnd ? monthEnd : end;

      const difference =
        actualEnd.getTime() -
        actualStart.getTime();

      const days =
        Math.floor(
          difference / (1000 * 60 * 60 * 24)
        ) + 1;

      return total + days;
    },
    0
  );


  const formatDate = (date: string | null) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  };


  const formatTime = (date: string | null) => {
    if (!date) return "-";

    return new Date(date).toLocaleTimeString(
      "id-ID",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };


  const getAttendanceStyle = (status: string) => {
    const normalized =
      getAttendanceStatus(status);

    if (normalized === "Hadir") {
      return "bg-green-100 text-green-700";
    }

    if (normalized === "Terlambat") {
      return "bg-yellow-100 text-yellow-700";
    }

    if (normalized === "Sakit") {
      return "bg-red-100 text-red-700";
    }

    return "bg-gray-100 text-gray-700";
  };


  const getLeaveStyle = (status: string) => {
    const normalized =
      getLeaveStatus(status);

    if (normalized === "Disetujui") {
      return "bg-green-100 text-green-700";
    }

    if (normalized === "Menunggu") {
      return "bg-yellow-100 text-yellow-700";
    }

    if (normalized === "Ditolak") {
      return "bg-red-100 text-red-700";
    }

    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="w-full max-w-7xl mx-auto">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Rekap Absensi
        </h1>

        <p className="text-slate-500 mt-1">
          Lihat riwayat kehadiran dan cuti Anda.
        </p>
      </div>

      {/* FILTER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">

          {/* BULAN */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Bulan
            </label>

            <select
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(
                  Number(e.target.value)
                )
              }
              className="border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Januari</option>
              <option value={1}>Februari</option>
              <option value={2}>Maret</option>
              <option value={3}>April</option>
              <option value={4}>Mei</option>
              <option value={5}>Juni</option>
              <option value={6}>Juli</option>
              <option value={7}>Agustus</option>
              <option value={8}>September</option>
              <option value={9}>Oktober</option>
              <option value={10}>November</option>
              <option value={11}>Desember</option>
            </select>
          </div>

          {/* TAHUN */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Tahun
            </label>

            <select
              value={selectedYear}
              onChange={(e) =>
                setSelectedYear(
                  Number(e.target.value)
                )
              }
              className="border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
          </div>
        </div>
      </div>

      {/* STATISTIK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

        {/* HADIR */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm text-slate-500">
            Hadir
          </p>

          <h2 className="text-3xl font-bold text-green-600 mt-2">
            {totalHadir}
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            Hari
          </p>
        </div>

        {/* TERLAMBAT */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm text-slate-500">
            Terlambat
          </p>

          <h2 className="text-3xl font-bold text-yellow-500 mt-2">
            {totalTerlambat}
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            Hari
          </p>
        </div>

        {/* CUTI */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm text-slate-500">
            Cuti
          </p>

          <h2 className="text-3xl font-bold text-blue-500 mt-2">
            {totalCuti}
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            Hari
          </p>
        </div>

        {/* SAKIT */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm text-slate-500">
            Sakit
          </p>

          <h2 className="text-3xl font-bold text-red-500 mt-2">
            {totalSakit}
          </h2>

          <p className="text-xs text-slate-400 mt-1">
            Hari
          </p>
        </div>
      </div>

      {/* RIWAYAT ABSENSI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">

        <div className="p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            Riwayat Absensi
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Data kehadiran pada bulan yang dipilih.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">
            Memuat data...
          </div>
        ) : filteredAttendance.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            Belum ada data absensi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">

              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    No
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    Tanggal
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    Clock In
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    Clock Out
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredAttendance.map(
                  (item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {index + 1}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatDate(item.clock_in)}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatTime(item.clock_in)}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatTime(item.clock_out)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getAttendanceStyle(
                            item.status
                          )}`}
                        >
                          {getAttendanceStatus(
                            item.status
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                )}

              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RIWAYAT CUTI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        <div className="p-5 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            Riwayat Cuti
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Data pengajuan cuti pada bulan yang dipilih.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">
            Memuat data cuti...
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            Belum ada pengajuan cuti pada bulan ini.
          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-slate-50">
                <tr>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    No
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    Mulai
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    Selesai
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    Alasan
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">
                    status
                  </th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredLeaves.map(
                  (leave, index) => (
                    <tr
                      key={leave.id}
                      className="hover;bg-slate-50"
                    >

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {index + 1}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatDate(
                          leave.start_date
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {formatDate(
                          leave.end_date
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {leave.reason}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getLeaveStyle(
                            leave.status
                          )}`}
                        >
                          {getLeaveStatus(
                            leave.status
                          )}
                        </span>
                      </td>

                    </tr>
                  )
                )}

              </tbody>
            </table>

          </div>
        )}
      </div>

    </div>
  );
}