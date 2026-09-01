import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import {
  ChevronDown
} from "lucide-react";

type Attendance = {
  id: string;
  name: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: string;
  photoUrl: string | null;
  rawDate: string;
  rawClockIn?: string | null;
  shiftStatus?: string; // Menyimpan status shift asli untuk pengurutan
};

function Attendance() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  useEffect(() => {
    fetchAttendanceAndEmployees();
  }, [selectedDate]);

  const fetchAttendanceAndEmployees = async () => {
    setLoading(true);

    try {
      // 1. Ambil data karyawan khusus role karyawan
      const { data: employeesData, error: empError } = await supabase
        .from("profiles")
        .select("id, full_name, department")
        .eq("role", "karyawan");

      if (empError) throw empError;

      // 2. Ambil data absensi
      const { data: attendanceData, error: attError } = await supabase
        .from("attendances")
        .select(`
            id,
            user_id,
            clock_in,
            clock_out,
            photo_url,
            status
          `);

      if (attError) throw attError;

      // 3. Ambil data jadwal shift karyawan pada tanggal yang sedang dipilih
      const { data: schedulesData, error: schedError } = await supabase
        .from("employee_schedules")
        .select("user_id, date, status")
        .eq("date", selectedDate);

      if (schedError) throw schedError;

      // Buat map jadwal untuk pengecekan cepat (user_id -> schedule_status)
      const scheduleMap = new Map();
      (schedulesData || []).forEach((sched: any) => {
        scheduleMap.set(sched.user_id, sched.status); // "working", "off", "leave"
      });

      const attendanceMap = new Map();

      (attendanceData || []).forEach((item: any) => {
        const itemDate = item.clock_in ? item.clock_in.split("T")[0] : "";
        if (itemDate === selectedDate) {
          attendanceMap.set(item.user_id, item);
        }
      });

      const combinedList: Attendance[] = [];

      for (const emp of (employeesData || [])) {
        const shiftStatus = scheduleMap.get(emp.id) || "off"; 
        const existingRecord = attendanceMap.get(emp.id);

        if (shiftStatus === "off") {
          combinedList.push({
            id: `off_${emp.id}_${selectedDate}`,
            name: emp.full_name,
            department: emp.department || "-",
            date: formatDate(selectedDate),
            checkIn: "-",
            checkOut: "-",
            status: "Off",
            photoUrl: null,
            rawDate: selectedDate,
            rawClockIn: null,
            shiftStatus: "off",
          });
        } else if (shiftStatus === "leave") {
          combinedList.push({
            id: `leave_${emp.id}_${selectedDate}`,
            name: emp.full_name,
            department: emp.department || "-",
            date: formatDate(selectedDate),
            checkIn: "-",
            checkOut: "-",
            status: "Cuti",
            photoUrl: null,
            rawDate: selectedDate,
            rawClockIn: null,
            shiftStatus: "leave",
          });
        } else {
          if (existingRecord) {
            let fullPhotoUrl = null;
            if (existingRecord.photo_url) {
              let filePath = existingRecord.photo_url;
              if (filePath.includes("/public/attendance_photos/")) {
                const parts = filePath.split("/public/attendance_photos/");
                if (parts.length > 1) filePath = parts[1];
              }

              if (filePath.startsWith("http")) {
                fullPhotoUrl = filePath;
              } else {
                const { data: signedUrlData } = await supabase.storage
                  .from("attendance_photos")
                  .createSignedUrl(filePath, 3600);

                if (signedUrlData) {
                  fullPhotoUrl = signedUrlData.signedUrl;
                }
              }
            }

            combinedList.push({
              id: existingRecord.id,
              name: emp.full_name,
              department: emp.department || "-",
              date: formatDate(existingRecord.clock_in),
              checkIn: formatTime(existingRecord.clock_in),
              checkOut: formatTime(existingRecord.clock_out),
              status: getStatusLabel(existingRecord.status),
              photoUrl: fullPhotoUrl,
              rawDate: selectedDate,
              rawClockIn: existingRecord.clock_in,
              shiftStatus: "working",
            });
          } else {
            combinedList.push({
              id: `absent_${emp.id}_${selectedDate}`,
              name: emp.full_name,
              department: emp.department || "-",
              date: formatDate(selectedDate),
              checkIn: "-",
              checkOut: "-",
              status: "Tidak Hadir",
              photoUrl: null,
              rawDate: selectedDate,
              rawClockIn: null,
              shiftStatus: "working",
            });
          }
        }
      }
              
      // LOGIKA PENGURUTAN BARU:
      // 1. Karyawan "working" di atas, karyawan "off/leave" di bawah.
      // 2. Untuk kelompok "off/leave": diurutkan berdasarkan abjad nama.
      // 3. Untuk kelompok "working": 
      //    - Yang belum clock in ("Tidak Hadir") ditaruh paling atas.
      //    - Yang sudah clock in diurutkan dari yang paling awal (bawah) ke yang paling telat/akhir (atas).
      combinedList.sort((a, b) => {
        const isOffA = a.shiftStatus === "off" || a.shiftStatus === "leave";
        const isOffB = b.shiftStatus === "off" || b.shiftStatus === "leave";

        // Jika salah satu off/leave dan satunya working
        if (isOffA && !isOffB) return 1; // Off di bawah
        if (!isOffA && isOffB) return -1; // Working di atas

        // Jika keduanya off/leave, urutkan berdasarkan abjad nama
        if (isOffA && isOffB) {
          return a.name.localeCompare(b.name);
        }

        // Jika keduanya working:
        const isAbsentA = a.status === "Tidak Hadir";
        const isAbsentB = b.status === "Tidak Hadir";

        if (isAbsentA && !isAbsentB) return -1; // Tidak hadir paling atas
        if (!isAbsentA && isAbsentB) return 1;

        // Berdasarkan waktu clock in (paling awal di bawah, paling akhir/telat di atas)
        if (a.rawClockIn && b.rawClockIn) {
          return new Date(b.rawClockIn).getTime() - new Date(a.rawClockIn).getTime();
        }

        return 0;
      });

      setAttendance(combinedList);
    } catch (error) {
      console.error("Gagal memuat rekap absensi:", error);
      alert("Gagal mengambil data rekap absensi.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusLabel = (status: string | null | undefined) => {
    if (status === "present") return "Hadir";
    if (status === "late") return "Terlambat";
    if (status === "absent") return "Tidak Hadir";
    return "Tidak Hadir";
  };

  const filteredAttendance = attendance.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.department.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "Semua" ||
      item.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const totalEmployees = attendance.length;

  const totalPresent = attendance.filter(
    (item) => item.status === "Hadir" || item.status === "Terlambat"
  ).length;

  const totalAbsent = attendance.filter(
    (item) => item.status === "Tidak Hadir"
  ).length;

  const totalOffOrLeave = attendance.filter(
    (item) => item.status === "Off" || item.status === "Cuti"
  ).length;

  const getFilterLabel = (val: string) => {
    if (val === "Hadir") return "Hadir";
    if (val === "Terlambat") return "Terlambat";
    if (val === "Tidak Hadir") return "Tidak Hadir";
    if (val === "Off") return "Off";
    if (val === "Cuti") return "Cuti";
    return "Semua Status";
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Rekap Absensi
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Lihat rekap presensi seluruh karyawan berdasarkan jadwal kerja harian
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Karyawan</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {totalEmployees}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-green-500">Hadir / Terlambat</p>
          <p className="mt-2 text-2xl font-semibold text-green-600">
            {totalPresent}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-red-500">Tidak Hadir</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">
            {totalAbsent}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-400">Off / Cuti</p>
          <p className="mt-2 text-2xl font-semibold text-slate-600">
            {totalOffOrLeave}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            placeholder="Cari karyawan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 md:w-80"
          />

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              />
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                  className="whitespace-nowrap text-sm text-blue-500 hover:text-blue-700 hover:underline"
                >
                  Hari Ini
                </button>
              )}
            </div>

            <div className="relative md:w-48">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all hover:bg-slate-50 focus:border-blue-500"
              >
                <span>{getFilterLabel(statusFilter)}</span>
                <ChevronDown size={18} className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsDropdownOpen(false)}
                  ></div>

                  <div className="absolute right-0 top-full z-50 mt-2 w-full min-w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                    {["Semua", "Hadir", "Terlambat", "Tidak Hadir", "Off", "Cuti"].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${statusFilter === status
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-slate-600 hover:bg-slate-100"
                          }`}
                      >
                        {getFilterLabel(status)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="max-h-[65vh] overflow-y-auto scrollbar-thin">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Nama</th>
                <th className="px-6 py-4 font-medium">Foto</th>
                <th className="px-6 py-4 font-medium">Department</th>
                <th className="px-6 py-4 font-medium">Tanggal</th>
                <th className="px-6 py-4 font-medium">Jam Masuk</th>
                <th className="px-6 py-4 font-medium">Jam Keluar</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Memuat data absensi...
                  </td>
                </tr>
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Data absensi tidak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {item.name}
                    </td>

                    <td className="px-6 py-4">
                      {item.photoUrl ? (
                        <button
                          onClick={() => setSelectedPhoto(item.photoUrl)}
                          className="block"
                        >
                          <img
                            src={item.photoUrl}
                            alt={`Foto ${item.name}`}
                            className="h-10 w-10 rounded-full object-cover transition hover:scale-110"
                          />
                        </button>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">
                          -
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {item.department}
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {item.date}
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {item.checkIn}
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {item.checkOut}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          item.status === "Hadir"
                            ? "bg-green-100 text-green-700"
                            : item.status === "Terlambat"
                            ? "bg-yellow-100 text-yellow-700"
                            : item.status === "Off" || item.status === "Cuti"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] rounded-xl bg-white p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-lg text-white hover:bg-black/80"
            >
              ×
            </button>
            <img
              src={selectedPhoto}
              alt="Bukti absensi"
              className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Attendance;