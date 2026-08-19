import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { 
  IdCard, 
  Fingerprint,
  Clock,
  CalendarDays,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfile {
  id: string;
  fullName: string;
  role: string;
}

interface Attendance {
  id: string | number;
  date: string;
  clockIn: string;
  clockOut: string;
  status: string;
}

interface Leave {
  id: string | number;
  submissionDate: string;
  leaveDate: string;
  reason: string;
  status: string;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};

const formatTime = (timeStr: string | null) => {
  if (!timeStr) return '-';
  if (timeStr.includes('T')) {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  return timeStr.substring(0, 5); // Fallback for HH:MM:SS format
};

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const [profileRes, attendanceRes, leaveRes] = await Promise.all([
            supabase.from('profiles').select('full_name, role').eq('id', user.id).single(),
            supabase.from('attendances').select('*').eq('user_id', user.id).order('clock_in', { ascending: false }),
            supabase.from('leaves').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
          ]);

          if (profileRes.error) throw profileRes.error;
          if (attendanceRes.error) throw attendanceRes.error;
          if (leaveRes.error) throw leaveRes.error;

          const data = profileRes.data;
          const nameToDisplay = data?.full_name || data?.role || 'Pengguna Tidak Diketahui';

          setProfile({
            id: user.id,
            fullName: nameToDisplay,
            role: data?.role || 'Karyawan',
          });

          const mappedAttendances: Attendance[] = (attendanceRes.data || []).map((att: any) => ({
            id: att.id,
            date: formatDate(att.date || att.clock_in),
            clockIn: formatTime(att.clock_in),
            clockOut: formatTime(att.clock_out),
            status: att.status || 'present'
          }));
          setAttendanceHistory(mappedAttendances);

          const mappedLeaves: Leave[] = (leaveRes.data || []).map((lv: any) => {
            const start = formatDate(lv.start_date);
            const end = formatDate(lv.end_date);
            const leaveDateStr = start === end ? start : `${start} s/d ${end}`;
            return {
              id: lv.id,
              submissionDate: formatDate(lv.created_at),
              leaveDate: leaveDateStr,
              reason: lv.reason || '-',
              status: lv.status || 'pending'
            };
          });
          setLeaveHistory(mappedLeaves);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto pb-12 animate-in fade-in duration-500 space-y-8 mt-6">
      {/* 1. KARTU PROFIL */}
      <Card className="shadow-lg border-slate-200 overflow-hidden max-w-2xl mx-auto w-full">
        <CardContent className="p-8 sm:p-10">
          {loading ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <Skeleton className="h-8 w-64 mt-4" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-56 mt-4 rounded-full" />
              <p className="text-slate-500 animate-pulse mt-4">Memuat profil...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shadow-inner border border-blue-100">
                <IdCard className="w-12 h-12" />
              </div>
              
              <div className="space-y-1">
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {profile?.fullName}
                </h2>
                <p className="text-lg text-primary capitalize font-medium">
                  {profile?.role}
                </p>
              </div>

              <div className="pt-2">
                <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium flex items-center gap-2">
                  <Fingerprint className="w-4 h-4" />
                  ID: {profile?.id}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. CONTAINER TABS RIWAYAT */}
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
            <FileText className="w-5 h-5 text-blue-600" />
            Riwayat Karyawan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="absensi" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-auto p-1 bg-slate-100/80">
              <TabsTrigger value="absensi" className="py-2.5 text-sm sm:text-base data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Clock className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline mr-1">Riwayat</span> Absensi
              </TabsTrigger>
              <TabsTrigger value="cuti" className="py-2.5 text-sm sm:text-base data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <CalendarDays className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline mr-1">Riwayat</span> Cuti
              </TabsTrigger>
            </TabsList>

            <TabsContent value="absensi" className="animate-in fade-in duration-300">
              <div className="rounded-md border border-slate-200 overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-600">Tanggal</TableHead>
                      <TableHead className="font-semibold text-slate-600">Clock In</TableHead>
                      <TableHead className="font-semibold text-slate-600">Clock Out</TableHead>
                      <TableHead className="font-semibold text-slate-600">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-500">
                          Memuat data...
                        </TableCell>
                      </TableRow>
                    ) : attendanceHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-500">
                          Belum ada riwayat absensi.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendanceHistory.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium text-slate-700">{row.date}</TableCell>
                          <TableCell>{row.clockIn}</TableCell>
                          <TableCell>{row.clockOut}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                row.status.toLowerCase() === 'present' || row.status.toLowerCase() === 'hadir' ? 'default' : 
                                row.status.toLowerCase() === 'late' || row.status.toLowerCase() === 'terlambat' ? 'secondary' : 
                                'destructive'
                              }
                              className={
                                row.status.toLowerCase() === 'present' || row.status.toLowerCase() === 'hadir' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 
                                row.status.toLowerCase() === 'late' || row.status.toLowerCase() === 'terlambat' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 
                                'bg-rose-500 hover:bg-rose-600 text-white'
                              }
                            >
                              {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="cuti" className="animate-in fade-in duration-300">
              <div className="rounded-md border border-slate-200 overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-600">Tanggal Pengajuan</TableHead>
                      <TableHead className="font-semibold text-slate-600">Tanggal Cuti</TableHead>
                      <TableHead className="font-semibold text-slate-600">Keterangan / Alasan</TableHead>
                      <TableHead className="font-semibold text-slate-600">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-500">
                          Memuat data...
                        </TableCell>
                      </TableRow>
                    ) : leaveHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-500">
                          Belum ada riwayat pengajuan cuti.
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaveHistory.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium text-slate-700">{row.submissionDate}</TableCell>
                          <TableCell>{row.leaveDate}</TableCell>
                          <TableCell className="min-w-[200px]">{row.reason}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="default"
                              className={
                                row.status.toLowerCase() === 'approved' || row.status.toLowerCase() === 'disetujui'
                                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                                  : row.status.toLowerCase() === 'pending' || row.status.toLowerCase() === 'menunggu'
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                                    : 'bg-rose-500 hover:bg-rose-600 text-white'
                              }
                            >
                              {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
