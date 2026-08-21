import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { 
  IdCard, 
  Fingerprint
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfile {
  id: string;
  fullName: string;
  role: string;
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profileRes, error: profileError } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single();

          if (profileError) throw profileError;

          const data = profileRes;
          const nameToDisplay = data?.full_name || data?.role || 'Pengguna Tidak Diketahui';

          setProfile({
            id: user.id,
            fullName: nameToDisplay,
            role: data?.role || 'Karyawan',
          });
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
    </div>
  );
};

export default Profile;
