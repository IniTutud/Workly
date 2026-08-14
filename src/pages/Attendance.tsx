import { useState } from "react";

const initialAttendance = [
  {
    id: 1,
    name: "Wanda Maximoff",
    department: "IT",
    date: "14 Aug 2026",
    checkIn: "07:52",
    checkOut: "17:03",
    status: "Hadir",
  },
  {
    id: 2,
    name: "Ryan Gosling",
    department: "HR",
    date: "14 Aug 2026",
    checkIn: "08:17",
    checkOut: "17:05",
    status: "Terlambat",
  },
  {
    id: 3,
    name: "Charlie Brown",
    department: "IT",
    date: "14 Aug 2026",
    checkIn: "07:45",
    checkOut: "17:00",
    status: "Hadir",
  },
  {
    id: 4,
    name: "Max Verstappen",
    department: "Finance",
    date: "14 Aug 2026",
    checkIn: "-",
    checkOut: "-",
    status: "Tidak Hadir",
  },
];

function Attendance() {
  const [attendance] = useState(initialAttendance);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");

  const filteredAttendance = attendance.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.department.toLowerCase().includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "Semua" || item.status === statusFilter;

    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Rekap Absensi
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Lihat rekap presensi seluruh karyawan.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Karyawan</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            4
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-green-500">Hadir</p>
          <p className="mt-2 text-2xl font-semibold text-green-600">
            2
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-red-500">Tidak Hadir</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">
            1
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            placeholder="Cari karyawan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 md:w-80"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="Semua">Semua Status</option>
            <option value="Hadir">Hadir</option>
            <option value="Terlambat">Terlambat</option>
            <option value="Tidak Hadir">Tidak Hadir</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-6 py-4 font-medium">Nama</th>
              <th className="px-6 py-4 font-medium">Department</th>
              <th className="px-6 py-4 font-medium">Tanggal</th>
              <th className="px-6 py-4 font-medium">Jam Masuk</th>
              <th className="px-6 py-4 font-medium">Jam Keluar</th>
              <th className="px-6 py-4 font-medium">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredAttendance.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-medium text-slate-900">
                  {item.name}
                </td>

                <td className="px-6 py-4 text-slate-500">
                  {item.department}
                </td>

                <td className="px-6 py-4 text-slate-500">
                  {item.date}
                </td>

                <td className="px-6 py-4 text-slate-500">
                  {item.checkIn}
                </td>

                <td className="px-6 py-4 text-slate-500">
                  {item.checkOut}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      item.status === "Hadir"
                        ? "bg-green-100 text-green-700"
                        : item.status === "Terlambat"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}

            {filteredAttendance.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-slate-500"
                >
                  Data absensi tidak ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Attendance;