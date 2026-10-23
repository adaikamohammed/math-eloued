"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import imageCompression from "browser-image-compression";
import Link from "next/link";
import { LoginRequired } from "@/components/LoginRequired";
import { withTeacher } from "@/lib/teacherParam";
import { PedagogyAlerts } from "@/components/PedagogyAlerts";
import { ParentShareModal } from "@/components/ParentShareModal";
import { BOARD_IMAGE_OPTIONS } from "@/lib/compress";
import {
  Plus,
  Trash2,
  Upload,
  LogOut,
  Share2,
  ChevronDown,
  Loader2,
  Pencil,
  X,
  ExternalLink,
  ShieldCheck,
  Settings,
  Lock,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Eye,
  Megaphone,
  Globe,
  RefreshCw,
  StickyNote,
  BookOpen,
  Users,
  UserPlus,
  Clock,
  Trophy,
  Award,
  Sparkles,
  Star,
  GraduationCap,
  OctagonAlert,
  MinusCircle,
  FileWarning,
  HeartHandshake,
  ClipboardCheck,
  Calculator,
  FileText,
  Check,
  Search,
  Scale,
  Download,
  MessageSquare,
  Bell,
  Pin,
  EyeOff,
  Copy,
  Mail,
} from "lucide-react";
import {
  LEVELS,
  COMMON_FIELDS,
  HONOR_CLASSES,
  MIDDLE_SCHOOL_SUBJECTS,
  isPdfFile,
  type Lesson,
  type LessonImage,
  type NotebookType,
  type ParentSummons,
  type HonorStudent,
  type Penalty,
  type StudentEvaluation,
  type Announcement,
  type AnnouncementCategory,
  type AnonymousMessage,
  type MessageCategory,
} from "@/lib/types";

export type TeacherSession = {
  id: string;
  full_name: string | null;
  slug: string | null;
  teacher_code: string | null;
  school_custom_name: string | null;
  levels_taught: number[] | null;
  subject?: string | null;
};

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<TeacherSession | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      setProfile(data.profile ?? null);
      setAuthenticated(Boolean(data.authenticated));
    } catch {
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (authenticated === null) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return authenticated && profile ? (
    <Dashboard profile={profile} onLogout={() => setAuthenticated(false)} />
  ) : (
    <LoginRequired next="/admin" title="لوحة تحكم الأستاذ" />
  );
}

/* ---------------- 2. لوحة التحكم الرئيسية ---------------- */
function Dashboard({ profile, onLogout }: { profile: TeacherSession; onLogout: () => void }) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const levelsTaught = (
    profile.levels_taught && profile.levels_taught.length > 0 ? profile.levels_taught : [1, 2, 3, 4]
  ).filter((lv): lv is 1 | 2 | 3 | 4 => [1, 2, 3, 4].includes(lv));
  const [mainTab, setMainTab] = useState<
    "lessons" | "summons" | "honors" | "evaluations" | "penalties" | "announcements" | "messages"
  >("lessons");
  const [level, setLevel] = useState<1 | 2 | 3 | 4>(levelsTaught[0] ?? 1);
  const [notebookTab, setNotebookTab] = useState<NotebookType>("lessons");
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [summonsList, setSummonsList] = useState<ParentSummons[]>([]);
  const [honorsList, setHonorsList] = useState<HonorStudent[]>([]);
  const [penaltiesList, setPenaltiesList] = useState<Penalty[]>([]);
  const [evaluationsList, setEvaluationsList] = useState<StudentEvaluation[]>([]);
  const [evalClass, setEvalClass] = useState<string>("1 م 1");
  const [evalGroup, setEvalGroup] = useState<"فوج 1" | "فوج 2" | "القسم كامل">("فوج 1");
  const [evalSearch, setEvalSearch] = useState<string>("");
  const [singleEvalName, setSingleEvalName] = useState<string>("");
  const [isBatchEvalModalOpen, setIsBatchEvalModalOpen] = useState(false);
  const [batchEvalNames, setBatchEvalNames] = useState("");
  const [batchEvalClass, setBatchEvalClass] = useState("1 م 1");
  const [batchEvalGroup, setBatchEvalGroup] = useState<"فوج 1" | "فوج 2" | "القسم كامل">("فوج 1");
  const [batchDefaultFullScore, setBatchDefaultFullScore] = useState(true);
  const [loading, setLoading] = useState(true);

  // حقول إضافة درس أو سلسلة أو ملخص
  const [field, setField] = useState("أنشطة عددية");
  const [section, setSection] = useState("المقطع 1 : الأعداد الطبيعية والأعداد العشرية");
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [lessonHomeworkNotes, setLessonHomeworkNotes] = useState("");
  const [filterMissingHw, setFilterMissingHw] = useState(false);

  // حقول إضافة استدعاء ولي أمر
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("1م3");
  const [summonsNotes, setSummonsNotes] = useState("");
  const [isExtraSunday, setIsExtraSunday] = useState(false);

  // حقول إضافة تلميذ في لوحة الشرف
  const [honorStudentName, setHonorStudentName] = useState("");
  const [honorClass, setHonorClass] = useState<string>("1 م 1");
  const [honorNotes, setHonorNotes] = useState("");
  const [honorBadge, setHonorBadge] = useState("");
  const [selectedHonorFilter, setSelectedHonorFilter] = useState<string>("all");

  // حقول إضافة عقوبة أو خصم (تلميذ أو مجموعة تلاميذ)
  const [penaltyStudents, setPenaltyStudents] = useState<string[]>([]);
  const [currentStudentName, setCurrentStudentName] = useState("");
  const [penaltyClass, setPenaltyClass] = useState<string>("1 م 1");
  const [penaltyDeduction, setPenaltyDeduction] = useState("ناقص 3 في التقويم المستمر (-3)");
  const [penaltyReason, setPenaltyReason] = useState("");
  const [penaltyDate, setPenaltyDate] = useState("");
  const [penaltyTiming, setPenaltyTiming] = useState("");
  const [penaltyNotes, setPenaltyNotes] = useState("");
  const [selectedPenaltyFilter, setSelectedPenaltyFilter] = useState<string>("all");

  // دوال مساعدة لإضافة وحذف التلاميذ من القائمة دفعة واحدة
  const handleAddStudent = () => {
    if (!currentStudentName.trim()) return;
    const parts = currentStudentName
      .split(/[\n,،]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setPenaltyStudents((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (!next.includes(p)) next.push(p);
      }
      return next;
    });
    setCurrentStudentName("");
  };

  const handleRemoveStudent = (nameToRemove: string) => {
    setPenaltyStudents((prev) => prev.filter((n) => n !== nameToRemove));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // حالات النوافذ المنبثقة
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [deletingLesson, setDeletingLesson] = useState<Lesson | null>(null);
  const [editingSummons, setEditingSummons] = useState<ParentSummons | null>(null);
  const [deletingSummons, setDeletingSummons] = useState<ParentSummons | null>(null);
  const [editingHonor, setEditingHonor] = useState<HonorStudent | null>(null);
  const [deletingHonor, setDeletingHonor] = useState<HonorStudent | null>(null);
  const [editingPenalty, setEditingPenalty] = useState<Penalty | null>(null);
  const [deletingPenalty, setDeletingPenalty] = useState<Penalty | null>(null);

  // حالات لوحة الإعلانات
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annCategory, setAnnCategory] = useState<AnnouncementCategory>("general");
  const [annDate, setAnnDate] = useState("");
  const [annPinned, setAnnPinned] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<Announcement | null>(null);

  // حالات صندوق الرسائل المجهولة
  const [messagesList, setMessagesList] = useState<AnonymousMessage[]>([]);
  const [messageCategoryFilter, setMessageCategoryFilter] = useState<string>("all");
  const [messageReadFilter, setMessageReadFilter] = useState<"all" | "unread" | "read">("all");
  const [deletingMessage, setDeletingMessage] = useState<AnonymousMessage | null>(null);

  const loadLessons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/lessons?level=${level}&_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      setAllLessons(data.lessons || []);
    } finally {
      setLoading(false);
    }
  }, [level]);

  const loadSummons = useCallback(async () => {
    try {
      const res = await fetch(`/api/summons?_t=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      setSummonsList(data.summons || []);
    } catch {
      setSummonsList([]);
    }
  }, []);

  const loadHonors = useCallback(async () => {
    try {
      const res = await fetch(`/api/honors?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data = await res.json();
      setHonorsList(data.honors || []);
    } catch {
      setHonorsList([]);
    }
  }, []);

  const loadPenalties = useCallback(async () => {
    try {
      const res = await fetch(`/api/penalties?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data = await res.json();
      setPenaltiesList(data.penalties || []);
    } catch {
      setPenaltiesList([]);
    }
  }, []);

  const loadEvaluations = useCallback(async () => {
    try {
      const res = await fetch(`/api/evaluations?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data = await res.json();
      setEvaluationsList(data.evaluations || []);
    } catch {
      setEvaluationsList([]);
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await fetch(`/api/announcements?all=true&_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data = await res.json();
      setAnnouncementsList(data.announcements || []);
    } catch {
      setAnnouncementsList([]);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data = await res.json();
      setMessagesList(data.messages || []);
    } catch {
      setMessagesList([]);
    }
  }, []);

  useEffect(() => {
    loadLessons();
    loadSummons();
    loadHonors();
    loadPenalties();
    loadEvaluations();
    loadAnnouncements();
    loadMessages();
  }, [loadLessons, loadSummons, loadHonors, loadPenalties, loadEvaluations, loadAnnouncements, loadMessages]);

  const unreadMessagesCount = useMemo(() => {
    return messagesList.filter((m) => !m.read).length;
  }, [messagesList]);

  // حفظ أو تعديل إعلان
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) {
      showToast("error", "يرجى كتابة عنوان الإعلان وتفاصيله");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAnnouncement) {
        const res = await fetch("/api/announcements", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingAnnouncement.id,
            title: annTitle.trim(),
            content: annContent.trim(),
            category: annCategory,
            date: annDate.trim() || undefined,
            pinned: annPinned,
          }),
        });
        if (res.ok) {
          showToast("success", "تم تعديل الإعلان بنجاح");
          setEditingAnnouncement(null);
          setAnnTitle("");
          setAnnContent("");
          setAnnDate("");
          setAnnPinned(false);
          loadAnnouncements();
        } else {
          showToast("error", "فشل تعديل الإعلان");
        }
      } else {
        const res = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: annTitle.trim(),
            content: annContent.trim(),
            category: annCategory,
            date: annDate.trim() || undefined,
            pinned: annPinned,
          }),
        });
        if (res.ok) {
          showToast("success", "تم نشر الإعلان بنجاح في الموقع");
          setAnnTitle("");
          setAnnContent("");
          setAnnDate("");
          setAnnPinned(false);
          loadAnnouncements();
        } else {
          showToast("error", "فشل نشر الإعلان");
        }
      }
    } catch {
      showToast("error", "حدث خطأ في الاتصال");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePinAnnouncement = async (item: Announcement) => {
    try {
      const res = await fetch("/api/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          pinned: !item.pinned,
        }),
      });
      if (res.ok) {
        showToast("success", item.pinned ? "تم إلغاء تثبيت الإعلان" : "تم تثبيت الإعلان في أعلى الموقع 📌");
        loadAnnouncements();
      }
    } catch {
      showToast("error", "حدث خطأ");
    }
  };

  const handleToggleActiveAnnouncement = async (item: Announcement) => {
    try {
      const res = await fetch("/api/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          active: item.active === false ? true : false,
        }),
      });
      if (res.ok) {
        showToast("success", item.active === false ? "تم إظهار الإعلان للزوار" : "تم إخفاء الإعلان مؤقتاً");
        loadAnnouncements();
      }
    } catch {
      showToast("error", "حدث خطأ");
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const res = await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("success", "تم حذف الإعلان نهائياً");
        setDeletingAnnouncement(null);
        loadAnnouncements();
      } else {
        showToast("error", "فشل حذف الإعلان");
      }
    } catch {
      showToast("error", "حدث خطأ");
    }
  };

  const handleToggleMessageRead = async (item: AnonymousMessage) => {
    try {
      const res = await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          read: !item.read,
        }),
      });
      if (res.ok) {
        loadMessages();
      }
    } catch {
      showToast("error", "حدث خطأ");
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const res = await fetch(`/api/messages?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("success", "تم حذف الرسالة");
        setDeletingMessage(null);
        loadMessages();
      } else {
        showToast("error", "فشل حذف الرسالة");
      }
    } catch {
      showToast("error", "حدث خطأ");
    }
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  };

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    onLogout();
  };

  const currentItems = useMemo(() => {
    let items = allLessons.filter((l) => {
      if (notebookTab === "worksheets") return l.type === "worksheets";
      if (notebookTab === "summaries") return l.type === "summaries";
      if (notebookTab === "directed_work") return l.type === "directed_work";
      return !l.type || l.type === "lessons";
    });

    if (filterMissingHw && notebookTab === "lessons") {
      items = items.filter((l) => !l.homeworkImages || l.homeworkImages.length === 0);
    }

    return items;
  }, [allLessons, notebookTab, filterMissingHw]);

  const knownSections = useMemo(() => {
    const set = new Set<string>();
    for (const l of allLessons) {
      if (l.section) {
        set.add(l.section);
      }
    }
    return Array.from(set);
  }, [allLessons]);

  const nextNumber = currentItems.length ? Math.max(...currentItems.map((l) => l.number)) + 1 : 1;

  // 1. إضافة مورد معرفي أو حصة أعمال موجهة أو سلسلة أو ملخص مع تحديث فوري مباشر
  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("error", "يرجى كتابة العنوان أولاً");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          type: notebookTab,
          field: notebookTab === "lessons" ? field.trim() : undefined,
          section: section.trim() || undefined,
          number: Number(number) || nextNumber,
          title: title.trim(),
          notes: notes.trim() || undefined,
          homeworkNotes: notebookTab === "lessons" ? lessonHomeworkNotes.trim() || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ");

      setTitle("");
      setNumber("");
      setNotes("");
      setLessonHomeworkNotes("");

      // تحديث فوري للواجهة بدون الحاجة لانتظار أو تحديث المتصفح
      setAllLessons((prev) => [...prev, data.lesson]);
      setOpenId(data.lesson.id);

      const tabLabel =
        notebookTab === "lessons"
          ? "كراس الدروس"
          : notebookTab === "directed_work"
          ? "الأعمال الموجهة"
          : notebookTab === "worksheets"
          ? "سلاسل التمارين"
          : "الملخصات والمطويات";

      showToast(
        "success",
        `✓ تم إضافة "${data.lesson.title}" مباشرة إلى ${tabLabel}!`
      );
    } catch (e: any) {
      showToast("error", "خطأ: " + (e.message || "تعذر الإضافة"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. إضافة تلميذ إلى قائمة أولياء أود استقبالهم مع تحديث فوري مباشر
  const addSummons = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !className.trim()) {
      showToast("error", "يرجى كتابة اسم التلميذ والقسم");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/summons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNames: studentName.trim(),
          className: className.trim(),
          notes: summonsNotes.trim() || undefined,
          isUrgent: isExtraSunday,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التسجيل");

      setStudentName("");
      setSummonsNotes("");
      setIsExtraSunday(false);

      // تحديث فوري مباشر
      const newItems = Array.isArray(data.allSummons) ? data.allSummons : [data.summons];
      setSummonsList((prev) => [...newItems, ...prev]);

      showToast(
        "success",
        `✓ تم إضافة التلميذ إلى قائمة "أولياء أود استقبالهم" بنجاح! 🤝`
      );
    } catch (e: any) {
      showToast("error", "خطأ: " + (e.message || "تعذر تسجيل الموعد"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. إضافة تلميذ إلى لوحة الشرف مع تحديث فوري مباشر للواجهة
  const addHonor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!honorStudentName.trim() || !honorClass.trim()) {
      showToast("error", "يرجى كتابة اسم التلميذ واختيار القسم");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/honors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: honorStudentName.trim(),
          className: honorClass.trim(),
          notes: honorNotes.trim() || undefined,
          badge: honorBadge.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل التلميذ");

      setHonorStudentName("");
      setHonorNotes("");
      setHonorBadge("");

      // تحديث فوري مباشر
      setHonorsList((prev) => [data.honor, ...prev]);

      showToast("success", `✓ تم إضافة التلميذ "${data.honor.studentName}" فورياً إلى لوحة الشرف! 🏆`);
    } catch (e: any) {
      showToast("error", "خطأ: " + (e.message || "تعذر تسجيل التلميذ"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. إضافة عقوبة أو خصم لتلميذ أو مجموعة تلاميذ مع توقيت موحد وحفظ دفعة واحدة
  const addPenalty = async (e: React.FormEvent) => {
    e.preventDefault();

    // نجمع التلاميذ الموجودين في القائمة المحددة + أي اسم مكتوب في حقل الإدخال الحالي
    let finalStudents = [...penaltyStudents];
    if (currentStudentName.trim()) {
      const extraParts = currentStudentName
        .split(/[\n,،]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const p of extraParts) {
        if (!finalStudents.includes(p)) finalStudents.push(p);
      }
    }

    if (finalStudents.length === 0) {
      showToast("error", "يرجى إضافة تلميذ واحد على الأقل للعقوبة");
      return;
    }

    if (!penaltyClass.trim() || !penaltyDeduction.trim() || !penaltyReason.trim()) {
      showToast("error", "يرجى ملء القسم، ومقدار الخصم، وسبب العقوبة");
      return;
    }

    // تجهيز التاريخ والتوقيت الموحد
    let finalDateTime = penaltyDate.trim();
    if (penaltyTiming.trim()) {
      finalDateTime = finalDateTime
        ? `${finalDateTime} (${penaltyTiming.trim()})`
        : penaltyTiming.trim();
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/penalties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNames: finalStudents,
          className: penaltyClass.trim(),
          deduction: penaltyDeduction.trim(),
          reason: penaltyReason.trim(),
          date: finalDateTime || undefined,
          notes: penaltyNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل العقوبة");

      // تفريغ قائمة التلاميذ وحقل الإدخال لعملية جديدة
      setPenaltyStudents([]);
      setCurrentStudentName("");
      setPenaltyReason("");
      setPenaltyNotes("");
      setPenaltyTiming("");

      // تحديث فوري مباشر
      const newItems = Array.isArray(data.penalties) ? data.penalties : [data.penalty];
      setPenaltiesList((prev) => [...newItems, ...prev]);

      showToast(
        "success",
        `✓ تم حفظ العقوبة بنجاح لـ (${newItems.length}) تلاميذ دفعة واحدة بنفس التوقيت! ⚠️`
      );
    } catch (e: any) {
      showToast("error", "خطأ: " + (e.message || "تعذر تسجيل العقوبة"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. مسح كافة الخصومات نهائياً
  const clearAllPenalties = async () => {
    if (!window.confirm("هل أنت متأكد من رغبتك في مسح كافة الخصومات المسجلة نهائياً؟")) return;
    try {
      const res = await fetch("/api/penalties?all=true", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل مسح الخصومات");
      setPenaltiesList([]);
      showToast("success", "✓ تم مسح كافة سجلات الخصومات بنجاح!");
    } catch (e: any) {
      showToast("error", "خطأ: " + (e.message || "تعذر مسح الخصومات"));
    }
  };

  // 6. دوال إدارة التقييم الميداني في الحصة
  const handleQuickRate = async (
    studentId: string,
    preset: "excellent" | "medium" | "weak"
  ) => {
    let nb = 5, hw = 5, tl = 5, act = 5;
    if (preset === "medium") {
      nb = 3; hw = 3; tl = 3; act = 3;
    } else if (preset === "weak") {
      nb = 1; hw = 1; tl = 1; act = 1;
    }

    const total = nb + hw + tl + act;
    const ratingColor = preset === "excellent" ? "emerald" : preset === "medium" ? "amber" : "rose";

    setEvaluationsList((prev) =>
      prev.map((e) =>
        e.id === studentId
          ? {
              ...e,
              notebookScore: nb,
              notebookComplete: nb >= 4,
              homeworkScore: hw,
              homeworkDone: hw >= 4,
              toolsScore: tl,
              hasTools: tl >= 4,
              activityScore: act,
              totalScore: total,
              rating: preset,
              ratingColor,
              updatedAt: new Date().toISOString(),
            }
          : e
      )
    );

    try {
      await fetch("/api/evaluations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: studentId,
          notebookScore: nb,
          homeworkScore: hw,
          toolsScore: tl,
          activityScore: act,
        }),
      });
    } catch {
      showToast("error", "تعذر حفظ التقييم في الخادم");
    }
  };

  const handleUpdateCriteria = async (
    studentId: string,
    field: "notebookScore" | "homeworkScore" | "toolsScore" | "activityScore",
    score: number
  ) => {
    const val = Math.max(0, Math.min(5, score));
    setEvaluationsList((prev) =>
      prev.map((e) => {
        if (e.id !== studentId) return e;
        const updated = { ...e, [field]: val };
        const total =
          (field === "notebookScore" ? val : updated.notebookScore) +
          (field === "homeworkScore" ? val : updated.homeworkScore) +
          (field === "toolsScore" ? val : updated.toolsScore) +
          (field === "activityScore" ? val : updated.activityScore);
        const ratingColor = total >= 16 ? "emerald" : total >= 10 ? "amber" : "rose";
        const rating =
          total >= 18
            ? "excellent"
            : total >= 15
            ? "very_good"
            : total >= 12
            ? "good"
            : total >= 10
            ? "medium"
            : "weak";
        return {
          ...updated,
          totalScore: total,
          rating,
          ratingColor,
          notebookComplete: field === "notebookScore" ? val >= 4 : updated.notebookComplete,
          homeworkDone: field === "homeworkScore" ? val >= 4 : updated.homeworkDone,
          hasTools: field === "toolsScore" ? val >= 4 : updated.hasTools,
        };
      })
    );

    try {
      await fetch("/api/evaluations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: studentId, [field]: val }),
      });
    } catch {
      showToast("error", "تعذر حفظ المعيار في الخادم");
    }
  };

  const handleApplyCatchUp = async (studentId: string) => {
    const target = evaluationsList.find((e) => e.id === studentId);
    if (!target) return;
    const newNb = Math.min(5, (target.notebookScore || 0) + 2.5);
    const existingNote = target.notes || "";
    const updatedNote = existingNote ? `${existingNote} • استدراك درس سابق (+2.5)` : "استدراك درس سابق (+2.5)";

    setEvaluationsList((prev) =>
      prev.map((e) => {
        if (e.id !== studentId) return e;
        const total = Math.min(20, newNb + e.homeworkScore + e.toolsScore + e.activityScore);
        const ratingColor = total >= 16 ? "emerald" : total >= 10 ? "amber" : "rose";
        const rating =
          total >= 18
            ? "excellent"
            : total >= 15
            ? "very_good"
            : total >= 12
            ? "good"
            : total >= 10
            ? "medium"
            : "weak";
        return {
          ...e,
          notebookScore: newNb,
          notebookComplete: newNb >= 4,
          totalScore: total,
          rating,
          ratingColor,
          notes: updatedNote,
        };
      })
    );

    try {
      await fetch("/api/evaluations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: studentId,
          notebookScore: newNb,
          notes: updatedNote,
        }),
      });
      showToast("success", "✓ تم تطبيق استدراك الدرس (+2.5) وفق ميثاق التقويم! 📖");
    } catch {
      showToast("error", "تعذر حفظ الاستدراك في الخادم");
    }
  };

  const handleUpdateNote = async (studentId: string, notes: string) => {
    setEvaluationsList((prev) =>
      prev.map((e) => (e.id === studentId ? { ...e, notes } : e))
    );
    try {
      await fetch("/api/evaluations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: studentId, notes }),
      });
    } catch {}
  };

  const handleDeleteEvaluation = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف التلميذ "${name}" من قائمة التقييم؟`)) return;
    setEvaluationsList((prev) => prev.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/evaluations?id=${id}`, { method: "DELETE" });
      if (res.ok) showToast("success", `✓ تم حذف التلميذ "${name}"`);
    } catch {
      showToast("error", "تعذر الحذف من الخادم");
    }
  };

  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleEvalName.trim()) return;
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: singleEvalName.trim(),
          className: evalClass,
          groupName: evalGroup,
          notebookScore: 5,
          homeworkScore: 5,
          toolsScore: 5,
          activityScore: 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvaluationsList((prev) => [...prev, data.evaluation]);
      setSingleEvalName("");
      showToast("success", `✓ تم إضافة التلميذ "${singleEvalName}" إلى ${evalClass} (${evalGroup})`);
    } catch (e: any) {
      showToast("error", e.message || "فشل إضافة التلميذ");
    }
  };

  const handleBatchImport = async () => {
    if (!batchEvalNames.trim()) {
      showToast("error", "يرجى كتابة أو لصق أسماء التلاميذ");
      return;
    }
    const names = batchEvalNames
      .split(/[\n,،]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;

    try {
      const score = batchDefaultFullScore ? 5 : 3;
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          students: names,
          className: batchEvalClass,
          groupName: batchEvalGroup,
          notebookScore: score,
          homeworkScore: score,
          toolsScore: score,
          activityScore: score,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(
        "success",
        `✓ تم استيراد (${data.count}) تلاميذ بنجاح إلى ${batchEvalClass} (${batchEvalGroup})!`
      );
      setIsBatchEvalModalOpen(false);
      setBatchEvalNames("");
      loadEvaluations();
    } catch (e: any) {
      showToast("error", e.message || "فشل الاستيراد");
    }
  };

  const handleClearClassEvals = async () => {
    if (!window.confirm(`هل أنت متأكد من مسح جميع تقييمات قسم ${evalClass}؟`)) return;
    try {
      const res = await fetch(`/api/evaluations?class=${encodeURIComponent(evalClass)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEvaluationsList((prev) =>
          prev.filter((e) => (e.className || "").replace(/\s+/g, "") !== evalClass.replace(/\s+/g, ""))
        );
        showToast("success", `✓ تم مسح تقييمات قسم ${evalClass}`);
      }
    } catch {
      showToast("error", "تعذر مسح التقييمات");
    }
  };

  // تجميع كراس الدروس حسب الميدان والمقطع
  const groupedLessons = useMemo(() => {
    if (notebookTab !== "lessons") return [];

    const fieldMap = new Map<string, Map<string, Lesson[]>>();
    for (const item of currentItems) {
      const f = (item.field || "أنشطة عددية").trim();
      const s = (item.section || "المقطع 1 : الأعداد الطبيعية والأعداد العشرية").trim();

      if (!fieldMap.has(f)) fieldMap.set(f, new Map());
      const sMap = fieldMap.get(f)!;
      if (!sMap.has(s)) sMap.set(s, []);
      sMap.get(s)!.push(item);
    }

    const groups: { field: string; sections: { section: string; items: Lesson[] }[] }[] = [];
    for (const [f, sMap] of fieldMap.entries()) {
      const secs: { section: string; items: Lesson[] }[] = [];
      for (const [s, items] of sMap.entries()) {
        items.sort((a, b) => a.number - b.number);
        secs.push({ section: s, items });
      }
      groups.push({ field: f, sections: secs });
    }
    return groups;
  }, [notebookTab, currentItems]);

  return (
    <div className="pt-3 pb-16 space-y-4 fade-up">
      <style>{inputCss}</style>

      {/* شريط الإشعارات الطافي */}
      {toastMsg && (
        <div
          className={`fixed top-4 left-4 right-4 z-50 max-w-md mx-auto p-3.5 rounded-2xl shadow-lg flex items-center gap-2.5 text-xs font-bold transition-all border ${
            toastMsg.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30"
              : "bg-red-600 text-white border-red-500 shadow-red-600/30"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="flex-1">{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {profile && (
        <ParentShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          teacherName={profile.full_name || "الأستاذ"}
          teacherCode={profile.teacher_code || "MTH"}
          schoolName={profile.school_custom_name || ""}
          slug={profile.slug || profile.teacher_code || ""}
        />
      )}

      {/* الشريط العلوي */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-extrabold text-slate-800">لوحة تحكم {profile.full_name || "الأستاذ"}</h1>
            <p className="text-[11px] text-[#107a57] font-bold">
              {profile.school_custom_name || "متوسطة"} — {profile.subject ? (MIDDLE_SCHOOL_SUBJECTS.find((s) => s.id === profile.subject)?.name || profile.subject) : "مادة الرياضيات"}
              {profile.teacher_code && <span className="font-mono text-slate-500 mr-2">({profile.teacher_code})</span>}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                const inviteUrl = `${window.location.origin}/join?key=asateza-2026`;
                navigator.clipboard.writeText(inviteUrl);
                setToastMsg({ type: "success", text: "تم نسخ رابط دعوة الأساتذة السري! شاركه مع زملائك الأساتذة عبر واتساب أو فيبر 📋" });
              }}
              className="flex items-center gap-1.5 text-xs text-[#107a57] bg-[#e6f4ee] hover:bg-[#d5eee2] border border-[#107a57]/25 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
              title="نسخ الرابط السري لدعوة وتسجيل أساتذة جدد"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>رابط دعوة أستاذ 🔗</span>
            </button>
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-500 font-bold px-3 py-1.5 rounded-xl shadow-md shadow-emerald-700/20 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>إرسال الكود للأولياء 📲</span>
            </button>
            <Link
              href={`/t/${profile.slug || profile.id}`}
              target="_blank"
              className="hidden lg:flex items-center gap-1 text-xs text-slate-600 hover:text-emerald-700 px-3 py-1.5 rounded-xl border border-slate-200 transition"
            >
              <Globe className="w-3.5 h-3.5" /> معاينة فضائي
            </Link>
            <Link
              href="/pedagogy"
              className="hidden lg:flex items-center gap-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> الملف البيداغوجي
            </Link>
            <Link
              href="/forum"
              className="hidden lg:flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-700 px-3 py-1.5 rounded-xl border border-slate-200 transition"
            >
              💬 الملتقى
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-emerald-700 px-3 py-1.5 rounded-xl border border-slate-200 transition"
            >
              <Settings className="w-3.5 h-3.5" /> الإعدادات و QR
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-xl border border-slate-200 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> خروج
            </button>
          </div>
        </div>

        <div className="hidden lg:block">
          <PedagogyAlerts teacherId={profile.id} />
        </div>

        {/* أزرار سريعة للمعاينة */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 border-t border-slate-100 text-xs font-bold">
          <Link
            href={`/t/${profile.slug || profile.id}`}
            target="_blank"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition text-[11px]"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>الموقع الرئيسي</span>
          </Link>
          <Link
            href={withTeacher("/assessment", profile.id)}
            target="_blank"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/70 hover:bg-emerald-100 transition text-[11px]"
          >
            <Scale className="w-3.5 h-3.5 text-emerald-600" />
            <span>ميثاق التقويم ⚖️</span>
          </Link>
          <Link
            href={withTeacher("/honor", profile.id)}
            target="_blank"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/70 hover:bg-amber-100 transition text-[11px]"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-600" />
            <span>لوحة الشرف</span>
          </Link>
          <Link
            href={withTeacher("/parents", profile.id)}
            target="_blank"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-sky-50 text-sky-800 border border-sky-200/70 hover:bg-sky-100 transition text-[11px]"
          >
            <Users className="w-3.5 h-3.5 text-sky-600" />
            <span>أولياء أود استقبالهم</span>
          </Link>
          <Link
            href="/penalties"
            target="_blank"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition text-[11px]"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>الخصومات (خاص 🔒)</span>
          </Link>
          <Link
            href={withTeacher("/announcement", profile.id)}
            target="_blank"
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition text-[11px]"
          >
            <Megaphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>الإعلان والتوجيهات</span>
          </Link>
        </div>

        {/* الملف البيداغوجي: الفضاء السري مع مفتش المقاطعة */}
        <Link
          href="/pedagogy"
          className="flex lg:hidden items-center gap-3 p-3 rounded-2xl bg-gradient-to-l from-indigo-600 to-blue-700 text-white hover:opacity-95 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-black">الملف البيداغوجي مع المفتش 🔒</div>
            <p className="text-[10px] text-indigo-100 mt-0.5">المذكرات والوثائق • مناشير المفتش • جدول التوقيت الأسبوعي</p>
            <PedagogyAlerts teacherId={profile.id} />
          </div>
          <ExternalLink className="w-4 h-4 text-indigo-200" />
        </Link>

        {/* ملتقى الأساتذة وبنك الوضعيات */}
        <Link
          href="/forum"
          className="flex lg:hidden items-center gap-3 p-3 rounded-2xl bg-white border border-indigo-100 hover:border-indigo-300 transition"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 text-lg">💬</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-black text-slate-800">ملتقى أساتذة الرياضيات وبنك الوضعيات</div>
            <p className="text-[10px] text-slate-500 mt-0.5">اطرح إشكالية، شارك وضعية أو سلسلة، واستفد من توجيهات المفتشين</p>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400" />
        </Link>

        {/* بطاقة التقييم الميداني السريع المستقل (مخصصة للهاتف أثناء الحصة) */}
        <div className="pt-2 border-t border-slate-100 lg:hidden">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-3 rounded-2xl text-white shadow-sm flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg font-black shrink-0">
                ⚡
              </span>
              <div>
                <div className="text-xs font-black flex items-center gap-1.5">
                  <span>دفتر التقييم الميداني السريع (صفحة مستقلة للهاتف)</span>
                  <span className="bg-amber-400 text-slate-900 px-1.5 py-0.2 rounded text-[10px] font-black">
                    جديد 🚀
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100 font-medium">
                  تفقد الكراريس والواجبات الدورية (8 دروس + 8 واجبات + سلوك + نشاط) مع حساب المعدل التلقائي
                </p>
              </div>
            </div>

            <Link
              href="/eval"
              className="py-1.5 px-3.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black shrink-0 flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <span>فتح دفتر التقييم السريع</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* التبويب الرئيسي: إدارة الدروس أو تقييم الحصة أو الإعلانات أو الرسائل أو الاستدعاءات أو لوحة الشرف أو الخصومات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-2xs">
        <button
          onClick={() => setMainTab("lessons")}
          className={`py-2 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            mainTab === "lessons"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>الدروس</span>
        </button>

        <button
          onClick={() => setMainTab("evaluations")}
          className={`py-2 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            mainTab === "evaluations"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          <span>📱 تقييم الحصة ({evaluationsList.length})</span>
        </button>

        <button
          onClick={() => setMainTab("announcements")}
          className={`py-2 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            mainTab === "announcements"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Megaphone className="w-3.5 h-3.5 text-teal-300" />
          <span>📢 الإعلانات ({announcementsList.length})</span>
        </button>

        <button
          onClick={() => setMainTab("messages")}
          className={`relative py-2 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            mainTab === "messages"
              ? "bg-purple-700 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-purple-300" />
          <span>📬 الرسائل ({messagesList.length})</span>
          {unreadMessagesCount > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 absolute top-1.5 left-1.5 ring-2 ring-white animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setMainTab("summons")}
          className={`py-2 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            mainTab === "summons"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>أولياء أود استقبالهم ({summonsList.length})</span>
        </button>

        <button
          onClick={() => setMainTab("honors")}
          className={`py-2 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            mainTab === "honors"
              ? "bg-amber-500 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>لوحة الشرف ({honorsList.length})</span>
        </button>

        <button
          onClick={() => setMainTab("penalties")}
          className={`py-2 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            mainTab === "penalties"
              ? "bg-slate-800 text-white shadow-sm"
              : "text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <OctagonAlert className="w-3.5 h-3.5 text-slate-500" />
          <span>الخصومات (خاص 🔒) ({penaltiesList.length})</span>
        </button>
      </div>

      {/* ==================== 1. تبويب الدروس والكراريس ==================== */}
      {mainTab === "lessons" ? (
        <div className="space-y-4">
          {/* إرشاد وتوضيح حول رفع حلول الواجبات وصور السبورة */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/90 rounded-2xl p-3.5 flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-sm mt-0.5 shadow-2xs">
              💡
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <div className="font-black text-blue-950 mb-0.5">
                أين أرفع حلول الواجبات المنزلية وصور السبورة؟
              </div>
              <p className="text-blue-800 text-[11px] leading-relaxed">
                اضغط على أي درس في القائمة أدناه لفتحه، وستجد قسماً مخصصاً باللون الأزرق بعنوان <strong>"الحل النموذجي للواجب المنزلي"</strong> لرفع صور حل الواجب بعد تصحيحه في القسم. أو اضغط مباشرة على زر <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-black border border-blue-300">📝 رفع حل الواجب</span> الظاهر في رأس كل بطاقة درس!
              </p>
            </div>
          </div>

          {/* اختيار المستوى */}
          <div
            className="grid gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-2xs"
            style={{ gridTemplateColumns: `repeat(${Math.min(levelsTaught.length, 4)}, minmax(0, 1fr))` }}
          >
            {levelsTaught.map((lv) => (
              <button
                key={lv}
                onClick={() => {
                  setLevel(lv);
                  setOpenId(null);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  level === lv ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{LEVELS[lv].label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                    level === lv ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {LEVELS[lv].short}
                </span>
              </button>
            ))}
          </div>

          {/* اختيار القسم (كراس الدروس، الأعمال الموجهة، سلاسل التمارين، الملخصات) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-2xs">
            <button
              onClick={() => {
                setNotebookTab("lessons");
                setOpenId(null);
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                notebookTab === "lessons"
                  ? "bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>📘</span>
              <span>كراس الدروس (192ص)</span>
            </button>
            <button
              onClick={() => {
                setNotebookTab("directed_work");
                setOpenId(null);
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                notebookTab === "directed_work"
                  ? "bg-sky-700 text-white shadow-sm ring-1 ring-sky-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>📗</span>
              <span>الأعمال الموجهة (96ص)</span>
            </button>
            <button
              onClick={() => {
                setNotebookTab("worksheets");
                setOpenId(null);
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                notebookTab === "worksheets"
                  ? "bg-indigo-700 text-white shadow-sm ring-1 ring-indigo-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>📑</span>
              <span>سلاسل التمارين</span>
            </button>
            <button
              onClick={() => {
                setNotebookTab("summaries");
                setOpenId(null);
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                notebookTab === "summaries"
                  ? "bg-amber-700 text-white shadow-sm ring-1 ring-amber-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>📌</span>
              <span>الملخصات والمطويات</span>
            </button>
          </div>

          <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-4 lg:items-start">
          {/* نموذج إضافة مورد أو حصة أو سلسلة أو ملخص */}
          <form onSubmit={addItem} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3.5 lg:sticky lg:top-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <span>
                  {notebookTab === "lessons"
                    ? "➕ إضافة مورد جديد لـ"
                    : notebookTab === "directed_work"
                    ? "➕ إضافة حصة أعمال موجهة لـ"
                    : notebookTab === "worksheets"
                    ? "➕ إضافة سلسلة تمارين جديدة لـ"
                    : "➕ إضافة ملخص / مطوية جديدة لـ"}
                </span>
                <span className="text-emerald-700 font-extrabold">{LEVELS[level].short}</span>
              </span>
              <button
                type="button"
                onClick={loadLessons}
                className="text-[11px] text-slate-400 hover:text-emerald-600 flex items-center gap-1"
                title="تحديث"
              >
                <RefreshCw className="w-3 h-3" /> تحديث
              </button>
            </div>

            {notebookTab === "lessons" ? (
              <div className="space-y-3">
                {/* الميدان */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">📐 الميدان:</label>
                  <div className="flex gap-1.5 mb-1.5 overflow-x-auto no-scrollbar pb-0.5">
                    {COMMON_FIELDS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setField(f)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition shrink-0 ${
                          field === f
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <input
                    className="input text-xs font-semibold"
                    placeholder="مثال: أنشطة عددية"
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    required
                  />
                </div>

                {/* المقطع المعرفي */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">📑 المقطع المعرفي:</label>
                  {knownSections.length > 0 && (
                    <div className="flex gap-1.5 mb-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {knownSections.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSection(s)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition shrink-0 ${
                            section === s
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    className="input text-xs font-semibold"
                    placeholder="مثال: المقطع 1 : الأعداد الطبيعية والأعداد العشرية"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    required
                  />
                </div>

                {/* رقم المورد وعنوانه */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-600 block mb-1">رقم المورد:</label>
                    <input
                      className="input text-center text-sm font-extrabold text-emerald-700 bg-emerald-50/40 border-emerald-200"
                      inputMode="numeric"
                      placeholder={String(nextNumber)}
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-bold text-slate-600 block mb-1">عنوان المورد المعرفي:</label>
                    <input
                      className="input text-xs font-semibold"
                      placeholder="مثال: قراءة وكتابة عدد طبيعي"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* ملاحظات وتوجيهات الأستاذ */}
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1 flex items-center gap-1">
                    <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                    <span>ملاحظات وتوجيهات الأستاذ لهذا الدرس (اختياري):</span>
                  </label>
                  <textarea
                    className="input text-xs min-h-[50px] resize-y"
                    placeholder="مثال: كراس منظم، التركيز على جدول المراتب..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* خانة الواجب المنزلي البارزة */}
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-1.5">
                  <label className="text-xs font-black text-blue-900 block flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>📝 نص وتفاصيل الواجب المنزلي (تحديد التمارين والصفحات بكراس المحاولات):</span>
                  </label>
                  <textarea
                    className="input text-xs min-h-[55px] resize-y bg-white border-blue-200 font-medium"
                    placeholder="مثال: حل التمرين 12 و 13 صفحة 20 من الكتاب المدرسي على كراس المحاولات..."
                    value={lessonHomeworkNotes}
                    onChange={(e) => setLessonHomeworkNotes(e.target.value)}
                  />
                  <p className="text-[10px] text-blue-700 font-semibold">
                    💡 ملاحظة: بعد إضافة المورد ستتمكن فوراً من رفع صور الحل النموذجي له بنقرة واحدة!
                  </p>
                </div>
              </div>
            ) : notebookTab === "directed_work" ? (
              /* حقول كراس الأعمال الموجهة */
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-600 block mb-1">رقم الحصة:</label>
                    <input
                      className="input text-center text-sm font-extrabold text-sky-700 bg-sky-50/40 border-sky-200"
                      inputMode="numeric"
                      placeholder={String(nextNumber)}
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-bold text-slate-600 block mb-1">عنوان الحصة / التطبيق:</label>
                    <input
                      className="input text-xs font-semibold"
                      placeholder="مثال: حل وضعيات تطبيقية حول الأعداد العشرية"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1 flex items-center gap-1">
                    <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                    <span>ملاحظات وتوجيهات الأستاذ للتلاميذ (اختياري):</span>
                  </label>
                  <textarea
                    className="input text-xs min-h-[60px] resize-y"
                    placeholder="مثال: إحضار كراس الأعمال الموجهة 96 صفحة، العمل الفردي أولاً..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            ) : notebookTab === "worksheets" ? (
              /* حقول سلاسل التمارين */
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">📑 المقطع المعرفي التابع له:</label>
                  <input
                    className="input text-xs font-semibold"
                    placeholder="مثال: المقطع 1 : الأعداد الطبيعية والأعداد العشرية"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-600 block mb-1">رقم السلسلة:</label>
                    <input
                      className="input text-center text-sm font-extrabold text-indigo-700 bg-indigo-50/40 border-indigo-200"
                      inputMode="numeric"
                      placeholder={String(nextNumber)}
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-bold text-slate-600 block mb-1">عنوان سلسلة التمارين:</label>
                    <input
                      className="input text-xs font-semibold"
                      placeholder="مثال: سلسلة تمارين شاملة للمقطع 1 مع وضعيات إدماجية"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1 flex items-center gap-1">
                    <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                    <span>ملاحظات وتوجيهات حل السلسلة (اختياري):</span>
                  </label>
                  <textarea
                    className="input text-xs min-h-[60px] resize-y"
                    placeholder="مثال: واجب منزلي ورقي يتم استلامه يوم الأحد المقبل..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              /* حقول الملخصات والمطويات */
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">📑 المقطع أو المجال:</label>
                  <input
                    className="input text-xs font-semibold"
                    placeholder="مثال: المقطع 1 : الأعداد الطبيعية والأعداد العشرية"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-600 block mb-1">رقم الملخص:</label>
                    <input
                      className="input text-center text-sm font-extrabold text-amber-700 bg-amber-50/40 border-amber-200"
                      inputMode="numeric"
                      placeholder={String(nextNumber)}
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-bold text-slate-600 block mb-1">عنوان الملخص أو المطوية:</label>
                    <input
                      className="input text-xs font-semibold"
                      placeholder="مثال: مطوية مراجعة وقوانين العمليات الحسابية والكسور"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1 flex items-center gap-1">
                    <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                    <span>ملاحظات وتوجيهات المراجعة (اختياري):</span>
                  </label>
                  <textarea
                    className="input text-xs min-h-[60px] resize-y"
                    placeholder="مثال: ملخص سريع ومكثف لمراجعة اختبار الفصل الأول..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button disabled={isSubmitting} className="btn-primary w-full py-3 text-sm">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>
                    {notebookTab === "lessons"
                      ? "إضافة المورد والبدء برفع الصور"
                      : notebookTab === "directed_work"
                      ? "إضافة حصة الأعمال الموجهة والبدء برفع الصور"
                      : notebookTab === "worksheets"
                      ? "إضافة سلسلة التمارين والبدء برفع الصور"
                      : "إضافة الملخص / المطوية والبدء برفع الصور"}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* قائمة الدروس والأعمال الموجهة */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600 px-1">
              <span className="font-extrabold text-slate-800">
                {notebookTab === "lessons"
                  ? `محتويات كراس الدروس (${currentItems.length} موارد):`
                  : notebookTab === "directed_work"
                  ? `حصص الأعمال الموجهة (${currentItems.length} حصص):`
                  : notebookTab === "worksheets"
                  ? `سلاسل التمارين والواجبات (${currentItems.length} سلاسل):`
                  : `الملخصات والمطويات (${currentItems.length} ملخصات):`}
              </span>
              <div className="flex items-center gap-2">
                {notebookTab === "lessons" && (
                  <button
                    type="button"
                    onClick={() => setFilterMissingHw(!filterMissingHw)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 border ${
                      filterMissingHw
                        ? "bg-amber-100 text-amber-900 border-amber-300 shadow-2xs font-black"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>{filterMissingHw ? "⚠️ تصفية: ينقصها حل الواجب (مفعل)" : "🔍 تصفية: ينقصها حل الواجب"}</span>
                  </button>
                )}
                <span className="text-[11px] text-slate-400 font-normal">{LEVELS[level].short}</span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-10 text-slate-400 text-xs bg-white rounded-2xl border border-slate-100">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                جاري جلب القائمة...
              </div>
            ) : currentItems.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-10 bg-white rounded-2xl border border-dashed border-slate-200 px-4">
                لا توجد عناصر مضافة بعد في هذا الكراس. أضف عنصراً جديداً أعلاه!
              </div>
            ) : notebookTab === "lessons" ? (
              <div className="space-y-4">
                {groupedLessons.map((grp) => (
                  <div key={grp.field} className="space-y-2.5">
                    <div className="bg-emerald-800 text-white px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5">
                      <span>📐 الميدان:</span>
                      <span>{grp.field}</span>
                    </div>

                    {grp.sections.map((sec) => (
                      <div key={sec.section} className="space-y-2 pr-2 border-r-2 border-emerald-200">
                        <div className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 pt-1">
                          <span>📑</span>
                          <span>{sec.section}</span>
                        </div>

                        <div className="space-y-2">
                          {sec.items.map((item) => (
                            <LessonCard
                              key={item.id}
                              lesson={item}
                              open={openId === item.id}
                              onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                              onLessonUpdated={(updated) => {
                                setAllLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
                              }}
                              onEdit={() => setEditingLesson(item)}
                              onDelete={() => setDeletingLesson(item)}
                              showToast={showToast}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {currentItems.map((item) => (
                  <LessonCard
                    key={item.id}
                    lesson={item}
                    open={openId === item.id}
                    onToggle={() => setOpenId(openId === item.id ? null : item.id)}
                    onLessonUpdated={(updated) => {
                      setAllLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
                    }}
                    onEdit={() => setEditingLesson(item)}
                    onDelete={() => setDeletingLesson(item)}
                    showToast={showToast}
                  />
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      ) : mainTab === "summons" ? (
        /* ==================== 2. تبويب أولياء أود استقبالهم ==================== */
        <div className="space-y-4">
          <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-4 lg:items-start">
          {/* نموذج إضافة ولي تلميذ للاستقبال */}
          <form
            onSubmit={addSummons}
            className="bg-white rounded-2xl p-4 border border-sky-100 shadow-sm space-y-3.5 lg:sticky lg:top-4"
          >
            <div className="flex items-center justify-between pb-1 border-b border-sky-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900">
                    تسجيل تلميذ أود استقبال وليه (لصالح ابنه 🤝)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    ليس استدعاءً عقابياً، بل للتشاور والاطلاع على كراس ومستوى التلميذ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadSummons}
                className="text-[11px] text-slate-400 hover:text-sky-600 flex items-center gap-1 transition"
                title="تحديث"
              >
                <RefreshCw className="w-3 h-3" /> تحديث
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    اسم التلميذ: <span className="text-sky-600">*</span>
                  </label>
                  <input
                    className="input text-xs font-bold"
                    placeholder="اكتب اسم التلميذ، أو عدة أسماء مفصولة بفواصل..."
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    القسم: <span className="text-sky-600">*</span>
                  </label>
                  <input
                    className="input text-xs text-center font-black text-sky-900 bg-sky-50/40 border-sky-200"
                    placeholder="مثال: 1 م 3"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* أزرار سريعة لأقسام الأستاذ */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  اختيار سريع للقسم:
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                  {HONOR_CLASSES.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setClassName(cls)}
                      className={`py-1.5 rounded-xl border transition ${
                        className.replace(/\s+/g, "") === cls.replace(/\s+/g, "")
                          ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              {/* سبب المقابلة وملاحظة الأستاذ لولي الأمر */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block flex items-center gap-1">
                  <StickyNote className="w-3.5 h-3.5 text-sky-600" />
                  <span>ملاحظة وتوجيه لولي الأمر (لصالح ابنه - اختياري):</span>
                </label>
                <textarea
                  className="input text-xs min-h-[55px] resize-y"
                  placeholder="مثال: تشاور حول كراس الدروس وإكماله، معالجة صعوبة في الفهم..."
                  value={summonsNotes}
                  onChange={(e) => setSummonsNotes(e.target.value)}
                />
                {/* ملاحظات وتوجيهات شائعة بنقرة واحدة */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    "تشاور حول كراس الدروس وإكماله",
                    "معالجة صعوبات الفهم في مادة الرياضيات",
                    "الحرص على حل الواجبات وإحضار الأدوات",
                    "تشجيع التلميذ ومتابعة تطور مستواه",
                    "متابعة تنظيم الخط ونظافة الكراس",
                  ].map((presetNote) => (
                    <button
                      key={presetNote}
                      type="button"
                      onClick={() => setSummonsNotes(presetNote)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200/80 hover:bg-sky-100 transition active:scale-95"
                    >
                      {presetNote}
                    </button>
                  ))}
                </div>
              </div>

              {/* خيار التوقيت الإضافي ليوم الأحد */}
              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-sky-50/70 border border-sky-200 cursor-pointer hover:bg-sky-50 transition">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                  checked={isExtraSunday}
                  onChange={(e) => setIsExtraSunday(e.target.checked)}
                />
                <div className="text-xs">
                  <span className="font-black text-sky-950 block">
                    ⏰ اقتراح موعد إضافي: الأحد صباحاً (08:00 إلى 09:00)
                  </span>
                  <span className="text-[10px] text-sky-800">
                    مبادرة من الأستاذ لعدم الانتظار أسبوعاً كاملاً (الموعد الرسمي الأساسي: الأربعاء 10:00 إلى 11:00)
                  </span>
                </div>
              </label>
            </div>

            <button
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التسجيل...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>تسجيل التلميذ في قائمة الاستقبال 🤝</span>
                </>
              )}
            </button>
          </form>

          {/* قائمة الأولياء المسجلين للاستقبال */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <span>التلاميذ المسجلين لاستقبال أوليائهم:</span>
              <span className="text-[11px] bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full font-extrabold border border-sky-200">
                {summonsList.length} تلميذ
              </span>
            </div>

            {summonsList.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 p-4 space-y-1">
                <div>👏</div>
                <div>لا توجد مواعيد مقابلة مسجلة حالياً.</div>
                <div className="text-[10px] text-slate-400">ساعة الاستقبال مفتوحة كل أربعاء للجميع.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {summonsList.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-3.5 rounded-2xl border border-sky-100 shadow-2xs space-y-2 hover:border-sky-200 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs text-slate-900">{item.studentName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-sky-50 text-sky-800 border border-sky-200">
                            قسم {item.className}
                          </span>
                          {item.isUrgent ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-sky-100 text-sky-900 border border-sky-200">
                              ⏰ الأحد (08:00 - 09:00)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              🗓️ الأربعاء (10:00 - 11:00)
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-slate-700 mt-1.5 whitespace-pre-line bg-sky-50/50 p-2.5 rounded-xl font-medium border border-sky-100/60">
                            📌 <b>ملاحظة لولي الأمر:</b> {item.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditingSummons(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition"
                          title="تعديل الموعد والملاحظة"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingSummons(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="إلغاء الموعد"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      ) : mainTab === "honors" ? (
        /* ==================== 3. تبويب لوحة الشرف ==================== */
        <div className="space-y-4">
          <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-4 lg:items-start">
          {/* نموذج إضافة تلميذ إلى لوحة الشرف */}
          <form
            onSubmit={addHonor}
            className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-sm space-y-3.5 lg:sticky lg:top-4"
          >
            <div className="flex items-center justify-between pb-1 border-b border-amber-100">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>إضافة تلميذ إلى لوحة الشرف (نجوم الرياضيات)</span>
              </span>
              <span className="text-[10px] bg-amber-50 text-amber-800 font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                أقسام الأستاذ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  اسم ولقب التلميذ: <span className="text-amber-600">*</span>
                </label>
                <input
                  className="input text-xs"
                  placeholder="مثال: يونس بلحاج..."
                  value={honorStudentName}
                  onChange={(e) => setHonorStudentName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  القسم: <span className="text-amber-600">*</span>
                </label>
                <select
                  className="input text-xs font-black text-amber-900 bg-amber-50/40 border-amber-200"
                  value={honorClass}
                  onChange={(e) => setHonorClass(e.target.value)}
                  required
                >
                  {HONOR_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls} {cls.startsWith("1") ? "(الأولى متوسط)" : "(الثانية متوسط)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* وسام أو لقب تشجيعي اختياري */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                وسام أو لقب تشجيعي (اختياري):
              </label>
              <input
                className="input text-xs"
                placeholder="مثال: ⭐ نجم الرياضيات أو اختر من الأوسمة السريعة أدناه..."
                value={honorBadge}
                onChange={(e) => setHonorBadge(e.target.value)}
              />
              {/* أوسمة جاهزة سريعة بنقرة واحدة */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[
                  "⭐ نجم الرياضيات",
                  "📖 كراس نموذجي (5/5)",
                  "🎖️ فارس الإتقان",
                  "🌟 تميز وانضباط",
                  "✍️ إتقان الواجبات",
                  "🧠 عبقري الحساب",
                ].map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setHonorBadge(bg)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/70 hover:bg-amber-100 transition active:scale-95"
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            {/* ملاحظة تشجيعية اختيارية */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                ملاحظة الأستاذ التشجيعية (غير ضرورية واختيارية):
              </label>
              <textarea
                className="input text-xs min-h-[60px]"
                value={honorNotes}
                onChange={(e) => setHonorNotes(e.target.value)}
                placeholder="مثال: تميز كبير في الفرض وحل جميع الواجبات المنزلية بدقة وكراس متقن..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-2.5 text-xs bg-amber-500 hover:bg-amber-600 shadow-sm shadow-amber-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الإضافة...</span>
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4" />
                  <span>إضافة التلميذ فورياً إلى لوحة الشرف 🏆</span>
                </>
              )}
            </button>
          </form>

          {/* قائمة التلاميذ المكرمين مع فلتر الأقسام */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <span>قائمة نجوم الرياضيات في لوحة الشرف:</span>
              <span className="text-[11px] bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full font-extrabold border border-amber-200">
                {honorsList.length} متميز
              </span>
            </div>

            {/* فلتر الأقسام الأربعة */}
            <div className="grid grid-cols-5 gap-1 bg-white p-1 rounded-xl border border-slate-100 text-center">
              <button
                type="button"
                onClick={() => setSelectedHonorFilter("all")}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedHonorFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                الكل ({honorsList.length})
              </button>
              {HONOR_CLASSES.map((cls) => {
                const count = honorsList.filter(
                  (h) => (h.className || "").replace(/\s+/g, "") === cls.replace(/\s+/g, "")
                ).length;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedHonorFilter(cls)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition ${
                      selectedHonorFilter === cls
                        ? "bg-amber-500 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {cls} ({count})
                  </button>
                );
              })}
            </div>

            {/* عرض بطاقات التلاميذ */}
            {honorsList.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-amber-200 text-xs text-slate-400 p-4 space-y-1">
                <div className="text-amber-500 text-lg">⭐</div>
                <div>لا يوجد تلاميذ مضافين في لوحة الشرف حالياً.</div>
                <div className="text-[11px] text-slate-400">أضف أفضل تلاميذك وسيتألقون مباشرة أمام زملائهم وأوليائهم!</div>
              </div>
            ) : (
              <div className="space-y-2">
                {honorsList
                  .filter(
                    (h) =>
                      selectedHonorFilter === "all" ||
                      (h.className || "").replace(/\s+/g, "") ===
                        selectedHonorFilter.replace(/\s+/g, "")
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-3 rounded-2xl border border-amber-200/60 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-black">
                              ⭐
                            </span>
                            <span className="font-black text-xs text-slate-900">
                              {item.studentName}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                              قسم {item.className}
                            </span>
                            {item.badge && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-xs text-slate-600 mt-1 whitespace-pre-line bg-amber-50/40 p-2 rounded-lg font-medium border border-amber-100/50">
                              💬 {item.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditingHonor(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition"
                            title="تعديل بيانات التلميذ"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingHonor(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="حذف من لوحة الشرف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
          </div>
        </div>
      ) : mainTab === "penalties" ? (
        /* ==================== 4. تبويب الخصومات والعقوبات (خاص بالأستاذ) ==================== */
        <div className="space-y-4">
          {/* تنبيه الخصوصية: خاص بالأستاذ ومحجوب عن الجميع */}
          <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex items-start gap-3 shadow-sm border border-slate-800">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-extrabold text-amber-400 flex items-center gap-1.5">
                <span>سجل الخصومات الداخلي (خاص بك كأستاذ فقط 🔒)</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                هذا السجل محجوب ومخفي تماماً عن التلاميذ والأولياء ولا يظهر في الواجهة الرئيسية للموقع حفاظاً على الراحة النفسية. يمكنك تدوين الخصومات لمتابعتها وضبط التقويم المستمر، أو مسحها نهائياً متى شئت.
              </p>
            </div>
          </div>

          <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-4 lg:items-start">
          {/* نموذج إضافة عقوبة أو خصم لتلميذ أو مجموعة تلاميذ */}
          <form
            onSubmit={addPenalty}
            className="bg-white rounded-2xl p-4 border-2 border-red-200/90 shadow-sm space-y-3.5 lg:sticky lg:top-4"
          >
            <div className="flex items-center justify-between pb-1 border-b border-red-100">
              <span className="text-xs font-black text-red-950 flex items-center gap-1.5">
                <OctagonAlert className="w-4 h-4 text-red-600" />
                <span>تسجيل خصم أو عقوبة في التقويم المستمر</span>
              </span>
              <span className="text-[10px] bg-red-50 text-red-700 font-extrabold px-2.5 py-0.5 rounded-full border border-red-200">
                سجل الانضباط ⚠️
              </span>
            </div>

            <div className="space-y-3.5">
              {/* 1. القسم المعني */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  القسم المعني: <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {HONOR_CLASSES.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setPenaltyClass(cls)}
                      className={`py-2 px-1 rounded-xl text-xs font-black transition border ${
                        penaltyClass === cls
                          ? "bg-red-600 text-white border-red-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. إضافة التلاميذ - إمكانية إضافة أكثر من طالب بسهولة تامة */}
              <div className="space-y-2 bg-red-50/40 p-3 rounded-2xl border border-red-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-red-950 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-red-600" />
                    <span>إضافة التلاميذ المعنيين بالعقوبة:</span>
                    <span className="text-red-600">*</span>
                  </label>
                  {penaltyStudents.length > 0 && (
                    <span className="text-[11px] font-black text-red-700 bg-red-100/90 px-2 py-0.5 rounded-lg border border-red-200">
                      تم اختيار ({penaltyStudents.length}) تلاميذ
                    </span>
                  )}
                </div>

                {/* حقل كتابة اسم التلميذ مع زر إضافة أو الضغط على Enter */}
                <div className="flex gap-1.5">
                  <input
                    className="input text-xs font-bold flex-1"
                    placeholder="اكتب اسم التلميذ واضغط Enter أو زر الإضافة..."
                    value={currentStudentName}
                    onChange={(e) => setCurrentStudentName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddStudent();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddStudent}
                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shrink-0 flex items-center gap-1 transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة</span>
                  </button>
                </div>

                {/* قائمة شارات التلاميذ المحددين */}
                {penaltyStudents.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-red-900 flex items-center justify-between">
                      <span>التلاميذ المحددين لنفس العقوبة والتوقيت ({penaltyStudents.length}):</span>
                      <button
                        type="button"
                        onClick={() => setPenaltyStudents([])}
                        className="text-[10px] text-red-500 hover:text-red-700 underline font-bold"
                      >
                        مسح الكل
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-red-200 max-h-36 overflow-y-auto">
                      {penaltyStudents.map((stName, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-950 font-black text-xs border border-red-200 shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                          <span>{stName}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(stName)}
                            className="text-red-400 hover:text-red-700 font-black text-xs hover:bg-red-100 rounded-full w-4 h-4 flex items-center justify-center transition"
                            title="إزالة هذا التلميذ"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 font-medium">
                    💡 اكتب اسم التلميذ واضغط <b>Enter</b> أو زر <b>إضافة</b>، أو الصق عدة أسماء مفصولة بفواصل. يمكنك إضافة طالبين أو 5 أو 10 طلاب دفعة واحدة ثم حفظهم معاً بنقرة واحدة.
                  </p>
                )}
              </div>

              {/* 3. مقدار الخصم والعقوبة مع أزرار سريعة */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  مقدار الخصم أو نوع العقوبة: <span className="text-red-600">*</span>
                </label>
                <input
                  className="input text-xs font-bold text-red-700 bg-red-50/30 border-red-200"
                  value={penaltyDeduction}
                  onChange={(e) => setPenaltyDeduction(e.target.value)}
                  placeholder="مثال: ناقص 3 في التقويم المستمر (-3)..."
                  required
                />
                {/* أزرار سريعة لمقدار الخصم بنقرة واحدة */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    "ناقص 3 في التقويم المستمر (-3)",
                    "ناقص 2 في التقويم المستمر (-2)",
                    "ناقص 1 في التقويم المستمر (-1)",
                    "ناقص 5 في التقويم المستمر (-5)",
                    "خصم نقطة السلوك والمواظبة (-2)",
                    "إنذار شفهي مسجل",
                  ].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPenaltyDeduction(d)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-50 text-red-800 border border-red-200/80 hover:bg-red-100 transition active:scale-95"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. سبب العقوبة مع أزرار سريعة */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  سبب العقوبة: <span className="text-red-600">*</span>
                </label>
                <input
                  className="input text-xs"
                  value={penaltyReason}
                  onChange={(e) => setPenaltyReason(e.target.value)}
                  placeholder="مثال: هروب من الحصة، تشويش متكرر، إهمال حل الواجبات..."
                  required
                />
                {/* أسباب شائعة جاهزة */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    "هروب من الحصة",
                    "تشويش متكرر وإخلال بنظام القسم",
                    "عدم إحضار كراس الدروس 192 صفحة",
                    "عدم حل الواجب المنزلي في البيت",
                    "دروس ناقصة في الكراس وإهمال الكتابة",
                    "عدم إحضار الأدوات الهندسية",
                    "رفض المشاركة والمحاولة",
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setPenaltyReason(r)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition active:scale-95"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. تاريخ وتوقيت الحصة الموحد */}
              <div className="space-y-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-red-600" />
                  <span>تاريخ وتوقيت الحصة (موحد لجميع التلاميذ المحددين):</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">التاريخ:</label>
                    <input
                      className="input text-xs"
                      placeholder="مثال: الأربعاء 07 أكتوبر 2026"
                      value={penaltyDate}
                      onChange={(e) => setPenaltyDate(e.target.value)}
                    />
                    <div className="flex gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          setPenaltyDate(
                            now.toLocaleDateString("ar-DZ", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          );
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition active:scale-95"
                      >
                        📅 اليوم تلقائياً
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() - 1);
                          setPenaltyDate(
                            d.toLocaleDateString("ar-DZ", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          );
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition active:scale-95"
                      >
                        📅 يوم أمس
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">توقيت الحصة:</label>
                    <input
                      className="input text-xs"
                      placeholder="مثال: حصة 10:00 - 11:00"
                      value={penaltyTiming}
                      onChange={(e) => setPenaltyTiming(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                      {[
                        "حصة 08:00 - 09:00",
                        "حصة 09:00 - 10:00",
                        "حصة 10:00 - 11:00",
                        "حصة 11:00 - 12:00",
                        "حصة 13:00 - 14:00",
                        "حصة 14:00 - 15:00",
                        "حصة 15:00 - 16:00",
                      ].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setPenaltyTiming(t)}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border transition ${
                            penaltyTiming === t
                              ? "bg-red-600 text-white border-red-600"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. ملاحظات وتوجيه إضافي لولي الأمر */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ملاحظة وتوجيه إضافي لولي الأمر والتلميذ (اختياري):
                </label>
                <textarea
                  className="input text-xs min-h-[55px]"
                  value={penaltyNotes}
                  onChange={(e) => setPenaltyNotes(e.target.value)}
                  placeholder="مثال: على أولياء الأمور تفقد كراريس أبنائهم ومتابعة انضباطهم فوراً..."
                />
              </div>
            </div>

            <button
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تسجيل العقوبة لجميع التلاميذ...</span>
                </>
              ) : (
                <>
                  <OctagonAlert className="w-4 h-4" />
                  <span>
                    {penaltyStudents.length > 1
                      ? `حفظ وتسجيل العقوبة لجميع الـ (${penaltyStudents.length}) تلاميذ دفعة واحدة بنفس التوقيت ⚠️`
                      : penaltyStudents.length === 1
                      ? `حفظ وتسجيل العقوبة للتلميذ (${penaltyStudents[0]}) ⚠️`
                      : "حفظ وتسجيل العقوبة ⚠️"}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* قائمة الخصومات والعقوبات الحالية */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <div className="flex items-center gap-2">
                <span>العقوبات والخصومات المسجلة:</span>
                <span className="text-[11px] bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full font-extrabold border border-red-200">
                  {penaltiesList.length} خصم مسجل
                </span>
              </div>
              {penaltiesList.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllPenalties}
                  className="text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 font-extrabold flex items-center gap-1 transition"
                  title="مسح كافة الخصومات المسجلة نهائياً"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>مسح كافة السجلات</span>
                </button>
              )}
            </div>

            {/* فلتر الأقسام الأربعة */}
            <div className="grid grid-cols-5 gap-1 bg-white p-1 rounded-xl border border-slate-100 text-center">
              <button
                type="button"
                onClick={() => setSelectedPenaltyFilter("all")}
                className={`py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedPenaltyFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                الكل ({penaltiesList.length})
              </button>
              {HONOR_CLASSES.map((cls) => {
                const count = penaltiesList.filter(
                  (p) => (p.className || "").replace(/\s+/g, "") === cls.replace(/\s+/g, "")
                ).length;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedPenaltyFilter(cls)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition ${
                      selectedPenaltyFilter === cls
                        ? "bg-red-600 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {cls} ({count})
                  </button>
                );
              })}
            </div>

            {/* عرض بطاقات العقوبات */}
            {penaltiesList.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-red-200 text-xs text-slate-400 p-4 space-y-1">
                <div className="text-emerald-500 text-lg">👏</div>
                <div>لا توجد خصومات أو عقوبات مسجلة حالياً.</div>
                <div className="text-[11px] text-slate-400">جميع الأقسام منضبطة والحمد لله!</div>
              </div>
            ) : (
              <div className="space-y-2">
                {penaltiesList
                  .filter(
                    (p) =>
                      selectedPenaltyFilter === "all" ||
                      (p.className || "").replace(/\s+/g, "") === selectedPenaltyFilter.replace(/\s+/g, "")
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-white p-3.5 rounded-2xl border-2 border-red-100 shadow-2xs space-y-2 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 bottom-0 w-1 bg-red-600" />
                      <div className="flex items-start justify-between gap-2 pr-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs text-slate-900">{item.studentName}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-50 text-red-800 border border-red-200">
                              قسم {item.className}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-600 text-white shadow-2xs">
                              {item.deduction}
                            </span>
                          </div>

                          <div className="bg-red-50/60 p-2 rounded-xl border border-red-100 mt-2 text-xs">
                            <span className="font-black text-red-800 ml-1">السبب:</span>
                            <span className="font-bold text-red-950">{item.reason}</span>
                          </div>

                          {item.date && (
                            <div className="text-[11px] text-slate-400 mt-1 font-medium flex items-center gap-1">
                              <span>📅 {item.date}</span>
                            </div>
                          )}

                          {item.notes && (
                            <p className="text-xs text-amber-900 mt-1 bg-amber-50/60 p-2 rounded-lg font-medium border border-amber-200/50">
                              📌 {item.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditingPenalty(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition"
                            title="تعديل بيانات العقوبة"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingPenalty(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="إلغاء وحذف العقوبة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
          </div>
        </div>
      ) : null}

      {/* ==================== 5. تبويب التقييم الميداني السريع (حصة الأعمال الموجهة) ==================== */}
      {mainTab === "evaluations" && (
        <div className="space-y-4">
          {/* لافتة التبديل إلى دفتر التقييم الميداني المستقل الجديد */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl font-black shrink-0">
                ⚡
              </span>
              <div>
                <h3 className="text-xs font-black flex items-center gap-2">
                  <span>دفتر التقييم الميداني السريع (جلسات المراقبة الدورية)</span>
                  <span className="bg-amber-400 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-black">
                    مستحسن للهاتف 📱
                  </span>
                </h3>
                <p className="text-[11px] text-emerald-100 mt-0.5">
                  تفقد الكراريس والواجبات الدورية بنظام الجلسات (مثال: الدروس 1-8 ثم 9-15) مع حساب المعدل العام التلقائي في صفحة مستقلة سريعة وفائقة الخفة!
                </p>
              </div>
            </div>

            <Link
              href="/eval"
              className="py-2 px-4 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black shrink-0 flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <span>فتح الدفتر المستقل (/eval)</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          {/* مقدمة وأدوات التحكم بالحصة */}
          <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-black text-slate-800">
                    التقييم الميداني السريع — حصة الأعمال الموجهة (نصف القسم)
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    تقييم فوري باللمس (أخضر 🟢 / أصفر 🟡 / أحمر 🔴) أثناء الجولة بين الصفوف
                  </p>
                </div>
              </div>

              <Link
                href="/assessment"
                target="_blank"
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 transition"
              >
                <Scale className="w-3.5 h-3.5 text-emerald-600" />
                <span>ميثاق التقويم (20/20)</span>
              </Link>
            </div>

            {/* أزرار اختيار القسم */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">اختر القسم:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {HONOR_CLASSES.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setEvalClass(cls)}
                    className={`py-2 px-2 rounded-xl text-xs font-black transition ${
                      evalClass === cls
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <span>{cls}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* أزرار اختيار الفوج (التفويج) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                الفوج المعني بحصة الأعمال الموجهة:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["فوج 1", "فوج 2", "القسم كامل"] as const).map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setEvalGroup(grp)}
                    className={`py-2 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                      evalGroup === grp
                        ? "bg-slate-800 text-white shadow-sm"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <span>👥</span>
                    <span>{grp}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* شريط الإجراءات: استيراد دفعة، بحث، إضافة تلميذ، ومسح */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative flex-1">
                  <input
                    type="text"
                    className="input text-xs pl-8 py-2"
                    placeholder="ابحث عن اسم تلميذ..."
                    value={evalSearch}
                    onChange={(e) => setEvalSearch(e.target.value)}
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setBatchEvalClass(evalClass);
                    setBatchEvalGroup(evalGroup === "القسم كامل" ? "فوج 1" : evalGroup);
                    setIsBatchEvalModalOpen(true);
                  }}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shrink-0 flex items-center gap-1 shadow-sm transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>استيراد الفوج</span>
                </button>
              </div>

              {/* زر مسح القسم إذا لزم الأمر */}
              <button
                type="button"
                onClick={handleClearClassEvals}
                className="text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg border border-red-200 font-bold transition shrink-0"
                title={`مسح كافة تقييمات ${evalClass}`}
              >
                <span>مسح القسم</span>
              </button>
            </div>

            {/* إضافة تلميذ فردي سريع */}
            <form onSubmit={handleAddSingleStudent} className="flex gap-1.5 pt-1">
              <input
                className="input text-xs flex-1 py-1.5"
                placeholder="إضافة تلميذ جديد مباشرة إلى هذا الفوج..."
                value={singleEvalName}
                onChange={(e) => setSingleEvalName(e.target.value)}
              />
              <button
                type="submit"
                className="py-1.5 px-3 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition shrink-0"
              >
                إضافة
              </button>
            </form>
          </div>

          {/* بطاقات التلاميذ والتقييم السريع */}
          {(() => {
            const currentEvals = evaluationsList.filter((e) => {
              const matchClass =
                (e.className || "").replace(/\s+/g, "") === evalClass.replace(/\s+/g, "");
              const matchGroup =
                evalGroup === "القسم كامل" || e.groupName === evalGroup;
              const matchSearch =
                !evalSearch.trim() ||
                e.studentName.toLowerCase().includes(evalSearch.trim().toLowerCase());
              return matchClass && matchGroup && matchSearch;
            });

            const totalInView = currentEvals.length;
            const excellentCount = currentEvals.filter((e) => e.totalScore >= 18).length;
            const mediumCount = currentEvals.filter(
              (e) => e.totalScore >= 10 && e.totalScore < 18
            ).length;
            const weakCount = currentEvals.filter((e) => e.totalScore < 10).length;
            const avg = totalInView
              ? (
                  currentEvals.reduce((acc, curr) => acc + curr.totalScore, 0) / totalInView
                ).toFixed(1)
              : "0";

            return (
              <div className="space-y-3">
                {/* إحصائيات سريعة للقسم والفوج */}
                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between text-xs font-bold text-slate-700 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900">
                      {evalClass} ({evalGroup})
                    </span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
                      {totalInView} تلميذ
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-black">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200">
                      🟢 ممتاز: {excellentCount}
                    </span>
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                      🟡 متوسط: {mediumCount}
                    </span>
                    <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200">
                      🔴 ضعيف: {weakCount}
                    </span>
                    <span className="bg-slate-900 text-white px-2 py-0.5 rounded-md">
                      معدل الفوج: {avg}/20
                    </span>
                  </div>
                </div>

                {currentEvals.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-emerald-200 p-6 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl font-black">
                      📋
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-800">
                        لا يوجد تلاميذ مسجلين في {evalClass} ({evalGroup})
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        اضغط على الزر أدناه لاستيراد قائمة أسماء تلاميذ الفوج دفعة واحدة والبدء في التقييم الميداني فوراً.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBatchEvalClass(evalClass);
                        setBatchEvalGroup(evalGroup === "القسم كامل" ? "فوج 1" : evalGroup);
                        setIsBatchEvalModalOpen(true);
                      }}
                      className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition active:scale-95 inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ استيراد قائمة تلاميذ {evalClass} ({evalGroup})</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 xl:grid-cols-4 lg:gap-3 lg:items-start">
                    {currentEvals.map((student) => {
                      const isExc = student.totalScore >= 18;
                      const isVeryGood = student.totalScore >= 15 && student.totalScore < 18;
                      const isGood = student.totalScore >= 12 && student.totalScore < 15;
                      const isMed = student.totalScore >= 10 && student.totalScore < 12;
                      const isWeak = student.totalScore < 10;

                      return (
                        <div
                          key={student.id}
                          className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-3 hover:border-emerald-300 transition"
                        >
                          {/* رأس بطاقة التلميذ: الاسم والعلامة الكلية */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-sm text-slate-900 break-words">
                                  {student.studentName}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700">
                                  {student.className} • {student.groupName}
                                </span>
                              </div>
                            </div>

                            {/* شارة العلامة والتقدير */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div
                                className={`px-3 py-1 rounded-xl font-black text-xs shadow-2xs flex items-center gap-1 ${
                                  isExc
                                    ? "bg-emerald-600 text-white"
                                    : isVeryGood
                                    ? "bg-emerald-500 text-white"
                                    : isGood
                                    ? "bg-sky-600 text-white"
                                    : isMed
                                    ? "bg-amber-500 text-white"
                                    : "bg-rose-600 text-white"
                                }`}
                              >
                                <span>
                                  {isExc
                                    ? "🟢 ممتاز"
                                    : isVeryGood
                                    ? "🟢 جيد جداً"
                                    : isGood
                                    ? "🔵 جيد"
                                    : isMed
                                    ? "🟡 متوسط"
                                    : "🔴 ضعيف"}
                                </span>
                                <span className="text-[10px] opacity-80">•</span>
                                <span className="text-sm tracking-tight">
                                  {student.totalScore}/20
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteEvaluation(student.id, student.studentName)}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition"
                                title="إزالة التلميذ من القائمة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* 1. التقييم الفوري السريع بلمسة واحدة (أثناء جولة الأستاذ) */}
                          <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-black text-slate-600 block">
                              ⚡ تقييم فوري سريع بلمسة واحدة (أثناء المرور بين الطاولات):
                            </span>
                            <div className="grid grid-cols-3 gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuickRate(student.id, "excellent")}
                                className={`py-1.5 px-2 rounded-lg text-xs font-black transition active:scale-95 flex items-center justify-center gap-1 ${
                                  isExc
                                    ? "bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-400"
                                    : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50"
                                }`}
                              >
                                <span>🟢</span>
                                <span>ممتاز (20)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleQuickRate(student.id, "medium")}
                                className={`py-1.5 px-2 rounded-lg text-xs font-black transition active:scale-95 flex items-center justify-center gap-1 ${
                                  isMed || isGood
                                    ? "bg-amber-500 text-white shadow-2xs ring-2 ring-amber-300"
                                    : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"
                                }`}
                              >
                                <span>🟡</span>
                                <span>متوسط (12)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleQuickRate(student.id, "weak")}
                                className={`py-1.5 px-2 rounded-lg text-xs font-black transition active:scale-95 flex items-center justify-center gap-1 ${
                                  isWeak
                                    ? "bg-rose-600 text-white shadow-2xs ring-2 ring-rose-400"
                                    : "bg-white text-rose-800 border border-rose-200 hover:bg-rose-50"
                                }`}
                              >
                                <span>🔴</span>
                                <span>ضعيف (04)</span>
                              </button>
                            </div>
                          </div>

                          {/* 2. توزيع المحاور الأربعة بالتفصيل حسب الميثاق (5 + 5 + 5 + 5 = 20) */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                            {/* محور 1: الكراس */}
                            <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100 space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                                <span>📘 الكراس (192ص+96ص)</span>
                                <span className="font-black text-emerald-700">
                                  {student.notebookScore}/5
                                </span>
                              </div>
                              <div className="grid grid-cols-6 gap-0.5 pt-0.5">
                                {[0, 1, 2, 3, 4, 5].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateCriteria(student.id, "notebookScore", val)
                                    }
                                    className={`py-1 text-[10px] font-black rounded transition ${
                                      Math.round(student.notebookScore) === val
                                        ? "bg-emerald-700 text-white"
                                        : "bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50"
                                    }`}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* محور 2: الواجب */}
                            <div className="bg-sky-50/50 p-2 rounded-xl border border-sky-100 space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-bold text-sky-900">
                                <span>📝 الواجبات والمحاولات</span>
                                <span className="font-black text-sky-700">
                                  {student.homeworkScore}/5
                                </span>
                              </div>
                              <div className="grid grid-cols-6 gap-0.5 pt-0.5">
                                {[0, 1, 2, 3, 4, 5].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateCriteria(student.id, "homeworkScore", val)
                                    }
                                    className={`py-1 text-[10px] font-black rounded transition ${
                                      Math.round(student.homeworkScore) === val
                                        ? "bg-sky-700 text-white"
                                        : "bg-white text-slate-700 border border-slate-200 hover:bg-sky-50"
                                    }`}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* محور 3: الأدوات والانضباط */}
                            <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100 space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                                <span>📐 الأدوات والانضباط</span>
                                <span className="font-black text-amber-700">
                                  {student.toolsScore}/5
                                </span>
                              </div>
                              <div className="grid grid-cols-6 gap-0.5 pt-0.5">
                                {[0, 1, 2, 3, 4, 5].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateCriteria(student.id, "toolsScore", val)
                                    }
                                    className={`py-1 text-[10px] font-black rounded transition ${
                                      Math.round(student.toolsScore) === val
                                        ? "bg-amber-600 text-white"
                                        : "bg-white text-slate-700 border border-slate-200 hover:bg-amber-50"
                                    }`}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* محور 4: النشاط والمحاولة */}
                            <div className="bg-purple-50/50 p-2 rounded-xl border border-purple-100 space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                                <span>💡 محاولة النشاط والسبورة</span>
                                <span className="font-black text-purple-700">
                                  {student.activityScore}/5
                                </span>
                              </div>
                              <div className="grid grid-cols-6 gap-0.5 pt-0.5">
                                {[0, 1, 2, 3, 4, 5].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateCriteria(student.id, "activityScore", val)
                                    }
                                    className={`py-1 text-[10px] font-black rounded transition ${
                                      Math.round(student.activityScore) === val
                                        ? "bg-purple-700 text-white"
                                        : "bg-white text-slate-700 border border-slate-200 hover:bg-purple-50"
                                    }`}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* 3. زر استدراك الدرس السابق والملاحظات */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
                            <button
                              type="button"
                              onClick={() => handleApplyCatchUp(student.id)}
                              className="text-emerald-800 hover:bg-emerald-100 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 font-bold transition flex items-center gap-1 active:scale-95"
                              title="استدراك درس متأخر كان ناقصاً في المراقبة السابقة (يسترجع 50% من علامته وفق الميثاق)"
                            >
                              <span>📖 استدراك درس سابق (+2.5)</span>
                            </button>

                            {/* أزرار سريعة للملاحظات والخصومات */}
                            <div className="flex flex-wrap items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateCriteria(
                                    student.id,
                                    "toolsScore",
                                    Math.max(0, student.toolsScore - 2)
                                  );
                                  handleUpdateNote(
                                    student.id,
                                    student.notes
                                      ? `${student.notes} • ناقص أدوات هندسية (-2)`
                                      : "ناقص أدوات هندسية (-2)"
                                  );
                                }}
                                className="text-slate-600 hover:bg-slate-100 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-medium"
                              >
                                📐 ناقص أدوات (-2)
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateCriteria(
                                    student.id,
                                    "homeworkScore",
                                    Math.max(0, student.homeworkScore - 2)
                                  );
                                  handleUpdateNote(
                                    student.id,
                                    student.notes
                                      ? `${student.notes} • واجب غير كامل (-2)`
                                      : "واجب غير كامل (-2)"
                                  );
                                }}
                                className="text-slate-600 hover:bg-slate-100 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-medium"
                              >
                                📝 واجب ناقص (-2)
                              </button>
                            </div>
                          </div>

                          {/* عرض الملاحظة إن وجدت مع حقل تعديلها */}
                          {student.notes && (
                            <div className="text-[11px] text-amber-900 bg-amber-50/70 p-2 rounded-xl border border-amber-200/60 font-medium">
                              📌 <b>ملاحظة مسجلة:</b> {student.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* نافذة استيراد قائمة تلاميذ الفوج دفعة واحدة */}
      {isBatchEvalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full space-y-4 shadow-xl border border-slate-100 fade-up my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800">
                  استيراد قائمة تلاميذ الفوج دفعة واحدة
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchEvalModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">القسم:</label>
                <select
                  className="input text-xs font-bold"
                  value={batchEvalClass}
                  onChange={(e) => setBatchEvalClass(e.target.value)}
                >
                  {HONOR_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">الفوج:</label>
                <select
                  className="input text-xs font-bold"
                  value={batchEvalGroup}
                  onChange={(e) =>
                    setBatchEvalGroup(e.target.value as "فوج 1" | "فوج 2" | "القسم كامل")
                  }
                >
                  <option value="فوج 1">فوج 1 (نصف القسم)</option>
                  <option value="فوج 2">فوج 2 (نصف القسم)</option>
                  <option value="القسم كامل">القسم كامل</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                الصق أسماء التلاميذ هنا (كل اسم في سطر، أو مفصولة بفواصل):
              </label>
              <textarea
                className="input text-xs min-h-[140px] font-mono leading-relaxed"
                placeholder={"أحمد بوخالفة\nسارة لعريبي\nيونس بلحاج\nمحمد زياني..."}
                value={batchEvalNames}
                onChange={(e) => setBatchEvalNames(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                يمكنك نسخ القائمة مباشرة من ملف إكسل أو وورد ولصقها هنا.
              </p>
            </div>

            {/* خيار النقطة الابتدائية */}
            <label className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                checked={batchDefaultFullScore}
                onChange={(e) => setBatchDefaultFullScore(e.target.checked)}
              />
              <span className="text-xs font-bold text-emerald-950">
                تعيين النقطة الابتدائية 20/20 للجميع (لأقوم بالخصم فقط أثناء المرور)
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleBatchImport}
                className="btn-primary flex-1 py-2.5 text-xs bg-emerald-600 hover:bg-emerald-700"
              >
                حفظ واستيراد القائمة مباشرة
              </button>
              <button
                type="button"
                onClick={() => setIsBatchEvalModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 6. تبويب لوحة الإعلانات والتنبيهات المباشرة ==================== */}
      {mainTab === "announcements" && (
        <div className="space-y-4">
          {/* لافتة تعريفية */}
          <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg shrink-0 mt-0.5">
              📢
            </span>
            <div className="space-y-1 text-xs">
              <h3 className="font-black text-sm">
                لوحة الإعلانات والتنبيهات المباشرة في الموقع
              </h3>
              <p className="text-teal-100 text-[11px] leading-relaxed">
                اكتب هنا أي إشعار غياب (مثلاً: سأغيب يوم الأحد)، تنبيه عن أدوات هندسية، إشعار برفع حل واجب، أو أي ملاحظة تريد أن تظهر فوراً لجميع التلاميذ والأولياء في أعلى الصفحة الرئيسية للموقع.
              </p>
            </div>
          </div>

          <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-4 lg:items-start">
          {/* نموذج إضافة أو تعديل إعلان */}
          <form
            onSubmit={handleSaveAnnouncement}
            className="bg-white rounded-2xl p-4 border-2 border-teal-200/90 shadow-sm space-y-3.5 lg:sticky lg:top-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-teal-100">
              <span className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-teal-600" />
                <span>
                  {editingAnnouncement ? "تعديل الإعلان الحالي" : "نشر إعلان أو تنبيه جديد"}
                </span>
              </span>
              {editingAnnouncement && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAnnouncement(null);
                    setAnnTitle("");
                    setAnnContent("");
                    setAnnDate("");
                    setAnnPinned(false);
                  }}
                  className="text-[11px] font-bold text-red-600 hover:underline"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            <div className="space-y-3">
              {/* 1. نوع وتصنيف الإعلان */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  نوع الإعلان: <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
                  {[
                    { id: "absence", label: "⚠️ تنبيه غياب" },
                    { id: "urgent", label: "🚨 عاجل وهام" },
                    { id: "lesson", label: "📚 دروس وواجبات" },
                    { id: "update", label: "🔔 تحديث الموقع" },
                    { id: "general", label: "📢 إعلان عام" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setAnnCategory(cat.id as any)}
                      className={`py-2 px-2 rounded-xl font-black transition border text-center ${
                        annCategory === cat.id
                          ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. عنوان الإعلان */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  عنوان الإعلان: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: تنبيه غياب الأستاذ يوم الأحد / تم رفع حلول الواجب 3 / إحضار الأدوات الهندسية غداً"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  className="input text-xs font-bold"
                  required
                />
              </div>

              {/* 3. تاريخ الإعلان أو اليوم المعني */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  تاريخ اليوم المعني أو توقيت الإعلان (اختياري):
                </label>
                <input
                  type="text"
                  placeholder="مثال: الأحد 18 أكتوبر 2026 (اتركه فارغاً ليُدرج تاريخ اليوم تلقائياً)"
                  value={annDate}
                  onChange={(e) => setAnnDate(e.target.value)}
                  className="input text-xs"
                />
              </div>

              {/* 4. تفاصيل ونَص الإعلان */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  نص الإعلان والتفاصيل: <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="اكتب هنا التفاصيل الكاملة للإعلان أو الملاحظة أو التوجيهات التي تود توجيهها للتلاميذ وأوليائهم..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition leading-relaxed"
                  required
                />
              </div>

              {/* 5. خيار التثبيت في الأعلى */}
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={annPinned}
                  onChange={(e) => setAnnPinned(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                  <span>تثبيت هذا الإعلان في أعلى الصفحة الرئيسية</span>
                </span>
              </label>

              {/* زر النشر */}
              <button
                type="submit"
                disabled={isSubmitting || !annTitle.trim() || !annContent.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 text-white font-black text-xs hover:bg-teal-700 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Megaphone className="w-4 h-4" />
                    <span>{editingAnnouncement ? "حفظ التعديلات" : "نشر الإعلان فوراً 📢"}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* قائمة الإعلانات الحالية */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <span>سجل الإعلانات والتنبيهات ({announcementsList.length})</span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                تظهر للزوار في الصفحة الرئيسية
              </span>
            </div>

            {announcementsList.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                لا توجد إعلانات منشورة حالياً. استخدم النموذج أعلاه لنشر أول إعلان!
              </div>
            ) : (
              <div className="space-y-2.5">
                {announcementsList.map((ann) => (
                  <div
                    key={ann.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      ann.active === false
                        ? "bg-slate-50/70 border-slate-200 opacity-60"
                        : ann.pinned
                        ? "bg-amber-50/40 border-amber-200"
                        : "bg-white border-slate-200 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-slate-100 text-slate-800">
                          {ann.category === "absence"
                            ? "⚠️ تنبيه غياب"
                            : ann.category === "urgent"
                            ? "🚨 عاجل"
                            : ann.category === "lesson"
                            ? "📚 دروس"
                            : ann.category === "update"
                            ? "🔔 تحديث"
                            : "📢 عام"}
                        </span>
                        {ann.pinned && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-full">
                            <Pin className="w-2.5 h-2.5 fill-amber-700 text-amber-700" /> مثبت
                          </span>
                        )}
                        {ann.active === false && (
                          <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                            مخفي عن الزوار
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-bold">
                          {ann.date}
                        </span>
                      </div>

                      {/* أزرار الإجراءات السريعة */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePinAnnouncement(ann)}
                          title={ann.pinned ? "إلغاء التثبيت" : "تثبيت في الأعلى"}
                          className={`p-1.5 rounded-lg text-xs transition ${
                            ann.pinned
                              ? "bg-amber-100 text-amber-800"
                              : "text-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleActiveAnnouncement(ann)}
                          title={ann.active === false ? "إظهار للزوار" : "إخفاء مؤقت"}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition"
                        >
                          {ann.active === false ? (
                            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingAnnouncement(ann);
                            setAnnTitle(ann.title);
                            setAnnContent(ann.content);
                            setAnnCategory(ann.category);
                            setAnnDate(ann.date || "");
                            setAnnPinned(Boolean(ann.pinned));
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          title="تعديل الإعلان"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingAnnouncement(ann)}
                          title="حذف الإعلان"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-xs font-black text-slate-900 mt-2">
                      {ann.title}
                    </h4>
                    <p className="text-[11px] text-slate-700 mt-1 leading-relaxed whitespace-pre-line">
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* ==================== 7. تبويب صندوق الرسائل والملاحظات المجهولة ==================== */}
      {mainTab === "messages" && (
        <div className="space-y-4">
          {/* لافتة تعريفية */}
          <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-900 text-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg shrink-0 mt-0.5">
              📬
            </span>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm">صندوق الصراحة والشفافية (رسائل مجهولة)</h3>
                {unreadMessagesCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                    {unreadMessagesCount} جديدة
                  </span>
                )}
              </div>
              <p className="text-purple-200 text-[11px] leading-relaxed">
                🔒 جميع هذه الرسائل مجهولة الهوية بنسبة 100% ولا تظهر أي معلومة عن هوية المرسل لضمان الشفافية وحرية التعبير للطلاب والأولياء.
              </p>
            </div>
          </div>

          {/* فلاتر الرسائل */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>تصفية الرسائل:</span>
              <button
                onClick={loadMessages}
                className="text-[11px] text-purple-700 hover:underline flex items-center gap-1 font-bold"
              >
                <RefreshCw className="w-3 h-3" /> تحديث القائمة
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {[
                { id: "all", label: `الكل (${messagesList.length})` },
                { id: "unread", label: `غير مقروءة (${unreadMessagesCount})` },
                { id: "read", label: `مقروءة (${messagesList.length - unreadMessagesCount})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setMessageReadFilter(f.id as any)}
                  className={`py-1.5 px-3 rounded-xl font-bold whitespace-nowrap transition ${
                    messageReadFilter === f.id
                      ? "bg-purple-700 text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs border-t border-slate-100 pt-2">
              {[
                { id: "all", label: "جميع الموضوعات" },
                { id: "question", label: "❓ أسئلة الدروس" },
                { id: "suggestion", label: "💡 مقترحات" },
                { id: "criticism", label: "⚖️ نقد وملاحظات" },
                { id: "other", label: "💬 عام" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setMessageCategoryFilter(c.id)}
                  className={`py-1 px-2.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                    messageCategoryFilter === c.id
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* قائمة الرسائل */}
          {(() => {
            const filtered = messagesList.filter((m) => {
              if (messageReadFilter === "unread" && m.read) return false;
              if (messageReadFilter === "read" && !m.read) return false;
              if (messageCategoryFilter !== "all" && m.category !== messageCategoryFilter) return false;
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-xl">
                    📬
                  </div>
                  <h4 className="text-xs font-black text-slate-800">
                    لا توجد رسائل مطابقة للفلتر
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    عندما يرسل تلميذ أو ولي أمر رسالة من صفحة "صندوق الصراحة"، ستظهر هنا فوراً.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {filtered.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl p-4 border transition ${
                      !msg.read
                        ? "bg-white border-purple-300 shadow-xs ring-1 ring-purple-100"
                        : "bg-slate-50/80 border-slate-200 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            msg.category === "question"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : msg.category === "suggestion"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : msg.category === "criticism"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {msg.category === "question"
                            ? "❓ سؤال حول درس"
                            : msg.category === "suggestion"
                            ? "💡 اقتراح تطويري"
                            : msg.category === "criticism"
                            ? "⚖️ نقد بنّاء"
                            : "💬 استفسار عام"}
                        </span>

                        {msg.targetLevel && (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                            الصف: {msg.targetLevel}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(msg.createdAt).toLocaleDateString("ar-DZ", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        {!msg.read ? (
                          <span className="text-[9px] font-black bg-red-100 text-red-700 px-1.5 py-0.2 rounded-full border border-red-200">
                            جديدة 🆕
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-full">
                            مقروءة ✓
                          </span>
                        )}
                      </div>

                      {/* أزرار الإجراءات */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleMessageRead(msg)}
                          title={msg.read ? "تحديد كغير مقروءة" : "تحديد كمقروءة"}
                          className={`py-1 px-2 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                            msg.read
                              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              : "bg-purple-100 text-purple-800 hover:bg-purple-200"
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>{msg.read ? "غير مقروءة" : "تمت القراءة"}</span>
                        </button>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(msg.content);
                            showToast("success", "تم نسخ نص الرسالة إلى الحافظة 📋");
                          }}
                          title="نسخ نص الرسالة"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingMessage(msg)}
                          title="حذف الرسالة"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* نص الرسالة */}
                    <div className="mt-3 text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-line select-text bg-white p-3 rounded-xl border border-slate-100">
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* نافذة تعديل الدرس */}
      {editingLesson && (
        <EditLessonModal
          lesson={editingLesson}
          knownSections={knownSections}
          onClose={() => setEditingLesson(null)}
          onSuccess={(updated) => {
            setEditingLesson(null);
            // تحديث فوري مباشر للحالة
            setAllLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
            showToast("success", "✓ تم تحديث العنصر بنجاح!");
          }}
        />
      )}

      {/* نافذة تأكيد حذف الدرس */}
      {deletingLesson && (
        <DeleteLessonModal
          lesson={deletingLesson}
          onClose={() => setDeletingLesson(null)}
          onSuccess={(deletedId) => {
            setDeletingLesson(null);
            // تحديث فوري مباشر للحالة
            setAllLessons((prev) => prev.filter((l) => l.id !== deletedId));
            showToast("success", "✓ تم الحذف بنجاح!");
          }}
        />
      )}

      {/* نافذة تعديل استدعاء الولي */}
      {editingSummons && (
        <EditSummonsModal
          summons={editingSummons}
          onClose={() => setEditingSummons(null)}
          onSuccess={(updated) => {
            setEditingSummons(null);
            // تحديث فوري مباشر للحالة
            setSummonsList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            showToast("success", "✓ تم تحديث الاستدعاء بنجاح!");
          }}
        />
      )}

      {/* نافذة تأكيد حذف استدعاء الولي */}
      {deletingSummons && (
        <DeleteSummonsModal
          summons={deletingSummons}
          onClose={() => setDeletingSummons(null)}
          onSuccess={(deletedId) => {
            setDeletingSummons(null);
            // تحديث فوري مباشر للحالة
            setSummonsList((prev) => prev.filter((s) => s.id !== deletedId));
            showToast("success", "✓ تم حذف الاستدعاء من القائمة بنجاح!");
          }}
        />
      )}

      {/* نافذة تعديل تلميذ في لوحة الشرف */}
      {editingHonor && (
        <EditHonorModal
          honor={editingHonor}
          onClose={() => setEditingHonor(null)}
          onSuccess={(updated) => {
            setEditingHonor(null);
            // تحديث فوري مباشر للحالة
            setHonorsList((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
            showToast("success", "✓ تم تحديث بيانات التلميذ بنجاح! 🏆");
          }}
        />
      )}

      {/* نافذة تأكيد حذف تلميذ من لوحة الشرف */}
      {deletingHonor && (
        <DeleteHonorModal
          honor={deletingHonor}
          onClose={() => setDeletingHonor(null)}
          onSuccess={(deletedId) => {
            setDeletingHonor(null);
            // تحديث فوري مباشر للحالة
            setHonorsList((prev) => prev.filter((h) => h.id !== deletedId));
            showToast("success", "✓ تم حذف التلميذ من لوحة الشرف!");
          }}
        />
      )}

      {/* نافذة تعديل العقوبة */}
      {editingPenalty && (
        <EditPenaltyModal
          penalty={editingPenalty}
          onClose={() => setEditingPenalty(null)}
          onSuccess={(updated) => {
            setEditingPenalty(null);
            // تحديث فوري مباشر للحالة
            setPenaltiesList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            showToast("success", "✓ تم تحديث بيانات الخصم والعقوبة بنجاح! ⚠️");
          }}
        />
      )}

      {/* نافذة تأكيد حذف العقوبة */}
      {deletingPenalty && (
        <DeletePenaltyModal
          penalty={deletingPenalty}
          onClose={() => setDeletingPenalty(null)}
          onSuccess={(deletedId) => {
            setDeletingPenalty(null);
            // تحديث فوري مباشر للحالة
            setPenaltiesList((prev) => prev.filter((p) => p.id !== deletedId));
            showToast("success", "✓ تم حذف العقوبة وإلغاء الخصم بنجاح!");
          }}
        />
      )}

      {/* نافذة تأكيد حذف إعلان */}
      {deletingAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-100 fade-up">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-black text-slate-900">هل أنت متأكد من حذف هذا الإعلان؟</h3>
              <p className="text-xs text-slate-500 line-clamp-2">"{deletingAnnouncement.title}"</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingAnnouncement(null)}
                className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-black hover:bg-slate-200 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAnnouncement(deletingAnnouncement.id)}
                className="py-2.5 px-3 rounded-xl bg-red-600 text-white text-xs font-black hover:bg-red-700 transition"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد حذف رسالة */}
      {deletingMessage && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-100 fade-up">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-black text-slate-900">هل أنت متأكد من حذف هذه الرسالة؟</h3>
              <p className="text-xs text-slate-500 line-clamp-2">"{deletingMessage.content}"</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingMessage(null)}
                className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-black hover:bg-slate-200 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMessage(deletingMessage.id)}
                className="py-2.5 px-3 rounded-xl bg-red-600 text-white text-xs font-black hover:bg-red-700 transition"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- 3. بطاقة درس / حصة ---------------- */
function LessonCard({
  lesson,
  open,
  onToggle,
  onLessonUpdated,
  onEdit,
  onDelete,
  showToast,
}: {
  lesson: Lesson;
  open: boolean;
  onToggle: () => void;
  onLessonUpdated: (updated: Lesson) => void;
  onEdit: () => void;
  onDelete: () => void;
  showToast: (type: "success" | "error", text: string) => void;
}) {
  const [uploading, setUploading] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [isDeletingImg, setIsDeletingImg] = useState(false);
  const [deletingHwImageId, setDeletingHwImageId] = useState<string | null>(null);
  const [isDeletingHwImg, setIsDeletingHwImg] = useState(false);
  const [cardTab, setCardTab] = useState<"homework" | "board">("homework");

  const isDirectedWork = lesson.type === "directed_work";
  const isWorksheet = lesson.type === "worksheets";
  const isSummary = lesson.type === "summaries";
  const isLesson = !lesson.type || lesson.type === "lessons";

  const uploadFiles = async (files: FileList | null, isHomework: boolean = false) => {
    if (!files?.length || isUploading) return;
    const list = Array.from(files);

    setIsUploading(true);
    setUploadProgress(5);
    if (!open) onToggle();
    setCardTab(isHomework ? "homework" : "board");

    try {
      const preparedFiles: { file: File | Blob; name: string }[] = [];

      for (let k = 0; k < list.length; k++) {
        const file = list[k];
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

        setUploadProgress(Math.min(22, Math.round(5 + ((k + 1) / list.length) * 15)));
        setUploading(
          isPdf
            ? `جاري فحص وتجهيز مستند PDF "${file.name}"...`
            : `جاري ضغط وتحسين الصورة ${k + 1} من ${list.length}...`
        );

        let fileToUpload: File | Blob = file;

        // ضغط الصور فقط، أما ملفات PDF فترفع كما هي بجودتها الكاملة
        if (!isPdf && (file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name))) {
          try {
            fileToUpload = await imageCompression(file, {
              maxSizeMB: BOARD_IMAGE_OPTIONS.maxSizeMB,
              maxWidthOrHeight: BOARD_IMAGE_OPTIONS.maxWidthOrHeight,
              useWebWorker: true,
              fileType: "image/jpeg",
            });
          } catch (compressErr) {
            console.warn("Image compression skipped:", compressErr);
            fileToUpload = file;
          }
        }

        preparedFiles.push({ file: fileToUpload, name: file.name });
      }

      setUploadProgress(25);
      setUploading(`قيد إرسال ${preparedFiles.length} ملفات إلى الخادم...`);

      const formData = new FormData();
      formData.append("lessonId", lesson.id);
      if (isHomework) formData.append("isHomework", "true");

      for (const item of preparedFiles) {
        formData.append("files", item.file, item.name);
      }

      // رفع الملف مع تتبع نسبة التقدم عبر XMLHttpRequest
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.min(94, Math.round(25 + (event.loaded / event.total) * 68));
            setUploadProgress(percent);
            setUploading(`قيد إرسال الملف إلى السحابة... (${percent}%)`);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({});
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || `خطأ في الخادم (${xhr.status})`));
            } catch {
              reject(new Error(`خطأ في الخادم (${xhr.status})`));
            }
          }
        };

        xhr.onerror = () => reject(new Error("تعذر الاتصال بالخادم، يرجى التحقق من الإنترنت"));
        xhr.ontimeout = () => reject(new Error("انتهت مهلة انتظار الخادم"));

        xhr.send(formData);
      });

      setUploadProgress(97);
      setUploading("تم إرسال الملف! جاري الحفظ والتثبيت الفوري في الموقع...");

      // تحديث الحالة محلياً وفورياً بمجرد استلام الرد من الخادم دون أي تأخير
      if (uploadResult && uploadResult.lesson) {
        onLessonUpdated(uploadResult.lesson);
      }

      setUploadProgress(100);
      setUploading("✓ اكتمل الرفع بنجاح!");

      showToast(
        "success",
        isHomework
          ? `✓ تم رفع وحفظ ${preparedFiles.length} ملفات بنجاح إلى حل الواجب 📝`
          : `✓ تم رفع وحفظ ${preparedFiles.length} ملفات بنجاح إلى "${lesson.title}" 📁`
      );

      // تأكيد إضافي بجلب الدرس في الخلفية للتأكد من مزامنة كل شيء
      fetch(`/api/lessons/${lesson.id}?_t=${Date.now()}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((fresh) => {
          if (fresh.lesson) onLessonUpdated(fresh.lesson);
        })
        .catch(() => {});

      // إبقاء نسبة 100% لفترة قصيرة ليطمئن الأستاذ
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (e: any) {
      showToast("error", "فشل رفع الملفات: " + (e.message || "خطأ غير معروف"));
    } finally {
      setIsUploading(false);
      setUploading("");
      setUploadProgress(0);
    }
  };

  const confirmDeleteImage = async () => {
    if (!deletingImageId) return;
    setIsDeletingImg(true);
    try {
      const res = await fetch(`/api/images?lessonId=${lesson.id}&imageId=${deletingImageId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("success", "✓ تم حذف الصورة بنجاح");
        // تحديث محلي مباشر
        const updated = {
          ...lesson,
          images: lesson.images.filter((img) => img.id !== deletingImageId),
        };
        onLessonUpdated(updated);
        setDeletingImageId(null);
      } else {
        const data = await res.json();
        showToast("error", data.error || "تعذر حذف الصورة");
      }
    } catch {
      showToast("error", "تعذر الاتصال بالخادم لحذف الصورة");
    } finally {
      setIsDeletingImg(false);
    }
  };

  const moveImage = async (index: number, direction: "prev" | "next") => {
    const images = [...lesson.images];
    const targetIndex = direction === "prev" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const temp = images[index];
    images[index] = images[targetIndex];
    images[targetIndex] = temp;

    // تحديث محلي فوري
    onLessonUpdated({ ...lesson, images });

    try {
      const res = await fetch("/api/images", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          imageIds: images.map((img) => img.id),
        }),
      });
      if (!res.ok) {
        showToast("error", "فشل حفظ ترتيب الصور في الخادم");
      }
    } catch {
      showToast("error", "فشل تغيير ترتيب الصور");
    }
  };

  const confirmDeleteHwImage = async () => {
    if (!deletingHwImageId) return;
    setIsDeletingHwImg(true);
    try {
      const res = await fetch(
        `/api/images?lessonId=${lesson.id}&imageId=${deletingHwImageId}&isHomework=true`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        showToast("success", "✓ تم حذف صورة حل الواجب بنجاح");
        const updated = {
          ...lesson,
          homeworkImages: (lesson.homeworkImages || []).filter(
            (img) => img.id !== deletingHwImageId
          ),
        };
        onLessonUpdated(updated);
        setDeletingHwImageId(null);
      } else {
        const data = await res.json();
        showToast("error", data.error || "تعذر حذف صورة حل الواجب");
      }
    } catch {
      showToast("error", "تعذر الاتصال بالخادم لحذف صورة الواجب");
    } finally {
      setIsDeletingHwImg(false);
    }
  };

  const moveHwImage = async (index: number, direction: "prev" | "next") => {
    const images = [...(lesson.homeworkImages || [])];
    const targetIndex = direction === "prev" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const temp = images[index];
    images[index] = images[targetIndex];
    images[targetIndex] = temp;

    onLessonUpdated({ ...lesson, homeworkImages: images });

    try {
      const res = await fetch("/api/images", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          imageIds: images.map((img) => img.id),
          isHomework: true,
        }),
      });
      if (!res.ok) {
        showToast("error", "فشل حفظ ترتيب صور الواجب في الخادم");
      }
    } catch {
      showToast("error", "فشل تغيير ترتيب صور الواجب");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden transition">
      <div className="p-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
        <button
          type="button"
          onClick={onToggle}
          className="w-full sm:flex-1 flex items-start gap-2.5 text-right min-w-0 group cursor-pointer"
        >
          <span
            className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-black text-xs mt-0.5 ${
              isDirectedWork
                ? "bg-sky-50 text-sky-700"
                : isWorksheet
                ? "bg-indigo-50 text-indigo-700"
                : isSummary
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {lesson.number}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-xs sm:text-sm text-slate-900 leading-snug break-words">
              {lesson.title}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] text-slate-400">
              <span className="font-semibold text-slate-600">
                {isDirectedWork
                  ? "حصة أعمال موجهة"
                  : isWorksheet
                  ? "سلسلة تمارين"
                  : isSummary
                  ? "ملخص"
                  : "مورد معرفي"}{" "}
                {lesson.number}
              </span>
              <span>•</span>
              <span className="font-bold text-slate-500">
                {lesson.images?.length || 0} {isLesson ? "صور سبورة" : "صور"}
              </span>
              {(isLesson || isWorksheet) && (
                (lesson.homeworkImages?.length || 0) > 0 ? (
                  <>
                    <span>•</span>
                    <span className="text-blue-800 font-black bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      📝 {lesson.homeworkImages?.length} {isWorksheet ? "حل السلسلة ✓" : "حل واجب ✓"}
                    </span>
                  </>
                ) : (
                  <>
                    <span>•</span>
                    <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                      ⚠️ {isWorksheet ? "لم يُرفع حل السلسلة بعد" : "لم يُرفع حل الواجب بعد"}
                    </span>
                  </>
                )
              )}
              {lesson.notes && (
                <>
                  <span>•</span>
                  <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded">📌 ملاحظة</span>
                </>
              )}
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform shrink-0 mt-1 ${open ? "rotate-180" : ""}`}
          />
        </button>

        <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0 w-full sm:w-auto">
          {/* زر مباشر لاختيار ورفع صورة حل الواجب أو صور المحتوى */}
          {(isLesson || isWorksheet) ? (
            <label
              onClick={(e) => {
                if (isUploading) { e.preventDefault(); return; }
                e.stopPropagation();
                if (!open) onToggle();
                setCardTab("homework");
              }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shrink-0 shadow-2xs ${
                isUploading
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none"
                  : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-95"
              }`}
              title="اضغط هنا فوراً لرفع صورة أو ملف PDF لحل الواجب لهذا الدرس من الهاتف أو الحاسوب"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>قيد الرفع {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-white" />
                  <span>{isWorksheet ? "📝 رفع الحل (صور/PDF)" : "📝 رفع حل الواجب (صور/PDF)"}</span>
                </>
              )}
              <input
                type="file"
                accept="image/*,application/pdf,.pdf"
                multiple
                hidden
                disabled={isUploading}
                onChange={(e) => {
                  uploadFiles(e.target.files, true);
                  e.target.value = "";
                }}
              />
            </label>
          ) : isSummary ? (
            <label
              onClick={(e) => {
                if (isUploading) { e.preventDefault(); return; }
                e.stopPropagation();
                if (!open) onToggle();
                setCardTab("board");
              }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shrink-0 shadow-2xs ${
                isUploading
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none"
                  : "bg-amber-600 hover:bg-amber-700 text-white cursor-pointer active:scale-95"
              }`}
              title="اضغط هنا لرفع صور أو ملفات PDF للملخص"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>قيد الرفع {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-white" />
                  <span>📌 رفع الملخص (صور/PDF)</span>
                </>
              )}
              <input
                type="file"
                accept="image/*,application/pdf,.pdf"
                multiple
                hidden
                disabled={isUploading}
                onChange={(e) => {
                  uploadFiles(e.target.files, false);
                  e.target.value = "";
                }}
              />
            </label>
          ) : (
            <label
              onClick={(e) => {
                if (isUploading) { e.preventDefault(); return; }
                e.stopPropagation();
                if (!open) onToggle();
                setCardTab("board");
              }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shrink-0 shadow-2xs ${
                isUploading
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none"
                  : "bg-sky-600 hover:bg-sky-700 text-white cursor-pointer active:scale-95"
              }`}
              title="اضغط هنا لرفع صور الحصة أو ملفات PDF"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>قيد الرفع {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-white" />
                  <span>📁 رفع صور أو PDF</span>
                </>
              )}
              <input
                type="file"
                accept="image/*,application/pdf,.pdf"
                multiple
                hidden
                disabled={isUploading}
                onChange={(e) => {
                  uploadFiles(e.target.files, false);
                  e.target.value = "";
                }}
              />
            </label>
          )}

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onEdit}
              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition border border-slate-200/80 sm:border-0"
              title="تعديل البيانات"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition border border-slate-200/80 sm:border-0"
              title="حذف العنصر كاملاً"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 p-3.5 space-y-3.5 bg-slate-50/50">
          {/* شريط ومؤشر الرفع الحي فائق الوضوح */}
          {isUploading && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-500 rounded-2xl p-4 shadow-md space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                  <span className="text-emerald-950 font-black">{uploading || "قيد التحميل والرفع..."}</span>
                </div>
                <span className="font-mono text-emerald-700 font-black text-sm bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300 shadow-2xs shrink-0">
                  {uploadProgress}%
                </span>
              </div>

              {/* شريط التقدم الفعلي الملون */}
              <div className="w-full bg-slate-200 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-300">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 h-full rounded-full transition-all duration-150 ease-out shadow-xs"
                  style={{ width: `${Math.max(5, uploadProgress)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-bold pt-0.5">
                <span className="flex items-center gap-1 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  يرجى الانتظار ثوانٍ قليلة · تم إرسال الملف ولا داعي لتكرار الرفع
                </span>
                <span className="text-slate-500 font-medium">
                  {uploadProgress >= 96 ? "جاري الحفظ النهائي..." : "جاري النقل للسحابة..."}
                </span>
              </div>
            </div>
          )}
          {lesson.notes && (
            <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-black text-[11px] flex items-center gap-1">
                <StickyNote className="w-3.5 h-3.5 text-amber-600" /> ملاحظة الأستاذ:
              </span>
              <p className="whitespace-pre-line leading-relaxed font-medium">{lesson.notes}</p>
            </div>
          )}

          {/* تبويبات بطاقة الدرس: حل الواجب مقابل صور وملفات العنصر */}
          {!isSummary ? (
            <div className="grid grid-cols-2 gap-1.5 bg-slate-200/70 p-1 rounded-xl text-center">
              <button
                type="button"
                onClick={() => setCardTab("homework")}
                className={`py-2 px-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 ${
                  cardTab === "homework"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-700 hover:bg-white/60"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>
                  {isWorksheet
                    ? `📝 حل السلسلة (${lesson.homeworkImages?.length || 0})`
                    : `📝 حل الواجب (${lesson.homeworkImages?.length || 0})`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCardTab("board")}
                className={`py-2 px-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 ${
                  cardTab === "board"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "text-slate-700 hover:bg-white/60"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {isWorksheet
                    ? `📑 ملفات السلسلة (${lesson.images?.length || 0})`
                    : isDirectedWork
                    ? `📗 صور الحصة (${lesson.images?.length || 0})`
                    : `📷 صور السبورة (${lesson.images?.length || 0})`}
                </span>
              </button>
            </div>
          ) : (
            <div className="bg-amber-100/70 p-2.5 rounded-xl text-center text-xs font-black text-amber-900 flex items-center justify-center gap-2">
              <Upload className="w-4 h-4 text-amber-700" />
              <span>📌 ملفات وصور الملخص ({lesson.images?.length || 0}):</span>
            </div>
          )}

          {/* ================= 1. قسم الحل النموذجي للواجب أو السلسلة ================= */}
          {cardTab === "homework" && (
            <div className="space-y-3 bg-blue-50/40 p-3 rounded-2xl border border-blue-200/80">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5 text-blue-900 font-black">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>
                    {isWorksheet
                      ? `ملفات وحلول السلسلة (${lesson.homeworkImages?.length || 0}):`
                      : `صور وملفات الحل النموذجي للواجب (${lesson.homeworkImages?.length || 0}):`}
                  </span>
                </span>
                <span className="text-[11px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded">
                  {isWorksheet ? "الحل النموذجي 📝" : "يُرفع بعد تصحيح الواجب في القسم 📝"}
                </span>
              </div>

              {lesson.homeworkNotes && (
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
                  <span className="font-black text-[11px] flex items-center gap-1">
                    <StickyNote className="w-3.5 h-3.5 text-blue-600" /> تفاصيل وتمارين الواجب:
                  </span>
                  <p className="whitespace-pre-line leading-relaxed font-medium">{lesson.homeworkNotes}</p>
                </div>
              )}

              {lesson.homeworkImages && lesson.homeworkImages.length > 0 ? (
                <div className="space-y-2">
                  {lesson.homeworkImages.map((img, idx) => {
                    const isPdf = isPdfFile(img);
                    return (
                      <div
                        key={img.id}
                        className="flex items-center gap-2.5 bg-white p-2 rounded-xl border border-blue-100 shadow-2xs"
                      >
                        <span className="w-7 h-7 shrink-0 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>

                        {isPdf ? (
                          <div
                            onClick={() => window.open(img.url, "_blank")}
                            className="w-14 h-14 rounded-lg bg-red-50 border border-red-200 text-red-600 flex flex-col items-center justify-center shrink-0 cursor-pointer hover:bg-red-100 transition"
                            title="فتح ملف PDF في نافذة جديدة"
                          >
                            <FileText className="w-6 h-6 text-red-600" />
                            <span className="text-[9px] font-black text-red-700 mt-0.5">PDF</span>
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={img.url}
                            alt=""
                            onClick={() => setPreviewImg(img.url)}
                            className="w-14 h-14 object-cover rounded-lg border border-slate-100 shrink-0 cursor-pointer hover:opacity-90 transition"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-700 truncate" title={img.name}>
                            {img.name || (isPdf ? `حل الواجب (PDF) ${idx + 1}` : `حل الواجب صفحة ${idx + 1}`)}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {isPdf ? (
                              <a
                                href={img.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-red-600 font-bold hover:underline flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" /> فتح PDF
                              </a>
                            ) : (
                              <button
                                onClick={() => setPreviewImg(img.url)}
                                className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" /> معاينة كاملة
                              </button>
                            )}
                            <a
                              href={img.downloadUrl || img.url}
                              download={img.name || (isPdf ? `حل-${idx + 1}.pdf` : `حل-${idx + 1}.jpg`)}
                              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" /> تحميل
                            </a>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            disabled={idx === 0}
                            onClick={() => moveHwImage(idx, "prev")}
                            className={`w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center transition ${
                              idx === 0
                                ? "opacity-30 cursor-not-allowed text-slate-300"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                            title="نقل لأعلى (تقديم الترتيب)"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={idx === (lesson.homeworkImages?.length ?? 0) - 1}
                            onClick={() => moveHwImage(idx, "next")}
                            className={`w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center transition ${
                              idx === (lesson.homeworkImages?.length ?? 0) - 1
                                ? "opacity-30 cursor-not-allowed text-slate-300"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                            title="نقل لأسفل (تأخير الترتيب)"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => setDeletingHwImageId(img.id)}
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition shrink-0"
                          title="حذف هذا الملف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 bg-white rounded-xl border border-dashed border-blue-200 text-xs text-slate-500 space-y-1">
                  <div className="font-bold text-slate-700">
                    {isWorksheet
                      ? "لم يتم رفع حل السلسلة بعد (يمكنك رفع ملف PDF أو صور)."
                      : "لم يتم رفع الحل النموذجي للواجب بعد (يمكنك رفع ملف PDF أو صور)."}
                  </div>
                  <div className="text-[11px] text-blue-700">
                    اضغط على الزر الأزرق أدناه لاختيار ورفع ملف PDF أو صور الحل من هاتفك أو حاسوبك.
                  </div>
                </div>
              )}

              <label
                className={`w-full py-3 px-3 rounded-xl text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-sm ${
                  isUploading
                    ? "bg-slate-400 cursor-not-allowed opacity-80 pointer-events-none"
                    : "bg-blue-600 hover:bg-blue-700 cursor-pointer active:scale-95"
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>⏳ قيد الرفع والمعالجة السحابية ({uploadProgress}%)... يرجى الانتظار</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-white" />
                    <span>
                      {isWorksheet
                        ? "📝 اضغط هنا لاختيار ورفع حل السلسلة (ملف PDF أو صور)"
                        : "📝 اضغط هنا لاختيار ورفع صور أو ملف PDF لحل الواجب"}
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,application/pdf,.pdf"
                  multiple
                  hidden
                  disabled={isUploading}
                  onChange={(e) => {
                    uploadFiles(e.target.files, true);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}

          {/* ================= 2. قسم ملفات وصور السبورة / السلسلة ================= */}
          {cardTab === "board" && (
            <div className="space-y-3 bg-emerald-50/40 p-3 rounded-2xl border border-emerald-200/80">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>
                  {isWorksheet
                    ? `ملفات ومستندات السلسلة (${lesson.images?.length || 0}):`
                    : isSummary
                    ? `ملفات ومستندات الملخص (${lesson.images?.length || 0}):`
                    : `صور وملفات السبورة لهذا الدرس (${lesson.images?.length || 0}):`}
                </span>
                <span className="text-[11px] text-slate-400 font-normal">مرتبة بالتسلسل</span>
              </div>

              {lesson.images && lesson.images.length > 0 ? (
                <div className="space-y-2">
                  {lesson.images.map((img, idx) => {
                    const isPdf = isPdfFile(img);
                    return (
                      <div
                        key={img.id}
                        className="flex items-center gap-2.5 bg-white p-2 rounded-xl border border-slate-100 shadow-2xs"
                      >
                        <span className="w-7 h-7 shrink-0 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>

                        {isPdf ? (
                          <div
                            onClick={() => window.open(img.url, "_blank")}
                            className="w-14 h-14 rounded-lg bg-red-50 border border-red-200 text-red-600 flex flex-col items-center justify-center shrink-0 cursor-pointer hover:bg-red-100 transition"
                            title="فتح ملف PDF في نافذة جديدة"
                          >
                            <FileText className="w-6 h-6 text-red-600" />
                            <span className="text-[9px] font-black text-red-700 mt-0.5">PDF</span>
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={img.url}
                            alt=""
                            onClick={() => setPreviewImg(img.url)}
                            className="w-14 h-14 object-cover rounded-lg border border-slate-100 shrink-0 cursor-pointer hover:opacity-90 transition"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-700 truncate" title={img.name}>
                            {img.name || (isPdf ? `ملف PDF ${idx + 1}` : `صورة ${idx + 1}`)}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {isPdf ? (
                              <a
                                href={img.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-red-600 font-bold hover:underline flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" /> فتح PDF
                              </a>
                            ) : (
                              <button
                                onClick={() => setPreviewImg(img.url)}
                                className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" /> معاينة كاملة
                              </button>
                            )}
                            <a
                              href={img.downloadUrl || img.url}
                              download={img.name || (isPdf ? `ملف-${idx + 1}.pdf` : `صورة-${idx + 1}.jpg`)}
                              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" /> تحميل
                            </a>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            disabled={idx === 0}
                            onClick={() => moveImage(idx, "prev")}
                            className={`w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center transition ${
                              idx === 0
                                ? "opacity-30 cursor-not-allowed text-slate-300"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                            title="نقل لأعلى (الترتيب)"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={idx === lesson.images.length - 1}
                            onClick={() => moveImage(idx, "next")}
                            className={`w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center transition ${
                              idx === lesson.images.length - 1
                                ? "opacity-30 cursor-not-allowed text-slate-300"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                            title="نقل لأسفل (الترتيب)"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => setDeletingImageId(img.id)}
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition shrink-0"
                          title="حذف هذا الملف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                  {isWorksheet
                    ? "لا توجد ملفات مرفوعة لهذه السلسلة بعد. اضغط الزر أدناه لرفع ملف PDF أو صور التمارين."
                    : isSummary
                    ? "لا توجد ملفات مرفوعة لهذا الملخص بعد. اضغط الزر أدناه لرفع ملف PDF أو صور الملخص."
                    : "لا توجد ملفات أو صور مرفوعة لهذا الدرس بعد. اضغط الزر أدناه للرفع."}
                </div>
              )}

              <label
                className={`w-full py-3 px-3 rounded-xl text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-sm ${
                  isUploading
                    ? "bg-slate-400 cursor-not-allowed opacity-80 pointer-events-none"
                    : "btn-primary cursor-pointer active:scale-95"
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>⏳ قيد الرفع والمعالجة السحابية ({uploadProgress}%)... يرجى الانتظار</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>
                      {isWorksheet
                        ? "📑 اضغط هنا لرفع السلسلة (ملف PDF أو صور)"
                        : isSummary
                        ? "📌 اضغط هنا لرفع الملخص (ملف PDF أو صور)"
                        : "📁 رفع ملفات PDF أو صور سبورة جديدة"}
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,application/pdf,.pdf"
                  multiple
                  hidden
                  disabled={isUploading}
                  onChange={(e) => {
                    uploadFiles(e.target.files, false);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}

          <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60">
            <a
              href={`/lesson/${lesson.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold"
            >
              <ExternalLink className="w-3.5 h-3.5" /> فتح صفحة الدرس للتلميذ
            </a>
            <button
              onClick={onDelete}
              className="flex items-center gap-1 text-red-600 hover:text-red-700 font-bold"
            >
              <Trash2 className="w-3.5 h-3.5" /> حذف العنصر كاملاً
            </button>
          </div>
        </div>
      )}

      {deletingImageId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-slate-100 text-center fade-up">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">تأكيد حذف صورة السبورة</h3>
              <p className="text-xs text-slate-500 mt-1">
                هل أنت متأكد من حذف هذه الصورة من "{lesson.title}"؟
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                disabled={isDeletingImg}
                onClick={confirmDeleteImage}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center justify-center gap-1"
              >
                {isDeletingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : "نعم، حذف الصورة"}
              </button>
              <button
                disabled={isDeletingImg}
                onClick={() => setDeletingImageId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingHwImageId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-slate-100 text-center fade-up">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">تأكيد حذف صورة حل الواجب</h3>
              <p className="text-xs text-slate-500 mt-1">
                هل أنت متأكد من حذف صورة الحل النموذجي هذه من "{lesson.title}"؟
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                disabled={isDeletingHwImg}
                onClick={confirmDeleteHwImage}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center justify-center gap-1"
              >
                {isDeletingHwImg ? <Loader2 className="w-4 h-4 animate-spin" /> : "نعم، حذف الصورة"}
              </button>
              <button
                disabled={isDeletingHwImg}
                onClick={() => setDeletingHwImageId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {previewImg && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-3"
          onClick={() => setPreviewImg(null)}
        >
          <div className="absolute top-4 left-4 flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
            <a
              href={previewImg}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition backdrop-blur-xs"
            >
              <ExternalLink className="w-4 h-4" />
              <span>فتح في نافذة كاملة</span>
            </a>
            <button
              onClick={() => setPreviewImg(null)}
              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition backdrop-blur-xs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {isPdfFile({ url: previewImg }) ? (
            <div className="w-full max-w-4xl h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
              <iframe
                src={`${previewImg}#toolbar=1`}
                title="معاينة PDF"
                className="w-full flex-1 border-0"
              />
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewImg}
              alt=""
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- 4. نافذة تعديل الدرس ---------------- */
function EditLessonModal({
  lesson,
  knownSections,
  onClose,
  onSuccess,
}: {
  lesson: Lesson;
  knownSections: string[];
  onClose: () => void;
  onSuccess: (updated: Lesson) => void;
}) {
  const [num, setNum] = useState(String(lesson.number));
  const [title, setTitle] = useState(lesson.title);
  const [field, setField] = useState(lesson.field || "أنشطة عددية");
  const [section, setSection] = useState(lesson.section || "المقطع 1 : الأعداد الطبيعية والأعداد العشرية");
  const [notes, setNotes] = useState(lesson.notes || "");
  const [homeworkNotes, setHomeworkNotes] = useState(lesson.homeworkNotes || "");
  // تحويل ISO إلى صيغة حقل datetime-local بالتوقيت المحلي
  const toLocalInput = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const [homeworkDueAt, setHomeworkDueAt] = useState(toLocalInput(lesson.homeworkDueAt));
  const [solutionPublishAt, setSolutionPublishAt] = useState(toLocalInput(lesson.solutionPublishAt));
  const [type, setType] = useState<NotebookType>(lesson.type || "lessons");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErr("العنوان مطلوب");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lesson.id,
          type,
          title: title.trim(),
          number: Number(num) || lesson.number,
          field: type === "lessons" ? field.trim() : undefined,
          section: (type === "lessons" || type === "worksheets" || type === "summaries") ? section.trim() : undefined,
          notes: notes.trim() || undefined,
          homeworkNotes: type === "lessons" ? homeworkNotes.trim() || undefined : undefined,
          homeworkDueAt: homeworkDueAt ? new Date(homeworkDueAt).toISOString() : null,
          solutionPublishAt: solutionPublishAt ? new Date(solutionPublishAt).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التعديل");

      onSuccess(data.lesson);
    } catch (e: any) {
      setErr(e.message || "حدث خطأ أثناء التعديل");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <form
        onSubmit={submit}
        className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-xl border border-slate-100 fade-up my-auto max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-800">تعديل بيانات العنصر</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {err && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{err}</span>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">القسم التابع له:</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setType("lessons")}
              className={`py-2 text-[11px] font-bold rounded-xl border transition ${
                type === "lessons"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-400 ring-1 ring-emerald-400"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              📘 كراس الدروس
            </button>
            <button
              type="button"
              onClick={() => setType("directed_work")}
              className={`py-2 text-[11px] font-bold rounded-xl border transition ${
                type === "directed_work"
                  ? "bg-sky-50 text-sky-800 border-sky-400 ring-1 ring-sky-400"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              📗 الأعمال الموجهة
            </button>
            <button
              type="button"
              onClick={() => setType("worksheets")}
              className={`py-2 text-[11px] font-bold rounded-xl border transition ${
                type === "worksheets"
                  ? "bg-indigo-50 text-indigo-800 border-indigo-400 ring-1 ring-indigo-400"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              📑 سلاسل التمارين
            </button>
            <button
              type="button"
              onClick={() => setType("summaries")}
              className={`py-2 text-[11px] font-bold rounded-xl border transition ${
                type === "summaries"
                  ? "bg-amber-50 text-amber-800 border-amber-400 ring-1 ring-amber-400"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              📌 الملخصات
            </button>
          </div>
        </div>

        {type === "lessons" && (
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">الميدان:</label>
            <input
              className="input text-xs font-semibold"
              value={field}
              onChange={(e) => setField(e.target.value)}
              required
            />
          </div>
        )}

        {(type === "lessons" || type === "worksheets" || type === "summaries") && (
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">المقطع المعرفي:</label>
            <input
              className="input text-xs font-semibold"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-1">
            <label className="text-xs font-bold text-slate-600 block mb-1">الرقم:</label>
            <input
              className="input text-center text-sm font-extrabold text-emerald-700 bg-emerald-50/40"
              inputMode="numeric"
              value={num}
              onChange={(e) => setNum(e.target.value)}
              required
            />
          </div>
          <div className="col-span-3">
            <label className="text-xs font-bold text-slate-600 block mb-1">العنوان:</label>
            <input
              className="input text-xs font-semibold"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 block mb-1">
            ملاحظات وتوجيهات الأستاذ للدرس:
          </label>
          <textarea
            className="input text-xs min-h-[50px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="اكتب ملاحظة للدرس إن أردت..."
          />
        </div>

        <div>
          <label className="text-xs font-bold text-blue-800 block mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>تفاصيل وتمارين الواجب المنزلي (اختياري):</span>
          </label>
          <textarea
            className="input text-xs min-h-[50px] border-blue-200 bg-blue-50/20"
            value={homeworkNotes}
            onChange={(e) => setHomeworkNotes(e.target.value)}
            placeholder="مثال: حل التمارين 14 و 15 ص 30 في كراس المحاولات 96ص..."
          />
        </div>

        {/* جدولة نشر الحل: الواجب أولاً ثم الحل النموذجي بعد انتهاء المهلة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-blue-50/40 border border-blue-100">
          <label className="text-[11px] font-bold text-blue-900 space-y-1">
            <span>آخر أجل لإنجاز الواجب</span>
            <input
              type="datetime-local"
              className="input text-xs"
              value={homeworkDueAt}
              onChange={(e) => {
                setHomeworkDueAt(e.target.value);
                if (!solutionPublishAt) setSolutionPublishAt(e.target.value);
              }}
            />
          </label>
          <label className="text-[11px] font-bold text-blue-900 space-y-1">
            <span>نشر الحل النموذجي للأولياء ابتداءً من</span>
            <input type="datetime-local" className="input text-xs" value={solutionPublishAt} onChange={(e) => setSolutionPublishAt(e.target.value)} />
          </label>
          <p className="sm:col-span-2 text-[10px] text-blue-800">
            ترفع صور الحل متى شئت؛ لن تظهر للتلاميذ والأولياء قبل هذا الموعد. اتركه فارغاً للنشر الفوري.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button disabled={busy} className="btn-primary flex-1 py-2.5 text-xs">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديل"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- 5. نافذة تأكيد حذف الدرس ---------------- */
function DeleteLessonModal({
  lesson,
  onClose,
  onSuccess,
}: {
  lesson: Lesson;
  onClose: () => void;
  onSuccess: (deletedId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submitDelete = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/lessons?id=${encodeURIComponent(lesson.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحذف");
      onSuccess(lesson.id);
    } catch (e: any) {
      setErr(e.message || "حدث خطأ أثناء محاولة الحذف");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-slate-100 text-center fade-up">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6" />
        </div>

        <div>
          <h3 className="font-extrabold text-sm text-slate-900">تأكيد الحذف نهائياً</h3>
          <p className="text-xs font-bold text-slate-700 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-snug break-words">
            {lesson.title}
          </p>
          <p className="text-[11px] text-red-600 mt-2">
            ⚠️ تنبيه: سيتم حذف هذا العنصر وجميع صور السبورة التابعة له ({lesson.images?.length || 0} صورة) بشكل دائم.
          </p>
        </div>

        {err && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
            {err}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            disabled={busy}
            onClick={submitDelete}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "نعم، حذف الآن"}
          </button>
          <button
            disabled={busy}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            إلغاء وتراجع
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 6. نافذة تعديل موعد استقبال الولي ---------------- */
function EditSummonsModal({
  summons,
  onClose,
  onSuccess,
}: {
  summons: ParentSummons;
  onClose: () => void;
  onSuccess: (updated: ParentSummons) => void;
}) {
  const [studentName, setStudentName] = useState(summons.studentName);
  const [className, setClassName] = useState(summons.className);
  const [notes, setNotes] = useState(summons.notes || "");
  const [isExtraSunday, setIsExtraSunday] = useState(Boolean(summons.isUrgent));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !className.trim()) {
      setErr("اسم التلميذ والفوج مطلوبان");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      const res = await fetch("/api/summons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: summons.id,
          studentName: studentName.trim(),
          className: className.trim(),
          notes: notes.trim() || undefined,
          isUrgent: isExtraSunday,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التعديل");

      onSuccess(data.summons);
    } catch (e: any) {
      setErr(e.message || "حدث خطأ أثناء تعديل البيانات");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-xl border border-slate-100 fade-up"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-800">تعديل موعد استقبال ولي التلميذ 🤝</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {err && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{err}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">اسم التلميذ:</label>
              <input
                className="input text-xs font-bold"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
              />
            </div>
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 block mb-1">الفوج:</label>
              <input
                className="input text-xs text-center font-black text-sky-700 bg-sky-50/50 border-sky-200"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">ملاحظة الأستاذ لولي الأمر:</label>
            <textarea
              className="input text-xs min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب ملاحظة ودية لولي الأمر أو سبب اللقاء..."
            />
          </div>

          <label className="flex items-center gap-2 p-2 rounded-xl bg-sky-50/70 border border-sky-200 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-sky-600 rounded border-slate-300"
              checked={isExtraSunday}
              onChange={(e) => setIsExtraSunday(e.target.checked)}
            />
            <span className="text-xs font-bold text-sky-950">
              توقيت إضافي: الأحد صباحاً (08:00 إلى 09:00)
            </span>
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          <button disabled={busy} className="btn-primary flex-1 py-2.5 text-xs bg-sky-600 hover:bg-sky-700">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديل"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- 7. نافذة تأكيد إزالة اسم من قائمة الاستقبال ---------------- */
function DeleteSummonsModal({
  summons,
  onClose,
  onSuccess,
}: {
  summons: ParentSummons;
  onClose: () => void;
  onSuccess: (deletedId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submitDelete = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/summons?id=${encodeURIComponent(summons.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحذف");
      onSuccess(summons.id);
    } catch (e: any) {
      setErr(e.message || "حدث خطأ أثناء محاولة الحذف");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-slate-100 text-center fade-up">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
          <Users className="w-6 h-6" />
        </div>

        <div>
          <h3 className="font-extrabold text-sm text-slate-900">إزالة اسم التلميذ من قائمة الاستقبال</h3>
          <p className="text-xs font-bold text-slate-700 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            التلميذ: {summons.studentName} (فوج {summons.className})
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            هل تم اللقاء مع ولي الأمر أو التواصل وترغب في إزالة اسمه من قائمة الاستقبال؟
          </p>
        </div>

        {err && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
            {err}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            disabled={busy}
            onClick={submitDelete}
            className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "نعم، إزالة من القائمة"}
          </button>
          <button
            disabled={busy}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            إلغاء وتراجع
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 8. نافذة تعديل تلميذ في لوحة الشرف ---------------- */
function EditHonorModal({
  honor,
  onClose,
  onSuccess,
}: {
  honor: HonorStudent;
  onClose: () => void;
  onSuccess: (updated: HonorStudent) => void;
}) {
  const [studentName, setStudentName] = useState(honor.studentName);
  const [className, setClassName] = useState(honor.className);
  const [notes, setNotes] = useState(honor.notes || "");
  const [badge, setBadge] = useState(honor.badge || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !className.trim()) {
      setErr("اسم التلميذ والقسم مطلوبان");
      return;
    }

    setBusy(true);
    setErr("");

    try {
      const res = await fetch("/api/honors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: honor.id,
          studentName: studentName.trim(),
          className: className.trim(),
          notes: notes.trim() || undefined,
          badge: badge.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التعديل");

      onSuccess(data.honor);
    } catch (e: any) {
      setErr(e.message || "حدث خطأ أثناء محاولة التعديل");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-3xl p-5 max-w-md w-full space-y-4 shadow-xl border border-slate-100 text-right fade-up"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
              🏆
            </div>
            <h3 className="font-extrabold text-sm text-slate-800">تعديل بيانات التلميذ في لوحة الشرف</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {err && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold">{err}</div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">اسم التلميذ:</label>
              <input
                className="input text-xs"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
              />
            </div>

            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 block mb-1">القسم:</label>
              <select
                className="input text-xs font-black text-amber-900 bg-amber-50/40 border-amber-200"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
              >
                {HONOR_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">وسام / لقب تشجيعي:</label>
            <input
              className="input text-xs"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="مثال: ⭐ نجم الرياضيات"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              ملاحظة تشجيعية (اختيارية):
            </label>
            <textarea
              className="input text-xs min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب ملاحظة إن أردت..."
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button disabled={busy} className="btn-primary flex-1 py-2.5 text-xs bg-amber-500 hover:bg-amber-600">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديل"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- 9. نافذة تأكيد حذف تلميذ من لوحة الشرف ---------------- */
function DeleteHonorModal({
  honor,
  onClose,
  onSuccess,
}: {
  honor: HonorStudent;
  onClose: () => void;
  onSuccess: (deletedId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submitDelete = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/honors?id=${encodeURIComponent(honor.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحذف");
      onSuccess(honor.id);
    } catch (e: any) {
      setErr(e.message || "حدث خطأ أثناء محاولة الحذف");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-slate-100 text-center fade-up">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl">
          ⭐
        </div>

        <div>
          <h3 className="font-extrabold text-sm text-slate-900">إزالة تلميذ من لوحة الشرف</h3>
          <p className="text-xs font-bold text-slate-700 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            التلميذ: {honor.studentName} (قسم {honor.className})
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            هل أنت متأكد من حذف هذا التلميذ من لوحة الشرف؟
          </p>
        </div>

        {err && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
            {err}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            disabled={busy}
            onClick={submitDelete}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "نعم، حذف الآن"}
          </button>
          <button
            disabled={busy}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 10. نافذة تعديل بيانات عقوبة أو خصم ---------------- */
function EditPenaltyModal({
  penalty,
  onClose,
  onSuccess,
}: {
  penalty: Penalty;
  onClose: () => void;
  onSuccess: (updated: Penalty) => void;
}) {
  const [studentName, setStudentName] = useState(penalty.studentName);
  const [className, setClassName] = useState(penalty.className);
  const [deduction, setDeduction] = useState(penalty.deduction);
  const [reason, setReason] = useState(penalty.reason);
  const [date, setDate] = useState(penalty.date || "");
  const [notes, setNotes] = useState(penalty.notes || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/penalties", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: penalty.id,
          studentName,
          className,
          deduction,
          reason,
          date,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التعديل");
      onSuccess(data.penalty);
    } catch (e: any) {
      setErr(e.message || "حدث خطأ أثناء محاولة التعديل");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <form
        onSubmit={submitEdit}
        className="bg-white rounded-3xl p-5 max-w-md w-full space-y-4 shadow-xl border border-red-100 fade-up"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-red-50 text-red-700">
              <OctagonAlert className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">تعديل بيانات الخصم / العقوبة</h3>
              <p className="text-[11px] text-slate-400">تحديث خصم التلميذ وسببه</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {err && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold border border-red-200">
            {err}
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">اسم التلميذ:</label>
              <input
                className="input text-xs font-bold"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
              />
            </div>

            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 block mb-1">القسم:</label>
              <select
                className="input text-xs font-black text-red-900 bg-red-50/40 border-red-200"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
              >
                {HONOR_CLASSES.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block mb-1">مقدار الخصم / العقوبة:</label>
            <input
              className="input text-xs font-bold text-red-700 bg-red-50/40 border-red-200"
              value={deduction}
              onChange={(e) => setDeduction(e.target.value)}
              placeholder="مثال: ناقص 3 في التقويم المستمر (-3)"
              required
            />
            <div className="flex flex-wrap gap-1 pt-0.5">
              {[
                "ناقص 3 في التقويم المستمر (-3)",
                "ناقص 2 في التقويم المستمر (-2)",
                "ناقص 1 في التقويم المستمر (-1)",
                "ناقص 5 في التقويم المستمر (-5)",
                "خصم نقطة السلوك والمواظبة (-2)",
              ].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDeduction(d)}
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-800 border border-red-200"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block mb-1">سبب العقوبة:</label>
            <input
              className="input text-xs"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: هروب من الحصة يوم كذا..."
              required
            />
            <div className="flex flex-wrap gap-1 pt-0.5">
              {[
                "هروب من الحصة",
                "تشويش متكرر وإخلال بنظام القسم",
                "عدم إحضار كراس الدروس 192 صفحة",
                "عدم حل الواجب المنزلي في البيت",
                "دروس ناقصة في الكراس وإهمال الكتابة",
              ].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block mb-1">التاريخ والتوقيت:</label>
            <input
              className="input text-xs"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="مثال: الأربعاء 07 أكتوبر 2026 (حصة 10:00 - 11:00)"
            />
            <div className="flex flex-wrap gap-1 pt-0.5">
              {[
                "حصة 08:00 - 09:00",
                "حصة 09:00 - 10:00",
                "حصة 10:00 - 11:00",
                "حصة 11:00 - 12:00",
                "حصة 13:00 - 14:00",
                "حصة 14:00 - 15:00",
              ].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    const baseDate = date ? date.split("(")[0].trim() : "الأربعاء 07 أكتوبر 2026";
                    setDate(`${baseDate} (${t})`);
                  }}
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              ملاحظة للأستاذ أو ولي الأمر (اختيارية):
            </label>
            <textarea
              className="input text-xs min-h-[60px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب ملاحظة إن أردت..."
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button disabled={busy} className="btn-primary flex-1 py-2.5 text-xs bg-red-600 hover:bg-red-700">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديل"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- 11. نافذة تأكيد حذف عقوبة أو خصم ---------------- */
function DeletePenaltyModal({
  penalty,
  onClose,
  onSuccess,
}: {
  penalty: Penalty;
  onClose: () => void;
  onSuccess: (deletedId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submitDelete = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/penalties?id=${encodeURIComponent(penalty.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحذف");
      onSuccess(penalty.id);
    } catch (e: any) {
      setErr(e.message || "حدث خطأ أثناء محاولة الحذف");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-red-100 text-center fade-up">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto text-xl">
          🛑
        </div>

        <div>
          <h3 className="font-extrabold text-sm text-slate-900">إلغاء وحذف الخصم / العقوبة</h3>
          <p className="text-xs font-bold text-red-800 mt-2 bg-red-50 p-2.5 rounded-xl border border-red-100">
            التلميذ: {penalty.studentName} ({penalty.className})
            <br />
            <span className="text-[11px] font-black">{penalty.deduction}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            هل أنت متأكد من حذف هذه العقوبة وإلغائها نهائياً؟
          </p>
        </div>

        {err && (
          <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
            {err}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            disabled={busy}
            onClick={submitDelete}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "نعم، حذف العقوبة"}
          </button>
          <button
            disabled={busy}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCss = `
.input {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 0.65rem 0.85rem;
  font-size: 0.875rem;
  outline: none;
  width: 100%;
  transition: all 0.2s;
}
.input:focus {
  border-color: #059669;
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.12);
}
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: #059669;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.875rem;
  padding: 0.7rem;
  border-radius: 0.75rem;
  transition: all 0.15s;
}
.btn-primary:active {
  transform: scale(0.98);
}
.btn-primary:hover {
  background: #047857;
}
`;
