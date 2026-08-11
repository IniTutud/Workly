# Workly - Backend & Database Setup Guide

Dokumen ini berisi panduan lengkap setup database, keamanan Row Level Security (RLS), Supabase Storage, serta cara integrasi ke front-end React untuk proyek **Workly HRIS**.

---

## 1. Arsitektur Database & ERD

Sistem menggunakan PostgreSQL di Supabase dengan relasi antar-tabel sebagai berikut:

* **`auth.users` $\rightarrow$ `public.profiles**` *(1-to-1)*: Setiap user terautentikasi otomatis tersinkronisasi ke tabel profil.


* **`public.profiles` $\rightarrow$ `public.attendances**` *(1-to-Many)*: Satu karyawan memiliki banyak catatan presensi.


* **`public.profiles` $\rightarrow$ `public.leaves**` *(1-to-Many)*: Satu karyawan memiliki banyak pengajuan cuti.



---

## 2. Kamus Data (Database Dictionary)

### A. Tabel `public.profiles`

Menyimpan data identitas, peran (*role*), dan departemen pengguna.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `UUID` | PK, FK $\rightarrow$ `auth.users(id)` (ON DELETE CASCADE) | ID unik terhubung ke Supabase Auth

 |
| `full_name` | `TEXT` | NOT NULL | Nama lengkap pengguna

 |
| `role` | `user_role` | ENUM ('admin', 'karyawan'), DEFAULT 'karyawan' | Peran dan hak akses dalam sistem

 |
| `department` | `TEXT` | NULLABLE | Divisi/Departemen kerja

 |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Waktu profil dibuat |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Waktu profil diperbarui |

### B. Tabel `public.attendances`

Menyimpan catatan presensi harian (*clock-in* / *clock-out*) karyawan.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | ID unik catatan presensi

 |
| `user_id` | `UUID` | FK $\rightarrow$ `public.profiles(id)` (ON DELETE CASCADE) | ID Karyawan yang melakukan presensi

 |
| `clock_in` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Waktu *clock-in*<br> |
| `clock_out` | `TIMESTAMPTZ` | NULLABLE | Waktu *clock-out*<br> |
| `photo_url` | `TEXT` | NULLABLE | URL foto selfie di Supabase Storage

 |
| `status` | `attendance_status` | ENUM ('present', 'late', 'absent'), DEFAULT 'present' | Status kehadiran karyawan

 |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Waktu data dibuat |

### C. Tabel `public.leaves`

Menyimpan permohonan cuti/izin beserta status persetujuan dari Admin HR.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | ID unik permohonan cuti

 |
| `user_id` | `UUID` | FK $\rightarrow$ `public.profiles(id)` (ON DELETE CASCADE) | ID Karyawan yang mengajukan cuti

 |
| `start_date` | `DATE` | NOT NULL | Tanggal mulai cuti

 |
| `end_date` | `DATE` | NOT NULL | Tanggal selesai cuti

 |
| `reason` | `TEXT` | NOT NULL | Alasan pengajuan cuti

 |
| `status` | `leave_status` | ENUM ('pending', 'approved', 'rejected'), DEFAULT 'pending' | Status persetujuan oleh Admin HR

 |
| `document_url` | `TEXT` | NULLABLE | URL berkas pendukung di Supabase Storage

 |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Waktu pengajuan dibuat |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Waktu status diperbarui |

---

## 3. Eksekusi SQL Migration

Jalankan skrip SQL berikut secara berurutan pada **SQL Editor** di Dashboard Supabase:

### Langkah 1: Skema Tabel & ENUM (`01_schema.sql`)

```sql
-- 1. Membuat Tipe Data ENUM
CREATE TYPE user_role AS ENUM ('admin', 'karyawan');
CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. Membuat Tabel Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'karyawan',
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Membuat Tabel Attendances
CREATE TABLE public.attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  photo_url TEXT,
  status attendance_status DEFAULT 'present',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Membuat Tabel Leaves
CREATE TABLE public.leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status leave_status DEFAULT 'pending',
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

```

### Langkah 2: Trigger Sinkronisasi User (`02_triggers.sql`)

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_role public.user_role;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Karyawan Baru');
  v_role := 'karyawan'::public.user_role;
  
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    BEGIN
      v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
    EXCEPTION WHEN OTHERS THEN
      v_role := 'karyawan'::public.user_role;
    END;
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, v_full_name, v_role);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

```

### Langkah 3: Row Level Security Policies (`03_rls_policies.sql`)

```sql
-- Helper Function Cek Role Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mengaktifkan RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- Policies Tabel Profiles
CREATE POLICY "Allow read profiles" ON public.profiles 
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Allow admin to update profiles" ON public.profiles 
  FOR UPDATE USING (public.is_admin());

-- Policies Tabel Attendances
CREATE POLICY "Allow read attendances" ON public.attendances 
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Allow insert attendances" ON public.attendances 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update attendances" ON public.attendances 
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- Policies Tabel Leaves
CREATE POLICY "Allow read leaves" ON public.leaves 
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Allow insert leaves" ON public.leaves 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow admin to update leaves" ON public.leaves 
  FOR UPDATE USING (public.is_admin());

```

---

## 4. Konfigurasi Supabase Storage

1. Buka menu **Storage** di Supabase Dashboard, buat dua *bucket* publik:


* `attendance_photos`: Menyimpan foto selfie presensi.


* `leave_documents`: Menyimpan dokumen/surat izin cuti.




2. Jalankan skrip RLS Storage berikut di **SQL Editor**:



```sql
-- Policies Bucket attendance_photos
CREATE POLICY "Allow upload attendance photos" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attendance_photos');

CREATE POLICY "Allow view attendance photos" ON storage.objects 
  FOR SELECT TO authenticated USING (bucket_id = 'attendance_photos');

-- Policies Bucket leave_documents
CREATE POLICY "Allow upload leave docs" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'leave_documents');

CREATE POLICY "Allow view leave docs" ON storage.objects 
  FOR SELECT TO authenticated USING (bucket_id = 'leave_documents');

```

---

## 5. Environment Variables (`.env.example`)

Salin file `.env.example` menjadi `.env.local` pada project React/Next.js:

```env
# Jika menggunakan Vite (React):
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Jika menggunakan Next.js:
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

```

---

## 6. Panduan Integrasi React

### A. Inisialisasi Client Supabase (`src/utils/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

```

### B. Contoh Pengambilan Data Profil (`src/App.tsx`)

```tsx
import { useEffect, useState } from 'react'
import { supabase } from './utils/supabase'

export default function App() {
  const [profiles, setProfiles] = useState<any[]>([])

  useEffect(() => {
    async function fetchProfiles() {
      const { data, error } = await supabase.from('profiles').select('*')
      if (error) console.error(error.message)
      else if (data) setProfiles(data)
    }
    fetchProfiles()
  }, [])

  return (
    <div>
      <h2>Daftar Karyawan Workly</h2>
      <ul>
        {profiles.map((p) => (
          <li key={p.id}>{p.full_name} ({p.role}) - Divisi: {p.department || '-'}</li>
        ))}
      </ul>
    </div>
  )
}

```