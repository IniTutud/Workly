import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Send, CheckCircle2, FileText } from 'lucide-react';

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

const PengajuanCuti: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [leaveHistory, setLeaveHistory] = useState<Leave[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchLeaveHistory();
  }, []);

  const fetchLeaveHistory = async () => {
    try {
      setLoadingHistory(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('leaves')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedLeaves: Leave[] = (data || []).map((lv: any) => {
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
    } catch (error) {
      console.error('Error fetching leave history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDocumentFile(e.target.files[0]);
    }
  };

  const uploadDocument = async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `leave_documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('leave_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('leave_documents')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Gagal mengunggah dokumen pendukung.');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate || !reason) {
      alert('Mohon lengkapi semua kolom wajib (Tanggal Mulai, Tanggal Selesai, dan Alasan).');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    setIsLoading(true);
    setIsSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Pengguna belum login");

      let documentUrl = null;
      if (documentFile) {
        documentUrl = await uploadDocument(documentFile);
        if (!documentUrl) throw new Error("Gagal mengunggah dokumen");
      }

      const { error } = await supabase
        .from('leaves')
        .insert({
          user_id: user.id,
          start_date: startDate,
          end_date: endDate,
          reason: reason,
          status: 'pending',
          document_url: documentUrl,
        });

      if (error) throw error;

      setIsSuccess(true);
      // Reset form
      setStartDate('');
      setEndDate('');
      setReason('');
      setDocumentFile(null);
      
      // Auto hide success message after 5 seconds
      setTimeout(() => setIsSuccess(false), 5000);
      
      // Refresh history
      fetchLeaveHistory();

    } catch (error: any) {
      console.error('Error submitting leave request:', error);
      alert(`Gagal mengajukan permohonan: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // UBAH 1: max-w-2xl diganti menjadi max-w-4xl agar UI lebih lebar dan lega
    <div className="w-full max-w-4xl mx-auto pb-12 animate-in fade-in zoom-in-95 duration-500">
      <Card className="shadow-2xl border-slate-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <CardHeader className="text-center bg-white border-b border-slate-100 pb-8 pt-8 relative z-10">
          <CardTitle className="text-3xl font-extrabold text-slate-800 mb-2 tracking-tight flex items-center justify-center gap-3">
            <CalendarDays className="w-8 h-8 text-indigo-600" />
            Form Pengajuan Cuti / Izin
          </CardTitle>
          <CardDescription className="text-slate-500 text-base font-medium">
            Lengkapi formulir di bawah ini untuk mengajukan permohonan cuti atau izin.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 bg-slate-50/50 relative z-10">
          {isSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 animate-in slide-in-from-top-4">
              <CheckCircle2 className="w-10 h-9 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-800">Berhasil Diajukan!</h4>
                <p className="text-sm text-emerald-600 mt-1">Permohonan cuti/izin Anda telah berhasil dikirim dan sedang menunggu persetujuan HRD.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-slate-700 font-semibold">Tanggal Mulai <span className="text-rose-500">*</span></Label>
                <Input 
                  id="start_date" 
                  type="date" 
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border-slate-300 focus-visible:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date" className="text-slate-700 font-semibold">Tanggal Selesai <span className="text-rose-500">*</span></Label>
                <Input 
                  id="end_date" 
                  type="date" 
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border-slate-300 focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-slate-700 font-semibold">Alasan Cuti / Izin <span className="text-rose-500">*</span></Label>
              <Textarea 
                id="reason" 
                placeholder="Jelaskan alasan pengajuan Anda secara rinci..." 
                rows={4}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-white border-slate-300 focus-visible:ring-indigo-500 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document" className="text-slate-700 font-semibold">Dokumen Pendukung (Opsional)</Label>
              <div className="relative">
                <Input 
                  id="document" 
                  type="file" 
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="bg-white border-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer pt-2 pb-2 h-auto"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Format: PDF atau Gambar (JPG, PNG).</p>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-6 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                {isLoading ? (
                  <span className="animate-pulse">Memproses...</span>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Ajukan Permohonan
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* RIWAYAT PENGAJUAN CUTI */}
          <div className="w-full pt-8 border-t border-slate-200 mt-8">
            <div className="flex items-center gap-2 mb-4 text-slate-800">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold">Riwayat Pengajuan</h3>
            </div>
            
            {/* UBAH 2: Menghapus overflow-x-auto di div ini untuk mencegah bentrok */}
            <div className="rounded-md border border-slate-300 bg-white w-full">
              {/* UBAH 3: Menambahkan min-w-[700px] pada komponen Table agar otomatis bisa di-scroll jika layar kecil */}
              <Table className="min-w-[700px]">
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-600">Tanggal Pengajuan</TableHead>
                    <TableHead className="font-semibold text-slate-600">Tanggal Cuti</TableHead>
                    {/* UBAH 4: Memastikan kolom alasan cukup lebar */}
                    <TableHead className="font-semibold text-slate-600 min-w-[200px]">Keterangan / Alasan</TableHead>
                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingHistory ? (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PengajuanCuti;