// import { useState, useEffect } from 'react'
// import { supabase } from './utils/supabase'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import AdminLayout from "./components/layout/AdminLayout";
import Leaves from "./pages/Leaves";
import Attendance from "./pages/Attendance";

export default function App() {
  return (
    <BrowserRouter>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/admin/employees" element={<Employees />} />
          <Route path="/admin/leaves" element={<Leaves />} />
          <Route path="/admin/attendance" element={<Attendance />} />
        </Routes>
      </AdminLayout>
    </BrowserRouter>
  );
}