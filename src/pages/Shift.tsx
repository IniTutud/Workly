import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Settings,
} from "lucide-react";

type ScheduleStatus = "working" | "off" | "leave";

type Employee = {
  id: string;
  full_name: string;
  department: string | null;
};

type ShiftData = {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  color?: string | null; 
  created_at?: string;
  updated_at?: string;
};

type Schedule = {
  user_id: string;
  date: string;
  status: ScheduleStatus;
  shift_id: number | null;
};

const PRESET_COLORS = [
  { label: "Biru", value: "bg-blue-100 text-blue-700 border-blue-300" },
  { label: "Hijau", value: "bg-green-100 text-green-700 border-green-300" },
  { label: "Ungu", value: "bg-purple-100 text-purple-700 border-purple-300" },
  { label: "Amber", value: "bg-amber-100 text-amber-700 border-amber-300" },
  { label: "Pink", value: "bg-pink-100 text-pink-700 border-pink-300" },
  { label: "Indigo", value: "bg-indigo-100 text-indigo-700 border-indigo-300" },
  { label: "Rose", value: "bg-rose-100 text-rose-700 border-rose-300" },
  { label: "Cyan", value: "bg-cyan-100 text-cyan-700 border-cyan-300" },
];

function Shift() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [shifts, setShifts] = useState<ShiftData[]>([]);

  const [loading, setLoading] = useState(true);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const [currentWeek, setCurrentWeek] = useState(new Date());

  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("Semua");
  const [departments, setDepartments] = useState<string[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  
  const [columnShiftSelections, setColumnShiftSelections] = useState<{ [key: string]: number | "" }>({});

  const [showManageShiftModal, setShowManageShiftModal] = useState(false);
  const [showShiftFormModal, setShowShiftFormModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftData | null>(null);
  const [shiftForm, setShiftForm] = useState({
    name: "",
    start_time: "",
    end_time: "",
    color: PRESET_COLORS[0].value,
  });

  useEffect(() => {
    fetchEmployees();
    fetchShifts();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [currentWeek]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDepartment]);

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

      if (error) throw error;
      const empList = data || [];
      setEmployees(empList);

      const uniqueDepts = Array.from(
        new Set(empList.map((e) => e.department).filter(Boolean))
      ) as string[];
      setDepartments(uniqueDepts);
    } catch (error: any) {
      console.error("FETCH EMPLOYEES ERROR:", error);
      alert("Gagal mengambil data karyawan.");
    }
  };

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from("shifts")
        .select("id, name, start_time, end_time, color, created_at, updated_at")
        .order("start_time", { ascending: true });

      if (error) throw error;
      setShifts((data || []) as ShiftData[]);
    } catch (error: any) {
      console.error("FETCH SHIFTS ERROR:", error);
      alert(`Gagal mengambil data shift: ${error.message}`);
    }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);

      const { data, error } = await supabase
        .from("employee_schedules")
        .select("user_id, date, status, shift_id")
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) throw error;
      setSchedules((data || []) as Schedule[]);
    } catch (error: any) {
      console.error("FETCH SCHEDULE ERROR:", error);
      alert(`Gagal mengambil jadwal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getSchedule = (userId: string, date: string): Schedule | undefined => {
    return schedules.find((item) => item.user_id === userId && item.date === date);
  };

  const getShiftById = (shiftId: number | null) => {
    if (shiftId === null) return null;
    return shifts.find((shift) => shift.id === shiftId) || null;
  };

  const formatTime = (time: string) => {
    if (!time) return "-";
    return time.slice(0, 5);
  };

  const handleScheduleChange = async (userId: string, date: string, value: string) => {
    const currentSchedule = getSchedule(userId, date);
    if (currentSchedule?.status === "leave") {
      alert("Jadwal cuti tidak dapat diubah secara manual.");
      return;
    }

    let status: ScheduleStatus;
    let shiftId: number | null = null;

    if (value === "off") {
      status = "off";
      shiftId = null;
    } else {
      status = "working";
      shiftId = Number(value);
      if (!shiftId || Number.isNaN(shiftId)) return;
    }

    const key = `${userId}_${date}`;
    setUpdatingKey(key);

    setSchedules((prev) => {
      const existingIndex = prev.findIndex((s) => s.user_id === userId && s.date === date);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], status, shift_id: shiftId };
        return updated;
      } else {
        return [...prev, { user_id: userId, date, status, shift_id: shiftId }];
      }
    });

    try {
      const { error } = await supabase
        .from("employee_schedules")
        .upsert({ user_id: userId, date, status, shift_id: shiftId }, { onConflict: "user_id,date" });

      if (error) throw error;
    } catch (error: any) {
      console.error("UPDATE SCHEDULE ERROR:", error);
      alert(`Gagal mengubah jadwal: ${error.message}`);
      fetchSchedules();
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleSetDayOff = async (dateStr: string) => {
    const confirmed = window.confirm(
      `Ubah SEMUA ${filteredEmployees.length} karyawan pada tanggal ${dateStr} menjadi Off (termasuk yang berada di halaman lain)?`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const upsertData = filteredEmployees.map((employee) => {
        const current = getSchedule(employee.id, dateStr);
        if (current?.status === "leave") {
          return { user_id: employee.id, date: dateStr, status: "leave" as ScheduleStatus, shift_id: null };
        }
        return { user_id: employee.id, date: dateStr, status: "off" as ScheduleStatus, shift_id: null };
      });

      const { error } = await supabase.from("employee_schedules").upsert(upsertData, { onConflict: "user_id,date" });
      if (error) throw error;
      await fetchSchedules();
    } catch (error: any) {
      alert(`Gagal mengubah jadwal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDayShift = async (dateStr: string) => {
    const selectedShiftId = columnShiftSelections[dateStr];
    if (selectedShiftId === "" || selectedShiftId === undefined) {
      alert("Pilih shift pada dropdown di kolom tanggal tersebut terlebih dahulu.");
      return;
    }

    const selectedShift = getShiftById(Number(selectedShiftId));
    if (!selectedShift) return;

    const confirmed = window.confirm(
      `Ubah SEMUA ${filteredEmployees.length} karyawan pada tanggal ${dateStr} menjadi ${selectedShift.name} (${formatTime(selectedShift.start_time)} - ${formatTime(selectedShift.end_time)}) (termasuk yang di halaman lain)?`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const upsertData = filteredEmployees.map((employee) => {
        const current = getSchedule(employee.id, dateStr);
        if (current?.status === "leave") {
          return { user_id: employee.id, date: dateStr, status: "leave" as ScheduleStatus, shift_id: null };
        }
        return { user_id: employee.id, date: dateStr, status: "working" as ScheduleStatus, shift_id: Number(selectedShiftId) };
      });

      const { error } = await supabase.from("employee_schedules").upsert(upsertData, { onConflict: "user_id,date" });
      if (error) throw error;
      await fetchSchedules();
    } catch (error: any) {
      alert(`Gagal mengubah jadwal massal: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openAddShiftModal = () => {
    setEditingShift(null);
    setShiftForm({ name: "", start_time: "", end_time: "", color: PRESET_COLORS[0].value });
    setShowShiftFormModal(true);
  };

  const openEditShiftModal = (shift: ShiftData) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      start_time: shift.start_time.slice(0, 5),
      end_time: shift.end_time.slice(0, 5),
      color: shift.color || PRESET_COLORS[0].value,
    });
    setShowShiftFormModal(true);
  };

  const closeShiftFormModal = () => {
    if (shiftSaving) return;
    setShowShiftFormModal(false);
    setEditingShift(null);
    setShiftForm({ name: "", start_time: "", end_time: "", color: PRESET_COLORS[0].value });
  };

  const handleSaveShift = async () => {
    const name = shiftForm.name.trim();
    const startTime = shiftForm.start_time;
    const endTime = shiftForm.end_time;
    const color = shiftForm.color;

    if (!name || !startTime || !endTime) {
      alert("Nama shift, jam masuk, dan jam pulang wajib diisi.");
      return;
    }

    setShiftSaving(true);
    try {
      if (editingShift) {
        const { error } = await supabase
          .from("shifts")
          .update({ name, start_time: startTime, end_time: endTime, color, updated_at: new Date().toISOString() })
          .eq("id", editingShift.id);
        if (error) throw error;
        alert("Shift berhasil diperbarui.");
      } else {
        const { error } = await supabase.from("shifts").insert({ name, start_time: startTime, end_time: endTime, color });
        if (error) throw error;
        alert("Shift berhasil ditambahkan.");
      }
      closeShiftFormModal();
      await fetchShifts();
    } catch (error: any) {
      alert(`Gagal menyimpan shift: ${error.message}`);
    } finally {
      setShiftSaving(false);
    }
  };

  const handleDeleteShift = async (shift: ShiftData) => {
    const confirmed = window.confirm(`Hapus ${shift.name} (${formatTime(shift.start_time)} - ${formatTime(shift.end_time)})?`);
    if (!confirmed) return;

    setShiftSaving(true);
    try {
      const { error } = await supabase.from("shifts").delete().eq("id", shift.id);
      if (error) {
        if (error.message.toLowerCase().includes("foreign key") || error.message.toLowerCase().includes("violates")) {
          alert("Shift tidak dapat dihapus karena masih digunakan pada jadwal karyawan.");
        } else {
          alert(`Gagal menghapus shift: ${error.message}`);
        }
        return;
      }
      alert("Shift berhasil dihapus.");
      await fetchShifts();
      await fetchSchedules();
    } catch (error: any) {
      alert("Terjadi kesalahan saat menghapus shift.");
    } finally {
      setShiftSaving(false);
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const matchName = employee.full_name.toLowerCase().includes(search.toLowerCase());
    const matchDept = selectedDepartment === "Semua" ? true : employee.department === selectedDepartment;
    return matchName && matchDept;
  });

  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + rowsPerPage);

  const getStatusClass = (status: ScheduleStatus, shiftId: number | null) => {
    if (status === "off") return "bg-slate-100 text-slate-600 border-slate-200";
    if (status === "leave") return "bg-yellow-100 text-yellow-700 border-yellow-300";
    if (status === "working") {
      const shift = getShiftById(shiftId);
      if (shift && shift.color) return shift.color;
      return "bg-green-100 text-green-700 border-green-300";
    }
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const getDayName = (date: Date) => date.toLocaleDateString("id-ID", { weekday: "short" });
  const getDateNumber = (date: Date) => date.getDate();

  const formatWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    const startText = start.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const endText = end.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
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

  const goCurrentWeek = () => setCurrentWeek(new Date());

  return (
    <div className="scrollbar-none space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Pembagian Shift</h1>
          <p className="mt-1 text-sm text-slate-500">Atur shift dan jadwal kerja karyawan setiap hari secara terstruktur</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManageShiftModal(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Settings size={18} className="text-slate-500" /> Kelola Master Shift ({shifts.length})
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Periode Minggu</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatWeekRange()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goPreviousWeek} className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50" title="Minggu sebelumnya">
              <ChevronLeft size={18} />
            </button>
            <button onClick={goCurrentWeek} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Minggu Ini
            </button>
            <button onClick={goNextWeek} className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50" title="Minggu berikutnya">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama karyawan..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setSelectedDepartment("Semua")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${selectedDepartment === "Semua" ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            Semua Departemen
          </button>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${selectedDepartment === dept ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-4">
        {shifts.map((shift) => (
          <div key={shift.id} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full border ${shift.color || "bg-green-100 border-green-300"}`}></span>
            <span className="text-sm text-slate-600">{shift.name}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-slate-400"></span>
          <span className="text-sm text-slate-600">Off</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
          <span className="text-sm text-slate-600">Cuti</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-250 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-5 py-4 font-medium">Karyawan</th>
              {weekDates.map((date) => {
                const dateString = formatDate(date);
                const currentColumnShift = columnShiftSelections[dateString] ?? "";

                return (
                  <th key={dateString} className="px-3 py-4 text-center font-medium">
                    <div>{getDayName(date)}</div>
                    <div className="mt-1 text-xs text-slate-400">{getDateNumber(date)}</div>
                    
                    <div className="mt-2 flex flex-col gap-1 items-center">
                      <select
                        value={currentColumnShift}
                        onChange={(e) => setColumnShiftSelections({ ...columnShiftSelections, [dateString]: e.target.value ? Number(e.target.value) : "" })}
                        className="w-28 rounded border border-slate-300 bg-white px-1.5 py-1 text-[10px] text-slate-700 outline-none focus:border-blue-500"
                      >
                        <option value="">Pilih Shift</option>
                        {shifts.map((shift) => (
                          <option key={shift.id} value={shift.id}>
                            {shift.name}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSetDayShift(dateString)}
                          title="Terapkan shift terpilih ke seluruh karyawan yang lolos filter (termasuk halaman lain)"
                          className="rounded bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600 hover:bg-green-100"
                        >
                          All W
                        </button>
                        <button
                          onClick={() => handleSetDayOff(dateString)}
                          title="Set seluruh karyawan Off yang lolos filter (termasuk halaman lain)"
                          className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200"
                        >
                          All O
                        </button>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading && schedules.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-slate-500">Memuat jadwal...</td>
              </tr>
            ) : paginatedEmployees.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-slate-500">Data karyawan tidak ditemukan.</td>
              </tr>
            ) : (
              paginatedEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50">
                  <td className="sticky left-0 z-10 bg-white px-5 py-4">
                    <div className="font-medium text-slate-900">{employee.full_name}</div>
                    <div className="mt-1 text-xs text-slate-400">{employee.department || "-"}</div>
                  </td>

                  {weekDates.map((date) => {
                    const dateString = formatDate(date);
                    const schedule = getSchedule(employee.id, dateString);
                    const status = schedule?.status || "off";
                    const isLeave = status === "leave";
                    const shift = getShiftById(schedule?.shift_id ?? null);
                    const cellKey = `${employee.id}_${dateString}`;
                    const isCellUpdating = updatingKey === cellKey;

                    return (
                      <td key={dateString} className="px-3 py-4 text-center">
                        <div className="flex justify-center items-center gap-1">
                          {isLeave ? (
                            <span className="rounded-full border border-yellow-300 px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-700">
                              Cuti
                            </span>
                          ) : (
                            <select
                              value={status === "off" ? "off" : schedule?.shift_id ? String(schedule.shift_id) : ""}
                              disabled={isCellUpdating || shifts.length === 0}
                              onChange={(e) => handleScheduleChange(employee.id, dateString, e.target.value)}
                              className={`max-w-36 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition-opacity ${getStatusClass(status, schedule?.shift_id ?? null)} ${isCellUpdating ? "opacity-50" : ""}`}
                            >
                              <option value="off">Off</option>
                              {shifts.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name} ({formatTime(item.start_time)}-{formatTime(item.end_time)})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {status === "working" && shift && (
                          <p className="mt-1 text-[10px] text-slate-400">{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</p>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && filteredEmployees.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-white px-5 py-3 shadow-sm">
          <p className="text-xs text-slate-500">
            Menampilkan <span className="font-medium text-slate-700">{startIndex + 1}</span> - <span className="font-medium text-slate-700">{Math.min(startIndex + rowsPerPage, filteredEmployees.length)}</span> dari <span className="font-medium text-slate-700">{filteredEmployees.length}</span> karyawan
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

      {showManageShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Manajemen Master Shift</h2>
                <p className="text-xs text-slate-500">Tambah, ubah, atau hapus daftar shift beserta warnanya.</p>
              </div>
              <button onClick={() => setShowManageShiftModal(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Daftar Shift Aktif ({shifts.length})</span>
                <button
                  onClick={openAddShiftModal}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
                >
                  <Plus size={16} /> Tambah Shift Baru
                </button>
              </div>

              {shifts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                  <p className="text-sm text-slate-500">Belum ada shift yang terdaftar.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {shifts.map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 shadow-sm bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <span className={`h-4 w-4 rounded-full border ${shift.color || "bg-green-100 border-green-300"}`}></span>
                        <div>
                          <p className="font-semibold text-slate-900">{shift.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditShiftModal(shift)} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-blue-600 shadow-sm" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDeleteShift(shift)} disabled={shiftSaving} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600 shadow-sm disabled:opacity-50" title="Hapus">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowManageShiftModal(false)}
                className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showShiftFormModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{editingShift ? "Edit Shift" : "Tambah Shift Baru"}</h2>
                <p className="mt-1 text-xs text-slate-500">Tentukan nama, jam operasional, dan warna penanda shift.</p>
              </div>
              <button onClick={closeShiftFormModal} disabled={shiftSaving} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Nama Shift</label>
                <input
                  type="text"
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  placeholder="Contoh: Shift Pagi / Shift Malam"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Jam Masuk</label>
                  <input
                    type="time"
                    value={shiftForm.start_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Jam Pulang</label>
                  <input
                    type="time"
                    value={shiftForm.end_time}
                    onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* PEMILIH WARNA SHIFT */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Warna Penanda Shift</label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map((colorOption) => (
                    <button
                      type="button"
                      key={colorOption.label}
                      onClick={() => setShiftForm({ ...shiftForm, color: colorOption.value })}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${colorOption.value} ${shiftForm.color === colorOption.value ? "ring-2 ring-blue-600 ring-offset-2" : "opacity-75 hover:opacity-100"}`}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-current"></span>
                      {colorOption.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button onClick={closeShiftFormModal} disabled={shiftSaving} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Batal
              </button>
              <button onClick={handleSaveShift} disabled={shiftSaving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {shiftSaving ? "Menyimpan..." : editingShift ? "Simpan Perubahan" : "Simpan Shift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Shift;