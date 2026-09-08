import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { Wallet, X, CheckCircle2, Clock, History } from 'lucide-react';

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
  const [payrollHistory, setPayrollHistory] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<Payroll | null>(null);

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
    const currentMonth = new Date().getMonth() + 1; 
    const currentYear = new Date().getFullYear();
    
    try {
      setLoading(true);
      
      // Fetch all payrolls for history
      const { data, error } = await supabase
        .from('payrolls')
        .select('*')
        .eq('user_id', userId)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
        
      if (error) {
        console.error('Error fetching payroll:', error);
      }
      
      if (data && data.length > 0) {
        setPayrollHistory(data);
        
        // Find current month's payroll
        const current = data.find(p => p.period_month === currentMonth && p.period_year === currentYear);
        if (current) {
          setPayroll(current);
        }
      }
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

  // Helper to open modal for specific payroll
  const openDetailModal = (item: Payroll) => {
    setSelectedHistory(item);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="w-full bg-white/60 backdrop-blur-xl border border-white/80 p-6 rounded-3xl shadow-xl shadow-slate-200/50 mt-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-slate-200 rounded w-1/2 mb-4"></div>
        <div className="h-40 bg-slate-200 rounded w-full"></div>
      </div>
    );
  }

  const modalData = selectedHistory || payroll;

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

      {/* Widget Ringkasan Gaji Bulan Ini */}
      {payroll ? (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-left transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-[#14b8a6]/10 rounded-xl text-[#14b8a6]">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">
              Periode {getMonthName(payroll.period_month)} {payroll.period_year}
            </h3>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
            <div>
              <p className="text-sm text-slate-500 font-semibold mb-2 uppercase tracking-wider">Net Salary (Gaji Bersih)</p>
              <p className="text-4xl font-extrabold text-[#0f766e] tracking-tight">
                {formatRupiah(payroll.net_salary)}
              </p>
            </div>
            <button 
              onClick={() => openDetailModal(payroll)}
              className="px-8 py-3 bg-[#1e3a8a] hover:bg-[#111827] text-white font-semibold rounded-xl shadow-lg shadow-[#1e3a8a]/20 transition-all hover:-translate-y-0.5"
            >
              Lihat Detail Slip
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-left">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#1e3a8a]/10 rounded-lg text-[#14b8a6]">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Gaji Bulan Ini</h3>
          </div>
          <p className="text-slate-500 text-sm mt-2">Data slip gaji bulan ini belum tersedia.</p>
        </div>
      )}

      {/* Tabel Riwayat Gaji (Salary History) */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <History className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Riwayat Penggajian</h3>
        </div>
        
        <div className="overflow-x-auto">
          {payrollHistory.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-white">
                  <th className="p-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Periode</th>
                  <th className="p-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Gaji Pokok</th>
                  <th className="p-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Gaji Bersih</th>
                  <th className="p-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-sm font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrollHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm font-bold text-slate-800">
                      {getMonthName(item.period_month)} {item.period_year}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {formatRupiah(item.basic_salary)}
                    </td>
                    <td className="p-4 text-sm font-extrabold text-[#14b8a6]">
                      {formatRupiah(item.net_salary)}
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        item.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.status === 'paid' ? 'Sudah Dibayar' : 'Menunggu'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-right">
                      <button 
                        onClick={() => openDetailModal(item)}
                        className="text-[#14b8a6] hover:text-[#0f766e] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#14b8a6]/10 transition-colors"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500 font-medium">Belum ada riwayat penggajian.</div>
          )}
        </div>
      </div>

      {/* Modal Detail Gaji */}
      {showModal && modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Detail Slip Gaji</h2>
                <p className="text-sm font-medium text-slate-500 mt-1">Periode {getMonthName(modalData.period_month)} {modalData.period_year}</p>
              </div>
              <button 
                onClick={() => { setShowModal(false); setSelectedHistory(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rincian */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-600 font-medium">Gaji Pokok (Basic Salary)</span>
                <span className="text-slate-800 font-bold">{formatRupiah(modalData.basic_salary)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-slate-100">
                <span className="text-slate-600 font-medium">Tunjangan (Allowance)</span>
                <span className="text-green-600 font-bold">+ {formatRupiah(modalData.allowance)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-slate-100">
                <span className="text-slate-600 font-medium">Potongan (Deduction)</span>
                <span className="text-red-600 font-bold">- {formatRupiah(modalData.deduction)}</span>
              </div>
            </div>

            {/* Bagian Total & Status */}
            <div className="bg-slate-50 p-6 border-t border-slate-100">
              <div className="flex justify-between items-center mb-5">
                <span className="text-slate-800 font-bold text-lg">Total Diterima (Net)</span>
                <span className="text-[#0f766e] font-extrabold text-2xl">{formatRupiah(modalData.net_salary)}</span>
              </div>
              
              <div className="flex items-center justify-between bg-white px-4 py-3.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                  {modalData.status === 'paid' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-500" />
                  )}
                  <span className={`font-bold text-sm ${modalData.status === 'paid' ? 'text-green-700' : 'text-amber-700'}`}>
                    {modalData.status === 'paid' ? 'Sudah Dibayar' : 'Menunggu Pembayaran'}
                  </span>
                </div>
                {modalData.status === 'paid' && modalData.paid_at && (
                  <span className="text-xs font-bold text-slate-500">
                    {formatDate(modalData.paid_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-white">
              <button 
                onClick={() => { setShowModal(false); setSelectedHistory(null); }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
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
