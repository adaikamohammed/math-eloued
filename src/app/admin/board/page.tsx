"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { PageExplainer } from "@/components/PageExplainer";
import {
  Lesson,
  LessonImage,
  NotebookType,
  LEVELS,
  MIDDLE_SCHOOL_SUBJECTS,
  LessonsData,
} from "@/lib/types";
import { compressIfImage, validateUpload } from "@/lib/compress";

export default function AdminBoardPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | "all">("all");
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

  // حقول النموذج
  const [formLevel, setFormLevel] = useState<number>(1);
  const [formType, setFormType] = useState<NotebookType>("lessons");
  const [formTitle, setFormTitle] = useState("");
  const [formField, setFormField] = useState("أنشطة عددية");
  const [formSection, setFormSection] = useState("المقطع 1 : الأعداد الطبيعية والأعداد العشرية");
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
    } catch (err: any) {
      console.error(err);
      showToast("err", err.message || "حدث خطأ أثناء تحميل الدروس");
    } finally {
      setLoading(false);
    }
  }, []);

  // جلب الملف الشخصي للأستاذ
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) {
          setAuthenticated(true);
          setProfile(d.user);
          if (d.user.levels_taught?.length > 0) {
            setFormLevel(d.user.levels_taught[0]);
          }
        } else {
          setAuthenticated(false);
        }
      })
      .catch(() => setAuthenticated(false));

    loadLessons();
  }, [loadLessons]);

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

  // فتح نافذة الإضافة
  const openAddModal = () => {
    setEditingLesson(null);
    setFormTitle("");
    setFormNumber(
      lessons.length ? Math.max(...lessons.map((l) => l.number || 0)) + 1 : 1
    );
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
    setUploadProgress(10);
    setUploadStatus("جارٍ حفظ بيانات الدرس...");

    try {
      let currentLessonId: string;

      if (editingLesson) {
        // تحديث الدرس
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
        // إنشاء درس جديد
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
        setUploadProgress(35);
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

  if (authenticated === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#107a57]" />
      </div>
    );
  }

  if (authenticated === false) {
    return <LoginRequired next="/admin/board" title="كراس الدروس والسبورة الرقمية" />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] text-gray-900 pb-20 font-sans" dir="rtl">
        {/* شريط الإشعار السريع */}
        {toast && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-black transition-all ${
              toast.type === "ok"
                ? "bg-emerald-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toast.msg}</span>
          </div>
        )}

        {/* ── رأس الصفحة والهوية البصرية ── */}
        <div className="bg-white border-b border-[#e8e8e0] px-4 sm:px-8 py-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#107a57] animate-pulse" />
                <span className="text-xs font-black text-[#107a57] bg-[#e6f4ee] px-2.5 py-0.5 rounded-full border border-[#107a57]/20">
                  الفضاء البيداغوجي للأستاذ
                </span>
                {profile?.teacher_code && (
                  <span className="text-xs font-mono font-black text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
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
        <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          {/* بطاقة التنبيه الذكية: مساعدة التلميذ الغائب */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-[#107a57]/20 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-[#107a57] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <Camera className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs">
              <p className="font-black text-[#107a57]">
                خدمة الأولياء والتلاميذ الغائبين 📋
              </p>
              <p className="text-gray-600 leading-relaxed">
                صور السبورة المنشورة تظهر تلقائياً في فضاء الأستاذ العام عند دخول الولي بكودك. تُغني التلميذ عن استعارة كراس زميله وتضمن دقة عناصر الدرس والواجبات المنزلية.
              </p>
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
          <div className="bg-white rounded-2xl border border-[#e8e8e0] p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* فلاتر المستوى */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-bold text-gray-500 ml-1 shrink-0">المستوى:</span>
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
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="ابحث بالعنوان أو الميدان..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-[#e8e8e0] focus:outline-none focus:border-[#107a57] bg-[#fafaf7]"
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2 pointer-events-none" />
              </div>
            </div>

            {/* تصنيف نوع الكراس */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 overflow-x-auto text-xs">
              <span className="text-gray-500 font-bold shrink-0">القسم:</span>
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition shrink-0 cursor-pointer ${
                    selectedType === cat.id
                      ? "bg-[#e6f4ee] text-[#107a57] font-black border border-[#107a57]/30"
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
            <div className="p-12 text-center space-y-3 bg-white rounded-2xl border border-[#e8e8e0]">
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
                      className="bg-white rounded-2xl border border-[#e8e8e0] shadow-xs hover:border-[#107a57]/40 hover:shadow-sm transition-all flex flex-col justify-between overflow-hidden"
                    >
                      <div className="p-4 sm:p-5 space-y-3.5">
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
                            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 transition"
                            title="تعديل الدرس"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition"
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
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full border border-[#e8e8e0] shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-5 border-b border-[#e8e8e0] flex items-center justify-between">
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
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveLesson} className="p-5 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      المستوى الدراسي *
                    </label>
                    <select
                      value={formLevel}
                      onChange={(e) => setFormLevel(Number(e.target.value))}
                      className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57]"
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
                      className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57]"
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
                      className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57]"
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
                      className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] font-mono text-center focus:bg-white focus:outline-none focus:border-[#107a57]"
                    />
                  </div>
                </div>

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

                {/* منطقة رفع صور السبورة */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-gray-700">
                    صور السبورة وكراس القسم (JPG أو PNG أو PDF)
                  </label>

                  <div className="border-2 border-dashed border-[#e8e8e0] hover:border-[#107a57] rounded-2xl p-4 text-center transition bg-[#fafaf7] hover:bg-emerald-50/30 relative">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-1 pointer-events-none">
                      <Upload className="w-6 h-6 text-[#107a57] mx-auto" />
                      <p className="text-xs font-black text-gray-800">
                        انقر لاختيار صور السبورة أو اسحبها هنا
                      </p>
                      <p className="text-[11px] text-gray-400">
                        يتم ضغط الصور تلقائياً للحفاظ على سرعة تصفح الولي في الهاتف.
                      </p>
                    </div>
                  </div>

                  {boardFiles.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                      {boardFiles.map((f, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-4/3 rounded-xl overflow-hidden border border-[#107a57]/30 bg-white p-1 flex flex-col justify-between"
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
                            className="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs"
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

                {/* الواجب المنزلي */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    الواجب المنزلي المطلوب من التلاميذ (اختياري)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="مثال: حل التمرين 12 و 13 صفحة 45 من الكتاب المدرسي في كراس المحاولات..."
                    value={formHomeworkNotes}
                    onChange={(e) => setFormHomeworkNotes(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57]"
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
                        <span>جارٍ الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{editingLesson ? "حفظ التعديلات" : "نشر الدرس والسبورة"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── عارض الصور بالحجم الكامل (Lightbox) ── */}
        {lightboxImg && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setLightboxImg(null)}
          >
            <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => setLightboxImg(null)}
                className="absolute top-2 left-2 z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center text-sm font-black transition"
              >
                ✕
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImg}
                alt="معاينة السبورة"
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>
        )}
    </div>
  );
}
