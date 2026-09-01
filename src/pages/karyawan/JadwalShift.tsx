import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../utils/supabase';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Users,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  RefreshCw,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

interface Profile {
  id: string;
  full_name: string;
  department: string | null;
  role: string;
  photo_url: string | null;
}

interface EmployeeSchedule {
  id: string;
  user_id: string;
  date: string;
  status: string; 
}

// UPDATE: Menyesuaikan dengan nama kolom di database
interface ShiftSwap {
  id: string;
  date_from: string;
  date_to: string;
  status: string;
  target_user_id: string;
  requester_id: string;
  requester: { full_name: string };
  target: { full_name: string };
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const DAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const;

const SHIFT_CONFIG: Record<
  string,
  { label: string; time: string; bg: string; text: string; border: string; dot: string }
> = {
  libur: {
    label: 'Libur',
    time: 'OFF',
    bg: 'bg-slate-50',
    text: 'text-slate-400',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  cuti: {
    label: 'Cuti',
    time: 'OFF',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
  },
  masuk: {
    label: 'Masuk',
    time: '08:00 - 17:00',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
};

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-orange-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatHeaderMonth(d: Date): string {
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
}

function formatShortMonth(d: Date): string {
  return new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d);
}

function isToday(d: Date): boolean {
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

// UPDATE: Tambahan .trim() untuk memperbaiki bug 'cuti' yang menjadi 'masuk'
function getShiftInfo(status: string | undefined) {
  if (!status) return null;
  const cleanStatus = status.trim().toLowerCase();
  return SHIFT_CONFIG[cleanStatus] ?? SHIFT_CONFIG['masuk'];
}

function getShiftIcon(status: string | undefined) {
  const cleanStatus = (status ?? '').trim().toLowerCase();
  switch (cleanStatus) {
    case 'pagi':
    case 'masuk':
      return Sun;
    case 'sore':
      return Sunset;
    case 'malam':
      return Moon;
    case 'libur':
      return Coffee;
    case 'cuti':
      return XCircle;
    default:
      return Clock;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function JadwalShift() {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [allEmployees, setAllEmployees] = useState<Profile[]>([]);
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([]);
  const [swaps, setSwaps] = useState<ShiftSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly' | 'daily'>('weekly');

  // UPDATE: State form disesuaikan dengan nama kolom DB
  const [formData, setFormData] = useState({
    target_user_id: '',
    date_from: '',
    date_to: '',
  });
  const [showSwapForm, setShowSwapForm] = useState(false);

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = weekDates[6];
  const colleagues = allEmployees.filter((e) => e.id !== currentUser?.id);

  const scheduleMap = useMemo(() => {
    const m: Record<string, Record<string, EmployeeSchedule>> = {};
    schedules.forEach((s) => {
      if (!m[s.user_id]) m[s.user_id] = {};
      m[s.user_id][s.date] = s;
    });
    return m;
  }, [schedules]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [weekStart]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, department, role, photo_url')
        .eq('id', user.id)
        .single();
      if (profileData) setCurrentUser(profileData as Profile);

      const { data: employeesData } = await supabase
        .from('profiles')
        .select('id, full_name, department, role, photo_url')
        .order('full_name');
      if (employeesData) setAllEmployees(employeesData as Profile[]);

      await fetchSwaps();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const startStr = toDateStr(weekStart);
      const endStr = toDateStr(weekDates[6]);

      const { data, error } = await supabase
        .from('employee_schedules')
        .select('id, user_id, date, status')
        .gte('date', startStr)
        .lte('date', endStr);

      if (!error && data) setSchedules(data as EmployeeSchedule[]);
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  };

  const fetchSwaps = async () => {
    try {
      // UPDATE: Query select disesuaikan dengan nama tabel dan kolom di DB
      const { data, error } = await supabase
        .from('shift_swap_requests')
        .select(
          `id, date_from, date_to, status, target_user_id, requester_id,
           requester:profiles!requester_id(full_name),
           target:profiles!target_user_id(full_name)`
        )
        .order('created_at', { ascending: false });

      if (!error && data) {
        // @ts-ignore
        setSwaps(data);
      } else if (error) {
        console.error("Fetch swap error:", error);
      }
    } catch (err) {
      console.error("Fetch swap exception:", err);
    }
  };

  const goPrev = () => setWeekStart((p) => addDays(p, -7));
  const goNext = () => setWeekStart((p) => addDays(p, 7));
  const goToday = () => setWeekStart(getMondayOfWeek(new Date()));

  const handleSubmitSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      // UPDATE: Payload insert disesuaikan dengan nama kolom DB
      const { error } = await supabase.from('shift_swap_requests').insert([
        {
          requester_id: currentUser.id,
          target_user_id: formData.target_user_id,
          date_from: formData.date_from,
          date_to: formData.date_to,
        },
      ]);
      
      if (error) throw error; 
      
      alert('Pengajuan tukar shift berhasil dikirim!');
      setFormData({ target_user_id: '', date_from: '', date_to: '' });
      setShowSwapForm(false);
      await fetchSwaps();
    } catch (err: any) {
      console.error('Error submitting swap:', err);
      alert(`Gagal mengajukan tukar shift.\n\nDetail Error: ${err.message || 'Terjadi kesalahan pada database.'}`);
    }
  };

  const handleResponseSwap = async (swapId: string, approved: boolean) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from('shift_swap_requests')
        .update({ status: approved ? 'pending_admin_approval' : 'rejected_by_employee' })
        .eq('id', swapId);
        
      if (error) throw error; 
      
      await fetchSwaps();
    } catch (err: any) {
      console.error('Error updating swap:', err);
      alert(`Gagal memproses respon.\n\nDetail Error: ${err.message || 'Terjadi kesalahan pada database.'}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending_employee_approval: { label: 'Menunggu Konfirmasi', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
      pending_admin_approval: { label: 'Menunggu Admin', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
      approved: { label: 'Disetujui', cls: 'bg-green-50 text-green-700 border-green-200' },
      rejected_by_employee: { label: 'Ditolak Rekan', cls: 'bg-red-50 text-red-700 border-red-200' },
      rejected: { label: 'Ditolak', cls: 'bg-red-50 text-red-700 border-red-200' },
    };
    const info = map[status] ?? { label: status, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${info.cls}`}>
        {info.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-blue-200 border-t-blue-600" />
          <p className="text-sm text-slate-400 animate-pulse">Memuat jadwal...</p>
        </div>
      </div>
    );
  }

  const displayEmployees = allEmployees.filter((e) => e.role === 'karyawan');

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto pb-12">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Jadwal Shift &amp; Tukar Shift
              <span className="text-slate-400 font-normal text-lg ml-2">
                — {formatHeaderMonth(weekStart)}
              </span>
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Lihat jadwal mingguan semua karyawan dan ajukan pertukaran shift
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1 py-1 shadow-sm">
            <button onClick={goPrev} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" title="Minggu sebelumnya">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Hari Ini
            </button>
            <button onClick={goNext} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" title="Minggu berikutnya">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          
        </div>
      </div>

      {/* ── SHIFT LEGEND ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 px-1">
        {Object.entries(SHIFT_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            <span className="text-xs text-slate-500 font-medium">
              {cfg.label}
              <span className="text-slate-400 ml-1">({cfg.time})</span>
            </span>
          </div>
        ))}
      </div>

      {/* ── WEEKLY SCHEDULE TABLE ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-800">Jadwal Mingguan</h2>
            <span className="text-sm text-slate-400 font-normal ml-1">
              {weekDates[0].getDate()} {formatShortMonth(weekDates[0])} – {weekEnd.getDate()}{' '}
              {formatShortMonth(weekEnd)} {weekEnd.getFullYear()}
            </span>
          </div>
          <button
            onClick={() => setShowSwapForm(!showSwapForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Tukar Shift
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/80">
                <th className="sticky left-0 z-10 bg-slate-50 px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 w-[200px]">
                  Karyawan
                </th>
                {weekDates.map((date, i) => {
                  const today = isToday(date);
                  return (
                    <th
                      key={i}
                      className={`px-2 py-3 text-center border-b border-slate-100 min-w-[120px] ${
                        today ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className={`text-xs font-semibold uppercase tracking-wide ${today ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {DAYS_ID[i]}
                      </div>
                      <div className={`text-lg font-bold leading-tight mt-0.5 ${today ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {date.getDate()}
                      </div>
                      <div className={`text-xs ${today ? 'text-indigo-400' : 'text-slate-400'}`}>
                        {formatShortMonth(date)}
                      </div>
                      {today && (
                        <div className="mt-1.5 mx-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {displayEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 font-medium">Belum ada data karyawan</p>
                  </td>
                </tr>
              ) : (
                displayEmployees.map((emp, empIdx) => {
                  const isSelf = emp.id === currentUser?.id;
                  return (
                    <tr
                      key={emp.id}
                      className={`group transition-colors ${
                        isSelf
                          ? 'bg-indigo-50/30 hover:bg-indigo-50/60'
                          : empIdx % 2 === 0
                          ? 'bg-white hover:bg-slate-50/60'
                          : 'bg-slate-50/30 hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="sticky left-0 z-10 px-5 py-3 border-b border-r border-slate-100 bg-inherit">
                        <div className="flex items-center gap-3">
                          {emp.photo_url ? (
                            <img
                              src={emp.photo_url}
                              alt={emp.full_name}
                              className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                            />
                          ) : (
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm ${getAvatarColor(emp.full_name)}`}
                            >
                              {getInitials(emp.full_name)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${isSelf ? 'text-indigo-700' : 'text-slate-700'}`}>
                              {emp.full_name}
                              {isSelf && (
                                <span className="ml-1.5 text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">
                                  Anda
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400 truncate">{emp.department || '-'}</p>
                          </div>
                        </div>
                      </td>

                      {weekDates.map((date, i) => {
                        const dateStr = toDateStr(date);
                        const schedule = scheduleMap[emp.id]?.[dateStr];
                        const shift = getShiftInfo(schedule?.status);
                        const today = isToday(date);
                        const Icon = getShiftIcon(schedule?.status);

                        return (
                          <td
                            key={i}
                            className={`px-2 py-2.5 border-b border-slate-100 text-center ${today ? 'bg-indigo-50/40' : ''}`}
                          >
                            {shift ? (
                              <div
                                className={`relative inline-flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border ${shift.bg} ${shift.text} ${shift.border} min-w-[90px] transition-all hover:scale-105 hover:shadow-md cursor-default`}
                              >
                                <Icon className="w-3.5 h-3.5 opacity-70" />
                                <span className="text-xs font-bold leading-tight">{shift.label}</span>
                                <span className="text-[10px] opacity-60 font-medium">{shift.time}</span>

                                {['sore', 'malam'].includes((schedule?.status ?? '').trim().toLowerCase()) && (
                                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center">
                                    <ArrowRightLeft className="w-2.5 h-2.5 text-slate-400" />
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs font-medium">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SWAP FORM (collapsible) ────────────────────────────────────────── */}
      {showSwapForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in slide-in-from-top-2">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-500" />
              Ajukan Pertukaran Shift
            </h2>
            <button onClick={() => setShowSwapForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmitSwap} className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Rekan Pengganti</label>
              <select
                required
                value={formData.target_user_id}
                onChange={(e) => setFormData({ ...formData, target_user_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">— Pilih Rekan —</option>
                {colleagues
                  .filter((c) => c.role === 'karyawan')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Diserahkan</label>
              <input
                type="date"
                required
                value={formData.date_from}
                onChange={(e) => setFormData({ ...formData, date_from: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Diambil</label>
              <input
                type="date"
                required
                value={formData.date_to}
                onChange={(e) => setFormData({ ...formData, date_to: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Kirim Pengajuan
            </button>
          </form>
        </div>
      )}

      {/* ── SWAP REQUEST TABLE ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-amber-500" />
            Daftar Permintaan Tukar Shift
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left border-b border-slate-100 w-12">No</th>
                <th className="px-4 py-3 text-left border-b border-slate-100">Pemohon</th>
                <th className="px-4 py-3 text-center border-b border-slate-100">Tanggal Asli</th>
                <th className="px-4 py-3 text-center border-b border-slate-100">Hari</th>
                <th className="px-4 py-3 text-center border-b border-slate-100 w-10" />
                <th className="px-4 py-3 text-left border-b border-slate-100">Pengganti</th>
                <th className="px-4 py-3 text-center border-b border-slate-100">Tanggal Baru</th>
                <th className="px-4 py-3 text-center border-b border-slate-100">Status</th>
                <th className="px-4 py-3 text-center border-b border-slate-100">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {swaps.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <ArrowRightLeft className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">Belum ada permintaan tukar shift</p>
                    <p className="text-xs text-slate-300 mt-1">
                      Klik tombol "Tukar Shift" di atas untuk mengajukan pertukaran
                    </p>
                  </td>
                </tr>
              ) : (
                swaps.map((swap, idx) => {
                  const isTargetPending =
                    swap.target_user_id === currentUser?.id && swap.status === 'pending_employee_approval';
                  const giveDate = new Date(swap.date_from);
                  const takeDate = new Date(swap.date_to);

                  return (
                    <tr key={swap.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-3 text-slate-400 font-medium">{idx + 1}</td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(swap.requester?.full_name || 'User')}`}>
                            {getInitials(swap.requester?.full_name || 'User')}
                          </div>
                          <span className="font-semibold text-slate-700">{swap.requester?.full_name || '-'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center text-slate-600">
                        {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(giveDate)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                          {new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(giveDate)}
                        </span>
                      </td>

                      <td className="px-2 py-3 text-center">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center mx-auto">
                          <ChevronRight className="w-4 h-4 text-indigo-400" />
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(swap.target?.full_name || 'User')}`}>
                            {getInitials(swap.target?.full_name || 'User')}
                          </div>
                          <span className="font-semibold text-slate-700">{swap.target?.full_name || '-'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center text-slate-600">
                        {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(takeDate)}
                      </td>

                      <td className="px-4 py-3 text-center">{getStatusBadge(swap.status)}</td>

                      <td className="px-4 py-3 text-center">
                        {isTargetPending ? (
                          <div className="flex gap-1.5 justify-center">
                            <button
                              onClick={() => handleResponseSwap(swap.id, true)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                              title="Terima"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Terima
                            </button>
                            <button
                              onClick={() => handleResponseSwap(swap.id, false)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                              title="Tolak"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <button className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                            Detail
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}