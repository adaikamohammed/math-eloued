"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
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
  Search,
  RotateCcw,
  Check,
  Layers,
  Zap,
  Tag,
  ShieldCheck,
  Sliders,
  Award,
} from "lucide-react";
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
  CahierTextesEntry,
  DailyDiaryEntry,
  LessonsData,
  COMMON_FIELDS,
  TimetableSettings,
  sortClasses,
  TeacherTimetable,
} from "@/lib/types";
import { getClassColors } from "@/app/admin/timetable/page";
import {
  printCahierTextesReport,
  downloadCahierTextesPDF,
} from "@/lib/cahierTextesPdfGenerator";
import {
  inferCahierTextesFromDiary,
  cleanPedagogicalTitle,
} from "@/lib/cahierTextesInference";

// أنواع حصص دفتر النصوص الرسمية
const CAHIER_SESSION_TYPES = [
  "درس ومورد",
  "أعمال موجهة (TD)",
  "تقويم تشخيصي",
  "إدماج جزئي",
  "إدماج كلي / نهائي",
  "معالجة بيداغوجية",
  "استدراك ودعم",
  "عرض حال وظيفة منزلية",
  "فرض محروس رسمي",
  "اختبار فصلي رسمي",
] as const;

// حساب اسم اليوم بالعربية
function getArabicDayName(dateStr: string): string {
  if (!dateStr) return "الأحد";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return "الأحد";
  const dateObj = new Date(year, month - 1, day);
  const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return days[dateObj.getDay()] || "الأحد";
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

// قائمة الأشهر المدرسية للموسم الدراسي
const SCHOOL_MONTHS = [
  { value: "2026-09", label: "سبتمبر 2026" },
  { value: "2026-10", label: "أكتوبر 2026" },
  { value: "2026-11", label: "نوفمبر 2026" },
  { value: "2026-12", label: "ديسمبر 2026" },
  { value: "2027-01", label: "جانفي 2027" },
  { value: "2027-02", label: "فيفري 2027" },
  { value: "2027-03", label: "مارس 2027" },
  { value: "2027-04", label: "أفريل 2027" },
  { value: "2027-05", label: "ماي 2027" },
  { value: "2027-06", label: "جوان 2027" },
];

// حساب بداية ونهاية أسبوع دراسي (من الأحد إلى الخميس)
function getSundayOfDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay(); // 0 is Sunday
    date.setDate(date.getDate() - day);
    const sy = date.getFullYear();
    const sm = String(date.getMonth() + 1).padStart(2, "0");
    const sd = String(date.getDate()).padStart(2, "0");
    return `${sy}-${sm}-${sd}`;
  } catch {
    return dateStr;
  }
}

function getThursdayOfDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    date.setDate(date.getDate() - day + 4);
    const ty = date.getFullYear();
    const tm = String(date.getMonth() + 1).padStart(2, "0");
    const td = String(date.getDate()).padStart(2, "0");
    return `${ty}-${tm}-${td}`;
  } catch {
    return dateStr;
  }
}

// دالة التحقق من تطابق أسماء الأفواج بمرونة تامة لمعالجة المسافات والأرقام والتسميات المختلفة
export function isSameClass(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const normalize = (str: string) =>
    str
      .trim()
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
      .replace(/فوج\s*/g, "")
      .replace(/قسم\s*/g, "")
      .replace(/متوسط/g, "م")
      .replace(/م\s*/g, "م")
      .replace(/[\s\-_/\\]/g, "")
      .toLowerCase();
  return normalize(a) === normalize(b);
}

// استخراج وتوحيد قائمة الأفواج من الإعدادات والدروس المسجلة ودفتر النصوص لضمان عدم إغفال أي فوج
export function extractAndUnifyClasses(
  customClasses?: string[],
  diaryEntries?: DailyDiaryEntry[],
  cahierEntries?: CahierTextesEntry[]
): string[] {
  const rawList: string[] = [
    ...(Array.isArray(customClasses) ? customClasses : []),
    ...(Array.isArray(diaryEntries) ? diaryEntries.map((d) => d.className) : []),
    ...(Array.isArray(cahierEntries) ? cahierEntries.map((c) => c.className) : []),
  ].filter(Boolean) as string[];

  const unified: string[] = [];
  for (const raw of rawList) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (!unified.some((u) => isSameClass(u, trimmed))) {
      unified.push(trimmed);
    }
  }

  return unified.length > 0 ? sortClasses(unified) : ["2م3", "1م1", "1م2", "1م3"];
}

export default function CahierDeTextesPage() {
  const { profile } = useProfile();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // البيانات
  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [activeClass, setActiveClass] = useState<string>("");
  const [diaryEntries, setDiaryEntries] = useState<DailyDiaryEntry[]>([]);
  const [cahierEntries, setCahierEntries] = useState<CahierTextesEntry[]>([]);
  const [timetable, setTimetable] = useState<TeacherTimetable | null>(null);
  const [timetableSettings, setTimetableSettings] = useState<TimetableSettings | null>(null);

  // تاريخ اليوم والغد
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // الفلاتر الفئوية والبحث (الافتراضي هو عرض الكل لعدم حجب أي حصة)
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"standard" | "td" | "all">("all");

  // الفلاتر الزمنية (شهر / أسبوع / يوم / كامل الموسم / مخصص)
  const [periodFilterType, setPeriodFilterType] = useState<"all" | "month" | "week" | "day" | "custom">("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => todayStr.slice(0, 7) || "2026-11");
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>(() => todayStr);
  const [selectedSingleDate, setSelectedSingleDate] = useState<string>(() => todayStr);
  const [customStartDate, setCustomStartDate] = useState<string>(() => todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(() => todayStr);

  const currentWeekStart = useMemo(() => getSundayOfDate(selectedWeekDate), [selectedWeekDate]);
  const currentWeekEnd = useMemo(() => getThursdayOfDate(selectedWeekDate), [selectedWeekDate]);

  // حالة استمارة الحصة
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CahierTextesEntry | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // حقول الاستمارة
  const [formDate, setFormDate] = useState<string>(todayStr);
  const [formPeriodTime, setFormPeriodTime] = useState("08:00 - 09:00");
  const [formSessionType, setFormSessionType] = useState<string>("درس ومورد");
  const [formField, setFormField] = useState<string>("أنشطة عددية");
  const [formSection, setFormSection] = useState("");
  const [formWeekLabel, setFormWeekLabel] = useState("");
  const [formResourceTitle, setFormResourceTitle] = useState("");
  const [formWarmup, setFormWarmup] = useState("");
  const [formProposedSituation, setFormProposedSituation] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formReinvestment, setFormReinvestment] = useState("");
  const [formHomework, setFormHomework] = useState("");
  const [formSignature, setFormSignature] = useState("");
  const [formIsTd, setFormIsTd] = useState(false);
  const [formSubgroup, setFormSubgroup] = useState("القسم كامل");
  const [formNotes, setFormNotes] = useState("");

  // بيانات الترويسة والبطاقة الرسمية
  const teacherFullName = timetableSettings?.teacherName || profile?.fullName || "الأستاذ(ة)";
  const teacherFamilyName = teacherFullName.trim().split(" ")[0] || "";
  const printSchoolName = timetableSettings?.schoolName || profile?.schoolCustomName || "المؤسسة التعليمية";
  const printInspectorName = timetableSettings?.inspectorName || "السيد مفتش المادة";
  const printPrincipalName = timetableSettings?.principalName || "السيد مدير المؤسسة";
  const printWilaya = timetableSettings?.wilayaName || "الوادي";
  const printSubject = timetableSettings?.subjectName || profile?.subject || "الرياضيات";

  // جلب البيانات
  useEffect(() => {
    const persisted = getPersistedTeacherSession();
    if (typeof window !== "undefined" && persisted?.id) {
      try {
        const storedClass = localStorage.getItem(`jusoor_last_active_cahier_class_${persisted.id}`);
        if (storedClass) setActiveClass(storedClass);
      } catch {}
    }

    setLoading(true);
    checkTeacherSession().then((auth) => {
      setAuthenticated(auth.authenticated);
      const teacherId = auth.profile?.id;
      if (teacherId) {
        setupAutoSync(teacherId, () => {
          setMessage({ type: "ok", text: "🟢 تم استعادة الاتصال ومزامنة دفتر النصوص تلقائياً مع السحابة!" });
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
            const sortedCls = extractAndUnifyClasses(
              active.customClasses,
              active.diaryEntries,
              active.cahierTextesEntries
            );

            setCustomClasses(sortedCls);
            setActiveClass((prev) => {
              if (prev && sortedCls.some((c) => isSameClass(c, prev))) {
                return sortedCls.find((c) => isSameClass(c, prev))!;
              }
              return sortedCls[0] || "1م1";
            });

            if (Array.isArray(active.diaryEntries)) {
              setDiaryEntries(active.diaryEntries);
            }

            if (Array.isArray(active.cahierTextesEntries)) {
              setCahierEntries(active.cahierTextesEntries);
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
              const sortedCls = extractAndUnifyClasses(
                offline.customClasses,
                offline.diaryEntries,
                offline.cahierTextesEntries
              );
              setCustomClasses(sortedCls);
              setActiveClass((prev) => {
                if (prev && sortedCls.some((c) => isSameClass(c, prev))) {
                  return sortedCls.find((c) => isSameClass(c, prev))!;
                }
                return sortedCls[0] || "1م1";
              });
              if (Array.isArray(offline.diaryEntries)) setDiaryEntries(offline.diaryEntries);
              if (Array.isArray(offline.cahierTextesEntries)) setCahierEntries(offline.cahierTextesEntries);
              if (offline.timetable) setTimetable(offline.timetable);
            }
          }
        })
        .finally(() => {
          setLoading(false);
        });
    });
  }, []);

  // تغيير الفوج النشط
  const handleSelectClass = (cls: string) => {
    setActiveClass(cls);
    const session = getPersistedTeacherSession();
    if (typeof window !== "undefined" && session?.id) {
      try {
        localStorage.setItem(`jusoor_last_active_cahier_class_${session.id}`, cls);
      } catch {}
    }
  };

  // حفظ التعديلات على الخادم مع دعم الحفظ المحلي للأوفلاين
  const persistChanges = async (payload: { cahierTextesEntries?: CahierTextesEntry[] }) => {
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
      setMessage({ type: "ok", text: "تم تحديث دفتر النصوص بنجاح 📖" });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({
        type: "ok",
        text: "⚡ تم حفظ دفتر النصوص محلياً في جهازك بأمان وسيُرفع تلقائياً عند عودة النت 📖",
      });
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  // تفريغ الاستمارة
  const handleResetForm = () => {
    setEditingEntry(null);
    setFormDate(todayStr);
    setFormPeriodTime("08:00 - 09:00");
    setFormSessionType("درس ومورد");
    setFormField("أنشطة عددية");
    setFormSection("");
    setFormWeekLabel("");
    setFormResourceTitle("");
    setFormWarmup("");
    setFormProposedSituation("");
    setFormSummary("");
    setFormReinvestment("");
    setFormHomework("");
    setFormSignature(`${teacherFamilyName} ✍`);
    setFormIsTd(false);
    setFormSubgroup("القسم كامل");
    setFormNotes("");
  };

  // فتح الاستمارة لتعديل حصة مسجلة
  const handleStartEdit = (entry: CahierTextesEntry) => {
    setEditingEntry(entry);
    setFormDate(entry.date);
    setFormPeriodTime(entry.periodTime || "08:00 - 09:00");
    setFormSessionType(entry.sessionType || "درس ومورد");
    setFormField(entry.field || "أنشطة عددية");
    setFormSection(entry.section || "");
    setFormWeekLabel(entry.weekLabel || "");
    setFormResourceTitle(entry.resourceTitle);
    setFormWarmup(entry.warmup || "");
    setFormProposedSituation(entry.proposedSituation || "");
    setFormSummary(entry.summary || "");
    setFormReinvestment(entry.reinvestment || "");
    setFormHomework(entry.homework || "");
    setFormSignature(entry.signature || `${teacherFamilyName} ✍`);
    setFormIsTd(!!entry.isTdOrRemediation);
    setFormSubgroup(entry.subgroup || "القسم كامل");
    setFormNotes(entry.notes || "");

    setIsFormExpanded(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  // حفظ الحصة (إضافة أو تعديل)
  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formResourceTitle.trim()) {
      alert("يرجى كتابة عنوان المورد / الحصة");
      return;
    }

    const dayName = getArabicDayName(formDate);

    let updated: CahierTextesEntry[];

    if (editingEntry) {
      const existsInCahier = cahierEntries.some(
        (c) => c.id === editingEntry.id || (editingEntry.diaryEntryId && c.diaryEntryId === editingEntry.diaryEntryId)
      );

      if (existsInCahier) {
        updated = cahierEntries.map((c) =>
          c.id === editingEntry.id || (editingEntry.diaryEntryId && c.diaryEntryId === editingEntry.diaryEntryId)
            ? {
                ...c,
                date: formDate,
                dayName,
                periodTime: formPeriodTime,
                sessionType: formSessionType,
                field: formField,
                section: formSection.trim() || undefined,
                weekLabel: formWeekLabel.trim() || undefined,
                resourceTitle: formResourceTitle.trim(),
                warmup: formWarmup.trim() || undefined,
                proposedSituation: formProposedSituation.trim() || undefined,
                summary: formSummary.trim() || undefined,
                reinvestment: formReinvestment.trim() || undefined,
                homework: formHomework.trim() || undefined,
                signature: formSignature.trim() || `${teacherFamilyName} ✍`,
                isTdOrRemediation: formIsTd,
                subgroup: formIsTd ? formSubgroup : undefined,
                notes: formNotes.trim() || undefined,
                updatedAt: new Date().toISOString(),
              }
            : c
        );
      } else {
        // الحصة كانت مستنتجة ذكياً والآن نثبتها كتدوين مخصص ومعدل
        const overrideEntry: CahierTextesEntry = {
          id: editingEntry.id.startsWith("cahier_inf_")
            ? `cahier_saved_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
            : editingEntry.id,
          diaryEntryId: editingEntry.diaryEntryId,
          className: activeClass,
          date: formDate,
          dayName,
          periodTime: formPeriodTime,
          sessionType: formSessionType,
          field: formField,
          section: formSection.trim() || undefined,
          weekLabel: formWeekLabel.trim() || undefined,
          resourceTitle: formResourceTitle.trim(),
          warmup: formWarmup.trim() || undefined,
          proposedSituation: formProposedSituation.trim() || undefined,
          summary: formSummary.trim() || undefined,
          reinvestment: formReinvestment.trim() || undefined,
          homework: formHomework.trim() || undefined,
          signature: formSignature.trim() || `${teacherFamilyName} ✍`,
          isTdOrRemediation: formIsTd,
          subgroup: formIsTd ? formSubgroup : undefined,
          notes: formNotes.trim() || undefined,
          createdAt: editingEntry.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updated = [overrideEntry, ...cahierEntries];
      }
    } else {
      const newEntry: CahierTextesEntry = {
        id: `cahier_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        className: activeClass,
        date: formDate,
        dayName,
        periodTime: formPeriodTime,
        sessionType: formSessionType,
        field: formField,
        section: formSection.trim() || undefined,
        weekLabel: formWeekLabel.trim() || undefined,
        resourceTitle: formResourceTitle.trim(),
        warmup: formWarmup.trim() || undefined,
        proposedSituation: formProposedSituation.trim() || undefined,
        summary: formSummary.trim() || undefined,
        reinvestment: formReinvestment.trim() || undefined,
        homework: formHomework.trim() || undefined,
        signature: formSignature.trim() || `${teacherFamilyName} ✍`,
        isTdOrRemediation: formIsTd,
        subgroup: formIsTd ? formSubgroup : undefined,
        notes: formNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      updated = [newEntry, ...cahierEntries];
    }

    setCahierEntries(updated);
    await persistChanges({ cahierTextesEntries: updated });
    handleResetForm();
    setIsFormExpanded(false);
  };

  // حذف حصة من دفتر النصوص
  const handleDeleteEntry = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف الحصة "${title}" من دفتر نصوص فوج ${activeClass}؟`)) return;
    const updated = cahierEntries.filter((c) => c.id !== id);
    setCahierEntries(updated);
    if (editingEntry?.id === id) handleResetForm();
    await persistChanges({ cahierTextesEntries: updated });
  };

  // إعادة الاستنتاج البيداغوجي الذكي لحصة تم تعديلها مسبقاً
  const handleResetToInferred = async (entry: CahierTextesEntry) => {
    if (!confirm(`هل تريد استعادة الصياغة البيداغوجية الذكية لهذه الحصة من الدفتر اليومي؟`)) return;
    const updated = cahierEntries.filter(
      (c) => c.id !== entry.id && (!entry.diaryEntryId || c.diaryEntryId !== entry.diaryEntryId)
    );
    setCahierEntries(updated);
    if (editingEntry?.id === entry.id) handleResetForm();
    await persistChanges({ cahierTextesEntries: updated });
    setMessage({
      type: "ok",
      text: "تمت استعادة الصياغة البيداغوجية الذكية للحصة بنجاح ⚡",
    });
  };

  // تثبيت وحفظ جميع التدوينات الذكية الحالية لهذا الفوج في قاعدة البيانات
  const handleSaveAllInferred = async (inferredList: CahierTextesEntry[]) => {
    if (inferredList.length === 0) {
      alert(`كافة حصص فوج (${activeClass}) مثبتة ومحفوظة مسبقاً في دفتر النصوص.`);
      return;
    }
    const cleanEntries: CahierTextesEntry[] = inferredList.map((entry) => {
      const { ...clean } = entry;
      return {
        ...clean,
        id: entry.id.startsWith("cahier_inf_")
          ? `cahier_saved_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
          : entry.id,
      };
    });
    const updated = [...cleanEntries, ...cahierEntries];
    setCahierEntries(updated);
    await persistChanges({ cahierTextesEntries: updated });
    setMessage({
      type: "ok",
      text: `تم تثبيت وحفظ (${cleanEntries.length}) حصة مستنتجة بذكاء في دفتر نصوص فوج ${activeClass}! 💾`,
    });
  };

  // ⚡ استيراد الحصص تلقائياً من الدفتر اليومي للفوج النشط
  const handleSyncFromDiary = async () => {
    const classDiaryLessons = diaryEntries.filter((d) => isSameClass(d.className, activeClass));

    if (classDiaryLessons.length === 0) {
      alert(`لم يتم العثور على حصص مسجلة لفوج (${activeClass}) في الدفتر اليومي.`);
      return;
    }

    const existingDiaryIds = new Set(
      cahierEntries.filter((c) => isSameClass(c.className, activeClass) && c.diaryEntryId).map((c) => c.diaryEntryId)
    );

    const newToImport = classDiaryLessons.filter((d) => !existingDiaryIds.has(d.id));

    if (newToImport.length === 0) {
      alert(`كافة حصص فوج (${activeClass}) المسجلة في الدفتر اليومي (${classDiaryLessons.length} حصة) مستوردة ومتاحة مسبقاً في دفتر النصوص.`);
      return;
    }

    if (
      !confirm(
        `تم العثور على (${newToImport.length}) حصة جديدة لفوج ${activeClass} في الدفتر اليومي. هل تريد استيرادها وتحويلها إلى تدوينات ميدانية لدفتر النصوص؟`
      )
    ) {
      return;
    }

    const importedEntries: CahierTextesEntry[] = newToImport.map((d) => {
      const inferred = inferCahierTextesFromDiary(d, teacherFamilyName);
      return {
        ...inferred,
        id: `cahier_sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        diaryEntryId: d.id,
        className: activeClass,
      };
    });

    const updated = [...importedEntries, ...cahierEntries];
    setCahierEntries(updated);
    await persistChanges({ cahierTextesEntries: updated });
    setMessage({
      type: "ok",
      text: `تم استيراد ${importedEntries.length} حصة بنجاح من الدفتر اليومي! يمكنك الآن تعديل أي بيان تريده 📖`,
    });
  };

  // حساب إجمالي عدد الحصص المسجلة لكل فوج (حصص الدفتر اليومي + تدوينات دفتر النصوص المستقلة)
  const classSessionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cls of customClasses) {
      const classDiary = diaryEntries.filter((d) => isSameClass(d.className, cls));
      const diaryDateTimes = new Set(classDiary.map((d) => `${d.date}_${d.periodTime || ""}`.trim()));
      const diaryIds = new Set(classDiary.map((d) => d.id));

      const standalone = cahierEntries.filter(
        (c) =>
          isSameClass(c.className, cls) &&
          (!c.diaryEntryId || !diaryIds.has(c.diaryEntryId)) &&
          !diaryDateTimes.has(`${c.date}_${c.periodTime || ""}`.trim())
      );
      counts[cls] = classDiary.length + standalone.length;
    }
    return counts;
  }, [customClasses, diaryEntries, cahierEntries]);

  // كافة حصص الفوج النشط المستدعاة من الدفتر اليومي ودفتر النصوص طيلة الموسم الدراسي
  const allActiveClassEntries = useMemo(() => {
    const classDiaryLessons = diaryEntries.filter((d) => isSameClass(d.className, activeClass));

    // فهرسة التدوينات المحفوظة مسبقاً بهذا القسم حسب diaryEntryId وحسب (التاريخ + التوقيت)
    const savedByDiaryId = new Map<string, CahierTextesEntry>();
    const savedByDateTime = new Map<string, CahierTextesEntry>();
    const standaloneEntries: CahierTextesEntry[] = [];

    for (const c of cahierEntries) {
      if (!isSameClass(c.className, activeClass)) continue;
      if (c.diaryEntryId) {
        savedByDiaryId.set(c.diaryEntryId, c);
      } else {
        const key = `${c.date}_${c.periodTime || ""}`.trim();
        savedByDateTime.set(key, c);
        standaloneEntries.push(c);
      }
    }

    const result: (CahierTextesEntry & { isInferred?: boolean; isSavedOverride?: boolean })[] = [];
    const matchedStandaloneIds = new Set<string>();

    for (const d of classDiaryLessons) {
      if (savedByDiaryId.has(d.id)) {
        result.push({ ...savedByDiaryId.get(d.id)!, isSavedOverride: true });
        continue;
      }
      const key = `${d.date}_${d.periodTime || ""}`.trim();
      if (savedByDateTime.has(key)) {
        const matched = savedByDateTime.get(key)!;
        matchedStandaloneIds.add(matched.id);
        result.push({ ...matched, diaryEntryId: d.id, isSavedOverride: true });
        continue;
      }
      // استنتاج بيداغوجي ذكي تلقائي مطابق لسجل الأستاذ محمد عدايكة
      const inferred = inferCahierTextesFromDiary(d, teacherFamilyName);
      result.push({ ...inferred, isInferred: true });
    }

    // إضافة التدوينات المستقلة التي تم إدخالها يدوياً بدون تطابق في الدفتر اليومي
    for (const s of standaloneEntries) {
      if (!matchedStandaloneIds.has(s.id)) {
        result.push(s);
      }
    }

    // فرز الحصص تصاعدياً حسب التاريخ ثم التوقيت
    result.sort((a, b) => {
      const cmpDate = (a.date || "").localeCompare(b.date || "");
      if (cmpDate !== 0) return cmpDate;
      return (a.periodTime || "").localeCompare(b.periodTime || "");
    });

    return result;
  }, [cahierEntries, diaryEntries, activeClass, teacherFamilyName]);

  // إحصائيات أنواع حصص الفوج النشط (العادية / أعمال موجهة واستدراك / الكل)
  const activeClassCounts = useMemo(() => {
    const total = allActiveClassEntries.length;
    const td = allActiveClassEntries.filter((c) => !!c.isTdOrRemediation).length;
    const standard = total - td;
    return { total, standard, td };
  }, [allActiveClassEntries]);

  // الأشهر المتاحة للاختيار مع تضمين أي شهر وردت فيه حصص مسجلة
  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, string>();
    for (const sm of SCHOOL_MONTHS) {
      monthsMap.set(sm.value, sm.label);
    }
    for (const entry of allActiveClassEntries) {
      if (entry.date && entry.date.length >= 7) {
        const ym = entry.date.slice(0, 7);
        if (!monthsMap.has(ym)) {
          const [y, m] = ym.split("-");
          const monthNames = [
            "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
            "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
          ];
          const mIdx = parseInt(m, 10) - 1;
          const label = `${monthNames[mIdx] || m} ${y}`;
          monthsMap.set(ym, label);
        }
      }
    }
    return Array.from(monthsMap.entries()).map(([value, label]) => ({ value, label }));
  }, [allActiveClassEntries]);

  // الحصص المعروضة بعد تطبيق فلاتر الفترة ونوع الحصة والبحث
  const currentClassEntries = useMemo(() => {
    let filtered = allActiveClassEntries;

    // تطبيق فلتر النطاق الزمني (شهر / أسبوع / يوم / كامل الموسم / مخصص)
    if (periodFilterType === "month") {
      filtered = filtered.filter((c) => (c.date || "").startsWith(selectedMonth));
    } else if (periodFilterType === "week") {
      filtered = filtered.filter((c) => (c.date || "") >= currentWeekStart && (c.date || "") <= currentWeekEnd);
    } else if (periodFilterType === "day") {
      filtered = filtered.filter((c) => c.date === selectedSingleDate);
    } else if (periodFilterType === "custom") {
      filtered = filtered.filter((c) => (c.date || "") >= customStartDate && (c.date || "") <= customEndDate);
    }

    // تطبيق فلتر نوع الحصة (عادية / أعمال موجهة واستدراك / الكل)
    if (activeTab === "standard") {
      filtered = filtered.filter((c) => !c.isTdOrRemediation);
    } else if (activeTab === "td") {
      filtered = filtered.filter((c) => !!c.isTdOrRemediation);
    }

    // تطبيق البحث النصي
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.resourceTitle || "").toLowerCase().includes(q) ||
          (c.field || "").toLowerCase().includes(q) ||
          (c.section || "").toLowerCase().includes(q) ||
          (c.summary || "").toLowerCase().includes(q) ||
          (c.homework || "").toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [
    allActiveClassEntries,
    periodFilterType,
    selectedMonth,
    currentWeekStart,
    currentWeekEnd,
    selectedSingleDate,
    customStartDate,
    customEndDate,
    activeTab,
    searchQuery,
  ]);

  // تسمية الفترة النشطة لعرضها في الرأس وملف الـ PDF
  const activePeriodLabel = useMemo(() => {
    if (periodFilterType === "month") {
      const mObj = SCHOOL_MONTHS.find((m) => m.value === selectedMonth);
      return mObj ? `شهر ${mObj.label}` : `شهر ${selectedMonth}`;
    }
    if (periodFilterType === "week") {
      return `الأسبوع من ${formatArabicFullDate(currentWeekStart)} إلى ${formatArabicFullDate(currentWeekEnd)}`;
    }
    if (periodFilterType === "day") {
      return `يوم ${getArabicDayName(selectedSingleDate)} ${formatArabicFullDate(selectedSingleDate)}`;
    }
    if (periodFilterType === "custom") {
      return `الفترة من ${formatArabicFullDate(customStartDate)} إلى ${formatArabicFullDate(customEndDate)}`;
    }
    return "كامل الموسم الدراسي 2026 / 2027";
  }, [periodFilterType, selectedMonth, currentWeekStart, currentWeekEnd, selectedSingleDate, customStartDate, customEndDate]);

  // تشغيل تنزيل الـ PDF الأفقي للفترة المحددة
  const handleDownloadPDF = () => {
    downloadCahierTextesPDF({
      teacherName: teacherFullName,
      schoolName: printSchoolName,
      inspectorName: printInspectorName,
      principalName: printPrincipalName,
      wilayaName: printWilaya,
      subjectName: printSubject,
      className: activeClass,
      timetableSlots: timetable?.slots || [],
      entries: currentClassEntries,
      periodLabel: activePeriodLabel,
    });
  };

  if (authenticated === false) {
    return <LoginRequired next="/admin/cahier-textes" title="دفتر النصوص الميداني" />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] py-6 sm:py-8 px-3 sm:px-6 font-sans text-right" dir="rtl">
      {/* فرض التوجيه الأفقي A4 Landscape للطباعة */}
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
        {/* ─── شريط المسار وأزرار العمليات العلوية ─── */}
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
            <span className="text-gray-900 font-black">دفتر النصوص الميداني (Cahier de Textes)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadPDF}
              type="button"
              className="px-4 py-1.5 rounded-xl border border-emerald-600 bg-emerald-700 hover:bg-emerald-800 text-xs font-black text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="حفظ وتصدير دفتر نصوص الفوج كملف PDF رسمي (A4 Landscape) للفترة المحددة"
            >
              <Download className="w-3.5 h-3.5" />
              <span>حفظ PDF أفقياً 📄</span>
            </button>
            <Link
              href="/admin/diary"
              className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 transition flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>الدفتر اليومي 📒</span>
            </Link>
          </div>
        </div>

        {/* ─── دليل الصفحة البيداغوجي ─── */}
        <div className="print:hidden">
          <PageExplainer
            pageId="cahier-textes"
            title="سجل التدوين الميداني في دفتر النصوص (Cahier de Textes de la classe)"
            teacherRoleExplanation="وثيقة قانونية ورسمية خاصة بكل قسم على حدة، توثق ما تم إنجازه فعلياً في القسم مع الواجبات والتمارين، وتعتمد لدى السيد مفتش التربية الوطنية والسيد مدير المؤسسة."
            inspectorExplanation="سجل رسمي مطابق للتدرج السنوي والمعايير التفتيشية المعتمدة بمديرية التربية لولاية الوادي لمتابعة وتيرة إنجاز البرنامج البيداغوجي في كل فوج."
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

        {/* ─── بطاقة الترويسة وبطاقة القسم الرسمية ─── */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e8e8e0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 px-3 py-0.5 rounded-full text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>وثيقة التدوين الميداني في دفتر نصوص القسم — معتمدة رسمياً</span>
            </div>
            <h1 className="text-xl font-black text-gray-900">
              دفتر نصوص قسم: <span className="text-[#107a57]">{activeClass}</span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              يستدعي دروس الدفتر اليومي تلقائياً مع إمكانية التعديل الحر وكتابة الملاحظات والواجبات وتوليد الـ PDF الأفقي.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {currentClassEntries.some((c: any) => c.isInferred) && (
              <button
                type="button"
                onClick={() => handleSaveAllInferred(currentClassEntries.filter((c: any) => (c as any).isInferred))}
                disabled={saving}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
                title="تثبيت وحفظ كافة التدوينات المستنتجة بذكاء في دفتر النصوص"
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>تثبيت التدوينات الذكية 💾</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSyncFromDiary}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
              title="جلب وتحديث كافة حصص هذا الفوج المسجلة في الدفتر اليومي"
            >
              <Zap className="w-4 h-4 text-amber-600" />
              <span>استيراد من الدفتر اليومي ⚡</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleResetForm();
                setIsFormExpanded(true);
                setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
              }}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تدوين حصة جديدة 📝</span>
            </button>
          </div>
        </div>

        {/* ─── محدد الأفواج التربوية (Tabs) ─── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
          <span className="text-xs font-black text-gray-500 ml-1 shrink-0">اختر الفوج:</span>
          {customClasses.map((cls) => {
            const isSelected = isSameClass(cls, activeClass);
            const count = classSessionCounts[cls] ?? 0;
            const classTheme = getClassColors(cls, customClasses, timetableSettings?.colorMode || "distinct", timetableSettings?.classColors);

            return (
              <button
                key={cls}
                type="button"
                onClick={() => handleSelectClass(cls)}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition flex items-center gap-2 cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-[#107a57] text-white shadow-sm"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-[#e8e8e0]"
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: isSelected ? "#ffffff" : classTheme.hex }}
                ></span>
                <span>فوج {cls}</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    isSelected ? "bg-white/20 text-white font-black" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {count} حصة
                </span>
              </button>
            );
          })}
        </div>

        {/* ─── استمارة تدوين أو تعديل حصة في دفتر النصوص ─── */}
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
                  <span>{editingEntry ? `تعديل الحصة في دفتر نصوص (${activeClass})` : `تدوين حصة جديدة في دفتر نصوص (${activeClass})`}</span>
                  {editingEntry && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                      قيد التعديل
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-gray-500 font-medium">
                  التهيئة، الوضعية المقترحة، الحوصلة، إعادة الاستثمار، والواجب المنزلي
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
            <form onSubmit={handleSubmitEntry} className="p-5 sm:p-6 space-y-4">
              {/* السطر الأول: التاريخ، التوقيت، نوع الحصة، والميدان */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>تاريخ الحصة:</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                    required
                  />
                  <span className="text-[10px] text-gray-500 font-bold px-1">يوم {getArabicDayName(formDate)}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>التوقيت:</span>
                  </label>
                  <input
                    type="text"
                    value={formPeriodTime}
                    onChange={(e) => setFormPeriodTime(e.target.value)}
                    placeholder="11:00 - 12:00"
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                  />
                </div>

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
                    {CAHIER_SESSION_TYPES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-gray-400" />
                    <span>الميدان:</span>
                  </label>
                  <select
                    value={formField}
                    onChange={(e) => setFormField(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                  >
                    {COMMON_FIELDS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                    <option value="أخرى / مراجعة">أخرى / مراجعة</option>
                  </select>
                </div>
              </div>

              {/* السطر الثاني: المقطع، الأسبوع، وعنوان المورد */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700">المقطع التعلمي:</label>
                  <input
                    type="text"
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    placeholder="مثال: المقطع 01: الأعداد الطبيعية والعشرية"
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700">عنوان الأسبوع (اختياري للترويسة):</label>
                  <input
                    type="text"
                    value={formWeekLabel}
                    onChange={(e) => setFormWeekLabel(e.target.value)}
                    placeholder="مثال: الأسبوع 02: العمليات على الكسور (04 - 08 أكتوبر)"
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#107a57]" />
                    <span>المورد المعرفي (عنوان الدرس في دفتر النصوص) *:</span>
                  </label>
                  <input
                    type="text"
                    value={formResourceTitle}
                    onChange={(e) => setFormResourceTitle(e.target.value)}
                    placeholder="مثال: المورد 01: إجراء سلسلة عمليات دون أقواس"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border-2 border-[#107a57]/40 text-xs sm:text-sm font-black text-gray-900 focus:outline-none focus:border-[#107a57]"
                    required
                  />
                </div>
              </div>

              {/* السطر الثالث: عناصر السيرورة الميدانية لدفتر النصوص */}
              <div className="p-4 rounded-2xl bg-[#fafaf7] border border-[#e8e8e0] space-y-3">
                <h4 className="text-xs font-black text-gray-900">
                  سير الحصة والعمل المنجز وسيرورة التعلم (التدوين الميداني):
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-sky-800">1. تهيئة / وضعية انطلاق:</label>
                    <textarea
                      rows={2}
                      value={formWarmup}
                      onChange={(e) => setFormWarmup(e.target.value)}
                      placeholder="تذكير بالمكتسبات القبلية، حساب مجاميع ذهنية، تهيئة حافزة..."
                      className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#107a57]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-emerald-800">2. وضعية مقترحة / نشاط بناء التعلم:</label>
                    <textarea
                      rows={2}
                      value={formProposedSituation}
                      onChange={(e) => setFormProposedSituation(e.target.value)}
                      placeholder="حساب عبارة A=25+4x3، مقارنة النتائج، استنتاج أولوية الضرب..."
                      className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#107a57]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-purple-800">3. الحوصلة (القاعدة أو القانون المستنتج):</label>
                    <textarea
                      rows={2}
                      value={formSummary}
                      onChange={(e) => setFormSummary(e.target.value)}
                      placeholder="في سلسلة عمليات بدون أقواس تعطى الأولوية للضرب والقسمة..."
                      className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#107a57]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-amber-800">4. إعادة الاستثمار (تطبيق صفي فوري):</label>
                    <textarea
                      rows={2}
                      value={formReinvestment}
                      onChange={(e) => setFormReinvestment(e.target.value)}
                      placeholder="حل تمرين صفي فردي: احسب العبارة B=30-5x4+12/3..."
                      className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#107a57]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-amber-900">5. الواجب المنزلي:</label>
                    <input
                      type="text"
                      value={formHomework}
                      onChange={(e) => setFormHomework(e.target.value)}
                      placeholder="مثال: تمرين 02 و 04 ص 14 بالكتاب المدرسي"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-950 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-700">6. الإمضاء المعتمد:</label>
                    <input
                      type="text"
                      value={formSignature}
                      onChange={(e) => setFormSignature(e.target.value)}
                      placeholder="الأستاذ ✍"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:border-[#107a57]"
                    />
                  </div>
                </div>

                {/* خيار إدراج الحصة في ملحق الأعمال الموجهة TD */}
                <div className="pt-2 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsTd}
                      onChange={(e) => setFormIsTd(e.target.checked)}
                      className="w-4 h-4 rounded text-[#107a57] focus:ring-[#107a57]"
                    />
                    <span className="text-xs font-black text-gray-800">
                      إدراج هذه الحصة في «ملحق الأعمال الموجهة (TD) والاستدراك»
                    </span>
                  </label>

                  {formIsTd && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500">الفوج المستهدف:</span>
                      <select
                        value={formSubgroup}
                        onChange={(e) => setFormSubgroup(e.target.value)}
                        className="px-2.5 py-1 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-800"
                      >
                        <option value="القسم كامل">القسم كامل</option>
                        <option value="فوج 01 (نصف القسم)">فوج 01 (نصف القسم)</option>
                        <option value="فوج 02 (نصف القسم)">فوج 02 (نصف القسم)</option>
                        <option value="فئة الاستدراك (15 تلميذاً)">فئة الاستدراك (15 تلميذاً)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* أزرار الحفظ والإلغاء */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  إلغاء وتفريغ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{editingEntry ? "حفظ التعديلات في دفتر النصوص" : "تثبيت الحصة في دفتر النصوص 📖"}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ─── شريط الفلترة الزمني المتقدم (شهر / أسبوع / يوم / كامل الموسم / مخصص) ─── */}
        <div className="bg-white rounded-2xl p-4 border border-[#e8e8e0] shadow-2xs space-y-3 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* أزرار اختيار نوع الفلترة */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-gray-700 ml-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#107a57]" />
                <span>نطاق السجل:</span>
              </span>

              <button
                type="button"
                onClick={() => setPeriodFilterType("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  periodFilterType === "all"
                    ? "bg-[#107a57] text-white shadow-2xs"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                }`}
              >
                كامل الموسم 📅
              </button>

              <button
                type="button"
                onClick={() => setPeriodFilterType("month")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  periodFilterType === "month"
                    ? "bg-[#107a57] text-white shadow-2xs"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                }`}
              >
                شهر كامل 🗓️
              </button>

              <button
                type="button"
                onClick={() => setPeriodFilterType("week")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  periodFilterType === "week"
                    ? "bg-[#107a57] text-white shadow-2xs"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                }`}
              >
                أسبوع كامل 📆
              </button>

              <button
                type="button"
                onClick={() => setPeriodFilterType("day")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  periodFilterType === "day"
                    ? "bg-[#107a57] text-white shadow-2xs"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                }`}
              >
                يوم محدد 📌
              </button>

              <button
                type="button"
                onClick={() => setPeriodFilterType("custom")}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  periodFilterType === "custom"
                    ? "bg-[#107a57] text-white shadow-2xs"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                }`}
              >
                فترة مخصصة ⏳
              </button>
            </div>

            {/* شارة توضيحية لعدد الحصص */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {periodFilterType === "all"
                  ? `${currentClassEntries.length} حصة مسجلة طيلة الموسم`
                  : `${currentClassEntries.length} حصة من أصل ${allActiveClassEntries.length} حصة`}
              </span>
            </div>
          </div>

          {/* محدد التفاصيل حسب نوع الفلترة */}
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            {periodFilterType === "month" && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-600">اختر الشهر:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-300 text-xs font-black text-gray-900 focus:outline-none focus:border-[#107a57]"
                >
                  {availableMonths.map((m) => {
                    const countInMonth = allActiveClassEntries.filter((c) => (c.date || "").startsWith(m.value)).length;
                    return (
                      <option key={m.value} value={m.value}>
                        {m.label} {countInMonth > 0 ? `(${countInMonth} حصة)` : "(0 حصة)"}
                      </option>
                    );
                  })}
                </select>
                <span className="text-xs text-gray-500 font-medium">
                  حفظ وتصدير دفتر نصوص شهر {availableMonths.find((m) => m.value === selectedMonth)?.label || selectedMonth} في ملف واحد مع التأشيرات في نهايته.
                </span>
              </div>
            )}

            {periodFilterType === "week" && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const [y, m, d] = selectedWeekDate.split("-").map(Number);
                    const dt = new Date(y, m - 1, d - 7);
                    setSelectedWeekDate(dt.toISOString().split("T")[0]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition cursor-pointer"
                  title="الأسبوع السابق"
                >
                  ◀ الأسبوع السابق
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWeekDate(todayStr)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition cursor-pointer"
                  title="الأسبوع الحالي"
                >
                  الأسبوع الحالي
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const [y, m, d] = selectedWeekDate.split("-").map(Number);
                    const dt = new Date(y, m - 1, d + 7);
                    setSelectedWeekDate(dt.toISOString().split("T")[0]);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition cursor-pointer"
                  title="الأسبوع التالي"
                >
                  الأسبوع التالي ▶
                </button>
                <span className="text-xs font-black text-emerald-900 bg-emerald-100/60 px-3 py-1 rounded-xl">
                  من {formatArabicFullDate(currentWeekStart)} إلى {formatArabicFullDate(currentWeekEnd)}
                </span>
              </div>
            )}

            {periodFilterType === "day" && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-600">اختر اليوم:</span>
                <input
                  type="date"
                  value={selectedSingleDate}
                  onChange={(e) => setSelectedSingleDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-300 text-xs font-black text-gray-900 focus:outline-none focus:border-[#107a57]"
                >
                </input>
                <button
                  type="button"
                  onClick={() => setSelectedSingleDate(todayStr)}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition cursor-pointer"
                >
                  اليوم
                </button>
                <span className="text-xs font-bold text-gray-700">
                  {getArabicDayName(selectedSingleDate)} {formatArabicFullDate(selectedSingleDate)}
                </span>
              </div>
            )}

            {periodFilterType === "custom" && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-600">من:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-gray-50 border border-gray-300 text-xs font-black text-gray-900 focus:outline-none focus:border-[#107a57]"
                />
                <span className="text-xs font-bold text-gray-600">إلى:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-gray-50 border border-gray-300 text-xs font-black text-gray-900 focus:outline-none focus:border-[#107a57]"
                />
              </div>
            )}

            {periodFilterType === "all" && (
              <div className="text-xs text-gray-500 font-medium">
                عرض كامل الحصص المسجلة لفوج ({activeClass}) طيلة الموسم الدراسي 2026 / 2027 م ({allActiveClassEntries.length} حصة).
              </div>
            )}

            <div className="text-xs text-[#107a57] font-black flex items-center gap-1 mr-auto">
              <span>الفترة النشطة بالسجل:</span>
              <span className="underline">{activePeriodLabel}</span>
            </div>
          </div>
        </div>

        {/* ─── تنبيه تفعيل الفلترة الزمنية عند تحديد فترة محدودة ─── */}
        {periodFilterType !== "all" && allActiveClassEntries.length > currentClassEntries.length && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 font-bold print:hidden shadow-2xs">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                يتم حالياً عرض حصص {activePeriodLabel} فقط ({currentClassEntries.length} من أصل {allActiveClassEntries.length} حصة مسجلة في الدفتر لهذا الفوج).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPeriodFilterType("all")}
              className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-black text-xs transition shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>عرض كامل حصص الموسم ({allActiveClassEntries.length} حصة) 📅</span>
            </button>
          </div>
        )}

        {/* ─── شريط التصفية والبحث في حصص الفوج ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#e8e8e0] print:hidden">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-gray-500 ml-1">عرض:</span>
            <button
              type="button"
              onClick={() => setActiveTab("standard")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "standard"
                  ? "bg-[#107a57] text-white shadow-xs"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-[#e8e8e0]"
              }`}
            >
              الحصص الميدانية العادية ({activeClassCounts.standard})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("td")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "td"
                  ? "bg-purple-700 text-white shadow-xs"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-[#e8e8e0]"
              }`}
            >
              ملحق الأعمال الموجهة TD والاستدراك ({activeClassCounts.td})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "all"
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-[#e8e8e0]"
              }`}
            >
              الكل ({activeClassCounts.total})
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في دفتر نصوص هذا الفوج..."
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

        {/* ─── جدول دفتر النصوص الميداني المطابق لنموذج PDF ─── */}
        <div className="bg-white rounded-3xl border border-[#e8e8e0] shadow-sm overflow-hidden">
          {/* شريط عنوان الجدول */}
          <div className="bg-[#1e293b] text-white p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                <span>📖</span>
                <span>سجل التدوين الميداني في دفتر نصوص: فوج {activeClass}</span>
              </span>
              <span className="text-[11px] font-black bg-white/10 text-white px-2.5 py-0.5 rounded-full border border-white/15">
                {currentClassEntries.length} حصة معروضة {periodFilterType !== "all" && `(من أصل ${allActiveClassEntries.length})`}
              </span>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handleSyncFromDiary}
                className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-black transition flex items-center gap-1 cursor-pointer border border-amber-400/30"
                title="جلب أي حصة جديدة مسجلة لهذا الفوج في الدفتر اليومي"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>استيراد من الدفتر اليومي ⚡</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-xs text-gray-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#107a57]" />
              <p>جارٍ تحميل دفتر نصوص الفوج...</p>
            </div>
          ) : currentClassEntries.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              {allActiveClassEntries.length > 0 ? (
                <>
                  <p className="font-bold text-gray-700">
                    لا توجد حصص تطابق التصفية الحالية في ({activePeriodLabel}).
                  </p>
                  <p className="text-gray-500">
                    توجد ({allActiveClassEntries.length}) حصة مسجلة لهذا الفوج في فترات أخرى من الموسم الدراسي.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodFilterType("all");
                        setActiveTab("all");
                        setSearchQuery("");
                      }}
                      className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>عرض كامل حصص الموسم ({allActiveClassEntries.length} حصة) 📅</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-bold text-gray-700">لا توجد حصص مسجلة في دفتر نصوص فوج {activeClass} بعد.</p>
                  <p className="text-gray-500">
                    يمكنك الضغط على زر «استيراد من الدفتر اليومي ⚡» لجلب كل الحصص السابقة تلقائياً وتعديل ما تريد!
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSyncFromDiary}
                      className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Zap className="w-4 h-4" />
                      <span>استيراد حصص {activeClass} من الدفتر اليومي الآن</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right text-xs">
                <thead>
                  <tr className="bg-[#0f172a] text-white text-[11px] font-black border-b border-gray-300">
                    <th className="p-3 w-[14%] border-l border-slate-700 text-center">التاريخ</th>
                    <th className="p-3 w-[11%] border-l border-slate-700 text-center">التوقيت</th>
                    <th className="p-3 w-[65%] border-l border-slate-700">سير الحصة والعمل المنجز وسيرورة التعلم</th>
                    <th className="p-3 w-[10%] text-center">الإمضاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {currentClassEntries.map((item, idx) => {
                    return (
                      <tr
                        key={item.id}
                        className={`group hover:bg-[#fbfbf9] transition-colors duration-150 relative ${
                          idx % 2 === 1 ? "bg-[#fafaf7]/50" : "bg-white"
                        }`}
                      >
                        {/* 1. التاريخ */}
                        <td className="p-3.5 align-top border-l border-gray-200 text-center space-y-1">
                          <div className="font-black text-xs sm:text-sm text-gray-900">{item.dayName}</div>
                          <div className="text-[10px] text-gray-500 font-bold">{formatArabicFullDate(item.date)}</div>
                          {item.weekLabel && (
                            <div className="text-[9.5px] font-black text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                              {item.weekLabel}
                            </div>
                          )}
                        </td>

                        {/* 2. التوقيت */}
                        <td className="p-3.5 align-top border-l border-gray-200 text-center space-y-1">
                          <div className="font-mono font-black text-xs text-gray-900">{item.periodTime}</div>
                          {item.field && (
                            <span className="inline-block text-[9.5px] font-black text-[#107a57] bg-[#e6f4ee] px-1.5 py-0.2 rounded border border-[#107a57]/20">
                              {item.field}
                            </span>
                          )}
                          {item.isTdOrRemediation && (
                            <div className="text-[9px] font-black text-purple-700 bg-purple-50 px-1 rounded">
                              {item.subgroup || "TD"}
                            </div>
                          )}
                        </td>

                        {/* 3. سير الحصة والعمل المنجز وسيرورة التعلم */}
                        <td className="p-3.5 align-top border-l border-gray-200 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap border-b border-gray-100 pb-2">
                            <span className="inline-block text-[10px] font-black text-[#107a57] bg-[#e6f4ee] px-2 py-0.5 rounded-md border border-[#107a57]/25">
                              {item.sessionType || "درس ومورد"}
                            </span>
                            {(item as any).isInferred && (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                <span>استنتاج ذكي من الدفتر اليومي</span>
                              </span>
                            )}
                            {(item as any).isSavedOverride && (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-300">
                                <span>✍️ تدوين مخصص محفوظ</span>
                              </span>
                            )}
                            <span className="text-xs sm:text-sm font-black text-gray-900">
                              {item.resourceTitle}
                            </span>
                            {item.section && (
                              <span className="text-[10px] font-bold text-gray-400">— {item.section}</span>
                            )}
                          </div>

                          <div className="space-y-1 text-xs text-gray-700 leading-relaxed">
                            {item.warmup && (
                              <div>
                                <strong className="text-sky-900 font-black">• تهيئة: </strong>
                                <span>{item.warmup}</span>
                              </div>
                            )}
                            {item.proposedSituation && (
                              <div>
                                <strong className="text-emerald-900 font-black">• وضعية مقترحة: </strong>
                                <span>{item.proposedSituation}</span>
                              </div>
                            )}
                            {item.summary && (
                              <div>
                                <strong className="text-purple-900 font-black">• الحوصلة: </strong>
                                <span>{item.summary}</span>
                              </div>
                            )}
                            {item.reinvestment && (
                              <div>
                                <strong className="text-gray-900 font-black">• إعادة الاستثمار: </strong>
                                <span>{item.reinvestment}</span>
                              </div>
                            )}
                            {item.homework && (
                              <div className="text-amber-900 font-black pt-1 border-t border-dashed border-gray-200">
                                <span>• الواجب المنزلي: </span>
                                <span>{item.homework}</span>
                              </div>
                            )}
                          </div>

                          {/* أزرار العمليات السريعة */}
                          <div className="flex items-center justify-end gap-1.5 pt-2 opacity-0 group-hover:opacity-100 transition print:hidden">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="p-1 px-2.5 rounded-lg bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-800 text-[10px] font-black transition cursor-pointer flex items-center gap-1 border border-gray-200"
                              title="تعديل تدوين الحصة في دفتر النصوص"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>تعديل التدوين ✏️</span>
                            </button>
                            {(item as any).isSavedOverride && (
                              <button
                                type="button"
                                onClick={() => handleResetToInferred(item)}
                                className="p-1 px-2 rounded-lg bg-gray-100 hover:bg-sky-100 text-sky-700 hover:text-sky-900 text-[10px] font-black transition cursor-pointer flex items-center gap-1 border border-gray-200"
                                title="إعادة الاستنتاج البيداغوجي التلقائي من الدفتر اليومي"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>استعادة الذكي ⚡</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(item.id, item.resourceTitle)}
                              className="p-1 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-700 text-[10px] transition cursor-pointer"
                              title="حذف من دفتر النصوص"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* 4. الإمضاء */}
                        <td className="p-3.5 align-middle text-center space-y-1">
                          <div className="font-black text-xs text-gray-900">
                            {item.signature || `${teacherFamilyName} ✍`}
                          </div>
                          <div className="text-base text-gray-400">✍</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── تأشيرات الإدارة والمفتش في ذيل الصفحة المطبوعة A4 ─── */}
        <div className="hidden print:block pt-8 border-t-2 border-gray-900 break-inside-avoid">
          <div className="grid grid-cols-3 gap-4 text-xs text-center font-black">
            <div className="border border-gray-900 p-3 rounded-lg h-28 flex flex-col justify-between">
              <p>إمضاء الأستاذ(ة)</p>
              <p className="text-[10px] text-gray-700 font-bold">{teacherFullName}</p>
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
      </div>
    </div>
  );
}
