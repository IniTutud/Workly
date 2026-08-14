import { useState } from "react";
import { supabase } from "../utils/supabase";

const initialEmployees = [
  {
    id: 1,
    name: "Wanda Maximoff",
    email: "sscrltwitch@gmail.com",
    department: "IT",
    role: "Karyawan",
  },
  {
    id: 2,
    name: "Ryan Gosling",
    email: "RGosling@example.com",
    department: "HR",
    role: "Karyawan",
  },
  {
    id: 3,
    name: "Charlie Brown",
    email: "CharlieBrown@example.com",
    department: "IT",
    role: "Admin",
  },
];

function Employees() {
  const [employees, setEmployees] = useState(initialEmployees);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    role: "Karyawan",
  });

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(search.toLowerCase()) ||
    employee.email.toLowerCase().includes(search.toLowerCase()) ||
    employee.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSaveEmployee = async () => {
    if (
      !formData.name ||
      !formData.email ||
      !formData.department
    ) {
      alert("Nama, email, dan department harus diisi.");
      return;
    }

    if (editingEmployee === null && !formData.password) {
      alert("Password harus diisi.");
      return;
    }

    if (editingEmployee !== null) {
      setEmployees(
        employees.map((employee) =>
          employee.id === editingEmployee
            ? {
                ...employee,
                name: formData.name,
                email: formData.email,
                department: formData.department,
                role: formData.role,
              }
            : employee
        )
      );

      alert("Data karyawan berhasil diperbarui.");
    } else {
      const { data, error } = await supabase.functions.invoke(
        "create-user",
        {
          body: {
            email: formData.email,
            password: formData.password,
            full_name: formData.name,
            role: formData.role,
            department: formData.department,
          },
        }
      );

      if (error) {
        console.error("Create user error:", error);
        alert("Gagal membuat akun karyawan.");
        return;
      }

      console.log("Create user response:", data);

      const newEmployee = {
        id: Date.now(),
        name: formData.name,
        email: formData.email,
        department: formData.department,
        role: formData.role,
      };

      setEmployees([...employees, newEmployee]);

      alert("Akun karyawan berhasil dibuat.");
    }

    setFormData({
      name: "",
      email: "",
      password: "",
      department: "",
      role: "Karyawan",
    });

    setEditingEmployee(null);
    setShowForm(false);
  };

  const handleEditEmployee = (employee: (typeof employees)[number]) => {
    setFormData({
      name: employee.name,
      email: employee.email,
      password: "",
      department: employee.department,
      role: employee.role,
    });

    setEditingEmployee(employee.id);
    setShowForm(true);
  };

  const handleDeleteEmployee = (id: number) => {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus karyawan ini?"
    );

    if (!confirmed) return;

    setEmployees(
      employees.filter((employee) => employee.id !== id)
    );
  };

  return (
    <div className="scrollbar-none">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Manajemen Karyawan
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Kelola data dan role karyawan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-4">
            <input
              type="text"
              placeholder="Cari karyawan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 md:w-80"
            />
          </div>
        
          <button
            onClick={() => {
              setEditingEmployee(null);
              setFormData({
                name: "",
                email: "",
                password: "",
                department: "",
                role: "Karyawan",
              });
              setShowForm(true);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Tambah Karyawan
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            {editingEmployee !== null ? "Edit Karyawan" : "Tambah Karyawan"}
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nama Lengkap
              </label>

              <input
                type="text"
                name="name"
                placeholder="Masukkan nama lengkap"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                type="email"
                name="email"
                placeholder="Masukkan email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
              />
            </div>

            {editingEmployee === null && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Password
                </label>

                <input
                  type="password"
                  name="password"
                  placeholder="Masukkan password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Department
              </label>

              <input
                type="text"
                name="department"
                placeholder="Contoh: IT"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Role
              </label>

              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
              >
                <option value="Karyawan">Karyawan</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>

            <button
              onClick={handleSaveEmployee}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {editingEmployee !== null ? "Update" : "Simpan"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-6 py-4 font-medium">Nama</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Department</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 text-right font-medium">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredEmployees.map((employee) => (
              <tr key={employee.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">
                  {employee.name}
                </td>

                <td className="px-6 py-4 text-slate-500">
                  {employee.email}
                </td>

                <td className="px-6 py-4 text-slate-500">
                  {employee.department}
                </td>

                <td className="px-6 py-4">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    {employee.role}
                  </span>
                </td>

                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleEditEmployee(employee)}
                    className="mr-3 text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDeleteEmployee(employee.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Employees;