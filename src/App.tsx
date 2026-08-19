import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import AdminLayout from "./components/layout/AdminLayout";
import Leaves from "./pages/Leaves";
import Attendance from "./pages/Attendance";
import Login from "./pages/Login";
import EmployeeDashboard from "./pages/karyawan/EmployeeDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* ADMIN */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <Dashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/employees"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <Employees />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/leaves"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <Leaves />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/attendance"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout>
                <Attendance />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* KARYAWAN */}
        <Route
          path="/karyawan/dashboard"
          element={
            <ProtectedRoute requiredRole="karyawan">
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/karyawan"
          element={
            <Navigate to="/karyawan/dashboard" replace />
          }
        />

        {/* ROOT */}
        <Route
          path="/"
          element={
            <Navigate to="/login" replace />
          }
        />

        {/* URL tidak ditemukan */}
        <Route
          path="*"
          element={
            <Navigate to="/login" replace />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}