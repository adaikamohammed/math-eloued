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
const CLASS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: "bg-emerald-50 text-emerald-800", text: "text-emerald-700", border: "border-emerald-200" },
  sky: { bg: "bg-sky-50 text-sky-800", text: "text-sky-700", border: "border-sky-200" },
  amber: { bg: "bg-amber-50 text-amber-800", text: "text-amber-700", border: "border-amber-200" },
  purple: { bg: "bg-purple-50 text-purple-800", text: "text-purple-700", border: "border-purple-200" },
  rose: { bg: "bg-rose-50 text-rose-800", text: "text-rose-700", border: "border-rose-200" },
  indigo: { bg: "bg-indigo-50 text-indigo-800", text: "text-indigo-700", border: "border-indigo-200" },
  teal: { bg: "bg-teal-50 text-teal-800", text: "text-teal-700", border: "border-teal-200" },
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
  d.setHours(12, 0, 0, 0); // تفادي مشاكل التوقيت الصيفي/المحلي
  const dayOfWeek = d.getDay(); // 0 = الأحد, 1 = الإثنين, ..., 5 = الجمعة, 6 = السبت

  let diffToSunday = 0;
  if (dayOfWeek === 5) {
    // الجمعة -> الأحد القادم (تجهيز الأسبوع الجديد)
    diffToSunday = 2;
  } else if (dayOfWeek === 6) {
    // السبت -> الأحد القادم (غداً بداية الأسبوع)
    diffToSunday = 1;
  } else {
    // الأحد إلى الخميس -> الأحد من هذا الأسبوع
    diffToSunday = -dayOfWeek;
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

  // التحكم بالأسبوع والتاريخ
  const [currentRefDate, setCurrentRefDate] = useState<Date>(() => new Date());
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");

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

    // ترتيب كل يوم حسب التوقيت
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.periodTime || "").localeCompare(b.periodTime || ""));
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

  // إحصائيات الأسبوع الحالي
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
      {/* ─── تنسيقات الطباعة الرسمية A4 Landscape ─── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          body {
            background: #fff !important;
            color: #000 !important;
            font-size: 11px !important;
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
            padding: 4px 6px !important;
          }
          .print-table th {
            background-color: #f1f5f9 !important;
            color: #000 !important;
            font-weight: 800 !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6 print-full-width">

        {/* ─── ترويسة الطباعة الرسمية الوزارية (تظهر فقط عند الطباعة) ─── */}
        <div className="hidden print:block border-b-2 border-black pb-2 mb-4">
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-gray-900">الجمهورية الجزائرية الديمقراطية الشعبية</p>
            <p className="text-xs font-bold text-gray-800">
              وزارة التربية الوطنية — مديرية التربية لولاية {printWilaya}
            </p>
            <h1 className="text-base font-black text-black pt-0.5 tracking-wide">
              المخطط الأسبوعي للدفتر اليومي البيداغوجي (PLANNING HEBDOMADAIRE DU CAHIER JOURNAL)
            </h1>
            <p className="text-xs font-semibold text-gray-700">
              الأسبوع من: <strong className="text-black">{formatArabicDate(weekInfo.sundayStr)}</strong> إلى:{" "}
              <strong className="text-black">{formatArabicDate(weekInfo.thursdayStr)}</strong>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 text-xs border-t border-gray-400 pt-1 text-gray-900">
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

        {/* ─── شريط المسار والرجوع والتنقل السريع (يختفي في الطباعة) ─── */}
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
            <Link
              href="/admin/diary"
              className="px-3.5 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition shadow-2xs flex items-center gap-1.5"
            >
              <ClipboardList className="w-3.5 h-3.5 text-gray-600" />
              <span>الدفتر اليومي المفصل 📋</span>
            </Link>
            <Link
              href="/admin/cahier-textes"
              className="px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition shadow-2xs flex items-center gap-1.5"
            >
              <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
              <span>دفتر النصوص 📖</span>
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
              <span>أنت تعمل حالياً في وضع عدم الاتصال (أوفلاين) — المخطط الأسبوعي يعتمد على بيانات جهازك المحفوظة محلياً.</span>
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
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shadow-2xs">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
                    المخطط الأسبوعي للدفتر اليومي
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                      {totalWeekSessions} حصة مسجلة
                    </span>
                  </h1>
                  <p className="text-xs text-gray-500">
                    استعراض شامل لأسبوع دراسي كامل، يتضمن عنوان المورد فقط لجميع الحصص بدون تشويش.
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
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-black flex items-center gap-1 transition shadow-2xs cursor-pointer"
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 border border-sky-200 rounded-lg font-black text-sky-900">
                <span>من الأحد {formatArabicDate(weekInfo.sundayStr)}</span>
                <span>إلى الخميس {formatArabicDate(weekInfo.thursdayStr)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <span className="text-[11px]">الانتقال لتاريخ:</span>
                <input
                  type="date"
                  value={weekInfo.sundayStr}
                  onChange={handleDateChange}
                  className="px-2 py-0.5 rounded border border-gray-300 text-xs font-medium bg-white focus:outline-sky-500"
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
                className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-xs font-bold text-gray-800 focus:outline-sky-500"
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

        {/* ─── عرض البطاقات الأسبوعية للشاشة (يختفي في الطباعة) ─── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 print:hidden">
          {weekInfo.days.map((day) => {
            const dayEntries = weekEntriesByDate[day.dateStr] || [];
            const specialDay = weekSpecialDaysByDate[day.dateStr];

            return (
              <div
                key={day.dateStr}
                className={`bg-white border rounded-2xl p-3.5 flex flex-col min-h-[460px] shadow-2xs transition-all ${
                  day.isToday
                    ? "border-sky-500 ring-2 ring-sky-100 shadow-sm"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* ترويسة اليوم */}
                <div
                  className={`pb-2.5 mb-3 border-b flex items-center justify-between ${
                    day.isToday ? "border-sky-200" : "border-gray-100"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-gray-900">{day.dayName}</span>
                      {day.isToday && (
                        <span className="text-[10px] bg-sky-600 text-white px-1.5 py-0.2 rounded font-black">
                          اليوم
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-gray-500">
                      {day.dayNum} {day.monthName}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                      dayEntries.length > 0
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {dayEntries.length} {dayEntries.length === 1 ? "حصة" : "حصص"}
                  </span>
                </div>

                {/* تنبيه اليوم الخاص (عطلة، غياب مبرر، ندوة، فروض) */}
                {specialDay && (
                  <div className="p-2.5 mb-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-black">
                      <span>📌</span>
                      <span>{specialDay.title}</span>
                    </div>
                    {specialDay.description && (
                      <p className="text-[11px] text-amber-800 leading-snug line-clamp-2">
                        {specialDay.description}
                      </p>
                    )}
                  </div>
                )}

                {/* قائمة حصص اليوم */}
                <div className="space-y-2.5 flex-1">
                  {dayEntries.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-400 space-y-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-medium">لا توجد حصص مسجلة</p>
                      <Link
                        href={`/admin/diary`}
                        className="text-[11px] text-sky-600 hover:text-sky-700 font-bold hover:underline"
                      >
                        + تحضير في الدفتر
                      </Link>
                    </div>
                  ) : (
                    dayEntries.map((entry) => {
                      const color = getClassColor(entry.className);

                      return (
                        <div
                          key={entry.id}
                          className="p-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-2xs transition group relative"
                        >
                          {/* السطر الأول: التوقيت والفوج */}
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span
                              className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${color.bg} ${color.border}`}
                            >
                              {entry.className}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-gray-500 font-bold">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span>{entry.periodTime || "غير محدد"}</span>
                            </div>
                          </div>

                          {/* رقم المذكرة ونوع الحصة إن وجدا */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            {entry.lessonNoteNumber && (
                              <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200">
                                {entry.lessonNoteNumber}
                              </span>
                            )}
                            {entry.sessionType && (
                              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100">
                                {entry.sessionType}
                              </span>
                            )}
                          </div>

                          {/* ─── عنوان المورد فقط (المطلب الأساسي بدون عناوين المراحل) ─── */}
                          <div className="pt-1">
                            <h4 className="text-xs font-black text-gray-900 leading-snug line-clamp-3">
                              {entry.lessonTitle}
                            </h4>
                            {entry.section && (
                              <p className="text-[10px] text-gray-500 mt-0.5 font-medium line-clamp-1">
                                {entry.section}
                              </p>
                            )}
                          </div>

                          {/* الواجب إن وجد */}
                          {entry.homework && (
                            <div className="mt-1.5 pt-1 border-t border-dashed border-gray-200 text-[10px] text-gray-600 line-clamp-1">
                              <span className="font-bold text-gray-700">الواجب: </span>
                              <span>{entry.homework}</span>
                            </div>
                          )}

                          {/* زر التعديل المباشر في الدفتر اليومي */}
                          <div className="mt-2 pt-1 border-t border-gray-100 flex items-center justify-end">
                            <Link
                              href={`/admin/diary`}
                              className="text-[10px] text-gray-400 hover:text-sky-600 font-bold transition flex items-center gap-0.5"
                              title="تعديل في الدفتر اليومي"
                            >
                              <span>تعديل في الدفتر</span>
                              <ChevronLeft className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── جدول الطباعة الرسمي A4 (يظهر دائماً أثناء الطباعة ومعاينة الطباعة) ─── */}
        <div className="hidden print:block w-full">
          <table className="print-table w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 text-gray-900">
                <th style={{ width: "13%" }} className="p-1.5 text-center font-black">
                  اليوم والتاريخ
                </th>
                <th style={{ width: "12%" }} className="p-1.5 text-center font-black">
                  التوقيت
                </th>
                <th style={{ width: "9%" }} className="p-1.5 text-center font-black">
                  الفوج
                </th>
                <th style={{ width: "11%" }} className="p-1.5 text-center font-black">
                  رقم المذكرة
                </th>
                <th style={{ width: "11%" }} className="p-1.5 text-center font-black">
                  نوع الحصة
                </th>
                <th style={{ width: "32%" }} className="p-1.5 font-black">
                  عنوان المورد المعرفي المستهدف (بدون تفاصيل المراحل)
                </th>
                <th style={{ width: "12%" }} className="p-1.5 text-center font-black">
                  الواجب / ملاحظات
                </th>
              </tr>
            </thead>
            <tbody>
              {weekInfo.days.map((day) => {
                const dayEntries = weekEntriesByDate[day.dateStr] || [];
                const specialDay = weekSpecialDaysByDate[day.dateStr];

                // إذا كان اليوم عطلة أو يوماً خاصاً
                if (specialDay) {
                  return (
                    <tr key={day.dateStr} className="break-inside-avoid">
                      <td className="p-2 text-center font-bold bg-gray-50 border border-black align-middle">
                        <div>{day.dayName}</div>
                        <div className="text-[10px] text-gray-700">{formatArabicDate(day.dateStr)}</div>
                      </td>
                      <td
                        colSpan={6}
                        className="p-3 text-center bg-amber-50/50 border border-black font-black text-gray-900"
                      >
                        📌 {specialDay.title}
                        {specialDay.description ? ` — ${specialDay.description}` : ""}
                      </td>
                    </tr>
                  );
                }

                // إذا لم تكن هناك حصص مسجلة في هذا اليوم
                if (dayEntries.length === 0) {
                  return (
                    <tr key={day.dateStr} className="break-inside-avoid">
                      <td className="p-1.5 text-center font-bold bg-gray-50 border border-black align-middle">
                        <div>{day.dayName}</div>
                        <div className="text-[10px] text-gray-700">{formatArabicDate(day.dateStr)}</div>
                      </td>
                      <td colSpan={6} className="p-1.5 text-center text-gray-400 border border-black italic">
                        — لا توجد حصص مبرمجة أو مسجلة —
                      </td>
                    </tr>
                  );
                }

                // سرد حصص اليوم سطراً بسطر
                return dayEntries.map((entry, index) => (
                  <tr key={entry.id} className="break-inside-avoid">
                    {index === 0 && (
                      <td
                        rowSpan={dayEntries.length}
                        className="p-1.5 text-center font-bold bg-gray-50 border border-black align-middle"
                      >
                        <div className="font-black text-sm">{day.dayName}</div>
                        <div className="text-[10px] text-gray-700">{formatArabicDate(day.dateStr)}</div>
                      </td>
                    )}
                    <td className="p-1.5 text-center border border-black font-semibold" dir="ltr">
                      {entry.periodTime || "—"}
                    </td>
                    <td className="p-1.5 text-center border border-black font-black text-black">
                      {entry.className}
                    </td>
                    <td className="p-1.5 text-center border border-black text-gray-800 font-bold">
                      {entry.lessonNoteNumber || "—"}
                    </td>
                    <td className="p-1.5 text-center border border-black text-gray-800">
                      {entry.sessionType || "درس"}
                    </td>
                    {/* عنوان المورد فقط بدون عناوين المراحل تفصيلاً */}
                    <td className="p-1.5 border border-black text-black">
                      <div className="font-black text-[12px] leading-tight">{entry.lessonTitle}</div>
                      {entry.section && (
                        <div className="text-[10px] text-gray-700 mt-0.5">{entry.section}</div>
                      )}
                    </td>
                    <td className="p-1.5 text-center border border-black text-[10px] text-gray-800">
                      {entry.homework || entry.notes || "—"}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>

          {/* ─── خانة التأشيرات والتوقيعات الرسمية في أسفل صفحة الطباعة ─── */}
          <div className="mt-6 pt-3 border-t border-black grid grid-cols-3 gap-6 text-center text-xs break-inside-avoid">
            <div className="p-3 border border-gray-400 rounded">
              <p className="font-bold text-gray-900 mb-1">توقيع وختم الأستاذ(ة)</p>
              <p className="text-[11px] text-gray-700">{printTeacherName}</p>
              <div className="h-12 flex items-center justify-center text-gray-300 italic text-[11px]">
                ✍️ التوقيع
              </div>
            </div>

            <div className="p-3 border border-gray-400 rounded">
              <p className="font-bold text-gray-900 mb-1">تأشيرة السيد مدير المؤسسة</p>
              <p className="text-[11px] text-gray-700">بالاطلاع والمصادقة</p>
              <div className="h-12 flex items-center justify-center text-gray-300 italic text-[11px]">
                ختم الإدارة
              </div>
            </div>

            <div className="p-3 border border-gray-400 rounded">
              <p className="font-bold text-gray-900 mb-1">تأشيرة السيد مفتش التربية الوطنية</p>
              <p className="text-[11px] text-gray-700">لمقاطعة التفتيش والمتابعة</p>
              <div className="h-12 flex items-center justify-center text-gray-300 italic text-[11px]">
                ختم المفتشية
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
