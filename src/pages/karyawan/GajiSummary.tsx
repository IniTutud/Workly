import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { Wallet, X, CheckCircle2, Clock } from 'lucide-react';

interface Payroll {
  id: number;
  user_id: string;
  period_month: number;
  period_year: number;
  basic_salary: number;
  allowance: number;
  deduction: number;
  net_salary: number;
  status: string;
  paid_at: string;
}

export default function GajiSummary() {
  const [userId, setUserId] = useState<string | null>(null);
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchUserAndPayroll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        setLoading(false);
      }
    };
    fetchUserAndPayroll();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchPayroll();
    }
  }, [userId]);

  const fetchPayroll = async () => {
    // Ambil bulan dan tahun saat ini
    const currentMonth = new Date().getMonth() + 1; // getMonth() mulai dari 0
    const currentYear = new Date().getFullYear();
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payrolls')
        .select('*')
        .eq('user_id', userId)
        .eq('period_month', currentMonth)
        .eq('period_year', currentYear)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        // PGRST116 adalah error code jika data tidak ditemukan (no rows return dari single())
        console.error('Error fetching payroll:', error);
      }
      
      setPayroll(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: 'IDR', 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(angka || 0);
  };
  
  const getMonthName = (month: number) => {
     return new Date(2000, month - 1, 1).toLocaleString('id-ID', { month: 'long' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="w-full bg-white/60 backdrop-blur-xl border border-white/80 p-6 rounded-3xl shadow-xl shadow-slate-200/50 mt-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-slate-200 rounded w-1/2 mb-4"></div>
        <div className="h-10 bg-slate-200 rounded w-full"></div>
      </div>
    );
  }

  // Jika belum ada data gaji bulan ini
  if (!payroll) {
    return (
      <div className="w-full bg-white/60 backdrop-blur-xl border border-white/80 p-6 rounded-3xl shadow-xl shadow-slate-200/50 mt-6 text-left transform hover:scale-[1.02] transition-transform duration-500">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <Wallet className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Gaji Bulan Ini</h3>
        </div>
        <p className="text-slate-500 text-sm mt-2">Data slip gaji bulan ini belum tersedia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Slip Gaji Karyawan
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Lihat ringkasan dan rincian gaji Anda untuk bulan ini
            </p>
          </div>
        </div>
      </div>

      {/* Widget Ringkasan Gaji */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-left transition-all duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
            <Wallet className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">
            Periode {getMonthName(payroll.period_month)} {payroll.period_year}
          </h3>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
          <div>
            <p className="text-sm text-slate-500 font-semibold mb-2 uppercase tracking-wider">Net Salary (Gaji Bersih)</p>
            <p className="text-4xl font-extrabold text-blue-700 tracking-tight">
              {formatRupiah(payroll.net_salary)}
            </p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5"
          >
            Lihat Detail Slip
          </button>
        </div>
      </div>

      {/* Modal Detail Gaji */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Detail Penggajian</h2>
                <p className="text-sm text-slate-500">Periode {getMonthName(payroll.period_month)} {payroll.period_year}</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rincian */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-600 font-medium">Basic Salary</span>
                <span className="text-slate-800 font-semibold">{formatRupiah(payroll.basic_salary)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-slate-100">
                <span className="text-slate-600 font-medium">Allowance</span>
                <span className="text-green-600 font-bold">+ {formatRupiah(payroll.allowance)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-slate-100">
                <span className="text-slate-600 font-medium">Deduction</span>
                <span className="text-red-600 font-bold">- {formatRupiah(payroll.deduction)}</span>
              </div>
            </div>

            {/* Bagian Total & Status */}
            <div className="bg-slate-50 p-6 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-800 font-bold text-lg">Net Salary</span>
                <span className="text-blue-700 font-extrabold text-2xl">{formatRupiah(payroll.net_salary)}</span>
              </div>
              
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  {payroll.status === 'Paid' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-500" />
                  )}
                  <span className={`font-semibold text-sm ${payroll.status === 'Paid' ? 'text-green-700' : 'text-amber-700'}`}>
                    {payroll.status === 'Paid' ? 'Sudah Dibayar' : 'Menunggu Pembayaran'}
                  </span>
                </div>
                {payroll.status === 'Paid' && payroll.paid_at && (
                  <span className="text-xs font-medium text-slate-500">
                    {formatDate(payroll.paid_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100">
              <button 
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
