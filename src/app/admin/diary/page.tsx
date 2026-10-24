"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Printer,
  Eye,
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
  Globe,
  Lock,
  Compass,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { PageExplainer } from "@/components/PageExplainer";
import {
  DailyDiaryEntry,
  LessonsData,
  COMMON_FIELDS,
  SCHOOL_DAYS,
} from "@/lib/types";

export default function TeacherDiaryPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [entries, setEntries] = useState<DailyDiaryEntry[]>([]);

  // الفلاتر
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // نافذة الإضافة أو التعديل
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DailyDiaryEntry | null>(null);

  // حقول الاستمارة
  const [formDate, setFormDate] = useState<string>(() => {
    // التاريخ الافتراضي: غداً أو اليوم
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [formClass, setFormClass] = useState("");
  const [formPeriodTime, setFormPeriodTime] = useState("08:00 - 09:00");
  const [formField, setFormField] = useState<string>("أنشطة عددية");
  const [formSection, setFormSection] = useState("");
  const [formLessonTitle, setFormLessonTitle] = useState("");
  const [formObjectives, setFormObjectives] = useState("");
  const [formActivities, setFormActivities] = useState("");
  const [formHomework, setFormHomework] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [mounted, setMounted] = useState(false);

  // التحقق من الجلسة
  // التحقق من الجلسة وجلب البيانات بالتوازي
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      try {
        const storedClasses = localStorage.getItem("last_active_classes");
        if (storedClasses) {
          const parsed = JSON.parse(storedClasses);
          if (Array.isArray(parsed) && parsed.length > 0) setCustomClasses(parsed);
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
          setCustomClasses(teacherClasses);

          if (Array.isArray(data.diaryEntries)) {
            setEntries(data.diaryEntries);
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setMessage({ type: "err", text: "حدث خطأ أثناء تحميل الدفتر" });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // حفظ التعديلات
  const persistEntries = async (newEntries: DailyDiaryEntry[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diaryEntries: newEntries }),
      });
      if (!res.ok) throw new Error("فشل حفظ التعديلات");
      setMessage({ type: "ok", text: "تم تحديث الدفتر اليومي بنجاح 📒" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "err", text: err.message || "فشل حفظ الدفتر" });
    } finally {
      setSaving(false);
    }
  };

  // فتح نافذة تحضير حصة الغد
  const handleOpenAddForTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    setEditingEntry(null);
    setFormDate(dateStr);
    setFormClass(selectedClassFilter !== "all" ? selectedClassFilter : customClasses[0] || "");
    setFormPeriodTime("08:00 - 09:00");
    setFormField("أنشطة عددية");
    setFormSection("");
    setFormLessonTitle("");
    setFormObjectives("");
    setFormActivities("");
    setFormHomework("");
    setFormNotes("");
    setFormIsPublic(true);
    setIsModalOpen(true);
  };

  // فتح نافذة تعديل حصة
  const handleOpenEdit = (entry: DailyDiaryEntry) => {
    setEditingEntry(entry);
    setFormDate(entry.date);
    setFormClass(entry.className);
    setFormPeriodTime(entry.periodTime || "08:00 - 09:00");
    setFormField(entry.field || "أنشطة عددية");
    setFormSection(entry.section || "");
    setFormLessonTitle(entry.lessonTitle);
    setFormObjectives(entry.objectives || "");
    setFormActivities(entry.activities || "");
    setFormHomework(entry.homework || "");
    setFormNotes(entry.notes || "");
    setFormIsPublic(entry.isPublicForParents !== false);
    setIsModalOpen(true);
  };

  // حفظ الحصة
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLessonTitle.trim() || !formDate || !formClass) {
      setMessage({ type: "err", text: "يرجى إدخال عنوان الدرس وتحديد التاريخ والفوج" });
      return;
    }

    // حساب اليوم بالعربية
    const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const dObj = new Date(formDate);
    const dayName = dayNames[dObj.getDay()] || "الأحد";

    let updated: DailyDiaryEntry[];
    if (editingEntry) {
      updated = entries.map((en) =>
        en.id === editingEntry.id
          ? {
              ...en,
              date: formDate,
              day: dayName,
              periodTime: formPeriodTime,
              className: formClass,
              field: formField,
              section: formSection.trim() || undefined,
              lessonTitle: formLessonTitle.trim(),
              objectives: formObjectives.trim() || undefined,
              activities: formActivities.trim() || undefined,
              homework: formHomework.trim() || undefined,
              notes: formNotes.trim() || undefined,
              isPublicForParents: formIsPublic,
            }
          : en
      );
    } else {
      const newEntry: DailyDiaryEntry = {
        id: `diary_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date: formDate,
        day: dayName,
        periodTime: formPeriodTime,
        className: formClass,
        field: formField,
        section: formSection.trim() || undefined,
        lessonTitle: formLessonTitle.trim(),
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
    setIsModalOpen(false);
    await persistEntries(updated);
  };

  // حذف حصة
  const handleDeleteEntry = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف الحصة "${title}"؟`)) return;
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    await persistEntries(updated);
  };

  // تصفية وترتيب الحصص
  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => {
        if (selectedClassFilter !== "all" && e.className !== selectedClassFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchTitle = e.lessonTitle.toLowerCase().includes(q);
          const matchField = (e.field || "").toLowerCase().includes(q);
          const matchClass = e.className.toLowerCase().includes(q);
          return matchTitle || matchField || matchClass;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, selectedClassFilter, searchQuery]);

  // فحص ما إذا كان هناك تحضير لغد
  const tomorrowStr = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().split("T")[0];
  }, []);

  const tomorrowLessons = useMemo(() => {
    return entries.filter((e) => e.date === tomorrowStr);
  }, [entries, tomorrowStr]);

  // قفل تمرير الصفحة عند فتح النافذة
  useEffect(() => {
    if (isModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isModalOpen]);

  if (authenticated === false) {
    return <LoginRequired next="/admin/diary" title="الدفتر اليومي ودفتر النصوص" />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] py-6 sm:py-8 px-4 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* شريط المسار والتنقل */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <Link href="/admin" className="hover:text-gray-900 transition flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              لوحة الأستاذ
            </Link>
            <span>/</span>
            <span className="text-gray-900">الدفتر اليومي ودفتر النصوص</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl border border-[#e8e8e0] bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" />
              <span>طباعة دفتر النصوص</span>
            </button>
            <button
              onClick={handleOpenAddForTomorrow}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تحضير حصة جديدة (ماذا سأدرس غداً)</span>
            </button>
          </div>
        </div>

        {/* دليل الصفحة البيداغوجي */}
        <div className="print:hidden">
          <PageExplainer
            pageId="diary"
            title="الدفتر اليومي ودفتر النصوص (ماذا سأدرس غداً)"
            teacherRoleExplanation="هنا تسجل وتوثق ما ستدرسه غداً لكل فوج، وتحدد المورد المعرفي ومؤشرات الكفاءة والواجب المنزلي، مع إمكانية طباعة دفتر نصوص ورقي جاهز للإدارة والمفتشية بنقرة واحدة."
            parentRoleExplanation="يطلع الولي على عنوان الحصة المحضرة والواجب المنزلي المطلوب من ابنه لمواكبته في البيت (إذا قمت بتفعيل ظهورها للأولياء)."
            inspectorExplanation="يطلع المفتش التربوي على وتيرة إنجاز البرنامج السنوي ومطابقة الموارد المعرفية لمخططات التعلم الرسمية."
          />
        </div>

        {/* تنبيهات النجاح أو الخطأ */}
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

        {/* ترويسة الصفحة الرسمية للطباعة والمعاينة */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e8e8e0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 px-3 py-0.5 rounded-full text-xs font-bold print:hidden">
              <BookOpen className="w-3.5 h-3.5" />
              <span>الدفتر اليومي ودفتر النصوص الرسمي</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              سجل الحصص اليومية وتوثيق التعلمات
            </h1>
            <p className="text-xs text-gray-600 font-medium">
              توثيق الحصص المنجزة والمقبلة، مؤشرات الكفاءة، الواجبات المنزلية، ومخطط سير الحصة للتفتيش والمتابعة.
            </p>
          </div>

          {/* بطاقة ما سيدرسه غداً */}
          <div className="bg-[#fafaf7] border border-[#e8e8e0] rounded-2xl p-3.5 min-w-[200px] text-right space-y-1">
            <span className="text-[11px] font-bold text-gray-500">ماذا ستدرس غداً؟</span>
            {tomorrowLessons.length > 0 ? (
              <div className="space-y-1">
                <span className="text-xs font-black text-[#107a57] block truncate">
                  {tomorrowLessons[0].lessonTitle}
                </span>
                <span className="text-[10px] text-gray-500 font-bold">
                  فوج {tomorrowLessons[0].className} • {tomorrowLessons.length} حصص مقررة
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-xs text-gray-400 block">لم تسجل بعد حصص الغد</span>
                <button
                  onClick={handleOpenAddForTomorrow}
                  className="text-[11px] font-bold text-[#107a57] hover:underline cursor-pointer"
                >
                  + سجّل تحضير الغد الآن
                </button>
              </div>
            )}
          </div>
        </div>

        {/* شريط الفلترة والبحث */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-gray-500 ml-1">تصفية حسب الفوج:</span>
            <button
              onClick={() => setSelectedClassFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedClassFilter === "all"
                  ? "bg-[#107a57] text-white shadow-xs"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-[#e8e8e0]"
              }`}
            >
              الكل ({entries.length})
            </button>
            {customClasses.map((cls) => {
              const count = entries.filter((e) => e.className === cls).length;
              return (
                <button
                  key={cls}
                  onClick={() => setSelectedClassFilter(cls)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    selectedClassFilter === cls
                      ? "bg-[#107a57] text-white shadow-xs"
                      : "bg-white text-gray-600 hover:bg-gray-50 border border-[#e8e8e0]"
                  }`}
                >
                  <span>فوج {cls}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      selectedClassFilter === cls ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">إجمالي الحصص المسجلة:</span>
            <span className="text-xs font-mono font-bold text-gray-900 bg-white px-2 py-1 rounded-lg border border-[#e8e8e0]">
              {filteredEntries.length} حصة
            </span>
          </div>
        </div>

        {/* قائمة بطاقات الحصص في الدفتر */}
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
            <p className="font-bold text-gray-700">لا توجد حصص مسجلة في الدفتر اليومي حالياً</p>
            <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
              ابدأ بتدوين تحضير حصة الغد وتوثيق مراحل الدرس والواجب المنزلي.
            </p>
            <button
              onClick={handleOpenAddForTomorrow}
              className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تحضير حصة الغد</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((item) => {
              const isTomorrow = item.date === tomorrowStr;
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-3xl p-5 sm:p-6 border transition space-y-4 ${
                    isTomorrow
                      ? "border-[#107a57] ring-2 ring-[#107a57]/15 shadow-md"
                      : "border-[#e8e8e0] shadow-sm hover:border-gray-300"
                  }`}
                >
                  {/* رأس بطاقة الحصة */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e8e0] pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isTomorrow && (
                        <span className="text-[10px] font-black text-[#107a57] bg-[#e6f4ee] px-2.5 py-0.5 rounded-full border border-[#107a57]/20">
                          حصة الغد ✨
                        </span>
                      )}
                      <span className="text-xs font-black text-gray-900 bg-[#fafaf7] px-2.5 py-1 rounded-xl border border-[#e8e8e0]">
                        {item.day} {item.date}
                      </span>
                      <span className="text-xs font-mono text-gray-500">{item.periodTime}</span>
                      <span className="text-xs font-bold text-[#107a57] bg-[#e6f4ee] px-2.5 py-0.5 rounded-lg border border-[#107a57]/20">
                        فوج {item.className}
                      </span>
                      {item.field && (
                        <span className="text-xs text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-lg">
                          {item.field}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                      {item.isPublicForParents ? (
                        <span
                          title="ظاهر للأولياء في صفحة الأستاذ"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg"
                        >
                          <Globe className="w-3 h-3" />
                          <span>عام للأولياء</span>
                        </span>
                      ) : (
                        <span
                          title="خاص بالأستاذ فقط"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg"
                        >
                          <Lock className="w-3 h-3" />
                          <span>خاص بالأستاذ</span>
                        </span>
                      )}
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                        title="تعديل الحصة"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(item.id, item.lessonTitle)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="حذف الحصة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* عنوان المورد / الدرس */}
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-black text-gray-900">
                      {item.lessonTitle}
                    </h3>
                    {item.section && (
                      <p className="text-xs font-bold text-gray-500">المقطع التعلمي: {item.section}</p>
                    )}
                  </div>

                  {/* تفاصيل الحصة البيداغوجية */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {item.objectives && (
                      <div className="p-3 rounded-2xl bg-[#fafaf7] border border-[#e8e8e0] space-y-1">
                        <span className="font-bold text-gray-700 block">🎯 مؤشرات الكفاءة والأهداف:</span>
                        <p className="text-gray-600 whitespace-pre-line leading-relaxed">{item.objectives}</p>
                      </div>
                    )}

                    {item.activities && (
                      <div className="p-3 rounded-2xl bg-[#fafaf7] border border-[#e8e8e0] space-y-1">
                        <span className="font-bold text-gray-700 block">📝 سير الأنشطة ومراحل التعلم:</span>
                        <p className="text-gray-600 whitespace-pre-line leading-relaxed">{item.activities}</p>
                      </div>
                    )}

                    {item.homework && (
                      <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                        <span className="font-bold text-amber-900 block">📌 الواجب المنزلي والتوجيهات:</span>
                        <p className="text-amber-800 whitespace-pre-line leading-relaxed">{item.homework}</p>
                      </div>
                    )}

                    {item.notes && (
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
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

        {/* ─── Modal تحضير أو تعديل حصة ─── */}
        {mounted && isModalOpen && createPortal(
          <div className="fixed inset-0 z-[999999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150" dir="rtl">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#e8e8e0] pb-3 shrink-0">
                <div className="space-y-0.5">
                  <h3 className="text-base font-black text-gray-900">
                    {editingEntry ? "تعديل بيانات الحصة" : "تحضير حصة (ماذا سأدرس غداً)"}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    تدوين عناصر دفتر النصوص والتحضير اليومي
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEntry} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-800">
                      تاريخ الحصة <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-mono text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-800">
                      الفوج التربوي <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formClass}
                      onChange={(e) => setFormClass(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                    >
                      {customClasses.map((c) => (
                        <option key={c} value={c}>
                          فوج {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-800">توقيت الحصة</label>
                    <select
                      value={formPeriodTime}
                      onChange={(e) => setFormPeriodTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                    >
                      <option value="08:00 - 09:00">08:00 - 09:00</option>
                      <option value="09:00 - 10:00">09:00 - 10:00</option>
                      <option value="10:00 - 11:00">10:00 - 11:00</option>
                      <option value="11:00 - 12:00">11:00 - 12:00</option>
                      <option value="13:30 - 14:30">13:30 - 14:30</option>
                      <option value="14:30 - 15:30">14:30 - 15:30</option>
                      <option value="15:30 - 16:30">15:30 - 16:30</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-800">الميدان التعلمي</label>
                    <select
                      value={formField}
                      onChange={(e) => setFormField(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                    >
                      {COMMON_FIELDS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                      <option value="أخرى">أخرى / مراجعة</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">
                    عنوان المورد المعرفي / الدرس <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formLessonTitle}
                    onChange={(e) => setFormLessonTitle(e.target.value)}
                    placeholder="مثال: ضرب وقسمة كسرين أو خاصية فيثاغورس"
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">
                    مؤشرات الكفاءة والأهداف التعلمية
                  </label>
                  <textarea
                    rows={2}
                    value={formObjectives}
                    onChange={(e) => setFormObjectives(e.target.value)}
                    placeholder="أن يتعرف التلميذ على...، أن يوظف القاعدة في حل..."
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">
                    سير الأنشطة ومراحل الدرس
                  </label>
                  <textarea
                    rows={2}
                    value={formActivities}
                    onChange={(e) => setFormActivities(e.target.value)}
                    placeholder="وضعية الانطلاق (نشاط 1 ص 24) • بناء التعلمات • الحوصلة..."
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">
                    الواجب المنزلي والتوجيهات
                  </label>
                  <input
                    type="text"
                    value={formHomework}
                    onChange={(e) => setFormHomework(e.target.value)}
                    placeholder="مثال: حل التمرين 14 و 15 ص 30 في كراس الواجبات"
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isPublicCheck"
                    checked={formIsPublic}
                    onChange={(e) => setFormIsPublic(e.target.checked)}
                    className="rounded text-[#107a57] focus:ring-[#107a57]"
                  />
                  <label htmlFor="isPublicCheck" className="text-xs font-bold text-gray-700 cursor-pointer">
                    إتاحة عنوان الدرس والواجب في فضاء الأولياء للاطلاع المباشر 🌐
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e8e8e0]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl border border-[#e8e8e0] text-xs font-bold text-gray-600 hover:bg-gray-100"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingEntry ? "حفظ التعديلات" : "حفظ في الدفتر"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
