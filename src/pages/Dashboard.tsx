import {
  Users,
  CircleCheck,
  CalendarDays,
  Clock,
  ChevronDown,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { Link, useNavigate } from "react-router-dom";

type Attendance = {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  status: "present" | "late" | "absent";
  profile?: {
    full_name: string;
  } | null;
};

type Leave = {
  id: string;
  user_id: string;
  start_date?: string;
  end_date?: string;
  status: "pending" | "approved" | "rejected";
  profile?: {
    full_name: string;
  } | null;
};

type WeeklyChartData = {
  dayName: string;
  dateStr: string;
  count: number;
};

function Dashboard() {
  const navigate = useNavigate();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isOverviewDropdownOpen, setIsOverviewDropdownOpen] = useState(false);
  const [timeRange, setTimeRange] = useState("This Week");

  const [totalEmployees, setTotalEmployees] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [lateToday, setLateToday] = useState(0);

  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [pendingLeaveData, setPendingLeaveData] = useState<Leave[]>([]);
  const [weeklyChartData, setWeeklyChartData] = useState<WeeklyChartData[]>([]);

  const [adminName, setAdminName] = useState("Admin HR");
  const [adminRole, setAdminRole] = useState("Administrator");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [timeRange]);

  const getToday = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const loadDashboard = async () => {
    setLoading(true);

    try {
      await Promise.all([
        getAdminProfile(),
        getTotalEmployees(),
        getPresentToday(),
        getPendingLeaves(),
        getLateToday(),
        getRecentAttendance(),
        getPendingLeaveData(),
        getWeeklyAttendance(timeRange),
      ]);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAdminProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error mengambil profile admin:", error);
      return;
    }

    if (data) {
      setAdminName(data.full_name || "Admin HR");
      setAdminRole(data.role === "admin" ? "Administrator" : data.role);
    }
  };

  const getTotalEmployees = async () => {
    const { count, error } = await supabase
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("role", "karyawan");

    if (error) {
      console.error("Error total employees:", error);
      return;
    }

    setTotalEmployees(count ?? 0);
  };

  const getPresentToday = async () => {
    const today = getToday();

    const { data, error } = await supabase
      .from("attendances")
      .select("id, user_id, clock_in, status")
      .gte("clock_in", `${today} 00:00:00`)
      .lte("clock_in", `${today} 23:59:59`);

    if (error) {
      console.error("Error hadir hari ini:", error);
      setPresentToday(0);
      return;
    }

    setPresentToday(data?.length ?? 0);
  };

  const getPendingLeaves = async () => {
    const { count, error } = await supabase
      .from("leaves")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("status", "pending");

    if (error) {
      console.error("Error pending leaves:", error);
      return;
    }

    setPendingLeaves(count ?? 0);
  };

  const getLateToday = async () => {
    const today = getToday();

    const { count, error } = await supabase
      .from("attendances")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "late")
      .gte("clock_in", `${today} 00:00:00`)
      .lte("clock_in", `${today} 23:59:59`);

    if (error) {
      console.error("Error terlambat hari ini:", error);
      return;
    }

    setLateToday(count ?? 0);
  };

  // FUNGSI BUAT NGITUNG DATA MINGGUAN (CHART)
  const getWeeklyAttendance = async (range: string) => {
    const currDate = new Date();
    
    // Tentukan awal minggu (Senin)
    const firstDayOfWeek = new Date(currDate);
    const day = currDate.getDay();
    const diff = currDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust kalau hari Minggu
    firstDayOfWeek.setDate(diff);

    if (range === "Last Week") {
      firstDayOfWeek.setDate(firstDayOfWeek.getDate() - 7);
    }

    const weekDays: WeeklyChartData[] = [];
    const daysNameList = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

    // Loop dari Senin (0) sampai Minggu (6)
    for (let i = 0; i < 7; i++) {
      const d = new Date(firstDayOfWeek);
      d.setDate(firstDayOfWeek.getDate() + i);
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getDate()).padStart(2, "0");
      const dateFormatted = `${year}-${month}-${dayStr}`;

      weekDays.push({
        dayName: daysNameList[i],
        dateStr: dateFormatted,
        count: 0,
      });
    }

    const startDateStr = weekDays[0].dateStr;
    const endDateStr = weekDays[6].dateStr;

    // Ambil data dari database dalam rentang minggu tersebut
    const { data, error } = await supabase
      .from("attendances")
      .select("clock_in")
      .gte("clock_in", `${startDateStr} 00:00:00`)
      .lte("clock_in", `${endDateStr} 23:59:59`);

    if (error) {
      console.error("Error weekly chart:", error);
      return;
    }

    // Petakan jumlah absen ke masing-masing hari
    const mappedData = weekDays.map((item) => {
      const totalOnThisDay = (data || []).filter((att: any) => 
        att.clock_in.startsWith(item.dateStr)
      ).length;

      return {
        ...item,
        count: totalOnThisDay,
      };
    });

    setWeeklyChartData(mappedData);
  };

  const getRecentAttendance = async () => {
    const { data, error } = await supabase
      .from("attendances")
      .select(`
        id,
        user_id,
        clock_in,
        clock_out,
        status,
        profiles (
          full_name
        )
      `)
      .order("clock_in", {
        ascending: false,
      })
      .limit(5);

    if (error) {
      console.error("Error recent attendance:", error);
      return;
    }

    const formattedData = (data || []).map((item: any) => ({
      ...item,
      profile: Array.isArray(item.profiles)
        ? item.profiles[0]
        : item.profiles,
    }));

    setRecentAttendance(formattedData);
  };

  const getPendingLeaveData = async () => {
    const { data, error } = await supabase
      .from("leaves")
      .select(`
        id,
        user_id,
        start_date,
        end_date,
        status,
        profiles (
          full_name
        )
      `)
      .eq("status", "pending")
      .order("start_date", {
        ascending: true,
      })
      .limit(3);

    if (error) {
      console.error("Error pending leave:", error);
      return;
    }

    const formattedData = (data || []).map((item: any) => ({
      ...item,
      profile: Array.isArray(item.profiles)
        ? item.profiles[0]
        : item.profiles,
    }));

    setPendingLeaveData(formattedData);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        return;
      }
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const formatDate = (date: string | undefined) => {
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "present":
        return "Hadir";
      case "late":
        return "Terlambat";
      case "absent":
        return "Tidak Hadir";
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-700";
      case "late":
        return "bg-yellow-100 text-yellow-700";
      case "absent":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };
  
  const maxCount = Math.max(...weeklyChartData.map((d) => d.count), 5);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-200"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-800">
                {adminName}
              </p>
              <p className="text-xs text-slate-500">{adminRole}</p>
            </div>
            <span className="text-xs text-slate-400">▼</span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              <button
                onClick={handleLogout}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="relative overflow-hidden rounded-2xl bg-blue-100 px-8 py-7">
        <div className="relative z-10">
          <p className="text-sm font-medium text-blue-600">
            Welcome back 👋
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Hi, {adminName}
          </h2>
          <p className="mt-2 max-w-lg text-sm text-slate-600">
            Here's your HR overview for today. Monitor attendance,
            employees, and leave requests from here.
          </p>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-200/70" />
        <div className="absolute -bottom-16 right-32 h-32 w-32 rounded-full bg-yellow-200/70" />
      </section>
          
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Karyawan</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {loading ? "..." : totalEmployees}
              </p>
              <p className="mt-2 text-xs text-slate-400">Karyawan terdaftar</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600">
              <CircleCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Hadir Hari Ini</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {loading ? "..." : presentToday}
              </p>
              <p className="mt-2 text-xs text-green-600">Karyawan hadir hari ini</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Cuti Pending</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {loading ? "..." : pendingLeaves}
              </p>
              <p className="mt-2 text-xs text-yellow-600">Menunggu persetujuan</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Terlambat</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {loading ? "..." : lateToday}
              </p>
              <p className="mt-2 text-xs text-red-500">Karyawan terlambat hari ini</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm xl:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Attendance Overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Attendance summary for {timeRange.toLowerCase()}
                </p>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setIsOverviewDropdownOpen(!isOverviewDropdownOpen)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 outline-none transition-all hover:bg-slate-50"
                >
                  <span>{timeRange}</span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOverviewDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isOverviewDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOverviewDropdownOpen(false)}></div>
                    <div className="absolute right-0 top-full z-50 mt-2 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                      {["This Week", "Last Week"].map((val) => (
                        <button
                          key={val}
                          onClick={() => {
                            setTimeRange(val);
                            setIsOverviewDropdownOpen(false);
                          }}
                          className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                            timeRange === val ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex h-52 items-end justify-between gap-2 px-4 pt-6 pb-2 border-b border-slate-100">
            {weeklyChartData.map((item, idx) => {
              const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={idx} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group">
                  <span className="text-xs font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.count}
                  </span>
                  <div className="w-full max-w-9 bg-slate-100 rounded-t-lg overflow-hidden h-full flex items-end">
                    <div 
                      style={{ height: `${Math.max(heightPercent, item.count > 0 ? 8 : 4)}%` }}
                      className="w-full bg-blue-600 rounded-t-lg transition-all duration-500 group-hover:bg-blue-700"
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{item.dayName}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 px-2">
            <span>Grafik total kehadiran karyawan (Senin - Minggu)</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 inline-block"></span>
              Jumlah Hadir
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Pending Leave
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Requests waiting for approval
              </p>
            </div>

            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
              {pendingLeaves} Pending
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {pendingLeaveData.length === 0 ? (
              <div className="rounded-xl border border-slate-100 p-4 text-center">
                <p className="text-sm text-slate-400">
                  Tidak ada pengajuan cuti pending.
                </p>
              </div>
            ) : (
              pendingLeaveData.map((leave) => (
                <div
                  key={leave.id}
                  className="rounded-xl border border-slate-100 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {leave.profile?.full_name || "Unknown"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                      </p>
                    </div>

                    <Link
                      to="/admin/leaves"
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link
            to="/admin/leaves"
            className="mt-5 block w-full rounded-lg border border-slate-200 py-2 text-center text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Lihat Semua
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Attendance
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest employee attendance records
            </p>
          </div>

          <Link
            to="/admin/attendance"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Lihat Semua →
          </Link>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500">
                <th className="pb-4 font-medium">Nama</th>
                <th className="pb-4 font-medium">Tanggal</th>
                <th className="pb-4 font-medium">Jam Masuk</th>
                <th className="pb-4 font-medium">Jam Keluar</th>
                <th className="pb-4 text-right font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {recentAttendance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    Belum ada data attendance.
                  </td>
                </tr>
              ) : (
                recentAttendance.map((attendance) => (
                  <tr key={attendance.id}>
                    <td className="py-4 font-medium text-slate-900">
                      {attendance.profile?.full_name || "Unknown"}
                    </td>
                    <td className="py-4 text-slate-500">
                      {formatDate(attendance.clock_in)}
                    </td>
                    <td className="py-4 text-slate-500">
                      {formatTime(attendance.clock_in)}
                    </td>
                    <td className="py-4 text-slate-500">
                      {formatTime(attendance.clock_out)}
                    </td>
                    <td className="py-4 text-right">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(attendance.status)}`}>
                        {getStatusLabel(attendance.status)}
                      </span>
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

export default Dashboard;