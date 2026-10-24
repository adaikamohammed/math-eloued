"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileText,
  GraduationCap,
  Loader2,
  Megaphone,
  PenSquare,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { LoginRequired } from "@/components/LoginRequired";
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
  const { loading: profileLoading, profile, reload: reloadProfile } = useProfile();
  const [districtId, setDistrictId] = useState<number>(1);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("teachers");
  const [viewMode, setViewMode] = useState<"teacher" | "inspector">("teacher");
  const [data, setData] = useState<DistrictData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  // التحقق من الحساب وتحديد نمط العرض الافتراضي
  useEffect(() => {
    if (profileLoading) return;
    if (profile) {
      const dId = profile.district_id || 1;
      setDistrictId(dId);

      // المفتش أو المشرف يدخل مباشرة للوحة قيادة المفتشية
      if (profile.role === "inspector" || profile.role === "admin") {
        setViewMode("inspector");
      } else {
        // الأستاذ يدخل لفضاء الأستاذ والمقاطعة
        setViewMode("teacher");
      }
    }
  }, [profileLoading, profile]);

  // جلب بيانات المقاطعة بأمان تام مع دعم Fallback لعدم التعليق إطلاقاً
  const load = useCallback(async (district: number) => {
    setLoadingData(true);
    setError("");

    try {
      // 1. استعلامات المقاطعة الأساسية
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

      const teachers = (teachersRes.data as UserProfile[]) || [];
      const notes = (notesRes.data as PedagogicalNote[]) || [];
      const circulars = (circularsRes.data as InspectorCircular[]) || [];
      const schools = (schoolsRes.data as any[]) || [];

      const teacherIds = teachers.map((t) => t.id);
      const circularIds = circulars.map((c) => c.id);

      // 2. استعلامات فرعية آمنة لا توقف الصفحة أبداً
      let workspacesData: any[] = [];
      let timetablesData: any[] = [];
      let readsData: any[] = [];

      try {
        if (teacherIds.length > 0) {
          const ws = await supabase
            .from("teacher_public_data")
            .select("teacher_id, updated_at, data")
            .in("teacher_id", teacherIds);
          workspacesData = ws.data || [];
        }
      } catch {}

      try {
        if (teacherIds.length > 0) {
          const tt = await supabase
            .from("teacher_timetables")
            .select("teacher_id, slots, image_path, updated_at")
            .in("teacher_id", teacherIds);
          timetablesData = tt.data || [];
        }
      } catch {}

      try {
        if (circularIds.length > 0) {
          const rd = await supabase
            .from("circular_reads")
            .select("circular_id, teacher_id, read_at")
            .in("circular_id", circularIds);
          readsData = rd.data || [];
        }
      } catch {}

      const workspaceBy = new Map(workspacesData.map((w: any) => [w.teacher_id, w]));
      const timetableBy = new Map(timetablesData.map((t: any) => [t.teacher_id, t]));

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

      // 3. زيارات التفتيش المعتمدة
      const visits = getLocalVisits(district);

      setData({
        teachers: stats,
        notes,
        circulars,
        reads: readsData,
        schools,
        visits,
      });
    } catch (e: any) {
      console.error("Inspector space load error:", e);
      // في حال حدوث أي خطأ، نملأ البيانات بافتراضات لفتح الصفحة دائماً
      setData({
        teachers: [],
        notes: [],
        circulars: [],
        reads: [],
        schools: [],
        visits: getLocalVisits(district),
      });
      setError(e?.message || "تعذر مزامنة بعض بيانات المقاطعة، يتم عرض البيانات المتاحة حالياً.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    load(districtId);
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

  // حالة جلب الحساب
  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-9 h-9 animate-spin text-indigo-600" />
        <p className="text-xs text-slate-500 font-bold">جاري فتح فضاء التفتيش والمناشير...</p>
      </div>
    );
  }

  // إذا لم يكن مسجلاً، إظهار واجهة تسجيل الدخول بأناقة ودون تحويل إجباري
  if (!profile) {
    return (
      <LoginRequired
        next="/inspector"
        title="فضاء التفتيش والمناشير البيداغوجية"
      />
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
    <div className="space-y-6 fade-up" dir="rtl">
      {/* ─── شريط التحكم والتبديل الداخلي ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                فضاء التفتيش والمناشير البيداغوجية
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {viewMode === "teacher" ? "فضاء الأستاذ" : "لوحة المفتشية"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ولاية الوادي • {DISTRICTS_INFO[districtId] || `المقاطعة ${districtId}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* زر التبديل المباشر بين واجهة الأستاذ وواجهة المفتش */}
          <button
            onClick={() => setViewMode(viewMode === "teacher" ? "inspector" : "teacher")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
              viewMode === "inspector"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
            }`}
            title="تبديل العرض بين فضاء الأستاذ ولوحة المفتش"
          >
            {viewMode === "teacher" ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>معاينة لوحة المفتش</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-4 h-4 text-white" />
                <span>العودة لفضاء الأستاذ</span>
              </>
            )}
          </button>

          {/* محدد المقاطعة للمشرف العام */}
          {profile.role === "admin" && (
            <select
              value={districtId}
              onChange={(e) => setDistrictId(Number(e.target.value))}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
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
            onClick={() => load(districtId)}
            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => load(districtId)} className="underline text-amber-900">
            إعادة المحاولة
          </button>
        </div>
      )}

      {loadingData && !data ? (
        <div className="bg-white p-14 rounded-3xl border border-slate-200 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
          <p className="text-xs text-slate-500 font-medium">جاري تحميل بيانات المقاطعة...</p>
        </div>
      ) : viewMode === "teacher" ? (
        /* ═══════════════════════════════════════════════════════════════
           1. فضاء الأستاذ والمقاطعة التفتيشية (TeacherPortal)
           ═══════════════════════════════════════════════════════════════ */
        <TeacherPortal
          profile={profile}
          districtId={districtId}
          data={
            data || {
              teachers: [],
              notes: [],
              circulars: [],
              reads: [],
              schools: [],
              visits: getLocalVisits(districtId),
            }
          }
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
          {data && (
            <>
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
            </>
          )}
        </div>
      )}
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
