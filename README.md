<img width="1500" height="500" alt="ss" src="https://github.com/user-attachments/assets/b0b295cf-44ce-488d-88ad-45f9caa83b24" />


## Features
- Authentication menggunakan Supabase Auth
- Dashboard Admin
- Dashboard Karyawan
- Manajemen data karyawan
- Presensi Clock In dan Clock Out
- Rekap absensi
- Pengajuan cuti
- Approval pengajuan cuti
- Role-based access untuk Admin dan Karyawan
- Tech Stack

## Tech Stack
<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=react,typescript,vite,tailwindcss,supabase,github,vercel,vscode&perline=4&theme=light" />
  </a>
</p>

## Prerequisites
Sebelum menjalankan project, pastikan sudah terinstall:

- Node.js
- npm
- Git
- Visual Studio Code

Cek instalasi Node.js dan npm:

    node -v
    npm -v
    
## Installation
Clone repository:

    git clone https://github.com/IniTutud/Workly.
    
Masuk ke folder project:

    cd Workly
    
Install dependencies:

    npm install
    
Jalankan development server:

    npm run dev

Project dapat diakses melalui:

    http://localhost:5173

## Environment Variables
Buat file .env di root folder project.

    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
    
Contoh struktur:

    workly/
    ├── .env
    ├── package.json
    └── src/
Jangan upload file .env ke GitHub.

Tambahkan ke .gitignore:

    .env
    .env.local
Untuk repository, sediakan .env.example:

    VITE_SUPABASE_URL=
    VITE_SUPABASE_PUBLISHABLE_KEY=

Front-End Folder Structure

      src/
      ├── components/
      │   ├── layout/
      |   |   ├── Sidebar.tsx
      │   │   └── AdminLayout.tsx
      │   └── ProtectedRoute.tsx
      │
      ├── pages/
      │   ├── Dashboard.tsx
      │   ├── Employees.tsx
      │   ├── Leaves.tsx
      │   ├── Attendance.tsx
      │   ├── Login.tsx
      │   │
      │   └── karyawan/
      |       ├── EmployeeDashboard.tsx
      |       ├── PengajuanCuti.tsx
      |       ├── Presensi.tsx
      │       └── Profile.tsx
      │
      ├── utils/
      │   └── supabase.ts
      │
      ├── App.tsx
      ├── Main.tsx
      └── index.css
      
## Supabase Integration
Workly menggunakan Supabase sebagai backend dan database.

Supabase digunakan untuk:

- Authentication
- PostgreSQL Database
- Storage
- Row Level Security (RLS)
- Edge Functions
- Koneksi Supabase dibuat melalui:

      src/utils/supabase.ts
  
Contoh konfigurasi:

    import { createClient } from "@supabase/supabase-js";
    
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    
    export const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

## Running the Project
Untuk menjalankan project dalam mode development:

    npm run dev
    
Untuk membuat production build:

    npm run build
    
Untuk menjalankan hasil build secara lokal:

    npm run preview
    
## Deployment to Vercel
1. Push Project ke GitHub Pastikan project sudah berada di repository GitHub.

       git add .
       git commit -m "update project"
       git push
     
2. Login ke Vercel
    Buka Vercel dan login menggunakan akun GitHub.

3. Import Repository
    Pilih:

        Add New Project
   
    Kemudian pilih repository Workly dari GitHub.

4. Configure Project
    Vercel akan mendeteksi project sebagai Vite.

    Gunakan konfigurasi:

        Framework Preset: Vite
        Build Command: npm run build
        Output Directory: dist

5. Add Environment Variables
    
    Masukkan environment variables yang digunakan oleh project:

        VITE_SUPABASE_URL
        VITE_SUPABASE_PUBLISHABLE_KEY
    
    Value harus menggunakan value dari project Supabase.

6. Deploy
    Klik:

        Deploy
   
    Vercel akan melakukan proses build dan deployment.

    Setelah selesai, Vercel akan memberikan production URL.

    Contoh:

        https://workly.vercel.app
    
## Git Workflow
Workflow development:

    Coding
       ↓
    Testing di localhost
       ↓
    git add .
       ↓
    git commit
       ↓
    git push
       ↓
    GitHub
       ↓
    Vercel
       ↓
    Production
    
Setiap perubahan yang di-push ke repository dapat memicu deployment baru di Vercel.

## Troubleshooting
npm run dev tidak berjalan

Pastikan dependencies sudah diinstall:

    npm install
    
Kemudian:

    npm run dev

## Supabase tidak terkoneksi
Periksa file .env dan pastikan variable berikut tersedia:

    VITE_SUPABASE_URL
    VITE_SUPABASE_PUBLISHABLE_KEY
    
Setelah mengubah .env, restart development server.

## Build Vercel gagal
Jalankan build secara lokal terlebih dahulu:

    npm run build
    
Jika terdapat error, perbaiki error tersebut sebelum melakukan deployment ulang.

## Production
Production application:

    https://workly-flame-omega.vercel.app

Repository:

    https://github.com/IniTutud/Workly.git
