"use client";

import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Printer,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  School,
  X,
  FileText,
  Users,
  ChevronDown,
  ChevronUp,
  Compass,
  Search,
  RotateCcw,
  Check,
  Layers,
  Info,
  Zap,
  Tag,
  Palmtree,
  CalendarDays,
  ShieldCheck,
  BookMarked,
  ClipboardCheck,
} from "lucide-react";
import { getCurrentAcademicYear } from "@/lib/academicYear";
import { LoginRequired } from "@/components/LoginRequired";
import { PageExplainer } from "@/components/PageExplainer";
import { useProfile } from "@/lib/useProfile";
import { checkTeacherSession, getPersistedTeacherSession } from "@/lib/offlineAuth";
import {
  getTeacherOfflineData,
  saveTeacherOfflineData,
  cacheServerDataLocally,
  setupAutoSync,
} from "@/lib/offlineStorage";
import {
  DailyDiaryEntry,
  DiaryStage,
  SpecialDayRecord,
  SpecialDayType,
  LessonsData,
  COMMON_FIELDS,
  TimetableSettings,
  sortClasses,
  TeacherTimetable,
} from "@/lib/types";
import { getClassColors } from "@/app/admin/timetable/page";
import {
  printLandscapeDiaryReport,
  downloadLandscapeDiaryPDF,
} from "@/lib/pdfReportGenerator";

// توقيتات الحصص المعتمدة في التعليم المتوسط الجزائري
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

// حساب التوقيت التلقائي الذكي للحصة التالية بناءً على الحصص المسجلة
function getNextPeriodTime(existingLessonsOnDate: DailyDiaryEntry[]): string {
  if (!existingLessonsOnDate || existingLessonsOnDate.length === 0) return "08:00 - 09:00";
  const sorted = [...existingLessonsOnDate].sort((a, b) => (a.periodTime || "").localeCompare(b.periodTime || ""));
  const lastTime = sorted[sorted.length - 1]?.periodTime || "";

  if (lastTime.includes("08:00")) return "09:00 - 10:00";
  if (lastTime.includes("09:00")) return "10:00 - 11:00";
  if (lastTime.includes("10:00")) return "11:00 - 12:00";
  if (lastTime.includes("11:00")) return "14:00 - 15:00";
  if (lastTime.includes("13:00") || lastTime.includes("13:30")) return "14:30 - 15:30";
  if (lastTime.includes("14:00")) return "15:00 - 16:00";
  if (lastTime.includes("14:30")) return "15:30 - 16:30";
  if (lastTime.includes("15:00")) return "16:00 - 17:00";
  return "08:00 - 09:00";
}

// اقتراح رقم المذكرة التالي للفوج تلقائياً
function getNextNoteNumber(className: string, entries: DailyDiaryEntry[]): string {
  const classEntries = entries.filter((e) => e.className === className);
  let maxNum = 0;
  for (const e of classEntries) {
    const match = (e.lessonNoteNumber || "").match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum > 0 ? maxNum + 1 : classEntries.length + 1;
  return `مذكرة رقم: ${nextNum < 10 ? `0${nextNum}` : nextNum}`;
}

// استرجاع الميدان والمقطع السابق تلقائياً لنفس الفوج لتفادي إعادة كتابتهما
function getLastFieldAndSection(className: string, entries: DailyDiaryEntry[]): { field: string; section: string } {
  const classEntries = entries.filter((e) => e.className === className);
  if (classEntries.length > 0) {
    return {
      field: classEntries[0].field || "أنشطة عددية",
      section: classEntries[0].section || "",
    };
  }
  return { field: "أنشطة عددية", section: "" };
}

// أنواع الحصص البيداغوجية الرسمية
const SESSION_TYPES = [
  "درس",
  "أعمال موجهة",
  "تفويج",
  "تقويم تشخيصي",
  "إدماج كفاءات",
  "معالجة بيداغوجية",
  "استدراك ودعم",
  "تصحيح واجب منزلي",
  "استقبال الأولياء",
  "فرض محروس",
  "اختبار فصلي",
] as const;

// قوالب الأيام الخاصة
const SPECIAL_DAY_CONFIGS: Record<
  SpecialDayType,
  { label: string; icon: string; defaultTitle: string; defaultDesc: string }
> = {
  holiday: {
    label: "عطلة مدرسية رسمية (عطلة الخريف، الشتاء، الربيع...)",
    icon: "🍂",
    defaultTitle: "عطلة الخريف الرسمية",
    defaultDesc: "عطلة مدرسية رسمية لكافة المؤسسات التعليمية — راحة قانونية للتلاميذ والأساتذة.",
  },
  absence: {
    label: "طلب عطلة رسمية / غياب مبرر قانوناً لدى الإدارة",
    icon: "📋",
    defaultTitle: "طلب عطلة رسمية (غياب مبرر قانوناً لدى إدارة المؤسسة)",
    defaultDesc: "غياب مرخص ومبرر مسبقاً لدى إدارة المتوسطة. تمت تسوية كافة الإجراءات الإدارية والقانونية المعمول بها مسبقاً.",
  },
  seminar: {
    label: "يوم تكويني بيداغوجي / ندوة تربوية لمقاطعة التفتيش",
    icon: "★",
    defaultTitle: "يوم تكويني بيداغوجي لمقاطعة التفتيش",
    defaultDesc: "تحت إشراف السيد مفتش التربية الوطنية لمقاطعة التفتيش — دراسة التدرجات السنوية ومناقشة المعايير التفتيشية المعتمدة لمسك الدفاتر اليومية والتربوية.",
  },
  exams: {
    label: "أسبوع الفروض أو الاختبارات الرسمية",
    icon: "📝",
    defaultTitle: "إجراء الفروض المحروسة الرسمية",
    defaultDesc: "متابعة وإجراء الفروض المحروسة الرسمية للفصل الدراسي حسب الروزنامة المعتمدة بالمؤسسة.",
  },
  custom: {
    label: "يوم استثنائي آخر",
    icon: "📌",
    defaultTitle: "نشاط تربوي استثنائي",
    defaultDesc: "نشاط بيداغوجي أو يوم مخصص ومسجل في جدول المتابعة اليومية للأستاذ.",
  },
};

// حساب اسم اليوم بالعربية
function getArabicDayName(dateStr: string): string {
  if (!dateStr) return "الأحد";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return "الأحد";
  const dateObj = new Date(year, month - 1, day);
  const dayIndex = dateObj.getDay();
  const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return days[dayIndex] || "الأحد";
}

// تنسيق التاريخ بالعربية (مثلاً: 05 أكتوبر 2026)
function formatArabicFullDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const months = [
      "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
      "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    const paddedDay = day < 10 ? `0${day}` : `${day}`;
    return `${paddedDay} ${months[dateObj.getMonth()]} ${year}`;
  } catch {
    return dateStr;
  }
}

// المراحل الثلاث الافتراضية لسيرورة الحصة
function getDefaultStages(): DiaryStage[] {
  return [
    { label: "تمهيدي", content: "", color: "sky" },
    { label: "وسيطي", content: "", color: "emerald" },
    { label: "نهائي", content: "", color: "amber" },
  ];
}

function TeacherDiaryContent() {
  const { profile } = useProfile();
  const searchParams = useSearchParams();
  const initialParamsHandled = useRef<string | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // الأفواج والبيانات
  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [entries, setEntries] = useState<DailyDiaryEntry[]>([]);
  const [specialDays, setSpecialDays] = useState<SpecialDayRecord[]>([]);
  const [diaryDayTitles, setDiaryDayTitles] = useState<Record<string, string>>({});
  const [timetable, setTimetable] = useState<TeacherTimetable | null>(null);
  const [timetableSettings, setTimetableSettings] = useState<TimetableSettings | null>(null);

  // حساب تواريخ اليوم والغد
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().split("T")[0];
  }, []);

  // الفلاتر والبحث
  const [dateFilterTab, setDateFilterTab] = useState<"all" | "today" | "tomorrow" | "future" | "custom">("all");
  const [customFilterDate, setCustomFilterDate] = useState<string>(tomorrowStr);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // مرجع استمارة التحضير
  const formRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // حالة طي أو فتح استمارة التحضير
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  // الحصة قيد التعديل
  const [editingEntry, setEditingEntry] = useState<DailyDiaryEntry | null>(null);

  // حقول استمارة الحصة
  const [formDate, setFormDate] = useState<string>(tomorrowStr);
  const [formClass, setFormClass] = useState("");
  const [isCustomClassInput, setIsCustomClassInput] = useState(false);
  const [customClassName, setCustomClassName] = useState("");

  const [formPeriodTime, setFormPeriodTime] = useState("08:00 - 09:00");
  const [isCustomTimeInput, setIsCustomTimeInput] = useState(false);
  const [customTimeValue, setCustomTimeValue] = useState("");

  const [formNoteNumber, setFormNoteNumber] = useState("مذكرة رقم: 01");
  const [formSessionType, setFormSessionType] = useState<string>("درس");

  const [formField, setFormField] = useState<string>("أنشطة عددية");
  const [isCustomFieldInput, setIsCustomFieldInput] = useState(false);
  const [customFieldValue, setCustomFieldValue] = useState("");

  const [formSection, setFormSection] = useState("");
  const [formLessonTitle, setFormLessonTitle] = useState("");
  const [formConcepts, setFormConcepts] = useState("");
  const [formStages, setFormStages] = useState<DiaryStage[]>(getDefaultStages());
  const [formNotes, setFormNotes] = useState("");

  // نافذة تعيين عطلة أو غياب أو ندوة
  const [isSpecialDayModalOpen, setIsSpecialDayModalOpen] = useState(false);
  const [specialDayTargetDate, setSpecialDayTargetDate] = useState<string>(todayStr);
  const [specialDayType, setSpecialDayType] = useState<SpecialDayType>("holiday");
  const [specialDayTitle, setSpecialDayTitle] = useState("عطلة الخريف الرسمية");
  const [specialDayDesc, setSpecialDayDesc] = useState(SPECIAL_DAY_CONFIGS.holiday.defaultDesc);
  const [specialDayEndDate, setSpecialDayEndDate] = useState<string>("");

  // تعديل عنوان اليوم السريع
  const [editingDayTitleDate, setEditingDayTitleDate] = useState<string | null>(null);
  const [tempDayTitle, setTempDayTitle] = useState("");

  // حساب اسم اليوم تلقائياً
  const calculatedDayName = useMemo(() => getArabicDayName(formDate), [formDate]);

  // جلب البيانات
  useEffect(() => {
    const persisted = getPersistedTeacherSession();
    if (persisted?.id && typeof window !== "undefined") {
      try {
        const storedClasses = localStorage.getItem(`jusoor_classes_${persisted.id}`);
        if (storedClasses) {
          const parsed = JSON.parse(storedClasses);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sorted = sortClasses(parsed);
            setCustomClasses(sorted);
            setFormClass((prev) => prev || sorted[0]);
          }
        }
      } catch {}
    }

    setLoading(true);
    checkTeacherSession().then((auth) => {
      setAuthenticated(auth.authenticated);
      const teacherId = auth.profile?.id;
      if (teacherId) {
        setupAutoSync(teacherId, () => {
          setMessage({ type: "ok", text: "🟢 تم استعادة الاتصال ومزامنة الدفتر اليومي تلقائياً مع السحابة!" });
        });
      }

      fetch("/api/lessons")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: LessonsData | null) => {
          if (data && teacherId) {
            cacheServerDataLocally(teacherId, data);
          }
          const active = data || (teacherId ? getTeacherOfflineData(teacherId) : null);
          if (active) {
            const teacherClasses =
              Array.isArray(active.customClasses) && active.customClasses.length > 0
                ? sortClasses(active.customClasses)
                : [];
            if (teacherClasses.length > 0) {
              setCustomClasses(teacherClasses);
              setFormClass((prev) => prev || teacherClasses[0]);
            }
            if (Array.isArray(active.diaryEntries)) {
              setEntries(active.diaryEntries);
            }
            if (Array.isArray(active.specialDays)) {
              setSpecialDays(active.specialDays);
            }
            if (active.diaryDayTitles && typeof active.diaryDayTitles === "object") {
              setDiaryDayTitles(active.diaryDayTitles);
            }
            if (active.timetable) {
              setTimetable(active.timetable);
              if (active.timetable.settings) {
                setTimetableSettings(active.timetable.settings);
              }
            }
          }
        })
        .catch(() => {
          if (teacherId) {
            const offline = getTeacherOfflineData(teacherId);
            if (offline) {
              if (Array.isArray(offline.customClasses) && offline.customClasses.length > 0) {
                const sorted = sortClasses(offline.customClasses);
                setCustomClasses(sorted);
                setFormClass((prev) => prev || sorted[0]);
              }
              if (Array.isArray(offline.diaryEntries)) setEntries(offline.diaryEntries);
              if (Array.isArray(offline.specialDays)) setSpecialDays(offline.specialDays);
              if (offline.diaryDayTitles) setDiaryDayTitles(offline.diaryDayTitles);
              if (offline.timetable) setTimetable(offline.timetable);
            }
          }
        })
        .finally(() => {
          setLoading(false);
        });
    });
  }, []);

  // حفظ التعديلات على الخادم مع الحفظ المحلي المحمي للأوفلاين
  const persistChanges = async (payload: {
    diaryEntries?: DailyDiaryEntry[];
    specialDays?: SpecialDayRecord[];
    diaryDayTitles?: Record<string, string>;
  }) => {
    setSaving(true);
    const session = getPersistedTeacherSession();
    if (session?.id) {
      saveTeacherOfflineData(session.id, payload, true);
    }

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("فشل حفظ التعديلات على الخادم");
      setMessage({ type: "ok", text: "تم تحديث الدفتر اليومي بنجاح 📒" });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({
        type: "ok",
        text: "⚡ تم حفظ الدفتر اليومي محلياً في جهازك بأمان وسيُرفع تلقائياً عند عودة النت 📒",
      });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  // التمرير السلس إلى الاستمارة
  const scrollToForm = useCallback(() => {
    setIsFormExpanded(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      titleInputRef.current?.focus();
    }, 80);
  }, []);

  // الدخول في وضع تعديل حصة مسجلة
  const handleStartEdit = useCallback(
    (entry: DailyDiaryEntry) => {
      setEditingEntry(entry);
      setFormDate(entry.date);

      if (customClasses.includes(entry.className)) {
        setFormClass(entry.className);
        setIsCustomClassInput(false);
        setCustomClassName("");
      } else {
        setIsCustomClassInput(true);
        setCustomClassName(entry.className);
        setFormClass("__custom__");
      }

      const pTime = entry.periodTime || "08:00 - 09:00";
      if (STANDARD_PERIODS.includes(pTime)) {
        setFormPeriodTime(pTime);
        setIsCustomTimeInput(false);
        setCustomTimeValue("");
      } else {
        setIsCustomTimeInput(true);
        setCustomTimeValue(pTime);
        setFormPeriodTime("__custom__");
      }

      const fVal = entry.field || "أنشطة عددية";
      if (COMMON_FIELDS.includes(fVal as any) || fVal === "أخرى / مراجعة") {
        setFormField(fVal);
        setIsCustomFieldInput(false);
        setCustomFieldValue("");
      } else {
        setIsCustomFieldInput(true);
        setCustomFieldValue(fVal);
        setFormField("__custom__");
      }

      setFormNoteNumber(entry.lessonNoteNumber || "مذكرة رقم: 01");
      setFormSessionType(entry.sessionType || "درس");
      setFormSection(entry.section || "");
      setFormLessonTitle(entry.lessonTitle);
      setFormConcepts(entry.concepts || "");

      if (entry.stages && entry.stages.length > 0) {
        setFormStages(entry.stages);
      } else {
        const initial = getDefaultStages();
        if (entry.objectives) initial[0].content = entry.objectives;
        if (entry.activities) initial[1].content = entry.activities;
        if (entry.homework) initial[2].content = entry.homework;
        setFormStages(initial);
      }

      setFormNotes(entry.notes || "");
      scrollToForm();
    },
    [customClasses, scrollToForm]
  );

  // ─── استجابة لمعاملات الرابط (URL Query Params) للتحضير الفوري الموجه أو التعديل المباشر ───
  useEffect(() => {
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const pEditId = searchParams?.get("editId") || urlParams?.get("editId");
    const pDate = searchParams?.get("date") || urlParams?.get("date");
    const pTime = searchParams?.get("time") || urlParams?.get("time");
    const pClass = searchParams?.get("class") || urlParams?.get("class");
    const isNew = searchParams?.get("new") === "true" || urlParams?.get("new") === "true";

    if (!pEditId && !pDate && !pTime && !pClass) return;

    // إذا لم تكتمل عملية جلب الحصص ولدينا معرّف أو نبحث عن حصة موجودة للتعديل، ننتظر اكتمال التحميل
    if (loading && (pEditId || (!isNew && pDate && pTime))) {
      return;
    }

    const signature = `${pEditId || ""}_${pDate || ""}_${pTime || ""}_${pClass || ""}_${isNew ? "new" : "auto"}_${entries.length}`;
    if (initialParamsHandled.current === signature) return;
    initialParamsHandled.current = signature;

    // 1. فحص وجود حصة سابقة بالمعرف أو بالتاريخ والتوقيت لتعديلها مباشرة
    let targetEntry: DailyDiaryEntry | undefined;
    if (pEditId) {
      targetEntry = entries.find((e) => e.id === pEditId);
    } else if (!isNew && pDate && pTime) {
      const decodedTime = decodeURIComponent(pTime).trim();
      const decodedClass = pClass ? decodeURIComponent(pClass).trim() : null;

      const normTime = (s: string) => s.replace(/\s+/g, "").replace(/[-–—]/g, "-");
      const targetTimeNorm = normTime(decodedTime);
      const targetTimeStart = targetTimeNorm.split("-")[0];

      targetEntry = entries.find((e) => {
        if (e.date !== pDate) return false;
        if (decodedClass && e.className !== decodedClass) return false;
        const entryTime = normTime(e.periodTime || "");
        if (entryTime === targetTimeNorm) return true;
        if (targetTimeStart && entryTime.startsWith(targetTimeStart)) return true;
        return false;
      });
    }

    if (targetEntry) {
      handleStartEdit(targetEntry);
      if (pDate) {
        setDateFilterTab("custom");
        setCustomFilterDate(pDate);
      }
      setMessage({
        type: "ok",
        text: `✏️ تم فتح حصة "${targetEntry.lessonTitle}" (${targetEntry.className} — ${targetEntry.periodTime || ""}) للتعديل المباشر 📒`,
      });
      setTimeout(() => setMessage(null), 6000);
      return;
    }

    // 2. إذا لم توجد حصة مسجلة بهذا الموعد، نجهز استمارة جديدة بالبيانات الممررة
    if (pDate) {
      setFormDate(pDate);
      setDateFilterTab("custom");
      setCustomFilterDate(pDate);
    }

    if (pTime) {
      const decodedTime = decodeURIComponent(pTime).trim();
      if (STANDARD_PERIODS.includes(decodedTime)) {
        setFormPeriodTime(decodedTime);
        setIsCustomTimeInput(false);
        setCustomTimeValue("");
      } else {
        setFormPeriodTime(decodedTime);
        setIsCustomTimeInput(true);
        setCustomTimeValue(decodedTime);
      }
    }

    if (pClass) {
      const decodedClass = decodeURIComponent(pClass).trim();
      setFormClass(decodedClass);
      setIsCustomClassInput(false);
      setCustomClassName("");

      // اقتراح رقم المذكرة والميدان تلقائياً للفوج
      const nextNote = getNextNoteNumber(decodedClass, entries);
      setFormNoteNumber(nextNote);
      const prevFieldSection = getLastFieldAndSection(decodedClass, entries);
      setFormField(prevFieldSection.field);
      setFormSection(prevFieldSection.section);
    }

    // فتح استمارة التحضير فوراً والتمرير السلس إليها والتركيز على خانة عنوان الدرس
    setIsFormExpanded(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      titleInputRef.current?.focus();
    }, 250);

    const dayName = pDate ? getArabicDayName(pDate) : "";
    setMessage({
      type: "ok",
      text: `🎯 تم تحديد موعد الحصة للتحضير الفوري: ${dayName} ${pDate || ""} (الساعة: ${pTime || ""})${pClass ? ` لفوج ${pClass}` : ""} — جاهزة للتدوين الآن!`,
    });
    setTimeout(() => setMessage(null), 6000);
  }, [searchParams, entries, loading, handleStartEdit]);

  // تفريغ وتجهيز الاستمارة لحصة جديدة مع التعبئة الذكية للتوقيت والميدان
  const handleResetForm = useCallback(
    (targetDate = tomorrowStr, targetClass?: string, targetTime?: string) => {
      setEditingEntry(null);
      setFormDate(targetDate);

      const cls = targetClass || formClass || customClasses[0] || "";
      setFormClass(cls);
      setIsCustomClassInput(false);
      setCustomClassName("");

      // 1. التوقيت: إذا حُدد توقيت، يُعتمد مباشرة، وإلا يُحسب تلقائياً بعد الحصة السابقة
      if (targetTime) {
        if (STANDARD_PERIODS.includes(targetTime)) {
          setFormPeriodTime(targetTime);
          setIsCustomTimeInput(false);
          setCustomTimeValue("");
        } else {
          setFormPeriodTime(targetTime);
          setIsCustomTimeInput(true);
          setCustomTimeValue(targetTime);
        }
      } else {
        const existingToday = entries.filter((e) => e.date === targetDate);
        const nextTime = getNextPeriodTime(existingToday);
        setFormPeriodTime(nextTime);
        setIsCustomTimeInput(false);
        setCustomTimeValue("");
      }

      // 2. اقتراح رقم المذكرة تلقائياً
      const nextNote = getNextNoteNumber(cls, entries);
      setFormNoteNumber(nextNote);

      // 3. اعتماد الميدان والمقطع السابقين لنفس الفوج تلقائياً
      const prevFieldSection = getLastFieldAndSection(cls, entries);
      setFormField(prevFieldSection.field);
      setIsCustomFieldInput(false);
      setCustomFieldValue("");
      setFormSection(prevFieldSection.section);

      setFormSessionType("درس");
      setFormLessonTitle("");
      setFormConcepts("");
      setFormStages(getDefaultStages());
      setFormNotes("");
    },
    [customClasses, entries, formClass, tomorrowStr]
  );

  // فتح التحضير لتاريخ محدد مع احتساب التوقيت التلقائي
  const handlePrepareForDate = (dateToPrepare: string, clsToPrepare?: string) => {
    handleResetForm(dateToPrepare, clsToPrepare);
    scrollToForm();
  };

  // عند تغيير الفوج في الاستمارة: تحديث الميدان والمقطع ورقم المذكرة تلقائياً لذلك الفوج!
  const handleClassChange = (newCls: string) => {
    setFormClass(newCls);
    if (newCls && newCls !== "__custom__") {
      const prev = getLastFieldAndSection(newCls, entries);
      setFormField(prev.field);
      setFormSection(prev.section);
      setFormNoteNumber(getNextNoteNumber(newCls, entries));
    }
  };

  // إضافة مرحلة مخصصة في سيرورة الحصة
  const handleAddCustomStage = () => {
    setFormStages((prev) => [
      ...prev,
      {
        id: `stg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        label: "",
        content: "",
        color: "purple",
      },
    ]);
  };

  // تحديث محتوى مرحلة
  const handleUpdateStage = (index: number, patch: Partial<DiaryStage>) => {
    setFormStages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  // حذف مرحلة
  const handleRemoveStage = (index: number) => {
    setFormStages((prev) => prev.filter((_, i) => i !== index));
  };

  // حفظ الحصة
  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    const actualClass = isCustomClassInput ? customClassName.trim() : formClass.trim();
    const actualTime = isCustomTimeInput ? customTimeValue.trim() : formPeriodTime.trim();
    const actualField = isCustomFieldInput ? customFieldValue.trim() : formField.trim();
    const actualTitle = formLessonTitle.trim();

    if (!actualTitle) {
      setMessage({ type: "err", text: "يرجى كتابة عنوان المورد المعرفي / الدرس" });
      titleInputRef.current?.focus();
      return;
    }

    if (!formDate) {
      setMessage({ type: "err", text: "يرجى تحديد تاريخ الحصة" });
      return;
    }

    if (!actualClass) {
      setMessage({ type: "err", text: "يرجى تحديد أو كتابة الفوج التربوي" });
      return;
    }

    const dayName = calculatedDayName;
    const objectivesStage = formStages.find((s) => s.label.includes("تمهيدي") || s.label.includes("انطلاق"));
    const activitiesStage = formStages.find((s) => s.label.includes("وسيطي") || s.label.includes("بناء"));
    const homeworkStage = formStages.find((s) => s.label.includes("نهائي") || s.label.includes("واجب") || s.label.includes("تقويم"));

    let updated: DailyDiaryEntry[];
    if (editingEntry) {
      updated = entries.map((en) =>
        en.id === editingEntry.id
          ? {
              ...en,
              date: formDate,
              day: dayName,
              periodTime: actualTime || undefined,
              className: actualClass,
              field: actualField || undefined,
              section: formSection.trim() || undefined,
              lessonTitle: actualTitle,
              lessonNoteNumber: formNoteNumber.trim() || undefined,
              sessionType: formSessionType || undefined,
              concepts: formConcepts.trim() || undefined,
              stages: formStages,
              objectives: objectivesStage?.content || undefined,
              activities: activitiesStage?.content || undefined,
              homework: homeworkStage?.content || undefined,
              notes: formNotes.trim() || undefined,
              isPublicForParents: false, // الدفتر وثيقة داخلية للأستاذ والمفتش والمدير فقط
            }
          : en
      );
    } else {
      const newEntry: DailyDiaryEntry = {
        id: `diary_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date: formDate,
        day: dayName,
        periodTime: actualTime || undefined,
        className: actualClass,
        field: actualField || undefined,
        section: formSection.trim() || undefined,
        lessonTitle: actualTitle,
        lessonNoteNumber: formNoteNumber.trim() || undefined,
        sessionType: formSessionType || undefined,
        concepts: formConcepts.trim() || undefined,
        stages: formStages,
        objectives: objectivesStage?.content || undefined,
        activities: activitiesStage?.content || undefined,
        homework: homeworkStage?.content || undefined,
        notes: formNotes.trim() || undefined,
        isPublicForParents: false,
        createdAt: new Date().toISOString(),
      };
      updated = [newEntry, ...entries];
    }

    setEntries(updated);

    if (actualClass && !customClasses.includes(actualClass)) {
      setCustomClasses((prev) => sortClasses([...prev, actualClass]));
    }

    await persistChanges({ diaryEntries: updated });

    if (editingEntry) {
      handleResetForm(formDate, actualClass);
    } else {
      // بعد إضافة الحصة: يتم ضبط التوقيت تلقائياً للحصة الموالية (مثلاً 09:00 - 10:00)
      // والاحتفاظ بالتاريخ والميدان لتسريع الإدخال دون أي جهد!
      const currentLessons = updated.filter((en) => en.date === formDate);
      const nextTime = getNextPeriodTime(currentLessons);
      setFormPeriodTime(nextTime);
      setFormLessonTitle("");
      setFormConcepts("");
      setFormStages(getDefaultStages());
      setFormNotes("");
      titleInputRef.current?.focus();
    }
  };

  // استخراج قائمة الدروس السابقة تلقائياً لاسترجاعها وتكرارها بنقرة واحدة
  const previousLessons = useMemo(() => {
    const map = new Map<
      string,
      {
        title: string;
        field: string;
        section: string;
        sessionType: string;
        concepts: string;
        stages: DiaryStage[];
        notes?: string;
      }
    >();

    entries.forEach((e) => {
      const cleanTitle = (e.lessonTitle || "").trim();
      if (cleanTitle) {
        const key = `${cleanTitle}___${e.field || ""}___${e.section || ""}`;
        if (!map.has(key)) {
          map.set(key, {
            title: cleanTitle,
            field: e.field || "أنشطة عددية",
            section: e.section || "",
            sessionType: e.sessionType || "درس",
            concepts: e.concepts || "",
            stages: Array.isArray(e.stages) && e.stages.length > 0 ? e.stages : getDefaultStages(),
            notes: e.notes || "",
          });
        }
      }
    });

    return Array.from(map.values());
  }, [entries]);

  // استرجاع وتعبئة درس سابق فوراً في الاستمارة
  const handleApplyPreviousLesson = (lesson: {
    title: string;
    field: string;
    section: string;
    sessionType: string;
    concepts: string;
    stages: DiaryStage[];
    notes?: string;
  }) => {
    setFormLessonTitle(lesson.title);
    const fVal = lesson.field || "أنشطة عددية";
    if (COMMON_FIELDS.includes(fVal as any) || fVal === "أخرى / مراجعة") {
      setFormField(fVal);
      setIsCustomFieldInput(false);
      setCustomFieldValue("");
    } else {
      setIsCustomFieldInput(true);
      setCustomFieldValue(fVal);
      setFormField("__custom__");
    }
    setFormSection(lesson.section);
    setFormSessionType(lesson.sessionType || "درس");
    setFormConcepts(lesson.concepts || "");
    setFormStages(JSON.parse(JSON.stringify(lesson.stages)));
    if (lesson.notes) setFormNotes(lesson.notes);

    setMessage({
      type: "ok",
      text: `تم استرجاع محتوى درس "${lesson.title}" بنجاح! اختر الفوج واضغط حفظ 📝`,
    });
    setTimeout(() => setMessage(null), 3500);
  };

  // تكرار حصة مسجلة في الجدول لفوج آخر فوراً
  const handleDuplicateForAnotherClass = (entry: DailyDiaryEntry) => {
    setIsFormExpanded(true);
    setEditingEntry(null);
    setFormDate(entry.date);

    // اقتراح الفوج التالي تلقائياً
    const currentIdx = customClasses.indexOf(entry.className);
    let nextClass = entry.className;
    if (currentIdx >= 0 && currentIdx + 1 < customClasses.length) {
      nextClass = customClasses[currentIdx + 1];
    } else if (customClasses.length > 0) {
      nextClass = customClasses[0];
    }

    setFormClass(nextClass);
    setIsCustomClassInput(false);

    // حساب التوقيت التلقائي للحصة الموالية لذلك اليوم
    const existingToday = entries.filter((e) => e.date === entry.date);
    setFormPeriodTime(getNextPeriodTime(existingToday));

    // رقم المذكرة للفوج الجديد
    setFormNoteNumber(getNextNoteNumber(nextClass, entries));

    // نسخ كامل محتوى الدرس
    const fVal = entry.field || "أنشطة عددية";
    if (COMMON_FIELDS.includes(fVal as any) || fVal === "أخرى / مراجعة") {
      setFormField(fVal);
      setIsCustomFieldInput(false);
      setCustomFieldValue("");
    } else {
      setIsCustomFieldInput(true);
      setCustomFieldValue(fVal);
      setFormField("__custom__");
    }
    setFormSection(entry.section || "");
    setFormLessonTitle(entry.lessonTitle);
    setFormSessionType(entry.sessionType || "درس");
    setFormConcepts(entry.concepts || "");
    setFormStages(
      entry.stages && entry.stages.length > 0 ? JSON.parse(JSON.stringify(entry.stages)) : getDefaultStages()
    );
    setFormNotes(entry.notes || "");

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      titleInputRef.current?.focus();
    }, 80);

    setMessage({
      type: "ok",
      text: `تم نسخ بيانات الدرس! تم اقتراح الفوج (${nextClass}) والتوقيت التالي. اضغط حفظ لتأكيده 🚀`,
    });
    setTimeout(() => setMessage(null), 4000);
  };

  // حفظ الحصة وتجهيز نفس الدرس مباشرة للفوج الموالي بنقرة واحدة!
  const handleSubmitAndRepeat = async () => {
    const actualTitle = formLessonTitle.trim();
    if (!actualTitle) {
      alert("يرجى كتابة عنوان المورد / الدرس أولاً");
      titleInputRef.current?.focus();
      return;
    }

    const actualClass = isCustomClassInput ? customClassName.trim() : formClass;
    if (!actualClass) {
      alert("يرجى اختيار أو كتابة الفوج");
      return;
    }

    const actualTime = isCustomTimeInput ? customTimeValue.trim() : formPeriodTime;
    const actualField = isCustomFieldInput ? customFieldValue.trim() : formField;
    const dayName = calculatedDayName;

    const objectivesStage = formStages.find((s) => s.label.includes("تمهيدي") || s.label.includes("أهداف"));
    const activitiesStage = formStages.find((s) => s.label.includes("وسيطي") || s.label.includes("أنشطة"));
    const homeworkStage = formStages.find((s) => s.label.includes("نهائي") || s.label.includes("واجب"));

    const newEntry: DailyDiaryEntry = {
      id: `diary_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: formDate,
      day: dayName,
      periodTime: actualTime || undefined,
      className: actualClass,
      field: actualField || undefined,
      section: formSection.trim() || undefined,
      lessonTitle: actualTitle,
      lessonNoteNumber: formNoteNumber.trim() || undefined,
      sessionType: formSessionType || undefined,
      concepts: formConcepts.trim() || undefined,
      stages: formStages,
      objectives: objectivesStage?.content || undefined,
      activities: activitiesStage?.content || undefined,
      homework: homeworkStage?.content || undefined,
      notes: formNotes.trim() || undefined,
      isPublicForParents: false,
      createdAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);

    if (actualClass && !customClasses.includes(actualClass)) {
      setCustomClasses((prev) => sortClasses([...prev, actualClass]));
    }

    await persistChanges({ diaryEntries: updated });

    // الانتقال التلقائي للفوج التالي!
    const currentIdx = customClasses.indexOf(actualClass);
    let nextClass = actualClass;
    if (currentIdx >= 0 && currentIdx + 1 < customClasses.length) {
      nextClass = customClasses[currentIdx + 1];
    } else if (customClasses.length > 0) {
      nextClass = customClasses[0];
    }

    setFormClass(nextClass);
    setIsCustomClassInput(false);

    // حساب التوقيت التالي لنفس اليوم
    const currentLessons = updated.filter((en) => en.date === formDate);
    setFormPeriodTime(getNextPeriodTime(currentLessons));

    // حساب رقم المذكرة للفوج الجديد
    setFormNoteNumber(getNextNoteNumber(nextClass, updated));

    // نحتفظ بالعنوان والميدان والمقطع والمفاهيم والسيرورة كاملة كما هي لتسهيل إعادة استخدامها!
    setMessage({
      type: "ok",
      text: `تم حفظ الحصة لفوج (${actualClass}) بنجاح! تم تجهيز نفس الدرس مباشرة لفوج (${nextClass}). اضغط حفظ لتأكيده 🚀`,
    });
  };

  // حذف حصة
  const handleDeleteEntry = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف الحصة "${title}" من الدفتر اليومي؟`)) return;
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    if (editingEntry?.id === id) {
      handleResetForm();
    }
    await persistChanges({ diaryEntries: updated });
  };

  // التحقق مما إذا كان التاريخ عطلة أو غياباً أو ندوة
  const getSpecialDayForDate = useCallback(
    (dateStr: string): SpecialDayRecord | undefined => {
      return specialDays.find((sd) => {
        if (sd.date === dateStr) return true;
        if (sd.endDate && sd.date <= dateStr && dateStr <= sd.endDate) return true;
        return false;
      });
    },
    [specialDays]
  );

  // فتح نافذة تعيين يوم خاص
  const handleOpenSpecialDayModal = (targetDate: string) => {
    setSpecialDayTargetDate(targetDate);
    const existing = getSpecialDayForDate(targetDate);
    if (existing) {
      setSpecialDayType(existing.type);
      setSpecialDayTitle(existing.title);
      setSpecialDayDesc(existing.description || "");
      setSpecialDayEndDate(existing.endDate || "");
    } else {
      setSpecialDayType("holiday");
      setSpecialDayTitle(SPECIAL_DAY_CONFIGS.holiday.defaultTitle);
      setSpecialDayDesc(SPECIAL_DAY_CONFIGS.holiday.defaultDesc);
      setSpecialDayEndDate("");
    }
    setIsSpecialDayModalOpen(true);
  };

  // حفظ اليوم الخاص (عطلة أو غياب)
  const handleSaveSpecialDay = async () => {
    if (!specialDayTitle.trim()) {
      alert("يرجى كتابة عنوان العطلة أو الحدث");
      return;
    }

    const dayName = getArabicDayName(specialDayTargetDate);
    const existingIdx = specialDays.findIndex(
      (sd) => sd.date === specialDayTargetDate || (sd.endDate && sd.date <= specialDayTargetDate && specialDayTargetDate <= sd.endDate)
    );

    const newRecord: SpecialDayRecord = {
      id: existingIdx >= 0 ? specialDays[existingIdx].id : `sp_${Date.now()}`,
      date: specialDayTargetDate,
      endDate: specialDayEndDate ? specialDayEndDate : undefined,
      dayName,
      type: specialDayType,
      title: specialDayTitle.trim(),
      description: specialDayDesc.trim() || undefined,
      isOfficial: specialDayType === "holiday",
      createdAt: new Date().toISOString(),
    };

    let updated: SpecialDayRecord[];
    if (existingIdx >= 0) {
      updated = [...specialDays];
      updated[existingIdx] = newRecord;
    } else {
      updated = [newRecord, ...specialDays];
    }

    setSpecialDays(updated);
    setIsSpecialDayModalOpen(false);
    await persistChanges({ specialDays: updated });
  };

  // حذف أو إلغاء اليوم الخاص
  const handleRemoveSpecialDay = async (dateStr: string) => {
    const record = getSpecialDayForDate(dateStr);
    if (!record) return;
    if (!confirm(`هل تريد إلغاء "${record.title}" وإرجاع اليوم ليوم دراسي عادي؟`)) return;

    const updated = specialDays.filter((s) => s.id !== record.id);
    setSpecialDays(updated);
    setIsSpecialDayModalOpen(false);
    await persistChanges({ specialDays: updated });
  };

  // استيراد الحصص تلقائياً من جدول التوقيت الأسبوعي
  const handleSyncFromTimetable = async (targetDate: string) => {
    if (!timetable || !Array.isArray(timetable.slots) || timetable.slots.length === 0) {
      alert("لم يتم العثور على حصص مبرمجة في جدول التوقيت الأسبوعي. يمكنك ضبط جدولك من صفحة التوقيت أولاً.");
      return;
    }

    const dayName = getArabicDayName(targetDate);
    const daySlots = timetable.slots.filter(
      (s) => s.day === dayName && s.className && s.className !== "فراغ" && s.className !== "شاغرة"
    );

    if (daySlots.length === 0) {
      alert(`لا توجد حصص مسندة في جدول التوقيت الأسبوعي ليوم (${dayName}).`);
      return;
    }

    daySlots.sort((a, b) => (a.start || "").localeCompare(b.start || ""));

    const existingToday = entries.filter((e) => e.date === targetDate);
    if (existingToday.length > 0) {
      if (
        !confirm(
          `يوجد بالفعل ${existingToday.length} حصة مسجلة ليوم ${dayName} (${targetDate}). هل تريد إضافة واستيراد الـ (${daySlots.length}) حصص المبرمجة من جدول التوقيت؟`
        )
      ) {
        return;
      }
    }

    const newEntries: DailyDiaryEntry[] = daySlots.map((slot, idx) => {
      let mappedType = "درس";
      if (slot.sessionType === "td" || (slot.subgroup && slot.subgroup !== "القسم كامل")) mappedType = "أعمال موجهة";
      if (slot.sessionType === "reception" || slot.className.includes("استقبال")) mappedType = "استقبال الأولياء";
      if (slot.sessionType === "remedial" || slot.className.includes("استدراك")) mappedType = "استدراك ودعم";

      const timeStr = `${slot.start} - ${slot.end}`;
      const prev = getLastFieldAndSection(slot.className, entries);

      return {
        id: `diary_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        date: targetDate,
        day: dayName,
        periodTime: timeStr,
        className: slot.className,
        sessionType: mappedType,
        lessonNoteNumber: getNextNoteNumber(slot.className, entries),
        field: prev.field || "أنشطة عددية",
        section: prev.section || "",
        lessonTitle: mappedType === "استقبال الأولياء" ? "استقبال ومرافقة أولياء التلاميذ" : `مورد تعليمي — فوج ${slot.className}`,
        concepts: "",
        stages: getDefaultStages(),
        isPublicForParents: false,
        createdAt: new Date().toISOString(),
      };
    });

    const updated = [...newEntries, ...entries];
    setEntries(updated);

    const newClassNames = daySlots.map((s) => s.className).filter(Boolean);
    const combinedClasses = sortClasses(Array.from(new Set([...customClasses, ...newClassNames])));
    setCustomClasses(combinedClasses);

    await persistChanges({ diaryEntries: updated });
    setMessage({
      type: "ok",
      text: `تم استيراد ${newEntries.length} حصة بنجاح من جدول التوقيت ليوم ${dayName}! ⚡`,
    });
  };

  // حفظ عنوان اليوم العام
  const handleSaveDayTitle = async (dateStr: string) => {
    const updated = { ...diaryDayTitles, [dateStr]: tempDayTitle.trim() };
    if (!tempDayTitle.trim()) {
      delete updated[dateStr];
    }
    setDiaryDayTitles(updated);
    setEditingDayTitleDate(null);
    setTempDayTitle("");
    await persistChanges({ diaryDayTitles: updated });
  };

  // تجميع وتصفية الأيام
  const groupedDays = useMemo(() => {
    const allDatesSet = new Set<string>();

    entries.forEach((e) => allDatesSet.add(e.date));
    specialDays.forEach((sd) => {
      allDatesSet.add(sd.date);
      if (sd.endDate) allDatesSet.add(sd.endDate);
    });

    allDatesSet.add(todayStr);
    allDatesSet.add(tomorrowStr);

    let datesArr = Array.from(allDatesSet);

    if (dateFilterTab === "today") {
      datesArr = datesArr.filter((d) => d === todayStr);
    } else if (dateFilterTab === "tomorrow") {
      datesArr = datesArr.filter((d) => d === tomorrowStr);
    } else if (dateFilterTab === "future") {
      datesArr = datesArr.filter((d) => d >= todayStr);
    } else if (dateFilterTab === "custom" && customFilterDate) {
      datesArr = datesArr.filter((d) => d === customFilterDate);
    }

    datesArr.sort((a, b) => b.localeCompare(a));

    return datesArr.map((dateStr) => {
      const dayName = getArabicDayName(dateStr);
      const specialDay = getSpecialDayForDate(dateStr);
      let dayEntries = entries.filter((e) => e.date === dateStr);

      if (selectedClassFilter !== "all") {
        dayEntries = dayEntries.filter((e) => e.className === selectedClassFilter);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        dayEntries = dayEntries.filter((e) => {
          const matchTitle = e.lessonTitle.toLowerCase().includes(q);
          const matchField = (e.field || "").toLowerCase().includes(q);
          const matchClass = e.className.toLowerCase().includes(q);
          const matchSection = (e.section || "").toLowerCase().includes(q);
          const matchConcepts = (e.concepts || "").toLowerCase().includes(q);
          const matchNotes = (e.notes || "").toLowerCase().includes(q);
          return matchTitle || matchField || matchClass || matchSection || matchConcepts || matchNotes;
        });
      }

      dayEntries.sort((a, b) => (a.periodTime || "").localeCompare(b.periodTime || ""));
      const customTitle = diaryDayTitles[dateStr];

      return {
        dateStr,
        dayName,
        specialDay,
        entries: dayEntries,
        customTitle,
      };
    });
  }, [
    entries,
    specialDays,
    diaryDayTitles,
    todayStr,
    tomorrowStr,
    dateFilterTab,
    customFilterDate,
    selectedClassFilter,
    searchQuery,
    getSpecialDayForDate,
  ]);

  // إحصائيات سريعة
  const tomorrowLessons = useMemo(() => entries.filter((e) => e.date === tomorrowStr), [entries, tomorrowStr]);
  const todayLessons = useMemo(() => entries.filter((e) => e.date === todayStr), [entries, todayStr]);

  // بيانات الترويسة للطباعة الرسمية
  const printTeacherName = timetableSettings?.teacherName || profile?.fullName || "الأستاذ(ة)";
  const printSchoolName = timetableSettings?.schoolName || profile?.schoolCustomName || "المؤسسة التعليمية";
  const printInspectorName = timetableSettings?.inspectorName || "السيد مفتش التعليم المتوسط";
  const printPrincipalName = timetableSettings?.principalName || "السيد مدير المؤسسة";
  const printSubject = timetableSettings?.subjectName || profile?.subject || "الرياضيات";
  const printWilaya = timetableSettings?.wilayaName || "الوادي";

  // خريطة ألوان الأفواج للتقرير المطبوع
  const classColorsMap = useMemo(() => {
    const map: Record<string, string> = {};
    customClasses.forEach((cls) => {
      const theme = getClassColors(
        cls,
        customClasses,
        timetableSettings?.colorMode || "distinct",
        timetableSettings?.classColors
      );
      map[cls] = theme.hex;
    });
    return map;
  }, [customClasses, timetableSettings]);

  // تشغيل محرك الطباعة الأفقي A4 Landscape
  const handlePrintLandscape = () => {
    printLandscapeDiaryReport({
      teacherName: printTeacherName,
      schoolName: printSchoolName,
      inspectorName: printInspectorName,
      principalName: printPrincipalName,
      subjectName: printSubject,
      wilayaName: printWilaya,
      days: groupedDays,
      customClasses,
      timetableSettings,
      classColorsMap,
    });
  };

  // تشغيل تحميل الـ PDF الأفقي المباشر
  const handleDownloadLandscapePDF = (isBlankTemplate: boolean = false) => {
    downloadLandscapeDiaryPDF({
      teacherName: printTeacherName,
      schoolName: printSchoolName,
      inspectorName: printInspectorName,
      principalName: printPrincipalName,
      subjectName: printSubject,
      wilayaName: printWilaya,
      academicYear: getCurrentAcademicYear(),
      isBlankTemplate,
      days: groupedDays,
      customClasses,
      timetableSettings,
      classColorsMap,
    });
  };

  if (authenticated === false) {
    return <LoginRequired next="/admin/diary" title="الدفتر اليومي ودفتر النصوص" />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] py-6 sm:py-8 px-3 sm:px-6 font-sans text-right" dir="rtl">
      {/* فرض التوجيه الأفقي A4 Landscape في الطباعة المباشرة من المتصفح أيضاً */}
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 8mm 10mm;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="max-w-6xl mx-auto space-y-6">

        {/* ─── الترويسة الرسمية الخاصة بالطباعة الوزارية A4 ─── */}
        <div className="hidden print:block border-b-2 border-gray-900 pb-3 mb-6">
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-gray-800">الجمهورية الجزائرية الديمقراطية الشعبية</p>
            <p className="text-xs font-bold text-gray-800">
              وزارة التربية الوطنية — مديرية التربية لولاية {printWilaya}
            </p>
            <h1 className="text-base sm:text-lg font-black text-gray-900 pt-0.5">
              الدفتر اليومي البيداغوجي لـلأستـاذ (CAHIER JOURNAL PÉDAGOGIQUE)
            </h1>
            <p className="text-xs font-semibold text-gray-700">
              مادة: <span className="font-black">{printSubject}</span> • الموسم الدراسي: {getCurrentAcademicYear()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-gray-800 border-t border-gray-400 pt-1.5">
            <div>
              <span>المؤسسة: </span>
              <strong className="text-black">{printSchoolName}</strong>
            </div>
            <div className="text-left">
              <span>الأستاذ(ة): </span>
              <strong className="text-black">{printTeacherName}</strong>
            </div>
          </div>
        </div>

        {/* ─── شريط المسار وأزرار العمليات العلوية ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <Link href="/admin" className="hover:text-gray-900 transition flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              لوحة الأستاذ
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-black">الدفتر اليومي البيداغوجي</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleDownloadLandscapePDF(false)}
              type="button"
              className="px-4 py-1.5 rounded-xl border border-emerald-600 bg-emerald-700 hover:bg-emerald-800 text-xs font-black text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="حفظ وتصدير الدفتر اليومي معبأ بالحصص كملف PDF أفقي رسمي (A4 Landscape)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>حفظ PDF (معبأ) 📄</span>
            </button>

            <button
              onClick={() => handleDownloadLandscapePDF(true)}
              type="button"
              className="px-3.5 py-1.5 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/80 hover:bg-emerald-100 text-xs font-black text-emerald-800 transition shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="حفظ وتصدير نموذج الدفتر اليومي فارغ مهيأ للتدوين اليدوي بالقلم"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>✍️ نموذج فارغ للتدوين</span>
            </button>
            <Link
              href="/admin/diary/weekly"
              className="px-3.5 py-1.5 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-xs font-black text-sky-800 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="المخطط الأسبوعي للدفتر اليومي — رؤية أسبوع كامل وطباعة المخطط الأسبوعي"
            >
              <CalendarDays className="w-3.5 h-3.5 text-sky-600" />
              <span>المخطط الأسبوعي 🖨️</span>
            </Link>
            <Link
              href="/admin/cahier-textes"
              className="px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-black text-indigo-800 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="الانتقال إلى دفتر النصوص الميداني للأفواج وتوثيق سيرورة الحصص والواجبات"
            >
              <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
              <span>دفتر النصوص الميداني 📖</span>
            </Link>
            <button
              onClick={() => handlePrepareForDate(tomorrowStr)}
              type="button"
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تحضير حصة جديدة 📝</span>
            </button>
          </div>
        </div>

        {/* ─── دليل الصفحة البيداغوجي (خاص بالأستاذ والمفتش والإدارة فقط) ─── */}
        <div className="print:hidden">
          <PageExplainer
            pageId="diary"
            title="الدفتر اليومي البيداغوجي (وثيقة خاصة بالأستاذ والمفتش والإدارة فقط)"
            teacherRoleExplanation="وثيقة التخطيط المكتبي المسبق ومسودة عمل الأستاذ اليومية، يعدها الأستاذ قبل لقاء تلاميذه لتدوين سيرورة الحصة والموارد والملاحظات، وتعتمد رسمياً لدى السيد مفتش المادة والسيد مدير المؤسسة."
            inspectorExplanation="سجل رسمي مطابق للتدرج السنوي والمعايير التفتيشية المعتمدة بمديرية التربية لولاية الوادي لمعاينة وتيرة إنجاز البرنامج ودفتر النصوص الموثق."
          />
        </div>

        {/* ─── تنبيهات النجاح أو الخطأ ─── */}
        {message && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in duration-200 print:hidden ${
              message.type === "ok"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {message.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* ─── شريط الترويسة والإحصائيات السريعة ─── */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e8e8e0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 px-3 py-0.5 rounded-full text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>وثيقة بيداغوجية داخلية رسمية للأستاذ والمفتشية</span>
            </div>
            <h1 className="text-xl font-black text-gray-900">
              الدفتر اليومي وسيرورة التعلمات
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              تخطيط الحصص القادمة، واحتساب التوقيت التلقائي للحصص المتتالية، وتوثيق العطل والغيابات الرسمية.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handlePrepareForDate(tomorrowStr)}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تحضير حصة الغد</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenSpecialDayModal(tomorrowStr)}
              className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-black text-amber-900 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Palmtree className="w-3.5 h-3.5 text-amber-700" />
              <span>تعيين عطلة الخريف / غياب 🏖️</span>
            </button>
          </div>
        </div>

        {/* ─── استمارة التحضير الذكية والمبسطة ─── */}
        <div ref={formRef} className="bg-white rounded-3xl border border-[#e8e8e0] shadow-sm overflow-hidden print:hidden transition-all duration-300">
          <div
            onClick={() => setIsFormExpanded(!isFormExpanded)}
            className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition select-none border-b border-[#e8e8e0]"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm ${
                  editingEntry ? "bg-amber-100 text-amber-800" : "bg-[#e6f4ee] text-[#107a57]"
                }`}
              >
                {editingEntry ? <Pencil className="w-4 h-4" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                  <span>{editingEntry ? "تعديل الحصة الحالية" : "إضافة وتدوين حصة جديدة في الدفتر"}</span>
                  {editingEntry && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                      قيد التعديل
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-gray-500 font-medium">
                  التوقيت والميدان والمقطع ورقم المذكرة تتحدد تلقائياً وذكياً بناءً على تدرج حصصك
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 hidden sm:inline">
                {isFormExpanded ? "إخفاء الاستمارة" : "فتح الاستمارة وكتابة الحصة"}
              </span>
              <div className="p-1 rounded-xl bg-gray-100 text-gray-500">
                {isFormExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>

          {isFormExpanded && (
            <form onSubmit={handleSubmitEntry} className="p-5 sm:p-6 space-y-5">
              {/* ─── شريط استرجاع وتكرار درس سابق بنقرة واحدة (للأفواج المتوازية مثل 1م1، 1م2، 1م3) ─── */}
              {previousLessons.length > 0 && !editingEntry && (
                <div className="p-3.5 rounded-2xl bg-[#f0f9f4] border border-[#107a57]/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#107a57] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[#107a57] flex items-center gap-1.5">
                        <span>⚡ استرجاع وتكرار درس سابق لفوج آخر</span>
                        <span className="text-[10px] font-bold bg-[#107a57]/15 text-[#107a57] px-2 py-0.2 rounded-full">
                          توفير الوقت
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-600 font-medium">
                        أعددت الدرس لفوج وتريد تطبيقه على فوج ثانٍ؟ اختره لتعبئة المورد والسيرورة فوراً دون إعادة كتابتها!
                      </p>
                    </div>
                  </div>

                  <div className="md:w-80 shrink-0">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const selected = previousLessons.find((l) => l.title === e.target.value);
                        if (selected) {
                          handleApplyPreviousLesson(selected);
                          e.target.value = "";
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border-2 border-[#107a57]/40 text-xs font-black text-gray-900 focus:outline-none focus:border-[#107a57] shadow-2xs cursor-pointer"
                    >
                      <option value="" disabled>
                        -- ⚡ اختر درساً سابقاً لتعبئته بنقرة واحدة --
                      </option>
                      {previousLessons.map((l, i) => (
                        <option key={i} value={l.title}>
                          {l.title} ({l.field})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* السطر الأول: التاريخ، الفوج، التوقيت، ورقم المذكرة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. التاريخ */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>تاريخ الحصة:</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => {
                      const newD = e.target.value;
                      setFormDate(newD);
                      // تحديث التوقيت تلقائياً حسب الحصص المسجلة في ذلك اليوم
                      const currentOnDate = entries.filter((en) => en.date === newD);
                      setFormPeriodTime(getNextPeriodTime(currentOnDate));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                    required
                  />
                  <div className="text-[10px] text-gray-500 font-bold px-1">
                    <span>يوم {calculatedDayName}</span>
                  </div>
                </div>

                {/* 2. الفوج */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span>الفوج:</span>
                  </label>
                  {!isCustomClassInput ? (
                    <select
                      value={formClass}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setIsCustomClassInput(true);
                          setCustomClassName("");
                        } else {
                          handleClassChange(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                    >
                      {customClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          فوج {cls}
                        </option>
                      ))}
                      <option value="__custom__">+ قسم آخر...</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={customClassName}
                        onChange={(e) => setCustomClassName(e.target.value)}
                        placeholder="مثال: 1م3"
                        className="flex-1 px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomClassInput(false);
                          setFormClass(customClasses[0] || "");
                        }}
                        className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400">يجلب الميدان والمقطع والمذكرة تلقائياً</p>
                </div>

                {/* 3. التوقيت الذكي */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>التوقيت (محسوب تلقائياً):</span>
                  </label>
                  {!isCustomTimeInput ? (
                    <select
                      value={formPeriodTime}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setIsCustomTimeInput(true);
                          setCustomTimeValue("");
                        } else {
                          setFormPeriodTime(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                    >
                      {STANDARD_PERIODS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value="__custom__">+ توقيت مخصص...</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={customTimeValue}
                        onChange={(e) => setCustomTimeValue(e.target.value)}
                        placeholder="08:30 - 09:30"
                        className="flex-1 px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomTimeInput(false);
                          setFormPeriodTime("08:00 - 09:00");
                        }}
                        className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-[#107a57] font-bold">يبدأ تلقائياً بعد انتهاء الحصة السابقة</p>
                </div>

                {/* 4. رقم المذكرة */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    <span>رقم المذكرة / الوثيقة:</span>
                  </label>
                  <input
                    type="text"
                    value={formNoteNumber}
                    onChange={(e) => setFormNoteNumber(e.target.value)}
                    placeholder="مذكرة رقم: 03"
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                  />
                  <p className="text-[10px] text-gray-400">تزيد تلقائياً مع كل حصة</p>
                </div>
              </div>

              {/* السطر الثاني: نوع الحصة، الميدان، والمقطع البيداغوجي */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* نوع الحصة */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    <span>نوع الحصة:</span>
                  </label>
                  <select
                    value={formSessionType}
                    onChange={(e) => setFormSessionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                  >
                    {SESSION_TYPES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* الميدان */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-gray-400" />
                    <span>الميدان:</span>
                  </label>
                  {!isCustomFieldInput ? (
                    <select
                      value={formField}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setIsCustomFieldInput(true);
                          setCustomFieldValue("");
                        } else {
                          setFormField(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                    >
                      {COMMON_FIELDS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                      <option value="أخرى / مراجعة">أخرى / مراجعة</option>
                      <option value="__custom__">+ كتابة ميدان آخر...</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={customFieldValue}
                        onChange={(e) => setCustomFieldValue(e.target.value)}
                        placeholder="مثال: القراءة، الفيزياء..."
                        className="flex-1 px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomFieldInput(false);
                          setFormField("أنشطة عددية");
                        }}
                        className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* المقطع التعلمي */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-gray-400" />
                    <span>المقطع التعلمي:</span>
                  </label>
                  <input
                    type="text"
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    placeholder="المقطع 01: العمليات على الأعداد الطبيعية والعشرية"
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                  />
                </div>
              </div>

              {/* السطر الثالث: المورد المعرفي والمفاهيم */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-900 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-[#107a57]" />
                    <span>المورد المعرفي (عنوان الدرس الرئيسي) <span className="text-red-500">*</span>:</span>
                  </label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={formLessonTitle}
                    onChange={(e) => setFormLessonTitle(e.target.value)}
                    placeholder="مثال: استعمال الكتابة العشرية (المورد 03)"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border-2 border-[#107a57]/40 text-xs sm:text-sm font-black text-gray-900 focus:outline-none focus:border-[#107a57]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 flex items-center gap-1">
                    <span>المفاهيم والمحتوى الأساسي المستهدف:</span>
                  </label>
                  <input
                    type="text"
                    value={formConcepts}
                    onChange={(e) => setFormConcepts(e.target.value)}
                    placeholder="مثال: تفكيك الأعداد العشرية والقراءة السليمة للأعشار"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                  />
                </div>
              </div>

              {/* ─── سيرورة ومراحل الحصة البيداغوجية ─── */}
              <div className="p-4 rounded-2xl bg-[#fafaf7] border border-[#e8e8e0] space-y-3">
                <div className="flex items-center justify-between border-b border-[#e8e8e0] pb-2">
                  <span className="text-xs font-black text-gray-900">سيرورة الحصة وسندات الكتاب المدرسي:</span>
                  <button
                    type="button"
                    onClick={handleAddCustomStage}
                    className="px-2.5 py-1 rounded-lg border border-dashed border-[#107a57] bg-white hover:bg-[#e6f4ee] text-[#107a57] text-[11px] font-black flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ إضافة مرحلة / عنوان مخصص</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formStages.map((stage, idx) => (
                    <div
                      key={stage.id || `stg_${idx}`}
                      className="p-2.5 rounded-xl bg-white border border-[#e8e8e0] flex flex-col sm:flex-row sm:items-center gap-2"
                    >
                      <div className="w-full sm:w-28 shrink-0">
                        <input
                          type="text"
                          value={stage.label}
                          onChange={(e) => handleUpdateStage(idx, { label: e.target.value })}
                          placeholder="المرحلة"
                          className="w-full px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs font-black text-gray-900 focus:outline-none focus:border-[#107a57]"
                        />
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={stage.content}
                          onChange={(e) => handleUpdateStage(idx, { content: e.target.value })}
                          placeholder={
                            stage.label.includes("تمهيدي")
                              ? "وضعية انطلاق سريعة ومكتسبات قبلية وتهيئة..."
                              : stage.label.includes("وسيطي")
                              ? "نشاط بناء التعلم ورقم الصفحة في الكتاب وصياغة المورد..."
                              : stage.label.includes("نهائي")
                              ? "تقويم تحصيلي فوري، تطبيق صفي وواجب منزلي..."
                              : "سيرورة وتفاصيل هذا المقطع..."
                          }
                          className="flex-1 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#107a57]"
                        />
                        {formStages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStage(idx)}
                            className="text-gray-400 hover:text-red-500 p-1"
                            title="حذف"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* الملاحظات البيداغوجية فقط (دون أي إعدادات أولياء) */}
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-700 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-gray-400" />
                  <span>الملاحظات البيداغوجية والتقويمية (اختياري للأستاذ):</span>
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="ملاحظات حول استجابة التلاميذ، صعوبات المعالجة، أو توجيهات المفتشية..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-medium text-gray-900 focus:outline-none focus:border-[#107a57]"
                />
              </div>

              {/* أزرار الحفظ والعمليات */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8e8e0] pt-4">
                <div className="text-[11px] text-gray-500 font-bold">
                  <span>سيتم حفظ الحصة في دفتر: </span>
                  <span className="text-gray-900 font-black">{formDate} ({calculatedDayName})</span>
                </div>

                <div className="flex items-center gap-2">
                  {editingEntry ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleResetForm(formDate, formClass)}
                        className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                      >
                        إلغاء وضع التعديل
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>حفظ التعديلات</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleResetForm(formDate, formClass)}
                        className="px-3.5 py-2 rounded-xl border border-[#e8e8e0] text-xs font-bold text-gray-500 hover:bg-gray-100 transition cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>تفريغ الحقول</span>
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={handleSubmitAndRepeat}
                        className="px-4 py-2 rounded-xl bg-[#107a57]/10 hover:bg-[#107a57]/20 border border-[#107a57]/30 text-[#107a57] text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                        title="حفظ هذا الدرس للفوج الحالي، وتجهيز نفس محتوى الدرس مباشرة للفوج الموالي"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#107a57]" />
                        <span>حفظ وتكرار الدرس لفوج ثانٍ ⚡</span>
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary text-xs px-5 py-2 flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                        <span>حفظ الحصة في الدفتر اليومي 📒</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* ─── شريط الفلترة والأيام ─── */}
        <div className="space-y-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#e8e8e0]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-gray-500 ml-1">عرض:</span>
              <button
                type="button"
                onClick={() => setDateFilterTab("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  dateFilterTab === "all" ? "bg-gray-900 text-white shadow-xs" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-[#e8e8e0]"
                }`}
              >
                جميع الأيام
              </button>
              <button
                type="button"
                onClick={() => setDateFilterTab("tomorrow")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  dateFilterTab === "tomorrow" ? "bg-[#107a57] text-white shadow-xs" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-[#e8e8e0]"
                }`}
              >
                حصص الغد ({tomorrowLessons.length})
              </button>
              <button
                type="button"
                onClick={() => setDateFilterTab("today")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  dateFilterTab === "today" ? "bg-blue-600 text-white shadow-xs" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-[#e8e8e0]"
                }`}
              >
                حصص اليوم ({todayLessons.length})
              </button>
              <button
                type="button"
                onClick={() => setDateFilterTab("future")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  dateFilterTab === "future" ? "bg-purple-700 text-white shadow-xs" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-[#e8e8e0]"
                }`}
              >
                الأيام القادمة ✨
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">تاريخ محدد:</span>
              <input
                type="date"
                value={customFilterDate}
                onChange={(e) => {
                  setCustomFilterDate(e.target.value);
                  setDateFilterTab("custom");
                }}
                className="px-2.5 py-1 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800"
              />
            </div>
          </div>

          {/* تصفية الأفواج والبحث */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-gray-500 ml-1">تصفية الفوج:</span>
              <button
                type="button"
                onClick={() => setSelectedClassFilter("all")}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedClassFilter === "all" ? "bg-[#107a57] text-white" : "text-gray-600 bg-white border border-[#e8e8e0] hover:bg-gray-50"
                }`}
              >
                الكل
              </button>
              {customClasses.map((cls) => {
                const count = entries.filter((e) => e.className === cls).length;
                const classTheme = getClassColors(cls, customClasses, timetableSettings?.colorMode || "distinct", timetableSettings?.classColors);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClassFilter(cls)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      selectedClassFilter === cls
                        ? "bg-[#107a57] text-white shadow-xs"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-[#e8e8e0]"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: classTheme.hex }}></span>
                    <span>فوج {cls}</span>
                    <span className="text-[10px] font-mono opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في عنوان المورد، الميدان، أو المفاهيم..."
                className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-white border border-[#e8e8e0] text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#107a57]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── عرض الجداول اليومية النموذجية (مطابقة لملف PDF والصورة المرفقة) ─── */}
        <div className="space-y-8">
          {loading ? (
            <div className="py-20 text-center text-xs text-gray-500 space-y-2 bg-white rounded-3xl border border-[#e8e8e0]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#107a57]" />
              <p>جارٍ تحميل الدفتر اليومي...</p>
            </div>
          ) : groupedDays.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-500 space-y-3 bg-white rounded-3xl border border-[#e8e8e0]">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="font-bold text-gray-700">لا توجد حصص مسجلة تطابق التصفية الحالية</p>
              <button
                type="button"
                onClick={() => handlePrepareForDate(tomorrowStr)}
                className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تحضير حصة الغد الآن</span>
              </button>
            </div>
          ) : (
            groupedDays.map(({ dateStr, dayName, specialDay, entries: dayEntries, customTitle }) => {
              const isTomorrow = dateStr === tomorrowStr;
              const isToday = dateStr === todayStr;

              // في حال كان اليوم عطلة أو غياباً أو ندوة
              if (specialDay) {
                const conf = SPECIAL_DAY_CONFIGS[specialDay.type] || SPECIAL_DAY_CONFIGS.custom;
                return (
                  <div
                    key={`day_${dateStr}`}
                    className="bg-white rounded-3xl border border-[#e8e8e0] shadow-sm overflow-hidden break-inside-avoid"
                  >
                    <div className="bg-[#1e293b] text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap font-black text-xs sm:text-sm">
                        <span>📌 يوم {dayName}: {formatArabicFullDate(dateStr)} م</span>
                        <span className="text-gray-400 font-normal">—</span>
                        <span className="text-amber-300">{specialDay.title}</span>
                        {specialDay.endDate && (
                          <span className="text-[11px] text-gray-300 font-normal">
                            (إلى غاية: {formatArabicFullDate(specialDay.endDate)})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 print:hidden">
                        <button
                          type="button"
                          onClick={() => handleOpenSpecialDayModal(dateStr)}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>تعديل البيان</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSpecialDay(dateStr)}
                          className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>تحويل ليوم دراسي عادي</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-8 sm:p-12 text-center space-y-4 bg-gradient-to-b from-[#fafaf7] to-white">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black shadow-xs border bg-amber-50 text-amber-900 border-amber-300">
                        <span className="text-base">{conf.icon}</span>
                        <span>{conf.label}</span>
                        <span className="text-base">{conf.icon}</span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-black text-gray-900 max-w-xl mx-auto">
                        {specialDay.title}
                      </h3>

                      {specialDay.description && (
                        <p className="text-xs sm:text-sm text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed whitespace-pre-line border-t border-b border-gray-200 py-3">
                          {specialDay.description}
                        </p>
                      )}

                      <div className="text-[11px] text-gray-400 font-bold pt-2">
                        <span>سجل رسمي معتمد وموثق في الدفتر اليومي للأستاذ</span>
                      </div>
                    </div>
                  </div>
                );
              }

              // يوم دراسي عادي
              return (
                <div
                  key={`day_${dateStr}`}
                  className={`bg-white rounded-3xl border border-[#e8e8e0] shadow-sm overflow-hidden break-inside-avoid space-y-0 ${
                    dayEntries.length === 0 ? "print:hidden" : ""
                  }`}
                >
                  {/* شريط عنوان اليوم الرسمي */}
                  <div className="bg-[#1e293b] text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                        <span>📌</span>
                        <span>يوم {dayName}: {formatArabicFullDate(dateStr)} م</span>
                      </span>

                      <span className="text-gray-400 font-normal">—</span>

                      {editingDayTitleDate === dateStr ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={tempDayTitle}
                            onChange={(e) => setTempDayTitle(e.target.value)}
                            placeholder="مثال: متابعة الكتابة العشرية والضرب في قوى 10"
                            className="px-2 py-0.5 rounded-lg bg-slate-800 text-white text-xs border border-slate-600 focus:outline-none focus:border-amber-400"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveDayTitle(dateStr)}
                            className="p-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                          >
                            حفظ
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDayTitleDate(null)}
                            className="p-1 rounded bg-slate-700 text-gray-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDayTitleDate(dateStr);
                            setTempDayTitle(customTitle || "");
                          }}
                          className="text-xs sm:text-sm font-black text-sky-300 hover:text-white transition flex items-center gap-1 group cursor-pointer"
                          title="اضغط لتعديل عنوان هذا اليوم"
                        >
                          <span>{customTitle || "متابعة تدرج التعلمات وإنجاز الموارد"}</span>
                          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition text-amber-300" />
                        </button>
                      )}

                      <span className="text-[11px] font-black bg-white/10 text-white px-2.5 py-0.5 rounded-full border border-white/15">
                        {dayEntries.length} حصص مبرمجة
                      </span>

                      {isTomorrow && (
                        <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                          حصة الغد ✨
                        </span>
                      )}
                      {isToday && (
                        <span className="text-[10px] font-black bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30">
                          حصة اليوم 📅
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 print:hidden flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleSyncFromTimetable(dateStr)}
                        className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-black transition flex items-center gap-1 cursor-pointer border border-amber-400/30"
                        title="استيراد كل حصص هذا اليوم من جدول التوقيت الأسبوعي"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>استيراد من التوقيت ⚡</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrepareForDate(dateStr)}
                        className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="إضافة حصة جديدة في هذا اليوم"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة حصة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenSpecialDayModal(dateStr)}
                        className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="تعيين هذا اليوم كعطلة أو غياب"
                      >
                        <Palmtree className="w-3.5 h-3.5" />
                        <span>تعيين عطلة/غياب</span>
                      </button>
                    </div>
                  </div>

                  {/* جدول الحصص اليومي بالأعمدة الأربعة (المطابق للصورة المرفوعة والـ PDF) */}
                  {dayEntries.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                      <p>لا توجد حصص مسجلة في هذا اليوم بعد.</p>
                      <div className="flex items-center justify-center gap-2 pt-1 print:hidden">
                        <button
                          type="button"
                          onClick={() => handleSyncFromTimetable(dateStr)}
                          className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>استيراد حصص {dayName} من التوقيت الأسبوعي</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrepareForDate(dateStr)}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                        >
                          + تحضير حصة يدوياً
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-right text-xs">
                        <thead>
                          <tr className="bg-[#0f172a] text-white text-[11px] font-black border-b border-gray-300">
                            <th className="p-3 w-[18%] border-l border-slate-700 text-center">التوقيت والفوج</th>
                            <th className="p-3 w-[31%] border-l border-slate-700">الميدان والمورد (الدرس)</th>
                            <th className="p-3 w-[37%] border-l border-slate-700">سيرورة الحصة وسندات الكتاب المدرسي</th>
                            <th className="p-3 w-[14%] text-center">الملاحظات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {dayEntries.map((item, idx) => {
                            const classTheme = getClassColors(
                              item.className,
                              customClasses,
                              timetableSettings?.colorMode || "distinct",
                              timetableSettings?.classColors
                            );

                            return (
                              <tr
                                key={item.id}
                                className={`group hover:bg-[#fbfbf9] transition-colors duration-150 relative ${
                                  idx % 2 === 1 ? "bg-[#fafaf7]/50" : "bg-white"
                                }`}
                              >
                                {/* 1. التوقيت والفوج ورقم المذكرة */}
                                <td className="p-3.5 align-top border-l border-gray-200 text-center space-y-1.5">
                                  <div className="font-mono font-black text-xs sm:text-sm text-gray-900">
                                    {item.periodTime || "08:00 - 09:00"}
                                  </div>

                                  <div>
                                    <span
                                      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs"
                                      style={{
                                        backgroundColor: classTheme.hex,
                                        color: "#ffffff",
                                      }}
                                    >
                                      {item.className.includes("متوسط") ? item.className : `${item.className} متوسط`}
                                    </span>
                                  </div>

                                  {item.lessonNoteNumber && (
                                    <div className="text-[10px] font-bold text-gray-500 font-mono">
                                      {item.lessonNoteNumber}
                                    </div>
                                  )}
                                </td>

                                {/* 2. الميدان والمورد (الدرس) */}
                                <td className="p-3.5 align-top border-l border-gray-200 space-y-1.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#107a57] bg-[#e6f4ee] px-2 py-0.5 rounded-md border border-[#107a57]/20">
                                      <span>{item.field || "أنشطة عددية"}</span>
                                      <span>|</span>
                                      <span>{item.sessionType || "درس"}</span>
                                    </span>
                                  </div>

                                  <div className="text-xs sm:text-sm font-black text-gray-900 leading-snug">
                                    {item.lessonTitle}
                                  </div>

                                  {item.concepts && (
                                    <div className="text-[11px] text-gray-600 font-medium leading-relaxed">
                                      {item.concepts}
                                    </div>
                                  )}

                                  {item.section && (
                                    <div className="text-[10px] font-bold text-gray-400">
                                      {item.section}
                                    </div>
                                  )}
                                </td>

                                {/* 3. سيرورة الحصة وسندات الكتاب المدرسي */}
                                <td className="p-3.5 align-top border-l border-gray-200 space-y-2">
                                  {item.stages && item.stages.length > 0 ? (
                                    item.stages.map((stg, sIdx) => {
                                      let badgeStyle = "bg-sky-100 text-sky-800 border-sky-300";
                                      if (stg.label.includes("وسيطي") || stg.label.includes("بناء")) {
                                        badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-300";
                                      } else if (stg.label.includes("نهائي") || stg.label.includes("تقويم")) {
                                        badgeStyle = "bg-amber-100 text-amber-800 border-amber-300";
                                      } else if (stg.color === "purple") {
                                        badgeStyle = "bg-purple-100 text-purple-800 border-purple-300";
                                      }

                                      return (
                                        <div key={sIdx} className="flex items-start gap-2 text-xs">
                                          <span
                                            className={`shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded border ${badgeStyle}`}
                                          >
                                            {stg.label ? `${stg.label}:` : "مرحلة:"}
                                          </span>
                                          <div className="flex-1 text-[11px] text-gray-700 leading-relaxed font-medium">
                                            {stg.content ? (
                                              stg.content
                                            ) : (
                                              <span className="text-gray-300 tracking-wider font-mono">
                                                ....................................................................................
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="flex items-start gap-2">
                                        <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-300">
                                          تمهيدي:
                                        </span>
                                        <span className="text-gray-300 tracking-wider font-mono text-xs flex-1">
                                          ....................................................................................
                                        </span>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                          وسيطي:
                                        </span>
                                        <span className="text-gray-300 tracking-wider font-mono text-xs flex-1">
                                          ....................................................................................
                                        </span>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                          نهائي:
                                        </span>
                                        <span className="text-gray-300 tracking-wider font-mono text-xs flex-1">
                                          ....................................................................................
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </td>

                                {/* 4. الملاحظات */}
                                <td className="p-3.5 align-top text-xs space-y-1">
                                  {item.notes ? (
                                    <div className="text-[11px] text-gray-700 font-medium whitespace-pre-line leading-relaxed">
                                      {item.notes}
                                    </div>
                                  ) : (
                                    <div className="text-gray-300 tracking-wider font-mono text-[11px] space-y-1">
                                      <div>........................</div>
                                      <div>........................</div>
                                      <div>........................</div>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-end gap-1.5 pt-2 opacity-0 group-hover:opacity-100 transition print:hidden flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateForAnotherClass(item)}
                                      className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-black transition cursor-pointer flex items-center gap-1 border border-emerald-200"
                                      title="تكرار وتدريس هذا الدرس لفوج آخر فوراً"
                                    >
                                      <Copy className="w-3 h-3 text-emerald-600" />
                                      <span>تكرار لفوج آخر</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(item)}
                                      className="p-1 rounded-lg bg-gray-100 hover:bg-amber-100 text-gray-600 hover:text-amber-800 text-[10px] font-bold transition cursor-pointer flex items-center gap-0.5"
                                      title="تعديل الحصة"
                                    >
                                      <Pencil className="w-3 h-3" />
                                      <span>تعديل</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEntry(item.id, item.lessonTitle)}
                                      className="p-1 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-700 text-[10px] transition cursor-pointer"
                                      title="حذف الحصة"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ─── تأشيرات الإدارة والمفتش في ذيل الصفحة المطبوعة A4 ─── */}
        <div className="hidden print:block pt-8 border-t-2 border-gray-900 break-inside-avoid">
          <div className="grid grid-cols-3 gap-4 text-xs text-center font-black">
            <div className="border border-gray-900 p-3 rounded-lg h-28 flex flex-col justify-between">
              <p>إمضاء الأستاذ(ة)</p>
              <p className="text-[10px] text-gray-700 font-bold">{printTeacherName}</p>
            </div>
            <div className="border border-gray-900 p-3 rounded-lg h-28 flex flex-col justify-between">
              <p>تأشيرة السيد مدير المؤسسة</p>
              <p className="text-[10px] text-gray-700 font-bold">{printPrincipalName}</p>
            </div>
            <div className="border border-gray-900 p-3 rounded-lg h-28 flex flex-col justify-between">
              <p>تأشيرة السيد مفتش التربية الوطنية</p>
              <p className="text-[10px] text-gray-700 font-bold">{printInspectorName}</p>
            </div>
          </div>
        </div>

        {/* ─── نافذة منبثقة: تعيين عطلة رسمية أو غياب مبرر أو ندوة تربوية ─── */}
        {isSpecialDayModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#e8e8e0] space-y-5 animate-in zoom-in-95 duration-200 text-right"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center">
                    <Palmtree className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">
                      تعيين يوم خاص في الدفتر اليومي
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      عطلة الخريف، عطل رسمية، غياب مبرر قانوناً، أو ندوة تكوينية
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSpecialDayModalOpen(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-black text-gray-700 block">نوع اليوم أو المناسبة:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(Object.keys(SPECIAL_DAY_CONFIGS) as SpecialDayType[]).map((tKey) => {
                      const cfg = SPECIAL_DAY_CONFIGS[tKey];
                      const isSelected = specialDayType === tKey;
                      return (
                        <button
                          key={tKey}
                          type="button"
                          onClick={() => {
                            setSpecialDayType(tKey);
                            setSpecialDayTitle(cfg.defaultTitle);
                            setSpecialDayDesc(cfg.defaultDesc);
                          }}
                          className={`p-3 rounded-2xl border text-right transition flex items-center gap-2 cursor-pointer ${
                            isSelected
                              ? "border-[#107a57] bg-[#e6f4ee] font-black text-[#107a57] shadow-xs"
                              : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <span className="text-base">{cfg.icon}</span>
                          <span className="text-[11px] leading-tight">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-black text-gray-700 block">تاريخ البداية (اليوم):</label>
                    <input
                      type="date"
                      value={specialDayTargetDate}
                      onChange={(e) => setSpecialDayTargetDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-black text-gray-700 block">إلى غاية تاريخ (اختياري للعطل):</label>
                    <input
                      type="date"
                      value={specialDayEndDate}
                      onChange={(e) => setSpecialDayEndDate(e.target.value)}
                      placeholder="اختياري"
                      className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-black text-gray-700 block">عنوان العطلة أو البيان:</label>
                  <input
                    type="text"
                    value={specialDayTitle}
                    onChange={(e) => setSpecialDayTitle(e.target.value)}
                    placeholder="مثال: عطلة الخريف 2026 أو طلب عطلة رسمية (غياب مبرر)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-black text-gray-900 focus:outline-none focus:border-[#107a57]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-black text-gray-700 block">التفاصيل والبيان البيداغوجي/الإداري:</label>
                  <textarea
                    rows={3}
                    value={specialDayDesc}
                    onChange={(e) => setSpecialDayDesc(e.target.value)}
                    placeholder="اكتب بيان العطلة أو توضيحات الإدارة والتفتيش..."
                    className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#107a57] leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                {getSpecialDayForDate(specialDayTargetDate) ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecialDay(specialDayTargetDate)}
                    className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition cursor-pointer"
                  >
                    حذف وإرجاع ليوم دراسي عادي
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSpecialDayModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSpecialDay}
                    disabled={saving}
                    className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>اعتماد وتثبيت في الدفتر 🏖️</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function TeacherDiaryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fafaf7] flex items-center justify-center p-8 text-center text-gray-500 font-sans" dir="rtl">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <p className="text-xs font-bold text-gray-600">جاري تحميل الدفتر اليومي...</p>
          </div>
        </div>
      }
    >
      <TeacherDiaryContent />
    </Suspense>
  );
}
