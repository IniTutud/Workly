import { NavLink } from "react-router-dom";
import adminLogo from "../../assets/admin-logo.png";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  LogOut,
} from "lucide-react";

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-blue-900 text-white">
      <div className="flex h-full flex-col p-10">
        
        <div className="mb-6 flex justify-center border-b border-yellow-500 pb-5">
            <img src={adminLogo} alt="Admin Logo" className="h-10" />
        </div>

        <nav className="flex flex-col gap-6">
            <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                `flex w-full items-center justify-center rounded-full px-4 py-3 transition gap-2 ${
                    isActive
                    ? "bg-cyan-500 text-white"
                    : "text-white hover:bg-blue-800"
                }`
                }
            >
                <LayoutDashboard className="h-5 w-5" />Dashboard
            </NavLink>

            <NavLink
                to="/admin/employees"
                className={({ isActive }) =>
                `flex w-full items-center justify-center rounded-full px-4 py-3 transition gap-2 ${
                    isActive
                    ? "bg-cyan-500 text-white"
                    : "text-white hover:bg-blue-800"
                }`
                }
            >
                <Users className="h-5 w-5" />Karyawan
            </NavLink>

            <NavLink
                to="/admin/leaves"
                className={({ isActive }) =>
                `flex w-full items-center justify-center rounded-full px-4 py-3 transition gap-2 ${
                    isActive
                    ? "bg-cyan-500 text-white"
                    : "text-white hover:bg-blue-800"
                }`
                }
            >
                <CalendarDays className="h-5 w-5" />Cuti & Izin
            </NavLink>

            <NavLink
                to="/admin/attendance"
                className={({ isActive }) =>
                `flex w-full items-center justify-center rounded-full px-4 py-3 transition gap-2 ${
                    isActive
                    ? "bg-cyan-500 text-white"
                    : "text-white hover:bg-blue-800"
                }`
                }
            >
                <ClipboardList className="h-5 w-5" />Rekap Absensi
            </NavLink>
        </nav>

        <div className="flex-1" />
      </div>
    </aside>
  );
}

export default Sidebar;