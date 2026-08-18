// import { useState, useEffect } from 'react'
// import { supabase } from './utils/supabase'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import AdminLayout from "./components/layout/AdminLayout";
import Leaves from "./pages/Leaves";
import Attendance from "./pages/Attendance";
import Login from "./pages/Login";
import EmployeeDashboard from "./pages/karyawan/EmployeeDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Admin Routes wrapped in AdminLayout */}
        <Route path="/" element={<AdminLayout><Dashboard /></AdminLayout>} />
        <Route path="/admin/employees" element={<AdminLayout><Employees /></AdminLayout>} />
        <Route path="/admin/leaves" element={<AdminLayout><Leaves /></AdminLayout>} />
        <Route path="/admin/attendance" element={<AdminLayout><Attendance /></AdminLayout>} />
        
        {/* Karyawan Routes */}
        <Route path="/karyawan/dashboard" element={<EmployeeDashboard />} />
        <Route path="/karyawan" element={<Navigate to="/karyawan/dashboard" replace />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}