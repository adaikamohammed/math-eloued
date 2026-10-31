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

  // الفلاتر
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"standard" | "td" | "all">("standard");

  // تاريخ اليوم والغد
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

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
  const teacherFullName = timetableSettings?.teacherName || profile?.fullName || "الأستاذ محمد عدايكة";
  const teacherFamilyName = teacherFullName.trim().split(" ")[0] || "عدايكة";
  const printSchoolName = timetableSettings?.schoolName || profile?.schoolCustomName || "متوسطة المجاهد باهي علي — قمار";
  const printInspectorName = timetableSettings?.inspectorName || "السيد عبد الرزاق عبيدي (مفتش التربية الوطنية)";
  const printPrincipalName = timetableSettings?.principalName || "السيد عبد اللطيف عويني (مدير المؤسسة)";
  const printWilaya = timetableSettings?.wilayaName || "الوادي";
  const printSubject = timetableSettings?.subjectName || profile?.subject || "الرياضيات";

  // جلب البيانات
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedClass = localStorage.getItem("last_active_cahier_class");
        if (storedClass) setActiveClass(storedClass);
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
          const sortedCls =
            Array.isArray(data.customClasses) && data.customClasses.length > 0
              ? sortClasses(data.customClasses)
              : ["2م3", "1م1", "1م2", "1م3"];

          setCustomClasses(sortedCls);
          setActiveClass((prev) => prev || sortedCls[0]);

          if (Array.isArray(data.diaryEntries)) {
            setDiaryEntries(data.diaryEntries);
          }

          if (Array.isArray(data.cahierTextesEntries)) {
            setCahierEntries(data.cahierTextesEntries);
          }

          if (data.timetable) {
            setTimetable(data.timetable);
            if (data.timetable.settings) {
              setTimetableSettings(data.timetable.settings);
            }
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setMessage({ type: "err", text: "حدث خطأ أثناء تحميل دفتر النصوص" });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // تغيير الفوج النشط
  const handleSelectClass = (cls: string) => {
    setActiveClass(cls);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("last_active_cahier_class", cls);
      } catch {}
    }
  };

  // حفظ التعديلات على الخادم
  const persistChanges = async (payload: { cahierTextesEntries?: CahierTextesEntry[] }) => {
    setSaving(true);
    try {
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("فشل حفظ التعديلات على الخادم");
      setMessage({ type: "ok", text: "تم تحديث دفتر النصوص بنجاح 📖" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "err", text: err.message || "فشل حفظ دفتر النصوص" });
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
      updated = cahierEntries.map((c) =>
        c.id === editingEntry.id
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

  // ⚡ استيراد الحصص تلقائياً من الدفتر اليومي للفوج النشط
  const handleSyncFromDiary = async () => {
    const classDiaryLessons = diaryEntries.filter(
      (d) => d.className === activeClass || d.className.replace(/\s+/g, "") === activeClass.replace(/\s+/g, "")
    );

    if (classDiaryLessons.length === 0) {
      alert(`لم يتم العثور على حصص مسجلة لفوج (${activeClass}) في الدفتر اليومي.`);
      return;
    }

    const existingDiaryIds = new Set(
      cahierEntries.filter((c) => c.className === activeClass && c.diaryEntryId).map((c) => c.diaryEntryId)
    );

    const newToImport = classDiaryLessons.filter((d) => !existingDiaryIds.has(d.id));

    if (newToImport.length === 0) {
      alert(`كافة حصص فوج (${activeClass}) المسجلة في الدفتر اليومي مستوردة مسبقاً في دفتر النصوص.`);
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
      const warmupContent =
        d.stages?.find((s) => s.label.includes("تمهيدي") || s.label.includes("تهيئة") || s.label.includes("انطلاق"))
          ?.content || "";

      const situationContent =
        d.stages?.find((s) => s.label.includes("وسيطي") || s.label.includes("وضعية") || s.label.includes("بناء"))
          ?.content || "";

      const summaryContent =
        d.concepts ||
        d.stages?.find((s) => s.label.includes("حوصلة") || s.label.includes("قاعدة"))?.content ||
        "";

      const reinvestContent =
        d.stages?.find((s) => s.label.includes("نهائي") || s.label.includes("استثمار") || s.label.includes("تطبيق"))
          ?.content || "";

      const isTd = d.sessionType?.includes("موجهة") || d.sessionType?.includes("استدراك") || false;

      return {
        id: `cahier_sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        diaryEntryId: d.id,
        className: activeClass,
        date: d.date,
        dayName: d.day,
        periodTime: d.periodTime || "08:00 - 09:00",
        sessionType: d.sessionType || (isTd ? "أعمال موجهة" : "درس ومورد"),
        field: d.field || "أنشطة عددية",
        section: d.section || "",
        resourceTitle: d.lessonTitle,
        warmup: warmupContent,
        proposedSituation: situationContent,
        summary: summaryContent,
        reinvestment: reinvestContent,
        homework: d.homework || "",
        signature: `${teacherFamilyName} ✍`,
        isTdOrRemediation: isTd,
        subgroup: isTd ? "القسم كامل" : undefined,
        notes: d.notes || "",
        createdAt: new Date().toISOString(),
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

  // الحصص المعروضة للفوج النشط
  const currentClassEntries = useMemo(() => {
    let list = cahierEntries.filter((c) => c.className === activeClass);

    if (activeTab === "standard") {
      list = list.filter((c) => !c.isTdOrRemediation);
    } else if (activeTab === "td") {
      list = list.filter((c) => !!c.isTdOrRemediation);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.resourceTitle.toLowerCase().includes(q) ||
          (c.field || "").toLowerCase().includes(q) ||
          (c.section || "").toLowerCase().includes(q) ||
          (c.summary || "").toLowerCase().includes(q) ||
          (c.homework || "").toLowerCase().includes(q)
      );
    }

    // فرز الحصص تصاعدياً حسب التاريخ ثم التوقيت
    list.sort((a, b) => {
      const cmpDate = (a.date || "").localeCompare(b.date || "");
      if (cmpDate !== 0) return cmpDate;
      return (a.periodTime || "").localeCompare(b.periodTime || "");
    });

    return list;
  }, [cahierEntries, activeClass, activeTab, searchQuery]);

  // تشغيل الطباعة الأفقية A4
  const handlePrintLandscape = () => {
    printCahierTextesReport({
      teacherName: teacherFullName,
      schoolName: printSchoolName,
      inspectorName: printInspectorName,
      principalName: printPrincipalName,
      wilayaName: printWilaya,
      subjectName: printSubject,
      className: activeClass,
      timetableSlots: timetable?.slots || [],
      entries: cahierEntries.filter((c) => c.className === activeClass),
    });
  };

  // تشغيل تنزيل الـ PDF الأفقي
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
      entries: cahierEntries.filter((c) => c.className === activeClass),
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
              onClick={handlePrintLandscape}
              type="button"
              className="px-3.5 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-800 hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="طباعة دفتر نصوص هذا الفوج أفقياً A4"
            >
              <Printer className="w-3.5 h-3.5 text-[#107a57]" />
              <span>طباعة أفقياً A4 🖨️</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              type="button"
              className="px-3.5 py-1.5 rounded-xl border border-[#107a57]/30 bg-[#e6f4ee] text-xs font-black text-[#107a57] hover:bg-[#d8efe5] transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="تنزيل دفتر نصوص القسم كملف PDF أفقي عالي الدقة"
            >
              <Download className="w-3.5 h-3.5 text-[#107a57]" />
              <span>تحميل PDF أفقياً 📄</span>
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
            const isSelected = cls === activeClass;
            const count = cahierEntries.filter((c) => c.className === cls).length;
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
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
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
                      placeholder="عدايكة ✍"
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
              الحصص الميدانية العادية
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
              ملحق الأعمال الموجهة TD والاستدراك
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
              الكل ({cahierEntries.filter((c) => c.className === activeClass).length})
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
                {currentClassEntries.length} حصة مسجلة
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
                              className="p-1 px-2 rounded-lg bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-800 text-[10px] font-black transition cursor-pointer flex items-center gap-1 border border-gray-200"
                              title="تعديل تدوين الحصة في دفتر النصوص"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>تعديل التدوين</span>
                            </button>
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
