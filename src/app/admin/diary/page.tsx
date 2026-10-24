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
  Globe,
  Lock,
  Compass,
  Search,
  RotateCcw,
  Check,
  Layers,
  HelpCircle,
  Info,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { PageExplainer } from "@/components/PageExplainer";
import { useProfile } from "@/lib/useProfile";
import {
  DailyDiaryEntry,
  LessonsData,
  COMMON_FIELDS,
  SCHOOL_DAYS,
  TimetableSettings,
} from "@/lib/types";

// توقيتات الحصص المعتمدة في التعليم المتوسط الجزائري
const STANDARD_PERIODS = [
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "13:00 - 14:00",
  "13:30 - 14:30",
  "14:30 - 15:30",
  "15:30 - 16:30",
];

// حساب اسم اليوم بالعربية من تاريخ بصيغة YYYY-MM-DD
function getArabicDayName(dateStr: string): string {
  if (!dateStr) return "الأحد";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return "الأحد";
  const dateObj = new Date(year, month - 1, day);
  const dayIndex = dateObj.getDay();
  const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return days[dayIndex] || "الأحد";
}

// تنسيق التاريخ بالعربية (مثلاً: 25 أكتوبر 2026)
function formatArabicFullDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const months = [
      "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
      "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    return `${day} ${months[dateObj.getMonth()]} ${year}`;
  } catch {
    return dateStr;
  }
}

export default function TeacherDiaryPage() {
  const { profile } = useProfile();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // الأفواج والبيانات
  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [entries, setEntries] = useState<DailyDiaryEntry[]>([]);
  const [timetableSettings, setTimetableSettings] = useState<TimetableSettings | null>(null);

  // الفلاتر والبحث
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "tomorrow" | "today">("all");

  // مرجع استمارة التحضير للتمرير السلس
  const formRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // حالة طي أو فتح استمارة التحضير في الصفحة
  const [isFormExpanded, setIsFormExpanded] = useState(true);

  // الحصة قيد التعديل (null = تحضير حصة جديدة)
  const [editingEntry, setEditingEntry] = useState<DailyDiaryEntry | null>(null);

  // حقول الاستمارة المباشرة في الصفحة
  const [formDate, setFormDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [formClass, setFormClass] = useState("");
  const [isCustomClassInput, setIsCustomClassInput] = useState(false);
  const [customClassName, setCustomClassName] = useState("");

  const [formPeriodTime, setFormPeriodTime] = useState("08:00 - 09:00");
  const [isCustomTimeInput, setIsCustomTimeInput] = useState(false);
  const [customTimeValue, setCustomTimeValue] = useState("");

  const [formField, setFormField] = useState<string>("أنشطة عددية");
  const [isCustomFieldInput, setIsCustomFieldInput] = useState(false);
  const [customFieldValue, setCustomFieldValue] = useState("");

  const [formSection, setFormSection] = useState("");
  const [formLessonTitle, setFormLessonTitle] = useState("");
  const [formObjectives, setFormObjectives] = useState("");
  const [formActivities, setFormActivities] = useState("");
  const [formHomework, setFormHomework] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formIsPublic, setFormIsPublic] = useState(true);

  // حساب اليوم المحسوب تلقائياً
  const calculatedDayName = useMemo(() => getArabicDayName(formDate), [formDate]);

  // حساب تاريخ اليوم وتاريخ الغد
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().split("T")[0];
  }, []);
  const dayAfterTomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  }, []);

  // جلب البيانات والتحقق من الجلسة
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedClasses = localStorage.getItem("last_active_classes");
        if (storedClasses) {
          const parsed = JSON.parse(storedClasses);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCustomClasses(parsed);
            setFormClass((prev) => prev || parsed[0]);
          }
        }
      } catch {}
    }

    setLoading(true);
    Promise.all([
      fetch("/api/auth")
        .then((res) => res.json())
        .catch(() => ({ authenticated: false })),
      fetch("/api/lessons")
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ])
      .then(([authData, data]: [any, LessonsData | null]) => {
        setAuthenticated(authData?.authenticated === true);

        if (data) {
          const teacherClasses =
            Array.isArray(data.customClasses) && data.customClasses.length > 0
              ? data.customClasses
              : [];
          if (teacherClasses.length > 0) {
            setCustomClasses(teacherClasses);
            setFormClass((prev) => prev || teacherClasses[0]);
          }

          if (Array.isArray(data.diaryEntries)) {
            setEntries(data.diaryEntries);
          }

          if (data.timetable?.settings) {
            setTimetableSettings(data.timetable.settings);
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setMessage({ type: "err", text: "حدث خطأ أثناء تحميل الدفتر اليومي" });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // حفظ التعديلات على الخادم
  const persistEntries = async (newEntries: DailyDiaryEntry[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diaryEntries: newEntries }),
      });
      if (!res.ok) throw new Error("فشل حفظ التعديلات على الخادم");
      setMessage({ type: "ok", text: "تم تحديث الدفتر اليومي بنجاح 📒" });
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "err", text: err.message || "فشل حفظ الدفتر" });
    } finally {
      setSaving(false);
    }
  };

  // تفريغ الاستمارة لحصة جديدة
  const handleResetForm = useCallback(() => {
    setEditingEntry(null);
    setFormDate(tomorrowStr);
    const defaultCls = customClasses[0] || "";
    setFormClass(defaultCls);
    setIsCustomClassInput(false);
    setCustomClassName("");
    setFormPeriodTime("08:00 - 09:00");
    setIsCustomTimeInput(false);
    setCustomTimeValue("");
    setFormField("أنشطة عددية");
    setIsCustomFieldInput(false);
    setCustomFieldValue("");
    setFormSection("");
    setFormLessonTitle("");
    setFormObjectives("");
    setFormActivities("");
    setFormHomework("");
    setFormNotes("");
    setFormIsPublic(true);
  }, [customClasses, tomorrowStr]);

  // التمرير السلس إلى الاستمارة وتجهيزها
  const scrollToForm = useCallback(() => {
    setIsFormExpanded(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      titleInputRef.current?.focus();
    }, 80);
  }, []);

  // فتح التحضير لحصة الغد مباشرة
  const handlePrepareForTomorrow = () => {
    handleResetForm();
    setFormDate(tomorrowStr);
    if (selectedClassFilter !== "all") {
      setFormClass(selectedClassFilter);
    }
    scrollToForm();
  };

  // الدخول في وضع تعديل حصة مسجلة
  const handleStartEdit = (entry: DailyDiaryEntry) => {
    setEditingEntry(entry);
    setFormDate(entry.date);

    // الفوج
    if (customClasses.includes(entry.className)) {
      setFormClass(entry.className);
      setIsCustomClassInput(false);
      setCustomClassName("");
    } else {
      setIsCustomClassInput(true);
      setCustomClassName(entry.className);
      setFormClass("__custom__");
    }

    // التوقيت
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

    // الميدان
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
    setFormObjectives(entry.objectives || "");
    setFormActivities(entry.activities || "");
    setFormHomework(entry.homework || "");
    setFormNotes(entry.notes || "");
    setFormIsPublic(entry.isPublicForParents !== false);

    scrollToForm();
  };

  // إلغاء وضع التعديل والعودة لحصة جديدة
  const handleCancelEdit = () => {
    handleResetForm();
  };

  // حفظ الحصة (إضافة أو تعديل مباشر في الصفحة)
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

    let updated: DailyDiaryEntry[];
    if (editingEntry) {
      // تعديل الحصة القائمة
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
              objectives: formObjectives.trim() || undefined,
              activities: formActivities.trim() || undefined,
              homework: formHomework.trim() || undefined,
              notes: formNotes.trim() || undefined,
              isPublicForParents: formIsPublic,
            }
          : en
      );
    } else {
      // إضافة حصة جديدة
      const newEntry: DailyDiaryEntry = {
        id: `diary_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date: formDate,
        day: dayName,
        periodTime: actualTime || undefined,
        className: actualClass,
        field: actualField || undefined,
        section: formSection.trim() || undefined,
        lessonTitle: actualTitle,
        objectives: formObjectives.trim() || undefined,
        activities: formActivities.trim() || undefined,
        homework: formHomework.trim() || undefined,
        notes: formNotes.trim() || undefined,
        isPublicForParents: formIsPublic,
        createdAt: new Date().toISOString(),
      };
      updated = [newEntry, ...entries];
    }

    setEntries(updated);

    // إذا تم إدخال قسم مخصص غير مسجل، نضيفه للأفواج المقترحة
    if (actualClass && !customClasses.includes(actualClass)) {
      setCustomClasses((prev) => [...prev, actualClass]);
    }

    await persistEntries(updated);

    // إعادة ضبط الحقول للاستعداد للحصة التالية وتسهيل التدوين المتتالي
    if (editingEntry) {
      handleResetForm();
    } else {
      // الاحتفاظ بالتاريخ والفوج لتسريع تدوين عدة حصص لنفس اليوم أو الفوج
      setFormLessonTitle("");
      setFormObjectives("");
      setFormActivities("");
      setFormHomework("");
      setFormNotes("");
      titleInputRef.current?.focus();
    }
  };

  // حذف حصة
  const handleDeleteEntry = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف الحصة "${title}" من الدفتر اليومي؟`)) return;
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    if (editingEntry?.id === id) {
      handleResetForm();
    }
    await persistEntries(updated);
  };

  // تصفية وترتيب الحصص
  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => {
        // فلتر الفوج
        if (selectedClassFilter !== "all" && e.className !== selectedClassFilter) return false;

        // فلتر التاريخ
        if (dateFilter === "tomorrow" && e.date !== tomorrowStr) return false;
        if (dateFilter === "today" && e.date !== todayStr) return false;

        // فلتر البحث
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchTitle = e.lessonTitle.toLowerCase().includes(q);
          const matchField = (e.field || "").toLowerCase().includes(q);
          const matchClass = e.className.toLowerCase().includes(q);
          const matchSection = (e.section || "").toLowerCase().includes(q);
          const matchHomework = (e.homework || "").toLowerCase().includes(q);
          return matchTitle || matchField || matchClass || matchSection || matchHomework;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, selectedClassFilter, dateFilter, searchQuery, tomorrowStr, todayStr]);

  // إحصائيات سريعة
  const tomorrowLessons = useMemo(() => {
    return entries.filter((e) => e.date === tomorrowStr);
  }, [entries, tomorrowStr]);

  const todayLessons = useMemo(() => {
    return entries.filter((e) => e.date === todayStr);
  }, [entries, todayStr]);

  // بيانات الترويسة للطباعة الرسمية (مستقاة من التوقيت والملف الشخصي)
  const printTeacherName = timetableSettings?.teacherName || profile?.fullName || "الأستاذ(ة)";
  const printSchoolName = timetableSettings?.schoolName || profile?.schoolCustomName || "المتوسطة";
  const printInspectorName = timetableSettings?.inspectorName || "السيد مفتش التعليم المتوسط";
  const printPrincipalName = timetableSettings?.principalName || "السيد مدير المتوسطة";
  const printSubject = timetableSettings?.subjectName || profile?.subject || "الرياضيات";
  const printWilaya = timetableSettings?.wilayaName || "الوادي";

  if (authenticated === false) {
    return <LoginRequired next="/admin/diary" title="الدفتر اليومي ودفتر النصوص" />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] py-6 sm:py-8 px-3 sm:px-6 font-sans text-right" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ─── الترويسة الرسمية الخاصة بالطباعة (تظهر فقط عند طباعة الورقة A4) ─── */}
        <div className="hidden print:block border-b-2 border-gray-900 pb-4 mb-6">
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-gray-800">الجمهورية الجزائرية الديمقراطية الشعبية</p>
            <p className="text-xs font-bold text-gray-800">وزارة التربية الوطنية — مديرية التربية لولاية {printWilaya}</p>
            <h1 className="text-lg font-black text-gray-900 pt-1">
              سجل دفتر النصوص الرسمي والتحضير اليومي
            </h1>
            <p className="text-xs font-semibold text-gray-700">
              مادة: <span className="font-black">{printSubject}</span> • السنة الدراسية: 2026 / 2027
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-3 text-xs text-gray-800 border-t border-gray-400 pt-2">
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
            <span className="text-gray-900 font-black">الدفتر اليومي ودفتر النصوص</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              type="button"
              className="px-3.5 py-1.5 rounded-xl border border-[#e8e8e0] bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" />
              <span>طباعة دفتر النصوص A4</span>
            </button>
            <button
              onClick={handlePrepareForTomorrow}
              type="button"
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تحضير حصة جديدة (ماذا سأدرس غداً)</span>
            </button>
          </div>
        </div>

        {/* ─── دليل الصفحة البيداغوجي ─── */}
        <div className="print:hidden">
          <PageExplainer
            pageId="diary"
            title="الدفتر اليومي ودفتر النصوص (ماذا سأدرس غداً)"
            teacherRoleExplanation="هنا تدون مباشرة وبسهولة تامة عناصر الحصة اليومية: المورد المعرفي، مؤشرات الكفاءة، سير الأنشطة، والواجبات المنزلية، دون أي نوافذ منبثقة، مع ميزة التوليد التلقائي لدفتر نصوص وزاري رسمي جاهز للطباعة."
            parentRoleExplanation="يطلع الولي من صفحته على عناوين الدروس المقررة والواجبات المنزلية لمرافقة ابنه خطوة بخطوة."
            inspectorExplanation="سجل رسمي مطابق للتدرج السنوي، يتيح للسيد المفتش التربوي معاينة وتيرة إنجاز البرنامج ودفتر النصوص الموثق."
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

        {/* ─── بطاقة الترويسة والإحصائيات ─── */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#e8e8e0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 print:hidden">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 px-3 py-0.5 rounded-full text-xs font-bold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>الدفتر اليومي ودفتر النصوص الرسمي</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              سجل الحصص اليومية وتوثيق التعلمات
            </h1>
            <p className="text-xs text-gray-600 font-medium max-w-xl">
              إدخال وتحضير حصص الغد واليوم مباشرة في الصفحة دون أي نافذة منبثقة، وتوثيق المورد المعرفي والواجبات والتوجيهات البيداغوجية.
            </p>
          </div>

          {/* ودجت ما سأدرسه غداً */}
          <div className="bg-[#fafaf7] border border-[#e8e8e0] rounded-2xl p-4 min-w-[220px] text-right space-y-1.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-gray-500">ماذا ستدرس غداً؟</span>
              <span className="text-[10px] font-mono text-gray-400">{tomorrowStr}</span>
            </div>
            {tomorrowLessons.length > 0 ? (
              <div className="space-y-1 pt-0.5">
                <span className="text-xs font-black text-[#107a57] block truncate" title={tomorrowLessons[0].lessonTitle}>
                  {tomorrowLessons[0].lessonTitle}
                </span>
                <span className="text-[11px] text-gray-600 font-bold block">
                  فوج {tomorrowLessons[0].className} • {tomorrowLessons.length} حصة مسجلة للغد
                </span>
              </div>
            ) : (
              <div className="space-y-1.5 pt-0.5">
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg font-medium inline-block">
                  لم تدون بعد حصص الغد
                </span>
                <button
                  type="button"
                  onClick={handlePrepareForTomorrow}
                  className="text-xs font-black text-[#107a57] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>حضّر حصة الغد الآن</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            استمارة التحضير المباشرة في الصفحة (بدون أي نافذة منبثقة)
           ══════════════════════════════════════════════════════════════════════ */}
        <div
          ref={formRef}
          className={`bg-white rounded-3xl border transition-all duration-300 print:hidden overflow-hidden ${
            editingEntry
              ? "border-amber-400 ring-4 ring-amber-400/10 shadow-lg"
              : "border-[#107a57]/30 shadow-md ring-2 ring-[#107a57]/10"
          }`}
        >
          {/* رأس استمارة التحضير المباشرة */}
          <div
            className={`p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b transition ${
              editingEntry
                ? "bg-amber-50/80 border-amber-200"
                : "bg-[#f4faf7] border-[#e2efe9]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                  editingEntry
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-[#107a57] text-white shadow-xs"
                }`}
              >
                {editingEntry ? <Pencil className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-gray-900">
                    {editingEntry ? "تعديل بيانات الحصة المسجلة" : "تحضير وتدوين حصة جديدة في الصفحة"}
                  </h2>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      editingEntry
                        ? "bg-amber-200 text-amber-900"
                        : "bg-[#107a57]/15 text-[#107a57]"
                    }`}
                  >
                    {editingEntry ? "وضع التعديل" : "إدخال مباشر بدون نوافذ منبثقة"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 font-medium">
                  {editingEntry
                    ? `أنت الآن تعدل الحصة: "${editingEntry.lessonTitle}"`
                    : "اكتب عناصر الدرس وسير الأنشطة والواجب مباشرة وسيتم حفظها وتوثيقها فوراً"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editingEntry && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-xs font-bold text-amber-800 hover:bg-amber-100/50 transition cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>إلغاء التعديل</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFormExpanded((v) => !v)}
                className="px-3 py-1.5 rounded-xl border border-[#e8e8e0] bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer flex items-center gap-1"
                title={isFormExpanded ? "طي الاستمارة" : "فتح الاستمارة"}
              >
                <span>{isFormExpanded ? "طي الاستمارة" : "توسيع الاستمارة"}</span>
                {isFormExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* محتوى الاستمارة */}
          {isFormExpanded && (
            <form onSubmit={handleSubmitEntry} className="p-5 sm:p-7 space-y-6">
              {/* شريط الإدخال السريع للتاريخ واليوم */}
              <div className="p-3.5 rounded-2xl bg-[#fafaf7] border border-[#e8e8e0] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#107a57]" />
                  <span className="text-xs font-black text-gray-800">اختيار سريع لليوم:</span>
                  <div className="inline-flex rounded-xl p-0.5 bg-white border border-[#e8e8e0]">
                    <button
                      type="button"
                      onClick={() => setFormDate(todayStr)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        formDate === todayStr ? "bg-[#107a57] text-white" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      اليوم ({getArabicDayName(todayStr)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDate(tomorrowStr)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        formDate === tomorrowStr ? "bg-[#107a57] text-white" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      غداً ({getArabicDayName(tomorrowStr)}) ✨
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDate(dayAfterTomorrowStr)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        formDate === dayAfterTomorrowStr ? "bg-[#107a57] text-white" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      بعد غد ({getArabicDayName(dayAfterTomorrowStr)})
                    </button>
                  </div>
                </div>

                <div className="text-xs font-black text-gray-700 bg-white px-3 py-1 rounded-xl border border-[#e8e8e0]">
                  اليوم المحدد: <span className="text-[#107a57]">{calculatedDayName} {formatArabicFullDate(formDate)}</span>
                </div>
              </div>

              {/* ─── القسم 1: المعلومات التنظيمية (التاريخ، الفوج، التوقيت، الميدان) ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. تاريخ الحصة */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">
                    تاريخ الحصة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#e8e8e0] text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>

                {/* 2. الفوج التربوي */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-gray-800">
                      الفوج التربوي <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomClassInput((v) => !v)}
                      className="text-[10px] font-bold text-[#107a57] hover:underline cursor-pointer"
                    >
                      {isCustomClassInput ? "اختيار من القائمة" : "+ كتابة فوج مخصص"}
                    </button>
                  </div>
                  {isCustomClassInput ? (
                    <input
                      type="text"
                      required
                      placeholder="مثال: 1م1 أو 3م4 أو استدراك"
                      value={customClassName}
                      onChange={(e) => setCustomClassName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#107a57] text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#107a57]/20"
                    />
                  ) : (
                    <select
                      value={formClass}
                      onChange={(e) => {
                        if (e.target.value === "__add_new__") {
                          setIsCustomClassInput(true);
                        } else {
                          setFormClass(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                    >
                      {customClasses.length === 0 && <option value="">اختر الفوج</option>}
                      {customClasses.map((c) => (
                        <option key={c} value={c}>
                          فوج {c}
                        </option>
                      ))}
                      <option value="__add_new__">+ إضافة فوج آخر مخصص...</option>
                    </select>
                  )}
                </div>

                {/* 3. توقيت الحصة */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-gray-800">توقيت الحصة</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomTimeInput((v) => !v)}
                      className="text-[10px] font-bold text-[#107a57] hover:underline cursor-pointer"
                    >
                      {isCustomTimeInput ? "اختيار توقيت نمطي" : "+ كتابة توقيت مخصص"}
                    </button>
                  </div>
                  {isCustomTimeInput ? (
                    <input
                      type="text"
                      placeholder="مثال: 08:30 - 09:30"
                      value={customTimeValue}
                      onChange={(e) => setCustomTimeValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#107a57] text-xs font-bold text-gray-900 focus:outline-none"
                    />
                  ) : (
                    <select
                      value={formPeriodTime}
                      onChange={(e) => setFormPeriodTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#e8e8e0] text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                    >
                      {STANDARD_PERIODS.map((period) => (
                        <option key={period} value={period}>
                          {period}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 4. الميدان التعلمي */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-gray-800">الميدان التعلمي</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomFieldInput((v) => !v)}
                      className="text-[10px] font-bold text-[#107a57] hover:underline cursor-pointer"
                    >
                      {isCustomFieldInput ? "اختيار من الميادين" : "+ كتابة ميدان مخصص"}
                    </button>
                  </div>
                  {isCustomFieldInput ? (
                    <input
                      type="text"
                      placeholder="مثال: الحساب الحرفي أو الظواهر الميكانيكية"
                      value={customFieldValue}
                      onChange={(e) => setCustomFieldValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#107a57] text-xs font-bold text-gray-900 focus:outline-none"
                    />
                  ) : (
                    <select
                      value={formField}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setIsCustomFieldInput(true);
                        } else {
                          setFormField(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                    >
                      {COMMON_FIELDS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                      <option value="الحساب الحرفي">الحساب الحرفي</option>
                      <option value="الدوال وتنظيم المعطيات">الدوال وتنظيم المعطيات</option>
                      <option value="أخرى / مراجعة">أخرى / مراجعة واختبارات</option>
                      <option value="__custom__">+ كتابة ميدان مخصص...</option>
                    </select>
                  )}
                </div>
              </div>

              {/* ─── القسم 2: عنوان المورد والمقطع البيداغوجي ─── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">
                    عنوان المورد المعرفي / الدرس <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    required
                    value={formLessonTitle}
                    onChange={(e) => setFormLessonTitle(e.target.value)}
                    placeholder="مثال: ضرب وقسمة كسرين • أو خاصية طالس وحساب الأطوال • أو الحساب الحرفي"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#e8e8e0] text-xs sm:text-sm font-black text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">المقطع البيداغوجي (اختياري)</label>
                  <input
                    type="text"
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    placeholder="مثال: المقطع 1: العمليات على الأعداد الطبيعية"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#e8e8e0] text-xs font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>
              </div>

              {/* ─── القسم 3: مؤشرات الكفاءة ومراحل سير الأنشطة ─── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-gray-800">
                      🎯 مؤشرات الكفاءة والأهداف التعلمية
                    </label>
                    <span className="text-[10px] text-gray-400">للتفتيش والمتابعة</span>
                  </div>
                  <textarea
                    rows={3}
                    value={formObjectives}
                    onChange={(e) => setFormObjectives(e.target.value)}
                    placeholder="مثال: أن يتعرف المتعلم على قاعدة جداء كسرين، وأن يوظف القاعدة في اختزال العبارات الجبرية وحل مسائل يومية..."
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#e8e8e0] text-xs text-gray-900 leading-relaxed placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-gray-800">
                      📝 مراحل وسير الأنشطة في الحصة
                    </label>
                    <span className="text-[10px] text-gray-400">وضعية الانطلاق • بناء التعلمات • الحوصلة</span>
                  </div>
                  <textarea
                    rows={3}
                    value={formActivities}
                    onChange={(e) => setFormActivities(e.target.value)}
                    placeholder="مثال: 1. وضعية الانطلاق: نشاط 2 ص 14 (10 د) • 2. بناء التعلمات واستنتاج القاعدة (25 د) • 3. الحوصلة وتطبيق فوري (15 د)..."
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#e8e8e0] text-xs text-gray-900 leading-relaxed placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>
              </div>

              {/* ─── القسم 4: الواجب المنزلي وملاحظات المعالجة ─── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-amber-900">
                    📌 الواجب المنزلي والتوجيهات (يظهر للأولياء)
                  </label>
                  <input
                    type="text"
                    value={formHomework}
                    onChange={(e) => setFormHomework(e.target.value)}
                    placeholder="مثال: حل التمرين 14 و 15 ص 30 في كراس المحاولات"
                    className="w-full px-3 py-2.5 rounded-xl bg-amber-50/40 border border-amber-200 text-xs font-bold text-amber-950 placeholder:text-amber-800/40 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">
                    💡 ملاحظات المعالجة البيداغوجية والاستدراك (خاص بالأستاذ)
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="مثال: تسجيل صعوبة في اختزال الكسور، تبرمج معالجة في حصة الدعم"
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#e8e8e0] text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>
              </div>

              {/* ─── القسم 5: الإتاحة للأولياء وأزرار الحفظ ─── */}
              <div className="pt-2 border-t border-[#e8e8e0] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="inPageIsPublicCheck"
                    checked={formIsPublic}
                    onChange={(e) => setFormIsPublic(e.target.checked)}
                    className="w-4 h-4 rounded text-[#107a57] focus:ring-[#107a57] cursor-pointer"
                  />
                  <label
                    htmlFor="inPageIsPublicCheck"
                    className="text-xs font-bold text-gray-800 cursor-pointer select-none flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>إتاحة عنوان الدرس والواجب في فضاء الأولياء للاطلاع المباشر</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  {editingEntry ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 rounded-xl border border-[#e8e8e0] text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                      >
                        إلغاء التعديل
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>حفظ التعديلات في الحصة</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleResetForm}
                        className="px-3.5 py-2 rounded-xl border border-[#e8e8e0] text-xs font-bold text-gray-500 hover:bg-gray-100 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>تفريغ الحقول</span>
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

        {/* ─── شريط الفلترة والبحث والأفواج ─── */}
        <div className="space-y-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#e8e8e0]">
            {/* أزرار الأفواج */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-gray-500 ml-1">تصفية حسب الفوج:</span>
              <button
                type="button"
                onClick={() => setSelectedClassFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedClassFilter === "all"
                    ? "bg-[#107a57] text-white shadow-xs"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-[#e8e8e0]"
                }`}
              >
                الكل ({entries.length})
              </button>
              {customClasses.map((cls) => {
                const count = entries.filter((e) => e.className === cls).length;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClassFilter(cls)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      selectedClassFilter === cls
                        ? "bg-[#107a57] text-white shadow-xs"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-[#e8e8e0]"
                    }`}
                  >
                    <span>فوج {cls}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        selectedClassFilter === cls ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* فلتر التاريخ واليوم */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDateFilter("all")}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  dateFilter === "all" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                جميع التواريخ
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("tomorrow")}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  dateFilter === "tomorrow" ? "bg-[#107a57] text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                حصص الغد ({tomorrowLessons.length})
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("today")}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  dateFilter === "today" ? "bg-amber-600 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                حصص اليوم ({todayLessons.length})
              </button>
            </div>
          </div>

          {/* حقل البحث وإحصاء النتائج */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في عنوان المورد، الميدان، المقطع، أو الواجب المنزلي..."
                className="w-full pr-10 pl-3.5 py-2 rounded-2xl bg-white border border-[#e8e8e0] text-xs font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
              <span>الحصص المعروضة:</span>
              <span className="font-mono text-gray-900 bg-white px-2.5 py-1 rounded-xl border border-[#e8e8e0]">
                {filteredEntries.length} من أصل {entries.length}
              </span>
            </div>
          </div>
        </div>

        {/* ─── جدول الطباعة الرسمي المخصص للتفتيش والإدارة A4 (يظهر عند الطباعة فقط) ─── */}
        <div className="hidden print:block">
          <table className="w-full border-collapse border border-gray-900 text-[11px] leading-tight">
            <thead>
              <tr className="bg-gray-200 text-gray-900">
                <th className="border border-gray-900 p-2 w-[14%]">اليوم والتاريخ</th>
                <th className="border border-gray-900 p-2 w-[10%]">التوقيت</th>
                <th className="border border-gray-900 p-2 w-[8%]">الفوج</th>
                <th className="border border-gray-900 p-2 w-[14%]">الميدان والمقطع</th>
                <th className="border border-gray-900 p-2 w-[22%]">المورد المعرفي (عنوان الحصة)</th>
                <th className="border border-gray-900 p-2 w-[18%]">مؤشرات الكفاءة وسير الأنشطة</th>
                <th className="border border-gray-900 p-2 w-[14%]">الواجب المنزلي والتوجيهات</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((item) => (
                <tr key={`print_${item.id}`} className="break-inside-avoid">
                  <td className="border border-gray-900 p-1.5 font-bold text-center">
                    <div>{item.day}</div>
                    <div className="font-mono text-[10px] text-gray-700">{item.date}</div>
                  </td>
                  <td className="border border-gray-900 p-1.5 text-center font-mono text-[10px]">
                    {item.periodTime || "—"}
                  </td>
                  <td className="border border-gray-900 p-1.5 text-center font-bold">
                    {item.className}
                  </td>
                  <td className="border border-gray-900 p-1.5">
                    <div className="font-bold">{item.field || "—"}</div>
                    {item.section && <div className="text-[10px] text-gray-600">{item.section}</div>}
                  </td>
                  <td className="border border-gray-900 p-1.5 font-bold">
                    {item.lessonTitle}
                  </td>
                  <td className="border border-gray-900 p-1.5 text-[10px]">
                    {item.objectives && <div className="mb-1"><strong>الهدف:</strong> {item.objectives}</div>}
                    {item.activities && <div><strong>الأنشطة:</strong> {item.activities}</div>}
                    {!item.objectives && !item.activities && "—"}
                  </td>
                  <td className="border border-gray-900 p-1.5 text-[10px]">
                    {item.homework || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* تأشيرات الإدارة والمفتش في ذيل الصفحة المطبوعة */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-4 border-t-2 border-gray-900 text-xs text-center font-bold break-inside-avoid">
            <div>
              <p>إمضاء الأستاذ(ة)</p>
              <div className="h-16"></div>
              <p className="text-[11px] text-gray-700">{printTeacherName}</p>
            </div>
            <div>
              <p>تأشيرة السيد مدير المؤسسة</p>
              <div className="h-16"></div>
              <p className="text-[11px] text-gray-700">{printPrincipalName}</p>
            </div>
            <div>
              <p>تأشيرة السيد مفتش التعليم المتوسط</p>
              <div className="h-16"></div>
              <p className="text-[11px] text-gray-700">{printInspectorName}</p>
            </div>
          </div>
        </div>

        {/* ─── قائمة بطاقات الحصص في الدفتر اليومي (العرض على الشاشة) ─── */}
        <div className="print:hidden">
          {loading ? (
            <div className="py-20 text-center text-xs text-gray-500 space-y-2 bg-white rounded-3xl border border-[#e8e8e0]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#107a57]" />
              <p>جارٍ تحميل الدفتر اليومي...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-500 space-y-3 bg-white rounded-3xl border border-[#e8e8e0]">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="font-bold text-gray-700">لا توجد حصص مسجلة تطابق التصفية الحالية</p>
              <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                استخدم استمارة التحضير أعلاه لإضافة حصة جديدة في الدفتر اليومي بسهولة.
              </p>
              <button
                type="button"
                onClick={handlePrepareForTomorrow}
                className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تحضير حصة الغد الآن</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((item) => {
                const isTomorrow = item.date === tomorrowStr;
                const isToday = item.date === todayStr;
                const isCurrentlyEditing = editingEntry?.id === item.id;

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all duration-200 space-y-4 ${
                      isCurrentlyEditing
                        ? "border-amber-400 ring-4 ring-amber-400/20 shadow-md bg-amber-50/20"
                        : isTomorrow
                        ? "border-[#107a57] ring-2 ring-[#107a57]/15 shadow-md"
                        : "border-[#e8e8e0] shadow-sm hover:border-gray-300"
                    }`}
                  >
                    {/* شريط رأس البطاقة */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e8e0] pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isCurrentlyEditing && (
                          <span className="text-[10px] font-black text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded-full">
                            قيد التعديل الآن ✏️
                          </span>
                        )}
                        {isTomorrow && (
                          <span className="text-[10px] font-black text-[#107a57] bg-[#e6f4ee] px-2.5 py-0.5 rounded-full border border-[#107a57]/20">
                            حصة الغد ✨
                          </span>
                        )}
                        {isToday && (
                          <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                            حصة اليوم 📅
                          </span>
                        )}
                        <span className="text-xs font-black text-gray-900 bg-[#fafaf7] px-2.5 py-1 rounded-xl border border-[#e8e8e0]">
                          {item.day} {formatArabicFullDate(item.date)}
                        </span>
                        {item.periodTime && (
                          <span className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span>{item.periodTime}</span>
                          </span>
                        )}
                        <span className="text-xs font-bold text-[#107a57] bg-[#e6f4ee] px-2.5 py-0.5 rounded-lg border border-[#107a57]/20">
                          فوج {item.className}
                        </span>
                        {item.field && (
                          <span className="text-xs text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-lg">
                            {item.field}
                          </span>
                        )}
                      </div>

                      {/* أزرار الإجراءات للبطاقة */}
                      <div className="flex items-center gap-2">
                        {item.isPublicForParents ? (
                          <span
                            title="ظاهر للأولياء في صفحة الأستاذ"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200"
                          >
                            <Globe className="w-3 h-3" />
                            <span>متاح للأولياء</span>
                          </span>
                        ) : (
                          <span
                            title="خاص بالأستاذ فقط"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-xl border border-gray-200"
                          >
                            <Lock className="w-3 h-3" />
                            <span>خاص بالأستاذ</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 text-xs font-bold ${
                            isCurrentlyEditing
                              ? "bg-amber-500 text-white border-amber-600"
                              : "border-[#e8e8e0] text-gray-600 hover:text-amber-700 hover:bg-amber-50"
                          }`}
                          title="تعديل الحصة مباشرة في الصفحة"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">تعديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(item.id, item.lessonTitle)}
                          className="p-1.5 rounded-xl border border-[#e8e8e0] text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="حذف الحصة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* عنوان الدرس والمقطع */}
                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-black text-gray-900 leading-snug">
                        {item.lessonTitle}
                      </h3>
                      {item.section && (
                        <p className="text-xs font-bold text-gray-500 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-gray-400" />
                          <span>المقطع البيداغوجي: {item.section}</span>
                        </p>
                      )}
                    </div>

                    {/* التفاصيل البيداغوجية للحصة */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {item.objectives && (
                        <div className="p-3.5 rounded-2xl bg-[#fafaf7] border border-[#e8e8e0] space-y-1">
                          <span className="font-black text-gray-800 block">🎯 مؤشرات الكفاءة والأهداف:</span>
                          <p className="text-gray-600 whitespace-pre-line leading-relaxed">{item.objectives}</p>
                        </div>
                      )}

                      {item.activities && (
                        <div className="p-3.5 rounded-2xl bg-[#fafaf7] border border-[#e8e8e0] space-y-1">
                          <span className="font-black text-gray-800 block">📝 سير الأنشطة ومراحل التعلم:</span>
                          <p className="text-gray-600 whitespace-pre-line leading-relaxed">{item.activities}</p>
                        </div>
                      )}

                      {item.homework && (
                        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1 md:col-span-2">
                          <span className="font-black text-amber-900 block flex items-center gap-1.5">
                            <span>📌 الواجب المنزلي والتوجيهات:</span>
                          </span>
                          <p className="text-amber-950 font-bold whitespace-pre-line leading-relaxed">{item.homework}</p>
                        </div>
                      )}

                      {item.notes && (
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 md:col-span-2">
                          <span className="font-bold text-slate-700 block">💡 ملاحظات المعالجة البيداغوجية:</span>
                          <p className="text-slate-600 whitespace-pre-line leading-relaxed">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
