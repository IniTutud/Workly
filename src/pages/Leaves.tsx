import { useState } from "react";
import {
  Check,
  X,
} from "lucide-react";

const initialLeaves = [
  {
    id: 1,
    name: "Wanda Maximoff",
    type: "Cuti Tahunan",
    startDate: "12 Aug 2026",
    endDate: "14 Aug 2026",
    reason: "Keperluan keluarga",
    status: "Pending",
  },
  {
    id: 2,
    name: "Ryan Gosling",
    type: "Cuti Sakit",
    startDate: "15 Aug 2026",
    endDate: "15 Aug 2026",
    reason: "Tidak enak badan",
    status: "Approved",
  },
  {
    id: 3,
    name: "Charlie Brown",
    type: "Cuti Tahunan",
    startDate: "20 Aug 2026",
    endDate: "22 Aug 2026",
    reason: "Liburan",
    status: "Rejected",
  },
];

function Leaves() {
  const [leaves, setLeaves] = useState(initialLeaves);

  const handleStatus = (id: number, status: string) => {
    const action = status === "Approved" ? "menyetujui" : "menolak";

    const confirmed = window.confirm(
      `Apakah kamu yakin ingin ${action} pengajuan cuti ini?`
    );

    if (!confirmed) return;

    setLeaves(
      leaves.map((leave) =>
        leave.id === id
          ? { ...leave, status }
          : leave
      )
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Pengajuan Cuti
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Kelola dan review pengajuan cuti karyawan.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-4 font-medium">Nama</th>
                <th className="px-6 py-4 font-medium">Jenis Cuti</th>
                <th className="px-6 py-4 font-medium">Tanggal</th>
                <th className="px-6 py-4 font-medium">Alasan</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {leaves.map((leave) => (
                <tr
                  key={leave.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {leave.name}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {leave.type}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {leave.startDate} - {leave.endDate}
                  </td>

                  <td className="px-6 py-4 text-slate-500">
                    {leave.reason}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        leave.status === "Pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : leave.status === "Approved"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {leave.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    {leave.status === "Pending" ? (
                      <>
                        <button
                          onClick={() =>
                            handleStatus(leave.id, "Approved")
                          }
                          className="mr-3 text-green-600 hover:text-green-800 border rounded-md p-1 border-slate-300 bg-slate-200"
                        >
                          <Check size={16} />
                        </button>

                        <button
                          onClick={() =>
                            handleStatus(leave.id, "Rejected")
                          }
                          className="text-red-600 hover:text-red-800 border rounded-md p-1 border-slate-300 bg-slate-200"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-400">
                        Selesai
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Leaves;