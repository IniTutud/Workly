import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ScheduleStatus = "working" | "off" | "leave";

type Employee = {
  id: string;
  full_name: string;
  department: string | null;
};

type Schedule = {
  user_id: string;
  date: string;
  status: ScheduleStatus;
};

function Shift() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentWeek, setCurrentWeek] = useState(new Date());

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [currentWeek]);

  const getStartOfWeek = (date: Date) => {
    const result = new Date(date);
    const day = result.getDay();

    const diff = day === 0 ? -6 : 1 - day;

    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);

    return result;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getWeekDates = () => {
    const start = getStartOfWeek(currentWeek);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      return date;
    });
  };

  const weekDates = getWeekDates();

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, department")
        .eq("role", "karyawan")
        .order("full_name", { ascending: true });

      if (error) {
        console.error("FETCH EMPLOYEES ERROR:", error);
        alert("Gagal mengambil data karyawan.");
        return;
      }

      setEmployees(data || []);
    } catch (error) {
      console.error("ERROR:", error);
      alert("Terjadi kesalahan saat mengambil data karyawan.");
    }
  };

  const fetchSchedules = async () => {
    setLoading(true);

    try {
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);

      const { data, error } = await supabase
        .from("employee_schedules")
        .select("user_id, date, status")
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) {
        console.error("FETCH SCHEDULE ERROR:", error);
        alert(`Gagal mengambil jadwal: ${error.message}`);
        return;
      }

      setSchedules((data || []) as Schedule[]);
    } catch (error) {
      console.error("ERROR:", error);
      alert("Terjadi kesalahan saat mengambil jadwal.");
    } finally {
      setLoading(false);
    }
  };

  const getSchedule = (
    userId: string,
    date: string
  ): ScheduleStatus => {
    const schedule = schedules.find(
      (item) => item.user_id === userId && item.date === date
    );

    return schedule?.status || "off";
  };

  const handleStatusChange = async (
    userId: string,
    date: string,
    status: "working" | "off"
  ) => {
    const currentStatus = getSchedule(userId, date);
    
    if (currentStatus === "leave") {
      alert("Jadwal leave tidak dapat diubah secara manual.");
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from("employee_schedules")
        .upsert(
          {
            user_id: userId,
            date: date,
            status: status,
          },
          {
            onConflict: "user_id,date",
          }
        )
        .select();

      if (error) {
        console.error("UPDATE SHIFT ERROR:", error);
        alert(`Gagal mengubah shift: ${error.message}`);
        return;
      }

      console.log("Shift berhasil diubah:", data);

      await fetchSchedules();
    } catch (error) {
      console.error("ERROR:", error);
      alert("Terjadi kesalahan saat mengubah shift.");
    } finally {
      setSaving(false);
    }
  };

  const getStatusLabel = (status: ScheduleStatus) => {
    switch (status) {
        case "working":
        return "Working";

        case "off":
        return "Off";

        case "leave":
        return "Cuti";

        default:
        return "-";
    }
    };

  const getStatusClass = (status: ScheduleStatus) => {
    switch (status) {
      case "working":
        return "bg-green-100 text-green-700";

      case "off":
        return "bg-slate-100 text-slate-600";

      case "leave":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "short",
    });
  };

  const getDateNumber = (date: Date) => {
    return date.getDate();
  };

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];

    const startText = start.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const endText = end.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return `${startText} - ${endText}`;
  };

  const goPreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);

    setCurrentWeek(newDate);
  };

  const goNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);

    setCurrentWeek(newDate);
  };

  const goCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  return (
    <div className="scrollbar-none">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Pembagian Shift
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Atur jadwal kerja karyawan setiap hari
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Minggu
            </p>

            <p className="mt-1 text-lg font-semibold text-slate-900">
              {formatWeekRange()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goPreviousWeek}
              className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
              title="Minggu sebelumnya"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={goCurrentWeek}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Minggu Ini
            </button>

            <button
              onClick={goNextWeek}
              className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
              title="Minggu berikutnya"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-500"></span>
          <span className="text-sm text-slate-600">
            Working
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-slate-400"></span>
          <span className="text-sm text-slate-600">
            Off
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
          <span className="text-sm text-slate-600">
            Cuti
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-250 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-5 py-4 font-medium">
                Karyawan
              </th>

              {weekDates.map((date) => (
                <th
                  key={formatDate(date)}
                  className="px-3 py-4 text-center font-medium"
                >
                  <div>
                    {getDayName(date)}
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    {getDateNumber(date)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-10 text-center text-slate-500"
                >
                  Memuat jadwal...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-10 text-center text-slate-500"
                >
                  Belum ada data karyawan.
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr
                  key={employee.id}
                  className="hover:bg-slate-50"
                >
                  <td className="sticky left-0 z-10 bg-white px-5 py-4">
                    <div className="font-medium text-slate-900">
                      {employee.full_name}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      {employee.department || "-"}
                    </div>
                  </td>

                  {weekDates.map((date) => {
                    const dateString = formatDate(date);
                    const status = getSchedule(
                      employee.id,
                      dateString
                    );

                    const isLeave = status === "leave";

                    return (
                      <td
                        key={dateString}
                        className="px-3 py-4 text-center"
                      >
                        <div className="flex justify-center">
                          {isLeave ? (
                            <span
                              className={`rounded-full px-3 py-1.5 text-xs font-medium ${getStatusClass(
                                status
                              )}`}
                            >
                              {getStatusLabel(status)}
                            </span>
                          ) : (
                            <select
                              value={status}
                              disabled={saving}
                              onChange={(e) =>
                                handleStatusChange(
                                  employee.id,
                                  dateString,
                                  e.target.value as
                                    | "working"
                                    | "off"
                                )
                              }
                              className={`cursor-pointer rounded-full border-0 px-3 py-1.5 text-xs font-medium outline-none ${getStatusClass(
                                status
                              )}`}
                            >
                              <option value="working">
                                Working
                              </option>

                              <option value="off">
                                Off
                              </option>
                            </select>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Shift;