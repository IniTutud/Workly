import {
  Users,
  CircleCheck,
  CalendarDays,
  Clock,
  ChevronDown,
  User,
  X,
  Camera,
  RotateCw,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../utils/supabase";
import { Link, useNavigate } from "react-router-dom";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

type Attendance = {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  status: "present" | "late" | "absent";
  profile?: {
    full_name: string;
  } | null;
};

type Leave = {
  id: string;
  user_id: string;
  start_date?: string;
  end_date?: string;
  status: "pending" | "approved" | "rejected";
  profile?: {
    full_name: string;
  } | null;
};

type WeeklyChartData = {
  dayName: string;
  dateStr: string;
  count: number;
};

function Dashboard() {
  const navigate = useNavigate();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isOverviewDropdownOpen, setIsOverviewDropdownOpen] = useState(false);
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const [timeRange, setTimeRange] = useState("This Week");

  const [totalEmployees, setTotalEmployees] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [lateToday, setLateToday] = useState(0);

  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [pendingLeaveData, setPendingLeaveData] = useState<Leave[]>([]);
  const [weeklyChartData, setWeeklyChartData] = useState<WeeklyChartData[]>([]);

  const [adminName, setAdminName] = useState("Admin HR");
  const [adminRole, setAdminRole] = useState("Administrator");
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [adminBio, setAdminBio] = useState("");
  const [adminId, setAdminId] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminGender, setAdminGender] = useState("");
  const [adminTanggalLahir, setAdminTanggalLahir] = useState("");
  const [adminJabatan, setAdminJabatan] = useState("");
  const [adminDepartment, setAdminDepartment] = useState("");
  const [adminPhotoPath, setAdminPhotoPath] = useState("");
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editJabatan, setEditJabatan] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editTanggalLahir, setEditTanggalLahir] = useState("");

  const [editAvatarBlob, setEditAvatarBlob] = useState<Blob | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [loading, setLoading] = useState(true);

  // State untuk Crop & Rotate Foto
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotate, setRotate] = useState(0);
  const [showCropperModal, setShowCropperModal] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [timeRange]);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      await Promise.all([
        getAdminProfile(),
        getTotalEmployees(),
        getPresentToday(),
        getPendingLeaves(),
        getLateToday(),
        getRecentAttendance(),
        getPendingLeaveData(),
        getWeeklyAttendance(timeRange),
      ]);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAdminProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("Tidak ada user yang sedang login!");
      return;
    }
    setAdminId(user.id);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error mengambil profile admin dari Supabase:", error.message);
      return;
    }

    if (data) {
      setAdminName(data.full_name || data.name || data.nama || "Admin HR");
      setAdminRole(data.role === "admin" ? "Administrator" : data.role);
      setAdminBio(data.bio || "");
      setAdminEmail(data.email || user.email || "");
      setAdminGender(data.gender || "");
      setAdminTanggalLahir(data.tanggal_lahir || "");
      setAdminJabatan(data.jabatan || "");
      setAdminDepartment(data.department || "");
      setAdminPhotoPath(data.photo_url || "");

      setEditName(data.full_name || data.name || data.nama || "");
      setEditBio(data.bio || "");
      setEditJabatan(data.jabatan || "");
      setEditDepartment(data.department || "");
      setEditGender(data.gender || "");
      setEditTanggalLahir(data.tanggal_lahir || "");

      if (data.photo_url) {
        if (data.photo_url.startsWith("http")) {
          setAdminAvatar(data.photo_url);
        } else {
          const { data: signed } = await supabase.storage
            .from("attendance_photos")
            .createSignedUrl(data.photo_url, 3600);
          if (signed) setAdminAvatar(signed.signedUrl);
        }
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId) return;

    try {
      setSavingProfile(true);
      let newPhotoPath = adminPhotoPath;

      if (editAvatarBlob) {
        const fileName = `${adminId}_${Date.now()}.jpg`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("attendance_photos")
          .upload(filePath, editAvatarBlob, { upsert: true, contentType: "image/jpeg" });

        if (uploadError) throw uploadError;
        newPhotoPath = filePath;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName,
          bio: editBio,
          jabatan: editJabatan,
          department: editDepartment,
          gender: editGender,
          tanggal_lahir: editTanggalLahir || null,
          photo_url: newPhotoPath,
        })
        .eq("id", adminId);

      if (error) throw error;

      setAdminName(editName);
      setAdminBio(editBio);
      setAdminJabatan(editJabatan);
      setAdminDepartment(editDepartment);
      setAdminGender(editGender);
      setAdminTanggalLahir(editTanggalLahir);
      setAdminPhotoPath(newPhotoPath);

      if (editAvatarPreview) {
        setAdminAvatar(editAvatarPreview);
      }

      setEditAvatarBlob(null);
      setEditAvatarPreview(null);
      setModalMode("view");
      alert("Profil berhasil diperbarui!");
    } catch (err) {
      console.error("Gagal update profil:", err);
      alert("Terjadi kesalahan saat memperbarui profil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImgSrc(reader.result?.toString() || "");
        setRotate(0);
        setShowCropperModal(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height
    );
    setCrop(initialCrop);
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop) return;

    try {
      const image = imgRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2d context");

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;

      ctx.imageSmoothingQuality = "high";

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );

      ctx.restore();

      canvas.toBlob((blob) => {
        if (!blob) throw new Error("Gagal memproses gambar");
        const previewUrl = URL.createObjectURL(blob);
        setEditAvatarBlob(blob);
        setEditAvatarPreview(previewUrl);
        setShowCropperModal(false);
        setImgSrc("");
      }, "image/jpeg");

    } catch (err) {
      console.error("Gagal crop foto:", err);
      alert("Gagal memotong foto.");
    }
  };

  const getTotalEmployees = async () => {
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "karyawan");

    if (error) return;
    setTotalEmployees(count ?? 0);
  };

  const getPresentToday = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("attendances")
      .select("id")
      .gte("clock_in", `${today} 00:00:00`)
      .lte("clock_in", `${today} 23:59:59`);
    setPresentToday(data?.length ?? 0);
  };

  const getPendingLeaves = async () => {
    const { count } = await supabase
      .from("leaves")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    setPendingLeaves(count ?? 0);
  };

  const getLateToday = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("attendances")
      .select("id", { count: "exact", head: true })
      .eq("status", "late")
      .gte("clock_in", `${today} 00:00:00`)
      .lte("clock_in", `${today} 23:59:59`);
    setLateToday(count ?? 0);
  };

  const getWeeklyAttendance = async (range: string) => {
    const currDate = new Date();
    const firstDayOfWeek = new Date(currDate);
    const day = currDate.getDay();
    const diff = currDate.getDate() - day + (day === 0 ? -6 : 1);
    firstDayOfWeek.setDate(diff);

    if (range === "Last Week") {
      firstDayOfWeek.setDate(firstDayOfWeek.getDate() - 7);
    }

    const weekDays: WeeklyChartData[] = [];
    const daysNameList = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(firstDayOfWeek);
      d.setDate(firstDayOfWeek.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getDate()).padStart(2, "0");
      weekDays.push({
        dayName: daysNameList[i],
        dateStr: `${year}-${month}-${dayStr}`,
        count: 0,
      });
    }

    const { data } = await supabase
      .from("attendances")
      .select("clock_in")
      .gte("clock_in", `${weekDays[0].dateStr} 00:00:00`)
      .lte("clock_in", `${weekDays[6].dateStr} 23:59:59`);

    const mappedData = weekDays.map((item) => {
      const totalOnThisDay = (data || []).filter((att: any) =>
        att.clock_in.startsWith(item.dateStr)
      ).length;
      return { ...item, count: totalOnThisDay };
    });

    setWeeklyChartData(mappedData);
  };

  const getRecentAttendance = async () => {
    const { data } = await supabase
      .from("attendances")
      .select("id, user_id, clock_in, clock_out, status, profiles(full_name)")
      .order("clock_in", { ascending: false })
      .limit(5);

    const formattedData = (data || []).map((item: any) => ({
      ...item,
      profile: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
    }));
    setRecentAttendance(formattedData);
  };

  const getPendingLeaveData = async () => {
    const { data } = await supabase
      .from("leaves")
      .select("id, user_id, start_date, end_date, status, profiles(full_name)")
      .eq("status", "pending")
      .order("start_date", { ascending: true })
      .limit(3);

    const formattedData = (data || []).map((item: any) => ({
      ...item,
      profile: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
    }));
    setPendingLeaveData(formattedData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.replace("/login");
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "present": return "Hadir";
      case "late": return "Terlambat";
      case "absent": return "Tidak Hadir";
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "present": return "bg-green-100 text-green-700";
      case "late": return "bg-yellow-100 text-yellow-700";
      case "absent": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const maxCount = Math.max(...weeklyChartData.map((d) => d.count), 5);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-200"
          >
            {adminAvatar ? (
              <img
                src={adminAvatar}
                alt="Admin Avatar"
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                {adminName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-800">{adminName}</p>
              <p className="text-xs text-slate-500">{adminRole}</p>
            </div>
            <span className="text-xs text-slate-400">▼</span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg space-y-1">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  setModalMode("view");
                  setIsProfileModalOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
              >
                <User size={16} /> Profil Saya
              </button>
              <button
                onClick={handleLogout}
                className="w-full rounded-md bg-red-50 px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>
      
      {showCropperModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Sesuaikan Foto Profil</h3>
              <button
                onClick={() => setShowCropperModal(false)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center max-h-[60vh] overflow-auto">
              {imgSrc && (
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    src={imgSrc}
                    alt="Upload preview"
                    onLoad={onImageLoad}
                    style={{ transform: `rotate(${rotate}deg)`, maxHeight: "400px" }}
                  />
                </ReactCrop>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setRotate((prev) => (prev + 90) % 360)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <RotateCw size={16} /> Putar 90°
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCropperModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCropComplete}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isProfileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity overflow-y-auto"
          onClick={() => {
            setIsProfileModalOpen(false);
            setModalMode("view");
          }}
        >
          <div
            className="relative flex w-full max-w-4xl max-h-[90vh] flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl md:flex-row my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setIsProfileModalOpen(false);
                setModalMode("view");
              }}
              className="absolute right-4 top-4 z-10 rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <X size={16} />
            </button>
            
            <div className="flex flex-col items-center justify-center bg-slate-50 p-8 text-center md:w-2/5 md:border-r md:border-slate-200">
              <div className="mb-5 relative group">
                {(editAvatarPreview || adminAvatar) ? (
                  <img
                    src={editAvatarPreview || adminAvatar || ""}
                    alt={`Foto ${adminName}`}
                    className="h-40 w-40 rounded-full border-4 border-white object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-full bg-blue-100 text-5xl font-bold text-blue-600">
                    {adminName.charAt(0).toUpperCase()}
                  </div>
                )}
                {modalMode === "edit" && (
                  <label className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera size={24} />
                    <span className="text-xs mt-1">Ganti Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onSelectFile}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <h3 className="text-2xl font-bold text-slate-900">{adminName}</h3>

              <p className="mt-3 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-semibold text-blue-700">
                {adminDepartment || "No Department"}
              </p>

              <p className="mt-2 text-sm font-medium text-slate-500">
                {adminRole}
              </p>
            </div>
            
            <div className="flex flex-col p-8 md:w-3/5">
              {modalMode === "view" ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Informasi Detail</h2>
                    <p className="text-sm text-slate-500">Data lengkap akun yang sedang login</p>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{adminEmail || "-"}</p>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gender</p>
                        <p className="mt-1 text-sm font-medium capitalize text-slate-900">{adminGender || "-"}</p>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal Lahir</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {adminTanggalLahir
                            ? new Date(adminTanggalLahir).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Jabatan</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{adminJabatan || "-"}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bio / Tentang</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">
                        {adminBio || "Belum ada bio yang ditambahkan."}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">ID Pengguna</p>
                      <p className="mt-1 break-all font-mono text-xs text-slate-600">
                        {adminId || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => {
                        setEditName(adminName);
                        setEditBio(adminBio);
                        setEditJabatan(adminJabatan);
                        setEditDepartment(adminDepartment);
                        setEditGender(adminGender);
                        setEditTanggalLahir(adminTanggalLahir);
                        setEditAvatarPreview(null);
                        setEditAvatarBlob(null);
                        setModalMode("edit");
                      }}
                      className="w-1/2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      Edit Profil
                    </button>
                    <button
                      onClick={() => setIsProfileModalOpen(false)}
                      className="w-1/2 rounded-xl bg-slate-200 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-300"
                    >
                      Tutup
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleUpdateProfile} className="flex flex-col h-full justify-between space-y-4">
                  <div>
                    <div className="mb-4">
                      <h2 className="text-xl font-bold text-slate-900">Edit Data Profil</h2>
                      <p className="text-sm text-slate-500">Perbarui informasi akun Anda</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Nama Lengkap</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">                        
                        <div className="relative">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Gender</label>
                          <button
                            type="button"
                            onClick={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                          >
                            <span className="capitalize">{editGender || "Pilih Gender"}</span>
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
                                      setEditGender(item.value);
                                      setIsGenderDropdownOpen(false);
                                    }}
                                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                      editGender === item.value
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
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Tanggal Lahir</label>
                          <input
                            type="date"
                            value={editTanggalLahir}
                            onChange={(e) => setEditTanggalLahir(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Department</label>
                        <input
                          type="text"
                          value={editDepartment}
                          onChange={(e) => setEditDepartment(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Jabatan</label>
                        <input
                          type="text"
                          value={editJabatan}
                          onChange={(e) => setEditJabatan(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Bio</label>
                        <textarea
                          rows={3}
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setModalMode("view");
                        setEditAvatarPreview(null);
                        setEditAvatarBlob(null);
                      }}
                      className="w-1/2 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="w-1/2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingProfile ? "Menyimpan..." : "Simpan"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden rounded-2xl bg-blue-100 px-8 py-7">
        <div className="relative z-10">
          <p className="text-sm font-medium text-blue-600">
            Welcome back 👋
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Hi, {adminName}
          </h2>
          <p className="mt-2 max-w-lg text-sm text-slate-600">
            Here's your HR overview for today. Monitor attendance, employees, and leave requests from here.
          </p>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-200/70" />
        <div className="absolute -bottom-16 right-32 h-32 w-32 rounded-full bg-yellow-200/70" />
      </section>
        
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Karyawan</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {loading ? "..." : totalEmployees}
              </p>
              <p className="mt-2 text-xs text-slate-400">Karyawan terdaftar</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600">
              <CircleCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Hadir Hari Ini</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {loading ? "..." : presentToday}
              </p>
              <p className="mt-2 text-xs text-green-600">Karyawan hadir hari ini</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Cuti Pending</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {loading ? "..." : pendingLeaves}
              </p>
              <p className="mt-2 text-xs text-yellow-600">Menunggu persetujuan</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Terlambat</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">
                {loading ? "..." : lateToday}
              </p>
              <p className="mt-2 text-xs text-red-500">Karyawan terlambat hari ini</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm xl:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Attendance Overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Attendance summary for {timeRange.toLowerCase()}
                </p>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setIsOverviewDropdownOpen(!isOverviewDropdownOpen)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 outline-none transition-all hover:bg-slate-50"
                >
                  <span>{timeRange}</span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOverviewDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isOverviewDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOverviewDropdownOpen(false)}></div>
                    <div className="absolute right-0 top-full z-50 mt-2 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                      {["This Week", "Last Week"].map((val) => (
                        <button
                          key={val}
                          onClick={() => {
                            setTimeRange(val);
                            setIsOverviewDropdownOpen(false);
                          }}
                          className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                            timeRange === val ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex h-52 items-end justify-between gap-2 px-4 pt-6 pb-2 border-b border-slate-100">
            {weeklyChartData.map((item, idx) => {
              const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={idx} className="flex flex-col items-center gap-2 flex-1 h-full justify-end group">
                  <span className="text-xs font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.count}
                  </span>
                  <div className="w-full max-w-9 bg-slate-100 rounded-t-lg overflow-hidden h-full flex items-end">
                    <div 
                      style={{ height: `${Math.max(heightPercent, item.count > 0 ? 8 : 4)}%` }}
                      className="w-full bg-blue-600 rounded-t-lg transition-all duration-500 group-hover:bg-blue-700"
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{item.dayName}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 px-2">
            <span>Grafik total kehadiran karyawan (Senin - Minggu)</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 inline-block"></span>
              Jumlah Hadir
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Pending Leave
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Requests waiting for approval
              </p>
            </div>

            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
              {pendingLeaves} Pending
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {pendingLeaveData.length === 0 ? (
              <div className="rounded-xl border border-slate-100 p-4 text-center">
                <p className="text-sm text-slate-400">
                  Tidak ada pengajuan cuti pending.
                </p>
              </div>
            ) : (
              pendingLeaveData.map((leave) => (
                <div
                  key={leave.id}
                  className="rounded-xl border border-slate-100 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {leave.profile?.full_name || "Unknown"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                      </p>
                    </div>

                    <Link
                      to="/admin/leaves"
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link
            to="/admin/leaves"
            className="mt-5 block w-full rounded-lg border border-slate-200 py-2 text-center text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Lihat Semua
          </Link>
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

          <Link
            to="/admin/attendance"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Lihat Semua →
          </Link>
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
              {recentAttendance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    Belum ada data attendance.
                  </td>
                </tr>
              ) : (
                recentAttendance.map((attendance) => (
                  <tr key={attendance.id}>
                    <td className="py-4 font-medium text-slate-900">
                      {attendance.profile?.full_name || "Unknown"}
                    </td>
                    <td className="py-4 text-slate-500">
                      {formatDate(attendance.clock_in)}
                    </td>
                    <td className="py-4 text-slate-500">
                      {formatTime(attendance.clock_in)}
                    </td>
                    <td className="py-4 text-slate-500">
                      {formatTime(attendance.clock_out)}
                    </td>
                    <td className="py-4 text-right">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(attendance.status)}`}>
                        {getStatusLabel(attendance.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;