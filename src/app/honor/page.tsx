"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useTeacherId, withTeacher, teacherHomeHref, useTeacherInfo, teacherLabel } from "@/lib/teacherParam";
import {
  ArrowRight,
  Trophy,
  Sparkles,
  Search,
  Loader2,
  Plus,
  Trash2,
  Edit3,
  Printer,
  Share2,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  Award,
  Star,
  FileText,
  Copy,
  ChevronDown,
  ChevronUp,
  School,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { HonorStudent, StudentRosterItem, StudentEvaluation } from "@/lib/types";

// أوسمة وألقاب التكريم الرسمية والشرفية
const PRESET_BADGES = [
  { id: "star", label: "🌟 نجم المادة والتفوق", desc: "تحصيل دراسي ممتاز وعلامات كاملة" },
  { id: "notebook", label: "📖 كراس نموذجي منظم", desc: "تنظيم فائق ونظافة واكتمال الدروس" },
  { id: "first", label: "🏆 فارس الفوج الأول", desc: "المرتبة الأولى في القسم والمثابرة" },
  { id: "active", label: "💡 مشاركة وتفاعل إيجابي", desc: "حضور ذهني وإجابات دقيقة على السبورة" },
  { id: "homework", label: "🎯 التزام تام بالواجبات", desc: "حل جميع التمارين والواجبات المنزلية بدقة" },
  { id: "progress", label: "🎖️ مثابرة وتطور ملحوظ", desc: "اجتهاد متواصل وقفزة نوعية في المستوى" },
];

// عبارات تشجيعية جاهزة بنقرة واحدة
const PRESET_NOTES = [
  "ما شاء الله، مواظبة واجتهاد رفيع يستحق كل التقدير والثناء.",
  "كراس نموذجي ونظافة فائقة تعكس حرصاً بيداغوجياً كبيراً.",
  "تألق واضح في حل التمارين ومشاركة صفية متميزة تثري القسم.",
  "إتقان تام للواجبات وحرص دائم على الاستيعاب والفهم.",
  "قفزة نوعية وإرادة فولاذية نحو التفوق والتميز، واصل تألقك!",
];

// دالة حماية خصوصية الأطفال: تحجب اللقب وتُبقي الحرف الأول فقط عند تفعيل الخيار (مثال: يوسف ب.)
function formatStudentDisplayName(fullName: string, mask: boolean): string {
  if (!mask || !fullName) return fullName;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  const firstName = parts[0];
  const lastNameInitial = parts[1][0] || "";
  return `${firstName} ${lastNameInitial}.`;
}

export default function HonorRollPage() {
  const teacherId = useTeacherId();
  const teacherInfo = useTeacherInfo(teacherId);

  // حالة المصادقة
  const [isTeacher, setIsTeacher] = useState<boolean>(false);
  const [profile, setProfile] = useState<any>(null);

  // بيانات لوحة الشرف والتلاميذ
  const [honors, setHonors] = useState<HonorStudent[]>([]);
  const [classesList, setClassesList] = useState<string[]>([]);
  const [studentRoster, setStudentRoster] = useState<StudentRosterItem[]>([]);
  const [evaluations, setEvaluations] = useState<StudentEvaluation[]>([]);

  // الفلاتر والبحث
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [urlLvl, setUrlLvl] = useState<string | null>(null);

  // لوحة تحكم الأستاذ لتحديد وتكريم النوابغ
  const [showTeacherPanel, setShowTeacherPanel] = useState<boolean>(true);
  const [formClass, setFormClass] = useState<string>("");
  const [formStudentName, setFormStudentName] = useState<string>("");
  const [formBadge, setFormBadge] = useState<string>(PRESET_BADGES[0].label);
  const [formNotes, setFormNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // وضع التعديل
  const [editingHonorId, setEditingHonorId] = useState<string | null>(null);

  // نافذة الاستيراد السريع من سجل التقويم (النوابغ الحاصلين على ممتاز)
  const [showAssessmentModal, setShowAssessmentModal] = useState<boolean>(false);
  const [selectedAssessmentStudents, setSelectedAssessmentStudents] = useState<Set<string>>(new Set());

  // شهادة التقدير القابلة للطباعة (Certificate Modal)
  const [certificateStudent, setCertificateStudent] = useState<HonorStudent | null>(null);

  // إشعار سريع Toast
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // وضع حماية خصوصية الأطفال (إخفاء اللقب: يوسف ب.)
  const [maskLastName, setMaskLastName] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("jusoor_mask_honor_names");
      if (saved === "true") setMaskLastName(true);
    }
  }, []);

  const toggleMaskLastName = () => {
    setMaskLastName((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("jusoor_mask_honor_names", String(next));
      }
      return next;
    });
  };

  const formRef = useRef<HTMLDivElement>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const lvl = new URLSearchParams(window.location.search).get("lvl");
      if (lvl) setUrlLvl(lvl);
    }

    // التحقق من جلسة الأستاذ
    fetch("/api/auth")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated) {
          setIsTeacher(true);
          setProfile(d.profile || d.user);
        }
      })
      .catch(() => {});

    fetchHonors();
  }, []);

  const fetchHonors = async () => {
    try {
      setLoading(true);
      const res = await fetch(withTeacher(`/api/honors?t=${Date.now()}`), {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data = await res.json();
      const honorsData: HonorStudent[] = Array.isArray(data.honors) ? data.honors : [];
      setHonors(honorsData);

      if (Array.isArray(data.studentRoster)) setStudentRoster(data.studentRoster);
      if (Array.isArray(data.evaluations)) setEvaluations(data.evaluations);

      let allCls: string[] = [];
      if (Array.isArray(data.customClasses) && data.customClasses.length > 0) {
        allCls = data.customClasses;
      } else {
        const setCls = new Set<string>();
        honorsData.forEach((h) => h.className && setCls.add(h.className));
        if (Array.isArray(data.studentRoster)) {
          data.studentRoster.forEach((r: any) => r.className && setCls.add(r.className));
        }
        allCls = Array.from(setCls);
      }

      setClassesList(allCls);
      if (allCls.length > 0 && !formClass) {
        setFormClass(allCls[0]);
      }
    } catch (e) {
      console.error("Error fetching honors:", e);
    } finally {
      setLoading(false);
    }
  };

  const normalizeClass = (c?: string) => (c ? c.replace(/\s+/g, "").trim() : "");

  // قائمة تلاميذ الفوج المختار في نموذج التكريم
  const availableRosterStudents = useMemo(() => {
    if (!formClass) return [];
    const norm = normalizeClass(formClass);
    const inClass = studentRoster.filter((s) => normalizeClass(s.className) === norm);
    return inClass.sort((a, b) => (a.studentName || "").localeCompare(b.studentName || "", "ar"));
  }, [studentRoster, formClass]);

  // قائمة التلاميذ الحاصلين على ممتاز من سجل التقويم
  const excellentStudents = useMemo(() => {
    return evaluations.filter((e) => {
      const isExcellent = e.rating === "excellent" || (typeof e.totalScore === "number" && e.totalScore >= 17);
      const isAlreadyHonored = honors.some(
        (h) => h.studentName.trim().toLowerCase() === e.studentName.trim().toLowerCase() &&
               normalizeClass(h.className) === normalizeClass(e.className)
      );
      return isExcellent && !isAlreadyHonored;
    });
  }, [evaluations, honors]);

  // فلترة وتصفية لوحة الشرف
  const filteredHonors = useMemo(() => {
    return honors.filter((item) => {
      if (urlLvl) {
        const clsNorm = normalizeClass(item.className);
        const matchesLevel = clsNorm.startsWith(urlLvl) || clsNorm.includes(`${urlLvl}م`) || clsNorm.includes(urlLvl);
        if (!matchesLevel) return false;
      }
      const matchesClass =
        selectedClass === "all" ||
        normalizeClass(item.className) === normalizeClass(selectedClass);
      const matchesSearch =
        !search.trim() ||
        item.studentName.toLowerCase().includes(search.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(search.toLowerCase())) ||
        (item.badge && item.badge.toLowerCase().includes(search.toLowerCase()));
      return matchesClass && matchesSearch;
    });
  }, [honors, urlLvl, selectedClass, search]);

  const getClassCount = (cls: string) => {
    if (cls === "all") return filteredHonors.length;
    return filteredHonors.filter((h) => normalizeClass(h.className) === normalizeClass(cls)).length;
  };

  // حفظ التكريم (إضافة أو تعديل)
  const handleSaveHonor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudentName.trim()) {
      showToast("err", "يرجى تحديد أو كتابة اسم التلميذ");
      return;
    }
    if (!formClass.trim()) {
      showToast("err", "يرجى تحديد الفوج (القسم)");
      return;
    }

    setSubmitting(true);
    try {
      if (editingHonorId) {
        const res = await fetch("/api/honors", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingHonorId,
            studentName: formStudentName.trim(),
            className: formClass.trim(),
            badge: formBadge.trim(),
            notes: formNotes.trim(),
          }),
        });
        if (!res.ok) throw new Error("تعذر تعديل التلميذ");
        showToast("ok", "تم تعديل بيانات التلميذ بنجاح ✨");
      } else {
        const res = await fetch("/api/honors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName: formStudentName.trim(),
            className: formClass.trim(),
            badge: formBadge.trim(),
            notes: formNotes.trim(),
          }),
        });
        if (!res.ok) throw new Error("تعذر إضافة التلميذ إلى لوحة الشرف");
        showToast("ok", `تم تكريم التلميذ "${formStudentName.trim()}" وإدراجه في لوحة الشرف 🏆`);
      }

      // تفريغ الحقول وإعادة التحميل
      handleCancelEdit();
      await fetchHonors();
    } catch (err: any) {
      showToast("err", err.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSubmitting(false);
    }
  };

  // بدء تعديل تلميذ
  const handleStartEdit = (item: HonorStudent) => {
    setEditingHonorId(item.id);
    setFormStudentName(item.studentName);
    setFormClass(item.className);
    setFormBadge(item.badge || PRESET_BADGES[0].label);
    setFormNotes(item.notes || "");
    setShowTeacherPanel(true);

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCancelEdit = () => {
    setEditingHonorId(null);
    setFormStudentName("");
    setFormNotes("");
    setFormBadge(PRESET_BADGES[0].label);
  };

  // حذف تلميذ من لوحة الشرف
  const handleDeleteHonor = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في إزالة "${name}" من لوحة الشرف؟`)) return;
    try {
      const res = await fetch(`/api/honors?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("تعذر حذف التلميذ");
      showToast("ok", `تمت إزالة "${name}" من لوحة الشرف`);
      setHonors((prev) => prev.filter((h) => h.id !== id));
      if (editingHonorId === id) handleCancelEdit();
    } catch (err: any) {
      showToast("err", err.message || "فشل الحذف");
    }
  };

  // تكريم جماعي للنوابغ الحاصلين على ممتاز
  const handleBatchHonorAssessment = async () => {
    if (selectedAssessmentStudents.size === 0) {
      showToast("err", "يرجى تحديد تلميذ واحد على الأقل");
      return;
    }

    setSubmitting(true);
    try {
      const candidates = excellentStudents.filter((e) => selectedAssessmentStudents.has(e.id));
      const items = candidates.map((c) => ({
        studentName: c.studentName,
        className: c.className,
        badge: "🌟 نجم المادة والتفوق",
        notes: `نال تقدير ممتاز (${c.totalScore || 20}/20) في ميثاق التقويم المستمر ومواظبة استثنائية.`,
      }));

      const res = await fetch("/api/honors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("تعذر إدراج التلاميذ");

      showToast("ok", `تم تكريم وإدراج ${items.length} تلميذ نابغة في لوحة الشرف بنجاح 🏆`);
      setShowAssessmentModal(false);
      setSelectedAssessmentStudents(new Set());
      await fetchHonors();
    } catch (err: any) {
      showToast("err", err.message || "فشل التكريم الجماعي");
    } finally {
      setSubmitting(false);
    }
  };

  // مشاركة بطاقة التكريم عبر واتساب أو تليغرام
  const handleShareHonor = (item: HonorStudent) => {
    const displayName = formatStudentDisplayName(item.studentName, maskLastName);
    const text = `🎉 تهنئة وتكريم رسمي:
يسرّنا أن نبارك للتلميذ(ة) المتميز(ة):
⭐ ${displayName} ⭐
من قسم: ${item.className}
تتويجه بلقب: «${item.badge || "نجم التفوق والاجتهاد"}»
وإدراجه في لوحة الشرف الرسمية للمؤسسة.
${item.notes ? `💬 كلمة الأستاذ: «${item.notes}»\n` : ""}
رابط لوحة الشرف: ${window.location.href}`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    showToast("ok", `تم نسخ بطاقة تكريم "${displayName}" لمشاركتها مع الولي ✨`);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const backHref = teacherHomeHref(teacherId) + (urlLvl ? `?lvl=${urlLvl}` : "");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans py-6 px-3 sm:px-4" dir="rtl">
      {/* ── إشعار Toast عائم ── */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-2 px-5 py-2.5 rounded-2xl shadow-xl text-xs font-black transition-all animate-in fade-in duration-150 ${
            toast.type === "ok" ? "bg-emerald-700 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto pb-16 space-y-4 sm:space-y-5">
        {/* ── رأس الصفحة والهوية ── */}
        <div className="flex items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={backHref}
              className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition shrink-0"
              aria-label="الرجوع"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  لوحة الشرف وتكريم النوابغ
                </h1>
                <span className="text-amber-500 text-base">✨</span>
                {urlLvl && (
                  <span className="text-[10px] bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded-full border border-amber-300">
                    السنة {urlLvl} متوسط ⭐
                  </span>
                )}
                {isTeacher && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 font-black px-2 py-0.5 rounded-full border border-emerald-300">
                    حساب الأستاذ
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-bold truncate">
                {teacherLabel(teacherInfo)}
              </p>
            </div>
          </div>

          {/* تبديل إظهار لوحة تحكم الأستاذ */}
          {isTeacher && (
            <button
              type="button"
              onClick={() => setShowTeacherPanel(!showTeacherPanel)}
              className="px-3 py-2 rounded-xl bg-[#107a57] hover:bg-[#0c5c41] text-white text-xs font-black transition flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
            >
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">{showTeacherPanel ? "إخفاء لوحة التحكم" : "تكريم تلميذ جديد"}</span>
              <span className="sm:hidden">تكريم</span>
              {showTeacherPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            لوحة تحكم الأستاذ: كيف أحدد وأضيف إلى لوحة الشرف
            ════════════════════════════════════════════════════════════════ */}
        {isTeacher && showTeacherPanel && (
          <div
            ref={formRef}
            className={`bg-white rounded-3xl border transition-all duration-200 shadow-sm overflow-hidden ${
              editingHonorId ? "border-amber-400 ring-4 ring-amber-100" : "border-emerald-300/80"
            }`}
          >
            {/* رأس اللوحة */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${
              editingHonorId ? "bg-amber-50/80 border-amber-200" : "bg-emerald-50/60 border-emerald-100"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-2xs ${
                  editingHonorId ? "bg-amber-600 text-white" : "bg-[#107a57] text-white"
                }`}>
                  {editingHonorId ? <Edit3 className="w-5 h-5" /> : <Trophy className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-1.5">
                    <span>{editingHonorId ? "تعديل بيانات التلميذ المكرّم" : "تحديد وتكريم تلميذ في لوحة الشرف"}</span>
                    {editingHonorId && (
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                        تعديل
                      </span>
                    )}
                  </h2>
                  <p className="text-[11px] text-gray-500 font-medium">
                    اختر الفوج ثم حدد التلميذ ولقب التكريم لنشره فوراً في لوحة الشرف وطباعة شهادته.
                  </p>
                </div>
              </div>

              {/* زر الاستيراد السريع من سجل التقويم */}
              {excellentStudents.length > 0 && !editingHonorId && (
                <button
                  type="button"
                  onClick={() => setShowAssessmentModal(true)}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-black transition flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">ترشيح النوابغ من التقويم ({excellentStudents.length})</span>
                  <span className="sm:hidden">نوابغ التقويم ({excellentStudents.length})</span>
                </button>
              )}
            </div>

            {/* النموذج */}
            <form onSubmit={handleSaveHonor} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. اختيار الفوج */}
                <div>
                  <label className="block text-xs font-black text-gray-900 mb-1">
                    1. اختر الفوج (القسم) *
                  </label>
                  {classesList.length > 0 ? (
                    <select
                      value={formClass}
                      onChange={(e) => {
                        setFormClass(e.target.value);
                        setFormStudentName("");
                      }}
                      className="w-full py-2.5 px-3 rounded-xl border border-gray-300 bg-slate-50 text-xs font-bold text-gray-800 focus:bg-white focus:outline-none focus:border-[#107a57]"
                    >
                      {classesList.map((cls) => (
                        <option key={cls} value={cls}>
                          قسم: {cls}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="مثال: 1م1 أو 2م3..."
                      value={formClass}
                      onChange={(e) => setFormClass(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:border-[#107a57]"
                    />
                  )}
                </div>

                {/* 2. اختيار أو كتابة اسم التلميذ */}
                <div>
                  <label className="block text-xs font-black text-gray-900 mb-1 flex items-center justify-between">
                    <span>2. اسم التلميذ النجيب *</span>
                    {availableRosterStudents.length > 0 && (
                      <span className="text-[10px] text-[#107a57] font-bold">
                        ({availableRosterStudents.length} تلميذ مسجل بالفوج)
                      </span>
                    )}
                  </label>

                  {availableRosterStudents.length > 0 ? (
                    <div className="space-y-1.5">
                      <select
                        value={formStudentName}
                        onChange={(e) => setFormStudentName(e.target.value)}
                        className="w-full py-2.5 px-3 rounded-xl border border-emerald-300 bg-emerald-50/30 text-xs font-black text-gray-900 focus:bg-white focus:outline-none focus:border-[#107a57]"
                      >
                        <option value="">-- اختر التلميذ من قائمة الفوج --</option>
                        {availableRosterStudents.map((s) => (
                          <option key={s.id} value={s.studentName}>
                            {s.studentName} {s.groupName ? `(${s.groupName})` : ""}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="أو اكتب اسماً يدوياً إذا لم يكن بالقائمة..."
                        value={formStudentName}
                        onChange={(e) => setFormStudentName(e.target.value)}
                        className="w-full py-1.5 px-3 rounded-xl border border-gray-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-[#107a57]"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="اكتب اسم ولقب التلميذ كاملاً..."
                      value={formStudentName}
                      onChange={(e) => setFormStudentName(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl border border-gray-300 text-xs font-bold focus:outline-none focus:border-[#107a57]"
                    />
                  )}
                </div>
              </div>

              {/* 3. اختيار اللقب والوسام الشرفي */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <label className="block text-xs font-black text-gray-900">
                  3. لقب ووسام التكريم:
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_BADGES.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setFormBadge(b.label)}
                      className={`p-2 rounded-xl border text-right transition cursor-pointer flex flex-col gap-0.5 ${
                        formBadge === b.label
                          ? "bg-amber-50 border-amber-400 text-amber-900 font-black shadow-2xs ring-2 ring-amber-200"
                          : "bg-white hover:bg-slate-50 border-gray-200 text-gray-700"
                      }`}
                    >
                      <span className="text-xs font-bold">{b.label}</span>
                      <span className="text-[10px] text-gray-500 leading-tight">{b.desc}</span>
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="أو اكتب لقباً مخصصاً (مثال: بطل الأولمبياد، عبقري الحساب...)"
                  value={formBadge}
                  onChange={(e) => setFormBadge(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:border-[#107a57] font-bold"
                />
              </div>

              {/* 4. كلمة شكر وتشجيع من الأستاذ */}
              <div className="space-y-1.5 pt-1 border-t border-gray-100">
                <label className="block text-xs font-black text-gray-900">
                  4. كلمة شكر وثناء من الأستاذ (تظهر في البطاقة والشهادة):
                </label>
                <textarea
                  rows={2}
                  placeholder="اكتب عبارة تحفيزية للتلميذ وولي أمره..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:border-[#107a57]"
                />

                {/* مقترحات عبارات سريعة */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-gray-400 font-bold">اقتراحات سريعة:</span>
                  {PRESET_NOTES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormNotes(preset)}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-900 border border-slate-200 transition cursor-pointer truncate max-w-xs"
                      title={preset}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* زر الحفظ */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                {editingHonorId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                  >
                    إلغاء التعديل
                  </button>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2.5 px-6 font-black shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : editingHonorId ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>حفظ تعديلات التكريم</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-4 h-4" />
                      <span>إدراج التلميذ في لوحة الشرف الآن</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── بنر شرفي تحفيزي ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-5 text-white shadow-md border border-slate-800">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-xs font-black border border-amber-300/30">
              <Trophy className="w-3.5 h-3.5" />
              <span>فرسان التفوق والاجتهاد</span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
              هنا يُكرَّم المثابرون وأصحاب الهمم العالية
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl font-medium">
              لوحة شرفية تتجدد دورياً تثميناً لجهود التلاميذ المتميزين في التحصيل الدراسي، تنظيم الكراريس، وإنجاز الواجبات بدقة.
            </p>
          </div>
        </div>

        {/* ── فلاتر الأقسام والبحث ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {classesList.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedClass("all")}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                    selectedClass === "all"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  جميع الأفواج ({getClassCount("all")})
                </button>
                {classesList.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                      selectedClass === cls
                        ? "bg-amber-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cls} ({getClassCount(cls)})
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleMaskLastName}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer shrink-0 ${
                  maskLastName
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-200"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
                title="حماية خصوصية الأطفال عبر الإنترنت بحجب اللقب والاكتفاء بالحرف الأول (مثال: يوسف ب.)"
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${maskLastName ? "text-emerald-600" : "text-slate-400"}`} />
                <span>{maskLastName ? "حماية اللقب: مفعلة (يوسف ب.)" : "حماية خصوصية اللقب"}</span>
              </button>

              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 py-2 pr-9 pl-3 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  placeholder="ابحث باسم التلميذ أو الفوج..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── بطاقات المكرمين في لوحة الشرف ── */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2 bg-white rounded-3xl border border-slate-100">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
              <p className="text-xs font-bold text-slate-500">جاري تحميل لوحة الشرف...</p>
            </div>
          ) : filteredHonors.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-2 shadow-2xs">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl">
                🌟
              </div>
              <div className="text-sm font-black text-slate-800">
                {search ? "لا توجد نتائج مطابقة لبحثك" : "لم يتم إدراج تلاميذ في لوحة الشرف لهذا الفوج بعد"}
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {isTeacher
                  ? "استخدم لوحة التحكم بالأعلى لتكريم نوابغ القسم ومنحهم أوسمة الشرف وطباعة شهادات التقدير."
                  : "سيقوم الأستاذ بإضافة أسماء النوابغ والمتميزين فور الانتهاء من تقييم الحصص والفروض إن شاء الله."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredHonors.map((item) => (
                <div
                  key={item.id}
                  className="relative bg-white rounded-3xl p-4 border border-amber-200/80 shadow-2xs hover:border-amber-400 hover:shadow-sm transition group overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-400 via-emerald-500 to-amber-500 opacity-90" />

                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center text-xl font-black shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        ⭐
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <h3 className="text-sm font-black text-slate-900 truncate">
                            {formatStudentDisplayName(item.studentName, maskLastName)}
                          </h3>
                          <span className="text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg shrink-0">
                            {item.className}
                          </span>
                        </div>

                        {item.badge && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-black bg-amber-50 text-amber-900 border border-amber-200/80 px-2.5 py-0.5 rounded-lg">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{item.badge}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 leading-relaxed font-medium">
                        💬 «{item.notes}»
                      </p>
                    )}
                  </div>

                  {/* شريط الإجراءات: طباعة الشهادة، المشاركة، والتعديل */}
                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* زر طباعة شهادة التقدير الرسمية A4 */}
                      <button
                        type="button"
                        onClick={() => setCertificateStudent(item)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="طباعة شهادة شكر وتقدير رسمية لهذا التلميذ"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-700" />
                        <span>شهادة التقدير</span>
                      </button>

                      {/* زر مشاركة التكريم مع الولي */}
                      <button
                        type="button"
                        onClick={() => handleShareHonor(item)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="نسخ بطاقة التكريم للمشاركة في واتساب"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
                        <span className="hidden sm:inline">{copiedId === item.id ? "تم النسخ!" : "مشاركة للولي"}</span>
                      </button>
                    </div>

                    {/* أزرار الأستاذ: تعديل وحذف */}
                    {isTeacher && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                          title="تعديل"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHonor(item.id, item.studentName)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition cursor-pointer"
                          title="حذف من لوحة الشرف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          نافذة الاستيراد السريع للنوابغ من سجل التقويم المستمر
          ════════════════════════════════════════════════════════════════ */}
      {showAssessmentModal && (
        <div className="fixed inset-0 z-[999999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                  ⭐
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">ترشيح النوابغ من سجل التقويم المستمر</h3>
                  <p className="text-[11px] text-gray-500">التلاميذ الحاصلون على أعلى الدرجات (18-20/20) غير المدرجين بعد</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssessmentModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-xs">
                <span className="font-bold text-gray-700">حدد التلاميذ المراد تكريمهم:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedAssessmentStudents.size === excellentStudents.length) {
                      setSelectedAssessmentStudents(new Set());
                    } else {
                      setSelectedAssessmentStudents(new Set(excellentStudents.map((e) => e.id)));
                    }
                  }}
                  className="text-[#107a57] font-black hover:underline cursor-pointer"
                >
                  {selectedAssessmentStudents.size === excellentStudents.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
                </button>
              </div>

              {excellentStudents.map((st) => {
                const isSelected = selectedAssessmentStudents.has(st.id);
                return (
                  <label
                    key={st.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                      isSelected ? "bg-emerald-50/80 border-[#107a57] ring-1 ring-[#107a57]" : "bg-white border-gray-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const next = new Set(selectedAssessmentStudents);
                          if (e.target.checked) next.add(st.id);
                          else next.delete(st.id);
                          setSelectedAssessmentStudents(next);
                        }}
                        className="w-4 h-4 rounded text-[#107a57] focus:ring-[#107a57]"
                      />
                      <div>
                        <span className="block text-xs font-black text-gray-900">{st.studentName}</span>
                        <span className="block text-[10px] text-gray-500">قسم: {st.className}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      {st.totalScore || 20} / 20
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 font-bold">
                تم تحديد ({selectedAssessmentStudents.size}) تلميذ
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssessmentModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={submitting || selectedAssessmentStudents.size === 0}
                  onClick={handleBatchHonorAssessment}
                  className="btn-primary text-xs py-2 px-5 font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                  <span>تكريم المحدد في لوحة الشرف</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          نافذة وعارض شهادة الشكر والتقدير الرسمية A4 القابلة للطباعة
          ════════════════════════════════════════════════════════════════ */}
      {certificateStudent && (
        <div className="fixed inset-0 z-[9999999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-150">
            {/* شريط الإجراءات العلوي للشهادة (لا يظهر عند الطباعة) */}
            <div className="p-4 border-b border-gray-200 bg-slate-50 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-black text-gray-900">معاينة شهادة الشكر والتقدير الرسمية (A4)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#107a57] hover:bg-[#0c5c41] text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الشهادة الآن 🖨️</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCertificateStudent(null)}
                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ورقة الشهادة الشرفية الفخمة (جاهزة للطباعة القياسية A4) */}
            <div className="p-6 sm:p-10 bg-white print:p-8 space-y-6 text-center border-8 border-double border-amber-600/40 m-3 sm:m-4 rounded-2xl relative overflow-hidden shadow-inner">
              {/* زخرفة زوايا الشهادة */}
              <div className="absolute top-2 right-2 text-amber-500/30 text-2xl font-serif">❖</div>
              <div className="absolute top-2 left-2 text-amber-500/30 text-2xl font-serif">❖</div>
              <div className="absolute bottom-2 right-2 text-amber-500/30 text-2xl font-serif">❖</div>
              <div className="absolute bottom-2 left-2 text-amber-500/30 text-2xl font-serif">❖</div>

              {/* ترويسة الشهادة الرسمية */}
              <div className="space-y-1 text-xs text-gray-700 font-bold border-b border-amber-200/80 pb-4">
                <p className="font-black text-slate-800">الجمهورية الجزائرية الديمقراطية الشعبية</p>
                <p>وزارة التربية الوطنية</p>
                <div className="flex items-center justify-between text-[11px] pt-1 text-gray-600 font-medium px-4">
                  <span>مديرية التربية لولاية {profile?.wilaya || "الوادي"}</span>
                  <span>متوسطة: {profile?.school || "المتوسطة"}</span>
                  <span>الموسم الدراسي: 2025 / 2026</span>
                </div>
              </div>

              {/* عنوان الشهادة البارز */}
              <div className="space-y-2 py-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md text-2xl">
                  🏆
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-wide font-serif">
                  شهادة شكر وتقدير وتفوق
                </h2>
                <p className="text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 inline-block px-4 py-1 rounded-full">
                  لوحة الشرف وتكريم النوابغ
                </p>
              </div>

              {/* نص الشهادة */}
              <div className="space-y-4 max-w-xl mx-auto py-2">
                <p className="text-sm leading-relaxed text-slate-700 font-medium">
                  يسرّ الأستاذ(ة): <strong className="text-slate-950 font-black">{teacherLabel(teacherInfo)}</strong>
                  <br />
                  أن يمنح هذه الشهادة التقديرية الشرفية للتلميذ(ة) النجيب(ة):
                </p>

                <div className="py-2.5 px-6 rounded-2xl bg-amber-50/70 border-2 border-dashed border-amber-400 inline-block shadow-2xs">
                  <span className="text-xl sm:text-2xl font-black text-[#107a57] tracking-wide font-serif">
                    {certificateStudent.studentName}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-700">
                  من قسم: <strong className="text-slate-900 font-black text-sm">{certificateStudent.className}</strong>
                  <br />
                  نظير اجتهاده المستمر وتألقه المستحق بلقب:
                </p>

                <div className="inline-block px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border border-amber-300 text-xs font-black text-amber-950">
                  {certificateStudent.badge || "🌟 نجم المادة والتفوق"}
                </div>

                {certificateStudent.notes && (
                  <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 max-w-md mx-auto">
                    «{certificateStudent.notes}»
                  </p>
                )}

                <p className="text-[11px] text-slate-500 font-bold pt-1">
                  مع تمنياتنا القلبية بدوام التألق والنجاح في مساره الدراسي.
                </p>
              </div>

              {/* إمضاءات الشهادة */}
              <div className="pt-6 border-t border-amber-200/80 flex items-center justify-between text-xs font-black text-slate-800 px-6 sm:px-12">
                <div className="text-center space-y-8">
                  <span>ختم وإمضاء الأستاذ</span>
                  <div className="text-[10px] text-gray-400 font-normal font-mono">
                    {new Date().toLocaleDateString("ar-DZ")}
                  </div>
                </div>

                <div className="text-center space-y-8">
                  <span>ختم وتوقيع مدير المؤسسة</span>
                  <div className="w-24 border-b border-dashed border-gray-300 mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
