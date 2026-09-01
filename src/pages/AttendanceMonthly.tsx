import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { 
    ChevronDown,
} from "lucide-react";

type EmployeeSummary = {
    id: string;
    name: string;
    department: string;
    present: number;
    late: number;
    absent: number;
    leaveCount: number;
    leaveDays: number;
};

type AttendanceData = {
    user_id: string;
    clock_in: string;
    status: "present" | "late" | "absent";
};

type LeaveData = {
    user_id: string;
    start_date: string;
    end_date: string;
    status: "pending" | "approved" | "rejected";
};

type ProfileData = {
    id: string;
    full_name: string;
    department: string | null;
    role: string;
};

function AttendanceMonthly() {
    const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const currentDate = new Date();

    const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
    const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

    const yearOptions = [2025, 2026, 2027, 2028, 2029, 2030];

    const [selectedMonth, setSelectedMonth] = useState(
        currentDate.getMonth()
    );

    const [selectedYear, setSelectedYear] = useState(
        currentDate.getFullYear()
    );

    useEffect(() => {
        fetchMonthlyAttendance();
    }, [selectedMonth, selectedYear]);

    const getStartDate = () => {
        const month = String(selectedMonth + 1).padStart(2, "0");
        return `${selectedYear}-${month}-01`;
    };

    const getEndDate = () => {
        const lastDay = new Date(
            selectedYear,
            selectedMonth + 1,
            0
        ).getDate();

        const month = String(selectedMonth + 1).padStart(2, "0");

        return `${selectedYear}-${month}-${String(lastDay).padStart(2, "0")}`;
    };

    // Helper untuk mengambil daftar hari kerja (Senin - Jumat) sampai hari ini
    const getWorkDatesInPeriod = (year: number, monthIndex: number) => {
        const dates: string[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();

        for (let day = 1; day <= lastDayOfMonth; day++) {
            const date = new Date(year, monthIndex, day);
            date.setHours(0, 0, 0, 0);

            // Jangan hitung tanggal di masa mendatang
            if (date > today) break;

            // Mengabaikan akhir pekan (0 = Minggu, 6 = Sabtu)
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                const m = String(monthIndex + 1).padStart(2, "0");
                const d = String(day).padStart(2, "0");
                dates.push(`${year}-${m}-${d}`);
            }
        }
        return dates;
    };

    const calculateLeaveDays = (
        startDate: string,
        endDate: string
    ) => {
        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T00:00:00`);

        const difference = end.getTime() - start.getTime();

        return Math.floor(difference / (1000 * 60 * 60 * 24)) + 1;
    };

    const fetchMonthlyAttendance = async () => {
        setLoading(true);

        try {
            const startDate = getStartDate();
            const endDate = getEndDate();

            const {
                data: profiles,
                error: profileError,
            } = await supabase
                .from("profiles")
                .select("id, full_name, department, role")
                .eq("role", "karyawan")
                .order("full_name", { ascending: true });

            if (profileError) {
                console.error("Error mengambil profiles:", profileError);
                alert("Gagal mengambil data karyawan.");
                return;
            }

            const {
                data: attendanceData,
                error: attendanceError,
            } = await supabase
                .from("attendances")
                .select("user_id, clock_in, status")
                .gte("clock_in", `${startDate}T00:00:00`)
                .lt("clock_in", `${endDate}T23:59:59.999`);

            if (attendanceError) {
                console.error("Error mengambil attendance:", attendanceError);
                alert("Gagal mengambil data absensi.");
                return;
            }

            const {
                data: leaveData,
                error: leaveError,
            } = await supabase
                .from("leaves")
                .select("user_id, start_date, end_date, status")
                .eq("status", "approved")
                .lte("start_date", endDate)
                .gte("end_date", startDate);

            if (leaveError) {
                console.error("Error mengambil data cuti:", leaveError);
                alert("Gagal mengambil data cuti.");
                return;
            }

            const attendance = (attendanceData || []) as AttendanceData[];
            const leaves = (leaveData || []) as LeaveData[];
            const profileList = (profiles || []) as ProfileData[];

            // Daftar tanggal kerja (Senin-Jumat) dari tanggal 1 hingga hari ini
            const workDates = getWorkDatesInPeriod(selectedYear, selectedMonth);

            const summary: EmployeeSummary[] = profileList.map((employee) => {
                const employeeAttendance = attendance.filter(
                    (item) => item.user_id === employee.id
                );

                const employeeLeaves = leaves.filter(
                    (item) => item.user_id === employee.id
                );

                const present = employeeAttendance.filter(
                    (item) => item.status === "present"
                ).length;

                const late = employeeAttendance.filter(
                    (item) => item.status === "late"
                ).length;

                // Format tanggal presensi yang sudah dimasukkan oleh karyawan
                const attendedDates = new Set(
                    employeeAttendance.map((item) => {
                        const d = new Date(item.clock_in);
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, "0");
                        const day = String(d.getDate()).padStart(2, "0");
                        return `${year}-${month}-${day}`;
                    })
                );

                // Absen eksplisit dari DB
                const explicitAbsent = employeeAttendance.filter(
                    (item) => item.status === "absent"
                ).length;

                // Hitung hari kerja terlewat (belum absen & tidak sedang cuti)
                let unrecordedAbsent = 0;
                workDates.forEach((dateStr) => {
                    if (!attendedDates.has(dateStr)) {
                        const isOnLeave = employeeLeaves.some(
                            (leave) =>
                                dateStr >= leave.start_date &&
                                dateStr <= leave.end_date
                        );
                        if (!isOnLeave) {
                            unrecordedAbsent++;
                        }
                    }
                });

                const absent = explicitAbsent + unrecordedAbsent;

                const leaveCount = employeeLeaves.length;

                const leaveDays = employeeLeaves.reduce(
                    (total, leave) => {
                        return (
                            total +
                            calculateLeaveDays(
                                leave.start_date,
                                leave.end_date
                            )
                        );
                    },
                    0
                );

                return {
                    id: employee.id,
                    name: employee.full_name,
                    department: employee.department || "-",
                    present,
                    late,
                    absent,
                    leaveCount,
                    leaveDays,
                };
            });

            setEmployees(summary);
        } catch (error) {
            console.error("Monthly attendance error:", error);
        } finally {
            setLoading(false);
        }
    };

    const monthNames = [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
    ];

    // Filter karyawan berdasarkan input pencarian nama
    const filteredEmployees = employees.filter((employee) =>
        employee.name.toLowerCase().includes(search.toLowerCase())
    );

    const totalPresent = employees.reduce(
        (total, employee) => total + employee.present,
        0
    );

    const totalLate = employees.reduce(
        (total, employee) => total + employee.late,
        0
    );

    const totalLeaveCount = employees.reduce(
        (total, employee) => total + employee.leaveCount,
        0
    );

    const totalLeaveDays = employees.reduce(
        (total, employee) => total + employee.leaveDays,
        0
    );

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Rekap Bulanan
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Lihat rekap bulanan semua karyawan
                </p>
            </div>

            {/* Filter Periode & Search Bar */}
            <div className="mb-6 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-700">
                        Periode Rekap
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Pilih bulan dan tahun
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {/* Input Search Karyawan */}
                    <input
                        type="text"
                        placeholder="Cari karyawan..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:w-64"
                    />

                    <div className="flex gap-3">
                        {/* Dropdown Bulan */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsMonthDropdownOpen(!isMonthDropdownOpen);
                                    setIsYearDropdownOpen(false);
                                }}
                                className="flex items-center justify-between gap-4 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-all hover:bg-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                <span>{monthNames[selectedMonth]}</span>
                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isMonthDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isMonthDropdownOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsMonthDropdownOpen(false)}
                                    ></div>
                                    <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-44 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                                        {monthNames.map((month, index) => (
                                            <button
                                                key={month}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedMonth(index);
                                                    setIsMonthDropdownOpen(false);
                                                }}
                                                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                                    selectedMonth === index
                                                        ? "bg-blue-50 font-medium text-blue-700"
                                                        : "text-slate-600 hover:bg-slate-50"
                                                }`}
                                            >
                                                {month}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        
                        {/* Dropdown Tahun */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsYearDropdownOpen(!isYearDropdownOpen);
                                    setIsMonthDropdownOpen(false);
                                }}
                                className="flex items-center justify-between gap-6 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-all hover:bg-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                                <span>{selectedYear}</span>
                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isYearDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isYearDropdownOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsYearDropdownOpen(false)}
                                    ></div>
                                    <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                                        {yearOptions.map((year) => (
                                            <button
                                                key={year}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedYear(year);
                                                    setIsYearDropdownOpen(false);
                                                }}
                                                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                                    selectedYear === year
                                                        ? "bg-blue-50 font-medium text-blue-700"
                                                        : "text-slate-600 hover:bg-slate-50"
                                                }`}
                                            >
                                                {year}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Total Hadir</p>
                    <p className="mt-2 text-2xl font-semibold text-green-600">
                        {loading ? "..." : totalPresent}
                    </p>
                </div>

                <div className="rounded-xl bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Total Terlambat</p>
                    <p className="mt-2 text-2xl font-semibold text-yellow-600">
                        {loading ? "..." : totalLate}
                    </p>
                </div>

                <div className="rounded-xl bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Jumlah Cuti</p>
                    <p className="mt-2 text-2xl font-semibold text-blue-600">
                        {loading ? "..." : totalLeaveCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Jumlah pengajuan approved
                    </p>
                </div>

                <div className="rounded-xl bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Total Hari Cuti</p>
                    <p className="mt-2 text-2xl font-semibold text-purple-600">
                        {loading ? "..." : totalLeaveDays}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Hari</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-6 py-4 font-medium">Nama</th>
                                <th className="px-6 py-4 font-medium">Department</th>
                                <th className="px-6 py-4 text-center font-medium">Hadir</th>
                                <th className="px-6 py-4 text-center font-medium">Terlambat</th>
                                <th className="px-6 py-4 text-center font-medium">Tidak Hadir</th>
                                <th className="px-6 py-4 text-center font-medium">Jumlah Cuti</th>
                                <th className="px-6 py-4 text-center font-medium">Hari Cuti</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-6 py-10 text-center text-slate-500"
                                    >
                                        Memuat rekap bulanan...
                                    </td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-6 py-10 text-center text-slate-500"
                                    >
                                        Karyawan tidak ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map((employee) => (
                                    <tr
                                        key={employee.id}
                                        className="hover:bg-slate-50"
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {employee.name}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {employee.department}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                                                {employee.present}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                                                {employee.late}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                                                {employee.absent}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                                                {employee.leaveCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-purple-600">
                                            {employee.leaveDays} hari
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

export default AttendanceMonthly;