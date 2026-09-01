import { NavLink } from "react-router-dom";
import { useState } from "react";
import adminLogo from "../../assets/admin-logo.png";

import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  Folder,
  ChevronDown,
  BriefcaseBusiness,
  Receipt,
} from "lucide-react";

function Sidebar() {
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isShiftOpen, setIsShiftOpen] = useState(false);

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-blue-900 text-white">
      <div className="flex h-full flex-col p-10">
        
        <div className="mb-6 flex justify-center border-b border-yellow-500 pb-5">
          <img
            src={adminLogo}
            alt="Admin Logo"
            className="h-10"
          />
        </div>

        <nav className="flex flex-col gap-4">          
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 transition ${
                isActive
                  ? "bg-cyan-500 text-white"
                  : "text-white hover:bg-blue-800"
              }`
            }
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </NavLink>
          
          <NavLink
            to="/admin/employees"
            className={({ isActive }) =>
              `flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 transition ${
                isActive
                  ? "bg-cyan-500 text-white"
                  : "text-white hover:bg-blue-800"
              }`
            }
          >
            <Users className="h-5 w-5" />
            Karyawan
          </NavLink>
          
          <NavLink
            to="/admin/leaves"
            className={({ isActive }) =>
              `flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 transition ${
                isActive
                  ? "bg-cyan-500 text-white"
                  : "text-white hover:bg-blue-800"
              }`
            }
          >
            <CalendarDays className="h-5 w-5" />
            Cuti & Izin
          </NavLink>
          
          <div>

            <button
              onClick={() =>
                setIsAttendanceOpen(!isAttendanceOpen)
              }
              className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-white transition hover:bg-blue-800"
            >
              <ClipboardList className="h-5 w-5" />

              <span>Absensi</span>

              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isAttendanceOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {isAttendanceOpen && (
              <div className="mt-2 flex flex-col gap-1 pl-6">

                <NavLink
                  to="/admin/attendance"
                  className={({ isActive }) =>
                    `rounded-lg px-4 py-2 text-sm transition ${
                      isActive
                        ? "bg-cyan-500 text-white"
                        : "text-blue-100 hover:bg-blue-800"
                    }`
                  }
                >
                  Rekap Harian
                </NavLink>

                <NavLink
                  to="/admin/attendancemonthly"
                  className={({ isActive }) =>
                    `rounded-lg px-4 py-2 text-sm transition ${
                      isActive
                        ? "bg-cyan-500 text-white"
                        : "text-blue-100 hover:bg-blue-800"
                    }`
                  }
                >
                  Rekap Bulanan
                </NavLink>

              </div>
            )}
          </div>
          
          <div>

            <button
              onClick={() =>
                setIsShiftOpen(!isShiftOpen)
              }
              className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-white transition hover:bg-blue-800"
            >
              <BriefcaseBusiness className="h-5 w-5" />

              <span>Jadwal Kerja</span>

              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isShiftOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {isShiftOpen && (
              <div className="mt-2 flex flex-col gap-1 pl-6">

                <NavLink
                  to="/admin/shift"
                  className={({ isActive }) =>
                    `rounded-lg px-4 py-2 text-sm transition ${
                      isActive
                        ? "bg-cyan-500 text-white"
                        : "text-blue-100 hover:bg-blue-800"
                    }`
                  }
                >
                  Pembagian Jadwal
                </NavLink>

                <NavLink
                  to="/admin/swapschedule"
                  className={({ isActive }) =>
                    `rounded-lg px-4 py-2 text-sm transition ${
                      isActive
                        ? "bg-cyan-500 text-white"
                        : "text-blue-100 hover:bg-blue-800"
                    }`
                  }
                >
                  Pengajuan Tukar Jadwal
                </NavLink>

              </div>
            )}
          </div>

          <NavLink
            to="/admin/payroll"
            className={({ isActive }) =>
              `flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 transition ${
                isActive
                  ? "bg-cyan-500 text-white"
                  : "text-white hover:bg-blue-800"
              }`
            }
          >
            <Receipt className="h-5 w-5" />
            Penggajian
          </NavLink>

        </nav>

        <div className="flex-1" />

      </div>
    </aside>
  );
}

export default Sidebar;