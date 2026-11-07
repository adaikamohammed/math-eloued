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
  Check,
  Download,
  Pencil,
  Trash2,
  X,
  ExternalLink,
  Loader2,
  Save,
  ChevronDown,
  ChevronUp,
  Copy,
  ClipboardCheck,
} from "lucide-react";
import { getCurrentAcademicYear } from "@/lib/academicYear";
import { LoginRequired } from "@/components/LoginRequired";
import { useProfile } from "@/lib/useProfile";
import { checkTeacherSession, getPersistedTeacherSession } from "@/lib/offlineAuth";
import { getTeacherOfflineData, saveTeacherOfflineData, setupAutoSync } from "@/lib/offlineStorage";
import {
  DailyDiaryEntry,
  SpecialDayRecord,
  TeacherTimetable,
  sortClasses,
  LessonsData,
} from "@/lib/types";
import {
  printWeeklyDiaryReport,
  downloadWeeklyDiaryPDF,
} from "@/lib/weeklyDiaryPdfGenerator";

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
  if (!className) return CLASS_COLORS.emerald;
  if (className === "أولياء التلاميذ" || className === "استقبال الأولياء" || className.includes("استقبال")) {
    return { bg: "bg-purple-50 text-purple-950", text: "text-purple-700", border: "border-purple-300 ring-1 ring-purple-400", badge: "bg-purple-700 text-white" };
  }
  if (className === "فراغ" || className === "حصة شاغرة" || className.includes("شاغر")) {
    return { bg: "bg-slate-100/90 text-slate-800", text: "text-slate-600", border: "border-slate-300 border-dashed", badge: "bg-slate-600 text-white" };
  }
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

// استخراج زمن البداية بالدقائق لتفادي تكرار الحصص عند تقاطع الساعات
function parseSlotMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().replace(/h/i, ":").match(/(\d{1,2}):(\d{2})/);
  if (match) return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  const hourOnly = timeStr.trim().match(/^(\d{1,2})/);
  if (hourOnly) return parseInt(hourOnly[1], 10) * 60;
  return null;
}

function getEntryStartMinutes(periodTime: string): number | null {
  if (!periodTime) return null;
  const parts = periodTime.trim().split(/[-–—]/);
  return parseSlotMinutes(parts[0]);
}

/**
 * مطابقة الحصة المدونة في الدفتر اليومي مع خانة زمنية معينة
 * مطابقة دقيقة تمنع تماماً تكرار الحصص في أكثر من خانة
 */
function findEntryForSlot(
  dayEntries: DailyDiaryEntry[],
  slot: SlotDefinition
): DailyDiaryEntry | undefined {
  if (!dayEntries || dayEntries.length === 0) return undefined;

  // 1. مطابقة دقيقة أولاً
  const exact = dayEntries.find((e) => {
    const t = (e.periodTime || "").trim().replace(/\s+/g, "");
    const s = slot.label.replace(/\s+/g, "");
    return t === s;
  });
  if (exact) return exact;

  // 2. مطابقة دقيقة بوقت بداية الحصة بالدقائق (لا يمكن لحصة 09:00-10:00 أن تطابق خانة 10:00-11:00)
  const slotStartMin = parseSlotMinutes(slot.start);
  if (slotStartMin !== null) {
    const byStart = dayEntries.find((e) => {
      const entryStartMin = getEntryStartMinutes(e.periodTime || "");
      if (entryStartMin === null) return false;
      return Math.abs(entryStartMin - slotStartMin) < 15;
    });
    if (byStart) return byStart;
  }

  return undefined;
}

/**
 * استخراج تفاصيل الفوج المقرر في جدول التوقيت الأسبوعي للأستاذ لتلك الخانة
 */
function getScheduledSlotDetails(
  timetable: TeacherTimetable | null,
  dayName: string,
  slot: SlotDefinition
): { className?: string; sessionType?: string; isFree?: boolean } {
  if (!timetable?.slots || timetable.slots.length === 0) return {};
  const startHour = slot.start.split(":")[0];
  const found = timetable.slots.find((s) => {
    if (s.day !== dayName) return false;
    const sHour = s.start.split(":")[0];
    return sHour === startHour || s.start === slot.start;
  });
  if (!found) return {};
  const isFree = found.className === "فراغ" || found.className === "راحة" || found.sessionType === "free";
  if (isFree) return { isFree: true };
  return {
    className: found.className && found.className.trim() ? found.className.trim() : undefined,
    sessionType: found.sessionType || undefined,
  };
}

/**
 * الحصص الزمنية القياسية المعتمدة في التعليم المتوسط الجزائري
 */
const STANDARD_PERIODS = [
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "13:00 - 14:00",
  "13:30 - 14:30",
  "14:00 - 15:00",
  "14:30 - 15:30",
  "15:00 - 16:00",
  "15:30 - 16:30",
  "16:00 - 17:00",
];

const SESSION_TYPES = [
  "درس ومورد جديد",
  "أعمال موجهة / وضعيات",
  "حل تمارين وتطبيقات",
  "إدماج كلي / جزئي",
  "استقبال الأولياء",
  "حصة شاغرة / فراغ",
  "فرض محروس",
  "تقويم تشخيصي",
  "معالجة بيداغوجية",
  "وقفة تقويمية",
  "نشاط صفي",
  "تصحيح الفرض / الاختبار",
];

const FIELDS_LIST = [
  "أنشطة عددية",
  "أنشطة هندسية",
  "تنظيم معطيات",
  "دوال وتنظيم معطيات",
  "تقويم ومعالجة",
  "غير محدد",
];

function getArabicDayNameFromDateStr(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();
    const found = SCHOOL_DAYS_MAP.find((s) => s.dayIndex === dayOfWeek);
    return found ? found.name : "الأحد";
  } catch {
    return "الأحد";
  }
}

function getNextNoteNumber(className: string, entries: DailyDiaryEntry[]): string {
  if (!className || className === "أولياء التلاميذ" || className === "فراغ") return "";
  const classEntries = entries.filter((e) => e.className === className);
  const nums = classEntries
    .map((e) => parseInt(e.lessonNoteNumber || "0", 10))
    .filter((n) => !isNaN(n) && n > 0);
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return max > 0 ? (max + 1 < 10 ? `0${max + 1}` : String(max + 1)) : "01";
}

function getLastFieldAndSection(
  className: string,
  entries: DailyDiaryEntry[]
): { field: string; section: string } {
  if (!className || className === "أولياء التلاميذ" || className === "فراغ") {
    return { field: "أنشطة عددية", section: "" };
  }
  const sorted = [...entries]
    .filter((e) => e.className === className)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (sorted.length > 0) {
    return {
      field: sorted[0].field || "أنشطة عددية",
      section: sorted[0].section || "",
    };
  }
  return { field: "أنشطة عددية", section: "" };
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

  // إشعار عائم Toast
  const [toastMsg, setToastMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const showToast = useCallback((type: "ok" | "err", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

  // نافذة الإضافة والتعديل والنسخ الشاملة المنبثقة مباشرة (Self-contained Modal)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "copy">("create");
  const [formEntryId, setFormEntryId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState("");
  const [formPeriodTime, setFormPeriodTime] = useState("08:00 - 09:00");
  const [formClassName, setFormClassName] = useState("");
  const [formSessionType, setFormSessionType] = useState("درس ومورد جديد");
  const [formField, setFormField] = useState("أنشطة عددية");
  const [formSection, setFormSection] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formNoteNumber, setFormNoteNumber] = useState("");
  const [formHomework, setFormHomework] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStages, setFormStages] = useState<{ id: string; label: string; content: string }[]>([
    { id: "1", label: "وضعية الانطلاق (تمهيد واستذكار)", content: "" },
    { id: "2", label: "بناء المورد والتعلمات", content: "" },
    { id: "3", label: "إعادة الاستثمار والتقويم", content: "" },
  ]);
  const [showStagesAccordion, setShowStagesAccordion] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);

  // إغلاق النافذة
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // حذف الحصة مباشرة من المخطط الأسبوعي دون مغادرة الصفحة
  const handleDeleteEntryDirectly = useCallback(async (entryId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذه الحصة نهائياً من المخطط الأسبوعي؟")) return;

    setIsSavingEntry(true);
    setEntries((prevEntries) => {
      const newEntries = prevEntries.filter((item) => item.id !== entryId);
      const session = getPersistedTeacherSession();
      if (session?.id) {
        saveTeacherOfflineData(session.id, { diaryEntries: newEntries }, true);
      }
      return newEntries;
    });

    setIsModalOpen(false);
    showToast("ok", "🗑️ تم حذف الحصة بنجاح من المخطط الأسبوعي!");

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      // جلب القائمة الحالية بعد الحذف للإرسال
      const currentList = entries.filter((item) => item.id !== entryId);
      await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diaryEntries: currentList }),
      });
    } catch {
      // تم الحفظ محلياً بالفعل
    } finally {
      setIsSavingEntry(false);
    }
  }, [entries, showToast]);

  // توافق مع الأسماء السابقة
  const handleOpenEntryModal = useCallback((entry: DailyDiaryEntry) => {
    setModalMode("edit");
    setFormEntryId(entry.id);
    setFormDate(entry.date);
    setFormPeriodTime(entry.periodTime || "08:00 - 09:00");
    setFormClassName(entry.className);
    setFormSessionType(entry.sessionType || "درس ومورد جديد");
    setFormField(entry.field || "أنشطة عددية");
    setFormSection(entry.section || "");
    setFormTitle(entry.lessonTitle || "");
    setFormNoteNumber(entry.lessonNoteNumber || "");
    setFormHomework(entry.homework || "");
    setFormNotes(entry.notes || "");

    if (entry.stages && entry.stages.length > 0) {
      setFormStages(
        entry.stages.map((stg, i) => ({
          id: stg.id || String(i + 1),
          label: stg.label || `المرحلة ${i + 1}`,
          content: stg.content || "",
        }))
      );
      setShowStagesAccordion(entry.stages.some((s) => (s.content || "").trim().length > 0));
    } else {
      setFormStages([
        { id: "1", label: "وضعية الانطلاق (تمهيد واستذكار)", content: "" },
        { id: "2", label: "بناء المورد والتعلمات", content: "" },
        { id: "3", label: "إعادة الاستثمار والتقويم", content: "" },
      ]);
      setShowStagesAccordion(false);
    }
    setIsModalOpen(true);
  }, []);

  const handleOpenEditModal = handleOpenEntryModal;
  const handleDeleteEntry = handleDeleteEntryDirectly;

  // التحكم بالأسبوع والتاريخ والوضع
  const [currentRefDate, setCurrentRefDate] = useState<Date>(() => new Date());
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "columns">("table");

  // تدوير شكل الجدول: الأيام كصفوف (أفقي) أو الأيام كأعمدة (عمودي)
  const [orientation, setOrientation] = useState<"days-as-rows" | "days-as-cols">("days-as-rows");

  // استرجاع تفضيل تدوير الجدول
  useEffect(() => {
    try {
      const saved = localStorage.getItem("jusoor_weekly_diary_orientation");
      if (saved === "days-as-rows" || saved === "days-as-cols") {
        setOrientation(saved);
      }
    } catch {}
  }, []);

  const handleSetOrientation = (newOrientation: "days-as-rows" | "days-as-cols") => {
    setOrientation(newOrientation);
    try {
      localStorage.setItem("jusoor_weekly_diary_orientation", newOrientation);
    } catch {}
  };

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

  // قائمة خيارات الأفواج المتاحة في نافذة الإضافة
  const modalClassOptions = useMemo(() => {
    const set = new Set<string>(allClasses);
    if (timetable?.slots) {
      for (const s of timetable.slots) {
        if (s.className && s.className !== "فراغ" && s.className !== "راحة") {
          set.add(s.className.trim());
        }
      }
    }
    return sortClasses(Array.from(set));
  }, [allClasses, timetable]);

  // فتح نافذة الإضافة المباشرة لحصة جديدة
  const handleOpenCreateModal = useCallback(
    (initialDate?: string, initialPeriod?: string, initialClass?: string) => {
      const targetDate =
        initialDate ||
        (weekInfo.days[0] ? weekInfo.days[0].dateStr : new Date().toISOString().split("T")[0]);
      const targetPeriod = initialPeriod || "08:00 - 09:00";
      const targetClass =
        initialClass && initialClass !== "فراغ" && initialClass !== "راحة"
          ? initialClass
          : modalClassOptions[0] || "1م1";

      const nextNote = getNextNoteNumber(targetClass, entries);
      const { field, section } = getLastFieldAndSection(targetClass, entries);

      setModalMode("create");
      setFormEntryId(null);
      setFormDate(targetDate);
      setFormPeriodTime(targetPeriod);
      setFormClassName(targetClass);
      setFormSessionType("درس ومورد جديد");
      setFormField(field);
      setFormSection(section);
      setFormTitle("");
      setFormNoteNumber(nextNote);
      setFormHomework("");
      setFormNotes("");
      setFormStages([
        { id: "1", label: "وضعية الانطلاق (تمهيد واستذكار)", content: "" },
        { id: "2", label: "بناء المورد والتعلمات", content: "" },
        { id: "3", label: "إعادة الاستثمار والتقويم", content: "" },
      ]);
      setShowStagesAccordion(false);
      setIsModalOpen(true);
    },
    [weekInfo.days, modalClassOptions, entries]
  );

  // نسخ وتكرار بيانات حصة لفوج آخر
  const handleCopyEntry = useCallback(
    (entry: DailyDiaryEntry, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();

      // البحث الذكي عن فوج آخر من نفس المستوى التعليمي أولاً (مثلاً 2م2 إذا كان الفوج الأصلي 2م1)
      const currentClass = entry.className;
      const otherClasses = modalClassOptions.filter(
        (c) => c !== currentClass && c !== "أولياء التلاميذ" && c !== "فراغ"
      );
      const levelMatch = currentClass.match(/^(\d+)/);
      const levelPrefix = levelMatch ? levelMatch[1] : null;
      const sameLevelOther = otherClasses.find((c) =>
        levelPrefix ? c.startsWith(levelPrefix) : false
      );
      const targetClass = sameLevelOther || otherClasses[0] || currentClass;

      const nextNote = getNextNoteNumber(targetClass, entries);

      setModalMode("copy");
      setFormEntryId(null); // فارغ لضمان إنشاء حصة جديدة كلياً وعدم المساس بالحصة الأصلية
      setFormDate(entry.date);
      setFormPeriodTime(entry.periodTime || "08:00 - 09:00");
      setFormClassName(targetClass);
      setFormSessionType(entry.sessionType || "درس ومورد جديد");
      setFormField(entry.field || "أنشطة عددية");
      setFormSection(entry.section || "");
      setFormTitle(entry.lessonTitle || "");
      setFormNoteNumber(nextNote || entry.lessonNoteNumber || "");
      setFormHomework(entry.homework || "");
      setFormNotes(entry.notes || "");

      if (entry.stages && entry.stages.length > 0) {
        setFormStages(
          entry.stages.map((stg, i) => ({
            id: String(i + 1),
            label: stg.label || `المرحلة ${i + 1}`,
            content: stg.content || "",
          }))
        );
        setShowStagesAccordion(entry.stages.some((s) => (s.content || "").trim().length > 0));
      } else {
        setFormStages([
          { id: "1", label: "وضعية الانطلاق (تمهيد واستذكار)", content: "" },
          { id: "2", label: "بناء المورد والتعلمات", content: "" },
          { id: "3", label: "إعادة الاستثمار والتقويم", content: "" },
        ]);
        setShowStagesAccordion(false);
      }

      setIsModalOpen(true);
      showToast(
        "ok",
        `📋 تم استنساخ بيانات الدرس! حدد الفوج (${targetClass}) والتوقيت ثم اضغط حفظ.`
      );
    },
    [modalClassOptions, entries, showToast]
  );

  // التبديل إلى نوع مسبق (Preset)
  const handleApplyPreset = (type: string) => {
    setFormSessionType(type);
    if (type === "استقبال الأولياء") {
      setFormClassName("أولياء التلاميذ");
      setFormTitle("ساعة استقبال أولياء التلاميذ والاستفسارات التربوية");
      setFormField("غير محدد");
      setFormSection("");
      setFormNoteNumber("");
    } else if (type === "حصة شاغرة / فراغ") {
      setFormClassName("فراغ");
      setFormTitle("حصة شاغرة");
      setFormField("غير محدد");
      setFormSection("");
      setFormNoteNumber("");
    } else if (type === "أعمال موجهة / وضعيات") {
      if (!formTitle || formTitle.includes("استقبال") || formTitle.includes("شاغرة")) {
        setFormTitle("أعمال موجهة: ");
      }
    } else if (type === "فرض محروس") {
      if (!formTitle || formTitle.includes("استقبال") || formTitle.includes("شاغرة")) {
        setFormTitle("إجراء الفرض المحروس");
        setFormField("تقويم ومعالجة");
      }
    } else if (type === "معالجة بيداغوجية") {
      if (!formTitle || formTitle.includes("استقبال") || formTitle.includes("شاغرة")) {
        setFormTitle("معالجة بيداغوجية ودعم المعارف");
        setFormField("تقويم ومعالجة");
      }
    }
  };

  // حفظ الحصة مباشرة (إضافة أو تعديل)
  const handleSaveModalEntry = async () => {
    if (!formTitle.trim()) {
      showToast("err", "يرجى كتابة عنوان المورد أو موضوع الحصة أولاً");
      return;
    }
    if (!formClassName.trim()) {
      showToast("err", "يرجى تحديد الفوج التربوي أو نوع الحصة");
      return;
    }

    setIsSavingEntry(true);

    const existing = entries.find((e) => e.id === formEntryId);
    const entryData: DailyDiaryEntry = {
      id: formEntryId || `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: formDate,
      day: getArabicDayNameFromDateStr(formDate),
      periodTime: formPeriodTime,
      className: formClassName.trim(),
      sessionType: formSessionType,
      field: formField,
      section: formSection.trim(),
      lessonTitle: formTitle.trim(),
      lessonNoteNumber: formNoteNumber.trim() || undefined,
      homework: formHomework.trim() || undefined,
      notes: formNotes.trim() || undefined,
      stages: formStages.filter((s) => s.content.trim().length > 0),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    let newEntries: DailyDiaryEntry[];
    if (modalMode === "edit" && formEntryId) {
      newEntries = entries.map((e) => (e.id === formEntryId ? entryData : e));
    } else {
      newEntries = [entryData, ...entries];
    }

    setEntries(newEntries);
    setIsModalOpen(false);

    const session = getPersistedTeacherSession();
    if (session?.id) {
      saveTeacherOfflineData(session.id, { diaryEntries: newEntries }, true);
    }

    showToast(
      "ok",
      modalMode === "copy"
        ? `✅ تم نسخ الحصة بنجاح وتطبيقها على فوج ${formClassName.trim()}!`
        : modalMode === "create"
        ? "✅ تم إضافة الحصة بنجاح إلى المخطط الأسبوعي!"
        : "✅ تم حفظ تعديل الحصة بنجاح!"
    );

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diaryEntries: newEntries }),
      });
      if (!res.ok) throw new Error("فشل الحفظ على السيرفر");
    } catch {
      // تم الحفظ محلياً بالفعل
    } finally {
      setIsSavingEntry(false);
    }
  };

  // إجمالي حصص الأسبوع
  const totalWeekSessions = useMemo(() => {
    let count = 0;
    for (const day of weekInfo.days) {
      count += (weekEntriesByDate[day.dateStr] || []).length;
    }
    return count;
  }, [weekEntriesByDate, weekInfo.days]);

  // بيانات الترويسة للطباعة
  const printTeacherName = profile?.full_name || "الأستاذ(ة)";
  const printSchoolName = profile?.school_custom_name || "المؤسسة التعليمية";
  const printSubject = profile?.subject || "الرياضيات";
  const printWilaya = "الوادي";

  // تشغيل الطباعة الأفقية A4 عبر المولد الموحد المعزول
  const handlePrintLandscape = () => {
    printWeeklyDiaryReport({
      teacherName: printTeacherName,
      schoolName: printSchoolName,
      inspectorName: timetable?.settings?.inspectorName || "السيد مفتش المادة",
      principalName: timetable?.settings?.principalName || "السيد مدير المؤسسة",
      wilayaName: printWilaya,
      subjectName: printSubject,
      weekStartStr: weekInfo.sundayStr,
      weekEndStr: weekInfo.thursdayStr,
      orientation,
      morningSlots: MORNING_SLOTS.map((s) => s.label),
      afternoonSlots: afternoonSlots.map((s) => s.label),
      schoolDays: weekInfo.days.map((d) => ({ name: d.dayName, dateStr: d.dateStr })),
      dayLessonsMap: weekEntriesByDate,
      customClasses: allClasses,
      classColorsMap: timetable?.settings?.classColors,
    });
  };

  const handleDownloadPDF = (isBlankTemplate: boolean = false) => {
    downloadWeeklyDiaryPDF({
      teacherName: printTeacherName,
      schoolName: printSchoolName,
      inspectorName: timetable?.settings?.inspectorName || "السيد مفتش المادة",
      principalName: timetable?.settings?.principalName || "السيد مدير المؤسسة",
      wilayaName: printWilaya,
      subjectName: printSubject,
      academicYear: getCurrentAcademicYear(),
      isBlankTemplate,
      weekStartStr: weekInfo.sundayStr,
      weekEndStr: weekInfo.thursdayStr,
      orientation,
      morningSlots: MORNING_SLOTS.map((s) => s.label),
      afternoonSlots: afternoonSlots.map((s) => s.label),
      schoolDays: weekInfo.days.map((d) => ({ name: d.dayName, dateStr: d.dateStr })),
      dayLessonsMap: weekEntriesByDate,
      customClasses: allClasses,
      classColorsMap: timetable?.settings?.classColors,
    });
  };

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
              <strong className="text-black">{printSubject}</strong> • الموسم: <strong>{getCurrentAcademicYear()}</strong>
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
              onClick={() => handleOpenCreateModal()}
              type="button"
              className="px-4 py-1.5 rounded-xl border border-emerald-600 bg-emerald-700 hover:bg-emerald-800 text-xs font-black text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="إضافة وتسجيل حصة جديدة في هذا الأسبوع مباشرة عبر نافذة منبثقة دون مغادرة الصفحة"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ إضافة حصة جديدة</span>
            </button>

            <button
              onClick={() => handleDownloadPDF(false)}
              type="button"
              className="px-4 py-1.5 rounded-xl border border-emerald-600 bg-emerald-700 hover:bg-emerald-800 text-xs font-black text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="حفظ وتصدير المخطط الأسبوعي معبأ بالحصص كملف PDF أفقي رسمي (A4 Landscape)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>حفظ PDF (معبأ) 📄</span>
            </button>

            <button
              onClick={() => handleDownloadPDF(true)}
              type="button"
              className="px-3.5 py-1.5 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/80 hover:bg-emerald-100 text-xs font-black text-emerald-800 transition shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="حفظ وتصدير نموذج أسبوعي فارغ مهيأ للتحضير والتخطيط اليدوي بالقلم"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>✍️ نموذج فارغ للتحضير</span>
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

        {/* ─── لوحة التحكم العلوية: التنقل بين الأسابيع والفلاتر وتدوير الجدول ─── */}
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

          {/* سطر نطاق التواريخ والفلترة وتدوير الجدول */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
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

            {/* تدوير شكل الجدول (أفقي / عمودي) + فلتر الفوج */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* محدد تدوير الجدول: الأيام كصفوف أو الأيام كأعمدة */}
              {viewMode === "table" && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-600">شكل الجدول:</span>
                  <div className="inline-flex p-0.5 bg-gray-100 rounded-xl border border-gray-200">
                    <button
                      type="button"
                      onClick={() => handleSetOrientation("days-as-rows")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                        orientation === "days-as-rows"
                          ? "bg-white text-emerald-800 shadow-xs border border-gray-200"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      title="الأيام كصفوف والساعات كأعمدة (الوضع الأفقي الشائع)"
                    >
                      <span>▤ الأيام صفوف</span>
                      {orientation === "days-as-rows" && <Check className="w-3 h-3 text-emerald-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetOrientation("days-as-cols")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                        orientation === "days-as-cols"
                          ? "bg-white text-emerald-800 shadow-xs border border-gray-200"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      title="الأيام كأعمدة والساعات كصفوف (قلب وتدوير الجدول)"
                    >
                      <span>▥ الأيام أعمدة</span>
                      {orientation === "days-as-cols" && <Check className="w-3 h-3 text-emerald-600" />}
                    </button>
                  </div>
                </div>
              )}

              {/* فلتر الفوج */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-500" />
                <span className="font-bold text-gray-600">الفوج:</span>
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
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            النمط 1: شبكة الجدول الأسبوعي المقسم صباحاً ومساءً (مثل /admin/timetable)
            يدعم التدوير في الاتجاهين: days-as-rows أو days-as-cols
        ═════════════════════════════════════════════════════════════════════ */}
        <div
          className={`bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden ${
            viewMode === "table" ? "block" : "hidden print:block"
          }`}
        >
          <div className="overflow-x-auto relative scrollbar-thin">

            {/* ─── الوضع أ: الأيام كصفوف والساعات كأعمدة (days-as-rows) ─── */}
            {orientation === "days-as-rows" ? (
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
                                  onClick={() => handleOpenEditModal(entry)}
                                  className={`p-2 rounded-xl border ${color?.bg} ${color?.border} shadow-2xs space-y-1 h-full flex flex-col justify-between cursor-pointer hover:shadow-md hover:ring-2 hover:ring-emerald-500/40 transition group/slot relative print:p-1 print:border-black print:bg-white print:shadow-none print:ring-0`}
                                  title="انقر لمعاينة أو تعديل هذه الحصة مباشرة ✏️"
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      {entry.sessionType === "استقبال الأولياء" || entry.className === "أولياء التلاميذ" ? (
                                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-purple-700 text-white flex items-center gap-1">
                                          <span>🤝</span>
                                          <span>استقبال</span>
                                        </span>
                                      ) : entry.sessionType === "حصة شاغرة / فراغ" || entry.className === "فراغ" ? (
                                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-600 text-white flex items-center gap-1">
                                          <span>☕</span>
                                          <span>شاغرة</span>
                                        </span>
                                      ) : (
                                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${color?.badge} print:border print:border-black print:text-black print:bg-gray-100`}>
                                          {entry.className}
                                        </span>
                                      )}
                                      <div className="flex items-center gap-1">
                                        {entry.lessonNoteNumber && (
                                          <span className="text-[9px] font-bold text-gray-700 bg-white/90 px-1 py-0.2 rounded border border-gray-300">
                                            {entry.lessonNoteNumber}
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => handleCopyEntry(entry, e)}
                                          className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-sky-50 text-sky-700 border border-gray-200 transition shadow-2xs print:hidden cursor-pointer"
                                          title="نسخ بيانات هذه الحصة لفوج آخر 📋"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenEditModal(entry);
                                          }}
                                          className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-gray-200 transition shadow-2xs print:hidden cursor-pointer"
                                          title="تعديل الحصة مباشرة"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => handleDeleteEntryDirectly(entry.id, e)}
                                          className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-rose-50 text-rose-600 border border-gray-200 transition shadow-2xs print:hidden cursor-pointer"
                                          title="حذف الحصة مباشرة دون مغادرة الصفحة"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* عنوان المورد فقط */}
                                    <div className="text-right">
                                      <h4 className="text-[11px] font-black text-gray-900 leading-tight group-hover/slot:text-emerald-800 transition print:text-black">
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
                                /* خانة فارغة للحصص غير المسجلة مع تحضير فوري محدد التوقيت واليوم */
                                (() => {
                                  const scheduled = getScheduledSlotDetails(timetable, day.dayName, slot);
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCreateModal(day.dateStr, slot.label, scheduled.className)}
                                      className="w-full h-full min-h-[70px] rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center p-2 text-gray-400 group hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-800 transition cursor-pointer print:border-none print:bg-transparent text-center"
                                      title={`إضافة وتسجيل حصة ${day.dayName} (${slot.label})${scheduled.className ? ` لفوج ${scheduled.className}` : ""}`}
                                    >
                                      <span className="text-[10px] font-medium text-gray-400 print:hidden group-hover:hidden">
                                        — فارغة —
                                      </span>
                                      <div className="hidden group-hover:flex flex-col items-center gap-0.5 text-emerald-700 font-bold print:hidden">
                                        <div className="flex items-center gap-1 text-[11px] font-black">
                                          <Plus className="w-3.5 h-3.5" />
                                          <span>+ إضافة</span>
                                        </div>
                                        {scheduled.className && (
                                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black">
                                            {scheduled.className}
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })()
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
                                  onClick={() => handleOpenEditModal(entry)}
                                  className={`p-2 rounded-xl border ${color?.bg} ${color?.border} shadow-2xs space-y-1 h-full flex flex-col justify-between cursor-pointer hover:shadow-md hover:ring-2 hover:ring-emerald-500/40 transition group/slot relative print:p-1 print:border-black print:bg-white print:shadow-none print:ring-0`}
                                  title="انقر لمعاينة أو تعديل هذه الحصة مباشرة ✏️"
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      {entry.sessionType === "استقبال الأولياء" || entry.className === "أولياء التلاميذ" ? (
                                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-purple-700 text-white flex items-center gap-1">
                                          <span>🤝</span>
                                          <span>استقبال</span>
                                        </span>
                                      ) : entry.sessionType === "حصة شاغرة / فراغ" || entry.className === "فراغ" ? (
                                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-600 text-white flex items-center gap-1">
                                          <span>☕</span>
                                          <span>شاغرة</span>
                                        </span>
                                      ) : (
                                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${color?.badge} print:border print:border-black print:text-black print:bg-gray-100`}>
                                          {entry.className}
                                        </span>
                                      )}
                                      <div className="flex items-center gap-1">
                                        {entry.lessonNoteNumber && (
                                          <span className="text-[9px] font-bold text-gray-700 bg-white/90 px-1 py-0.2 rounded border border-gray-300">
                                            {entry.lessonNoteNumber}
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => handleCopyEntry(entry, e)}
                                          className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-sky-50 text-sky-700 border border-gray-200 transition shadow-2xs print:hidden cursor-pointer"
                                          title="نسخ بيانات هذه الحصة لفوج آخر 📋"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenEditModal(entry);
                                          }}
                                          className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-gray-200 transition shadow-2xs print:hidden cursor-pointer"
                                          title="تعديل الحصة مباشرة"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => handleDeleteEntryDirectly(entry.id, e)}
                                          className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-rose-50 text-rose-600 border border-gray-200 transition shadow-2xs print:hidden cursor-pointer"
                                          title="حذف الحصة مباشرة دون مغادرة الصفحة"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* عنوان المورد فقط */}
                                    <div className="text-right">
                                      <h4 className="text-[11px] font-black text-gray-900 leading-tight group-hover/slot:text-emerald-800 transition print:text-black">
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
                                /* خانة فارغة للحصص غير المسجلة مع تحضير فوري محدد التوقيت واليوم */
                                (() => {
                                  const scheduled = getScheduledSlotDetails(timetable, day.dayName, slot);
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCreateModal(day.dateStr, slot.label, scheduled.className)}
                                      className="w-full h-full min-h-[70px] rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center p-2 text-gray-400 group hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-800 transition cursor-pointer print:border-none print:bg-transparent text-center"
                                      title={`إضافة وتسجيل حصة ${day.dayName} (${slot.label})${scheduled.className ? ` لفوج ${scheduled.className}` : ""}`}
                                    >
                                      <span className="text-[10px] font-medium text-gray-400 print:hidden group-hover:hidden">
                                        — فارغة —
                                      </span>
                                      <div className="hidden group-hover:flex flex-col items-center gap-0.5 text-emerald-700 font-bold print:hidden">
                                        <div className="flex items-center gap-1 text-[11px] font-black">
                                          <Plus className="w-3.5 h-3.5" />
                                          <span>+ إضافة</span>
                                        </div>
                                        {scheduled.className && (
                                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black">
                                            {scheduled.className}
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })()
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* ─── الوضع ب: الأيام كأعمدة والساعات كصفوف (days-as-cols - تدوير الجدول) ─── */
              <table className="w-full border-collapse text-right min-w-[900px] print:min-w-full print:border print:border-black">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300 text-xs font-black text-gray-800 print:bg-gray-200 print:border-black print:text-black">
                    <th className="py-2.5 px-3 w-32 border-l border-gray-300 bg-gray-200/90 text-center sticky right-0 z-20 shadow-xs print:static print:border-black print:bg-gray-200">
                      التوقيت / اليوم
                    </th>
                    {weekInfo.days.map((day) => (
                      <th
                        key={day.dateStr}
                        className={`py-2 px-3 border-l border-gray-300 last:border-l-0 text-center font-black text-xs print:border-black ${
                          day.isToday ? "bg-emerald-50 text-emerald-950" : "text-gray-900"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>{day.dayName}</span>
                          {day.isToday && (
                            <span className="text-[9px] bg-emerald-700 text-white px-1.5 py-0.2 rounded font-black print:hidden">
                              اليوم
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 font-bold mt-0.5">
                          {day.dayNum} {day.monthName}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* ── 1. ساعات الفترة الصباحية ── */}
                  {MORNING_SLOTS.map((slot, sIdx) => (
                    <tr key={slot.id} className="border-b border-gray-200 hover:bg-slate-50/40 transition break-inside-avoid print:border-black">
                      <td className="py-2 px-2 bg-gray-50 border-l border-gray-300 font-mono text-xs font-black text-gray-800 sticky right-0 z-10 shadow-xs text-center print:static print:border-black print:bg-gray-100">
                        <div className="text-gray-900">{slot.label}</div>
                        <span className="text-[10px] text-sky-700 font-bold font-sans print:hidden">الفترة الصباحية</span>
                      </td>

                      {weekInfo.days.map((day) => {
                        const dayEntries = weekEntriesByDate[day.dateStr] || [];
                        const specialDay = weekSpecialDaysByDate[day.dateStr];

                        if (specialDay) {
                          if (sIdx === 0) {
                            return (
                              <td
                                key={day.dateStr}
                                rowSpan={MORNING_SLOTS.length}
                                className="p-3 border-l border-gray-300 last:border-l-0 text-center bg-amber-50/80 align-middle print:border-black"
                              >
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-full text-xs font-black text-amber-950">
                                  <span>📌</span>
                                  <span>{specialDay.title}</span>
                                </div>
                                {specialDay.description && (
                                  <p className="text-[10px] text-amber-900 mt-1 line-clamp-3 font-medium">
                                    {specialDay.description}
                                  </p>
                                )}
                              </td>
                            );
                          }
                          return null;
                        }

                        const entry = findEntryForSlot(dayEntries, slot);
                        const color = entry ? getClassColor(entry.className) : null;

                        return (
                          <td
                            key={day.dateStr}
                            className="p-1.5 border-l border-gray-300 last:border-l-0 align-top min-w-[140px] max-w-[190px] print:border-black print:p-1"
                          >
                            {entry ? (
                              <div
                                onClick={() => handleOpenEditModal(entry)}
                                className={`p-2 rounded-xl border ${color?.bg} ${color?.border} shadow-2xs space-y-1 h-full flex flex-col justify-between cursor-pointer hover:shadow-md hover:ring-2 hover:ring-emerald-500/40 transition group/slot relative print:p-1 print:border-black print:bg-white print:shadow-none print:ring-0`}
                                title="انقر لمعاينة أو تعديل هذه الحصة مباشرة ✏️"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    {entry.sessionType === "استقبال الأولياء" || entry.className === "أولياء التلاميذ" ? (
                                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-purple-700 text-white flex items-center gap-1">
                                        <span>🤝</span>
                                        <span>استقبال</span>
                                      </span>
                                    ) : entry.sessionType === "حصة شاغرة / فراغ" || entry.className === "فراغ" ? (
                                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-600 text-white flex items-center gap-1">
                                        <span>☕</span>
                                        <span>شاغرة</span>
                                      </span>
                                    ) : (
                                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${color?.badge} print:border print:border-black print:text-black print:bg-gray-100`}>
                                        {entry.className}
                                      </span>
                                    )}
                                    <div className="flex items-center gap-1">
                                      {entry.lessonNoteNumber && (
                                        <span className="text-[9px] font-bold text-gray-700 bg-white/90 px-1 py-0.2 rounded border border-gray-300">
                                          {entry.lessonNoteNumber}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopyEntry(entry, e)}
                                        className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-sky-50 text-sky-700 border border-gray-200 transition shadow-2xs print:hidden cursor-pointer"
                                        title="نسخ بيانات هذه الحصة لفوج آخر 📋"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditModal(entry);
                                        }}
                                        className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-gray-200 transition shadow-2xs print:hidden cursor-pointer"
                                        title="تعديل الحصة مباشرة"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteEntryDirectly(entry.id, e)}
                                        className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-rose-50 text-rose-600 border border-gray-200 transition shadow-2xs print:hidden cursor-pointer"
                                        title="حذف الحصة مباشرة دون مغادرة الصفحة"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <h4 className="text-[11px] font-black text-gray-900 leading-tight group-hover/slot:text-emerald-800 transition print:text-black">
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
                              /* خانة فارغة للحصص غير المسجلة مع تحضير فوري محدد التوقيت واليوم */
                              (() => {
                                const scheduled = getScheduledSlotDetails(timetable, day.dayName, slot);
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCreateModal(day.dateStr, slot.label, scheduled.className)}
                                    className="w-full h-full min-h-[65px] rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center p-2 text-gray-400 group hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-800 transition cursor-pointer print:border-none print:bg-transparent text-center"
                                    title={`إضافة وتسجيل حصة ${day.dayName} (${slot.label})${scheduled.className ? ` لفوج ${scheduled.className}` : ""}`}
                                  >
                                    <span className="text-[10px] font-medium text-gray-400 print:hidden group-hover:hidden">— فارغة —</span>
                                    <div className="hidden group-hover:flex flex-col items-center gap-0.5 text-emerald-700 font-bold print:hidden">
                                      <div className="flex items-center gap-1 text-[11px] font-black">
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>+ إضافة</span>
                                      </div>
                                      {scheduled.className && (
                                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black">
                                          {scheduled.className}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })()
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* ── صف استراحة منتصف النهار ── */}
                  <tr className="bg-slate-100 border-y-2 border-slate-300 print:border-black print:bg-gray-200">
                    <td className="py-1.5 px-2 font-mono text-xs font-black text-slate-700 border-l border-slate-300 sticky right-0 z-10 bg-slate-200 shadow-xs text-center print:static print:border-black print:text-black">
                      12:00 - 14:00
                    </td>
                    <td colSpan={weekInfo.days.length} className="py-2 text-center text-xs font-black text-slate-700 tracking-wider print:text-black">
                      🍱 استراحة منتصف النهار / وجبة الغداء (12:00 — 14:00)
                    </td>
                  </tr>

                  {/* ── 2. ساعات الفترة المسائية ── */}
                  {afternoonSlots.map((slot, aIdx) => (
                    <tr key={slot.id} className="border-b border-gray-200 hover:bg-slate-50/40 transition break-inside-avoid print:border-black">
                      <td className="py-2 px-2 bg-gray-50 border-l border-gray-300 font-mono text-xs font-black text-gray-800 sticky right-0 z-10 shadow-xs text-center print:static print:border-black print:bg-gray-100">
                        <div className="text-gray-900">{slot.label}</div>
                        <span className="text-[10px] text-amber-700 font-bold font-sans print:hidden">الفترة المسائية</span>
                      </td>

                      {weekInfo.days.map((day) => {
                        const dayEntries = weekEntriesByDate[day.dateStr] || [];
                        const specialDay = weekSpecialDaysByDate[day.dateStr];
                        const isTuesday = day.dayName === "الثلاثاء";

                        if (specialDay) {
                          if (aIdx === 0) {
                            return (
                              <td
                                key={day.dateStr}
                                rowSpan={afternoonSlots.length}
                                className="p-3 border-l border-gray-300 last:border-l-0 text-center bg-amber-50/80 align-middle print:border-black"
                              >
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-full text-xs font-black text-amber-950">
                                  <span>📌</span>
                                  <span>{specialDay.title}</span>
                                </div>
                              </td>
                            );
                          }
                          return null;
                        }

                        const entry = findEntryForSlot(dayEntries, slot);
                        const color = entry ? getClassColor(entry.className) : null;

                        // مساء الثلاثاء راحة رسمية إن لم تسجل حصة
                        if (isTuesday && !entry) {
                          if (aIdx === 0) {
                            return (
                              <td
                                key={day.dateStr}
                                rowSpan={afternoonSlots.length}
                                className="p-2 border-l border-gray-300 last:border-l-0 bg-slate-100/70 text-center align-middle print:border-black print:bg-gray-50"
                              >
                                <div className="text-xs font-black text-slate-600 flex flex-col items-center justify-center gap-1">
                                  <span>☕</span>
                                  <span>راحة رسمية (مساء الثلاثاء)</span>
                                </div>
                              </td>
                            );
                          }
                          return null;
                        }

                        return (
                          <td
                            key={day.dateStr}
                            className="p-1.5 border-l border-gray-300 last:border-l-0 align-top min-w-[140px] max-w-[190px] print:border-black print:p-1"
                          >
                            {entry ? (
                              <div
                                onClick={() => handleOpenEditModal(entry)}
                                className={`p-2 rounded-xl border ${color?.bg} ${color?.border} shadow-2xs space-y-1 h-full flex flex-col justify-between cursor-pointer hover:shadow-md hover:ring-2 hover:ring-emerald-500/40 transition group/slot relative print:p-1 print:border-black print:bg-white print:shadow-none print:ring-0`}
                                title="انقر لمعاينة أو تعديل هذه الحصة مباشرة ✏️"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    {entry.sessionType === "استقبال الأولياء" || entry.className === "أولياء التلاميذ" ? (
                                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-purple-700 text-white flex items-center gap-1">
                                        <span>🤝</span>
                                        <span>استقبال</span>
                                      </span>
                                    ) : entry.sessionType === "حصة شاغرة / فراغ" || entry.className === "فراغ" ? (
                                      <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-600 text-white flex items-center gap-1">
                                        <span>☕</span>
                                        <span>شاغرة</span>
                                      </span>
                                    ) : (
                                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${color?.badge} print:border print:border-black print:text-black print:bg-gray-100`}>
                                        {entry.className}
                                      </span>
                                    )}
                                    <div className="flex items-center gap-1">
                                      {entry.lessonNoteNumber && (
                                        <span className="text-[9px] font-bold text-gray-700 bg-white/90 px-1 py-0.2 rounded border border-gray-300">
                                          {entry.lessonNoteNumber}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopyEntry(entry, e)}
                                        className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-sky-50 text-sky-700 border border-gray-200 transition shadow-2xs print:hidden cursor-pointer"
                                        title="نسخ بيانات هذه الحصة لفوج آخر 📋"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditModal(entry);
                                        }}
                                        className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-gray-200 transition shadow-2xs print:hidden cursor-pointer"
                                        title="تعديل الحصة مباشرة"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteEntryDirectly(entry.id, e)}
                                        className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-rose-50 text-rose-600 border border-gray-200 transition shadow-2xs print:hidden cursor-pointer"
                                        title="حذف الحصة مباشرة دون مغادرة الصفحة"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <h4 className="text-[11px] font-black text-gray-900 leading-tight group-hover/slot:text-emerald-800 transition print:text-black">
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
                              /* خانة فارغة للحصص غير المسجلة مع تحضير فوري محدد التوقيت واليوم */
                              (() => {
                                const scheduled = getScheduledSlotDetails(timetable, day.dayName, slot);
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCreateModal(day.dateStr, slot.label, scheduled.className)}
                                    className="w-full h-full min-h-[65px] rounded-xl border border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center p-2 text-gray-400 group hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-800 transition cursor-pointer print:border-none print:bg-transparent text-center"
                                    title={`إضافة وتسجيل حصة ${day.dayName} (${slot.label})${scheduled.className ? ` لفوج ${scheduled.className}` : ""}`}
                                  >
                                    <span className="text-[10px] font-medium text-gray-400 print:hidden group-hover:hidden">— فارغة —</span>
                                    <div className="hidden group-hover:flex flex-col items-center gap-0.5 text-emerald-700 font-bold print:hidden">
                                      <div className="flex items-center gap-1 text-[11px] font-black">
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>+ إضافة</span>
                                      </div>
                                      {scheduled.className && (
                                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black">
                                          {scheduled.className}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })()
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
                              onClick={() => handleOpenEditModal(entry)}
                              className={`p-2 rounded-xl border ${color?.bg} ${color?.border} space-y-1 cursor-pointer hover:shadow-md hover:ring-2 hover:ring-emerald-500/40 transition group/slot relative`}
                              title="انقر لمعاينة أو تعديل هذه الحصة مباشرة ✏️"
                            >
                              <div className="flex items-center justify-between">
                                {entry.sessionType === "استقبال الأولياء" || entry.className === "أولياء التلاميذ" ? (
                                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-purple-700 text-white flex items-center gap-1">
                                    <span>🤝</span>
                                    <span>استقبال</span>
                                  </span>
                                ) : entry.sessionType === "حصة شاغرة / فراغ" || entry.className === "فراغ" ? (
                                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-600 text-white flex items-center gap-1">
                                    <span>☕</span>
                                    <span>شاغرة</span>
                                  </span>
                                ) : (
                                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${color?.badge}`}>
                                    {entry.className}
                                  </span>
                                )}
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-mono text-gray-500 font-bold">
                                    {slot.label}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyEntry(entry, e)}
                                    className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-sky-50 text-sky-700 border border-gray-200 transition shadow-2xs cursor-pointer"
                                    title="نسخ بيانات هذه الحصة لفوج آخر 📋"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditModal(entry);
                                    }}
                                    className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-gray-200 transition shadow-2xs cursor-pointer"
                                    title="تعديل الحصة مباشرة"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteEntryDirectly(entry.id, e)}
                                    className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-rose-50 text-rose-600 border border-gray-200 transition shadow-2xs cursor-pointer"
                                    title="حذف الحصة مباشرة دون مغادرة الصفحة"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <h4 className="text-[11px] font-black text-gray-900 leading-snug line-clamp-2 group-hover/slot:text-emerald-800 transition">
                                {entry.lessonTitle}
                              </h4>
                              {entry.section && (
                                <p className="text-[9px] text-gray-500 line-clamp-1">{entry.section}</p>
                              )}
                            </div>
                          );
                        }

                        const scheduled = getScheduledSlotDetails(timetable, day.dayName, slot);
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => handleOpenCreateModal(day.dateStr, slot.label, scheduled.className)}
                            className="w-full p-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-between text-gray-400 text-[10px] hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-800 transition cursor-pointer text-right"
                            title={`إضافة وتسجيل حصة ${day.dayName} (${slot.label})${scheduled.className ? ` لفوج ${scheduled.className}` : ""}`}
                          >
                            <span className="font-mono">{slot.label}</span>
                            <div className="flex items-center gap-1 text-emerald-700 font-bold">
                              <Plus className="w-3 h-3" />
                              <span>+ إضافة</span>
                              {scheduled.className && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-black">
                                  {scheduled.className}
                                </span>
                              )}
                            </div>
                          </button>
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
                                onClick={() => handleOpenEditModal(entry)}
                                className={`p-2 rounded-xl border ${color?.bg} ${color?.border} space-y-1 cursor-pointer hover:shadow-md hover:ring-2 hover:ring-emerald-500/40 transition group/slot relative`}
                                title="انقر لمعاينة أو تعديل هذه الحصة مباشرة ✏️"
                              >
                                <div className="flex items-center justify-between">
                                  {entry.sessionType === "استقبال الأولياء" || entry.className === "أولياء التلاميذ" ? (
                                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-purple-700 text-white flex items-center gap-1">
                                      <span>🤝</span>
                                      <span>استقبال</span>
                                    </span>
                                  ) : entry.sessionType === "حصة شاغرة / فراغ" || entry.className === "فراغ" ? (
                                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-600 text-white flex items-center gap-1">
                                      <span>☕</span>
                                      <span>شاغرة</span>
                                    </span>
                                  ) : (
                                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${color?.badge}`}>
                                      {entry.className}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-mono text-gray-500 font-bold">
                                      {slot.label}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyEntry(entry, e)}
                                      className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-sky-50 text-sky-700 border border-gray-200 transition shadow-2xs cursor-pointer"
                                      title="نسخ بيانات هذه الحصة لفوج آخر 📋"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditModal(entry);
                                      }}
                                      className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-gray-200 transition shadow-2xs cursor-pointer"
                                      title="تعديل الحصة مباشرة"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteEntryDirectly(entry.id, e)}
                                      className="opacity-0 group-hover/slot:opacity-100 p-0.5 rounded bg-white hover:bg-rose-50 text-rose-600 border border-gray-200 transition shadow-2xs cursor-pointer"
                                      title="حذف الحصة مباشرة دون مغادرة الصفحة"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <h4 className="text-[11px] font-black text-gray-900 leading-snug line-clamp-2 group-hover/slot:text-emerald-800 transition">
                                  {entry.lessonTitle}
                                </h4>
                                {entry.section && (
                                  <p className="text-[9px] text-gray-500 line-clamp-1">{entry.section}</p>
                                )}
                              </div>
                            );
                          }

                          const scheduled = getScheduledSlotDetails(timetable, day.dayName, slot);
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => handleOpenCreateModal(day.dateStr, slot.label, scheduled.className)}
                              className="w-full p-1.5 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-between text-gray-400 text-[10px] hover:border-emerald-400 hover:bg-emerald-50/60 hover:text-emerald-800 transition cursor-pointer text-right"
                              title={`إضافة وتسجيل حصة ${day.dayName} (${slot.label})${scheduled.className ? ` لفوج ${scheduled.className}` : ""}`}
                            >
                              <span className="font-mono">{slot.label}</span>
                              <div className="flex items-center gap-1 text-emerald-700 font-bold">
                                <Plus className="w-3 h-3" />
                                <span>+ إضافة</span>
                                {scheduled.className && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-black">
                                    {scheduled.className}
                                  </span>
                                )}
                              </div>
                            </button>
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

        {/* ─── نافذة الإضافة والتعديل الشاملة المنبثقة مباشرة (Self-contained Large Modal) ─── */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200 print:hidden"
            onClick={handleCloseModal}
          >
            <div
              className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto text-right"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ترويسة النافذة */}
              <div className={`p-5 flex items-start justify-between gap-3 text-white ${
                modalMode === "copy"
                  ? "bg-gradient-to-r from-sky-800 via-sky-700 to-teal-800"
                  : "bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800"
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-0.5 rounded-lg bg-white/20 backdrop-blur-md text-xs font-black text-white border border-white/30">
                      {modalMode === "copy"
                        ? "📋 نسخ وتكرار الحصة لفوج آخر"
                        : modalMode === "create"
                        ? "➕ إضافة حصة جديدة"
                        : "✏️ تعديل بيانات الحصة"}
                    </span>
                    <span className="text-xs font-bold text-emerald-100 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formPeriodTime}</span>
                    </span>
                    <span className="text-xs font-bold text-emerald-100 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>{formatArabicDate(formDate)}</span>
                    </span>
                  </div>
                  <h3 className="text-base sm:text-xl font-black text-white leading-snug">
                    {modalMode === "copy"
                      ? `نسخ الدرس لفوج آخر: ${formTitle || "الدرس"}`
                      : modalMode === "create"
                      ? "تسجيل حصة مباشرة في المخطط الأسبوعي"
                      : (formTitle || "تعديل بيانات الحصة")}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition cursor-pointer"
                  title="إغلاق النافذة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* جسم النافذة */}
              <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto space-y-5">
                {modalMode === "copy" && (
                  <div className="p-3.5 bg-sky-50 border border-sky-300 rounded-2xl flex items-center gap-3 text-xs font-bold text-sky-950 shadow-2xs animate-in fade-in">
                    <div className="w-9 h-9 rounded-xl bg-sky-200/70 flex items-center justify-center shrink-0 text-sky-800">
                      <Copy className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-black text-sky-950 text-sm">وضع نسخ وتكرار الدرس لفوج آخر 📋</div>
                      <p className="text-[11px] text-sky-800 font-medium leading-relaxed">
                        تم استنساخ كافة بيانات الدرس وعناصره تلقائياً. حدّد الآن <strong>الفوج المستهدف</strong> وتأكد من <strong>اليوم والتوقيت</strong>، ثم اضغط على زر الحفظ أدناه.
                      </p>
                    </div>
                  </div>
                )}

                {/* 1. أزرار القوالب الجاهزة السريعة (Presets) */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>أنماط الحصص السريعة (اختر للتعبئة التلقائية):</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "درس ومورد جديد", type: "درس ومورد جديد", icon: "📖" },
                      { label: "أعمال موجهة / وضعيات", type: "أعمال موجهة / وضعيات", icon: "📐" },
                      { label: "🤝 استقبال الأولياء", type: "استقبال الأولياء", icon: "🤝", highlight: "bg-purple-100 text-purple-900 border-purple-300" },
                      { label: "☕ حصة شاغرة / فراغ", type: "حصة شاغرة / فراغ", icon: "☕", highlight: "bg-slate-200 text-slate-900 border-slate-300" },
                      { label: "فرض محروس", type: "فرض محروس", icon: "📝" },
                      { label: "معالجة بيداغوجية", type: "معالجة بيداغوجية", icon: "💡" },
                      { label: "حل تمارين وتطبيقات", type: "حل تمارين وتطبيقات", icon: "✏️" },
                    ].map((p) => {
                      const isSelected = formSessionType === p.type;
                      return (
                        <button
                          key={p.type}
                          type="button"
                          onClick={() => handleApplyPreset(p.type)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-black transition border cursor-pointer ${
                            isSelected
                              ? "bg-emerald-700 text-white border-emerald-800 shadow-xs"
                              : p.highlight || "bg-white hover:bg-gray-100 text-gray-700 border-gray-200 shadow-2xs"
                          }`}
                        >
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. اختيار اليوم والتاريخ + التوقيت */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* اختيار اليوم من أيام الأسبوع */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1.5">
                      اليوم والتاريخ <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-5 gap-1 mb-2">
                      {weekInfo.days.map((d) => {
                        const isSelected = formDate === d.dateStr;
                        return (
                          <button
                            key={d.dateStr}
                            type="button"
                            onClick={() => setFormDate(d.dateStr)}
                            className={`py-1.5 px-1 rounded-xl text-center border transition cursor-pointer ${
                              isSelected
                                ? "bg-emerald-700 text-white border-emerald-800 shadow-xs font-black"
                                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 font-bold"
                            }`}
                          >
                            <span className="block text-xs">{d.dayName}</span>
                            <span className="block text-[10px] opacity-80">{d.dayNum} {d.monthName}</span>
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                    />
                  </div>

                  {/* اختيار التوقيت الزمني */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1.5">
                      الحصة الزمنية / التوقيت <span className="text-rose-500">*</span>
                    </label>
                    <div className="space-y-2">
                      <select
                        value={STANDARD_PERIODS.includes(formPeriodTime) ? formPeriodTime : "custom"}
                        onChange={(e) => {
                          if (e.target.value !== "custom") {
                            setFormPeriodTime(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-900 bg-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                      >
                        {STANDARD_PERIODS.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                        <option value="custom">✏️ توقيت مخصص آخر...</option>
                      </select>

                      <input
                        type="text"
                        value={formPeriodTime}
                        onChange={(e) => setFormPeriodTime(e.target.value)}
                        placeholder="مثال: 08:00 - 09:00"
                        className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-mono font-bold text-gray-800 outline-none focus:border-emerald-600 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. الفوج التربوي + نوع الحصة */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1.5">
                      الفوج التربوي <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formClassName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormClassName(val);
                          if (val === "أولياء التلاميذ") {
                            setFormSessionType("استقبال الأولياء");
                            if (!formTitle) setFormTitle("ساعة استقبال أولياء التلاميذ والاستفسارات التربوية");
                          } else if (val === "فراغ") {
                            setFormSessionType("حصة شاغرة / فراغ");
                            if (!formTitle) setFormTitle("حصة شاغرة");
                          } else {
                            const nextNote = getNextNoteNumber(val, entries);
                            if (modalMode === "create" && nextNote) {
                              setFormNoteNumber(nextNote);
                            }
                            const { field, section } = getLastFieldAndSection(val, entries);
                            if (modalMode === "create" && section && !formSection) {
                              setFormSection(section);
                              setFormField(field);
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-900 bg-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                      >
                        <optgroup label="الأفواج التربوية للمؤسسة">
                          {modalClassOptions.map((cls) => (
                            <option key={cls} value={cls}>
                              فوج {cls}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="حصص خاصة أخرى">
                          <option value="أولياء التلاميذ">🤝 أولياء التلاميذ (استقبال)</option>
                          <option value="فراغ">☕ فراغ (حصة شاغرة)</option>
                        </optgroup>
                      </select>
                      <input
                        type="text"
                        value={formClassName}
                        onChange={(e) => setFormClassName(e.target.value)}
                        placeholder="أو اكتب فوجه..."
                        className="w-24 px-2 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 text-center outline-none focus:border-emerald-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1.5">
                      طبيعة ونوع الحصة
                    </label>
                    <select
                      value={formSessionType}
                      onChange={(e) => handleApplyPreset(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-900 bg-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition"
                    >
                      {SESSION_TYPES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. عنوان المورد المعرفي / موضوع الحصة الرئيسي */}
                <div>
                  <label className="block text-xs font-black text-gray-800 mb-1.5">
                    عنوان المورد المعرفي / موضوع الحصة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مثال: ضرب الأعداد النسبية وتطبيقاتها..."
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-emerald-500/40 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 text-sm font-black text-gray-900 outline-none transition"
                    autoFocus
                  />
                </div>

                {/* 5. الميدان + المقطع التعلمي + رقم المذكرة */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">
                      الميدان التعليمي
                    </label>
                    <select
                      value={formField}
                      onChange={(e) => setFormField(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-900 bg-white outline-none focus:border-emerald-600 transition"
                    >
                      {FIELDS_LIST.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">
                      المقطع التعلمي
                    </label>
                    <input
                      type="text"
                      value={formSection}
                      onChange={(e) => setFormSection(e.target.value)}
                      placeholder="مثال: المقطع 02: الأعداد النسبية..."
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium text-gray-900 outline-none focus:border-emerald-600 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">
                      رقم المذكرة
                    </label>
                    <input
                      type="text"
                      value={formNoteNumber}
                      onChange={(e) => setFormNoteNumber(e.target.value)}
                      placeholder="مثال: 05"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-900 text-center outline-none focus:border-emerald-600 transition"
                    />
                  </div>
                </div>

                {/* 6. سيرورة ومراحل الحصة البيداغوجية (الأكورديون القابل للطي) */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowStagesAccordion(!showStagesAccordion)}
                    className="w-full p-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition cursor-pointer text-xs font-black text-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>سيرورة الحصة والمراحل البيداغوجية (وضعية الانطلاق، بناء المورد، إعادة الاستثمار)</span>
                      {formStages.some((s) => s.content.trim()) && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-black">
                          مسجلة
                        </span>
                      )}
                    </div>
                    {showStagesAccordion ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {showStagesAccordion && (
                    <div className="p-4 bg-white space-y-3 border-t border-gray-200">
                      {formStages.map((stage, idx) => (
                        <div key={stage.id} className="space-y-1">
                          <label className="block text-[11px] font-black text-gray-700">
                            {stage.label}:
                          </label>
                          <textarea
                            value={stage.content}
                            onChange={(e) => {
                              const newSt = [...formStages];
                              newSt[idx].content = e.target.value;
                              setFormStages(newSt);
                            }}
                            placeholder={`سيرورة ${stage.label}...`}
                            rows={2}
                            className="w-full px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-200 transition resize-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 7. الواجب المنزلي وملاحظات وتوجيهات */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">
                      📝 الواجب المنزلي (إن وجد)
                    </label>
                    <textarea
                      value={formHomework}
                      onChange={(e) => setFormHomework(e.target.value)}
                      placeholder="مثال: حل تمرين 14 ص 30 من الكتاب المدرسي..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium text-gray-900 outline-none focus:border-emerald-600 transition resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">
                      📌 ملاحظات وتوجيهات للأستاذ
                    </label>
                    <textarea
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="أي ملاحظات بيداغوجية حول الحصة..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium text-gray-900 outline-none focus:border-emerald-600 transition resize-none"
                    />
                  </div>
                </div>

              </div>

              {/* شريط الإجراءات السفلي للنافذة */}
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  {modalMode === "edit" && formEntryId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEntryDirectly(formEntryId)}
                      disabled={isSavingEntry}
                      className="px-4 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="حذف هذه الحصة نهائياً من المخطط"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>حذف الحصة نهائياً</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSavingEntry}
                    className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-xs font-bold text-gray-700 transition cursor-pointer"
                  >
                    إلغاء
                  </button>

                  {modalMode === "edit" && formEntryId && (
                    <button
                      type="button"
                      onClick={() => {
                        const currentEntry = entries.find((e) => e.id === formEntryId);
                        if (currentEntry) {
                          handleCopyEntry(currentEntry);
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="نسخ بيانات هذه الحصة وتطبيقها على فوج آخر"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ لفوج آخر 📋</span>
                    </button>
                  )}

                  {modalMode === "edit" && formEntryId && (
                    <Link
                      href={`/admin/diary?editId=${formEntryId}&date=${formDate}`}
                      className="px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5"
                      title="فتح هذه الحصة في صفحة الدفتر اليومي المفصل"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>فتح في الدفتر المفصل 📋</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveModalEntry}
                    disabled={isSavingEntry || !formTitle.trim()}
                    className={`px-6 py-2 rounded-xl text-white text-xs font-black transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 ${
                      modalMode === "copy"
                        ? "bg-sky-700 hover:bg-sky-800"
                        : "bg-emerald-700 hover:bg-emerald-800"
                    }`}
                  >
                    {isSavingEntry ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>
                      {modalMode === "copy"
                        ? "حفظ الحصة المنسوخة للفوج الجديد 💾"
                        : modalMode === "create"
                        ? "حفظ الحصة في المخطط 💾"
                        : "حفظ التعديلات 💾"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── إشعار Toast العائم ─── */}
        {toastMsg && (
          <div
            className={`fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-black animate-in slide-in-from-bottom-5 duration-200 print:hidden ${
              toastMsg.type === "ok"
                ? "bg-emerald-950 text-white border-emerald-700"
                : "bg-rose-950 text-white border-rose-700"
            }`}
          >
            {toastMsg.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <X className="w-4 h-4 text-rose-400" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

      </div>
    </div>
  );
}
