# Workly - Backend & Database Setup Guide

Dokumen ini berisi panduan lengkap setup database, keamanan Row Level Security (RLS), Supabase Storage, serta cara integrasi ke front-end React untuk proyek **Workly HRIS**.

---

## 1. Arsitektur Database & ERD

Sistem menggunakan PostgreSQL di Supabase dengan relasi antar-tabel sebagai berikut:

```
auth.users ──────────> public.profiles (1-to-1)
                              │
                              ├──> public.attendances (1-to-Many)
                              ├──> public.leaves (1-to-Many)
                              ├──> public.employee_schedules (1-to-Many)
                              ├──> public.shift_swap_requests (1-to-Many as requester)
                              ├──> public.shift_swap_requests (1-to-Many as target)
                              ├──> public.tasks (1-to-Many as assigned_to)
                              ├──> public.tasks (1-to-Many as created_by)
                              ├──> public.task_submissions (1-to-Many)
                              └──> public.payrolls (1-to-Many)
```

---

## 2. Kamus Data (Database Dictionary)

### ENUM Types

| Nama ENUM | Values | Keterangan |
| --- | --- | --- |
| `user_role` | `admin`, `karyawan` | Peran pengguna |
| `attendance_status` | `present`, `late`, `absent` | Status kehadiran |
| `leave_status` | `pending`, `approved`, `rejected` | Status pengajuan cuti |
| `tasks_status` | `assigned`, `waiting_review`, `revision`, `approved` | Status tugas |
| `tasks_submission_status` | `submitted`, `approved`, `revision` | Status submission tugas |

> **Catatan:** Kolom `employee_schedules.status`, `shift_swap_requests.status`, dan `payrolls.status` menggunakan tipe data `text` dengan CHECK constraint, bukan ENUM.

---

### A. Tabel `public.profiles`

Menyimpan data identitas, peran (*role*), dan informasi pengguna.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `UUID` | PK, FK $\rightarrow$ `auth.users(id)` | ID unik terhubung ke Supabase Auth |
| `full_name` | `TEXT` | NOT NULL | Nama lengkap pengguna |
| `role` | `user_role` | NOT NULL, DEFAULT `'karyawan'` | Peran dan hak akses |
| `department` | `TEXT` | NULLABLE | Divisi/Departemen kerja |
| `jabatan` | `TEXT` | NULLABLE | Jabatan/Posisi |
| `gender` | `TEXT` | NULLABLE | Jenis kelamin |
| `tanggal_lahir` | `DATE` | NULLABLE | Tanggal lahir |
| `bio` | `TEXT` | NULLABLE | Biografi singkat |
| `photo_url` | `TEXT` | NULLABLE | URL foto profil |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Waktu profil dibuat |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Waktu profil diperbarui |

---

### B. Tabel `public.attendances`

Menyimpan catatan presensi harian (*clock-in* / *clock-out*) karyawan.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | ID unik catatan presensi |
| `user_id` | `UUID` | FK $\rightarrow$ `public.profiles(id)` | ID Karyawan |
| `clock_in` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Waktu *clock-in* |
| `clock_out` | `TIMESTAMPTZ` | NULLABLE | Waktu *clock-out* |
| `photo_url` | `TEXT` | NULLABLE | URL foto selfie |
| `status` | `attendance_status` | DEFAULT `'present'` | Status kehadiran |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Waktu data dibuat |

---

### C. Tabel `public.leaves`

Menyimpan permohonan cuti/izin beserta status persetujuan.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | ID unik permohonan cuti |
| `user_id` | `UUID` | FK $\rightarrow$ `public.profiles(id)` | ID Karyawan |
| `start_date` | `DATE` | NOT NULL | Tanggal mulai cuti |
| `end_date` | `DATE` | NOT NULL | Tanggal selesai cuti |
| `reason` | `TEXT` | NOT NULL | Alasan pengajuan cuti |
| `status` | `leave_status` | DEFAULT `'pending'` | Status persetujuan |
| `document_url` | `TEXT` | NULLABLE | URL berkas pendukung |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Waktu pengajuan dibuat |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT `NOW()` | Waktu status diperbarui |

---

### D. Tabel `public.employee_schedules`

Menyimpan jadwal kerja karyawan per hari.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `BIGINT` | PK, GENERATED ALWAYS AS IDENTITY | ID unik |
| `user_id` | `UUID` | FK $\rightarrow$ `public.profiles(id)` | ID Karyawan |
| `date` | `DATE` | NULLABLE | Tanggal jadwal |
| `status` | `TEXT` | NOT NULL | Status: `working`, `off`, `leave` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Waktu data dibuat |

> **UNIQUE Constraint:** `UNIQUE(user_id, date)` - Dibutuhkan untuk upsert dari frontend

---

### E. Tabel `public.shift_swap_requests`

Menyimpan pengajuan pertukaran shift antar karyawan.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `BIGINT` | PK, GENERATED ALWAYS AS IDENTITY | ID unik |
| `requester_id` | `UUID` | FK $\rightarrow$ `public.profiles(id)` | ID Karyawan Pengaju |
| `target_user_id` | `UUID` | FK $\rightarrow$ `public.profiles(id)` | ID Karyawan Target |
| `date_from` | `DATE` | NULLABLE | Tanggal jadwal yang diserahkan |
| `date_to` | `DATE` | NULLABLE | Tanggal jadwal yang diambil |
| `reason` | `TEXT` | NULLABLE | Alasan pertukaran |
| `status` | `TEXT` | NULLABLE | Status pengajuan (lihat flow) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Waktu pengajuan dibuat |

**Status Flow:**
```
pending_employee_approval → pending_admin_approval → approved
                          → rejected_by_employee
                                                       → rejected_by_admin
```

---

### F. Tabel `public.payrolls`

Menyimpan data penggajian karyawan per periode.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `BIGINT` | PK, GENERATED ALWAYS AS IDENTITY | ID unik |
| `user_id` | `UUID` | NOT NULL, FK $\rightarrow$ `public.profiles(id)` | ID Karyawan |
| `period_month` | `SMALLINT` | NOT NULL, CHECK (1-12) | Bulan periode |
| `period_year` | `SMALLINT` | NOT NULL, CHECK (>=2000) | Tahun periode |
| `basic_salary` | `NUMERIC` | NOT NULL, DEFAULT `0` | Gaji pokok |
| `allowance` | `NUMERIC` | NOT NULL, DEFAULT `0` | Tunjangan |
| `deduction` | `NUMERIC` | NOT NULL, DEFAULT `0` | Potongan |
| `net_salary` | `NUMERIC` | NOT NULL, DEFAULT `0` | Gaji bersih |
| `status` | `TEXT` | NOT NULL, DEFAULT `'pending'` | Status: `pending`, `paid`, `cancelled` |
| `paid_at` | `TIMESTAMPTZ` | NULLABLE | Waktu pembayaran |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Waktu data dibuat |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Waktu data diperbarui |

> **UNIQUE Constraint:** `UNIQUE(user_id, period_month, period_year)` - Dibutuhkan untuk upsert dari frontend

---

### G. Tabel `public.tasks`

Menyimpan data tugas yang diberikan admin kepada karyawan.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | ID unik tugas |
| `title` | `TEXT` | NOT NULL | Judul tugas |
| `description` | `TEXT` | NULLABLE | Deskripsi tugas |
| `assigned_to` | `UUID` | NOT NULL, FK $\rightarrow$ `public.profiles(id)` | ID Karyawan yang ditugaskan |
| `created_by` | `UUID` | NOT NULL, FK $\rightarrow$ `public.profiles(id)` | ID Admin yang membuat |
| `start_date` | `DATE` | NOT NULL | Tanggal mulai |
| `due_date` | `DATE` | NOT NULL | Tenggat waktu |
| `status` | `tasks_status` | NOT NULL, DEFAULT `'assigned'` | Status tugas |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Waktu dibuat |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Waktu diperbarui |

---

### H. Tabel `public.task_submissions`

Menyimpan submission/bukti penyelesaian tugas dari karyawan.

| Nama Kolom | Tipe Data | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | ID unik submission |
| `task_id` | `UUID` | NOT NULL, FK $\rightarrow$ `public.tasks(id)` | ID Tugas |
| `submitted_by` | `UUID` | NOT NULL, FK $\rightarrow$ `public.profiles(id)` | ID Karyawan |
| `submission_note` | `TEXT` | NULLABLE | Catatan submission |
| `file_url` | `TEXT` | NULLABLE | URL file bukti |
| `submitted_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `NOW()` | Waktu submission |
| `reviewed_by` | `UUID` | NULLABLE, FK $\rightarrow$ `public.profiles(id)` | ID Admin reviewer |
| `reviewed_at` | `TIMESTAMPTZ` | NULLABLE | Waktu review |
| `review_comment` | `TEXT` | NULLABLE | Komentar review |
| `status` | `tasks_submission_status` | NOT NULL, DEFAULT `'submitted'` | Status submission |

---

## 3. Eksekusi SQL Migration

### Langkah 1: Skema Tabel & ENUM (`01_schema.sql`)

```sql
-- 1. Membuat Tipe Data ENUM
CREATE TYPE user_role AS ENUM ('admin', 'karyawan');
CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE tasks_status AS ENUM ('assigned', 'waiting_review', 'revision', 'approved');
CREATE TYPE tasks_submission_status AS ENUM ('submitted', 'approved', 'revision');

-- 2. Membuat Tabel Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'karyawan',
  department TEXT,
  jabatan TEXT,
  gender TEXT,
  tanggal_lahir DATE,
  bio TEXT,
  photo_url TEXT,
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

-- 5. Membuat Tabel Employee Schedules
CREATE TABLE public.employee_schedules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  date DATE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT employee_schedules_user_id_date_unique UNIQUE (user_id, date)
);

-- 6. Membuat Tabel Shift Swap Requests
CREATE TABLE public.shift_swap_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  requester_id UUID REFERENCES public.profiles(id),
  target_user_id UUID REFERENCES public.profiles(id),
  date_from DATE,
  date_to DATE,
  reason TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Membuat Tabel Payrolls
CREATE TABLE public.payrolls (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  period_month SMALLINT NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_year SMALLINT NOT NULL CHECK (period_year >= 2000),
  basic_salary NUMERIC NOT NULL DEFAULT 0,
  allowance NUMERIC NOT NULL DEFAULT 0,
  deduction NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payrolls_user_id_period_unique UNIQUE (user_id, period_month, period_year)
);

-- 8. Membuat Tabel Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status tasks_status NOT NULL DEFAULT 'assigned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Membuat Tabel Task Submissions
CREATE TABLE public.task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id),
  submitted_by UUID NOT NULL REFERENCES public.profiles(id),
  submission_note TEXT,
  file_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_comment TEXT,
  status tasks_submission_status NOT NULL DEFAULT 'submitted'
);
```

---

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

---

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

-- ==========================================
-- MENGAKTIFKAN RLS UNTUK SEMUA TABEL
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- POLICIES TABEL PROFILES
-- ==========================================
CREATE POLICY "Allow read profiles" ON public.profiles 
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Allow insert profiles" ON public.profiles 
  FOR INSERT WITH CHECK (public.is_admin() OR auth.uid() = id);

CREATE POLICY "Allow admin to update profiles" ON public.profiles 
  FOR UPDATE USING (public.is_admin() OR auth.uid() = id);

-- ==========================================
-- POLICIES TABEL ATTENDANCES
-- ==========================================
CREATE POLICY "Allow read attendances" ON public.attendances 
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Allow insert attendances" ON public.attendances 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update attendances" ON public.attendances 
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- ==========================================
-- POLICIES TABEL LEAVES
-- ==========================================
CREATE POLICY "Allow read leaves" ON public.leaves 
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Allow insert leaves" ON public.leaves 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow admin to update leaves" ON public.leaves 
  FOR UPDATE USING (public.is_admin());

-- ==========================================
-- POLICIES TABEL EMPLOYEE_SCHEDULES
-- ==========================================
CREATE POLICY "Admin read all schedules" ON public.employee_schedules
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admin manage schedules" ON public.employee_schedules
  FOR ALL USING (public.is_admin());

CREATE POLICY "Employee read own schedule" ON public.employee_schedules
  FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- POLICIES TABEL SHIFT_SWAP_REQUESTS
-- ==========================================
CREATE POLICY "Read own swap requests" ON public.shift_swap_requests
  FOR SELECT USING (
    auth.uid() = requester_id OR 
    auth.uid() = target_user_id OR 
    public.is_admin()
  );

CREATE POLICY "Create swap requests" ON public.shift_swap_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Update swap as target" ON public.shift_swap_requests
  FOR UPDATE USING (
    (auth.uid() = target_user_id AND status = 'pending_employee_approval') OR
    public.is_admin()
  );

-- ==========================================
-- POLICIES TABEL PAYROLLS
-- ==========================================
CREATE POLICY "Admin manage payrolls" ON public.payrolls
  FOR ALL USING (public.is_admin());

CREATE POLICY "Read own payroll" ON public.payrolls
  FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- POLICIES TABEL TASKS
-- ==========================================
CREATE POLICY "Admin manage tasks" ON public.tasks
  FOR ALL USING (public.is_admin());

CREATE POLICY "Read assigned tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = assigned_to);

-- ==========================================
-- POLICIES TABEL TASK_SUBMISSIONS
-- ==========================================
CREATE POLICY "Admin manage submissions" ON public.task_submissions
  FOR ALL USING (public.is_admin());

CREATE POLICY "Read own submissions" ON public.task_submissions
  FOR SELECT USING (auth.uid() = submitted_by);

CREATE POLICY "Create own submissions" ON public.task_submissions
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Update own submissions" ON public.task_submissions
  FOR UPDATE USING (auth.uid() = submitted_by);
```

---

## 4. Konfigurasi Supabase Storage

### Buckets yang Dibutuhkan

Buka menu **Storage** di Supabase Dashboard, buat 4 *bucket*:

| Bucket | Tipe | Keterangan |
| --- | --- | --- |
| `attendance_photos` | Public | Menyimpan foto selfie presensi & foto profil |
| `leave_documents` | Public | Menyimpan dokumen/surat izin cuti |
| `Foto_Profil` | Public | Menyimpan foto profil karyawan |
| `task_submissions` | Public | Menyimpan bukti submission tugas |

### RLS Policies Storage

```sql
-- ==========================================
-- POLICIES BUCKET attendance_photos
-- ==========================================
CREATE POLICY "Allow upload attendance photos" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attendance_photos');

CREATE POLICY "Allow view attendance photos" ON storage.objects 
  FOR SELECT TO authenticated USING (bucket_id = 'attendance_photos');

-- ==========================================
-- POLICIES BUCKET leave_documents
-- ==========================================
CREATE POLICY "Allow upload leave docs" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'leave_documents');

CREATE POLICY "Allow view leave docs" ON storage.objects 
  FOR SELECT TO authenticated USING (bucket_id = 'leave_documents');

-- ==========================================
-- POLICIES BUCKET Foto_Profil
-- ==========================================
CREATE POLICY "Allow upload profile photos" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'Foto_Profil');

CREATE POLICY "Allow view profile photos" ON storage.objects 
  FOR SELECT TO authenticated USING (bucket_id = 'Foto_Profil');

-- ==========================================
-- POLICIES BUCKET task_submissions
-- ==========================================
CREATE POLICY "Allow upload task submissions" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task_submissions');

CREATE POLICY "Allow view task submissions" ON storage.objects 
  FOR SELECT TO authenticated USING (bucket_id = 'task_submissions');
```

---

## 5. Edge Functions

Berikut daftar Edge Functions yang digunakan oleh frontend:

| Function | Method | Keterangan | Endpoint |
| --- | --- | --- | --- |
| `clever-responder` | POST | Membuat akun karyawan baru (auth + profile) | `/functions/v1/clever-responder` |
| `delete-user` | DELETE | Menghapus akun karyawan | `/functions/v1/delete-user?id={user_id}` |
| `detail-karyawan` | GET | Mengambil detail data karyawan | `/functions/v1/detail-karyawan?id={user_id}` |
| `approve-leaves` | POST | Menyetujui/menolak pengajuan cuti | `/functions/v1/approve-leaves` |
| `swap-approval` | POST | Menyetujui pertukaran shift | `/functions/v1/swap-approval` |

---

## 6. Environment Variables (`.env.example`)

```env
# Vite (React):
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 7. Panduan Integrasi React

### A. Inisialisasi Client Supabase (`src/utils/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 8. Ringkasan Tabel & Relasi

| Tabel | Relasi | Keterangan |
| --- | --- | --- |
| `profiles` | 1-to-1 dengan `auth.users` | Data profil pengguna |
| `attendances` | Many-to-1 dengan `profiles` | Catatan presensi harian |
| `leaves` | Many-to-1 dengan `profiles` | Pengajuan cuti |
| `employee_schedules` | Many-to-1 dengan `profiles` | Jadwal kerja harian |
| `shift_swap_requests` | Many-to-1 dengan `profiles` (2x) | Pengajuan tukar shift |
| `payrolls` | Many-to-1 dengan `profiles` | Data penggajian |
| `tasks` | Many-to-1 dengan `profiles` (2x) | Tugas untuk karyawan |
| `task_submissions` | Many-to-1 dengan `tasks`, `profiles` | Submission tugas |
