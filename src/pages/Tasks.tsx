import { useEffect, useMemo, useState } from "react";
import { supabase } from "../utils/supabase";
import {
  getTaskDisplayStatus,
  isSubmissionLate,
  type TaskStatus,
} from "../utils/taskStatus";
import {
  Search,
  Plus,
  Eye,
  CheckCircle,
  X,
  FileText,
  RotateCcw,
  Calendar,
  User,
  Clock,
  ChevronDown,
} from "lucide-react";

type Employee = {
  id: string;
  full_name: string;
  photo_url: string | null;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  created_by: string;
  start_date: string;
  due_date: string;
  status: TaskStatus;
};

type TaskSubmission = {
  id: string;
  task_id: string;
  submitted_by: string;
  submission_note: string | null;
  file_url: string | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  status: "submitted" | "approved" | "revision";
};

const formatDate = (date: string) => {
  if (!date) return "-";

  return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date: string) => {
  if (!date) return "-";

  return new Date(date).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<TaskSubmission | null>(null);

  const [reviewComment, setReviewComment] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to: "",
    start_date: "",
    due_date: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Reset ke halaman 1 setiap kali filter atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [tasksResult, employeesResult, submissionsResult] =
        await Promise.all([
          supabase
            .from("tasks")
            .select("*")
            .order("due_date", { ascending: true }),

          supabase
            .from("profiles")
            .select("id, full_name, photo_url")
            .order("full_name", { ascending: true }),

          supabase
            .from("task_submissions")
            .select("*")
            .order("submitted_at", { ascending: false }),
        ]);

      if (tasksResult.error) throw tasksResult.error;
      if (employeesResult.error) throw employeesResult.error;
      if (submissionsResult.error) throw submissionsResult.error;

      setTasks(tasksResult.data || []);
      setEmployees(employeesResult.data || []);
      setSubmissions(submissionsResult.data || []);
    } catch (error) {
      console.error("Gagal mengambil data task:", error);
      alert("Gagal mengambil data tugas.");
    } finally {
      setLoading(false);
    }
  };

  const employeeMap = useMemo(() => {
    return Object.fromEntries(
      employees.map((employee) => [
        employee.id,
        employee.full_name,
      ])
    );
  }, [employees]);

  const employeePhotoMap = useMemo(() => {
    return Object.fromEntries(
      employees.map((employee) => [
        employee.id,
        employee.photo_url,
      ])
    );
  }, [employees]);

  const filteredEmployeesForDropdown = useMemo(() => {
    return employees.filter((employee) =>
      employee.full_name.toLowerCase().includes(employeeSearch.toLowerCase())
    );
  }, [employees, employeeSearch]);

  const getLatestSubmission = (taskId: string) => {
    return submissions.find(
      (submission) => submission.task_id === taskId
    );
  };

  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      const employeeName =
        employeeMap[task.assigned_to] ||
        "Karyawan tidak ditemukan";

      const matchesSearch =
        task.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        employeeName
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    const statusPriority: Record<string, number> = {
      waiting_review: 1,
      assigned: 2,
      revision: 3,
      approved: 4,
    };

    return filtered.sort((a, b) => {
      const priorityA = statusPriority[a.status] || 99;
      const priorityB = statusPriority[b.status] || 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [tasks, employeeMap, search, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTasks.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + rowsPerPage);

  const stats = useMemo(() => {
    return {
      waitingReview: tasks.filter(
        (task) => task.status === "waiting_review"
      ).length,
    };
  }, [tasks]);

  const handleCreateTask = async () => {
    if (
      !formData.title ||
      !formData.assigned_to ||
      !formData.start_date ||
      !formData.due_date
    ) {
      alert(
        "Judul, karyawan, tanggal mulai, dan deadline wajib diisi."
      );
      return;
    }

    if (formData.due_date < formData.start_date) {
      alert("Deadline tidak boleh sebelum tanggal mulai.");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("User tidak ditemukan.");
        return;
      }

      const { error } = await supabase.from("tasks").insert({
        title: formData.title,
        description: formData.description || null,
        assigned_to: formData.assigned_to,
        created_by: user.id,
        start_date: formData.start_date,
        due_date: formData.due_date,
        status: "assigned",
      });

      if (error) throw error;

      alert("Tugas berhasil dibuat.");

      setFormData({
        title: "",
        description: "",
        assigned_to: "",
        start_date: "",
        due_date: "",
      });
      setEmployeeSearch("");

      setShowCreateModal(false);

      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal membuat tugas.");
    }
  };

  const openDetail = (task: Task) => {
    setSelectedTask(task);
    setSelectedSubmission(getLatestSubmission(task.id) || null);
    setShowDetailModal(true);
  };

  const openRevision = (task: Task) => {
    setSelectedTask(task);
    setSelectedSubmission(getLatestSubmission(task.id) || null);
    setReviewComment("");
    setShowRevisionModal(true);
  };

  const handleApprove = async (task: Task) => {
    const submission = getLatestSubmission(task.id);

    if (!submission) {
      alert("Belum ada submission dari karyawan.");
      return;
    }

    if (!confirm("Yakin ingin menyetujui tugas ini?")) {
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("User tidak ditemukan.");
        return;
      }

      const { error: taskError } = await supabase
        .from("tasks")
        .update({
          status: "approved",
        })
        .eq("id", task.id);

      if (taskError) throw taskError;

      const { error: submissionError } = await supabase
        .from("task_submissions")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", submission.id);

      if (submissionError) throw submissionError;

      alert("Tugas berhasil disetujui.");

      setShowDetailModal(false);
      setSelectedTask(null);
      setSelectedSubmission(null);

      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal menyetujui tugas.");
    }
  };

  const handleRevision = async () => {
    if (!selectedTask || !selectedSubmission) {
      return;
    }

    if (!reviewComment.trim()) {
      alert("Komentar revisi wajib diisi.");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("User tidak ditemukan.");
        return;
      }

      const { error: taskError } = await supabase
        .from("tasks")
        .update({
          status: "revision",
        })
        .eq("id", selectedTask.id);

      if (taskError) throw taskError;

      const { error: submissionError } = await supabase
        .from("task_submissions")
        .update({
          status: "revision",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_comment: reviewComment.trim(),
        })
        .eq("id", selectedSubmission.id);

      if (submissionError) throw submissionError;

      alert("Tugas dikembalikan untuk revisi.");

      setShowRevisionModal(false);
      setSelectedTask(null);
      setSelectedSubmission(null);
      setReviewComment("");

      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Gagal meminta revisi.");
    }
  };

  const statusLabels: Record<string, string> = {
    all: "Semua Status",
    assigned: "Assigned",
    waiting_review: "Waiting Review",
    revision: "Revision",
    approved: "Approved",
  };

  return (
    <div className="min-h-screen">      
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            To Do List
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Kelola tugas dan review pekerjaan karyawan dengan cepat dan terstruktur.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm"
        >
          <Plus size={18} />
          Tambah Tugas
        </button>
      </div>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3">
        <div
          className="rounded-2xl p-6 border flex items-center justify-between shadow-xs bg-white border-slate-200"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pekerjaan Masuk
            </p>

            <p className="text-xl font-bold text-slate-900 mt-1">
              Menunggu Review
            </p>

            <p className="text-xs text-slate-500 mt-0.5">
              Tugas yang perlu diperiksa dan disetujui
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 text-2xl font-bold">
            {stats.waitingReview}
          </div>
        </div>
      </div>
      
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-96">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Cari tugas atau nama karyawan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
          />
        </div>

        <div className="relative w-full md:w-56">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs"
          >
            <span>{statusLabels[statusFilter] || "Pilih Status"}</span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute right-0 left-0 top-full mt-1.5 z-30 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {Object.entries(statusLabels).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(value);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${
                      statusFilter === value ? "font-semibold text-blue-600 bg-blue-50/50" : "text-slate-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-225 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 shadow-sm border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">
                  Tugas
                </th>

                <th className="px-6 py-4 font-semibold">
                  Karyawan
                </th>

                <th className="px-6 py-4 font-semibold">
                  Deadline
                </th>

                <th className="px-6 py-4 font-semibold">
                  Status
                </th>

                <th className="px-6 py-4 font-semibold">
                  Submission
                </th>

                <th className="px-6 py-4 text-right font-semibold">
                  Aksi Cepat
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    Memuat data...
                  </td>
                </tr>
              ) : paginatedTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    Belum ada tugas.
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => {
                  const displayStatus = getTaskDisplayStatus(
                    task.status,
                    task.due_date
                  );

                  const submission = getLatestSubmission(task.id);

                  const late =
                    submission &&
                    isSubmissionLate(
                      submission.submitted_at,
                      task.due_date
                    );

                  return (
                    <tr
                      key={task.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">
                          {task.title}
                        </p>

                        {task.description && (
                          <p className="mt-1 text-xs text-slate-400 max-w-xs truncate">
                            {task.description}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {employeeMap[task.assigned_to] ||
                          "Karyawan tidak ditemukan"}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(task.due_date)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${displayStatus.className}`}
                        >
                          {displayStatus.label}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {submission ? (
                          <div className="space-y-1">
                            <p className="text-xs text-slate-500">
                              {formatDateTime(
                                submission.submitted_at
                              )}
                            </p>

                            {late && (
                              <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                                Telat Submit
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Belum submit
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openDetail(task)}
                            title="Detail"
                            className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 shadow-sm"
                          >
                            <Eye size={15} />
                            <span>Detail</span>
                          </button>

                          {task.status === "waiting_review" &&
                            submission && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleApprove(task)
                                  }
                                  title="Approve"
                                  className="flex h-9 items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 text-xs font-medium text-green-700 transition hover:bg-green-100 shadow-sm"
                                >
                                  <CheckCircle size={15} />
                                  <span>Approve</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openRevision(task)
                                  }
                                  title="Revisi"
                                  className="flex h-9 items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 text-xs font-medium text-orange-700 transition hover:bg-orange-100 shadow-sm"
                                >
                                  <RotateCcw size={15} />
                                  <span>Revisi</span>
                                </button>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION CONTROLS */}
      {!loading && filteredTasks.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-white px-5 py-3 shadow-sm border border-slate-200">
          <p className="text-xs text-slate-500">
            Menampilkan <span className="font-medium text-slate-700">{startIndex + 1}</span> - <span className="font-medium text-slate-700">{Math.min(startIndex + rowsPerPage, filteredTasks.length)}</span> dari <span className="font-medium text-slate-700">{filteredTasks.length}</span> tugas
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="text-xs font-medium text-slate-600">
              Hal. {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
      
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Tambah Tugas
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Berikan tugas baru kepada karyawan
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Judul Tugas
                </label>

                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      title: e.target.value,
                    })
                  }
                  placeholder="Contoh: Membuat laporan proyek"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Karyawan
                </label>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
                  >
                    <span>
                      {formData.assigned_to
                        ? employeeMap[formData.assigned_to] || "Pilih karyawan"
                        : "Pilih karyawan"}
                    </span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isEmployeeDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isEmployeeDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsEmployeeDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-30 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                        <div className="relative mb-2">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Cari nama karyawan..."
                            value={employeeSearch}
                            onChange={(e) => setEmployeeSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white"
                          />
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {filteredEmployeesForDropdown.length === 0 ? (
                            <p className="px-3 py-2 text-center text-xs text-slate-400 italic">Karyawan tidak ditemukan</p>
                          ) : (
                            filteredEmployeesForDropdown.map((employee) => (
                              <button
                                key={employee.id}
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    assigned_to: employee.id,
                                  });
                                  setIsEmployeeDropdownOpen(false);
                                  setEmployeeSearch("");
                                }}
                                className={`w-full rounded-lg px-3 py-2 text-left text-xs transition hover:bg-slate-50 ${
                                  formData.assigned_to === employee.id ? "font-semibold text-blue-600 bg-blue-50/60" : "text-slate-700"
                                }`}
                              >
                                {employee.full_name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Deskripsi
                </label>

                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Jelaskan tugas..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Tanggal Mulai
                  </label>

                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        start_date: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Deadline
                  </label>

                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        due_date: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEmployeeSearch("");
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleCreateTask}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Buat Tugas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showDetailModal && selectedTask && (
        <div
          className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity overflow-y-auto"
          onClick={() => {
            setShowDetailModal(false);
            setSelectedTask(null);
            setSelectedSubmission(null);
          }}
        >
          <div
            className="relative flex w-full max-w-4xl max-h-[90vh] flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl md:flex-row my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowDetailModal(false);
                setSelectedTask(null);
                setSelectedSubmission(null);
              }}
              className="absolute right-4 top-4 z-10 rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <X size={16} />
            </button>
            
            <div className="flex flex-col items-center justify-center bg-slate-50 p-8 text-center md:w-2/5 md:border-r md:border-slate-200">
              {employeePhotoMap[selectedTask.assigned_to] ? (
                <img
                  src={employeePhotoMap[selectedTask.assigned_to] || ""}
                  alt={
                    employeeMap[selectedTask.assigned_to] ||
                    "Karyawan"
                  }
                  className="h-24 w-24 rounded-full object-cover mb-4 shadow-inner border-4 border-white"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-600 mb-4 shadow-inner">
                  {employeeMap[
                    selectedTask.assigned_to
                  ]?.charAt(0).toUpperCase() || (
                    <User size={36} />
                  )}
                </div>
              )}

              <h3 className="text-xl font-bold text-slate-900">
                {employeeMap[selectedTask.assigned_to] ||
                  "Karyawan"}
              </h3>

              <p className="text-xs text-slate-400 mt-0.5">
                Penanggung Jawab Tugas
              </p>

              <div className="mt-5">
                {(() => {
                  const status = getTaskDisplayStatus(
                    selectedTask.status,
                    selectedTask.due_date
                  );

                  return (
                    <span
                      className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  );
                })()}
              </div>

              <div className="mt-6 w-full border-t border-slate-200/80 pt-5 text-left space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar
                    size={14}
                    className="text-slate-400"
                  />

                  <span>
                    Mulai:{" "}
                    <strong className="text-slate-700">
                      {formatDate(selectedTask.start_date)}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock
                    size={14}
                    className="text-slate-400"
                  />

                  <span>
                    Deadline:{" "}
                    <strong className="text-slate-700">
                      {formatDate(selectedTask.due_date)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col p-8 md:w-3/5 justify-between">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedTask.title}
                  </h2>

                  <p className="text-xs text-slate-400 mt-1">
                    Judul Tugas
                  </p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Deskripsi Tugas
                  </p>

                  <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {selectedTask.description ||
                      "Tidak ada deskripsi yang ditambahkan."}
                  </p>
                </div>
                
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center justify-between">
                    <span>Submission Karyawan</span>

                    {selectedSubmission &&
                      isSubmissionLate(
                        selectedSubmission.submitted_at,
                        selectedTask.due_date
                      ) && (
                        <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                          Telat Submit
                        </span>
                      )}
                  </h3>

                  {!selectedSubmission ? (
                    <p className="text-xs text-slate-400 italic">
                      Karyawan belum mengumpulkan submission.
                    </p>
                  ) : (
                    <div className="space-y-3 pt-1 text-sm">
                      <div className="flex justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
                        <span>
                          Waktu Pengumpulan:
                        </span>

                        <span className="font-medium text-slate-700">
                          {formatDateTime(
                            selectedSubmission.submitted_at
                          )}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">
                          Catatan Karyawan:
                        </p>

                        <p className="text-slate-700 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {selectedSubmission.submission_note ||
                            "-"}
                        </p>
                      </div>

                      {selectedSubmission.file_url && (
                        <a
                          href={selectedSubmission.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 w-full justify-center"
                        >
                          <FileText size={14} />
                          <span>
                            Lihat File Submission
                          </span>
                        </a>
                      )}

                      {selectedSubmission.review_comment && (
                        <div className="pt-2">
                          <p className="text-xs font-medium text-slate-400">
                            Komentar Reviewer:
                          </p>

                          <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap bg-orange-50/50 border border-orange-100 p-2.5 rounded-lg">
                            {selectedSubmission.review_comment}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                {selectedTask.status ===
                  "waiting_review" &&
                selectedSubmission ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleApprove(selectedTask)
                      }
                      className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-green-700 shadow-sm"
                    >
                      <CheckCircle size={16} />
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowDetailModal(false);
                        openRevision(selectedTask);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-orange-600 shadow-sm"
                    >
                      <RotateCcw size={16} />
                      <span>Minta Revisi</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setShowDetailModal(false)
                    }
                    className="rounded-xl bg-slate-200 px-6 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-300"
                  >
                    Tutup
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showRevisionModal && selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => {
            setShowRevisionModal(false);
            setReviewComment("");
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Minta Revisi
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Berikan catatan revisi untuk pekerjaan karyawan
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowRevisionModal(false);
                  setReviewComment("");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Tugas
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedTask.title}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Komentar Revisi
                </label>

                <textarea
                  rows={5}
                  value={reviewComment}
                  onChange={(e) =>
                    setReviewComment(e.target.value)
                  }
                  placeholder="Jelaskan bagian yang perlu diperbaiki..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowRevisionModal(false)
                  }
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleRevision}
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 shadow-sm"
                >
                  Kirim Revisi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}