"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ShieldCheck,
  Users,
  GraduationCap,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Crown,
  RefreshCw,
  LogOut,
  Eye,
  EyeOff,
  Building2,
  MapPin,
  Trash2,
  Lock,
  Copy,
  Check,
  Mail,
  KeyRound,
  Calendar,
  Clock,
  BookOpen,
  ClipboardCheck,
  Megaphone,
  History,
  Plus,
  Send,
  X,
  Sliders,
  Filter,
} from "lucide-react";
import {
  UserProfile,
  isSuperAdminEmail,
  DetailedAdminUser,
  AccountActivityItem,
  MIDDLE_SCHOOL_SUBJECTS,
} from "@/lib/types";
import { AdminTicketsTab } from "./AdminTicketsTab";
import { AuditLogTab } from "./AuditLogTab";
import { DISTRICTS_INFO } from "./districts";

type AdminTab = "accounts" | "tickets" | "log";

const TABS: [AdminTab, string][] = [
  ["accounts", "الحسابات المسجلة والنشاط الميداني 👥"],
  ["tickets", "بريد وتذاكر الإدارة 📬"],
  ["log", "سجل العمليات العام 📜"],
];

type ToastState = { type: "success" | "error"; text: string } | null;

export default function SuperAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>("accounts");

  // بيانات الحسابات التفصيلية
  const [users, setUsers] = useState<DetailedAdminUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // شريط البحث والفلاتر
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "teacher" | "inspector" | "admin">("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [districtFilter, setDistrictFilter] = useState<number | "all">("all");

  // نافذة كشف سجل العمليات التفصيلي لمستخدم معين
  const [selectedUserForActivities, setSelectedUserForActivities] = useState<DetailedAdminUser | null>(null);

  // نافذة تغيير / تعيين كلمة المرور
  const [passwordModalUser, setPasswordModalUser] = useState<DetailedAdminUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // نافذة إنشاء حساب جديد مباشر
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [newAccountSubject, setNewAccountSubject] = useState("mathematics");
  const [newAccountRole, setNewAccountRole] = useState<"teacher" | "inspector">("teacher");
  const [newAccountDistrict, setNewAccountDistrict] = useState(1);
  const [newAccountSchool, setNewAccountSchool] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // حالة نسخ النصوص
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const [unauthorizedInfo, setUnauthorizedInfo] = useState<{
    email: string;
    currentRole: string;
    fullName: string;
  } | null>(null);

  /* ─── إشعار توست ─── */
  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 4000);
  };

  /* ─── التحقق من صلاحية المشرف العام ─── */
  useEffect(() => {
    checkAdminAuth();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const requestedTab = params.get("tab") as AdminTab;
      if (requestedTab && TABS.some(([id]) => id === requestedTab)) {
        setTab(requestedTab);
      }
    }
  }, []);

  const checkAdminAuth = async () => {
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const email = (session.user.email || "").toLowerCase().trim();
    const isOwnerEmail = isSuperAdminEmail(email);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", session.user.id)
      .single();

    const isAdmin = profile?.role === "admin" || isOwnerEmail;

    if (!isAdmin) {
      setUnauthorizedInfo({
        email: session.user.email || "",
        currentRole: profile?.role || "teacher",
        fullName: profile?.full_name || session.user.user_metadata?.full_name || "الأستاذ",
      });
      setAuthorized(false);
      setLoading(false);
      return;
    }

    setAdminId(session.user.id);
    setAuthorized(true);
    await loadDetailedUsers();
    setLoading(false);
  };

  /* ─── جلب الحسابات المفصلة مع العمليات والتواريخ ─── */
  const loadDetailedUsers = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) {
          setUsers(data.users);
          return;
        }
      }

      // احتياطي في حال عدم إرجاع API
      const { data: profs } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profs) {
        setUsers(
          profs.map((p: any) => ({
            ...p,
            email: p.email || "",
            subject: p.subject || "mathematics",
            lessons_count: 0,
            evaluations_count: 0,
            announcements_count: 0,
            diary_count: 0,
            recent_activities: [],
          }))
        );
      }
    } catch (err) {
      console.warn("Failed to load detailed users:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  /* ─── نسخ نص مع وميض بصري ─── */
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  /* ─── تبديل إظهار/إخفاء كلمة المرور ─── */
  const toggleRevealPassword = (userId: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  /* ─── تعيين / تغيير كلمة المرور فوراً ─── */
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPasswordInput.trim()) return;

    if (newPasswordInput.trim().length < 6) {
      showToast("error", "كلمة المرور يجب أن لا تقل عن 6 أحرف");
      return;
    }

    setPasswordSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: passwordModalUser.id,
          newPassword: newPasswordInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تغيير كلمة المرور");

      showToast("success", `✅ تم تغيير كلمة مرور ${passwordModalUser.full_name} بنجاح!`);
      // تحديث الحالة محلياً
      setUsers((prev) =>
        prev.map((u) =>
          u.id === passwordModalUser.id
            ? { ...u, initial_password: newPasswordInput.trim() }
            : u
        )
      );

      setPasswordModalUser(null);
      setNewPasswordInput("");
    } catch (err: any) {
      showToast("error", err.message || "تعذر تغيير كلمة المرور");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  /* ─── إنشاء حساب مباشر جديد ─── */
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountEmail.trim() || !newAccountName.trim()) {
      showToast("error", "الاسم والبريد مطلوبان");
      return;
    }

    setCreateSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newAccountName.trim(),
          email: newAccountEmail.trim().toLowerCase(),
          password: newAccountPassword.trim() || undefined,
          subject: newAccountSubject,
          role: newAccountRole,
          districtId: newAccountDistrict,
          schoolName: newAccountSchool.trim() || "متوسطة ولاية الوادي",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء الحساب");

      showToast("success", `🎉 تم إنشاء حساب ${newAccountName} وتفعيله مباشرة!`);
      setCreateModalOpen(false);
      setNewAccountName("");
      setNewAccountEmail("");
      setNewAccountPassword("");
      await loadDetailedUsers();
    } catch (err: any) {
      showToast("error", err.message || "تعذر إنشاء الحساب");
    } finally {
      setCreateSubmitting(false);
    }
  };

  /* ─── حذف حساب نهائياً ─── */
  const handleDeleteUser = async (user: DetailedAdminUser) => {
    if (!confirm(`هل أنت متأكد من حذف حساب الأستاذ "${user.full_name}" نهائياً من المنصة؟ سيتم حذف جميع بياناته.`)) {
      return;
    }

    setBusyId(user.id);
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر حذف الحساب");

      showToast("success", "تم حذف الحساب نهائياً");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: any) {
      showToast("error", err.message || "حدث خطأ");
    } finally {
      setBusyId(null);
    }
  };

  /* ─── فلترة الحسابات ─── */
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // بحث نصي
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (u.full_name || "").toLowerCase().includes(q);
        const matchEmail = (u.email || "").toLowerCase().includes(q);
        const matchCode = (u.teacher_code || "").toLowerCase().includes(q);
        const matchSchool = (u.school_custom_name || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchCode && !matchSchool) {
          return false;
        }
      }

      // فلتر الدور
      if (roleFilter !== "all" && u.role !== roleFilter) return false;

      // فلتر المادة
      if (subjectFilter !== "all" && u.subject !== subjectFilter) return false;

      // فلتر المقاطعة
      if (districtFilter !== "all" && u.district_id !== districtFilter) return false;

      return true;
    });
  }, [users, searchQuery, roleFilter, subjectFilter, districtFilter]);

  /* ─── إحصائيات سريعة ─── */
  const stats = useMemo(() => {
    const total = users.length;
    const teachers = users.filter((u) => u.role === "teacher").length;
    const inspectors = users.filter((u) => u.role === "inspector").length;
    const mathCount = users.filter((u) => u.subject === "mathematics").length;
    const arabicCount = users.filter((u) => u.subject === "arabic").length;
    const otherSubjects = total - (mathCount + arabicCount);
    const activeRecently = users.filter((u) => u.last_sign_in_at).length;
    return { total, teachers, inspectors, mathCount, arabicCount, otherSubjects, activeRecently };
  }, [users]);

  /* ─── ميتاداتا المادة ─── */
  const getSubjectMeta = (subjId?: string) => {
    const found = MIDDLE_SCHOOL_SUBJECTS.find((s) => s.id === subjId);
    if (found) return found;
    return { id: subjId || "other", name: subjId || "المادة غير محددة", icon: "📐" };
  };

  /* ─── تنسيق التواريخ الدقيقة ─── */
  const formatExactDate = (isoString?: string | null) => {
    if (!isoString) return "—";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";

    return d.toLocaleString("ar-DZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  /* ─── حالة التحميل والصلاحيات ─── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-slate-500 font-sans" dir="rtl">
        <Loader2 className="w-9 h-9 animate-spin text-[#107a57]" />
        <p className="text-sm font-bold">جارٍ تجهيز لوحة الإدارة وسجل الحسابات...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-slate-900">حسابك لا يملك صلاحية المشرف العام</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            أنت مسجل حالياً بالبريد <strong>{unauthorizedInfo?.email}</strong>. لوحة المشرف العام مخصصة لمدير المنصة لإدارة الحسابات المسجلة.
          </p>
          <Link href="/" className="btn-primary text-xs py-2.5 px-4 w-full">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcf9] pb-16 font-sans text-slate-900" dir="rtl">
      {/* ─── إشعار توست العائم ─── */}
      {toast && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-black flex items-center gap-2 border animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-900 text-emerald-100 border-emerald-600 shadow-emerald-900/20"
              : "bg-rose-900 text-rose-100 border-rose-600 shadow-rose-900/20"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* ─── الترويسة الرئيسية البسيطة وغير المعقدة ─── */}
      <div className="bg-gradient-to-br from-[#0c4e38] via-[#107a57] to-[#14966c] text-white pt-8 pb-12 px-4 sm:px-6 lg:px-8 shadow-lg shadow-[#107a57]/10">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-xs font-bold border border-white/20 mb-2">
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>لوحة تحكم مدير الموقع (المشرف العام)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                سجل الحسابات المسجلة والنشاط الميداني
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1">
                متابعة تفصيلية دقيقة لكافة حسابات الأساتذة والمفتشين: الإيميل، المادة، كلمة المرور، تواريخ التسجيل والدخول، وآخر العمليات الميدانية.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-400/20"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة حساب فوري ⚡</span>
              </button>

              <button
                onClick={loadDetailedUsers}
                disabled={refreshing}
                className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition border border-white/20"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* بطاقات الإحصاءات السريعة البسيطة */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-white">
              <span className="text-[11px] font-bold text-emerald-200 block">إجمالي الحسابات المسجلة</span>
              <p className="text-2xl font-black mt-1">{stats.total}</p>
              <span className="text-[10px] text-emerald-200/80">
                {stats.teachers} أستاذ • {stats.inspectors} مفتش
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-white">
              <span className="text-[11px] font-bold text-emerald-200 block">توزيع المواد الأساسية</span>
              <p className="text-2xl font-black mt-1">{stats.mathCount} رياضيات</p>
              <span className="text-[10px] text-emerald-200/80">
                {stats.arabicCount} عربية • {stats.otherSubjects} مواد أخرى
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-white">
              <span className="text-[11px] font-bold text-emerald-200 block">الحسابات النشطة مؤخراً</span>
              <p className="text-2xl font-black mt-1">{stats.activeRecently}</p>
              <span className="text-[10px] text-emerald-200/80">سجلوا دخولهم للمنصة</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-white">
              <span className="text-[11px] font-bold text-emerald-200 block">طريقة التسجيل الحالية</span>
              <p className="text-lg font-black mt-1 text-amber-300">تفعيل فوري مباشر ✨</p>
              <span className="text-[10px] text-emerald-200/80">بدون أي طلبات أو شروط تحقق</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── شريط التبويبات الثلاثية المبسطة ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-5 relative z-10 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm flex items-center gap-2 overflow-x-auto">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition shrink-0 ${
                tab === id
                  ? "bg-[#107a57] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ───────────────────────────────────────────────────────── */}
        {/* التبويب 1: الحسابات المسجلة والنشاط الميداني (الرئيسي)      */}
        {/* ───────────────────────────────────────────────────────── */}
        {tab === "accounts" && (
          <div className="space-y-4">
            {/* شريط الفلاتر والبحث المتقدم السهل */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="ابحث بالاسم، البريد الإلكتروني، الكود، أو اسم المتوسطة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] outline-none transition"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>

                {/* فلتر المادة */}
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 outline-none"
                >
                  <option value="all">كل المواد التعليمية 📚</option>
                  {MIDDLE_SCHOOL_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                </select>

                {/* فلتر الرتبة */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 outline-none"
                >
                  <option value="all">كل الرتب</option>
                  <option value="teacher">👨‍🏫 أساتذة</option>
                  <option value="inspector">🛡️ مفتشون</option>
                  <option value="admin">👑 مشرفون</option>
                </select>

                {/* فلتر المقاطعة */}
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700 outline-none"
                >
                  <option value="all">كل المقاطعات</option>
                  {Object.entries(DISTRICTS_INFO).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span>
                  يتم عرض <strong>{filteredUsers.length}</strong> حساب من أصل <strong>{users.length}</strong>
                </span>
                {searchQuery || subjectFilter !== "all" || roleFilter !== "all" || districtFilter !== "all" ? (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSubjectFilter("all");
                      setRoleFilter("all");
                      setDistrictFilter("all");
                    }}
                    className="text-[#107a57] font-bold hover:underline"
                  >
                    إعادة ضبط الفلاتر ↺
                  </button>
                ) : null}
              </div>
            </div>

            {/* جدول الحسابات التفصيلي الدقيق على الشاشات الكبيرة */}
            <div className="hidden xl:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-[#f8f9fa] text-slate-600 border-b border-slate-200 font-black">
                  <tr>
                    <th className="p-3.5">الأستاذ / المستخدم</th>
                    <th className="p-3.5">البريد الإلكتروني 📧</th>
                    <th className="p-3.5">المادة 📐</th>
                    <th className="p-3.5">كلمة المرور 🔑</th>
                    <th className="p-3.5">تاريخ وساعة التسجيل 📅</th>
                    <th className="p-3.5">آخر تسجيل دخول 🕒</th>
                    <th className="p-3.5">النشاط الميداني 📊</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400 font-bold">
                        لا توجد حسابات مطابقة للبحث المحدد
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const subj = getSubjectMeta(user.subject);
                      const isPwdRevealed = revealedPasswords[user.id];
                      const isBusy = busyId === user.id;

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/70 transition">
                          {/* الاسم والرتبة والكود */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#107a57] flex items-center justify-center font-black text-xs shrink-0">
                                {(user.full_name || "أ").charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {user.slug ? (
                                    <Link
                                      href={`/t/${user.slug}`}
                                      target="_blank"
                                      className="font-black text-slate-900 hover:text-[#107a57] truncate"
                                      title="فتح الفضاء العام"
                                    >
                                      {user.full_name}
                                    </Link>
                                  ) : (
                                    <span className="font-black text-slate-900 truncate">
                                      {user.full_name}
                                    </span>
                                  )}
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                      user.role === "admin"
                                        ? "bg-amber-100 text-amber-800"
                                        : user.role === "inspector"
                                        ? "bg-indigo-100 text-indigo-800"
                                        : "bg-emerald-50 text-emerald-800"
                                    }`}
                                  >
                                    {user.role === "admin" ? "مشرف" : user.role === "inspector" ? "مفتش" : "أستاذ"}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  {user.teacher_code || "—"} • {user.school_custom_name || "متوسطة بالوادي"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* البريد الإلكتروني مع زر النسخ */}
                          <td className="p-3.5 font-mono">
                            {user.email ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-800 select-all font-bold truncate max-w-[180px]">
                                  {user.email}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(user.email || "", `email_${user.id}`)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                  title="نسخ البريد"
                                >
                                  {copiedKey === `email_${user.id}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* المادة */}
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-[11px] font-black border border-slate-200">
                              <span>{subj.icon}</span>
                              <span>{subj.name}</span>
                            </span>
                          </td>

                          {/* كلمة المرور */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {user.initial_password ? (
                                <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 text-amber-950 font-mono text-xs">
                                  <span>{isPwdRevealed ? user.initial_password : "••••••••"}</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleRevealPassword(user.id)}
                                    className="text-amber-700 hover:text-amber-900 p-0.5"
                                    title={isPwdRevealed ? "إخفاء" : "إظهار"}
                                  >
                                    {isPwdRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(user.initial_password || "", `pwd_${user.id}`)}
                                    className="text-amber-700 hover:text-amber-900 p-0.5"
                                    title="نسخ كلمة المرور"
                                  >
                                    {copiedKey === `pwd_${user.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">مشفرة (Bcrypt)</span>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setPasswordModalUser(user);
                                  setNewPasswordInput("");
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition flex items-center gap-1"
                                title="تعيين كلمة مرور جديدة"
                              >
                                <KeyRound className="w-3 h-3" />
                                <span>تعيين</span>
                              </button>
                            </div>
                          </td>

                          {/* تاريخ وساعة التسجيل الدقيق */}
                          <td className="p-3.5">
                            <div className="text-slate-800 font-bold whitespace-nowrap">
                              {formatExactDate(user.created_at)}
                            </div>
                          </td>

                          {/* آخر تسجيل دخول */}
                          <td className="p-3.5">
                            {user.last_sign_in_at ? (
                              <div className="text-emerald-700 font-bold whitespace-nowrap flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>{formatExactDate(user.last_sign_in_at)}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">لم يدخل بعد</span>
                            )}
                          </td>

                          {/* ملخص النشاط الميداني */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200"
                                title={`إجمالي الدروس المرفوعة: ${user.lessons_count || 0}`}
                              >
                                {user.lessons_count || 0} درس 📚
                              </span>
                              <span
                                className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-200"
                                title={`إجمالي التقييمات: ${user.evaluations_count || 0}`}
                              >
                                {user.evaluations_count || 0} تقييم 📊
                              </span>
                              <span
                                className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 text-[10px] font-bold border border-purple-200"
                                title={`حصص الدفتر اليومي: ${user.diary_count || 0}`}
                              >
                                {user.diary_count || 0} حصة 🗓️
                              </span>
                            </div>
                          </td>

                          {/* أزرار الإجراءات */}
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedUserForActivities(user)}
                                className="px-2.5 py-1.5 rounded-xl bg-[#e6f4ee] hover:bg-[#d5eee2] text-[#107a57] text-xs font-black transition flex items-center gap-1"
                                title="عرض الخط الزمني للعمليات بالتاريخ والوقت"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span>سجل العمليات</span>
                              </button>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDeleteUser(user)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="حذف الحساب"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* بطاقات الحسابات المتجاوبة للشاشات الصغيرة والمتوسطة */}
            <div className="xl:hidden space-y-3">
              {filteredUsers.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 font-bold">
                  لا توجد حسابات مطابقة للبحث المحدد
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const subj = getSubjectMeta(user.subject);
                  const isPwdRevealed = revealedPasswords[user.id];

                  return (
                    <div
                      key={user.id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#107a57] flex items-center justify-center font-black text-sm shrink-0">
                            {(user.full_name || "أ").charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-black text-slate-900 text-sm">{user.full_name}</h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                {user.role === "admin" ? "مشرف" : user.role === "inspector" ? "مفتش" : "أستاذ"}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">
                              {user.teacher_code || "—"} • {user.school_custom_name || "متوسطة بالوادي"}
                            </div>
                          </div>
                        </div>

                        {user.slug && (
                          <Link
                            href={`/t/${user.slug}`}
                            target="_blank"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        )}
                      </div>

                      {/* معلومات تفصيلية دقيقة */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                        {/* البريد الإلكتروني */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500">البريد:</span>
                          <div className="flex items-center gap-1 font-mono font-bold text-slate-800 truncate">
                            <span>{user.email || "—"}</span>
                            {user.email && (
                              <button
                                onClick={() => handleCopy(user.email || "", `m_email_${user.id}`)}
                                className="text-slate-400 hover:text-slate-700 p-0.5"
                              >
                                {copiedKey === `m_email_${user.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* المادة */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500">المادة:</span>
                          <span className="font-bold text-slate-900 flex items-center gap-1">
                            <span>{subj.icon}</span>
                            <span>{subj.name}</span>
                          </span>
                        </div>

                        {/* كلمة المرور */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500">كلمة المرور:</span>
                          <div className="flex items-center gap-1.5">
                            {user.initial_password ? (
                              <div className="flex items-center gap-1 bg-amber-100/70 px-2 py-0.5 rounded font-mono text-[11px] font-bold text-amber-950">
                                <span>{isPwdRevealed ? user.initial_password : "••••••••"}</span>
                                <button
                                  onClick={() => toggleRevealPassword(user.id)}
                                  className="text-amber-800"
                                >
                                  {isPwdRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => handleCopy(user.initial_password || "", `m_pwd_${user.id}`)}
                                  className="text-amber-800"
                                >
                                  {copiedKey === `m_pwd_${user.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">مشفرة</span>
                            )}
                            <button
                              onClick={() => {
                                setPasswordModalUser(user);
                                setNewPasswordInput("");
                              }}
                              className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold"
                            >
                              تغيير 🔑
                            </button>
                          </div>
                        </div>

                        {/* تاريخ وساعة التسجيل */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500">تاريخ التسجيل:</span>
                          <span className="font-bold text-slate-800 text-[11px]">
                            {formatExactDate(user.created_at)}
                          </span>
                        </div>

                        {/* آخر تسجيل دخول */}
                        <div className="flex items-center justify-between gap-2 sm:col-span-2">
                          <span className="text-slate-500">آخر تسجيل دخول:</span>
                          <span className="font-bold text-emerald-700 text-[11px]">
                            {user.last_sign_in_at ? formatExactDate(user.last_sign_in_at) : "لم يدخل بعد"}
                          </span>
                        </div>
                      </div>

                      {/* شريط الأنشطة السريعة وزر السجل الكامل */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                            {user.lessons_count || 0} درس 📚
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 text-[10px] font-bold">
                            {user.evaluations_count || 0} تقييم 📊
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedUserForActivities(user)}
                            className="px-3 py-1.5 rounded-xl bg-[#e6f4ee] hover:bg-[#d5eee2] text-[#107a57] text-xs font-black transition flex items-center gap-1"
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>سجل العمليات</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* التبويب 2: بريد وتذاكر الإدارة                            */}
        {/* ───────────────────────────────────────────────────────── */}
        {tab === "tickets" && <AdminTicketsTab />}

        {/* ───────────────────────────────────────────────────────── */}
        {/* التبويب 3: سجل العمليات العام                             */}
        {/* ───────────────────────────────────────────────────────── */}
        {tab === "log" && <AuditLogTab profiles={users} />}
      </div>

      {/* ─── نافذة منبثقة: سجل العمليات التفصيلي للأستاذ ─── */}
      {selectedUserForActivities && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#107a57] flex items-center justify-center font-black">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    سجل آخر العمليات والأنشطة بالتاريخ والوقت
                  </h3>
                  <p className="text-xs text-slate-500">
                    الأستاذ: <strong>{selectedUserForActivities.full_name}</strong> (
                    {getSubjectMeta(selectedUserForActivities.subject).name})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserForActivities(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* محتوى العمليات الزمني */}
            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {!selectedUserForActivities.recent_activities ||
              selectedUserForActivities.recent_activities.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <History className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold">لا توجد عمليات مسجلة حديثاً لهذا الحساب</p>
                </div>
              ) : (
                selectedUserForActivities.recent_activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-2xl bg-[#fafaf7] border border-slate-100 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900">{act.actionLabel}</span>
                        {act.details && (
                          <span className="text-[10px] text-slate-400 font-mono">{act.details}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 font-medium">{act.title}</p>
                    </div>

                    <div className="text-[11px] font-mono font-bold text-slate-500 shrink-0 text-left" dir="ltr">
                      {formatExactDate(act.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUserForActivities(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة منبثقة: تعيين / تغيير كلمة المرور فوراً ─── */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">تعيين كلمة مرور جديدة</h3>
                  <p className="text-xs text-slate-500">لحساب: {passwordModalUser.full_name}</p>
                </div>
              </div>

              <button
                onClick={() => setPasswordModalUser(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  كلمة المرور الجديدة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="أدخل كلمة المرور (مثال: Dz@2026 أو 12345678)"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">الحد الأدنى 6 أحرف. يتم حفظها وتطبيقها فورياً.</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const rnd = `Dz${Math.floor(100000 + Math.random() * 900000)}`;
                    setNewPasswordInput(rnd);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  توليد كلمة عشوائية 🎲
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#107a57] hover:bg-[#0c6145] text-white text-xs font-black transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {passwordSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>تطبيق وتحديث كلمة المرور 🚀</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── نافذة منبثقة: إنشاء حساب فوري جديد ─── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">إنشاء حساب جديد مباشر</h3>
                  <p className="text-xs text-slate-500">تفعيل فوري مباشر بدون أي طلبات تحقق</p>
                </div>
              </div>

              <button
                onClick={() => setCreateModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    الاسم واللقب <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: الأستاذ كمال بلقاسم"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    البريد الإلكتروني <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={newAccountEmail}
                    onChange={(e) => setNewAccountEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">المادة التعليمية</label>
                  <select
                    value={newAccountSubject}
                    onChange={(e) => setNewAccountSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none"
                  >
                    {MIDDLE_SCHOOL_SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">الرتبة</label>
                  <select
                    value={newAccountRole}
                    onChange={(e) => setNewAccountRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none"
                  >
                    <option value="teacher">👨‍🏫 أستاذ</option>
                    <option value="inspector">🛡️ مفتش</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">المقاطعة</label>
                  <select
                    value={newAccountDistrict}
                    onChange={(e) => setNewAccountDistrict(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold bg-white outline-none"
                  >
                    {Object.entries(DISTRICTS_INFO).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">المتوسطة / المؤسسة</label>
                  <input
                    type="text"
                    placeholder="متوسطة الشهيد بن باديس..."
                    value={newAccountSchool}
                    onChange={(e) => setNewAccountSchool(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    كلمة المرور الأولية (اختياري، إن تُركت فارغة تُولّد آلياً)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: Prof@2026"
                    value={newAccountPassword}
                    onChange={(e) => setNewAccountPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#107a57] hover:bg-[#0c6145] text-white text-xs font-black transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  {createSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>إنشاء الحساب وتفعيله فوراً 🚀</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
