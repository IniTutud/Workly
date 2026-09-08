import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Bersihkan session lama sebelum login mencegah bug sesi nyangkut
      await supabase.auth.signOut();

      // 2. Sign in menggunakan .trim() agar kebal spasi
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        throw new Error('Email atau password salah.');
      }

      const userId = authData.user?.id;
      if (!userId) {
        throw new Error('Gagal mendapatkan data user.');
      }

      // 3. Cek Role di tabel profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        await supabase.auth.signOut();
        throw new Error('Gagal mengambil role user.');
      }

      const role = profileData.role;

      // 4. Redirect berdasarkan Role dengan opsi replace: true (mencegah bug tombol Back)
      if (role === 'admin') {
        navigate('/dashboard');
      } else if (role === 'karyawan') {
        navigate('/karyawan/dashboard', { replace: true });
      } else {
        await supabase.auth.signOut();
        throw new Error('Role tidak valid.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background Decorative Blur Spheres */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#1e3a8a]/10 blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#14b8a6]/15 blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-3/4 -translate-y-1/2 w-64 h-64 rounded-full bg-[#ffbf00]/10 blur-3xl pointer-events-none"></div>

      {/* Card Container */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden relative z-10">
        {/* Top Decorative Line with Brand Gradient */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#1e3a8a] via-[#14b8a6] to-[#ffbf00]"></div>
        
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-tr from-[#1e3a8a] to-[#14b8a6] rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-[#14b8a6]/30">
              W
            </div>
            <h1 className="text-2xl font-bold text-[#111827] tracking-tight">Login ke Workly</h1>
            <p className="text-sm text-slate-500 mt-2">Masukkan email dan password Anda untuk masuk</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-600 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-[#111827] block">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#14b8a6]/25 focus:border-[#14b8a6] transition-all placeholder:text-slate-400"
                placeholder="nama@email.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-[#111827] block">
                  Password
                </label>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#14b8a6]/25 focus:border-[#14b8a6] transition-all placeholder:text-slate-400"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1e3a8a] hover:bg-[#111827] disabled:bg-slate-400 text-white font-semibold rounded-xl shadow-lg shadow-[#1e3a8a]/20 hover:shadow-[#111827]/25 transition-all active:scale-[0.98] mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Masuk</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}