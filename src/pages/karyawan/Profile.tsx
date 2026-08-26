import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { 
  Fingerprint,
  Camera,
  Briefcase,
  UserCircle,
  Building,
  Save,
  X,
  Edit2,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfile {
  id: string;
  fullName: string;
  role: string;
  department: string;
  avatarUrl: string;
  gender: string;
  bio: string;
  tanggalLahir: string;
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editForm, setEditForm] = useState({
    fullName: '',
    avatarUrl: '',
    gender: '',
    bio: '',
    tanggalLahir: ''
  });
  
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profileRes, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        const data = profileRes;

        console.log("Data mentah dari Supabase:", data);
        
        setProfile({
          id: user.id,
          fullName: data?.full_name || 'Pengguna Tidak Diketahui',
          role: data?.role || 'Karyawan',
          department: data?.department || '-',
          avatarUrl: data?.photo_url || '',
          gender: data?.gender || '',
          bio: data?.bio || '',
          tanggalLahir: data?.tanggal_lahir || ''
        });
        
        setEditForm({
          fullName: data?.full_name || '',
          avatarUrl: data?.photo_url || '',
          gender: data?.gender || '',
          bio: data?.bio || '',
          tanggalLahir: data?.tanggal_lahir || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel edit
      setEditForm({
        fullName: profile?.fullName || '',
        avatarUrl: profile?.avatarUrl || '',
        gender: editForm.gender === "" ? null : editForm.gender,
        bio: editForm.bio === "" ? null : editForm.bio,
        tanggalLahir: editForm.tanggalLahir === "" ? null : editForm.tanggalLahir
      });
      setUploadFile(null);
    }
    setIsEditing(!isEditing);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validasi Ekstensi/Tipe File
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        alert("Format foto tidak valid. Harap unggah file JPG atau PNG.");
        return;
      }

      // Validasi Ukuran File (Maksimal 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB dalam bytes
      if (file.size > maxSize) {
        alert("Ukuran foto terlalu besar. Maksimal 2MB.");
        return;
      }

      // Kompresi Gambar Otomatis dengan Canvas
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                setUploadFile(compressedFile);
                setEditForm(prev => ({
                  ...prev,
                  avatarUrl: URL.createObjectURL(compressedFile)
                }));
              }
            }, 'image/jpeg', 0.8);
          }
        };
      };
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      let finalAvatarUrl = editForm.avatarUrl;

      // If user selected a new file to upload
      if (uploadFile) {
        const fileExt = uploadFile.name.split('.').pop();
        const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('Foto_Profil')
          .upload(filePath, uploadFile, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from('Foto_Profil')
          .getPublicUrl(filePath);

        finalAvatarUrl = data.publicUrl;
      }

      const updateData: any = {
        full_name: editForm.fullName,
        photo_url: finalAvatarUrl,
        bio: editForm.bio
      };

      if (profile.role === 'admin') {
        updateData.gender = editForm.gender;
        updateData.tanggal_lahir = editForm.tanggalLahir;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id);

      if (updateError) throw updateError;

      // Refresh profile state
      setProfile(prev => prev ? {
        ...prev,
        fullName: editForm.fullName,
        avatarUrl: finalAvatarUrl,
        gender: profile.role === 'admin' ? editForm.gender : prev.gender,
        bio: editForm.bio,
        tanggalLahir: profile.role === 'admin' ? editForm.tanggalLahir : prev.tanggalLahir
      } : null);
      
      setIsEditing(false);
      setUploadFile(null);
      alert("Profil berhasil diperbarui!");
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(`Gagal memperbarui profil: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-12 animate-in fade-in duration-500 space-y-8 mt-6">
      <Card className="shadow-lg border-slate-200 overflow-hidden max-w-3xl mx-auto w-full">
        <CardHeader className="bg-slate-50 border-b border-slate-100 px-8 py-6 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold text-slate-800">Profil Karyawan</CardTitle>
          {!loading && (
            <button
              onClick={handleEditToggle}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isEditing 
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" /> Batal
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" /> Edit
                </>
              )}
            </button>
          )}
        </CardHeader>
        <CardContent className="p-8 sm:p-10">
          {loading ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <Skeleton className="w-32 h-32 rounded-full" />
              <Skeleton className="h-8 w-64 mt-4" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-56 mt-4 rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left Column: Avatar & Name */}
              <div className="col-span-1 flex flex-col items-center space-y-6">
                <div className="relative group">
                  <div className={`w-32 h-32 rounded-full overflow-hidden border-4 border-slate-50 flex items-center justify-center shadow-md bg-slate-100 ${isEditing ? 'cursor-pointer' : ''}`}
                       onClick={() => isEditing && fileInputRef.current?.click()}
                  >
                    {editForm.avatarUrl ? (
                      <img src={editForm.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="w-20 h-20 text-slate-400" />
                    )}
                    
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                        <Camera className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/jpeg, image/jpg, image/png"
                    className="hidden" 
                  />
                </div>
                
                {isEditing && (
                  <div className="text-center mt-2">
                    <p className="text-xs text-slate-500 font-medium">Format: JPG/PNG</p>
                    <p className="text-xs text-slate-500 font-medium">Maks: 2MB</p>
                  </div>
                )}

                <div className="text-center w-full mt-2">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500 text-left block">Nama Lengkap</label>
                        <input 
                          type="text"
                          value={editForm.fullName}
                          onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                          className="w-full text-center px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Nama Lengkap"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-500 text-left block">Bio</label>
                        <textarea 
                          value={editForm.bio}
                          onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                          className="w-full text-center px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                          placeholder="Tulis sedikit tentang dirimu..."
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                        {profile?.fullName}
                      </h2>
                      <div className="mt-2">
                        <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
                          {profile?.role === 'admin' ? 'Administrator' : 'Karyawan'}
                        </Badge>
                      </div>
                      {profile?.bio && (
                        <p className="mt-4 text-sm text-slate-600 italic">
                          "{profile.bio}"
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Details */}
              <div className="col-span-1 md:col-span-2 space-y-6">
                
                {/* Personal Information */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                    Informasi Pribadi
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {/* Gender */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <UserCircle className="w-4 h-4" />
                        Jenis Kelamin
                      </div>
                      {isEditing && profile?.role === 'admin' ? (
                        <select
                          value={editForm.gender}
                          onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                          className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Pilih Jenis Kelamin</option>
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      ) : (
                        <p className="text-slate-900 font-semibold">{profile?.gender || '-'}</p>
                      )}
                    </div>

                    {/* Tanggal Lahir */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <Calendar className="w-4 h-4" />
                        Tanggal Lahir
                      </div>
                      {isEditing && profile?.role === 'admin' ? (
                        <input
                          type="date"
                          value={editForm.tanggalLahir}
                          onChange={(e) => setEditForm({...editForm, tanggalLahir: e.target.value})}
                          className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      ) : (
                        <p className="text-slate-900 font-semibold">{profile?.tanggalLahir || '-'}</p>
                      )}
                    </div>
                  </div>

                  </div>

                {/* Work Information */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
                    Informasi Pekerjaan
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Department */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <Building className="w-4 h-4" />
                        Departemen
                      </div>
                      <p className="text-slate-900 font-semibold">{profile?.department || '-'}</p>
                    </div>

                    {/* Role */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <Briefcase className="w-4 h-4" />
                        Peran Sistem
                      </div>
                      <p className="text-slate-900 font-semibold capitalize">{profile?.role || '-'}</p>
                    </div>

                    {/* User ID */}
                    <div className="space-y-1 sm:col-span-2">
                      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <Fingerprint className="w-4 h-4" />
                        ID Karyawan
                      </div>
                      <p className="text-slate-900 font-medium text-xs break-all">{profile?.id}</p>
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-8 pt-4 flex justify-end">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Simpan 
                        </>
                      )}
                    </button>
                  </div>
                )}
                
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
