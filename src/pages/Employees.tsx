import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { ChevronDown } from "lucide-react";

type Employee = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
};

function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
    role: "karyawan",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, department, role")
        .eq("role", "karyawan")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error mengambil karyawan:", error);
        alert("Gagal mengambil data karyawan.");
        return;
      }

      const formattedEmployees: Employee[] = (data || []).map(
        (employee) => ({
          id: employee.id,
          name: employee.full_name,
          email: "",
          department: employee.department || "-",
          role: employee.role,
        })
      );

      setEmployees(formattedEmployees);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(search.toLowerCase()) ||
    employee.email.toLowerCase().includes(search.toLowerCase()) ||
    employee.department.toLowerCase().includes(search.toLowerCase())
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveEmployee = async () => {
    if (
      !formData.name ||
      !formData.email ||
      !formData.department
    ) {
      alert("Nama, email, dan department wajib diisi.");
      return;
    }

    if (editingEmployee === null) {
      if (!formData.password) {
        alert("Password wajib diisi.");
        return;
      }

      if (formData.password.length < 6) {
        alert("Password minimal 6 karakter.");
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        console.log("SESSION:", session);

        const { data, error } = await supabase.functions.invoke(
          "clever-responder",
          {
            body: {
              email: formData.email,
              password: formData.password,
              full_name: formData.name,
              role: "karyawan",
              department: formData.department,
            },
          }
        );

        if (error) {
          console.error("Create user error:", error);
          alert("Gagal membuat akun karyawan.");
          return;
        }

        if (data?.error) {
          alert(data.error);
          return;
        }

        alert("Akun karyawan berhasil dibuat.");

        setFormData({
          name: "",
          email: "",
          password: "",
          department: "",
          role: "karyawan",
        });

        setShowForm(false);
        
        await fetchEmployees();

      } catch (error) {
        console.error("Error:", error);
        alert("Terjadi kesalahan saat membuat akun.");
      }

      return;
    }
    
    setEmployees(
      employees.map((employee) =>
        employee.id === editingEmployee
          ? {
              ...employee,
              name: formData.name,
              email: formData.email,
              department: formData.department,
              role: "Karyawan",
            }
          : employee
      )
    );

    setFormData({
      name: "",
      email: "",
      password: "",
      department: "",
      role: "karyawan",
    });

    setEditingEmployee(null);
    setShowForm(false);
  };

  const resetForm = () => {
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

  const handleEditEmployee = (
    employee: Employee
  ) => {
    setFormData({
      name: employee.name,
      email: employee.email,
      password: "",
      department: employee.department,
      role:
        employee.role === "admin"
          ? "Admin"
          : "Karyawan",
    });

    setEditingEmployee(employee.id);
    setShowForm(true);
  };

  const handleDeleteEmployee = async (id: string) => {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus karyawan ini?"
    );

    if (!confirmed) return;

    try {
      const { data, error } = await supabase.functions.invoke(
        "delete-user",
        {
          body: {
            user_id: id,
          },
        }
      );

      if (error) {
        console.error("Delete user error:", error);
        alert("Gagal menghapus karyawan.");
        return;
      }

      if (data?.error) {
        alert(data.error);
        return;
      }

      alert("Karyawan berhasil dihapus.");

      await fetchEmployees();
    } catch (error) {
      console.error("Error:", error);
      alert("Terjadi kesalahan saat menghapus karyawan.");
    }
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
              onChange={(e) =>
                setSearch(e.target.value)
              }
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
            {editingEmployee !== null
              ? "Edit Karyawan"
              : "Tambah Karyawan"}
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
            
            {editingEmployee === null && (
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
            )}

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

                <p className="mt-1 text-xs text-slate-500">
                  Minimal 6 karakter
                </p>
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

            {editingEmployee === null && (                              
            <div className="relative">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Role
              </label>
              
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition-all hover:bg-slate-50 focus:border-blue-500"
              >
                <span className="capitalize">{formData.role}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isRoleDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isRoleDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsRoleDropdownOpen(false)}
                  ></div>

                  <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    {["karyawan"].map((r) => ( //, "admin"
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, role: r }));
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full rounded-md px-3 py-2 text-left text-sm capitalize transition-colors ${
                          formData.role === r
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={() => {
              setShowForm(false);
              setEditingEmployee(null);

              setFormData({
                name: "",
                email: "",
                password: "",
                department: "",
                role: "karyawan",
              });
            }}
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
            <th className="px-6 py-4 font-medium">
              Nama
            </th>

            {/* <th className="px-6 py-4 font-medium">
              Email
            </th> */}

            <th className="px-6 py-4 font-medium">
              Department
            </th>

            <th className="px-6 py-4 font-medium">
              Role
            </th>

            <th className="px-6 py-4 text-right font-medium">
              Aksi
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td
                colSpan={5}
                className="px-6 py-8 text-center text-slate-500"
              >
                Memuat data...
              </td>
            </tr>
          ) : filteredEmployees.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-6 py-8 text-center text-slate-500"
              >
                Belum ada data karyawan.
              </td>
            </tr>
          ) : (
            filteredEmployees.map((employee) => (
              <tr
                key={employee.id}
                className="hover:bg-slate-50"
              >

                <td className="px-6 py-4 font-medium text-slate-900">
                    {employee.name}
                </td>

                {/* <td className="px-6 py-4 text-slate-500">
                  {employee.email}
                </td> */}

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
                    onClick={() =>
                      handleEditEmployee(employee)
                    }
                    className="mr-3 text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      handleDeleteEmployee(
                        employee.id
                      )
                    }
                    className="text-red-600 hover:text-red-800"
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
  );
}

export default Employees;