"use client";

import { useEffect, useState, useCallback } from "react";
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
  UserCheck,
  UserX,
  RefreshCw,
  LogOut,
  Eye,
  Building2,
  MapPin,
  Trash2,
  Lock,
  Copy,
} from "lucide-react";
import { UserProfile } from "@/lib/types";
import { SchoolsManager } from "./SchoolsManager";
import { OverviewTab } from "./OverviewTab";
import { InspectorsTab } from "./InspectorsTab";
import { AuditLogTab } from "./AuditLogTab";
import { WilayaCircularTab } from "./WilayaCircularTab";
import { ModerationTab } from "./ModerationTab";
import { ApprovalsTab } from "./ApprovalsTab";
import { DISTRICTS_INFO } from "./districts";

type AdminTab = "overview" | "approvals" | "accounts" | "inspectors" | "schools" | "circular" | "moderation" | "log";

const TABS: [AdminTab, string][] = [
  ["overview", "نظرة عامة"],
  ["approvals", "طلبات الانضمام والتحقق 🔔"],
  ["accounts", "الحسابات"],
  ["inspectors", "المفتشون والمقاطعات"],
  ["schools", "المتوسطات"],
  ["circular", "منشور ولائي"],
  ["moderation", "مراقبة المحتوى"],
  ["log", "سجل العمليات"],
];

type ToastState = { type: "success" | "error"; text: string } | null;

export default function SuperAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "teacher" | "inspector" | "admin">("all");
  const [districtFilter, setDistrictFilter] = useState<number | "all">("all");
  const [toast, setToast] = useState<ToastState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [adminId, setAdminId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    userName: string;
    action: "upgrade_inspector" | "downgrade_teacher" | "delete_user";
    districtId?: number;
  } | null>(null);

  /* ─── تحقق من صلاحية المشرف العام ─── */
  useEffect(() => {
    checkAdminAuth();
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      router.push("/admin");
      return;
    }

    setAdminId(session.user.id);
    setAuthorized(true);
    await loadProfiles();
    setLoading(false);
  };

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setProfiles((data as UserProfile[]) || []);
  }, []);

  /* ─── إظهار إشعار مؤقت ─── */
  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  /* ─── ترقية حساب إلى مفتش ─── */
  const upgradeToInspector = async (userId: string, districtId: number) => {
    setBusyId(userId);
    const { data: changed, error: updateError } = await supabase
      .from("profiles")
      .update({ role: "inspector", district_id: districtId })
      .eq("id", userId)
      .select("id");
    const error = updateError ?? (changed?.length ? null : { message: "لم يتم تعديل أي حساب (صلاحيات غير كافية)" });

    if (error) {
      showToast("error", "فشل ترقية الحساب: " + error.message);
    } else {
      showToast("success", "✅ تم ترقية الحساب إلى مفتش بنجاح!");
      await loadProfiles();
    }
    setBusyId(null);
    setConfirmAction(null);
  };

  /* ─── تخفيض حساب إلى أستاذ ─── */
  const downgradeToTeacher = async (userId: string) => {
    setBusyId(userId);
    const { data: changed, error: updateError } = await supabase
      .from("profiles")
      .update({ role: "teacher" })
      .eq("id", userId)
      .select("id");
    const error = updateError ?? (changed?.length ? null : { message: "لم يتم تعديل أي حساب (صلاحيات غير كافية)" });

    if (error) {
      showToast("error", "فشل تخفيض الصلاحية: " + error.message);
    } else {
      showToast("success", "تم تخفيض الحساب إلى أستاذ");
      await loadProfiles();
    }
    setBusyId(null);
    setConfirmAction(null);
  };

  /* ─── تعليق/تفعيل حساب ─── */
  const toggleVerified = async (user: UserProfile) => {
    setBusyId(user.id);
    const { data: changed, error: updateError } = await supabase
      .from("profiles")
      .update({ is_verified: !user.is_verified })
      .eq("id", user.id)
      .select("id");
    const error = updateError ?? (changed?.length ? null : { message: "لم يتم التعديل" });

    if (error) {
      showToast("error", "حدث خطأ");
    } else {
      showToast("success", user.is_verified ? "تم تعليق الحساب" : "تم تفعيل الحساب ✅");
      await loadProfiles();
    }
    setBusyId(null);
  };

  /* ─── حذف حساب نهائياً ─── */
  const deleteUser = async (userId: string) => {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(userId)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر حذف الحساب");
      showToast("success", "تم حذف الحساب نهائياً");
      await loadProfiles();
    } catch (e: any) {
      showToast("error", e.message);
    }
    setBusyId(null);
    setConfirmAction(null);
  };

  /* ─── الفلترة ─── */
  const filteredProfiles = profiles.filter((p) => {
    const nameMatch =
      !searchQuery ||
      (p.full_name || "").includes(searchQuery) ||
      (p.teacher_code || "").includes(searchQuery.toUpperCase());

    const roleMatch = roleFilter === "all" || p.role === roleFilter;
    const districtMatch =
      districtFilter === "all" || p.district_id === districtFilter;

    return nameMatch && roleMatch && districtMatch;
  });

  const stats = {
    total: profiles.length,
    teachers: profiles.filter((p) => p.role === "teacher").length,
    inspectors: profiles.filter((p) => p.role === "inspector").length,
    admins: profiles.filter((p) => p.role === "admin").length,
    verified: profiles.filter((p) => p.is_verified).length,
  };

  /* ─── حالة التحميل ─── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-bold">جارٍ التحقق من الصلاحيات...</p>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-16" dir="rtl">
      {/* ─── Toast ─── */}
      {toast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2 transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.text}
        </div>
      )}

      {/* ─── نافذة تأكيد الإجراء ─── */}
      {confirmAction && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto">
                {confirmAction.action === "upgrade_inspector" ? (
                  <Crown className="w-7 h-7 text-indigo-600" />
                ) : confirmAction.action === "downgrade_teacher" ? (
                  <GraduationCap className="w-7 h-7 text-amber-600" />
                ) : (
                  <Trash2 className="w-7 h-7 text-red-600" />
                )}
              </div>
              <h3 className="font-black text-slate-900">
                {confirmAction.action === "upgrade_inspector"
                  ? "ترقية إلى مفتش"
                  : confirmAction.action === "downgrade_teacher"
                  ? "تخفيض إلى أستاذ"
                  : "حذف الحساب"}
              </h3>
              <p className="text-xs text-slate-600">
                {confirmAction.action === "delete_user" ? "حذف نهائي لحساب " : "هل أنت متأكد من تغيير دور "}
                <span className="font-bold">{confirmAction.userName}</span>
                {confirmAction.action === "delete_user" ? " وكل دروسه ووثائقه؟ لا يمكن التراجع." : "؟"}
              </p>
            </div>

            {confirmAction.action === "upgrade_inspector" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  اختر المقاطعة المخصصة للمفتش:
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  onChange={(e) =>
                    setConfirmAction((prev) =>
                      prev ? { ...prev, districtId: Number(e.target.value) } : null
                    )
                  }
                  defaultValue={1}
                >
                  {Object.entries(DISTRICTS_INFO).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
              >
                إلغاء
              </button>
              <button
                disabled={busyId === confirmAction.userId}
                onClick={() => {
                  if (confirmAction.action === "upgrade_inspector") {
                    upgradeToInspector(
                      confirmAction.userId,
                      confirmAction.districtId || 1
                    );
                  } else if (confirmAction.action === "downgrade_teacher") {
                    downgradeToTeacher(confirmAction.userId);
                  } else {
                    deleteUser(confirmAction.userId);
                  }
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition flex items-center justify-center gap-2 ${
                  confirmAction.action === "upgrade_inspector"
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : confirmAction.action === "downgrade_teacher"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {busyId === confirmAction.userId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "تأكيد"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── شريط الحاسوب العلوي ─── */}
      <header className="hidden lg:block bg-gradient-to-l from-slate-900 to-indigo-950 text-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/25 border border-indigo-400/30 flex items-center justify-center">
              <Crown className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <p className="font-black text-sm">لوحة المشرف العام — منصة جسور التعليمية</p>
              <p className="text-[11px] text-indigo-300">
                {stats.teachers} أستاذ • {stats.inspectors} مفتش • {stats.total} حساب
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-xs text-indigo-200">
            <Link href="/" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition">الصفحة الرئيسية</Link>
            <button
              onClick={() => {
                const inviteUrl = `${window.location.origin}/join?key=asateza-2026`;
                navigator.clipboard.writeText(inviteUrl);
                showToast("success", "تم نسخ رابط دعوة الأساتذة السري! شاركه مع مدراء وأساتذة المؤسسات 📋");
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="نسخ الرابط الخاص لدعوة وتسجيل أساتذة جدد"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>دعوة أستاذ 🔗</span>
            </button>
            <Link href="/forum" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition">💬 الملتقى</Link>
            <Link href="/inspector" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition">🛡️ لوحة المقاطعات</Link>
            <Link href="/settings" className="px-3 py-1.5 rounded-lg hover:bg-white/10 transition">⚙️ حسابي</Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="px-3 py-1.5 rounded-lg text-red-300 hover:bg-white/10 transition flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" /> خروج
            </button>
          </nav>
        </div>
      </header>

      {/* ─── الترويسة ─── */}
      <div className="lg:hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-indigo-900 text-white px-4 pt-8 pb-14 rounded-b-[2.5rem] shadow-2xl">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs text-indigo-200 hover:text-white transition bg-white/10 px-3 py-1.5 rounded-full"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              الصفحة الرئيسية
            </Link>
            <Link href="/forum" className="inline-flex items-center gap-1 text-xs text-indigo-200 hover:text-white transition bg-white/10 px-3 py-1.5 rounded-full">
              💬 الملتقى
            </Link>
            <Link href="/inspector" className="inline-flex items-center gap-1 text-xs text-indigo-200 hover:text-white transition bg-white/10 px-3 py-1.5 rounded-full">
              🛡️ لوحة المقاطعات
            </Link>
            <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-indigo-200 hover:text-white transition bg-white/10 px-3 py-1.5 rounded-full">
              ⚙️ حسابي
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="inline-flex items-center gap-1 text-xs text-red-300 hover:text-white transition bg-white/10 px-3 py-1.5 rounded-full"
            >
              <LogOut className="w-3.5 h-3.5" />
              خروج
            </button>
          </div>

          <div className="text-center space-y-2 pt-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 mx-auto">
              <Crown className="w-8 h-8 text-indigo-300" />
            </div>
            <h1 className="text-2xl font-black">لوحة المشرف العام</h1>
            <p className="text-xs text-indigo-200 max-w-md mx-auto">
              إدارة حسابات الأساتذة والمفتشين — ترقية الصلاحيات وتعليق الحسابات ومراقبة النشاط
            </p>
          </div>

          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-5 gap-2 pt-2">
            {[
              { label: "إجمالي", value: stats.total, color: "bg-white/10" },
              { label: "أساتذة", value: stats.teachers, color: "bg-emerald-500/20" },
              { label: "مفتشون", value: stats.inspectors, color: "bg-indigo-500/20" },
              { label: "مشرفون", value: stats.admins, color: "bg-amber-500/20" },
              { label: "موثقون", value: stats.verified, color: "bg-teal-500/20" },
            ].map((s) => (
              <div
                key={s.label}
                className={`${s.color} rounded-2xl p-3 text-center border border-white/10`}
              >
                <p className="text-xl font-black">{s.value}</p>
                <p className="text-[10px] text-indigo-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── المحتوى الرئيسي ─── */}
      <div className="max-w-4xl lg:max-w-7xl mx-auto px-4 lg:px-6 -mt-6 lg:mt-0 space-y-4 relative z-10">
        {/* الهاتف: شريط تبويبات يمرَّر أفقياً • الحاسوب: تبويبات بخط سفلي */}
        <div
          role="tablist"
          className="bg-white rounded-2xl border border-slate-100 shadow p-1 flex gap-1 overflow-x-auto lg:rounded-none lg:shadow-none lg:border-0 lg:border-b lg:border-slate-200 lg:bg-transparent lg:p-0 lg:gap-6 lg:pt-2"
        >
          {TABS.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold lg:rounded-none lg:px-0 lg:py-3 lg:text-sm lg:border-b-2 ${
                tab === id
                  ? "bg-indigo-600 text-white lg:bg-transparent lg:text-indigo-700 lg:border-indigo-600"
                  : "text-slate-600 hover:bg-slate-50 lg:hover:bg-transparent lg:hover:text-slate-900 lg:border-transparent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab profiles={profiles} onOpenLog={() => setTab("log")} />}
        {tab === "approvals" && <ApprovalsTab onUpdate={loadProfiles} />}
        {tab === "inspectors" && <InspectorsTab profiles={profiles} onChanged={loadProfiles} />}
        {tab === "schools" && <SchoolsManager />}
        {tab === "circular" && (
          <WilayaCircularTab admin={profiles.find((p) => p.id === adminId) ?? null} profiles={profiles} />
        )}
        {tab === "moderation" && (
          <ModerationTab
            profiles={profiles}
            onSuspend={(teacherId) => {
              const user = profiles.find((p) => p.id === teacherId);
              if (user?.is_verified && confirm(`تعليق حساب ${user.full_name || ""}؟ تُحجب صفحته العامة عن الأولياء.`)) toggleVerified(user);
            }}
          />
        )}
        {tab === "log" && <AuditLogTab profiles={profiles} />}

        {tab === "accounts" && (<>
        {/* شريط البحث والفلترة */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-4 space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث باسم الأستاذ أو الكود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* فلتر الدور */}
            {(["all", "teacher", "inspector", "admin"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  roleFilter === r
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {r === "all"
                  ? "الكل"
                  : r === "teacher"
                  ? "🎓 أساتذة"
                  : r === "inspector"
                  ? "🛡️ مفتشون"
                  : "👑 مشرفون"}
              </button>
            ))}

            {/* فلتر المقاطعة */}
            <select
              value={districtFilter}
              onChange={(e) =>
                setDistrictFilter(
                  e.target.value === "all" ? "all" : Number(e.target.value)
                )
              }
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            >
              <option value="all">كل المقاطعات</option>
              {Object.entries(DISTRICTS_INFO).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            <button
              onClick={loadProfiles}
              className="mr-auto px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              تحديث
            </button>
          </div>
        </div>

        {/* الحاسوب: جدول الحسابات */}
        {filteredProfiles.length > 0 && (
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 text-right">
                <tr>
                  <th className="px-4 py-2.5 font-bold">الاسم</th>
                  <th className="px-2 py-2.5 font-bold">الكود</th>
                  <th className="px-2 py-2.5 font-bold">الدور</th>
                  <th className="px-2 py-2.5 font-bold">المقاطعة</th>
                  <th className="px-2 py-2.5 font-bold">المتوسطة</th>
                  <th className="px-2 py-2.5 font-bold">الحالة</th>
                  <th className="px-4 py-2.5 font-bold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-bold text-slate-900">
                      {profile.slug ? (
                        <Link href={`/t/${profile.slug}`} target="_blank" className="hover:text-indigo-700">
                          {profile.full_name || "—"}
                        </Link>
                      ) : (
                        profile.full_name || "—"
                      )}
                    </td>
                    <td className="px-2 py-2.5 font-mono text-emerald-700">{profile.teacher_code || "—"}</td>
                    <td className="px-2 py-2.5">{ROLE_LABEL[profile.role]}</td>
                    <td className="px-2 py-2.5">{profile.district_id ? DISTRICTS_INFO[profile.district_id] : "—"}</td>
                    <td className="px-2 py-2.5 text-slate-500 max-w-48 truncate">{profile.school_custom_name || "—"}</td>
                    <td className="px-2 py-2.5">
                      {profile.is_verified ? <span className="text-emerald-600">مفعّل</span> : <span className="text-rose-600 font-bold">معلق</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        <ProfileActions
                          profile={profile}
                          busyId={busyId}
                          onUpgrade={(userId, userName) => setConfirmAction({ userId, userName, action: "upgrade_inspector", districtId: 1 })}
                          onDowngrade={(userId, userName) => setConfirmAction({ userId, userName, action: "downgrade_teacher" })}
                          onToggleVerified={toggleVerified}
                          onDelete={(userId, userName) => setConfirmAction({ userId, userName, action: "delete_user" })}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* قائمة الحسابات */}
        <div className={`space-y-3 ${filteredProfiles.length > 0 ? "lg:hidden" : ""}`}>
          {filteredProfiles.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold">لا توجد نتائج</p>
            </div>
          ) : (
            filteredProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                busyId={busyId}
                onUpgrade={(userId, userName) =>
                  setConfirmAction({
                    userId,
                    userName,
                    action: "upgrade_inspector",
                    districtId: 1,
                  })
                }
                onDowngrade={(userId, userName) =>
                  setConfirmAction({
                    userId,
                    userName,
                    action: "downgrade_teacher",
                  })
                }
                onToggleVerified={toggleVerified}
                onDelete={(userId, userName) => setConfirmAction({ userId, userName, action: "delete_user" })}
              />
            ))
          )}
        </div>
        </>)}
      </div>
    </div>
  );
}

/* ─── بطاقة حساب واحدة ─── */
function ProfileCard({
  profile,
  busyId,
  onUpgrade,
  onDowngrade,
  onToggleVerified,
  onDelete,
}: {
  profile: UserProfile;
  busyId: string | null;
  onUpgrade: (id: string, name: string) => void;
  onDowngrade: (id: string, name: string) => void;
  onToggleVerified: (profile: UserProfile) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const roleBadge =
    profile.role === "admin"
      ? { label: "مشرف عام", color: "bg-amber-100 text-amber-700" }
      : profile.role === "inspector"
      ? { label: "مفتش", color: "bg-indigo-100 text-indigo-700" }
      : { label: "أستاذ", color: "bg-emerald-100 text-emerald-700" };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        {/* معلومات الحساب */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
              profile.role === "admin"
                ? "bg-amber-100 text-amber-700"
                : profile.role === "inspector"
                ? "bg-indigo-100 text-indigo-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {(profile.full_name || "؟").charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-black text-slate-900 text-sm truncate">
                {profile.full_name || "—"}
              </p>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadge.color}`}
              >
                {roleBadge.label}
              </span>
              {profile.is_verified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-slate-500">
              {profile.teacher_code && (
                <span className="font-mono font-bold text-emerald-700">
                  {profile.teacher_code}
                </span>
              )}
              {profile.district_id && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {DISTRICTS_INFO[profile.district_id] || `مقاطعة ${profile.district_id}`}
                </span>
              )}
              {profile.created_at && (
                <span>
                  {new Date(profile.created_at).toLocaleDateString("ar-DZ", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* زر عرض الفضاء */}
        {profile.slug && (
          <Link
            href={`/t/${profile.slug}`}
            target="_blank"
            className="shrink-0 p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition"
            title="عرض الفضاء العام"
          >
            <Eye className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-50">
        <ProfileActions
          profile={profile}
          busyId={busyId}
          onUpgrade={onUpgrade}
          onDowngrade={onDowngrade}
          onToggleVerified={onToggleVerified}
          onDelete={onDelete}
        />

        {/* معلومات إضافية */}
        {profile.levels_taught && profile.levels_taught.length > 0 && (
          <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 text-xs font-bold">
            📚 السنوات: {profile.levels_taught.join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = { admin: "مشرف عام", inspector: "مفتش", teacher: "أستاذ" };

/* ─── أزرار إجراءات حساب (في البطاقة والجدول) ─── */
function ProfileActions({
  profile,
  busyId,
  onUpgrade,
  onDowngrade,
  onToggleVerified,
  onDelete,
}: {
  profile: UserProfile;
  busyId: string | null;
  onUpgrade: (id: string, name: string) => void;
  onDowngrade: (id: string, name: string) => void;
  onToggleVerified: (profile: UserProfile) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const isBusy = busyId === profile.id;
  return (
    <>
        {/* ترقية إلى مفتش */}
        {profile.role === "teacher" && (
          <button
            disabled={isBusy}
            onClick={() => onUpgrade(profile.id, profile.full_name || "؟")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition"
          >
            <Crown className="w-3.5 h-3.5" />
            ترقية إلى مفتش
          </button>
        )}

        {/* تخفيض إلى أستاذ */}
        {profile.role === "inspector" && (
          <button
            disabled={isBusy}
            onClick={() => onDowngrade(profile.id, profile.full_name || "؟")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold transition"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            تخفيض إلى أستاذ
          </button>
        )}

        {/* تفعيل / تعليق */}
        {profile.role !== "admin" && (
          <button
            disabled={isBusy}
            onClick={() => onToggleVerified(profile)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              profile.is_verified
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            {isBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : profile.is_verified ? (
              <>
                <UserX className="w-3.5 h-3.5" />
                تعليق الحساب
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                تفعيل الحساب
              </>
            )}
          </button>
        )}

        {/* حذف نهائي */}
        {profile.role !== "admin" && (
          <button
            disabled={isBusy}
            onClick={() => onDelete(profile.id, profile.full_name || "؟")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 text-xs font-bold transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            حذف
          </button>
        )}
    </>
  );
}
