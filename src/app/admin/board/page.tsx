"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  Eye,
  Maximize2,
  X,
  Clock,
  Sparkles,
  Copy,
  Check,
  Download,
  Settings,
  RotateCcw,
  CheckSquare,
  FileCheck,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { PageExplainer } from "@/components/PageExplainer";
import {
  Lesson,
  LessonImage,
  LEVELS,
  LessonsData,
  CustomNotebook,
  BoardNomenclature,
} from "@/lib/types";
import { compressIfImage, validateUpload } from "@/lib/compress";

const LOCAL_STORAGE_CLASSES_KEYS = ["last_active_classes", "math_custom_classes"];
const LOCAL_STORAGE_NOTEBOOKS_KEY = "teacher_custom_notebooks";
const LOCAL_STORAGE_NOMENCLATURE_KEY = "teacher_board_nomenclature";

// الكراريس الافتراضية للتعليم المتوسط
const DEFAULT_NOTEBOOKS: CustomNotebook[] = [
  { id: "lessons", label: "كراس الدروس (صور السبورة)", icon: "📘", canDelete: false },
  { id: "directed_work", label: "أعمال موجهة وتطبيقات", icon: "📑", canDelete: true },
  { id: "worksheets", label: "أوراق عمل وفروض", icon: "📋", canDelete: true },
  { id: "summaries", label: "ملخصات ومطويات", icon: "📂", canDelete: true },
];

// قوالب التسميات الرسمية حسب المادة التعليمية
const NOMENCLATURE_PRESETS: {
  id: string;
  name: string;
  nomenclature: BoardNomenclature;
  suggestions: { field: string; sections: string[] }[];
}[] = [
  {
    id: "math_physics",
    name: "📐 رياضيات وفيزياء",
    nomenclature: {
      fieldLabel: "الميدان التعليمي",
      sectionLabel: "المقطع التعلمي",
      lessonLabel: "عنوان المورد / الدرس",
    },
    suggestions: [
      {
        field: "أنشطة عددية",
        sections: [
          "الأعداد الطبيعية والأعداد العشرية",
          "الكسور والعمليات عليها",
          "الأعداد النسبية والحساب الحرفي",
          "المعادلات وترييض المشكلات",
        ],
      },
      {
        field: "أنشطة هندسية",
        sections: [
          "التوازي والتعامد والأشكال المستوية",
          "التناظر المحوري والمركزي",
          "المثلثات والدائرة وخاصية فيثاغورس",
          "المجسمات والحجوم والمساحات",
        ],
      },
      {
        field: "تنظيم معطيات ودوال",
        sections: [
          "التناسبية والنسبة المئوية",
          "تنظيم المعطيات والإحصاء",
          "الدوال الخطية والتآلفية",
        ],
      },
    ],
  },
  {
    id: "arabic_languages",
    name: "📖 لغة عربية ولغات",
    nomenclature: {
      fieldLabel: "الميدان / المجال",
      sectionLabel: "المقطع / المحور",
      lessonLabel: "عنوان النص / الدرس",
    },
    suggestions: [
      {
        field: "فهم المنطوق وإنتاجه",
        sections: ["قضايا المجتمع والحياة الاجتماعية", "الإعلام والمجتمع", "التضامن الإنساني", "العلم والاكتشافات"],
      },
      {
        field: "فهم المكتوب وقواعد اللغة",
        sections: ["ظواهر نحوية وصرفية", "ظواهر بلاغية ورسم إملائي"],
      },
      {
        field: "إنتاج المكتوب",
        sections: ["التعبير الكتابي وتطوير الأسلوب", "المشاريع والإنتاج"],
      },
    ],
  },
  {
    id: "islamic_civics",
    name: "🕌 تربية إسلامية ومدنية",
    nomenclature: {
      fieldLabel: "الميدان / المحور",
      sectionLabel: "الوحدة التعليمية",
      lessonLabel: "عنوان الدرس / الموضوع",
    },
    suggestions: [
      {
        field: "القرآن الكريم والحديث الشريف",
        sections: ["سورة التكوير وسورة المطففين", "أحاديث الأخلاق والمعاملات"],
      },
      {
        field: "العقيدة الإسلامية والعبادات",
        sections: ["أركان الإيمان وأثرها", "أحكام الصلاة والطهارة والزكاة"],
      },
      {
        field: "السيرة النبوية والقصص",
        sections: ["الهجرة النبوية وبناء المجتمع", "الصحابة الكرام ومواقف العبر"],
      },
    ],
  },
  {
    id: "history_geo",
    name: "🗺️ تاريخ وجغرافيا",
    nomenclature: {
      fieldLabel: "الميدان التعليمي",
      sectionLabel: "المركبة / الكفاءة",
      lessonLabel: "الوضعية التعلمية / الدرس",
    },
    suggestions: [
      {
        field: "الوثائق التاريخية والمصادر",
        sections: ["دراسة ونقد الوثيقة التاريخية", "معالم وآثار الجزائر القديمة"],
      },
      {
        field: "التاريخ الوطني والعالمي",
        sections: ["الحركة الوطنية والثورة التحريرية", "الدولة الجزائرية الحديثة"],
      },
      {
        field: "المجال الجغرافي والبيئة",
        sections: ["الموقع والخصائص الطبيعية للجزائر", "السكان والتنمية الاقتصادية"],
      },
    ],
  },
];

export default function AdminBoardPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [customClasses, setCustomClasses] = useState<string[]>([]);

  // الكراريس المفعلة لدى الأستاذ (مع إمكانية الحذف والإضافة)
  const [notebooks, setNotebooks] = useState<CustomNotebook[]>(DEFAULT_NOTEBOOKS);
  const [showAddNotebookInput, setShowAddNotebookInput] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState("");

  // تسميات الميدان والمقطع والدرس حسب مادة الأستاذ
  const [nomenclature, setNomenclature] = useState<BoardNomenclature>({
    fieldLabel: "الميدان التعليمي",
    sectionLabel: "المقطع التعلمي",
    lessonLabel: "عنوان المورد / الدرس",
  });
  const [activePresetId, setActivePresetId] = useState<string>("math_physics");
  const [showNomenclatureCustomizer, setShowNomenclatureCustomizer] = useState(false);

  // الفلاتر والبحث
  const [selectedLevel, setSelectedLevel] = useState<number | "all">("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // وضع التعديل (في نفس الصفحة مباشرة دون أي نافذة منبثقة)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  // مرجع لتمرير الشاشة نحو نموذج الإضافة مباشرة
  const formSectionRef = useRef<HTMLDivElement>(null);

  const teacherLevels = useMemo(() => {
    if (Array.isArray(profile?.levels_taught) && profile.levels_taught.length > 0) {
      return (profile.levels_taught as number[]).filter((l) => [1, 2, 3, 4].includes(l));
    }
    return [1, 2, 3, 4];
  }, [profile]);

  // حقول نموذج الدرس المباشر في الصفحة
  const [formLevel, setFormLevel] = useState<number>(1);
  const [formType, setFormType] = useState<string>("lessons");
  const [formField, setFormField] = useState("أنشطة عددية");
  const [formSectionNumber, setFormSectionNumber] = useState<string>("1");
  const [formSectionTitle, setFormSectionTitle] = useState("الأعداد الطبيعية والأعداد العشرية");
  const [formNumber, setFormNumber] = useState<number>(1);
  const [formTitle, setFormTitle] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formHomeworkNotes, setFormHomeworkNotes] = useState("");
  const [formHomeworkDueAt, setFormHomeworkDueAt] = useState("");
  const [formSolutionPublishAt, setFormSolutionPublishAt] = useState("");

  // رفع الصور بالكاميرا أو المعرض
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

  // 1. التحقق الفوري الأولي من الجلسة والكراريس والتسميات المحفوظة
  useEffect(() => {
    setMounted(true);

    // استرجاع الكراريس من التخزين المحلي إن وجدت
    if (typeof window !== "undefined") {
      try {
        const savedNotebooks = localStorage.getItem(LOCAL_STORAGE_NOTEBOOKS_KEY);
        if (savedNotebooks) {
          const parsed = JSON.parse(savedNotebooks);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNotebooks(parsed);
          }
        }
        const savedNomenclature = localStorage.getItem(LOCAL_STORAGE_NOMENCLATURE_KEY);
        if (savedNomenclature) {
          const parsed = JSON.parse(savedNomenclature);
          if (parsed?.fieldLabel) {
            setNomenclature(parsed);
          }
        }
      } catch {}
    }

    // التحقق من الجلسة
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

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // تحميل الدروس والكراريس والتسميات من الخادم
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

      // مزامنة الكراريس المخصصة المحفوظة في قاعدة بيانات الأستاذ
      if (Array.isArray(data.customNotebooks) && data.customNotebooks.length > 0) {
        setNotebooks(data.customNotebooks);
        localStorage.setItem(LOCAL_STORAGE_NOTEBOOKS_KEY, JSON.stringify(data.customNotebooks));
      }

      // مزامنة تسميات الأستاذ
      if (data.boardNomenclature?.fieldLabel) {
        setNomenclature(data.boardNomenclature);
        localStorage.setItem(LOCAL_STORAGE_NOMENCLATURE_KEY, JSON.stringify(data.boardNomenclature));
      }
    } catch (err: any) {
      console.error(err);
      showToast("err", err.message || "حدث خطأ أثناء تحميل الدروس");
    } finally {
      setLoading(false);
    }
  }, []);

  // حساب الرقم المقترح للدرس التالي حسب المستوى والكراس المختار
  const computeNextNumber = useCallback(
    (lvl: number, typeStr: string) => {
      const match = lessons.filter(
        (l) => l.level === lvl && (typeStr === "lessons" ? !l.type || l.type === "lessons" : l.type === typeStr)
      );
      if (!match.length) return 1;
      return Math.max(...match.map((l) => l.number || 0)) + 1;
    },
    [lessons]
  );

  // تحديث رقم الدرس تلقائياً عند تغيير المستوى أو الكراس أثناء الإضافة الجديدة
  useEffect(() => {
    if (!editingLessonId) {
      setFormNumber(computeNextNumber(formLevel, formType));
    }
  }, [formLevel, formType, computeNextNumber, editingLessonId]);

  // حفظ الكراريس المخصصة في الخادم والمحلي
  const persistNotebooks = async (newList: CustomNotebook[]) => {
    setNotebooks(newList);
    try {
      localStorage.setItem(LOCAL_STORAGE_NOTEBOOKS_KEY, JSON.stringify(newList));
      await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customNotebooks: newList }),
      });
    } catch (err) {
      console.error("فشل حفظ الكراريس المخصصة:", err);
    }
  };

  // حفظ التسميات في الخادم والمحلي
  const persistNomenclature = async (newNom: BoardNomenclature) => {
    setNomenclature(newNom);
    try {
      localStorage.setItem(LOCAL_STORAGE_NOMENCLATURE_KEY, JSON.stringify(newNom));
      await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardNomenclature: newNom }),
      });
    } catch (err) {
      console.error("فشل حفظ التسميات:", err);
    }
  };

  // إضافة كراس جديد
  const handleAddCustomNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newNotebookName.trim();
    if (!cleanName) return;

    const id = `nb_${Date.now()}`;
    const newNb: CustomNotebook = {
      id,
      label: cleanName,
      icon: "📙",
      canDelete: true,
    };

    const updated = [...notebooks, newNb];
    await persistNotebooks(updated);
    setFormType(id);
    setNewNotebookName("");
    setShowAddNotebookInput(false);
    showToast("ok", `تمت إضافة "${cleanName}" إلى قائمة الكراريس بنجاح ✨`);
  };

  // حذف كراس لا تحتاجه المادة
  const handleDeleteNotebook = async (id: string, label: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف "${label}" من قائمة الكراريس؟`)) return;

    const filtered = notebooks.filter((n) => n.id !== id);
    await persistNotebooks(filtered);

    // إذا كان الكراس المحذوف هو المختار حالياً، نرجع للكراس الأول
    if (formType === id) {
      setFormType(filtered[0]?.id || "lessons");
    }
    if (selectedType === id) {
      setSelectedType("all");
    }
    showToast("ok", `تم حذف كراس "${label}" بنجاح`);
  };

  // استعادة الكراريس الافتراضية
  const handleRestoreDefaultNotebooks = async () => {
    if (!confirm("هل تريد استعادة قائمة الكراريس الافتراضية للمنصة؟")) return;
    await persistNotebooks(DEFAULT_NOTEBOOKS);
    setFormType("lessons");
    showToast("ok", "تمت استعادة الكراريس الافتراضية");
  };

  // تطبيق قالب تسميات جاهز
  const applyPresetNomenclature = (presetId: string) => {
    setActivePresetId(presetId);
    const found = NOMENCLATURE_PRESETS.find((p) => p.id === presetId);
    if (found) {
      persistNomenclature(found.nomenclature);
      if (found.suggestions[0]) {
        setFormField(found.suggestions[0].field);
        if (found.suggestions[0].sections[0]) {
          setFormSectionTitle(found.suggestions[0].sections[0]);
        }
      }
      showToast("ok", `تم تطبيق نمط: ${found.name}`);
    }
  };

  // بدء تعديل درس مباشرة في الصفحة
  const handleStartEditLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setFormLevel(lesson.level);
    setFormType(lesson.type || "lessons");
    setFormTitle(lesson.title || "");
    setFormNumber(lesson.number || 1);
    setFormField(lesson.field || "");

    // تفكيك المقطع إن وُجد رقم واسم
    if (lesson.section) {
      const match = lesson.section.match(/(?:المقطع|الوحدة|المركبة)\s*(\d+)\s*[:\-–]?\s*(.*)/i);
      if (match) {
        setFormSectionNumber(match[1]);
        setFormSectionTitle(match[2] || lesson.section);
      } else {
        setFormSectionTitle(lesson.section);
      }
    } else {
      setFormSectionTitle("");
    }

    setFormNotes(lesson.notes || "");
    setFormHomeworkNotes(lesson.homeworkNotes || "");
    setFormHomeworkDueAt(lesson.homeworkDueAt || "");
    setFormSolutionPublishAt(lesson.solutionPublishAt || "");
    setBoardFiles([]);

    // تمرير الشاشة بسلاسة نحو النموذج
    if (formSectionRef.current) {
      formSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // إلغاء التعديل والرجوع للوضع العادي
  const handleCancelEdit = () => {
    setEditingLessonId(null);
    setFormTitle("");
    setFormNotes("");
    setFormHomeworkNotes("");
    setFormHomeworkDueAt("");
    setFormSolutionPublishAt("");
    setBoardFiles([]);
    setFormNumber(computeNextNumber(formLevel, formType));
  };

  // معالجة اختيار ملفات السبورة بالكاميرا أو المعرض
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

  // حفظ أو تحديث الدرس مباشرة في الصفحة
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("err", `يرجى كتابة ${nomenclature.lessonLabel}`);
      return;
    }

    // تجميع نص المقطع كاملاً
    const fullSection = formSectionTitle.trim()
      ? formSectionNumber.trim()
        ? `${nomenclature.sectionLabel} ${formSectionNumber.trim()}: ${formSectionTitle.trim()}`
        : formSectionTitle.trim()
      : "";

    setSubmitting(true);
    setUploadProgress(20);
    setUploadStatus("جارٍ حفظ بيانات الدرس...");

    try {
      let currentLessonId: string;

      if (editingLessonId) {
        currentLessonId = editingLessonId;
        const res = await fetch(`/api/lessons/${editingLessonId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: formLevel,
            type: formType,
            title: formTitle.trim(),
            field: formField.trim(),
            section: fullSection,
            number: formNumber,
            notes: formNotes.trim(),
            homeworkNotes: formHomeworkNotes.trim(),
            homeworkDueAt: formHomeworkDueAt || null,
            solutionPublishAt: formSolutionPublishAt || null,
          }),
        });
        if (!res.ok) throw new Error("فشل تعديل بيانات الدرس");
      } else {
        const res = await fetch("/api/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: formLevel,
            type: formType,
            title: formTitle.trim(),
            field: formField.trim(),
            section: fullSection,
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

      // رفع الصور المحددة إن وجدت
      if (boardFiles.length > 0) {
        setUploadProgress(50);
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
      showToast("ok", editingLessonId ? "تم تعديل الدرس وتحديثه بنجاح ✨" : "تم نشر درس السبورة بنجاح 📋");

      // تفريغ النموذج وتجهيزه للدرس القادم
      handleCancelEdit();
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
      if (editingLessonId === id) {
        handleCancelEdit();
      }
    } catch (err: any) {
      showToast("err", err.message || "فشل الحذف");
    }
  };

  // حذف صورة محددة من السبورة
  const handleDeleteImage = async (lessonId: string, imageId: string) => {
    if (!confirm("هل تريد حذف هذه الصورة من السبورة؟")) return;
    try {
      const res = await fetch(`/api/images?lessonId=${lessonId}&imageId=${imageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("تعذر حذف الصورة");
      showToast("ok", "تم حذف صورة السبورة بنجاح");
      await loadLessons();
    } catch (err: any) {
      showToast("err", err.message || "فشل حذف الصورة");
    }
  };

  // نسخ رابط مشاركة الأولياء
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

  // تصفية وعرض الدروس
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

  // إحصاءات الصفحة
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

  // الحصول على اسم وأيقونة أي كراس
  const getNotebookMeta = (typeId?: string) => {
    const target = typeId || "lessons";
    const found = notebooks.find((n) => n.id === target);
    if (found) return { label: found.label, icon: found.icon || "📘" };
    if (target === "lessons") return { label: "كراس الدروس", icon: "📘" };
    if (target === "directed_work") return { label: "أعمال موجهة", icon: "📑" };
    if (target === "worksheets") return { label: "أوراق عمل", icon: "📋" };
    if (target === "summaries") return { label: "ملخصات", icon: "📂" };
    return { label: target, icon: "📙" };
  };

  if (authenticated === false) {
    return <LoginRequired next="/admin/board" title="كراس الدروس والسبورة الرقمية" />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] text-gray-900 pb-24 font-sans" dir="rtl">
      {/* ── شريط الإشعار السريع الفوري ── */}
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

      {/* ── رأس الصفحة والهوية ── */}
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
              إضافة وتوثيق مباشر لدروس السبورة اليومية والملخصات والواجبات المدرسية دون أي نوافذ منبثقة، ليتابعها الأولياء والتلاميذ فوراً.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
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
          </div>
        </div>
      </div>

      {/* ── المحتوى الرئيسي ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 space-y-6">
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

        {/* ════════════════════════════════════════════════════════════════
            قسم الإضافة المباشرة في الصفحة (دون نوافذ منبثقة إطلاقاً)
            ════════════════════════════════════════════════════════════════ */}
        <section
          ref={formSectionRef}
          className={`bg-white rounded-3xl border transition-all duration-200 shadow-sm overflow-hidden ${
            editingLessonId ? "border-amber-400 ring-4 ring-amber-100" : "border-[#107a57]/30"
          }`}
        >
          {/* رأس بطاقة الإدخال */}
          <div
            className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              editingLessonId ? "bg-amber-50/70 border-amber-200" : "bg-gradient-to-r from-emerald-50/60 to-white border-[#e8e8e0]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-2xs ${
                  editingLessonId ? "bg-amber-600 text-white" : "bg-[#107a57] text-white"
                }`}
              >
                {editingLessonId ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <span>{editingLessonId ? "تعديل درس منشوَر في السبورة" : "إضافة درس وسبورة اليوم مباشرة"}</span>
                  {editingLessonId && (
                    <span className="text-[11px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                      وضع التعديل
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  {editingLessonId
                    ? "عدّل البيانات والصور ثم اضغط على زر التحديث في الأسفل."
                    : "اتبع الخطوات المتسلسلة: اختر المستوى ثم الكراس، واكتب عناصر الدرس والواجب."}
                </p>
              </div>
            </div>

            {/* أدوات التحكم في التسميات والقوالب */}
            <div className="flex items-center gap-2 flex-wrap">
              {editingLessonId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>إلغاء التعديل</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowNomenclatureCustomizer(!showNomenclatureCustomizer)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="تخصيص تسميات الحقول حسب مادتك التعليمية"
              >
                <Settings className="w-3.5 h-3.5 text-gray-500" />
                <span>تسميات مادتي</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          </div>

          {/* لوحة تخصيص تسميات المادة إن فُتحت */}
          {showNomenclatureCustomizer && (
            <div className="p-4 bg-slate-50 border-b border-gray-200 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  اختر نمط مادتك لتكييف مسميات الحقول فوراً:
                </span>
                <button
                  type="button"
                  onClick={() => setShowNomenclatureCustomizer(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  إغلاق ✕
                </button>
              </div>

              {/* أزرار القوالب الجاهزة بنقرة واحدة */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {NOMENCLATURE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPresetNomenclature(p.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-right transition cursor-pointer flex flex-col gap-1 ${
                      activePresetId === p.id
                        ? "border-[#107a57] bg-white text-[#107a57] shadow-2xs ring-2 ring-[#107a57]/20"
                        : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span className="font-black">{p.name}</span>
                    <span className="text-[10px] text-gray-500">
                      {p.nomenclature.fieldLabel} • {p.nomenclature.sectionLabel}
                    </span>
                  </button>
                ))}
              </div>

              {/* تخصيص يدوي للمسميات */}
              <div className="pt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    تسمية الحقل الأول:
                  </label>
                  <input
                    type="text"
                    value={nomenclature.fieldLabel}
                    onChange={(e) =>
                      persistNomenclature({ ...nomenclature, fieldLabel: e.target.value })
                    }
                    className="w-full py-1.5 px-2.5 rounded-lg border border-gray-300 text-xs bg-white focus:outline-none focus:border-[#107a57]"
                    placeholder="مثال: الميدان أو المجال"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    تسمية الحقل الثاني:
                  </label>
                  <input
                    type="text"
                    value={nomenclature.sectionLabel}
                    onChange={(e) =>
                      persistNomenclature({ ...nomenclature, sectionLabel: e.target.value })
                    }
                    className="w-full py-1.5 px-2.5 rounded-lg border border-gray-300 text-xs bg-white focus:outline-none focus:border-[#107a57]"
                    placeholder="مثال: المقطع أو الوحدة"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    تسمية الحقل الثالث:
                  </label>
                  <input
                    type="text"
                    value={nomenclature.lessonLabel}
                    onChange={(e) =>
                      persistNomenclature({ ...nomenclature, lessonLabel: e.target.value })
                    }
                    className="w-full py-1.5 px-2.5 rounded-lg border border-gray-300 text-xs bg-white focus:outline-none focus:border-[#107a57]"
                    placeholder="مثال: عنوان الدرس أو المورد"
                  />
                </div>
              </div>
            </div>
          )}

          {/* النموذج المباشر */}
          <form onSubmit={handleSaveLesson} className="p-4 sm:p-6 space-y-6">
            {/* ── الخطوة 1: اختيار المستوى الدراسي ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#107a57] text-white flex items-center justify-center text-[11px] font-bold">
                    1
                  </span>
                  <span>المستوى الدراسي المستهدف:</span>
                </label>
                <span className="text-[11px] text-gray-400 font-bold">انقر لتحديد المستوى</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {teacherLevels.map((lv) => {
                  const isSelected = formLevel === lv;
                  return (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => setFormLevel(lv)}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-[#107a57] text-white border-[#107a57] shadow-sm ring-2 ring-[#107a57]/30 scale-[1.01]"
                          : "bg-[#fafaf7] hover:bg-gray-100 text-gray-700 border-[#e8e8e0]"
                      }`}
                    >
                      <span className="text-base">{lv === 4 ? "🎓" : lv === 3 ? "📐" : lv === 2 ? "✏️" : "🌱"}</span>
                      <span>{LEVELS[lv as 1 | 2 | 3 | 4].label} ({lv}م)</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── الخطوة 2: اختيار الكراس (مع سهولة الحذف والإضافة) ── */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#107a57] text-white flex items-center justify-center text-[11px] font-bold">
                    2
                  </span>
                  <span>نوع الكراس أو المورد:</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddNotebookInput(!showAddNotebookInput)}
                    className="text-[11px] font-black text-[#107a57] bg-[#e6f4ee] hover:bg-emerald-100 border border-[#107a57]/30 px-2.5 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة كراس مخصص</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRestoreDefaultNotebooks}
                    className="text-[11px] font-medium text-gray-400 hover:text-gray-600 transition flex items-center gap-1 cursor-pointer"
                    title="استعادة الكراريس الافتراضية"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>استعادة الافتراضية</span>
                  </button>
                </div>
              </div>

              {/* حقل إضافة كراس مخصص جديد */}
              {showAddNotebookInput && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center gap-2 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={newNotebookName}
                    onChange={(e) => setNewNotebookName(e.target.value)}
                    placeholder="اكتب اسم الكراس الجديد (مثلاً: دفتر الأنشطة، كراس الفروض...)"
                    className="flex-1 py-1.5 px-3 rounded-xl border border-emerald-300 text-xs bg-white focus:outline-none focus:border-[#107a57] font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomNotebook}
                    className="px-4 py-1.5 rounded-xl bg-[#107a57] hover:bg-[#0c5c41] text-white text-xs font-black transition cursor-pointer"
                  >
                    إضافة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddNotebookInput(false)}
                    className="px-2.5 py-1.5 rounded-xl text-gray-500 hover:bg-gray-100 text-xs transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              )}

              {/* أزرار الكراريس المتاحة مع زر الحذف السريع */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap">
                {notebooks.map((nb) => {
                  const isSelected = formType === nb.id;
                  return (
                    <div
                      key={nb.id}
                      className={`group relative inline-flex items-center rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? "bg-[#e6f4ee] border-[#107a57] text-[#107a57] font-black shadow-2xs ring-2 ring-[#107a57]/20"
                          : "bg-white hover:bg-gray-50 border-[#e8e8e0] text-gray-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setFormType(nb.id)}
                        className="py-2 pr-3 pl-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{nb.icon || "📘"}</span>
                        <span>{nb.label}</span>
                      </button>

                      {/* زر حذف الكراس بسهولة إذا كانت المادة لا تحتاجه */}
                      {nb.canDelete !== false && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotebook(nb.id, nb.label);
                          }}
                          className="w-5 h-5 ml-2 mr-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition cursor-pointer"
                          title={`حذف "${nb.label}" من القائمة إذا كانت مادتك لا تحتاجه`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── الخطوة 3: التسميات والمعلومات البيداغوجية ── */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <label className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#107a57] text-white flex items-center justify-center text-[11px] font-bold">
                  3
                </span>
                <span>المعلومات البيداغوجية وعنوان الدرس:</span>
              </label>

              {/* سطر الميدان والمقطع */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* حقل الميدان */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">
                    {nomenclature.fieldLabel}:
                  </label>
                  <input
                    type="text"
                    value={formField}
                    onChange={(e) => setFormField(e.target.value)}
                    placeholder={`اكتب ${nomenclature.fieldLabel} هنا...`}
                    className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57] font-bold"
                  />

                  {/* اقتراحات سريعة للميدان */}
                  {NOMENCLATURE_PRESETS.find((p) => p.id === activePresetId)?.suggestions && (
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      <span className="text-[10px] text-gray-400 font-bold">اقتراحات:</span>
                      {NOMENCLATURE_PRESETS.find((p) => p.id === activePresetId)!.suggestions.map(
                        (sug) => (
                          <button
                            key={sug.field}
                            type="button"
                            onClick={() => {
                              setFormField(sug.field);
                              if (sug.sections[0]) {
                                setFormSectionTitle(sug.sections[0]);
                              }
                            }}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 hover:bg-emerald-50 text-gray-600 hover:text-emerald-900 border border-gray-200 transition cursor-pointer"
                          >
                            {sug.field}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* حقل المقطع مع رقمه */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">
                    {nomenclature.sectionLabel} والرقم:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formSectionNumber}
                      onChange={(e) => setFormSectionNumber(e.target.value)}
                      placeholder="رقم 1"
                      className="w-16 py-2 px-2 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57] font-black text-center font-mono"
                    />
                    <input
                      type="text"
                      value={formSectionTitle}
                      onChange={(e) => setFormSectionTitle(e.target.value)}
                      placeholder={`عنوان ${nomenclature.sectionLabel}...`}
                      className="flex-1 py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57] font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* سطر رقم الدرس وعنوان الدرس */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                {/* رقم الدرس */}
                <div className="sm:col-span-1 space-y-1">
                  <label className="block text-xs font-bold text-gray-700">
                    رقم الدرس / الحصة:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formNumber}
                    onChange={(e) => setFormNumber(Number(e.target.value))}
                    className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57] font-black text-center font-mono"
                  />
                </div>

                {/* عنوان الدرس البارز */}
                <div className="sm:col-span-3 space-y-1">
                  <label className="block text-xs font-black text-gray-900">
                    {nomenclature.lessonLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مثال: قسمة عدد عشري على عدد طبيعي / حساب مساحة المثلث..."
                    className="w-full py-2.5 px-3.5 rounded-xl border-2 border-emerald-200 focus:border-[#107a57] text-xs bg-white focus:outline-none font-black shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* ── الخطوة 4: التقاط صور السبورة والملفات ── */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#107a57] text-white flex items-center justify-center text-[11px] font-bold">
                    4
                  </span>
                  <span>صور السبورة وكراس القسم:</span>
                </label>
                <span className="text-[11px] text-gray-500 font-bold">
                  {boardFiles.length > 0 ? `تم اختيار (${boardFiles.length}) ملفات` : "التقاط فوري أو رفع ملفات"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* التقاط مباشر بالكاميرا الخلفية للهاتف والتابلت */}
                <label className="p-3.5 rounded-2xl border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 text-center transition cursor-pointer flex items-center justify-center gap-2.5 shadow-2xs group">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-black text-emerald-950">
                      التقاط بالكاميرا مباشرة 📷
                    </span>
                    <span className="block text-[10px] text-emerald-700">
                      يفتح كاميرا الهاتف فوراً لتصوير السبورة بنهاية الحصة
                    </span>
                  </div>
                </label>

                {/* رفع من المعرض أو الملفات */}
                <label className="p-3.5 rounded-2xl border-2 border-dashed border-[#e8e8e0] hover:border-[#107a57] bg-[#fafaf7] hover:bg-gray-100 text-center transition cursor-pointer flex items-center justify-center gap-2.5 shadow-2xs group">
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-8 h-8 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-bold text-gray-800">
                      اختيار صور أو PDF من الجهاز 📁
                    </span>
                    <span className="block text-[10px] text-gray-500">
                      من ألبوم الصور أو مستندات الحاسوب
                    </span>
                  </div>
                </label>
              </div>

              {/* معاينة الصور المختارة قبل الحفظ */}
              {boardFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  {boardFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="relative p-2 rounded-xl border border-[#107a57]/40 bg-emerald-50/30 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pl-2">
                        <span className="block font-bold text-gray-800 text-[11px] truncate">
                          {f.name}
                        </span>
                        <span className="block text-[10px] text-[#107a57] font-mono">
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(idx)}
                        className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs shrink-0 cursor-pointer"
                        title="إلغاء هذا الملف"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── الخطوة 5: عناصر وملخص السبورة والواجب المنزلي (اختياري) ── */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <label className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#107a57] text-white flex items-center justify-center text-[11px] font-bold">
                  5
                </span>
                <span>الملخص والواجب المنزلي (اختياري):</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* ملخص عناصر الدرس */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-700">
                    عناصر وخلاصة ما كُتب على السبورة:
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="اكتب النقاط الرئيسية، القوانين الرياضية المستخلصة، أو توجيهات الأستاذ..."
                    className="w-full py-2 px-3 rounded-xl border border-[#e8e8e0] text-xs bg-[#fafaf7] focus:bg-white focus:outline-none focus:border-[#107a57]"
                  />
                </div>

                {/* الواجب المنزلي */}
                <div className="space-y-1 p-2.5 bg-amber-50/70 border border-amber-200 rounded-2xl">
                  <label className="block text-[11px] font-black text-amber-950">
                    الواجب المنزلي المطلوب من التلاميذ:
                  </label>
                  <textarea
                    rows={2}
                    value={formHomeworkNotes}
                    onChange={(e) => setFormHomeworkNotes(e.target.value)}
                    placeholder="مثال: حل التمرين 14 و 15 صفحة 60 في كراس المحاولات..."
                    className="w-full py-1.5 px-2.5 rounded-xl border border-amber-300 bg-white text-xs focus:outline-none focus:border-amber-600 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* شريط التقدم عند الرفع */}
            {submitting && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-[#107a57]" />
                    {uploadStatus}
                  </span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#107a57] h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* ── الخطوة 6: زر الحفظ الواضح والمباشر ── */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#e8e8e0]">
              <div className="text-xs text-gray-500 font-medium">
                {editingLessonId ? (
                  <span className="text-amber-700 font-bold">
                    ✏️ سيتم تحديث الدرس المختار مباشرة في قاعدة البيانات.
                  </span>
                ) : (
                  <span>✨ سيظهر الدرس فوراً لجميع الأولياء والتلاميذ والمفتشية.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editingLessonId && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleCancelEdit}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                  >
                    إلغاء التعديل
                  </button>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-3 px-6 font-black shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 transition"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ الحفظ والرفع...</span>
                    </>
                  ) : editingLessonId ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>حفظ تعديلات الدرس الآن</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>حفظ ونشر درس السبورة الآن</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* دليل الصفحة البيداغوجي */}
        <PageExplainer
          pageId="board"
          title="كراس الدروس والسبورة الرقمية"
          teacherRoleExplanation="هنا تلتقط وترفع صور السبورة في نهاية كل حصة، مع ملخص الدرس والواجب المنزلي، حتى يتمكن التلميذ الغائب من نقل درسه ويواكب ولي أمره ما تم تقديمه في القسم."
          parentRoleExplanation="يستطيع الولي فتح سبورة القسم والتأكد من نقل ابنه للدرس كاملاً ومساعدته في حل الواجبات."
          inspectorExplanation="يمكّن المفتش من متابعة جودة التوثيق والمنتوج التعليمي المكتوب على السبورة لتقويم الأثر البيداغوجي."
        />

        {/* ── شريط الفلاتر والبحث في الدروس السابقة ── */}
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

          {/* تصنيف نوع الكراس في الفلترة */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 overflow-x-auto text-xs">
            <span className="text-gray-500 font-bold shrink-0">نوع الكراس:</span>
            <button
              type="button"
              onClick={() => setSelectedType("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedType === "all"
                  ? "bg-[#e6f4ee] text-[#107a57] font-black border border-[#107a57]/30 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              كافة الكراريس
            </button>
            {notebooks.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedType(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                  selectedType === cat.id
                    ? "bg-[#e6f4ee] text-[#107a57] font-black border border-[#107a57]/30 shadow-2xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <span>{cat.icon || "📘"}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── معرض الدروس المنشورة ── */}
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
                  : "استخدم النموذج بالأعلى لرفع وتوثيق أول درس لسبورة القسم."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-500 px-1 font-bold">
              <span>إجمالي الدروس المنشورة: {filteredLessons.length}</span>
              <span>الأحدث أولاً</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLessons.map((lesson) => {
                const nbMeta = getNotebookMeta(lesson.type);

                return (
                  <div
                    key={lesson.id}
                    className={`bg-white rounded-3xl border shadow-xs hover:shadow-sm transition-all flex flex-col justify-between overflow-hidden ${
                      editingLessonId === lesson.id
                        ? "border-amber-400 ring-2 ring-amber-200"
                        : "border-[#e8e8e0] hover:border-[#107a57]/40"
                    }`}
                  >
                    <div className="p-4 sm:p-5 space-y-3">
                      {/* الشارات العلوية */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-7 h-7 rounded-lg bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 flex items-center justify-center text-xs font-black">
                            {lesson.level}م
                          </span>
                          <span className="text-[11px] font-bold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <span>{nbMeta.icon}</span>
                            <span>{nbMeta.label}</span>
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
                          لا توجد صور سبورة مرفوعة لهذا الدرس.
                        </div>
                      )}

                      {/* ملخص عناصر الدرس المكتوبة على السبورة */}
                      {lesson.notes && (
                        <div className="p-3 bg-[#fafaf7] rounded-xl border border-[#e8e8e0] text-xs text-gray-700 space-y-1">
                          <span className="font-bold text-gray-800 block text-[11px]">
                            عناصر وخلاصة السبورة:
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
                            الواجب المنزلي المطلوب من التلاميذ:
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
                          onClick={() => handleStartEditLesson(lesson)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-200/70 transition cursor-pointer flex items-center gap-1"
                          title="تعديل هذا الدرس في النموذج بالأعلى"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                          <span>تعديل</span>
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
                          <span>معاينة في فضاء الولي</span>
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
