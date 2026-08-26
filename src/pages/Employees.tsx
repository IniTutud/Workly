import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import {
  ChevronDown,
  Trash,
  SquarePen,
  Ellipsis,
  X,
} from "lucide-react";

type Employee = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  photo_url?: string | null;
  gender?: string | null;
  tanggal_lahir?: string | null;
  jabatan?: string | null;
  bio?: string | null;
};

function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    department: string;
    role: string;
    jabatan: string;
    gender: string;
    tanggal_lahir: string;
    bio: string;
  }>({
    name: "",
    email: "",
    password: "",
    department: "",
    role: "Karyawan",
    jabatan: "",
    gender: "",
    tanggal_lahir: "",
    bio: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, department, role, jabatan, gender, tanggal_lahir, bio")
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
          jabatan: employee.jabatan,
          gender: employee.gender,
          tanggal_lahir: employee.tanggal_lahir,
          bio: employee.bio,
        })
      );

      setEmployees(formattedEmployees);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEmployee = async (id: string) => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        `detail-karyawan?id=${encodeURIComponent(id)}`
      );

      if (error) {
        console.error("Error mengambil detail karyawan:", error);
        alert("Gagal mengambil detail karyawan.");
        return;
      }

      if (!data?.success) {
        console.error("Detail karyawan error:", data?.message);
        alert(data?.message || "Gagal mengambil detail karyawan.");
        return;
      }

      setSelectedEmployee(data.data);
    } catch (error) {
      console.error("Error:", error);
      alert("Terjadi kesalahan saat mengambil detail karyawan.");
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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveEmployee = async () => {    
    if (!formData.name || !formData.department) {
      alert("Nama dan department wajib diisi.");
      return;
    }

    if (editingEmployee === null) {      
      if (!formData.email) {
        alert("Email wajib diisi.");
        return;
      }

      if (!formData.password) {
        alert("Password wajib diisi.");
        return;
      }

      if (formData.password.length < 6) {
        alert("Password minimal 6 karakter.");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke(
          "clever-responder",
          {
            body: {
              email: formData.email,
              password: formData.password,
              full_name: formData.name,
              role: "karyawan",
              department: formData.department,
              jabatan: formData.jabatan,
              gender: formData.gender ? formData.gender : null,
              tanggal_lahir: formData.tanggal_lahir,
              bio: formData.bio,
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
        resetForm();
        await fetchEmployees();

      } catch (error) {
        console.error("Error:", error);
        alert("Terjadi kesalahan saat membuat akun.");
      }

      return;
    }
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.name,
          department: formData.department,
          jabatan: formData.jabatan,          
          gender: formData.gender ? formData.gender : null,
          tanggal_lahir: formData.tanggal_lahir || null,
          bio: formData.bio,
        })
        .eq("id", editingEmployee);

      if (error) {
        console.error("Error updating profile:", error);
        alert("Gagal memperbarui data karyawan.");
        return;
      }

      alert("Data karyawan berhasil diperbarui.");
      resetForm();
      await fetchEmployees();
    } catch (err) {
      console.error("Error:", err);
      alert("Terjadi kesalahan saat memperbarui data.");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      department: "",
      role: "Karyawan",
      jabatan: "",
      gender: "",
      tanggal_lahir: "",
      bio: "",
    });
    setEditingEmployee(null);
    setShowForm(false);
  };

  const handleEditEmployee = (employee: Employee) => {
    setFormData({
      name: employee.name,
      email: employee.email,
      password: "",
      department: employee.department,
      role: employee.role === "admin" ? "Admin" : "Karyawan",
      jabatan: employee.jabatan || "",
      gender: employee.gender ? employee.gender.toLowerCase() : "",
      tanggal_lahir: employee.tanggal_lahir ? employee.tanggal_lahir.split("T")[0] : "",
      bio: employee.bio || "",
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
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 md:w-80"
            />
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Tambah Karyawan
          </button>
        </div>
      </div>

      {showForm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity"
          onClick={resetForm}
        >
          <div 
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >            
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingEmployee !== null ? "Edit Karyawan" : "Tambah Karyawan"}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingEmployee !== null ? "Ubah informasi data karyawan" : "Tambahkan akun karyawan baru ke sistem"}
                </p>
              </div>
              <button
                onClick={resetForm}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="max-h-[80vh] overflow-y-auto p-6 scrollbar-thin scrollbar-track-slate-50 scrollbar-thumb-slate-200">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Masukkan nama lengkap"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                {editingEmployee === null && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="email@perusahaan.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                {editingEmployee === null && (
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      placeholder="Minimal 6 karakter"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="department"
                    placeholder="Contoh: IT, HR, Marketing"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Jabatan / Posisi
                  </label>
                  <input
                    type="text"
                    name="jabatan"
                    placeholder="Contoh: Staff IT, Manager"
                    value={formData.jabatan}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div className="relative">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Jenis Kelamin
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-all hover:bg-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <span className="capitalize">
                      {formData.gender === "laki-laki" ? "Laki-laki" : formData.gender === "perempuan" ? "Perempuan" : "Pilih Gender"}
                    </span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isGenderDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isGenderDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setIsGenderDropdownOpen(false)}
                      ></div>
                      <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        {[
                          { label: "Laki-laki", value: "laki-laki" },
                          { label: "Perempuan", value: "perempuan" }
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ ...prev, gender: item.value }));
                              setIsGenderDropdownOpen(false);
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                              formData.gender === item.value
                                ? "bg-blue-50 font-medium text-blue-700"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    name="tanggal_lahir"
                    value={formData.tanggal_lahir}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {editingEmployee === null && (                              
                  <div className="relative">
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Role Sistem <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-all hover:bg-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                        <div className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                          {["Karyawan"].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, role: r }));
                                setIsRoleDropdownOpen(false);
                              }}
                              className={`w-full rounded-lg px-3 py-2 text-left text-sm capitalize transition-colors ${
                                formData.role === r
                                  ? "bg-blue-50 font-medium text-blue-700"
                                  : "text-slate-600 hover:bg-slate-50"
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
                
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Bio / Tentang Karyawan
                  </label>
                  <textarea
                    name="bio"
                    rows={3}
                    placeholder="Tuliskan sedikit bio atau latar belakang karyawan..."
                    value={formData.bio}
                    onChange={handleInputChange} 
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEmployee}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  {editingEmployee !== null ? "Update Data" : "Simpan Karyawan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-6 py-4 font-medium">Nama</th>
              <th className="px-6 py-4 font-medium">Department</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 text-right font-medium">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  Memuat data...
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  Belum ada data karyawan.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {employee.name}
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
                      className="mr-1 p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-800 rounded-md border border-slate-100 hover:border-slate-200"
                      title="Edit"
                    >
                      <SquarePen size={18}/>
                    </button>

                    <button
                      onClick={() => handleDeleteEmployee(employee.id)}
                      className="mr-2 p-2 text-red-600 hover:bg-blue-50 hover:text-red-800 rounded-md border border-slate-100 hover:border-slate-200"
                      title="Hapus"
                    >
                      <Trash size={18}/>
                    </button>

                    <button
                      onClick={() => handleViewEmployee(employee.id)}
                      className="rounded-md bg-slate-300 border border-slate-200 p-1 text-black hover:bg-slate-400"
                      title="Detail"
                    >
                      <Ellipsis size={18}/>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedEmployee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity"
          onClick={() => setSelectedEmployee(null)}
        >        
          <div
            className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >          
            <button
              onClick={() => setSelectedEmployee(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <X size={16}/>
            </button>
            
            <div className="flex flex-col items-center justify-center bg-slate-50 p-8 text-center md:w-2/5 md:border-r md:border-slate-200">
              <div className="mb-5">
                {selectedEmployee.photo_url ? (
                  <img
                    src={selectedEmployee.photo_url}
                    alt={`Foto ${selectedEmployee.full_name}`}
                    className="h-40 w-40 rounded-full border-4 border-white object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-full bg-blue-100 text-5xl font-bold text-blue-600">
                    {(
                      selectedEmployee.full_name ||
                      selectedEmployee.name ||
                      "?"
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900">
                {selectedEmployee.full_name || selectedEmployee.name || "-"}
              </h3>
                          
              <p className="mt-3 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700">
                {selectedEmployee.department || "No Department"}
              </p>
              
              <p className="mt-2 text-sm font-medium text-slate-500">
                {selectedEmployee.role}
              </p>
            </div>
            
            <div className="flex flex-col p-8 md:w-3/5">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  Informasi Detail
                </h2>
                <p className="text-sm text-slate-500">
                  Data lengkap karyawan
                </p>
              </div>

              <div className="flex-1 space-y-4">              
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{selectedEmployee.email || "-"}</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gender</p>
                    <p className="mt-1 text-sm font-medium capitalize text-slate-900">{selectedEmployee.gender || "-"}</p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal Lahir</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {selectedEmployee.tanggal_lahir
                        ? new Date(selectedEmployee.tanggal_lahir).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Jabatan</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{selectedEmployee.jabatan || "-"}</p>
                  </div>
                </div>
                
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bio / Tentang</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {selectedEmployee.bio || "Belum ada bio yang ditambahkan."}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">ID Karyawan</p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-600">
                    {selectedEmployee.id}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedEmployee(null)}
                className="mt-6 w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Tutup Profil
              </button>
            </div>
          </div>
        </div>    
      )}
    </div>
  );
}

export default Employees;