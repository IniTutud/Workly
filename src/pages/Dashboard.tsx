import {
  Bell,
  Users,
  CircleCheck,
  CalendarDays,
  Clock,
} from "lucide-react";

function Dashboard() {
  return (
    <div className="space-y-6">

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative rounded-full p-2 text-slate-500 hover:bg-white hover:text-slate-900">
            <Bell size={20} />

            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
              A
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Admin HR
              </p>

              <p className="text-xs text-slate-500">
                Administrator
              </p>
            </div>
          </div>
        </div>
      </header>


      <section className="relative overflow-hidden rounded-2xl bg-blue-100 px-8 py-7">
        <div className="relative z-10">
          <p className="text-sm font-medium text-blue-600">
            Welcome back 👋
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Hi, Admin HR
          </h2>

          <p className="mt-2 max-w-lg text-sm text-slate-600">
            Here's your HR overview for today. Monitor attendance,
            employees, and leave requests from here.
          </p>
        </div>

        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-200/70" />
        <div className="absolute -bottom-16 right-32 h-32 w-32 rounded-full bg-yellow-200/70" />
      </section>


      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm flex justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Total Karyawan
              </p>

              <p className="mt-3 text-3xl font-semibold text-slate-900">
                24
              </p>

              <p className="mt-2 text-xs text-blue-600">
                Employees registered
              </p>
            </div>            
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600">
              <CircleCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Hadir Hari Ini
              </p>

              <p className="mt-3 text-3xl font-semibold text-slate-900">
                2
              </p>

              <p className="mt-2 text-xs text-green-600">
                Employees present today
              </p>
            </div>

          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Cuti Pending
              </p>

              <p className="mt-3 text-3xl font-semibold text-slate-900">
                3
              </p>

              <p className="mt-2 text-xs text-yellow-600">
                Waiting for approval
              </p>
            </div>

          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-500">
              <Clock className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Terlambat
              </p>

              <p className="mt-3 text-3xl font-semibold text-slate-900">
                4
              </p>

              <p className="mt-2 text-xs text-red-500">
                Late attendance today
              </p>
            </div>

          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Attendance Overview</h2>
              <p className="mt-1 text-sm text-slate-500">Attendance summary for this week</p>
            </div>

            <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>

          <div className="mt-8 flex h-64 gap-4">
            <div className="flex flex-col justify-between text-xs text-slate-400 pb-6 pr-2">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>

            <div className="relative flex-1">
              <div className="absolute inset-0 flex flex-col justify-between pb-6">
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-dashed border-slate-200 w-full" />
                <div className="border-b border-slate-200 w-full" />
              </div>

              <div className="relative h-full pb-6">
                <svg className="h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    d="M 10 25 L 30 10 L 50 20 L 70 5 L 90 15"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>

                <div className="absolute inset-0 flex justify-between px-[10%] pb-6">
                  <div className="relative flex justify-center" style={{ marginTop: '25%' }}>
                    <span className="h-3 w-3 -translate-y-1/2 rounded-full border-2 border-blue-500 bg-white shadow" />
                  </div>
                  
                  <div className="relative flex justify-center" style={{ marginTop: '10%' }}>
                    <span className="h-3 w-3 -translate-y-1/2 rounded-full border-2 border-blue-500 bg-white shadow" />
                  </div>
                  
                  <div className="relative flex justify-center" style={{ marginTop: '20%' }}>
                    <span className="h-3 w-3 -translate-y-1/2 rounded-full border-2 border-blue-500 bg-white shadow" />
                  </div>
                  
                  <div className="relative flex justify-center" style={{ marginTop: '5%' }}>
                    <span className="h-3 w-3 -translate-y-1/2 rounded-full border-2 border-blue-500 bg-white shadow" />
                  </div>
                  
                  <div className="relative flex justify-center" style={{ marginTop: '15%' }}>
                    <span className="h-3 w-3 -translate-y-1/2 rounded-full border-2 border-blue-500 bg-white shadow" />
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-[10%] text-xs text-slate-500">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Pending Leave
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Requests waiting for approval
              </p>
            </div>

            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
              3 Pending
            </span>
          </div>

          <div className="mt-6 space-y-4">

            <div className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Budi Santoso
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    12 Aug - 14 Aug
                  </p>
                </div>

                <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  Review
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Siti Aminah
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    15 Aug - 16 Aug
                  </p>
                </div>

                <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  Review
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Andi Pratama
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    18 Aug - 19 Aug
                  </p>
                </div>

                <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  Review
                </button>
              </div>
            </div>
          </div>

          <button className="mt-5 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Lihat Semua
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Attendance
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest employee attendance records
            </p>
          </div>

          <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
            Lihat Semua →
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500">
                <th className="pb-4 font-medium">Nama</th>
                <th className="pb-4 font-medium">Tanggal</th>
                <th className="pb-4 font-medium">Jam Masuk</th>
                <th className="pb-4 font-medium">Jam Keluar</th>
                <th className="pb-4 text-right font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              <tr>
                <td className="py-4 font-medium text-slate-900">
                  Budi Santoso
                </td>

                <td className="py-4 text-slate-500">
                  11 Aug 2026
                </td>

                <td className="py-4 text-slate-500">
                  07:52
                </td>

                <td className="py-4 text-slate-500">
                  16:30
                </td>

                <td className="py-4 text-right">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    Hadir
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-4 font-medium text-slate-900">
                  Siti Aminah
                </td>

                <td className="py-4 text-slate-500">
                  11 Aug 2026
                </td>

                <td className="py-4 text-slate-500">
                  08:17
                </td>

                <td className="py-4 text-slate-500">
                  16:35
                </td>

                <td className="py-4 text-right">
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                    Terlambat
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-4 font-medium text-slate-900">
                  Fadhil
                </td>

                <td className="py-4 text-slate-500">
                  11 Aug 2026
                </td>

                <td className="py-4 text-slate-500">
                  07:45
                </td>

                <td className="py-4 text-slate-500">
                  16:28
                </td>

                <td className="py-4 text-right">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    Hadir
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-4 font-medium text-slate-900">
                  Andi Pratama
                </td>

                <td className="py-4 text-slate-500">
                  11 Aug 2026
                </td>

                <td className="py-4 text-slate-500">
                  08:25
                </td>

                <td className="py-4 text-slate-500">
                  -
                </td>

                <td className="py-4 text-right">
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                    Terlambat
                  </span>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;