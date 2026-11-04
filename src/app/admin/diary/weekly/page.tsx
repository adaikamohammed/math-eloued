"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  ChevronLeft,
  Printer,
  ArrowRight,
  Clock,
  BookOpen,
  Plus,
  Filter,
  Sparkles,
  School,
  FileText,
  Users,
  CheckCircle2,
  RotateCcw,
  BookMarked,
  ClipboardList,
  Palmtree,
  ShieldCheck,
  Layers,
  GraduationCap,
  Sun,
  Moon,
  Coffee,
  LayoutGrid,
  TableProperties,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { useProfile } from "@/lib/useProfile";
import { checkTeacherSession } from "@/lib/offlineAuth";
import { getTeacherOfflineData, setupAutoSync } from "@/lib/offlineStorage";
import {
  DailyDiaryEntry,
  SpecialDayRecord,
  TeacherTimetable,
  sortClasses,
  LessonsData,
} from "@/lib/types";

// ألوان مخصصة للأفواج
const CLASS_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  emerald: { bg: "bg-emerald-50 text-emerald-950", text: "text-emerald-700", border: "border-emerald-300", badge: "bg-emerald-700 text-white" },
  sky: { bg: "bg-sky-50 text-sky-950", text: "text-sky-700", border: "border-sky-300", badge: "bg-sky-700 text-white" },
  amber: { bg: "bg-amber-50 text-amber-950", text: "text-amber-700", border: "border-amber-300", badge: "bg-amber-700 text-white" },
  purple: { bg: "bg-purple-50 text-purple-950", text: "text-purple-700", border: "border-purple-300", badge: "bg-purple-700 text-white" },
  rose: { bg: "bg-rose-50 text-rose-950", text: "text-rose-700", border: "border-rose-300", badge: "bg-rose-700 text-white" },
  indigo: { bg: "bg-indigo-50 text-indigo-950", text: "text-indigo-700", border: "border-indigo-300", badge: "bg-indigo-700 text-white" },
  teal: { bg: "bg-teal-50 text-teal-950", text: "text-teal-700", border: "border-teal-300", badge: "bg-teal-700 text-white" },
};

const COLOR_KEYS = Object.keys(CLASS_COLORS);

function getClassColor(className: string) {
  let hash = 0;
  for (let i = 0; i < className.length; i++) hash = (hash << 5) - hash + className.charCodeAt(i);
  const key = COLOR_KEYS[Math.abs(hash) % COLOR_KEYS.length];
  return CLASS_COLORS[key] || CLASS_COLORS.emerald;
}

// أشهر السنة بالعربية
const ARABIC_MONTHS = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

// أيام الأسبوع الدراسي الجزائري (الأحد إلى الخميس)
const SCHOOL_DAYS_MAP: { dayIndex: number; name: string }[] = [
  { dayIndex: 0, name: "الأحد" },
  { dayIndex: 1, name: "الإثنين" },
  { dayIndex: 2, name: "الثلاثاء" },
  { dayIndex: 3, name: "الأربعاء" },
  { dayIndex: 4, name: "الخميس" },
];

// تعريف الحصص الزمنية القياسية المعتمدة في التعليم المتوسط الجزائري
export interface SlotDefinition {
  id: string;
  start: string;
  end: string;
  label: string;
  period: "morning" | "afternoon";
}

// الحصص الصباحية (4 ساعات)
const MORNING_SLOTS: SlotDefinition[] = [
  { id: "m1", start: "08:00", end: "09:00", label: "08:00 - 09:00", period: "morning" },
  { id: "m2", start: "09:00", end: "10:00", label: "09:00 - 10:00", period: "morning" },
  { id: "m3", start: "10:00", end: "11:00", label: "10:00 - 11:00", period: "morning" },
  { id: "m4", start: "11:00", end: "12:00", label: "11:00 - 12:00", period: "morning" },
];

/**
 * دالة حساب نطاق الأسبوع المدرسي (الأحد إلى الخميس) لتاريخ معين
 */
function getSchoolWeek(refDate: Date): {
  sunday: Date;
  thursday: Date;
  sundayStr: string;
  thursdayStr: string;
  days: { date: Date; dateStr: string; dayName: string; dayNum: number; monthName: string; isToday: boolean }[];
} {
  const d = new Date(refDate);
  d.setHours(12, 0, 0, 0);
  const dayOfWeek = d.getDay(); // 0 = الأحد, 1 = الإثنين, ..., 5 = الجمعة, 6 = السبت

  let diffToSunday = 0;
  if (dayOfWeek === 5) {
    diffToSunday = 2; // الجمعة -> الأحد القادم
  } else if (dayOfWeek === 6) {
    diffToSunday = 1; // السبت -> الأحد القادم
  } else {
    diffToSunday = -dayOfWeek; // الأحد إلى الخميس -> الأحد من هذا الأسبوع
  }

  const sunday = new Date(d);
  sunday.setDate(d.getDate() + diffToSunday);
  sunday.setHours(12, 0, 0, 0);

  const thursday = new Date(sunday);
  thursday.setDate(sunday.getDate() + 4);
  thursday.setHours(12, 0, 0, 0);

  const toStr = (date: Date) => date.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  const days = [0, 1, 2, 3, 4].map((offset) => {
    const dayDate = new Date(sunday);
    dayDate.setDate(sunday.getDate() + offset);
    dayDate.setHours(12, 0, 0, 0);
    const dateStr = toStr(dayDate);
    const dayNum = dayDate.getDate();
    const monthName = ARABIC_MONTHS[dayDate.getMonth()];
    const dayName = SCHOOL_DAYS_MAP[offset].name;
    const isToday = dateStr === todayStr;

    return {
      date: dayDate,
      dateStr,
      dayName,
      dayNum,
      monthName,
      isToday,
    };
  });

  return {
    sunday,
    thursday,
    sundayStr: toStr(sunday),
    thursdayStr: toStr(thursday),
    days,
  };
}

// تنسيق تاريخ باللغة العربية
function formatArabicDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const day = d < 10 ? `0${d}` : `${d}`;
    return `${day} ${ARABIC_MONTHS[dateObj.getMonth()]} ${y}`;
  } catch {
    return dateStr;
  }
}

/**
 * مطابقة الحصة المدونة في الدفتر اليومي مع خانة زمنية معينة
 */
function findEntryForSlot(
  dayEntries: DailyDiaryEntry[],
  slot: SlotDefinition
): DailyDiaryEntry | undefined {
  if (!dayEntries || dayEntries.length === 0) return undefined;

  // 1. مطابقة دقيقة أولاً
  const exact = dayEntries.find((e) => {
    const t = (e.periodTime || "").trim();
    return t === slot.label || t.replace(/\s+/g, "") === slot.label.replace(/\s+/g, "");
  });
  if (exact) return exact;

  // 2. مطابقة بساعة البداية
  const startHour = slot.start.split(":")[0];
  const byStartHour = dayEntries.find((e) => {
    const t = (e.periodTime || "").trim();
    return t.startsWith(startHour + ":") || t.startsWith(startHour + "h") || t.includes(slot.start);
  });
  if (byStartHour) return byStartHour;

  return undefined;
}

export default function WeeklyDiaryPage() {
  const { profile } = useProfile();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // البيانات
  const [entries, setEntries] = useState<DailyDiaryEntry[]>([]);
  const [specialDays, setSpecialDays] = useState<SpecialDayRecord[]>([]);
  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [timetable, setTimetable] = useState<TeacherTimetable | null>(null);

  // التحكم بالأسبوع والتاريخ والوضع
  const [currentRefDate, setCurrentRefDate] = useState<Date>(() => new Date());
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "columns">("table"); // الافتراضي هو جدول التوقيت الشبكي المقسم صباحاً ومساءً

  // حساب أيام الأسبوع الحالي
  const weekInfo = useMemo(() => getSchoolWeek(currentRefDate), [currentRefDate]);

  // التحقق من الجلسة وتحميل البيانات
  useEffect(() => {
    let unmounted = false;

    async function init() {
      setLoading(true);
      const session = await checkTeacherSession();
      if (unmounted) return;

      if (!session.authenticated) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      setAuthenticated(true);
      setIsOffline(session.isOffline);

      const teacherId = session.profile?.id;

      try {
        const res = await fetch("/api/lessons", { cache: "no-store" });
        if (res.ok) {
          const data: LessonsData = await res.json();
          if (unmounted) return;
          setEntries(data.diaryEntries || []);
          setSpecialDays(data.specialDays || []);
          setCustomClasses(data.customClasses || []);
          setTimetable(data.timetable || null);
        } else {
          throw new Error("Failed to fetch server data");
        }
      } catch (e) {
        console.warn("Using offline teacher data for weekly diary:", e);
        if (teacherId) {
          const offlineData = getTeacherOfflineData(teacherId);
          if (unmounted) return;
          if (offlineData) {
            setEntries(offlineData.diaryEntries || []);
            setSpecialDays(offlineData.specialDays || []);
            setCustomClasses(offlineData.customClasses || []);
            setTimetable(offlineData.timetable || null);
          }
          setIsOffline(true);
        }
      } finally {
        if (!unmounted) setLoading(false);
      }
    }

    init();

    if (profile?.id) {
      const cleanupSync = setupAutoSync(profile.id, () => {
        setIsOffline(false);
      });
      return () => {
        unmounted = true;
        cleanupSync();
      };
    }

    return () => {
      unmounted = true;
    };
  }, [profile?.id]);

  // تحديد ساعات الفترة المسائية ديناميكياً بناءً على مدخلات الأستاذ وتوقيت مؤسسته
  const afternoonSlots = useMemo<SlotDefinition[]>(() => {
    // فحص ما إذا كان الأستاذ يستخدم توقيت 13:30 أو 14:00 أو 13:00
    let uses1330 = false;
    let uses1300 = false;

    for (const e of entries) {
      const t = e.periodTime || "";
      if (t.includes("13:30")) uses1330 = true;
      if (t.startsWith("13:00")) uses1300 = true;
    }

    if (uses1330) {
      return [
        { id: "a1", start: "13:30", end: "14:30", label: "13:30 - 14:30", period: "afternoon" },
        { id: "a2", start: "14:30", end: "15:30", label: "14:30 - 15:30", period: "afternoon" },
        { id: "a3", start: "15:30", end: "16:30", label: "15:30 - 16:30", period: "afternoon" },
      ];
    }

    if (uses1300) {
      return [
        { id: "a0", start: "13:00", end: "14:00", label: "13:00 - 14:00", period: "afternoon" },
        { id: "a1", start: "14:00", end: "15:00", label: "14:00 - 15:00", period: "afternoon" },
        { id: "a2", start: "15:00", end: "16:00", label: "15:00 - 16:00", period: "afternoon" },
        { id: "a3", start: "16:00", end: "17:00", label: "16:00 - 17:00", period: "afternoon" },
      ];
    }

    // التوقيت الشائع في ولاية الوادي والجنوب والوطني (14:00 إلى 17:00)
    return [
      { id: "a1", start: "14:00", end: "15:00", label: "14:00 - 15:00", period: "afternoon" },
      { id: "a2", start: "15:00", end: "16:00", label: "15:00 - 16:00", period: "afternoon" },
      { id: "a3", start: "16:00", end: "17:00", label: "16:00 - 17:00", period: "afternoon" },
    ];
  }, [entries]);

  // التنقل بين الأسابيع
  const handlePrevWeek = useCallback(() => {
    setCurrentRefDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentRefDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  }, []);

  const handleCurrentWeek = useCallback(() => {
    setCurrentRefDate(new Date());
  }, []);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const [y, m, d] = e.target.value.split("-").map(Number);
      setCurrentRefDate(new Date(y, m - 1, d, 12, 0, 0));
    }
  }, []);

  // الحصص المفلترة للأسبوع
  const weekEntriesByDate = useMemo(() => {
    const map: Record<string, DailyDiaryEntry[]> = {};
    for (const d of weekInfo.days) {
      map[d.dateStr] = [];
    }

    const filtered = entries.filter((e) => {
      if (selectedClassFilter !== "all" && e.className !== selectedClassFilter) {
        return false;
      }
      return map[e.date] !== undefined;
    });

    for (const e of filtered) {
      if (map[e.date]) {
        map[e.date].push(e);
      }
    }

    return map;
  }, [entries, weekInfo.days, selectedClassFilter]);

  // الأيام الخاصة في الأسبوع
  const weekSpecialDaysByDate = useMemo(() => {
    const map: Record<string, SpecialDayRecord> = {};
    for (const sd of specialDays) {
      const start = sd.date;
      const end = sd.endDate || sd.date;
      for (const d of weekInfo.days) {
        if (d.dateStr >= start && d.dateStr <= end) {
          map[d.dateStr] = sd;
        }
      }
    }
    return map;
  }, [specialDays, weekInfo.days]);

  // قائمة جميع الأفواج المتاحة للفلتر
  const allClasses = useMemo(() => {
    const set = new Set<string>(customClasses);
    for (const e of entries) {
      if (e.className) set.add(e.className);
    }
    return sortClasses(Array.from(set));
  }, [customClasses, entries]);

  // إجمالي حصص الأسبوع
  const totalWeekSessions = useMemo(() => {
    let count = 0;
    for (const day of weekInfo.days) {
      count += (weekEntriesByDate[day.dateStr] || []).length;
    }
    return count;
  }, [weekEntriesByDate, weekInfo.days]);

  // بيانات الترويسة للطباعة
  const printTeacherName = profile?.full_name || "الأستاذ";
  const printSchoolName = profile?.school_custom_name || "المتوسطة";
  const printSubject = profile?.subject || "الرياضيات";
  const printWilaya = "الوادي";

  if (authenticated === false) {
    return <LoginRequired next="/admin/diary/weekly" title="المخطط الأسبوعي للدفتر اليومي" />;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-white text-gray-900 pb-20 print:p-0 print:bg-white">
      {/* ─── تنسيقات الطباعة الرسمية الوزارية A4 Landscape ─── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
          }
          body {
            background: #fff !important;
            color: #000 !important;
            font-size: 10px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden,
          nav,
          aside,
          header,
          footer,
          button,
          .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #000 !important;
            padding: 4px !important;
            text-align: center !important;
            vertical-align: middle !important;
          }
          .print-table th {
            background-color: #f1f5f9 !important;
            color: #000 !important;
            font-weight: 900 !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-5 space-y-5 print-full-width">

        {/* ─── ترويسة الطباعة الرسمية الوزارية (تظهر فقط عند الطباعة) ─── */}
        <div className="hidden print:block border-b-2 border-black pb-2 mb-3">
          <div className="text-center space-y-0.5">
            <p className="text-xs font-bold text-gray-900 leading-tight">الجمهورية الجزائرية الديمقراطية الشعبية</p>
            <p className="text-[11px] font-bold text-gray-800">
              وزارة التربية الوطنية — مديرية التربية لولاية {printWilaya}
            </p>
            <h1 className="text-sm font-black text-black pt-0.5 tracking-wide">
              المخطط الأسبوعي للدفتر اليومي البيداغوجي (PLANNING HEBDOMADAIRE DU CAHIER JOURNAL)
            </h1>
            <p className="text-[11px] font-semibold text-gray-700">
              الأسبوع من: <strong className="text-black">{formatArabicDate(weekInfo.sundayStr)}</strong> إلى:{" "}
              <strong className="text-black">{formatArabicDate(weekInfo.thursdayStr)}</strong>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] border-t border-gray-400 pt-1 text-gray-900">
            <div>
              <span>المؤسسة: </span>
              <strong className="text-black">{printSchoolName}</strong>
            </div>
            <div className="text-center">
              <span>الأستاذ(ة): </span>
              <strong className="text-black">{printTeacherName}</strong>
            </div>
            <div className="text-left">
              <span>المادة: </span>
              <strong className="text-black">{printSubject}</strong> • الموسم: <strong>2026 / 2027</strong>
            </div>
          </div>
        </div>

        {/* ─── شريط المسار وأزرار العمليات العلوية (يختفي في الطباعة) ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <Link href="/admin" className="hover:text-gray-900 transition flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              لوحة الأستاذ
            </Link>
            <span>/</span>
            <Link href="/admin/diary" className="hover:text-gray-900 transition flex items-center gap-1">
              الدفتر اليومي
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-black">المخطط الأسبوعي</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* تبديل وضع العرض: شبكة الجدول مثل timetable أو أعمدة الأيام */}
            <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="عرض شبكة الجدول (مطابق لصفحة جدول التوقيت)"
              >
                <TableProperties className="w-3.5 h-3.5 text-emerald-600" />
                <span>شبكة الجدول الأسبوعي</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("columns")}
                className={`px-3 py-1 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "columns"
                    ? "bg-white text-gray-900 shadow-xs border border-gray-200"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="عرض بطاقات الأيام بأعمدة منفصلة"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-sky-600" />
                <span>بطاقات الأيام</span>
              </button>
            </div>

            <Link
              href="/admin/diary"
              className="px-3.5 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition shadow-2xs flex items-center gap-1.5"
            >
              <ClipboardList className="w-3.5 h-3.5 text-gray-600" />
              <span>الدفتر اليومي المفصل 📋</span>
            </Link>

            <Link
              href="/admin/timetable"
              className="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-black text-emerald-800 transition shadow-2xs flex items-center gap-1.5"
              title="الانتقال إلى صفحة جدول التوقيت الأسبوعي"
            >
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
              <span>جدول التوقيت 📅</span>
            </Link>

            <button
              onClick={() => window.print()}
              type="button"
              className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المخطط الأسبوعي A4 🖨️</span>
            </button>
          </div>
        </div>

        {/* ─── بطاقة التنبيه الأوفلاين إن وجد (يختفي في الطباعة) ─── */}
        {isOffline && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2 shadow-2xs print:hidden">
            <div className="flex items-center gap-2 font-bold">
              <span>⚡</span>
              <span>أنت تعمل في وضع عدم الاتصال (أوفلاين) — المخطط الأسبوعي يعتمد على بياناتك المحفوظة محلياً في هذا الجهاز.</span>
            </div>
            <span className="text-[11px] bg-amber-200/80 px-2 py-0.5 rounded-full font-black">أوفلاين محمي</span>
          </div>
        )}

        {/* ─── لوحة التحكم العلوية: التنقل بين الأسابيع والفلاتر (يختفي في الطباعة) ─── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

            {/* عنوان الصفحة ووصفها */}
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                    المخطط الأسبوعي للدفتر اليومي
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                      {totalWeekSessions} حصة مسجلة
                    </span>
                  </h1>
                  <p className="text-xs text-gray-500">
                    مقسم إلى فترة صباحية وفترة مسائية، مع إبقاء الحصص غير المسجلة فارغة وعرض عنوان المورد فقط.
                  </p>
                </div>
              </div>
            </div>

            {/* شريط أزرار التنقل بين الأسابيع */}
            <div className="flex items-center gap-2 flex-wrap bg-gray-50 p-1.5 rounded-xl border border-gray-200">
              <button
                onClick={handlePrevWeek}
                type="button"
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1 transition shadow-2xs cursor-pointer"
                title="الانتقال إلى الأسبوع السابق"
              >
                <ChevronRight className="w-4 h-4" />
                <span>الأسبوع السابق</span>
              </button>

              <button
                onClick={handleCurrentWeek}
                type="button"
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black flex items-center gap-1 transition shadow-2xs cursor-pointer"
                title="العودة إلى الأسبوع الحالي"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>الأسبوع الحالي</span>
              </button>

              <button
                onClick={handleNextWeek}
                type="button"
                className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1 transition shadow-2xs cursor-pointer"
                title="الانتقال إلى الأسبوع التالي"
              >
                <span>الأسبوع التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* سطر نطاق التواريخ والفلترة حسب الفوج */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
            {/* عرض نطاق الأسبوع مع منتقي التاريخ */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-gray-500">نطاق الأسبوع:</span>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg font-black text-emerald-900">
                <span>من الأحد {formatArabicDate(weekInfo.sundayStr)}</span>
                <span>إلى الخميس {formatArabicDate(weekInfo.thursdayStr)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <span className="text-[11px]">الانتقال لتاريخ:</span>
                <input
                  type="date"
                  value={weekInfo.sundayStr}
                  onChange={handleDateChange}
                  className="px-2 py-0.5 rounded border border-gray-300 text-xs font-medium bg-white focus:outline-emerald-500"
                />
              </div>
            </div>

            {/* فلتر الفوج */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-bold text-gray-600">الفوج التربوي:</span>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-800 focus:outline-emerald-500"
              >
                <option value="all">كل الأفواج ({allClasses.length})</option>
                {allClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            النمط 1: شبكة الجدول الأسبوعي المقسم صباحاً ومساءً (مثل /admin/timetable)
            وهو النمط المعروض افتراضياً والمعتمد في الطباعة الرسمية
        ═════════════════════════════════════════════════════════════════════ */}
        <div
          className={`bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden ${
            viewMode === "table" ? "block" : "hidden print:block"
          }`}
        >
          <div className="overflow-x-auto relative scrollbar-thin">
            <table className="w-full border-collapse text-right min-w-[950px] print:min-w-full print:border print:border-black">
              <thead>
                {/* سطر العناوين الكبرى: اليوم، الفترة الصباحية، الاستراحة، الفترة المسائية */}
                <tr className="bg-gray-100 border-b border-gray-300 text-xs font-black text-gray-800 print:bg-gray-200 print:border-black print:text-black">
                  <th
                    rowSpan={2}
                    className="py-3 px-3 w-32 border-l border-gray-300 bg-gray-200/90 text-center sticky right-0 z-20 shadow-xs print:static print:border-black print:bg-gray-200"
                  >
                    اليوم والتاريخ
                  </th>

                  {/* ترويسة الفترة الصباحية */}
                  <th
                    colSpan={MORNING_SLOTS.length}
                    className="py-2 px-2 text-center bg-sky-50 text-sky-900 border-l border-gray-300 print:bg-gray-100 print:text-black print:border-black"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-500 print:hidden" />
                      <span>الفترة الصباحية (08:00 — 12:00)</span>
                    </div>
                  </th>

                  {/* ترويسة استراحة منتصف النهار */}
                  <th
                    rowSpan={2}
                    className="py-2 px-2 w-16 bg-slate-100 text-slate-700 border-l border-gray-300 text-center font-black text-[11px] print:border-black print:bg-gray-200 print:text-black"
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <Coffee className="w-4 h-4 text-amber-700 print:hidden" />
                      <span>استراحة</span>
                      <span className="text-[9px] text-gray-500 font-mono print:text-black">
                        12:00 - 14:00
                      </span>
                    </div>
                  </th>

                  {/* ترويسة الفترة المسائية */}
                  <th
                    colSpan={afternoonSlots.length}
                    className="py-2 px-2 text-center bg-amber-50 text-amber-900 border-l border-gray-300 print:bg-gray-100 print:text-black print:border-black"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <Moon className="w-4 h-4 text-indigo-500 print:hidden" />
                      <span>الفترة المسائية ({afternoonSlots[0]?.start} — {afternoonSlots[afternoonSlots.length - 1]?.end})</span>
                    </div>
                  </th>
                </tr>

                {/* سطر الساعات التفصيلية لكل فترة */}
                <tr className="bg-gray-50 border-b border-gray-300 text-[11px] font-bold text-gray-700 print:bg-gray-100 print:border-black print:text-black">
                  {/* ساعات الصباح */}
                  {MORNING_SLOTS.map((slot) => (
                    <th key={slot.id} className="py-2 px-1 text-center border-l border-gray-300 print:border-black">
                      <span className="block font-black text-gray-900 print:text-black">{slot.label}</span>
                    </th>
                  ))}

                  {/* ساعات المساء */}
                  {afternoonSlots.map((slot) => (
                    <th key={slot.id} className="py-2 px-1 text-center border-l border-gray-300 last:border-l-0 print:border-black">
                      <span className="block font-black text-gray-900 print:text-black">{slot.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {weekInfo.days.map((day) => {
                  const dayEntries = weekEntriesByDate[day.dateStr] || [];
                  const specialDay = weekSpecialDaysByDate[day.dateStr];
                  const isTuesday = day.dayName === "الثلاثاء";

                  // إذا كان اليوم عطلة أو يوماً خاصاً
                  if (specialDay) {
                    return (
                      <tr key={day.dateStr} className="border-b border-gray-300 break-inside-avoid print:border-black">
                        <td className="py-3 px-2 font-black text-xs text-gray-900 bg-gray-100 border-l border-gray-300 sticky right-0 z-10 shadow-xs text-center print:static print:border-black print:bg-gray-100">
                          <div className="font-black text-sm">{day.dayName}</div>
                          <div className="text-[10px] text-gray-600 font-bold">{formatArabicDate(day.dateStr)}</div>
                        </td>
                        <td
                          colSpan={MORNING_SLOTS.length + 1 + afternoonSlots.length}
                          className="p-4 text-center bg-amber-50/70 border-l border-gray-300 print:border-black"
                        >
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border border-amber-300 rounded-full text-xs font-black text-amber-950">
                            <span>📌</span>
                            <span>{specialDay.title}</span>
                          </div>
                          {specialDay.description && (
                            <p className="text-xs text-amber-900 mt-1 max-w-xl mx-auto font-medium">
                              {specialDay.description}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={day.dateStr}
                      className={`border-b border-gray-200 transition hover:bg-slate-50/40 break-inside-avoid print:border-black ${
                        day.isToday ? "bg-emerald-50/20" : ""
                      }`}
                    >
                      {/* عمود اسم اليوم والتاريخ */}
                      <td className="py-3 px-2.5 font-black text-xs text-gray-900 bg-gray-50 border-l border-gray-300 sticky right-0 z-10 shadow-xs text-center print:static print:border-black print:bg-gray-100">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-black text-sm">{day.dayName}</span>
                          {day.isToday && (
                            <span className="text-[9px] bg-emerald-700 text-white px-1.5 py-0.2 rounded font-black print:hidden">
                              اليوم
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-600 font-bold mt-0.5">
                          {formatArabicDate(day.dateStr)}
                        </div>
                      </td>

                      {/* ─── خانات الفترة الصباحية ─── */}
                      {MORNING_SLOTS.map((slot) => {
                        const entry = findEntryForSlot(dayEntries, slot);
                        const color = entry ? getClassColor(entry.className) : null;

                        return (
                          <td
                            key={slot.id}
                            className="p-1.5 border-l border-gray-300 align-top min-w-[130px] max-w-[170px] print:border-black print:p-1"
                          >
                            {entry ? (
                              <div
                                className={`p-2 rounded-xl border ${color?.bg} ${color?.border} shadow-2xs space-y-1 h-full flex flex-col justify-between print:p-1 print:border-black print:bg-white`}
                              >
                                <div>
                                  {/* شارة الفوج ورقم المذكرة ونوع الحصة */}
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${color?.badge} print:border print:border-black print:text-black print:bg-gray-100`}>
                                      {entry.className}
                                    </span>
                                    {entry.lessonNoteNumber && (
                                      <span className="text-[9px] font-bold text-gray-700 bg-white/90 px-1 py-0.2 rounded border border-gray-300">
                                        {entry.lessonNoteNumber}
                                      </span>
                                    )}
                                  </div>

                                  {/* ── عنوان المورد فقط (المطلب الأساسي) ── */}
                                  <div className="text-right">
                                    <h4 className="text-[11px] font-black text-gray-900 leading-tight print:text-black">
                                      {entry.lessonTitle}
                                    </h4>
                                    {entry.section && (
                                      <p className="text-[9px] text-gray-600 mt-0.5 line-clamp-1 font-medium print:text-gray-800">
                                        {entry.section}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* الواجب إن وجد */}
                                {entry.homework && (
                                  <div className="pt-1 border-t border-dashed border-gray-300/80 text-[9px] text-gray-700 font-medium line-clamp-1 print:hidden">
                                    <span className="font-bold">واجب:</span> {entry.homework}
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* ── خانة فارغة للحصص غير المسجلة (المطلب: وحصص التي لم اسجلها تكون فارغة) ── */
                              <div className="h-full min-h-[70px] rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center p-2 text-gray-400 group hover:border-emerald-300 hover:bg-emerald-50/30 transition print:border-none print:bg-transparent">
                                <span className="text-[10px] font-medium text-gray-400 print:hidden group-hover:hidden">
                                  — فارغة —
                                </span>
                                <Link
                                  href={`/admin/diary`}
                                  className="hidden group-hover:flex items-center gap-1 text-[10px] text-emerald-700 font-bold print:hidden"
                                  title="تحضير حصة في الدفتر"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>تحضير</span>
                                </Link>
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* ─── عمود استراحة منتصف النهار ─── */}
                      <td className="p-1 border-l border-gray-300 bg-slate-100/80 text-center align-middle print:border-black print:bg-gray-100">
                        <div className="text-[10px] font-bold text-slate-500 font-mono rotate-90 sm:rotate-0 print:rotate-0 print:text-black">
                          استراحة
                        </div>
                      </td>

                      {/* ─── خانات الفترة المسائية ─── */}
                      {afternoonSlots.map((slot, sIdx) => {
                        const entry = findEntryForSlot(dayEntries, slot);
                        const color = entry ? getClassColor(entry.className) : null;

                        // مساء الثلاثاء: راحة رسمية إن لم تسجل حصة
                        if (isTuesday && !entry) {
                          if (sIdx === 0) {
                            return (
                              <td
                                key={slot.id}
                                colSpan={afternoonSlots.length}
                                className="p-2 border-l border-gray-300 bg-slate-100/60 text-center align-middle print:border-black print:bg-gray-50"
                              >
                                <div className="text-xs font-black text-slate-600 flex items-center justify-center gap-1.5">
                                  <span>☕</span>
                                  <span>راحة رسمية (مساء يوم الثلاثاء)</span>
                                </div>
                              </td>
                            );
                          }
                          return null;
                        }

                        return (
                          <td
                            key={slot.id}
                            className="p-1.5 border-l border-gray-300 last:border-l-0 align-top min-w-[130px] max-w-[170px] print:border-black print:p-1"
                          >
                            {entry ? (
                              <div
                                className={`p-2 rounded-xl border ${color?.bg} ${color?.border} shadow-2xs space-y-1 h-full flex flex-col justify-between print:p-1 print:border-black print:bg-white`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${color?.badge} print:border print:border-black print:text-black print:bg-gray-100`}>
                                      {entry.className}
                                    </span>
                                    {entry.lessonNoteNumber && (
                                      <span className="text-[9px] font-bold text-gray-700 bg-white/90 px-1 py-0.2 rounded border border-gray-300">
                                        {entry.lessonNoteNumber}
                                      </span>
                                    )}
                                  </div>

                                  {/* عنوان المورد فقط */}
                                  <div className="text-right">
                                    <h4 className="text-[11px] font-black text-gray-900 leading-tight print:text-black">
                                      {entry.lessonTitle}
                                    </h4>
                                    {entry.section && (
                                      <p className="text-[9px] text-gray-600 mt-0.5 line-clamp-1 font-medium print:text-gray-800">
                                        {entry.section}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {entry.homework && (
                                  <div className="pt-1 border-t border-dashed border-gray-300/80 text-[9px] text-gray-700 font-medium line-clamp-1 print:hidden">
                                    <span className="font-bold">واجب:</span> {entry.homework}
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* خانة فارغة */
                              <div className="h-full min-h-[70px] rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center p-2 text-gray-400 group hover:border-emerald-300 hover:bg-emerald-50/30 transition print:border-none print:bg-transparent">
                                <span className="text-[10px] font-medium text-gray-400 print:hidden group-hover:hidden">
                                  — فارغة —
                                </span>
                                <Link
                                  href={`/admin/diary`}
                                  className="hidden group-hover:flex items-center gap-1 text-[10px] text-emerald-700 font-bold print:hidden"
                                  title="تحضير حصة في الدفتر"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>تحضير</span>
                                </Link>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            النمط 2: عرض بطاقات الأيام بأعمدة مقسمة (صباحاً ومساءً وخانات فارغة)
        ═════════════════════════════════════════════════════════════════════ */}
        {viewMode === "columns" && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 print:hidden">
            {weekInfo.days.map((day) => {
              const dayEntries = weekEntriesByDate[day.dateStr] || [];
              const specialDay = weekSpecialDaysByDate[day.dateStr];
              const isTuesday = day.dayName === "الثلاثاء";

              return (
                <div
                  key={day.dateStr}
                  className={`bg-white border rounded-2xl p-3 flex flex-col min-h-[500px] shadow-2xs space-y-3 ${
                    day.isToday ? "border-emerald-500 ring-2 ring-emerald-100" : "border-gray-200"
                  }`}
                >
                  {/* ترويسة اليوم */}
                  <div className="pb-2 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-gray-900">{day.dayName}</span>
                        {day.isToday && (
                          <span className="text-[9px] bg-emerald-700 text-white px-1.5 py-0.2 rounded font-black">
                            اليوم
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-gray-500">
                        {day.dayNum} {day.monthName}
                      </span>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {dayEntries.length} مسجلة
                    </span>
                  </div>

                  {/* تنبيه اليوم الخاص */}
                  {specialDay && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <div className="flex items-center gap-1 font-black">
                        <span>📌</span>
                        <span>{specialDay.title}</span>
                      </div>
                      {specialDay.description && (
                        <p className="text-[10px] text-amber-800 line-clamp-2">
                          {specialDay.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── 1. قسم الفترة الصباحية ── */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-[11px] font-black text-sky-800 bg-sky-50 px-2 py-1 rounded-lg border border-sky-100">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>الفترة الصباحية (08:00 - 12:00)</span>
                    </div>

                    <div className="space-y-1.5">
                      {MORNING_SLOTS.map((slot) => {
                        const entry = findEntryForSlot(dayEntries, slot);
                        const color = entry ? getClassColor(entry.className) : null;

                        if (entry) {
                          return (
                            <div
                              key={slot.id}
                              className={`p-2 rounded-xl border ${color?.bg} ${color?.border} space-y-1`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${color?.badge}`}>
                                  {entry.className}
                                </span>
                                <span className="text-[10px] font-mono text-gray-500 font-bold">
                                  {slot.label}
                                </span>
                              </div>
                              <h4 className="text-[11px] font-black text-gray-900 leading-snug line-clamp-2">
                                {entry.lessonTitle}
                              </h4>
                              {entry.section && (
                                <p className="text-[9px] text-gray-500 line-clamp-1">{entry.section}</p>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={slot.id}
                            className="p-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-between text-gray-400 text-[10px]"
                          >
                            <span className="font-mono">{slot.label}</span>
                            <span className="text-[9px] text-gray-400">فارغة</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── فاصل استراحة منتصف النهار ── */}
                  <div className="py-1 px-2 text-center bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 flex items-center justify-center gap-1">
                    <Coffee className="w-3 h-3 text-amber-700" />
                    <span>استراحة منتصف النهار (12:00 - 14:00)</span>
                  </div>

                  {/* ── 2. قسم الفترة المسائية ── */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-1 text-[11px] font-black text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                      <Moon className="w-3.5 h-3.5 text-indigo-500" />
                      <span>الفترة المسائية ({afternoonSlots[0]?.start} - {afternoonSlots[afternoonSlots.length - 1]?.end})</span>
                    </div>

                    <div className="space-y-1.5">
                      {isTuesday && dayEntries.filter((e) => (e.periodTime || "").localeCompare("13:00") >= 0).length === 0 ? (
                        <div className="p-3 text-center bg-slate-100 rounded-xl text-xs font-black text-slate-600">
                          ☕ راحة رسمية مساء الثلاثاء
                        </div>
                      ) : (
                        afternoonSlots.map((slot) => {
                          const entry = findEntryForSlot(dayEntries, slot);
                          const color = entry ? getClassColor(entry.className) : null;

                          if (entry) {
                            return (
                              <div
                                key={slot.id}
                                className={`p-2 rounded-xl border ${color?.bg} ${color?.border} space-y-1`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${color?.badge}`}>
                                    {entry.className}
                                  </span>
                                  <span className="text-[10px] font-mono text-gray-500 font-bold">
                                    {slot.label}
                                  </span>
                                </div>
                                <h4 className="text-[11px] font-black text-gray-900 leading-snug line-clamp-2">
                                  {entry.lessonTitle}
                                </h4>
                                {entry.section && (
                                  <p className="text-[9px] text-gray-500 line-clamp-1">{entry.section}</p>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div
                              key={slot.id}
                              className="p-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-between text-gray-400 text-[10px]"
                            >
                              <span className="font-mono">{slot.label}</span>
                              <span className="text-[9px] text-gray-400">فارغة</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── خانة التأشيرات والتوقيعات الرسمية في أسفل صفحة الطباعة ─── */}
        <div className="hidden print:grid mt-4 pt-2 border-t-2 border-black grid-cols-3 gap-6 text-center text-[10px] break-inside-avoid">
          <div className="p-2 border border-gray-400 rounded">
            <p className="font-bold text-gray-900 mb-0.5">توقيع وختم الأستاذ(ة)</p>
            <p className="text-[10px] text-gray-700">{printTeacherName}</p>
            <div className="h-10 flex items-center justify-center text-gray-300 italic text-[10px]">
              ✍️ التوقيع
            </div>
          </div>

          <div className="p-2 border border-gray-400 rounded">
            <p className="font-bold text-gray-900 mb-0.5">تأشيرة السيد مدير المؤسسة</p>
            <p className="text-[10px] text-gray-700">بالاطلاع والمصادقة</p>
            <div className="h-10 flex items-center justify-center text-gray-300 italic text-[10px]">
              ختم الإدارة
            </div>
          </div>

          <div className="p-2 border border-gray-400 rounded">
            <p className="font-bold text-gray-900 mb-0.5">تأشيرة السيد مفتش التربية الوطنية</p>
            <p className="text-[10px] text-gray-700">لمقاطعة التفتيش والمتابعة</p>
            <div className="h-10 flex items-center justify-center text-gray-300 italic text-[10px]">
              ختم المفتشية
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
