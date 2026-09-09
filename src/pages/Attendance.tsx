import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { ChevronDown, Clock, MapPin } from "lucide-react";

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

  latitude?: number | null;
  longitude?: number | null;

  shiftStatus?: "working" | "off" | "leave";
  shiftName?: string | null;
  shiftTime?: string | null;
  shiftColor?: string | null;
  startTimeRaw?: string | null;
  endTimeRaw?: string | null;
};

type Employee = {
  id: string;
  full_name: string;
  department: string | null;
};

type Shift = {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  color: string | null;
};

type Schedule = {
  user_id: string;
  date: string;
  status: "working" | "off" | "leave";
  shift_id: number | null;
};

function Attendance() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    fetchAttendanceAndEmployees();
  }, [selectedDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, selectedDate]);

  const fetchAttendanceAndEmployees = async () => {
    setLoading(true);

    try {      

      const { data: employeesData, error: employeesError } =
        await supabase
          .from("profiles")
          .select("id, full_name, department")
          .eq("role", "karyawan");

      if (employeesError) {
        throw employeesError;
      }      

      const { data: shiftsData, error: shiftsError } = await supabase
        .from("shifts")
        .select("id, name, start_time, end_time, color");

      if (shiftsError) {
        throw shiftsError;
      }      

      const { data: schedulesData, error: schedulesError } =
        await supabase
          .from("employee_schedules")
          .select("user_id, date, status, shift_id")
          .eq("date", selectedDate);

      if (schedulesError) {
        throw schedulesError;
      }     

      const { data: attendanceData, error: attendanceError } =
        await supabase
          .from("attendances")
          .select(
            "id, user_id, clock_in, clock_out, photo_url, status, latitude, longitude"
          );

      if (attendanceError) {
        throw attendanceError;
      }      

      const shiftMap = new Map<number, Shift>();

      (shiftsData || []).forEach((shift) => {
        shiftMap.set(Number(shift.id), {
          id: Number(shift.id),
          name: shift.name,
          start_time: shift.start_time,
          end_time: shift.end_time,
          color: shift.color,
        });
      });      

      const scheduleMap = new Map<string, Schedule>();

      (schedulesData || []).forEach((schedule) => {
        scheduleMap.set(schedule.user_id, {
          user_id: schedule.user_id,
          date: schedule.date,
          status: schedule.status,
          shift_id:
            schedule.shift_id !== null
              ? Number(schedule.shift_id)
              : null,
        });
      });      

      const attendanceMap = new Map<string, any>();

      (attendanceData || []).forEach((item) => {
        if (!item.clock_in) return;

        const itemDate = item.clock_in.split("T")[0];

        if (itemDate === selectedDate) {
          attendanceMap.set(item.user_id, item);
        }
      });    

      const finalAttendance: Attendance[] = [];

      for (const employee of (employeesData || []) as Employee[]) {
        const schedule = scheduleMap.get(employee.id);
        const employeeAttendance = attendanceMap.get(employee.id);
       
        const scheduleStatus = schedule?.status || "off";

        let shift: Shift | null = null;

        if (
          schedule?.shift_id !== null &&
          schedule?.shift_id !== undefined
        ) {
          shift = shiftMap.get(schedule.shift_id) || null;
        }     

        let shiftName: string | null = null;
        let shiftTime: string | null = null;
        let shiftColor: string | null = null;
        let startTimeRaw: string | null = null;
        let endTimeRaw: string | null = null;

        if (shift) {
          shiftName = shift.name;

          shiftTime = `${formatTimeOnly(
            shift.start_time
          )} - ${formatTimeOnly(shift.end_time)}`;

          shiftColor = shift.color;

          startTimeRaw = shift.start_time;
          endTimeRaw = shift.end_time;
        }
    
        let displayStatus = "Tidak Hadir";

        if (scheduleStatus === "off") {
          displayStatus = "Off";
        } else if (scheduleStatus === "leave") {
          displayStatus = "Cuti";
        } else if (employeeAttendance) {
          displayStatus = mapAttendanceStatus(
            employeeAttendance.status
          );
        } else {
          displayStatus = "Tidak Hadir";
        }        

        const checkIn = employeeAttendance?.clock_in
          ? formatTime(employeeAttendance.clock_in)
          : "-";

        const checkOut = employeeAttendance?.clock_out
          ? formatTime(employeeAttendance.clock_out)
          : "-";
        
        let photoUrl: string | null = null;

        if (employeeAttendance?.photo_url) {
          photoUrl = employeeAttendance.photo_url;
        }        

        const latitude =
          employeeAttendance?.latitude !== null &&
          employeeAttendance?.latitude !== undefined
            ? Number(employeeAttendance.latitude)
            : null;

        const longitude =
          employeeAttendance?.longitude !== null &&
          employeeAttendance?.longitude !== undefined
            ? Number(employeeAttendance.longitude)
            : null;        

        const rawDate =
          employeeAttendance?.clock_in || selectedDate;        

        finalAttendance.push({
          id:
            employeeAttendance?.id ||
            `schedule-${employee.id}-${selectedDate}`,

          name: employee.full_name,

          department: employee.department || "-",

          date: formatDate(rawDate),

          checkIn,

          checkOut,

          status: displayStatus,

          photoUrl,

          rawDate,

          rawClockIn:
            employeeAttendance?.clock_in || null,

          latitude,

          longitude,

          shiftStatus: scheduleStatus,

          shiftName,

          shiftTime,

          shiftColor,

          startTimeRaw,

          endTimeRaw,
        });
      }      

      const now = new Date();

      const currentMins =
        now.getHours() * 60 + now.getMinutes();

      const timeToMinutes = (
        timeStr: string | null | undefined
      ) => {
        if (!timeStr) return 9999;

        const [h, m] = timeStr
          .split(":")
          .map(Number);

        return (h || 0) * 60 + (m || 0);
      };

      const getShiftCategoryScore = (
        startTime: string | null | undefined,
        endTime: string | null | undefined
      ) => {
        if (!startTime || !endTime) {
          return 3;
        }

        const startMins =
          timeToMinutes(startTime);

        const endMins =
          timeToMinutes(endTime);

        if (
          currentMins >= startMins &&
          currentMins <= endMins
        ) {
          return 0;
        }

        if (currentMins < startMins) {
          return 1;
        }

        return 2;
      };

      finalAttendance.sort((a, b) => {

        const getPriority = (status: string) => {
          if (
            status === "Hadir" ||
            status === "Terlambat"
          ) {
            return 1;
          }

          if (status === "Tidak Hadir") {
            return 2;
          }

          if (status === "Cuti") {
            return 3;
          }

          if (status === "Off") {
            return 4;
          }

          return 10;
        };

        const priorityA = getPriority(a.status);
        const priorityB = getPriority(b.status);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        const catA = getShiftCategoryScore(
          a.startTimeRaw,
          a.endTimeRaw
        );

        const catB = getShiftCategoryScore(
          b.startTimeRaw,
          b.endTimeRaw
        );

        if (catA !== catB) {
          return catA - catB;
        }

        const startMinA = timeToMinutes(
          a.startTimeRaw
        );

        const startMinB = timeToMinutes(
          b.startTimeRaw
        );

        const diffA = Math.abs(
          startMinA - currentMins
        );

        const diffB = Math.abs(
          startMinB - currentMins
        );

        if (diffA !== diffB) {
          return diffA - diffB;
        }

        const endMinA = timeToMinutes(
          a.endTimeRaw
        );

        const endMinB = timeToMinutes(
          b.endTimeRaw
        );

        const endDiffA = Math.abs(
          endMinA - currentMins
        );

        const endDiffB = Math.abs(
          endMinB - currentMins
        );

        if (endDiffA !== endDiffB) {
          return endDiffA - endDiffB;
        }

        if (a.rawClockIn && b.rawClockIn) {
          return (
            new Date(b.rawClockIn).getTime() -
            new Date(a.rawClockIn).getTime()
          );
        }

        return a.name.localeCompare(b.name);
      });

      setAttendance(finalAttendance);
    } catch (error) {
      console.error(
        "Error fetching attendance:",
        error
      );

      alert(
        "Gagal mengambil data attendance. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatTimeOnly = (timeString: string) => {
    if (!timeString) return "-";

    return timeString.slice(0, 5);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const mapAttendanceStatus = (status: string) => {
    switch (status) {
      case "present":
        return "Hadir";

      case "late":
        return "Terlambat";

      case "absent":
        return "Tidak Hadir";

      default:
        return "Tidak Hadir";
    }
  };

  const getShiftTimeBadge = (
    startTime?: string | null,
    endTime?: string | null
  ) => {
    if (!startTime || !endTime) {
      return null;
    }

    const now = new Date();

    const currentMins =
      now.getHours() * 60 + now.getMinutes();

    const [startH, startM] =
      startTime.split(":").map(Number);

    const [endH, endM] =
      endTime.split(":").map(Number);

    const startMins =
      startH * 60 + startM;

    const endMins =
      endH * 60 + endM;

    if (currentMins < startMins) {
      return (
        <span className="mt-0.5 inline-block w-fit rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-600">
          Belum Mulai
        </span>
      );
    }

    if (
      currentMins >= startMins &&
      currentMins <= endMins
    ) {
      return (
        <span className="mt-0.5 inline-block w-fit rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
          Sedang Berlangsung
        </span>
      );
    }

    return (
      <span className="mt-0.5 inline-block w-fit rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
        Selesai
      </span>
    );
  };

  const filteredAttendance = attendance.filter(
    (item) => {
      const searchValue =
        search.toLowerCase();

      const matchesSearch =
        item.name
          .toLowerCase()
          .includes(searchValue) ||
        item.department
          .toLowerCase()
          .includes(searchValue) ||
        (item.shiftName || "")
          .toLowerCase()
          .includes(searchValue);

      const matchesStatus =
        statusFilter === "Semua" ||
        item.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    }
  ); 

  const totalPages =
    Math.ceil(
      filteredAttendance.length /
        rowsPerPage
    ) || 1;

  const startIndex =
    (currentPage - 1) *
    rowsPerPage;

  const paginatedAttendance =
    filteredAttendance.slice(
      startIndex,
      startIndex + rowsPerPage
    );

  const totalEmployees =
    attendance.length;

  const totalPresent =
    attendance.filter(
      (item) =>
        item.status === "Hadir" ||
        item.status === "Terlambat"
    ).length;

  const totalAbsent =
    attendance.filter(
      (item) =>
        item.status === "Tidak Hadir"
    ).length;

  const totalOffOrLeave =
    attendance.filter(
      (item) =>
        item.status === "Off" ||
        item.status === "Cuti"
    ).length; 

  const getStatusClass = (
    status: string
  ) => {
    switch (status) {
      case "Hadir":
        return "bg-green-100 text-green-700";

      case "Terlambat":
        return "bg-yellow-100 text-yellow-700";

      case "Tidak Hadir":
        return "bg-red-100 text-red-700";

      case "Off":
        return "bg-slate-100 text-slate-600";

      case "Cuti":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  }; 

  const getShiftStyle = (
    item: Attendance
  ) => {
    if (item.shiftStatus === "off") {
      return "bg-slate-100 text-slate-600 border-slate-200";
    }

    if (item.shiftStatus === "leave") {
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    }

    if (
      item.shiftStatus === "working" &&
      item.shiftColor
    ) {
      return item.shiftColor;
    }

    return "bg-green-100 text-green-700 border-green-300";
  };  

  const getGoogleMapsUrl = (
    latitude: number,
    longitude: number
  ) => {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  };

  return (
    <div className="scrollbar-none space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Rekap Harian
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Rekap kehadiran karyawan berdasarkan
          jadwal dan shift harian.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">        
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total Karyawan
          </p>

          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {totalEmployees}
          </p>
        </div>        

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Hadir
          </p>

          <p className="mt-2 text-2xl font-semibold text-green-600">
            {totalPresent}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Tidak Hadir
          </p>

          <p className="mt-2 text-2xl font-semibold text-red-600">
            {totalAbsent}
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Off / Cuti
          </p>

          <p className="mt-2 text-2xl font-semibold text-slate-500">
            {totalOffOrLeave}
          </p>
        </div>
      </div>                

      <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm md:flex-row md:items-center">        

        <input
          type="text"
          placeholder="Cari nama karyawan, department, atau shift..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 md:flex-1"
        />        

        <div className="relative flex items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) =>
              setSelectedDate(
                e.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-blue-500 md:w-auto"
          />
        </div>        

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setIsDropdownOpen(
                !isDropdownOpen
              )
            }
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all hover:bg-slate-50 focus:border-blue-500 md:w-48"
          >
            <span>
              {statusFilter}
            </span>

            <ChevronDown
              size={18}
              className={`text-slate-400 transition-transform ${
                isDropdownOpen
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() =>
                  setIsDropdownOpen(
                    false
                  )
                }
              />

              <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                {[
                  "Semua",
                  "Hadir",
                  "Terlambat",
                  "Tidak Hadir",
                  "Off",
                  "Cuti",
                ].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilter(
                        status
                      );

                      setIsDropdownOpen(
                        false
                      );
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      statusFilter ===
                      status
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>      

      <div className="flex flex-wrap items-center gap-3 px-1 text-xs text-slate-500">
        <span className="font-medium text-slate-700">
          Keterangan Status:
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-100 bg-white px-2.5 py-1 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          Hadir
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-100 bg-white px-2.5 py-1 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          Terlambat / Cuti
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-100 bg-white px-2.5 py-1 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Tidak Hadir
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-100 bg-white px-2.5 py-1 shadow-2xs">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          Off (Libur)
        </span>
      </div>  

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-375 text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-4 font-medium">
                  Nama Karyawan
                </th>

                <th className="px-5 py-4 font-medium">
                  Foto Absen
                </th>

                <th className="px-5 py-4 font-medium">
                  Department
                </th>

                <th className="px-5 py-4 font-medium">
                  Shift & Jadwal
                </th>

                <th className="px-5 py-4 font-medium">
                  Tanggal
                </th>

                <th className="px-5 py-4 font-medium">
                  Jam Masuk
                </th>

                <th className="px-5 py-4 font-medium">
                  Jam Keluar
                </th>
                
                <th className="px-5 py-4 font-medium">
                  Lokasi Clock In
                </th>

                <th className="px-5 py-4 font-medium">
                  Status Kehadiran
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">             

              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock
                        className="animate-spin text-blue-500"
                        size={24}
                      />

                      <span>
                        Memuat data rekap
                        kehadiran...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedAttendance.length ===
                0 ? (                

                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-slate-400"
                  >
                    Tidak ada data rekap
                    kehadiran yang cocok
                    dengan filter atau
                    tanggal yang dipilih.
                  </td>
                </tr>
              ) : (                

                paginatedAttendance.map(
                  (item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >                      

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {item.name}
                        </p>
                      </td>                      

                      <td className="px-5 py-4">
                        {item.photoUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPhoto(
                                item.photoUrl
                              )
                            }
                          >
                            <img
                              src={
                                item.photoUrl
                              }
                              alt={`Foto ${item.name}`}
                              className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100 transition-opacity hover:opacity-80"
                              title="Klik untuk memperbesar foto"
                            />
                          </button>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-400">
                            N/A
                          </div>
                        )}
                      </td>                      

                      <td className="px-5 py-4 font-normal text-slate-600">
                        {item.department}
                      </td>                      

                      <td className="px-5 py-4">
                        {item.shiftStatus ===
                          "working" &&
                        item.shiftName ? (
                          <div
                            className={`inline-flex flex-col rounded-lg border px-3 py-1.5 shadow-2xs ${getShiftStyle(
                              item
                            )}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold">
                                {item.shiftName}
                              </span>
                            </div>

                            <span className="text-[11px] opacity-80">
                              {item.shiftTime}
                            </span>

                            {getShiftTimeBadge(
                              item.startTimeRaw,
                              item.endTimeRaw
                            )}
                          </div>
                        ) : item.shiftStatus ===
                          "leave" ? (
                          <span className="inline-flex rounded-lg border border-yellow-300 bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-700">
                            Cuti
                          </span>
                        ) : (
                          <span className="inline-flex rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                            Off (Libur)
                          </span>
                        )}
                      </td>                      

                      <td className="px-5 py-4 text-slate-600">
                        {item.date}
                      </td>                      

                      <td className="px-5 py-4 font-medium text-slate-700">
                        {item.checkIn !==
                        "-" ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-800">
                            {item.checkIn}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            -
                          </span>
                        )}
                      </td>
                      
                      <td className="px-5 py-4 font-medium text-slate-700">
                        {item.checkOut !==
                        "-" ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-800">
                            {item.checkOut}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            -
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {item.latitude !==
                          null &&
                        item.latitude !==
                          undefined &&
                        item.longitude !==
                          null &&
                        item.longitude !==
                          undefined &&
                        !Number.isNaN(
                          item.latitude
                        ) &&
                        !Number.isNaN(
                          item.longitude
                        ) ? (
                          <div className="flex min-w-42.5 flex-col gap-1.5">
                            <div className="flex items-start gap-1.5">
                              <MapPin
                                size={15}
                                className="mt-0.5 shrink-0 text-red-500"
                              />

                              <span className="text-xs font-medium text-slate-700">
                                {item.latitude.toFixed(
                                  6
                                )}
                                ,{" "}
                                {item.longitude.toFixed(
                                  6
                                )}
                              </span>
                            </div>

                            <a
                              href={getGoogleMapsUrl(
                                item.latitude,
                                item.longitude
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-fit text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
                            >
                              Lihat di Maps
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400">
                            -
                          </span>
                        )}
                      </td>                    

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>      

      {!loading &&
        filteredAttendance.length >
          0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white px-5 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Menampilkan{" "}
              <span className="font-medium text-slate-700">
                {startIndex + 1}
              </span>{" "}
              -{" "}
              <span className="font-medium text-slate-700">
                {Math.min(
                  startIndex +
                    rowsPerPage,
                  filteredAttendance.length
                )}
              </span>{" "}
              dari{" "}
              <span className="font-medium text-slate-700">
                {
                  filteredAttendance.length
                }
              </span>{" "}
              data karyawan
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setCurrentPage(
                    (prev) =>
                      Math.max(
                        prev - 1,
                        1
                      )
                  )
                }
                disabled={
                  currentPage === 1
                }
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                Sebelumnya
              </button>

              <span className="px-1 text-xs font-medium text-slate-600">
                Hal. {currentPage} dari{" "}
                {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage(
                    (prev) =>
                      Math.min(
                        prev + 1,
                        totalPages
                      )
                  )
                }
                disabled={
                  currentPage ===
                  totalPages
                }
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() =>
            setSelectedPhoto(null)
          }
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <img
              src={selectedPhoto}
              alt="Attendance"
              className="max-h-[85vh] max-w-[85vw] rounded-xl bg-white object-contain p-1 shadow-2xl"
            />

            <button
              type="button"
              onClick={() =>
                setSelectedPhoto(null)
              }
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 font-bold text-white transition-colors hover:bg-black"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Attendance;