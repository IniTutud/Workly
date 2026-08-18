import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import Profile from './Profile';
import Presensi from './Presensi';
import PengajuanCuti from './PengajuanCuti';
import { 
  User, 
  Clock, 
  LogOut, 
  CalendarDays, 
  Menu,
  X,
  Bell,
  ChevronRight
} from 'lucide-react';

const EmployeeDashboard: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  
  // State baru untuk menyimpan data profil dari database
  const [profile, setProfile] = useState<{ nama: string; role: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const navigate = useNavigate();

  // Fungsi untuk mengambil data user yang sedang login
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // 1. Dapatkan info user auth yang sedang aktif
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // 2. Ambil data profilnya dari tabel 'profiles'
          const { data, error } = await supabase
            .from('profiles')
            .select('full_name, role') // Sesuaikan nama kolom ini dengan buatan Fadhil
            .eq('id', user.id)
            .single();

          if (error) throw error;
          
          if (data) {
            setProfile({ nama: data.full_name, role: data.role });
          }
        } else {
          // Jika tidak ada session, lempar ke login
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const menuItems = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'presensi', label: 'Presensi', icon: Clock },
    { id: 'leave', label: 'Pengajuan Cuti', icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 shadow-sm z-10 transition-all duration-300">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
            W
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 tracking-tight">
            Workly
          </h1>
        </div>
        
        <div className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
          <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Menu Utama</p>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                activeMenu === item.id 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-md transition-transform origin-left ${activeMenu === item.id ? 'scale-y-100' : 'transform scale-y-0 group-hover:scale-y-100'}`}></div>
              <item.icon className={`w-5 h-5 transition-colors ${activeMenu === item.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'}`} />
              <span className={`font-medium ${activeMenu === item.id ? 'text-blue-700' : ''}`}>{item.label}</span>
              <ChevronRight className={`w-4 h-4 ml-auto transition-all ${activeMenu === item.id ? 'opacity-100 text-blue-600 translate-x-0' : 'opacity-0 group-hover:opacity-100 text-blue-500 transform -translate-x-2 group-hover:translate-x-0'}`} />
            </button>
          ))}
        </div>

        <div className="p-6 border-t border-slate-100 flex flex-col gap-4">
          {/* BAGIAN PROFIL YANG SUDAH DINAMIS */}
          <div className="flex items-center gap-4">
            {loadingProfile ? (
              <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse"></div>
            ) : (
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.nama || 'User')}&background=eff6ff&color=1d4ed8`} 
                alt="User profile" 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
              />
            )}
            
            <div className="flex-1 min-w-0">
              {loadingProfile ? (
                <>
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-24 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded animate-pulse w-16"></div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {profile?.nama || 'Karyawan'}
                  </p>
                  <p className="text-xs text-slate-500 truncate capitalize">
                    {profile?.role || 'Staff'}
                  </p>
                </>
              )}
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-colors text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header (Sama seperti aslinya) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
            W
          </div>
          <h1 className="text-xl font-bold text-slate-800">Workly</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div 
            className="absolute right-0 top-16 bottom-0 w-64 bg-white shadow-xl animate-in slide-in-from-right-full duration-300 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="flex-1 py-6 px-4 space-y-2">
              {/* Profil di Mobile Menu */}
              <div className="px-4 pb-4 mb-4 border-b border-slate-100 flex items-center gap-3">
                <img 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.nama || 'User')}&background=eff6ff&color=1d4ed8`} 
                  alt="User profile" 
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{profile?.nama || 'Karyawan'}</p>
                  <p className="text-xs text-slate-500 capitalize">{profile?.role || 'Staff'}</p>
                </div>
              </div>

              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveMenu(item.id); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                    activeMenu === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${activeMenu === item.id ? 'text-blue-600' : ''}`} />
                  <span className={`font-medium ${activeMenu === item.id ? 'text-blue-700' : ''}`}>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors font-semibold"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area (Sama seperti aslinya) */}
      <main className="flex-1 flex flex-col h-screen relative overflow-hidden bg-slate-50 pt-16 md:pt-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

        <header className="hidden md:flex h-20 items-center justify-end px-8 z-10 relative">
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-slate-50"></span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <p className="text-sm font-medium text-slate-500">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </header>

        <div className={`flex-1 flex w-full z-10 ${(activeMenu === 'profile' || activeMenu === 'presensi' || activeMenu === 'leave') ? 'flex-col overflow-y-auto pb-24 p-6' : 'items-center justify-center p-6'}`}>
          {activeMenu === 'profile' ? (
            <Profile />
          ) : activeMenu === 'presensi' ? (
            <Presensi />
          ) : activeMenu === 'leave' ? (
            <PengajuanCuti />
          ) : (
            <div className="max-w-2xl w-full">
              <div className="bg-white/60 backdrop-blur-xl border border-white/80 p-12 rounded-3xl shadow-xl shadow-slate-200/50 text-center transform hover:scale-[1.02] transition-transform duration-500 group">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-50 rounded-2xl mx-auto mb-8 flex items-center justify-center group-hover:rotate-12 transition-transform duration-500 shadow-inner">
                  <User className="w-12 h-12 text-blue-600" />
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">
                  Selamat Datang, {profile?.nama ? profile.nama.split(' ')[0] : 'Karyawan'}!
                </h2>
                <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                  Pilih menu di samping untuk memulai aktivitas Anda hari ini. Kelola presensi dan pengajuan cuti Anda dengan mudah.
                </p>
                
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <button 
                    onClick={() => setActiveMenu('presensi')}
                    className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                  >
                    <Clock className="w-5 h-5" />
                    Clock In Sekarang
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;