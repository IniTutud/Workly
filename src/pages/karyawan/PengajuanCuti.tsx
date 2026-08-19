import React, { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, Send, CheckCircle2 } from 'lucide-react';

const PengajuanCuti: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

    } catch (error: any) {
      console.error('Error submitting leave request:', error);
      alert(`Gagal mengajukan permohonan: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-12 animate-in fade-in zoom-in-95 duration-500">
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
              <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
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
        </CardContent>
      </Card>
    </div>
  );
};

export default PengajuanCuti;
