import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock, LogOut, CheckCircle, FileText, RefreshCw, Camera } from 'lucide-react';

interface Attendance {
  id: string | number;
  date: string;
  clockIn: string;
  clockOut: string;
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

const Presensi: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusAbsen, setStatusAbsen] = useState<'belum' | 'sudah_masuk' | 'selesai'>('belum');
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // State khusus Kamera Real-time
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user"); // "user" = depan, "environment" = belakang

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Jalankan kamera saat halaman dibuka atau saat facingMode diganti (jika belum selesai absen)
  useEffect(() => {
    if (statusAbsen !== 'selesai') {
      startCamera(facingMode);
    }
    return () => {
      stopCamera();
    };
  }, [facingMode, statusAbsen]);

  const startCamera = async (mode: "user" | "environment") => {
    stopCamera();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Gagal mengakses kamera:", err);
      alert("Pastikan izin akses kamera diizinkan di browser/perangkat Anda.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Ambil foto secara real-time dari video stream ke canvas
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    context.save(); // Simpan state canvas awal

    // Jika sedang pakai kamera depan, balikkan secara horizontal saat dicapture 
    // supaya hasil file fotonya tidak ikut mirror/terbalik
    if (facingMode === 'user') {
      context.scale(-1, 1);
      context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    } else {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    context.restore(); // Kembalikan state canvas

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: "image/jpeg" });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
      }
    }, "image/jpeg", 0.85);
  };

  const retakePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // Check attendance status today & history
  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('attendances')
          .select('id, clock_out')
          .eq('user_id', user.id)
          .gte('clock_in', startOfDay.toISOString())
          .order('clock_in', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const attendance = data[0];
          if (!attendance.clock_out) {
            setStatusAbsen('sudah_masuk');
            setAttendanceId(attendance.id);
          } else {
            setStatusAbsen('selesai');
          }
        } else {
          setStatusAbsen('belum');
        }
      } catch (error) {
        console.error('Error fetching attendance status:', error);
      }
    };

    fetchAttendanceStatus();
    fetchAttendanceHistory();
  }, []);

  const fetchAttendanceHistory = async () => {
    try {
      setLoadingHistory(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('attendances')
        .select('*')
        .eq('user_id', user.id)
        .order('clock_in', { ascending: false });

      if (error) throw error;

      const mappedAttendances: Attendance[] = (data || []).map((att: any) => ({
        id: att.id,
        date: formatDate(att.date || att.clock_in),
        clockIn: formatTime(att.clock_in),
        clockOut: formatTime(att.clock_out),
        status: att.status || 'present'
      }));
      setAttendanceHistory(mappedAttendances);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `presensi/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('attendance_photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('attendance_photos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Gagal mengunggah foto. Pastikan bucket "attendance_photos" ada di Supabase storage dan public.');
      return null;
    }
  };

  const handleClockIn = async () => {
    if (!selectedFile) return;
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Pengguna belum login");

      const photoUrl = await uploadPhoto(selectedFile);
      if (!photoUrl) throw new Error("Gagal mendapatkan URL foto");

      const now = new Date();
      
      const limitHour = 9;
      const limitMinute = 0;

      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      const isLate = 
        currentHour > limitHour || 
        (currentHour === limitHour && currentMinute > limitMinute);
      
      const attendanceStatus = isLate ? 'late' : 'present';
      // ----------------------------------------

      const { data, error } = await supabase
        .from('attendances')
        .insert({
          user_id: user.id,
          clock_in: now.toISOString(),
          photo_url: photoUrl,
          status: attendanceStatus
        })
        .select()
        .single();

      if (error) throw error;

      setAttendanceId(data.id);
      setStatusAbsen('sudah_masuk');
      
      // Berikan informasi notifikasi yang jelas ke user
      if (isLate) {
        alert('Clock In berhasil, namun Anda tercatat TERLAMBAT.');
      } else {
        alert('Berhasil Clock In (Tepat Waktu)!');
      }

      setSelectedFile(null);
      setPreviewUrl(null);
      fetchAttendanceHistory();

    } catch (error: any) {
      console.error('Error Clock In:', error);
      alert(`Clock In gagal: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!selectedFile || !attendanceId) return;
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Pengguna belum login");

      const photoUrl = await uploadPhoto(selectedFile);
      // Opsional kalau mau simpan foto clock out juga, atau langsung update clock_out saja:
      const { error: updateError } = await supabase
        .from('attendances')
        .update({
          clock_out: new Date().toISOString(),
        })
        .eq('id', attendanceId);

      if (updateError) throw updateError;

      alert('Berhasil Clock Out!');
      setStatusAbsen('selesai');
      setSelectedFile(null);
      setPreviewUrl(null);
      fetchAttendanceHistory();

    } catch (error: any) {
      console.error('Error Clock Out:', error);
      alert(`Clock Out gagal: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="w-full max-w-xl mx-auto pb-12 animate-in fade-in zoom-in-95 duration-500">
      <Card className="shadow-2xl border-slate-200 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <CardHeader className="text-center bg-white border-b border-slate-100 pb-8 pt-8 relative z-10">
          <CardTitle className="text-3xl font-extrabold text-slate-800 mb-2 tracking-tight">
            Presensi Digital
          </CardTitle>
          <CardDescription className="text-slate-500 text-base font-medium">
            Ambil swafoto langsung dari kamera untuk Clock In / Out
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-8 flex flex-col items-center space-y-8 bg-slate-50/50 relative z-10">
          
          {/* DIGITAL CLOCK */}
          <div className="text-center space-y-2 bg-white px-8 py-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-5xl font-mono font-black text-blue-600 tracking-wider">
              {formattedTime}
            </div>
            <div className="text-sm text-slate-500 font-semibold uppercase tracking-widest">
              {formattedDate}
            </div>
          </div>

          {statusAbsen === 'selesai' ? (
            <div className="w-full max-w-sm flex flex-col items-center justify-center space-y-4 py-12">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-800">Absensi Selesai</h3>
                <p className="text-slate-500 mt-2 font-medium">Anda sudah menyelesaikan absensi hari ini.</p>
              </div>
            </div>
          ) : (
            <>
              {/* REAL-TIME CAMERA / PREVIEW CONTAINER */}
              <div className="w-full max-w-sm flex flex-col items-center space-y-4">
                <div className="w-full aspect-[3/4] rounded-2xl border-2 border-slate-300 bg-slate-900 overflow-hidden relative shadow-md flex items-center justify-center">
                  
                  {!previewUrl ? (
                    <>
                      {/* Live Video Stream */}
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }}
                        className="w-full h-full object-cover"
                      />
                      {/* Tombol Switch Kamera (Depan / Belakang) */}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white border-none rounded-full px-3 py-1 text-xs backdrop-blur-md flex items-center gap-1.5"
                        onClick={toggleCamera}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Ganti Kamera
                      </Button>
                    </>
                  ) : (
                    /* Hasil Tangkapan Foto (Preview) */
                    <img 
                      src={previewUrl} 
                      alt="Preview Selfie" 
                      className="w-full h-full object-cover animate-in fade-in"
                    />
                  )}
                </div>

                {/* Canvas tersembunyi untuk mengambil gambar dari video */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Tombol Ambil Foto / Foto Ulang */}
                {!previewUrl ? (
                  <Button 
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-6 text-base rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    onClick={capturePhoto}
                  >
                    <Camera className="w-5 h-5" />
                    Ambil Foto
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    className="w-full hover:bg-slate-100 font-semibold py-6 text-base rounded-xl transition-all"
                    onClick={retakePhoto}
                  >
                    Ulangi Foto
                  </Button>
                )}
              </div>

              {/* ACTION BUTTONS (Clock In / Clock Out) */}
              <div className="w-full max-w-sm pt-6 border-t border-slate-200">
                {statusAbsen === 'belum' && (
                  <Button 
                    className="w-full py-6 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    disabled={!selectedFile || isLoading}
                    onClick={handleClockIn}
                  >
                    {isLoading ? (
                      <span className="animate-pulse">Memproses...</span>
                    ) : (
                      <>
                        <Clock className="w-5 h-5 mr-2" />
                        Clock In
                      </>
                    )}
                  </Button>
                )}
                
                {statusAbsen === 'sudah_masuk' && (
                  <Button 
                    variant="destructive"
                    className="w-full py-6 text-lg font-bold rounded-xl shadow-lg shadow-rose-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    disabled={!selectedFile || isLoading}
                    onClick={handleClockOut}
                  >
                    {isLoading ? (
                      <span className="animate-pulse">Memproses...</span>
                    ) : (
                      <>
                        <LogOut className="w-5 h-5 mr-2" />
                        Clock Out
                      </>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}

          {/* RIWAYAT ABSENSI */}
          <div className="w-full pt-8 border-t border-slate-200 mt-8">
            <div className="flex items-center gap-2 mb-4 text-slate-800">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold">Riwayat Absensi</h3>
            </div>
            
            <div className="rounded-md border border-slate-200 overflow-hidden bg-white w-full">
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
                  {loadingHistory ? (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Presensi; // Sesuaikan dengan format export yang dipakai project lu (bisa export default Presensi)