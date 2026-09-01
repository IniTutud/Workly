import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import { 
  ChevronDown,
  Eye,
  Plus,
  Search,
  Trash2,
  X,
  CheckCircle,
  CalendarDays,
  Users,
} from "lucide-react";

type PayrollStatus = "pending" | "paid";

type Payroll = {
  id: number;
  user_id: string;
  employee_name: string;
  period_month: number;
  period_year: number;
  basic_salary: number;
  allowance: number;
  deduction: number;
  net_salary: number;
  status: PayrollStatus;
  paid_at: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
};

type DropdownItem = {
  label: string;
  value: string | number;
};

type CustomDropdownProps = {
  label: string;
  value: string;
  placeholder: string;
  items: DropdownItem[];
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  onChange: (value: string) => void;
  searchable?: boolean; // Tambahan properti opsional untuk mengaktifkan search di dropdown
};

function CustomDropdown({
  label,
  value,
  placeholder,
  items,
  isOpen,
  setIsOpen,
  onChange,
  searchable = false,
}: CustomDropdownProps) {
  const [dropdownSearch, setDropdownSearch] = useState("");

  const selectedItem = items.find(
    (item) => String(item.value) === String(value)
  );

  const filteredItems = searchable
    ? items.filter((item) =>
        item.label.toLowerCase().includes(dropdownSearch.toLowerCase())
      )
    : items;

  return (
    <div className="relative">
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setDropdownSearch(""); // Reset search saat dropdown dibuka
        }}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-all hover:bg-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <span>
          {selectedItem ? selectedItem.label : placeholder}
        </span>

        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg flex flex-col">
            {searchable && (
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={dropdownSearch}
                    onChange={(e) => setDropdownSearch(e.target.value)}
                    placeholder="Cari..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-700 outline-none focus:border-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            <div className="overflow-y-auto max-h-48 p-1">
              {filteredItems.length === 0 ? (
                <div className="py-2 text-center text-xs text-slate-400">
                  Tidak ditemukan
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={String(item.value)}
                    type="button"
                    onClick={() => {
                      onChange(String(item.value));
                      setIsOpen(false);
                      setDropdownSearch("");
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      String(value) === String(item.value)
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Payroll() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1)
  );

  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear())
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // State filter status baru

  const [showForm, setShowForm] = useState(false);
  const [selectedPayroll, setSelectedPayroll] =
    useState<Payroll | null>(null);

  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false); // State dropdown filter status

  const [formData, setFormData] = useState({
    user_id: "",
    period_month: String(new Date().getMonth() + 1),
    period_year: String(new Date().getFullYear()),
    basic_salary: "",
    allowance: "",
    deduction: "",
  });

  const months: DropdownItem[] = [
    { label: "Januari", value: 1 },
    { label: "Februari", value: 2 },
    { label: "Maret", value: 3 },
    { label: "April", value: 4 },
    { label: "Mei", value: 5 },
    { label: "Juni", value: 6 },
    { label: "Juli", value: 7 },
    { label: "Agustus", value: 8 },
    { label: "September", value: 9 },
    { label: "Oktober", value: 10 },
    { label: "November", value: 11 },
    { label: "Desember", value: 12 },
  ];

  const years: DropdownItem[] = Array.from(
    { length: 5 },
    (_, index) => {
      const year = new Date().getFullYear() - 2 + index;

      return {
        label: String(year),
        value: year,
      };
    }
  );

  const statusOptions: DropdownItem[] = [
    { label: "Semua Status", value: "all" },
    { label: "Belum Dibayar (Pending)", value: "pending" },
    { label: "Sudah Dibayar (Paid)", value: "paid" },
  ];

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Gagal mengambil profiles:", error);
      return;
    }

    setProfiles(data || []);
  };

  const fetchPayrolls = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("payrolls")
      .select(
        "id, user_id, period_month, period_year, basic_salary, allowance, deduction, net_salary, status, paid_at, created_at"
      )
      .eq("period_month", Number(selectedMonth))
      .eq("period_year", Number(selectedYear))
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal mengambil payroll:", error);
      alert("Gagal mengambil data penggajian.");
      setLoading(false);
      return;
    }

    const profileMap = new Map<string, string>();

    profiles.forEach((profile) => {
      if (profile.id) {
        profileMap.set(
          profile.id,
          profile.full_name || "Nama tidak tersedia"
        );
      }
    });

    const formattedData: Payroll[] = (data || []).map((item: any) => {
      const employeeName =
        profileMap.get(item.user_id) ||
        "Karyawan tidak ditemukan";

      const status: PayrollStatus =
        item.status === "paid" ? "paid" : "pending";

      return {
        id: item.id,
        user_id: item.user_id,
        employee_name: employeeName,
        period_month: item.period_month,
        period_year: item.period_year,
        basic_salary: Number(item.basic_salary || 0),
        allowance: Number(item.allowance || 0),
        deduction: Number(item.deduction || 0),
        net_salary: Number(item.net_salary || 0),
        status,
        paid_at: item.paid_at,
        created_at: item.created_at,
      };
    });

    setPayrolls(formattedData);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    fetchPayrolls();
  }, [selectedMonth, selectedYear, profiles]);

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getMonthName = (month: number) => {
    return (
      months.find((item) => Number(item.value) === month)?.label ||
      "-"
    );
  };

  // Filter pencarian nama karyawan dan filter status
  const filteredPayrolls = payrolls.filter((payroll) => {
    const matchSearch = payroll.employee_name
      .toLowerCase()
      .includes(search.toLowerCase());
    
    const matchStatus =
      statusFilter === "all" ? true : payroll.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleGenerateBulkPayroll = async () => {
    const confirmed = window.confirm(
      `Generate otomatis data gaji untuk seluruh karyawan pada periode ${getMonthName(Number(selectedMonth))} ${selectedYear}? (Karyawan yang sudah ada datanya akan dilewati)`
    );

    if (!confirmed) return;
    setIsGenerating(true);

    try {
      const payrollInserts = profiles.map((profile) => ({
        user_id: profile.id,
        period_month: Number(selectedMonth),
        period_year: Number(selectedYear),
        basic_salary: 0,
        allowance: 0,
        deduction: 0,
        net_salary: 0,
        status: "pending",
        paid_at: null,
      }));

      const { error } = await supabase
        .from("payrolls")
        .upsert(payrollInserts, { onConflict: "user_id,period_month,period_year", ignoreDuplicates: true });

      if (error) throw error;

      alert("Berhasil men-generate data penggajian massal.");
      await fetchPayrolls();
    } catch (error: any) {
      console.error("Gagal generate massal:", error);
      alert(`Gagal generate data: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddPayroll = async () => {
    if (!formData.user_id) {
      alert("Pilih karyawan terlebih dahulu.");
      return;
    }

    if (!formData.basic_salary) {
      alert("Masukkan basic salary.");
      return;
    }

    const basicSalary = Number(formData.basic_salary) || 0;
    const allowance = Number(formData.allowance) || 0;
    const deduction = Number(formData.deduction) || 0;

    const netSalary =
      basicSalary + allowance - deduction;

    const { error } = await supabase
      .from("payrolls")
      .insert({
        user_id: formData.user_id,
        period_month: Number(formData.period_month),
        period_year: Number(formData.period_year),
        basic_salary: basicSalary,
        allowance: allowance,
        deduction: deduction,
        net_salary: netSalary,
        status: "pending",
        paid_at: null,
      });

    if (error) {
      console.error("Gagal menambahkan payroll:", error);

      if (error.code === "23505") {
        alert(
          "Payroll untuk karyawan dan periode tersebut sudah ada."
        );
      } else {
        alert("Gagal menambahkan data penggajian.");
      }

      return;
    }

    alert("Data penggajian berhasil ditambahkan.");

    setShowForm(false);

    setFormData({
      user_id: "",
      period_month: selectedMonth,
      period_year: selectedYear,
      basic_salary: "",
      allowance: "",
      deduction: "",
    });

    await fetchPayrolls();
  };

  const handleMarkAsPaid = async (id: number) => {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin menandai payroll ini sebagai sudah dibayar?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("payrolls")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Gagal mengubah status payroll:", error);
      alert("Gagal menandai payroll sebagai sudah dibayar.");
      return;
    }

    alert("Payroll berhasil ditandai sebagai sudah dibayar.");

    setSelectedPayroll(null);

    await fetchPayrolls();
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Apakah kamu yakin ingin menghapus data payroll ini?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("payrolls")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Gagal menghapus payroll:", error);
      alert("Gagal menghapus data payroll.");
      return;
    }

    alert("Data payroll berhasil dihapus.");

    setSelectedPayroll(null);

    await fetchPayrolls();
  };

  const resetForm = () => {
    setFormData({
      user_id: "",
      period_month: selectedMonth,
      period_year: selectedYear,
      basic_salary: "",
      allowance: "",
      deduction: "",
    });
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Penggajian
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Kelola data penggajian karyawan
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm md:flex-row md:items-end">
        <div className="w-full md:w-36">
          <CustomDropdown
            label="Bulan"
            value={selectedMonth}
            placeholder="Pilih Bulan"
            items={months}
            isOpen={isMonthOpen}
            setIsOpen={setIsMonthOpen}
            onChange={setSelectedMonth}
          />
        </div>

        <div className="w-full md:w-28">
          <CustomDropdown
            label="Tahun"
            value={selectedYear}
            placeholder="Pilih Tahun"
            items={years}
            isOpen={isYearOpen}
            setIsOpen={setIsYearOpen}
            onChange={setSelectedYear}
          />
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerateBulkPayroll}
            className="flex items-center justify-center gap-2 rounded-xl border border-blue-600 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
          >
            <Users size={18} />
            {isGenerating ? "Memproses..." : "Generate Gaji Massal"}
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Tambah Penggajian
          </button>
        </div>
      </div>
      
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama karyawan..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="w-full md:w-56">
          <CustomDropdown
            label=""
            value={statusFilter}
            placeholder="Filter Status"
            items={statusOptions}
            isOpen={isStatusFilterOpen}
            setIsOpen={setIsStatusFilterOpen}
            onChange={setStatusFilter}
          />
        </div>
      </div>
      
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="max-h-[65vh] overflow-y-auto scrollbar-thin">
          <table className="w-full min-w-212.5 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-semibold">
                  Karyawan
                </th>

                <th className="px-6 py-4 font-semibold">
                  Basic Salary
                </th>

                <th className="px-6 py-4 font-semibold">
                  Net Salary
                </th>

                <th className="px-6 py-4 font-semibold">
                  Status
                </th>

                <th className="px-6 py-4 text-right font-semibold">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    Memuat data penggajian...
                  </td>
                </tr>
              ) : filteredPayrolls.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    Belum ada data penggajian.
                  </td>
                </tr>
              ) : (
                filteredPayrolls.map((payroll) => (
                  <tr
                    key={payroll.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {payroll.employee_name}
                      </div>

                      <div className="mt-1 text-xs text-slate-400">
                        {getMonthName(payroll.period_month)}{" "}
                        {payroll.period_year}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {formatRupiah(payroll.basic_salary)}
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {formatRupiah(payroll.net_salary)}
                    </td>

                    <td className="px-6 py-4">
                      {payroll.status === "paid" ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                          Sudah Dibayar
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                          Belum Dibayar
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {payroll.status === "pending" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleMarkAsPaid(payroll.id)
                            }
                            title="Tandai Sudah Dibayar"
                            className="flex h-9 items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 text-xs font-medium text-green-600 transition hover:bg-green-100"
                          >
                            <CheckCircle size={15} />
                            <span>Bayar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPayroll(payroll)
                          }
                          title="Detail"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-blue-600 transition hover:bg-blue-50"
                        >
                          <Eye size={16} />
                        </button>        

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(payroll.id)
                          }
                          title="Hapus"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-500 transition hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Tambah Penggajian
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Masukkan data penggajian karyawan
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <CustomDropdown
                  label="Karyawan"
                  value={formData.user_id}
                  placeholder="Pilih atau cari karyawan..."
                  searchable={true}
                  items={profiles.map((profile) => ({
                    label:
                      profile.full_name ||
                      "Nama tidak tersedia",
                    value: profile.id,
                  }))}
                  isOpen={isEmployeeOpen}
                  setIsOpen={setIsEmployeeOpen}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      user_id: value,
                    }))
                  }
                />
              </div>

              <CustomDropdown
                label="Bulan"
                value={formData.period_month}
                placeholder="Pilih Bulan"
                items={months}
                isOpen={isMonthOpen}
                setIsOpen={setIsMonthOpen}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    period_month: value,
                  }))
                }
              />

              <CustomDropdown
                label="Tahun"
                value={formData.period_year}
                placeholder="Pilih Tahun"
                items={years}
                isOpen={isYearOpen}
                setIsOpen={setIsYearOpen}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    period_year: value,
                  }))
                }
              />

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Basic Salary
                </label>

                <input
                  type="number"
                  min="0"
                  value={formData.basic_salary}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      basic_salary: e.target.value,
                    }))
                  }
                  placeholder="Contoh: 5000000"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Allowance
                </label>

                <input
                  type="number"
                  min="0"
                  value={formData.allowance}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      allowance: e.target.value,
                    }))
                  }
                  placeholder="Contoh: 500000"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Deduction
                </label>

                <input
                  type="number"
                  min="0"
                  value={formData.deduction}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deduction: e.target.value,
                    }))
                  }
                  placeholder="Contoh: 200000"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">
                  Estimasi Net Salary
                </span>

                <span className="text-lg font-semibold text-slate-900">
                  {formatRupiah(
                    (Number(formData.basic_salary) || 0) +
                      (Number(formData.allowance) || 0) -
                      (Number(formData.deduction) || 0)
                  )}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleAddPayroll}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Simpan Penggajian
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPayroll && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedPayroll(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Detail Penggajian
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Informasi lengkap penggajian karyawan
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPayroll(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-5 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <CalendarDays size={20} />
                </div>

                <div>
                  <p className="font-semibold text-slate-900">
                    {selectedPayroll.employee_name}
                  </p>

                  <p className="text-sm text-slate-500">
                    {getMonthName(
                      selectedPayroll.period_month
                    )}{" "}
                    {selectedPayroll.period_year}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Basic Salary
                </span>

                <span className="font-medium text-slate-900">
                  {formatRupiah(
                    selectedPayroll.basic_salary
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Allowance
                </span>

                <span className="font-medium text-green-600">
                  + {formatRupiah(selectedPayroll.allowance)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Deduction
                </span>

                <span className="font-medium text-red-500">
                  - {formatRupiah(selectedPayroll.deduction)}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">
                    Net Salary
                  </span>

                  <span className="text-xl font-bold text-slate-900">
                    {formatRupiah(
                      selectedPayroll.net_salary
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-500">
                  Status
                </span>

                {selectedPayroll.status === "paid" ? (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    Sudah Dibayar
                  </span>
                ) : (
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                    Belum Dibayar
                  </span>
                )}
              </div>

              {selectedPayroll.status === "paid" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Dibayar Pada
                  </span>

                  <span className="text-sm font-medium text-slate-700">
                    {formatDate(selectedPayroll.paid_at)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-7 flex justify-end gap-3">
              {selectedPayroll.status === "pending" && (
                <button
                  type="button"
                  onClick={() =>
                    handleMarkAsPaid(selectedPayroll.id)
                  }
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  <CheckCircle size={17} />
                  Tandai Sudah Dibayar
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedPayroll(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payroll;