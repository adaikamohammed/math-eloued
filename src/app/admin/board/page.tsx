"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  BookOpen,
  Camera,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Layers,
  Search,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ExternalLink,
  Share2,
  Eye,
  Maximize2,
  X,
  FileText,
  Clock,
  Sparkles,
  Users,
  Copy,
  Check,
  School,
  Download,
  RotateCw,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { PageExplainer } from "@/components/PageExplainer";
import {
  Lesson,
  LessonImage,
  NotebookType,
  LEVELS,
  LessonsData,
} from "@/lib/types";
import { compressIfImage, validateUpload } from "@/lib/compress";

const LOCAL_STORAGE_CLASSES_KEYS = ["last_active_classes", "math_custom_classes"];

// الميادين والمقاطع البيداغوجية الرسمية لبرنامج الرياضيات في التعليم المتوسط
const CURRICULUM_PRESETS = [
  {
    field: "أنشطة عددية",
    sections: [
      "المقطع 1: الأعداد الطبيعية والأعداد العشرية",
      "المقطع 2: الكسور والعمليات عليها",
      "المقطع 3: الأعداد النسبية والحساب الحرفي",
      "المقطع 4: المعادلات وترييض المشكلات",
    ],
  },
  {
    field: "أنشطة هندسية",
    sections: [
      "المقطع 1: التوازي والتعامد والأشكال المستوية",
      "المقطع 2: التناظر المحوري والمركزي",
      "المقطع 3: المثلثات والدائرة وخاصية فيثاغورس",
      "المقطع 4: المجسمات والحجوم والمساحات",
    ],
  },
  {
    field: "تنظيم معطيات ودوال",
    sections: [
      "المقطع 1: التناسبية والنسبة المئوية",
      "المقطع 2: تنظيم المعطيات والإحصاء",
      "المقطع 3: الدوال الخطية والتآلفية",
    ],
  },
];

export default function AdminBoardPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [customClasses, setCustomClasses] = useState<string[]>([]);

  // الفلاتر والبحث
  const [selectedLevel, setSelectedLevel] = useState<number | "all">("all");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // حالة النافذة المنبثقة لإضافة/تعديل درس سبورة
  const [showModal, setShowModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const teacherLevels = useMemo(() => {
    if (Array.isArray(profile?.levels_taught) && profile.levels_taught.length > 0) {
      return (profile.levels_taught as number[]).filter((l) => [1, 2, 3, 4].includes(l));
    }
    return [1, 2, 3, 4];
  }, [profile]);

  // حقول نموذج الدرس
  const [formLevel, setFormLevel] = useState<number>(1);
  const [formType, setFormType] = useState<NotebookType>("lessons");
  const [formTitle, setFormTitle] = useState("");
  const [formField, setFormField] = useState("أنشطة عددية");
  const [formSection, setFormSection] = useState("المقطع 1: الأعداد الطبيعية والأعداد العشرية");
  const [formNumber, setFormNumber] = useState<number>(1);
  const [formNotes, setFormNotes] = useState("");
  const [formHomeworkNotes, setFormHomeworkNotes] = useState("");
  const [formHomeworkDueAt, setFormHomeworkDueAt] = useState("");
  const [formSolutionPublishAt, setFormSolutionPublishAt] = useState("");

  // رفع الصور
  const [boardFiles, setBoardFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  // معاينة الصورة بحجم كامل (Lightbox)
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // إشعار سريع Toast
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mounted, setMounted] = useState(false);

  // التحقق الأولي الفوري (0ms) من الجلسة والتخزين المحلي
  useEffect(() => {
    setMounted(true);

    if (typeof window !== "undefined") {
      try {
        for (const k of LOCAL_STORAGE_CLASSES_KEYS) {
          const val = localStorage.getItem(k);
          if (val) {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCustomClasses(parsed);
              break;
            }
          }
        }
      } catch {}
    }

    // التحقق من الجلسة عبر /api/auth
    fetch("/api/auth")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated) {
          setAuthenticated(true);
          const p = d.profile || d.user;
          setProfile(p);
          if (p?.levels_taught?.length > 0) {
            setFormLevel(p.levels_taught[0]);
          }
        } else {
          setAuthenticated(false);
        }
      })
      .catch(() => setAuthenticated(false));

    loadLessons();
  }, []);

  // قفل تمرير الصفحة أثناء فتح النافذة أو عارض الصور
  useEffect(() => {
    if (showModal || Boolean(lightboxImg)) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [showModal, lightboxImg]);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // تحميل البيانات
  const loadLessons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/lessons", { cache: "no-store" });
      if (!res.ok) throw new Error("تعذر جلب الدروس");
      const data: LessonsData = await res.json();
      setLessons(data.lessons || []);
      if (Array.isArray(data.customClasses) && data.customClasses.length > 0) {
        setCustomClasses(data.customClasses);
      }
    } catch (err: any) {
      console.error(err);
      showToast("err", err.message || "حدث خطأ أثناء تحميل الدروس");
    } finally {
      setLoading(false);
    }
  }, []);

  // فلترة الدروس
  const filteredLessons = useMemo(() => {
    return lessons
      .filter((l) => {
        if (selectedLevel !== "all" && l.level !== selectedLevel) return false;
        if (selectedType !== "all") {
          const t = l.type || "lessons";
          if (t !== selectedType) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (l.title || "").toLowerCase().includes(q);
          const matchField = (l.field || "").toLowerCase().includes(q);
          const matchSection = (l.section || "").toLowerCase().includes(q);
          const matchNotes = (l.notes || "").toLowerCase().includes(q);
          if (!matchTitle && !matchField && !matchSection && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => b.number - a.number || (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [lessons, selectedLevel, selectedType, searchQuery]);

  // إحصائيات كراس الدروس
  const stats = useMemo(() => {
    let boardImagesCount = 0;
    let homeworkCount = 0;
    lessons.forEach((l) => {
      if (l.images) boardImagesCount += l.images.length;
      if (l.homeworkNotes || l.homeworkDueAt) homeworkCount++;
    });
    return {
      totalLessons: lessons.length,
      boardImagesCount,
      homeworkCount,
    };
  }, [lessons]);

  // فتح نافذة الإضافة
  const openAddModal = () => {
    setEditingLesson(null);
    setFormTitle("");
    const maxNum = lessons.length ? Math.max(...lessons.map((l) => l.number || 0)) + 1 : 1;
    setFormNumber(maxNum);
    setFormNotes("");
    setFormHomeworkNotes("");
    setFormHomeworkDueAt("");
    setFormSolutionPublishAt("");
    setBoardFiles([]);
    setShowModal(true);
  };

  // فتح نافذة التعديل
  const openEditModal = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormLevel(lesson.level);
    setFormType(lesson.type || "lessons");
    setFormTitle(lesson.title || "");
    setFormField(lesson.field || "أنشطة عددية");
    setFormSection(lesson.section || "");
    setFormNumber(lesson.number || 1);
    setFormNotes(lesson.notes || "");
    setFormHomeworkNotes(lesson.homeworkNotes || "");
    setFormHomeworkDueAt(lesson.homeworkDueAt || "");
    setFormSolutionPublishAt(lesson.solutionPublishAt || "");
    setBoardFiles([]);
    setShowModal(true);
  };

  // معالجة اختيار ملفات السبورة
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const rawList = Array.from(e.target.files);
    const validCompressed: File[] = [];

    for (const file of rawList) {
      const err = validateUpload(file);
      if (err) {
        showToast("err", `${file.name}: ${err}`);
        continue;
      }
      try {
        const compressed = await compressIfImage(file);
        validCompressed.push(compressed);
      } catch {
        validCompressed.push(file);
      }
    }

    setBoardFiles((prev) => [...prev, ...validCompressed]);
    e.target.value = "";
  };

  const removeSelectedFile = (idx: number) => {
    setBoardFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // حفظ الدرس ورفع الصور
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("err", "يرجى كتابة عنوان المورد / الدرس");
      return;
    }

    setSubmitting(true);
    setUploadProgress(15);
    setUploadStatus("جارٍ حفظ بيانات الدرس...");

    try {
      let currentLessonId: string;

      if (editingLesson) {
        currentLessonId = editingLesson.id;
        const res = await fetch(`/api/lessons/${editingLesson.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: formLevel,
            type: formType,
            title: formTitle.trim(),
            field: formField.trim(),
            section: formSection.trim(),
            number: formNumber,
            notes: formNotes.trim(),
            homeworkNotes: formHomeworkNotes.trim(),
            homeworkDueAt: formHomeworkDueAt || null,
            solutionPublishAt: formSolutionPublishAt || null,
          }),
        });
        if (!res.ok) throw new Error("فشل تعديل الدرس");
      } else {
        const res = await fetch("/api/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: formLevel,
            type: formType,
            title: formTitle.trim(),
            field: formField.trim(),
            section: formSection.trim(),
            number: formNumber,
            notes: formNotes.trim(),
            homeworkNotes: formHomeworkNotes.trim(),
            homeworkDueAt: formHomeworkDueAt || null,
            solutionPublishAt: formSolutionPublishAt || null,
          }),
        });
        if (!res.ok) throw new Error("فشل إنشاء الدرس");
        const created = await res.json();
        currentLessonId = created.lesson.id;
      }

      // رفع الصور إن وجدت
      if (boardFiles.length > 0) {
        setUploadProgress(40);
        setUploadStatus(`جارٍ رفع ${boardFiles.length} صورة للسبورة...`);

        const formData = new FormData();
        formData.append("lessonId", currentLessonId);
        boardFiles.forEach((file) => {
          formData.append("files", file);
        });

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || "تعذر رفع بعض الصور");
        }
      }

      setUploadProgress(100);
      setUploadStatus("تم الحفظ بنجاح!");
      showToast("ok", editingLesson ? "تم تعديل الدرس بنجاح ✨" : "تم نشر درس السبورة بنجاح 📋");
      setShowModal(false);
      await loadLessons();
    } catch (err: any) {
      console.error(err);
      showToast("err", err.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
      setUploadStatus("");
    }
  };

  // حذف درس
  const handleDeleteLesson = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف: "${title}"؟`)) return;
    try {
      const res = await fetch(`/api/lessons/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("تعذر حذف الدرس");
      showToast("ok", "تم حذف الدرس بنجاح");
      setLessons((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      showToast("err", err.message || "فشل الحذف");
    }
  };

  // حذف صورة محددة من الدرس
  const handleDeleteImage = async (lessonId: string, imageId: string) => {
    if (!confirm("هل تريد حذف هذه الصورة من السبورة؟")) return;
    try {
      const res = await fetch(`/api/lessons/${lessonId}/image/${imageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("تعذر حذف الصورة");
      showToast("ok", "تم حذف الصورة");
      await loadLessons();
    } catch (err: any) {
      showToast("err", err.message || "فشل حذف الصورة");
    }
  };

  // نسخ رابط السبورة للأولياء
  const handleCopyParentShareLink = () => {
    if (typeof window === "undefined") return;
    const url = profile?.slug
      ? `${window.location.origin}/t/${profile.slug}`
      : `${window.location.origin}/`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    showToast("ok", "تم نسخ رابط كراس الدروس للأولياء والتلاميذ 📋");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (authenticated === false) {
    return <LoginRequired next="/admin/board" title="كراس الدروس والسبورة الرقمية" />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] text-gray-900 pb-20 font-sans" dir="rtl">
      {/* شريط الإشعار السريع */}
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

      {/* ── رأس الصفحة والهوية البصرية ── */}
      <div className="bg-white border-b border-[#e8e8e0] px-4 sm:px-8 py-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#107a57] animate-pulse" />
              <span className="text-xs font-black text-[#107a57] bg-[#e6f4ee] px-2.5 py-0.5 rounded-full border border-[#107a57]/20">
                الفضاء البيداغوجي للأستاذ
              </span>
              {profile?.teacher_code && (
                <span className="text-xs font-mono font-black text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                  {profile.teacher_code}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              كراس الدروس والسبورة الرقمية
            </h1>
            <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
              ارفع صور السبورة اليومية والملخصات والواجبات المدرسية. يستطيع الولي والتلميذ الاطلاع عليها مباشرة ومتابعة الدروس ونقلها في حال الغياب.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* زر مشاركة الرابط مع الأولياء ومجموعات القسم */}
            <button
              type="button"
              onClick={handleCopyParentShareLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-xs font-black transition shadow-2xs cursor-pointer"
              title="نسخ رابط كراس الدروس لمشاركته في مجموعات واتساب / تيليغرام"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4 text-emerald-700" />}
              <span>{copiedLink ? "تم النسخ بنجاح!" : "نسخ رابط الأولياء"}</span>
            </button>

            {profile?.slug && (
              <Link
                href={`/t/${profile.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#e8e8e0] bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition shadow-2xs"
              >
                <Eye className="w-4 h-4 text-gray-500" />
                <span>معاينة فضاء الولي</span>
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </Link>
            )}

            <button
              type="button"
              onClick={openAddModal}
              className="btn-primary text-xs py-2.5 px-4 font-black shadow-sm flex items-center gap-2 cursor-pointer active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>رفع درس / سبورة جديدة</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── المحتوى الرئيسي ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-5">
        {/* بطاقات الإحصاءات السريعة */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-[#e8e8e0] shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#107a57] border border-emerald-200 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-gray-500">إجمالي الدروس والسبورات</span>
              <span className="text-xl font-black font-mono text-gray-900">{stats.totalLessons} درس</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#e8e8e0] shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-gray-500">صور السبورة الموثقة</span>
              <span className="text-xl font-black font-mono text-gray-900">{stats.boardImagesCount} صورة</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#e8e8e0] shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-gray-500">الواجبات والأنشطة المنزلية</span>
              <span className="text-xl font-black font-mono text-gray-900">{stats.homeworkCount} واجب</span>
            </div>
          </div>
        </div>

        {/* دليل الصفحة البيداغوجي */}
        <PageExplainer
          pageId="board"
          title="كراس الدروس والسبورة الرقمية"
          teacherRoleExplanation="هنا تلتقط وترفع صور السبورة في نهاية كل حصة، مع ملخص الدرس والواجب المنزلي، حتى يتمكن التلميذ الغائب من نقل درسه ويواكب ولي أمره ما تم تقديمه في القسم."
          parentRoleExplanation="يستطيع الولي فتح سبورة القسم والتأكد من نقل ابنه للدرس كاملاً ومساعدته في حل الواجبات."
          inspectorExplanation="يمكّن المفتش من متابعة جودة التوثيق والمنتوج التعليمي المكتوب على السبورة لتقويم الأثر البيداغوجي."
        />

        {/* ── شريط الفلاتر والبحث ── */}
        <div className="bg-white rounded-3xl border border-[#e8e8e0] p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* فلاتر المستوى */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-black text-gray-700 ml-1 shrink-0">المستوى:</span>
              <button
                type="button"
                onClick={() => setSelectedLevel("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  selectedLevel === "all"
                    ? "bg-[#107a57] text-white shadow-2xs"
                    : "bg-[#fafaf7] hover:bg-gray-100 text-gray-700 border border-[#e8e8e0]"
                }`}
              >
                الكل ({lessons.length})
              </button>
              {teacherLevels.map((lvl) => {
                const count = lessons.filter((l) => l.level === lvl).length;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedLevel(lvl)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                      selectedLevel === lvl
                        ? "bg-[#107a57] text-white shadow-2xs"
                        : "bg-[#fafaf7] hover:bg-gray-100 text-gray-700 border border-[#e8e8e0]"
                    }`}
                  >
                    {lvl}م ({count})
                  </button>
                );
              })}
            </div>

            {/* حقل البحث */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="ابحث بالعنوان، الميدان، أو المقطع..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-[#e8e8e0] focus:outline-none focus:border-[#107a57] bg-[#fafaf7] font-medium"
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* تصنيف نوع الكراس */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 overflow-x-auto text-xs">
            <span className="text-gray-500 font-bold shrink-0">نوع المورد:</span>
            {[
              { id: "all", label: "كافة الأقسام" },
              { id: "lessons", label: "كراس الدروس (السبورة)" },
              { id: "directed_work", label: "أعمال موجهة" },
              { id: "worksheets", label: "أوراق عمل وفروض" },
              { id: "summaries", label: "ملخصات ومطويات" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedType(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  selectedType === cat.id
                    ? "bg-[#e6f4ee] text-[#107a57] font-black border border-[#107a57]/30 shadow-2xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── معرض الدروس ── */}
        {loading ? (
          <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-[#e8e8e0]">
            <Loader2 className="w-8 h-8 text-[#107a57] animate-spin mx-auto" />
            <p className="text-xs text-gray-500">جارٍ تحميل الدروس وصور السبورة...</p>
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="p-12 text-center space-y-4 bg-white rounded-3xl border border-dashed border-[#e8e8e0]">
            <div className="w-16 h-16 rounded-3xl bg-[#e6f4ee] text-[#107a57] flex items-center justify-center mx-auto text-2xl font-black">
              📸
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-gray-900">لا توجد دروس أو سبورات منشورة</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                {searchQuery || selectedLevel !== "all" || selectedType !== "all"
                  ? "لا توجد نتائج تطابق خيارات الفلترة المحددة."
                  : "ابدأ برفع أول صورة سبورة ووثّق عناصر درسك لتظهر فوراً لجميع الأولياء والتلاميذ."}
              </p>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="btn-primary text-xs py-2.5 px-5 font-black inline-flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>رفع درس وسبورة جديدة الآن</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500 px-1 font-bold">
              <span>إجمالي الدروس المعروضة: {filteredLessons.length}</span>
              <span>الأحدث أولاً</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLessons.map((lesson) => {
                const typeLabel =
                  lesson.type === "directed_work"
                    ? "أعمال موجهة"
                    : lesson.type === "worksheets"
                    ? "ورقة عمل"
                    : lesson.type === "summaries"
                    ? "ملخص"
                    : "درس سبورة";

                return (
                  <div
                    key={lesson.id}
                    className="bg-white rounded-3xl border border-[#e8e8e0] shadow-xs hover:border-[#107a57]/40 hover:shadow-sm transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div className="p-4 sm:p-5 space-y-3">
                      {/* الشارات العلوية */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-7 h-7 rounded-lg bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 flex items-center justify-center text-xs font-black">
                            {lesson.level}م
                          </span>
                          <span className="text-[11px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                            {typeLabel}
                          </span>
                          <span className="text-[11px] font-mono text-gray-400">
                            #{lesson.number}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {lesson.createdAt
                              ? new Date(lesson.createdAt).toLocaleDateString("ar-DZ")
                              : "مؤخراً"}
                          </span>
                        </div>
                      </div>

                      {/* العنوان والميدان والمقطع */}
                      <div className="space-y-1">
                        <h3 className="text-sm sm:text-base font-black text-gray-900 leading-snug">
                          {lesson.title}
                        </h3>
                        {(lesson.field || lesson.section) && (
                          <p className="text-[11px] text-gray-500 font-medium">
                            {lesson.field} {lesson.section && `• ${lesson.section}`}
                          </p>
                        )}
                      </div>

                      {/* معرض صور السبورة */}
                      {lesson.images && lesson.images.length > 0 ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
                            <span className="flex items-center gap-1 text-[#107a57]">
                              <Camera className="w-3.5 h-3.5" />
                              صور السبورة المرفوعة ({lesson.images.length}):
                            </span>
                            <span className="text-[10px] text-gray-400 font-normal">
                              انقر للتكبير
                            </span>
                          </div>

                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {lesson.images.map((img, i) => (
                              <div
                                key={img.id || i}
                                className="relative group aspect-4/3 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer shadow-2xs"
                                onClick={() => setLightboxImg(img.url)}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img.url}
                                  alt={`سبورة ${i + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white">
                                  <Maximize2 className="w-4 h-4" />
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteImage(lesson.id, img.id);
                                  }}
                                  className="absolute top-1 left-1 w-5 h-5 rounded-md bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-700"
                                  title="حذف هذه الصورة"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                          لا توجد صور سبورة مرفوعة لهذا الدرس حتى الآن.
                        </div>
                      )}

                      {/* ملخص عناصر الدرس المكتوبة على السبورة */}
                      {lesson.notes && (
                        <div className="p-3 bg-[#fafaf7] rounded-xl border border-[#e8e8e0] text-xs text-gray-700 space-y-1">
                          <span className="font-bold text-gray-800 block text-[11px]">
                            عناصر وملخص السبورة:
                          </span>
                          <p className="whitespace-pre-wrap leading-relaxed text-gray-600">
                            {lesson.notes}
                          </p>
                        </div>
                      )}

                      {/* الواجب المنزلي المطلوب */}
                      {lesson.homeworkNotes && (
                        <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/60 text-xs text-amber-900 space-y-1">
                          <span className="font-black text-amber-950 block text-[11px] flex items-center gap-1">
                            <span>📝</span>
                            الواجب المنزلي من السبورة:
                          </span>
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {lesson.homeworkNotes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* شريط الإجراءات السفلي للكارت */}
                    <div className="px-4 py-3 bg-[#fafaf7] border-t border-[#e8e8e0] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(lesson)}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 transition cursor-pointer"
                          title="تعديل الدرس"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="حذف الدرس"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {profile?.slug && (
                        <Link
                          href={`/t/${profile.slug}`}
                          target="_blank"
                          className="text-xs font-bold text-[#107a57] hover:underline flex items-center gap-1"
                        >
                          <span>عرض كما يراه الولي</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── نافذة إضافة / تعديل الدرس وصور السبورة ── */}
      {mounted && showModal && createPortal(
        <div className="fixed inset-0 z-[999999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-[#e8e8e0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#e6f4ee] text-[#107a57] flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <h2 className="text-base font-black text-gray-900">
                  {editingLesson ? "تعديل درس السبورة" : "رفع درس وسبورة جديدة"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    المستوى الدراسي *
                  </label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(Number(e.target.value))}
                    className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57] font-bold"
                  >
                    {teacherLevels.map((lv) => (
                      <option key={lv} value={lv}>
                        {LEVELS[lv as 1 | 2 | 3 | 4].label} ({lv}م)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    نوع الكراس / القسم *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as NotebookType)}
                    className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57] font-bold"
                  >
                    <option value="lessons">كراس الدروس (صور السبورة)</option>
                    <option value="directed_work">أعمال موجهة وتطبيقات</option>
                    <option value="worksheets">أوراق عمل وسلاسل</option>
                    <option value="summaries">ملخصات ومطويات</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    عنوان المورد / الدرس *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: قسمة عدد عشري على عدد طبيعي"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    رقم الدرس
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formNumber}
                    onChange={(e) => setFormNumber(Number(e.target.value))}
                    className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] font-mono text-center focus:bg-white focus:outline-none focus:border-[#107a57] font-black"
                  />
                </div>
              </div>

              {/* الميدان والمقطع مع اقتراحات سريعة بنقرة واحدة */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      الميدان التعليمي
                    </label>
                    <input
                      type="text"
                      placeholder="أنشطة عددية / أنشطة هندسية..."
                      value={formField}
                      onChange={(e) => setFormField(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      المقطع التعليمي
                    </label>
                    <input
                      type="text"
                      placeholder="المقطع 1 : الأعداد والعمليات عليها"
                      value={formSection}
                      onChange={(e) => setFormSection(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57]"
                    />
                  </div>
                </div>

                {/* اقتراحات الميادين والمقاطع الرسمية */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-gray-400 font-bold">اقتراحات سريعة:</span>
                  {CURRICULUM_PRESETS.map((p) => (
                    <button
                      key={p.field}
                      type="button"
                      onClick={() => {
                        setFormField(p.field);
                        if (p.sections[0]) setFormSection(p.sections[0]);
                      }}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-900 border border-gray-200 transition cursor-pointer"
                    >
                      {p.field}
                    </button>
                  ))}
                </div>
              </div>

              {/* منطقة رفع صور السبورة: التقاط بالكاميرا مباشرة + رفع من الجهاز */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-gray-700">
                  صور السبورة وكراس القسم
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* زر التقاط مباشر بالكاميرا للأجهزة الذكية والهواتف */}
                  <label className="p-3 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 text-center transition cursor-pointer flex items-center justify-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Camera className="w-5 h-5 text-emerald-700" />
                    <span className="text-xs font-black text-emerald-900">التقاط بالكاميرا مباشرة 📷</span>
                  </label>

                  {/* زر الرفع من المعرض أو الملفات */}
                  <label className="p-3 rounded-2xl border-2 border-dashed border-[#e8e8e0] hover:border-[#107a57] bg-[#fafaf7] hover:bg-gray-100 text-center transition cursor-pointer flex items-center justify-center gap-2">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Upload className="w-5 h-5 text-gray-600" />
                    <span className="text-xs font-bold text-gray-800">اختيار صور من الجهاز 📁</span>
                  </label>
                </div>

                {boardFiles.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                    {boardFiles.map((f, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-4/3 rounded-xl overflow-hidden border border-[#107a57]/30 bg-white p-1 flex flex-col justify-between shadow-2xs"
                      >
                        <span className="text-[10px] font-mono text-gray-600 truncate block">
                          {f.name}
                        </span>
                        <span className="text-[9px] text-[#107a57] font-bold">
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(idx)}
                          className="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* عناصر وملخص ما كُتب على السبورة */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  عناصر وملخص ما كُتب على السبورة (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="اكتب النقاط الرئيسية، القوانين الرياضية المستخلصة، أو توجيهات الأستاذ..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57]"
                />
              </div>

              {/* الواجب المنزلي وموعد التسليم */}
              <div className="space-y-2 p-3 bg-amber-50/60 rounded-2xl border border-amber-200">
                <label className="block text-xs font-black text-amber-950">
                  الواجب المنزلي المطلوب من التلاميذ (اختياري):
                </label>
                <textarea
                  rows={2}
                  placeholder="مثال: حل التمرين 12 و 13 صفحة 45 من الكتاب المدرسي في كراس المحاولات..."
                  value={formHomeworkNotes}
                  onChange={(e) => setFormHomeworkNotes(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-amber-200 bg-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* شريط التقدم عند الرفع */}
              {submitting && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {uploadStatus}
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#107a57] h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#e8e8e0]">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2 px-5 font-black shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ الحفظ والرفع...</span>
                    </>
                  ) : (
                    <span>{editingLesson ? "تحديث ونشر الدرس" : "نشر درس السبورة الآن"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── عارض الصور المكبر (Lightbox) ── */}
      {mounted && lightboxImg && createPortal(
        <div
          className="fixed inset-0 z-[9999999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-5xl max-h-[92vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              className="absolute -top-12 left-0 text-white hover:text-gray-300 p-2 rounded-full bg-white/10 transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImg}
              alt="صورة السبورة بحجم كامل"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            <div className="mt-3 flex items-center gap-3">
              <a
                href={lightboxImg}
                target="_blank"
                rel="noreferrer"
                download
                className="px-4 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition flex items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-4 h-4" />
                <span>تحميل الصورة بجودة كاملة</span>
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
