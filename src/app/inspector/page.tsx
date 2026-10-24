"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Building2,
  Calendar,
  Eye,
  FileCheck2,
  FileText,
  GraduationCap,
  Loader2,
  LogOut,
  Megaphone,
  PenSquare,
  Printer,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import {
  DISTRICTS_INFO,
  getLocalVisits,
  normalizeLessons,
  type DistrictData,
  type TeacherStat,
} from "./shared";
import { TeachersTab } from "./TeachersTab";
import { NotesReview } from "./NotesReview";
import { CircularsTab } from "./CircularsTab";
import { VisitsTab } from "./VisitsTab";
import { TeacherPortal } from "./TeacherPortal";
import type { InspectorCircular, PedagogicalNote, TimetableSlot, UserProfile } from "@/lib/types";

type InspectorTab = "teachers" | "notes" | "circulars" | "visits";

export default function InspectorDashboardPage() {
  const router = useRouter();
  const { loading: profileLoading, profile } = useProfile();
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("teachers");
  const [viewMode, setViewMode] = useState<"teacher" | "inspector">("teacher");
  const [data, setData] = useState<DistrictData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // التحقق من الحساب وتحديد نمط العرض الافتراضي
  useEffect(() => {
    if (profileLoading) return;
    if (!profile) {
      router.push("/login?next=/inspector");
      return;
    }

    // إذا كان المستخدم مفتشاً أو مديراً، يكون نمط المفتش هو الافتراضي
    if (profile.role === "inspector" || profile.role === "admin") {
      setViewMode("inspector");
    } else {
      // الأستاذ يدخل إلى فضاء الأستاذ والمقاطعة
      setViewMode("teacher");
    }

    // تعيين المقاطعة التفتيشية
    setDistrictId((cur) => cur ?? profile.district_id ?? 1);
  }, [profileLoading, profile, router]);

  // جلب بيانات المقاطعة (الأساتذة، المذكرات، المناشير، الزيارات)
  const load = useCallback(async (district: number) => {
    setLoading(true);
    setError("");
    try {
      const [teachersRes, notesRes, circularsRes, schoolsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("role", "teacher")
          .eq("district_id", district)
          .order("full_name"),
        supabase
          .from("pedagogical_notes")
          .select("*")
          .eq("district_id", district)
          .order("created_at", { ascending: false }),
        supabase
          .from("inspector_circulars")
          .select("*")
          .or(`district_id.eq.${district},district_id.is.null`)
          .order("created_at", { ascending: false }),
        supabase
          .from("middle_schools")
          .select("id, name, commune")
          .eq("district_id", district)
          .order("name"),
      ]);

      const firstError = [teachersRes, notesRes, circularsRes, schoolsRes].find((r) => r.error)?.error;
      if (firstError) throw new Error(firstError.message);

      const teachers = (teachersRes.data as UserProfile[]) || [];
      const notes = (notesRes.data as PedagogicalNote[]) || [];
      const circulars = (circularsRes.data as InspectorCircular[]) || [];
      const teacherIds = teachers.map((t) => t.id);
      const circularIds = circulars.map((c) => c.id);

      const [workspacesRes, timetablesRes, readsRes] = await Promise.all([
        teacherIds.length
          ? supabase
              .from("teacher_public_data")
              .select("teacher_id, updated_at, data")
              .in("teacher_id", teacherIds)
          : Promise.resolve({ data: [], error: null }),
        teacherIds.length
          ? supabase
              .from("teacher_timetables")
              .select("teacher_id, slots, image_path, updated_at")
              .in("teacher_id", teacherIds)
          : Promise.resolve({ data: [], error: null }),
        circularIds.length
          ? supabase
              .from("circular_reads")
              .select("circular_id, teacher_id, read_at")
              .in("circular_id", circularIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const workspaceBy = new Map((workspacesRes.data || []).map((w: any) => [w.teacher_id, w]));
      const timetableBy = new Map((timetablesRes.data || []).map((t: any) => [t.teacher_id, t]));

      const stats: TeacherStat[] = teachers.map((t) => {
        const ws: any = workspaceBy.get(t.id);
        const lessons = normalizeLessons(ws?.data?.lessons);
        const lastLessonAt = lessons.reduce<string | null>(
          (latest, l) => (l.createdAt && (!latest || l.createdAt > latest) ? l.createdAt : latest),
          null
        );
        const teacherNotes = notes.filter((n) => n.teacher_id === t.id);
        const tt: any = timetableBy.get(t.id);
        return {
          profile: t,
          lessonsCount: lessons.length,
          imagesCount: lessons.reduce((sum, l) => sum + (l.images?.length || 0) + (l.homeworkImages?.length || 0), 0),
          lastLessonAt,
          lastActivityAt: ws?.updated_at ?? null,
          notesCount: teacherNotes.length,
          pendingNotes: teacherNotes.filter((n) => n.status === "submitted").length,
          timetable: tt
            ? {
                slots: (tt.slots as TimetableSlot[]) || [],
                image_path: tt.image_path,
                updated_at: tt.updated_at,
              }
            : null,
        };
      });

      // جلب زيارات التفتيش المعتمدة للمقاطعة
      const visits = getLocalVisits(district);

      setData({
        teachers: stats,
        notes,
        circulars,
        reads: (readsRes.data as DistrictData["reads"]) || [],
        schools: schoolsRes.data || [],
        visits,
      });
    } catch (e: any) {
      setError(e?.message || "تعذر تحميل بيانات المقاطعة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (districtId) load(districtId);
  }, [districtId, load]);

  const totals = useMemo(() => {
    const t = data?.teachers || [];
    return {
      teachers: t.length,
      lessons: t.reduce((s, x) => s + x.lessonsCount, 0),
      pendingNotes: (data?.notes || []).filter((n) => n.status === "submitted").length,
      notes: data?.notes.length || 0,
      circulars: data?.circulars.length || 0,
      visits: data?.visits.length || 0,
      schools: new Set(t.map((x) => x.profile.middle_school_id || x.profile.school_custom_name).filter(Boolean)).size,
    };
  }, [data]);

  if (profileLoading || !profile || !districtId) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const inspectorTabs: { id: InspectorTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "teachers", label: `أساتذة المقاطعة (${totals.teachers})`, icon: <Users className="w-4 h-4" /> },
    {
      id: "notes",
      label: `فحص ومصادقة الوثائق (${totals.notes})`,
      icon: <FileText className="w-4 h-4" />,
      badge: totals.pendingNotes,
    },
    { id: "circulars", label: `المناشير والندوات (${totals.circulars})`, icon: <Megaphone className="w-4 h-4" /> },
    { id: "visits", label: `سجل وبطاقات الزيارات (${totals.visits})`, icon: <FileCheck2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16" dir="rtl">
      {/* ─── الترويسة الرئيسية ─── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                  فضاء التفتيش والمناشير البيداغوجية
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {viewMode === "teacher" ? "واجهة الأستاذ" : "واجهة المفتش"}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                ولاية الوادي • {DISTRICTS_INFO[districtId] || `المقاطعة ${districtId}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* زر تبديل المعاينة بين الأستاذ والمفتش */}
            <button
              onClick={() => setViewMode(viewMode === "teacher" ? "inspector" : "teacher")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                viewMode === "inspector"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
              }`}
              title="التبديل بين فضاء الأستاذ وفضاء المفتش لمعاينة كلا الجانبين"
            >
              {viewMode === "teacher" ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">معاينة لوحة المفتش</span>
                  <span className="sm:hidden">المفتش</span>
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4 text-white" />
                  <span className="hidden sm:inline">العودة لفضاء الأستاذ</span>
                  <span className="sm:hidden">الأستاذ</span>
                </>
              )}
            </button>

            {/* محدد المقاطعة للمشرف العام */}
            {profile.role === "admin" && (
              <select
                value={districtId}
                onChange={(e) => setDistrictId(Number(e.target.value))}
                className="py-1.5 px-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
                aria-label="المقاطعة"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    المقاطعة {n}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => districtId && load(districtId)}
              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              href="/forum"
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hidden sm:flex items-center gap-1"
              title="ملتقى الأساتذة"
            >
              💬 الملتقى
            </Link>

            <Link
              href="/settings"
              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
              title="إعدادات الحساب"
            >
              <Settings className="w-4 h-4" />
            </Link>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── محتوى الصفحة ─── */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => districtId && load(districtId)} className="underline text-red-800">
              إعادة المحاولة
            </button>
          </div>
        )}

        {loading || !data ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
            <p className="text-xs font-medium">جاري تحميل بيانات فضاء التفتيش والمقاطعة...</p>
          </div>
        ) : viewMode === "teacher" ? (
          /* ═══════════════════════════════════════════════════════════════
             1. فضاء الأستاذ والمقاطعة التفتيشية (TeacherPortal)
             ═══════════════════════════════════════════════════════════════ */
          <TeacherPortal
            profile={profile}
            districtId={districtId}
            data={data}
            onReload={() => load(districtId)}
            onSwitchToInspector={() => setViewMode("inspector")}
          />
        ) : (
          /* ═══════════════════════════════════════════════════════════════
             2. لوحة قيادة المفتشية والمتابعة (Inspector Dashboard)
             ═══════════════════════════════════════════════════════════════ */
          <div className="space-y-5">
            {/* شريط الإحصائيات المركزية */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat
                icon={<Users className="w-5 h-5" />}
                tone="bg-blue-50 text-blue-600"
                value={totals.teachers}
                label="أساتذة المقاطعة المسجلين"
              />
              <Stat
                icon={<BookOpen className="w-5 h-5" />}
                tone="bg-emerald-50 text-emerald-600"
                value={totals.lessons}
                label="درس منشور على السبورات"
              />
              <Stat
                icon={<FileText className="w-5 h-5" />}
                tone="bg-amber-50 text-amber-600"
                value={`${totals.pendingNotes} / ${totals.notes}`}
                label="وثائق تنتظر الفحص"
              />
              <Stat
                icon={<Building2 className="w-5 h-5" />}
                tone="bg-purple-50 text-purple-600"
                value={totals.schools}
                label="متوسطة نشطة بالمقاطعة"
              />
            </div>

            {/* شريط تبويبات المفتشية */}
            <div className="flex border-b border-slate-200 gap-1 overflow-x-auto bg-white p-1 rounded-2xl shadow-xs">
              {inspectorTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setInspectorTab(t.id)}
                  className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition ${
                    inspectorTab === t.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {Boolean(t.badge) && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center">
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* محتوى تبويبات المفتشية */}
            {inspectorTab === "teachers" ? (
              <TeachersTab data={data} />
            ) : inspectorTab === "notes" ? (
              <NotesReview data={data} onChanged={() => load(districtId)} />
            ) : inspectorTab === "circulars" ? (
              <CircularsTab
                data={data}
                districtId={districtId}
                inspector={profile}
                onChanged={() => load(districtId)}
              />
            ) : (
              <VisitsTab
                data={data}
                districtId={districtId}
                inspector={profile}
                onChanged={() => load(districtId)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({
  icon,
  tone,
  value,
  label,
}: {
  icon: React.ReactNode;
  tone: string;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xl font-black text-slate-900">{value}</p>
        <p className="text-[11px] text-slate-500 font-medium truncate">{label}</p>
      </div>
    </div>
  );
}
