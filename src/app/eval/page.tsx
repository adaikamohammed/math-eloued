"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { LoginRequired } from "@/components/LoginRequired";
import {
  ClipboardCheck,
  Calculator,
  Users,
  Plus,
  Trash2,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  Printer,
  ChevronDown,
  ChevronUp,
  Pencil,
  RotateCcw,
  Check,
  Scale,
  LogOut,
  Loader2,
  Download,
  Upload,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowLeftRight,
} from "lucide-react";
import {
  // dynamic classes
  type InspectionSession,
  type InspectionRecord,
  type StudentRosterItem,
  type StudentEvaluation,
} from "@/lib/types";

import { PrintModal } from "@/components/print/PrintModal";
import { EvaluationRosterPrintDoc } from "@/components/print/EvaluationRosterPrintDoc";

export default function FastEvaluationPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
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
      <div className="flex justify-center items-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return authenticated ? (
    <EvaluationDashboard onLogout={() => setAuthenticated(false)} />
  ) : (
    <LoginRequired next="/eval" title="دفتر التقييم الميداني السريع" />
  );
}

/* ---------------- 2. لوحة التقييم الميداني المتكاملة ---------------- */
function EvaluationDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<"sessions" | "averages" | "roster">("sessions");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [teacherClasses, setTeacherClasses] = useState<string[]>([]);
  const [showEvalPrintModal, setShowEvalPrintModal] = useState(false);

  useEffect(() => {
    fetch("/api/lessons")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.customClasses && Array.isArray(data.customClasses) && data.customClasses.length > 0) {
          setTeacherClasses(data.customClasses);
          setSelectedClass((prev) => (prev ? prev : data.customClasses[0]));
        }
      })
      .catch(() => {});
  }, []);



  const [selectedGroup, setSelectedGroup] = useState<"فوج 1" | "فوج 2" | "القسم كامل">("فوج 1");
  const [searchStudent, setSearchStudent] = useState("");
  const [rosterGroupFilter, setRosterGroupFilter] = useState<"all" | "فوج 1" | "فوج 2">("all");

  const [sessions, setSessions] = useState<InspectionSession[]>([]);
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);

  const classesList = useMemo(() => {
    if (teacherClasses.length > 0) return teacherClasses;
    const fromRoster = Array.from(new Set(roster.map((r) => r.className))).filter(Boolean);
    return fromRoster;
  }, [teacherClasses, roster]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // حالة الاتصال والأوفلاين
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // حالات نافذة إنشاء جلسة جديدة
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [sessionTitleInput, setSessionTitleInput] = useState("");
  const [sessionDateInput, setSessionDateInput] = useState("");
  const [sessionRangeInput, setSessionRangeInput] = useState("من 1 إلى 8");
  const [sessionLessonsCount, setSessionLessonsCount] = useState<number>(8);
  const [sessionHomeworksCount, setSessionHomeworksCount] = useState<number>(8);

  // حالات نافذة استيراد أسماء التلاميذ
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [rosterBatchNames, setRosterBatchNames] = useState("");
  const [singleStudentName, setSingleStudentName] = useState("");

  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg((cur) => (cur?.text === text ? null : cur));
    }, 3500);
  };

  const CACHE_KEY = `math_eval_cache_${selectedClass.replace(/\s+/g, "")}`;
  const PENDING_KEY = `math_eval_pending_${selectedClass.replace(/\s+/g, "")}`;

  // 1. مراقبة حالة الاتصال بالإنترنت
  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      showToast("success", "🟢 تم استعادة الاتصال بالإنترنت! يمكنك مزامنة التحديثات.");
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast("error", "🔴 أنت الآن في وضع أوفلاين (بدون إنترنت). يتم الحفظ محلياً بأمان.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 2. تحميل البيانات محلياً من ذاكرة الهاتف فوراً عند فتح الصفحة أو تبديل القسم
  useEffect(() => {
    try {
      const localData = localStorage.getItem(CACHE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
          setSessions(parsed.sessions);
          setActiveSessionId(parsed.sessions[parsed.sessions.length - 1].id);
        }
        if (Array.isArray(parsed.roster) && parsed.roster.length > 0) {
          setRoster(parsed.roster);
        }
      }
      const pendingData = localStorage.getItem(PENDING_KEY);
      if (pendingData) {
        const pList = JSON.parse(pendingData);
        setPendingSyncCount(Array.isArray(pList) ? pList.length : 0);
      }
    } catch (e) {
      console.warn("Could not read local cache", e);
    }
  }, [CACHE_KEY]);

  // 3. حفظ نسخة احتياطية في ذاكرة الهاتف تلقائياً مع كل تعديل (مع التأكد الصارم من تطابق القسم)
  useEffect(() => {
    const curCls = selectedClass.replace(/\s+/g, "");
    const rosterMatches =
      roster.length === 0 ||
      roster.every((r) => (r.className || "").replace(/\s+/g, "") === curCls);
    const sessionsMatch =
      sessions.length === 0 ||
      sessions.every((s) => (s.className || "").replace(/\s+/g, "") === curCls);

    if (rosterMatches && sessionsMatch && (sessions.length > 0 || roster.length > 0)) {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ sessions, roster, updatedAt: new Date().toISOString() })
        );
      } catch (e) {
        console.warn("Could not write local cache", e);
      }
    }
  }, [sessions, roster, CACHE_KEY, selectedClass]);

  // جلب البيانات من الخادم (إن وُجد اتصال)
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/inspections?class=${encodeURIComponent(selectedClass)}&_t=${Date.now()}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        const loadedSessions: InspectionSession[] = data.sessions || [];
        const loadedRoster: StudentRosterItem[] = data.roster || [];

        setSessions(loadedSessions);
        setRoster(loadedRoster);

        if (loadedSessions.length > 0) {
          setActiveSessionId((prev) => {
            if (prev && loadedSessions.some((s) => s.id === prev)) return prev;
            return loadedSessions[loadedSessions.length - 1].id;
          });
        }
      }
    } catch {
      // وضع أوفلاين: الاعتماد على ذاكرة الهاتف
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 4. دالة المزامنة اليدوية مع السيرفر عند توفر الإنترنت
  const handleSyncWithServer = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "syncOfflineData",
          className: selectedClass,
          sessions,
          roster,
        }),
      });
      if (res.ok) {
        localStorage.removeItem(PENDING_KEY);
        setPendingSyncCount(0);
        showToast("success", "✓ تمت مزامنة كافة بيانات التقييم مع السيرفر بنجاح! ☁️");
      } else {
        throw new Error("فشلت المزامنة من السيرفر");
      }
    } catch {
      showToast("error", "تعذر الاتصال بالسيرفر حالياً. بياناتك محفوظة بأمان على جهازك.");
    } finally {
      setIsSyncing(false);
    }
  };

  // 5. تصدير ملف JSON آمن للتحميل على الهاتف أو الحاسوب
  const handleExportJson = () => {
    const exportObject = {
      platform: "MathLessonsEvaluation",
      className: selectedClass,
      exportedAt: new Date().toISOString(),
      dateArabic: new Date().toLocaleDateString("ar-DZ"),
      sessions,
      roster,
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `تقييم_${selectedClass.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast("success", "✓ تم حفظ وتنزيل ملف JSON الآمن على جهازك بنجاح! 📥");
  };

  // 6. استيراد ملف JSON آمن واسترجاع البيانات محلياً وفورياً
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.sessions && Array.isArray(parsed.sessions)) {
          setSessions(parsed.sessions);
          if (parsed.sessions.length > 0) setActiveSessionId(parsed.sessions[0].id);
        }
        if (parsed.roster && Array.isArray(parsed.roster)) {
          setRoster(parsed.roster);
        }

        showToast("success", "✓ تم استيراد وتحميل البيانات بنجاح من ملف JSON! 📤");

        // محاولة مزامنة السيرفر إن كان متصلاً
        if (navigator.onLine) {
          fetch("/api/inspections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "syncOfflineData",
              className: selectedClass,
              sessions: parsed.sessions || [],
              roster: parsed.roster || [],
            }),
          }).catch(() => {});
        }
      } catch {
        showToast("error", "ملف JSON غير صالح أو به خطأ في البنية");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // 7. تغيير فوج تلميذ بنقرة واحدة (بين فوج 1 وفوج 2)
  const handleToggleStudentGroup = async (student: StudentRosterItem) => {
    const nextGroup = student.groupName === "فوج 1" ? "فوج 2" : "فوج 1";
    setRoster((prev) =>
      prev.map((r) =>
        r.studentName === student.studentName && r.className === student.className
          ? { ...r, groupName: nextGroup }
          : r
      )
    );
    showToast("success", `✓ تم نقل التلميذ (${student.studentName}) إلى ${nextGroup}`);

    if (navigator.onLine) {
      try {
        await fetch("/api/inspections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "switchGroup",
            studentName: student.studentName,
            className: student.className,
            newGroup: nextGroup,
          }),
        });
      } catch {}
    }
  };

  // 8. تقسيم تلقائي 50/50 لتلاميذ القسم بين الفوج 1 والفوج 2
  const handleAutoSplitGroups = async () => {
    const allInClass = roster.filter(
      (r) => r.className.replace(/\s+/g, "") === selectedClass.replace(/\s+/g, "")
    );
    if (allInClass.length === 0) {
      showToast("error", "لا يوجد تلاميذ مسجلين في هذا القسم لتقسيمهم");
      return;
    }
    if (!window.confirm(`هل تريد تقسيم (${allInClass.length}) تلميذ في قسم ${selectedClass} تلقائياً بالتساوي بين الفوج 1 والفوج 2؟`))
      return;

    const half = Math.ceil(allInClass.length / 2);
    const assignments: { studentName: string; groupName: "فوج 1" | "فوج 2" }[] = [];

    const updatedRoster = roster.map((r) => {
      if (r.className.replace(/\s+/g, "") !== selectedClass.replace(/\s+/g, "")) return r;
      const idx = allInClass.findIndex((item) => item.studentName === r.studentName);
      const grp: "فوج 1" | "فوج 2" = idx < half ? "فوج 1" : "فوج 2";
      assignments.push({ studentName: r.studentName, groupName: grp });
      return { ...r, groupName: grp };
    });

    setRoster(updatedRoster);
    showToast("success", `✓ تم تقسيم القسم: (${half}) تلاميذ في فوج 1 و (${allInClass.length - half}) تلاميذ في فوج 2!`);

    if (navigator.onLine) {
      try {
        await fetch("/api/inspections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "batchAssignGroups",
            className: selectedClass,
            assignments,
          }),
        });
      } catch {}
    }
  };

  // الجلسة الحالية المعروضة
  const currentSession = useMemo(() => {
    if (!sessions || sessions.length === 0) return null;
    return sessions.find((s) => s.id === activeSessionId) || sessions[sessions.length - 1] || null;
  }, [sessions, activeSessionId]);

  // قائمة أسماء تلاميذ الفوج الحالي
  const currentStudentsList = useMemo(() => {
    const list = roster.filter((r) => {
      const matchClass =
        (r.className || "").replace(/\s+/g, "") === selectedClass.replace(/\s+/g, "");
      if (!matchClass) return false;
      if (selectedGroup === "القسم كامل") return true;
      const grp = r.groupName || "فوج 1";
      return grp === selectedGroup;
    });
    // ترتيب أبجدي
    return list.sort((a, b) => a.studentName.localeCompare(b.studentName, "ar"));
  }, [roster, selectedClass, selectedGroup]);

  // بدء جلسة مراقبة سريعة بنقرة واحدة (بدون تعقيدات)
  const handleQuickStartDefaultSession = async () => {
    try {
      const existingForClass = sessions.filter(
        (s) => (s.className || "").replace(/\s+/g, "") === selectedClass.replace(/\s+/g, "")
      );
      const nextNum = existingForClass.length + 1;
      const countL = 8;
      const countH = 8;
      const defaultRange = `من 1 إلى 8`;

      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: selectedClass,
          groupName: selectedGroup,
          title: `المراقبة ${nextNum} (${defaultRange})`,
          date: new Date().toLocaleDateString("ar-DZ", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          lessonRange: defaultRange,
          totalLessons: countL,
          totalHomeworks: countH,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("success", `✓ تم بدء المراقبة ${nextNum} بنجاح! جاهز للتفقد الميداني 📱`);
      await loadData();
      if (data.session) setActiveSessionId(data.session.id);
    } catch (err: any) {
      showToast("error", err.message || "فشل بدء الجلسة");
    }
  };

  // إنشاء جلسة مراقبة جديدة
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nowFormatted =
        sessionDateInput.trim() ||
        new Date().toLocaleDateString("ar-DZ", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          className: selectedClass,
          groupName: selectedGroup,
          title: sessionTitleInput.trim() || undefined,
          date: nowFormatted,
          lessonRange: sessionRangeInput.trim() || "من 1 إلى 8",
          totalLessons: Number(sessionLessonsCount) || 8,
          totalHomeworks: Number(sessionHomeworksCount) || 8,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("success", `✓ تم إنشاء جلسة المراقبة بنجاح! جاهز للتفقد 📱`);
      setIsNewSessionModalOpen(false);
      setSessionTitleInput("");
      setSessionDateInput("");
      await loadData();
      if (data.session) setActiveSessionId(data.session.id);
    } catch (err: any) {
      showToast("error", err.message || "فشل إنشاء الجلسة");
    }
  };

  // استيراد دفعة تلاميذ للفوج
  const handleImportRoster = async () => {
    if (!rosterBatchNames.trim()) return;
    const names = rosterBatchNames
      .split(/[\n,،]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;

    try {
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "roster",
          className: selectedClass,
          groupName: selectedGroup,
          students: names,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("success", `✓ تم استيراد (${data.addedCount}) تلاميذ بنجاح إلى ${selectedClass} (${selectedGroup})`);
      setIsRosterModalOpen(false);
      setRosterBatchNames("");
      loadData();
    } catch (err: any) {
      showToast("error", err.message || "فشل الاستيراد");
    }
  };

  // إضافة تلميذ فردي للفوج
  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleStudentName.trim()) return;
    try {
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "roster",
          className: selectedClass,
          groupName: selectedGroup,
          students: [singleStudentName.trim()],
        }),
      });
      if (res.ok) {
        showToast("success", `✓ تمت إضافة التلميذ "${singleStudentName}"`);
        setSingleStudentName("");
        loadData();
      }
    } catch {
      showToast("error", "فشل إضافة التلميذ");
    }
  };

  // حذف جلسة مراقبة
  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف جلسة المراقبة هذه؟")) return;
    try {
      const res = await fetch(`/api/inspections?sessionId=${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("success", "✓ تم حذف جلسة المراقبة");
        loadData();
      }
    } catch {
      showToast("error", "فشل الحذف");
    }
  };

  // حذف تلميذ من الفوج
  const handleDeleteStudent = async (studentName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف التلميذ "${studentName}" من هذا القسم؟`)) return;
    try {
      const res = await fetch(
        `/api/inspections?studentName=${encodeURIComponent(studentName)}&class=${encodeURIComponent(
          selectedClass
        )}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        showToast("success", `✓ تم حذف التلميذ "${studentName}"`);
        loadData();
      }
    } catch {
      showToast("error", "فشل الحذف");
    }
  };

  // تحديث سجل تلميذ في الجلسة الحالية (تحديث تفاؤلي فوري في المتصفح ثم إرسال للخادم)
  const handleUpdateRecord = async (
    studentName: string,
    updates: Partial<InspectionRecord>
  ) => {
    let targetSession = currentSession;
    if (!targetSession) {
      await handleQuickStartDefaultSession();
      return;
    }

    const existing = targetSession.records?.[studentName] || {
      studentName,
      lessonsDone: targetSession.totalLessons,
      homeworksDone: targetSession.totalHomeworks,
      behaviorScore: 5,
      activityScore: 5,
      score: 20,
    };

    const updatedRec: InspectionRecord = {
      ...existing,
      ...updates,
    };

    // إعادة حساب العلامة بدقة
    const tL = targetSession.totalLessons > 0 ? targetSession.totalLessons : 1;
    const tH = targetSession.totalHomeworks > 0 ? targetSession.totalHomeworks : 1;
    const nbPts = (updatedRec.lessonsDone / tL) * 5;
    const hwPts = (updatedRec.homeworksDone / tH) * 5;
    const total = nbPts + hwPts + updatedRec.behaviorScore + updatedRec.activityScore;
    updatedRec.score = Math.min(20, Math.max(0, Math.round(total * 10) / 10));

    // تحديث الواجهة فورياً بدون أي تأخير
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== targetSession.id) return s;
        return {
          ...s,
          records: {
            ...s.records,
            [studentName]: updatedRec,
          },
        };
      })
    );

    // إرسال للخادم أو حفظ محلي في حالة عدم توفر الإنترنت
    if (!navigator.onLine) {
      setPendingSyncCount((c) => c + 1);
      showToast("success", `✓ تم الحفظ محلياً (${studentName}) 📶 وضع أوفلاين`);
      return;
    }

    try {
      const res = await fetch("/api/inspections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: targetSession.id,
          studentName,
          ...updates,
        }),
      });
      if (!res.ok) throw new Error("تعذر الحفظ في السيرفر");
    } catch {
      setPendingSyncCount((c) => c + 1);
      showToast("success", `✓ تم الحفظ في الهاتف (سيتم الرفع عند عودة الاتصال) 📱`);
    }
  };

  // زر لمسة واحدة: تعيين كل شيء كامل (20/20)
  const handleSetFullScore = async (studentName: string) => {
    let targetSession = currentSession;
    if (!targetSession) {
      await handleQuickStartDefaultSession();
      return;
    }
    handleUpdateRecord(studentName, {
      lessonsDone: targetSession.totalLessons,
      homeworksDone: targetSession.totalHomeworks,
      behaviorScore: 5,
      activityScore: 5,
    });
  };

  return (
    <div className="pb-16 pt-3 px-3 max-w-xl mx-auto space-y-3.5 fade-up">
      {/* إشعار عائم */}
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

      {/* الشريط العلوي المدمج للهاتف */}
      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
              📱
            </div>
            <div>
              <h1 className="text-xs font-black text-slate-900">دفتر التقييم الميداني السريع</h1>
              <p className="text-[10px] text-emerald-700 font-bold">مادة الرياضيات — فضاء الأستاذ</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/admin"
              className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-bold transition"
            >
              لوحة التحكم
            </Link>
            <button
              onClick={async () => {
                await fetch("/api/auth", { method: "DELETE" });
                onLogout();
              }}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 transition"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* التبويب العلوي الرئيسي: الجلسات أو جدول المعدلات أو قائمة الفوج */}
        <div className="grid grid-cols-3 gap-1 bg-slate-100/80 p-1 rounded-xl text-center">
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`py-1.5 px-1 rounded-lg text-xs font-black transition flex items-center justify-center gap-1 ${
              activeTab === "sessions"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>جلسات التفقد</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("averages")}
            className={`py-1.5 px-1 rounded-lg text-xs font-black transition flex items-center justify-center gap-1 ${
              activeTab === "averages"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>المعدل العام</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roster")}
            className={`py-1.5 px-1 rounded-lg text-xs font-black transition flex items-center justify-center gap-1 ${
              activeTab === "roster"
                ? "bg-sky-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-white/60"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>قائمة الفوج ({currentStudentsList.length})</span>
          </button>
        </div>

        {/* شريط حالة الأوفلاين والمزامنة والنسخ الاحتياطي JSON */}
        <div className="flex items-center justify-between text-[11px] font-bold pt-2 border-t border-slate-100 flex-wrap gap-1.5">
          {/* مؤشر الاتصال */}
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span>متصل بالإنترنت</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300 text-[10px]">
                <WifiOff className="w-3 h-3 text-amber-600" />
                <span>أوفلاين (حفظ محلي)</span>
              </span>
            )}

            {pendingSyncCount > 0 && (
              <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded font-black border border-red-200">
                {pendingSyncCount} معلق
              </span>
            )}
          </div>

          {/* أزرار المزامنة وتصدير/استيراد JSON */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSyncWithServer}
              disabled={isSyncing}
              className="py-1 px-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition flex items-center gap-1 text-[11px]"
              title="مزامنة التعديلات مع السيرفر"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
              <span>مزامنة</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="py-1 px-2 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition flex items-center gap-1 text-[11px]"
              title="تصدير نسخة احتياطية من التقييمات كملف JSON آمن"
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span>حفظ JSON 📥</span>
            </button>

            <label
              className="py-1 px-2 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition flex items-center gap-1 text-[11px] cursor-pointer"
              title="استيراد ملف JSON آمن محلياً"
            >
              <Upload className="w-3 h-3 text-slate-500" />
              <span>استيراد 📤</span>
              <input type="file" accept=".json,application/json" hidden onChange={handleImportJson} />
            </label>
          </div>
        </div>
      </div>

      {/* محدد القسم والفوج السريع - متجاوب تماماً مع شاشات الهواتف */}
      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs space-y-2.5">
        <div>
          <div className="text-[11px] font-black text-slate-700 mb-1">القسم المعني:</div>
          <div className="grid grid-cols-4 gap-1.5">
            {classesList.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`py-2 rounded-xl text-xs font-black transition ${
                  selectedClass === cls
                    ? "bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-300"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-black text-slate-700 mb-1">الفوج (حصة التفويج):</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(["فوج 1", "فوج 2", "القسم كامل"] as const).map((grp) => (
              <button
                key={grp}
                type="button"
                onClick={() => setSelectedGroup(grp)}
                className={`py-2 px-1 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 ${
                  selectedGroup === grp
                    ? "bg-slate-900 text-white shadow-2xs ring-2 ring-slate-400"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>{grp === "فوج 1" ? "🟢 فوج 1" : grp === "فوج 2" ? "🔵 فوج 2" : "👥 القسم كامل"}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. تبويب جلسات التفقد الميداني (حصة المراقبة) */}
      {/* ======================================================== */}
      {activeTab === "sessions" && (
        <div className="space-y-3">
          {/* شريط اختيار الجلسة أو إنشاء جلسة جديدة */}
          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>جلسة المراقبة المعنية:</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setSessionDateInput(
                    new Date().toLocaleDateString("ar-DZ", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  );
                  setIsNewSessionModalOpen(true);
                }}
                className="py-1 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center gap-1 shadow-2xs transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>بدء مراقبة جديدة</span>
              </button>
            </div>

            {/* أزرار التبديل بين الجلسات المسجلة */}
            {sessions.length === 0 ? (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white shadow-sm flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black">بدء المراقبة الأولى (الدروس 1 إلى 8) 🎯</div>
                  <div className="text-[11px] text-emerald-100 mt-0.5">
                    تفقد وتقييم فوري لكراريس وواجبات تلاميذ {selectedClass}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickStartDefaultSession}
                  className="px-3.5 py-2 rounded-xl bg-white text-emerald-800 font-black text-xs hover:bg-emerald-50 active:scale-95 transition shadow-sm shrink-0 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>بدء التفقد الآن 🚀</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {sessions.map((sess) => (
                  <button
                    key={sess.id}
                    type="button"
                    onClick={() => setActiveSessionId(sess.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition flex flex-col items-start gap-0.5 border ${
                      activeSessionId === sess.id
                        ? "bg-emerald-700 text-white border-emerald-800 shadow-2xs ring-2 ring-emerald-300"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span>{sess.title || `المراقبة ${sess.sessionNumber}`}</span>
                    <span
                      className={`text-[10px] ${
                        activeSessionId === sess.id ? "text-emerald-100" : "text-slate-400"
                      }`}
                    >
                      {sess.lessonRange}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* تفاصيل الجلسة الحالية وتفقد التلاميذ */}
          {currentSession && (
            <div className="space-y-3">
              {/* شريط معلومات الجلسة النشطة */}
              <div className="bg-emerald-850 text-white p-3.5 rounded-2xl shadow-sm space-y-1.5 border border-emerald-700">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black">
                      #{currentSession.sessionNumber}
                    </span>
                    <span className="font-black text-sm">{currentSession.title}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteSession(currentSession.id)}
                    className="text-white/60 hover:text-red-300 p-1 rounded-lg text-xs transition"
                    title="حذف هذه الجلسة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-emerald-100 flex-wrap gap-2 pt-1 border-t border-white/10">
                  <span>📅 {currentSession.date}</span>
                  <span className="font-bold bg-white/15 px-2 py-0.5 rounded-md">
                    المقرر للتفقد: {currentSession.totalLessons} دروس و {currentSession.totalHomeworks} واجبات
                  </span>
                </div>
              </div>

              {/* أزرار التبديل السريع بين أفواج التفقد أثناء الحصة الميدانية */}
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl text-xs font-black">
                <button
                  type="button"
                  onClick={() => setSelectedGroup("فوج 1")}
                  className={`flex-1 py-1.5 px-1 rounded-lg transition text-center flex items-center justify-center gap-1 ${
                    selectedGroup === "فوج 1"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-white/60"
                  }`}
                >
                  <span>🟢 فوج 1</span>
                  <span className="text-[10px] opacity-80">
                    ({roster.filter((r) => (r.className || "").replace(/\s+/g, "") === selectedClass.replace(/\s+/g, "") && (r.groupName || "فوج 1") === "فوج 1").length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGroup("فوج 2")}
                  className={`flex-1 py-1.5 px-1 rounded-lg transition text-center flex items-center justify-center gap-1 ${
                    selectedGroup === "فوج 2"
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-white/60"
                  }`}
                >
                  <span>🔵 فوج 2</span>
                  <span className="text-[10px] opacity-80">
                    ({roster.filter((r) => (r.className || "").replace(/\s+/g, "") === selectedClass.replace(/\s+/g, "") && r.groupName === "فوج 2").length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGroup("القسم كامل")}
                  className={`flex-1 py-1.5 px-1 rounded-lg transition text-center flex items-center justify-center gap-1 ${
                    selectedGroup === "القسم كامل"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-white/60"
                  }`}
                >
                  <span>👥 القسم كامل</span>
                  <span className="text-[10px] opacity-80">
                    ({roster.filter((r) => (r.className || "").replace(/\s+/g, "") === selectedClass.replace(/\s+/g, "")).length})
                  </span>
                </button>
              </div>

              {/* حقل البحث عن تلميذ في الجلسة */}
              <div className="relative">
                <input
                  type="text"
                  className="w-full bg-white py-2 pr-3 pl-8 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="ابحث عن اسم تلميذ في هذا الفوج..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              {/* قائمة بطاقات التلاميذ للتفقد السريع في الحصة */}
              {(() => {
                const studentsToDisplay = currentStudentsList.filter((st) =>
                  !searchStudent.trim() ||
                  st.studentName.toLowerCase().includes(searchStudent.trim().toLowerCase())
                );

                if (studentsToDisplay.length === 0) {
                  return (
                    <div className="p-6 bg-white rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400 space-y-2">
                      <div>لا يوجد تلاميذ في قائمة هذا الفوج ({selectedClass} - {selectedGroup}).</div>
                      <button
                        type="button"
                        onClick={() => setIsRosterModalOpen(true)}
                        className="py-1.5 px-3 rounded-xl bg-sky-600 text-white font-bold text-xs inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>استيراد أسماء تلاميذ الفوج الآن</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    {studentsToDisplay.map((student) => {
                      const rec: InspectionRecord = currentSession.records?.[student.studentName] || {
                        studentName: student.studentName,
                        lessonsDone: currentSession.totalLessons,
                        homeworksDone: currentSession.totalHomeworks,
                        behaviorScore: 5,
                        activityScore: 5,
                        score: 20,
                      };

                      const isFull =
                        rec.lessonsDone === currentSession.totalLessons &&
                        rec.homeworksDone === currentSession.totalHomeworks &&
                        rec.behaviorScore === 5 &&
                        rec.activityScore === 5;

                      const isWeak = rec.score < 10;
                      const isMed = rec.score >= 10 && rec.score < 15;
                      const isGood = rec.score >= 15 && rec.score < 18;
                      const isExc = rec.score >= 18;

                      return (
                        <div
                          key={student.studentName}
                          className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2.5 hover:border-emerald-300 transition"
                        >
                          {/* سطر الاسم والعلامة الإجمالية وزر تبديل الفوج السريع */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-black text-sm text-slate-900 truncate">
                                {student.studentName}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleStudentGroup(student)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 transition border active:scale-95 ${
                                  (student.groupName || "فوج 1") === "فوج 1"
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                    : "bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100"
                                }`}
                                title="انقر لنقل التلميذ مباشرة بين فوج 1 وفوج 2"
                              >
                                {(student.groupName || "فوج 1") === "فوج 1" ? "🟢 فوج 1" : "🔵 فوج 2"}
                              </button>
                            </div>

                            {/* شارة العلامة */}
                            <div
                              className={`px-3 py-1 rounded-xl font-black text-xs shadow-2xs flex items-center gap-1 ${
                                isExc
                                  ? "bg-emerald-600 text-white"
                                  : isGood
                                  ? "bg-teal-600 text-white"
                                  : isMed
                                  ? "bg-amber-500 text-white"
                                  : "bg-rose-600 text-white"
                              }`}
                            >
                              <span>{rec.score} / 20</span>
                              <span className="text-[10px] opacity-80">
                                {isExc ? "🟢" : isGood ? "🔵" : isMed ? "🟡" : "🔴"}
                              </span>
                            </div>
                          </div>

                          {/* زر لمسة واحدة: مكتمل بالكامل 20/20 */}
                          <button
                            type="button"
                            onClick={() => handleSetFullScore(student.studentName)}
                            className={`w-full py-1.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                              isFull
                                ? "bg-emerald-50 text-emerald-800 border-2 border-emerald-400 shadow-2xs"
                                : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-800"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>
                              {isFull ? "✓ كل شيء كامل ومتقن (20 / 20)" : "تعيين مكتمل بالكامل (20 / 20)"}
                            </span>
                          </button>

                          {/* معايير التفقد الأربعة التفصيلية - أزرار لمس مريحة للهاتف */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-0.5">
                            {/* 1. كراس الدروس */}
                            <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex justify-between items-center text-xs font-black text-slate-700">
                                <span>📘 كراس الدروس:</span>
                                <span className="text-emerald-700 font-extrabold bg-emerald-100/70 px-2 py-0.5 rounded-md text-[11px]">
                                  {rec.lessonsDone} / {currentSession.totalLessons}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRecord(student.studentName, {
                                      lessonsDone: Math.max(0, rec.lessonsDone - 1),
                                    })
                                  }
                                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 font-black text-lg text-slate-700 active:scale-90 transition flex items-center justify-center shrink-0 shadow-2xs"
                                  title="إنقاص درس"
                                >
                                  -
                                </button>
                                <div className="flex-1 text-center font-black text-xs text-slate-800 bg-white py-2 rounded-xl border border-slate-100 shadow-inner">
                                  {rec.lessonsDone === currentSession.totalLessons ? "كامل ✓" : `${rec.lessonsDone} درس`}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRecord(student.studentName, {
                                      lessonsDone: Math.min(currentSession.totalLessons, rec.lessonsDone + 1),
                                    })
                                  }
                                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 font-black text-lg text-slate-700 active:scale-90 transition flex items-center justify-center shrink-0 shadow-2xs"
                                  title="زيادة درس"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRecord(student.studentName, {
                                      lessonsDone: currentSession.totalLessons,
                                    })
                                  }
                                  className="px-2 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-[11px] active:scale-95 transition shrink-0"
                                >
                                  كامل
                                </button>
                              </div>
                            </div>

                            {/* 2. حل الواجبات */}
                            <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex justify-between items-center text-xs font-black text-slate-700">
                                <span>📝 حل الواجبات:</span>
                                <span className="text-sky-700 font-extrabold bg-sky-100/70 px-2 py-0.5 rounded-md text-[11px]">
                                  {rec.homeworksDone} / {currentSession.totalHomeworks}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRecord(student.studentName, {
                                      homeworksDone: Math.max(0, rec.homeworksDone - 1),
                                    })
                                  }
                                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 font-black text-lg text-slate-700 active:scale-90 transition flex items-center justify-center shrink-0 shadow-2xs"
                                  title="إنقاص واجب"
                                >
                                  -
                                </button>
                                <div className="flex-1 text-center font-black text-xs text-slate-800 bg-white py-2 rounded-xl border border-slate-100 shadow-inner">
                                  {rec.homeworksDone === currentSession.totalHomeworks ? "كامل ✓" : `${rec.homeworksDone} واجب`}
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRecord(student.studentName, {
                                      homeworksDone: Math.min(currentSession.totalHomeworks, rec.homeworksDone + 1),
                                    })
                                  }
                                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 font-black text-lg text-slate-700 active:scale-90 transition flex items-center justify-center shrink-0 shadow-2xs"
                                  title="زيادة واجب"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRecord(student.studentName, {
                                      homeworksDone: currentSession.totalHomeworks,
                                    })
                                  }
                                  className="px-2 h-9 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 font-black text-[11px] active:scale-95 transition shrink-0"
                                >
                                  كامل
                                </button>
                              </div>
                            </div>

                            {/* 3. علامة السلوك والأدوات */}
                            <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex justify-between items-center text-xs font-black text-slate-700">
                                <span>⚖️ السلوك والأدوات:</span>
                                <span className="text-amber-700 font-extrabold bg-amber-100/70 px-2 py-0.5 rounded-md text-[11px]">
                                  {rec.behaviorScore} / 5
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRecord(student.studentName, {
                                      behaviorScore: Math.max(0, rec.behaviorScore - 1),
                                    })
                                  }
                                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 font-black text-lg text-slate-700 active:scale-90 transition flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  -
                                </button>
                                <div className="flex-1 text-center font-black text-xs text-slate-800 bg-white py-2 rounded-xl border border-slate-100 shadow-inner">
                                  {rec.behaviorScore} من 5
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRecord(student.studentName, {
                                      behaviorScore: Math.min(5, rec.behaviorScore + 1),
                                    })
                                  }
                                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-700 font-black text-lg text-slate-700 active:scale-90 transition flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRecord(student.studentName, { behaviorScore: 5 })
                                  }
                                  className="px-2 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-black text-[11px] active:scale-95 transition shrink-0"
                                >
                                  5ن
                                </button>
                              </div>
                            </div>

                            {/* 4. علامة حل النشاط والمشاركة */}
                            <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex justify-between items-center text-xs font-black text-slate-700">
                                <span>💡 حل النشاط:</span>
                                <span className="text-purple-700 font-extrabold bg-purple-100/70 px-2 py-0.5 rounded-md text-[11px]">
                                  {rec.activityScore} / 5
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRecord(student.studentName, {
                                      activityScore: Math.max(0, rec.activityScore - 1),
                                    })
                                  }
                                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 font-black text-lg text-slate-700 active:scale-90 transition flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  -
                                </button>
                                <div className="flex-1 text-center font-black text-xs text-slate-800 bg-white py-2 rounded-xl border border-slate-100 shadow-inner">
                                  {rec.activityScore} من 5
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRecord(student.studentName, {
                                      activityScore: Math.min(5, rec.activityScore + 1),
                                    })
                                  }
                                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-purple-50 hover:text-purple-700 font-black text-lg text-slate-700 active:scale-90 transition flex items-center justify-center shrink-0 shadow-2xs"
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateRecord(student.studentName, { activityScore: 5 })
                                  }
                                  className="px-2 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 font-black text-[11px] active:scale-95 transition shrink-0"
                                >
                                  5ن
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* ملخص احتساب العلامة الصفي */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                            <span>
                              كراس: {((rec.lessonsDone / currentSession.totalLessons) * 5).toFixed(1)}ن • واجب:{" "}
                              {((rec.homeworksDone / currentSession.totalHomeworks) * 5).toFixed(1)}ن • سلوك:{" "}
                              {rec.behaviorScore}ن • نشاط: {rec.activityScore}ن
                            </span>
                            <span className="font-bold text-slate-700">{rec.score} / 20</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. تبويب جدول المعدل العام (المتوسط الحسابي للمراقبات) */}
      {/* ======================================================== */}
      {activeTab === "averages" && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                جدول معدلات التقويم المستمر — {selectedClass} ({selectedGroup})
              </h2>
              <p className="text-[11px] text-slate-400">
                المتوسط الحسابي التلقائي لجميع جلسات المراقبة الدورية المنجزة حتى الآن
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowEvalPrintModal(true)}
              className="py-1 px-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-1 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 space-y-1">
              <div>لم تسجل أي جلسات مراقبة لهذا الفوج بعد.</div>
              <div className="text-emerald-700 font-bold">ابدأ أول جلسة مراقبة ليتم احتساب المعدل تلقائياً!</div>
            </div>
          ) : currentStudentsList.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              لا توجد أسماء مسجلة في هذا الفوج.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[11px]">
                    <th className="py-2 px-2 font-black">#</th>
                    <th className="py-2 px-2 font-black">اسم ولقب التلميذ</th>
                    {sessions.map((s) => (
                      <th key={s.id} className="py-2 px-2 font-black text-center whitespace-nowrap">
                        {s.title || `مراقبة ${s.sessionNumber}`}
                        <span className="block text-[9px] text-slate-400 font-normal">
                          {s.lessonRange}
                        </span>
                      </th>
                    ))}
                    <th className="py-2 px-2 font-black text-center bg-emerald-50 text-emerald-900">
                      معدل التقويم المستمر
                    </th>
                    <th className="py-2 px-2 font-black text-center">التقدير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentStudentsList.map((st, idx) => {
                    const studentScores: number[] = [];
                    for (const s of sessions) {
                      const rec = s.records?.[st.studentName];
                      if (rec && typeof rec.score === "number") {
                        studentScores.push(rec.score);
                      }
                    }

                    const avg =
                      studentScores.length > 0
                        ? (studentScores.reduce((a, b) => a + b, 0) / studentScores.length).toFixed(2)
                        : "-";

                    const numAvg = parseFloat(avg);
                    const isExc = numAvg >= 18;
                    const isGood = numAvg >= 14 && numAvg < 18;
                    const isMed = numAvg >= 10 && numAvg < 14;
                    const isWeak = numAvg < 10;

                    return (
                      <tr key={st.studentName} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-2 text-slate-400 font-bold text-[11px]">{idx + 1}</td>
                        <td className="py-2.5 px-2 font-black text-slate-900">{st.studentName}</td>
                        {sessions.map((s) => {
                          const sc = s.records?.[st.studentName]?.score;
                          return (
                            <td key={s.id} className="py-2.5 px-2 text-center font-bold text-slate-700">
                              {sc !== undefined ? `${sc}` : "-"}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-2 text-center font-black bg-emerald-50/60 text-emerald-900 text-sm">
                          {avg !== "-" ? `${avg} / 20` : "-"}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {avg !== "-" ? (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                isExc
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isGood
                                  ? "bg-teal-100 text-teal-800"
                                  : isMed
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {isExc ? "ممتاز 🟢" : isGood ? "جيد 🔵" : isMed ? "متوسط 🟡" : "ضعيف 🔴"}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. تبويب إدارة قائمة وتفويج تلاميذ القسم */}
      {/* ======================================================== */}
      {activeTab === "roster" && (() => {
        const allClassStudents = roster.filter(
          (r) => (r.className || "").replace(/\s+/g, "") === selectedClass.replace(/\s+/g, "")
        );
        const group1Count = allClassStudents.filter((r) => r.groupName === "فوج 1").length;
        const group2Count = allClassStudents.filter((r) => r.groupName === "فوج 2").length;

        const displayedStudents = allClassStudents
          .filter((r) => (rosterGroupFilter === "all" ? true : r.groupName === rosterGroupFilter))
          .sort((a, b) => a.studentName.localeCompare(b.studentName, "ar"));

        return (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
              <div>
                <h2 className="text-xs font-black text-slate-900">
                  قائمة وتفويج تلاميذ {selectedClass}
                </h2>
                <p className="text-[10px] text-slate-400">
                  إجمالي القسم: {allClassStudents.length} تلميذ • (فوج 1: {group1Count} • فوج 2: {group2Count})
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleAutoSplitGroups}
                  className="py-1 px-2.5 rounded-xl bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 font-bold text-xs flex items-center gap-1 transition"
                  title="تقسيم التلاميذ تلقائياً بالتساوي بين الفوجين"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-purple-600" />
                  <span>تقسيم آلي (50/50)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRosterModalOpen(true)}
                  className="py-1 px-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>استيراد أسماء</span>
                </button>
              </div>
            </div>

            {/* تنبيه ذكي عند وجود جميع التلاميذ في فوج واحد */}
            {allClassStudents.length > 0 && group2Count === 0 && (
              <div className="bg-amber-50/80 border border-amber-200/90 p-3 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="font-black flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>تلميح لتنظيم حصص التفويج:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
                  جميع تلاميذ هذا القسم ({allClassStudents.length} تلميذ) مسجلون حالياً ضمن <strong>فوج 1</strong>.
                  يمكنك الضغط على زر <strong>[⚡ تقسيم آلي (50/50)]</strong> أعلاه لتوزيع نصفهم إلى فوج 2 بنقرة واحدة،
                  أو النقر على زر الفوج بجانب أي تلميذ بالأسفل لنقله مباشرة.
                </p>
              </div>
            )}

            {/* فلتر عرض الأفواج */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100/80 p-1 rounded-xl text-center text-xs font-black">
              <button
                type="button"
                onClick={() => setRosterGroupFilter("all")}
                className={`py-1 rounded-lg transition ${
                  rosterGroupFilter === "all"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                الكل ({allClassStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setRosterGroupFilter("فوج 1")}
                className={`py-1 rounded-lg transition ${
                  rosterGroupFilter === "فوج 1"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                فوج 1 ({group1Count}) 🟢
              </button>
              <button
                type="button"
                onClick={() => setRosterGroupFilter("فوج 2")}
                className={`py-1 rounded-lg transition ${
                  rosterGroupFilter === "فوج 2"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                فوج 2 ({group2Count}) 🔵
              </button>
            </div>

            {/* إضافة تلميذ فردي */}
            <form onSubmit={handleAddSingleStudent} className="flex gap-1.5">
              <input
                className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="اسم ولقب تلميذ جديد..."
                value={singleStudentName}
                onChange={(e) => setSingleStudentName(e.target.value)}
              />
              <button
                type="submit"
                className="py-1.5 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                إضافة
              </button>
            </form>

            {/* عرض أسماء التلاميذ مع زر التبديل بين الفوجين بنقرة واحدة */}
            {displayedStudents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                لا توجد أسماء مسجلة في هذا الفوج. اضغط "استيراد أسماء" لإضافتهم دفعة واحدة.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {displayedStudents.map((st, idx) => (
                  <div key={st.studentName} className="py-2 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 truncate">{st.studentName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* زر تبديل الفوج بنقرة واحدة */}
                      <button
                        type="button"
                        onClick={() => handleToggleStudentGroup(st)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition flex items-center gap-1 active:scale-95 border ${
                          st.groupName === "فوج 1"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                            : "bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100"
                        }`}
                        title="انقر لنقل التلميذ مباشرة إلى الفوج الآخر"
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>{st.groupName === "فوج 1" ? "فوج 1 🟢" : "فوج 2 🔵"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(st.studentName)}
                        className="p-1 text-slate-300 hover:text-red-600 transition"
                        title="حذف هذا التلميذ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* نافذة منبثقة: بدء جلسة مراقبة جديدة */}
      {/* ======================================================== */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSession}
            className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-xl border border-slate-100 fade-up"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">بدء جلسة مراقبة جديدة</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs font-bold text-emerald-950 flex items-center justify-between">
              <span>القسم: {selectedClass}</span>
              <span>الفوج: {selectedGroup}</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                تاريخ ويوم الحصة:
              </label>
              <input
                className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="مثال: الأربعاء 09 أكتوبر 2026"
                value={sessionDateInput}
                onChange={(e) => setSessionDateInput(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                مجال الدروس المعنية بالمراقبة:
              </label>
              <input
                className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="مثال: من 1 إلى 8 (أو من 9 إلى 15)"
                value={sessionRangeInput}
                onChange={(e) => setSessionRangeInput(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  عدد الدروس المقررة:
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={sessionLessonsCount}
                  onChange={(e) => setSessionLessonsCount(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  عدد الواجبات المقررة:
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={sessionHomeworksCount}
                  onChange={(e) => setSessionHomeworksCount(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
              >
                حفظ وبدء التفقد الميداني
              </button>
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* نافذة منبثقة: استيراد دفعة تلاميذ */}
      {/* ======================================================== */}
      {isRosterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-xl border border-slate-100 fade-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  استيراد تلاميذ {selectedClass} ({selectedGroup})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRosterModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                الصق الأسماء هنا (كل اسم في سطر):
              </label>
              <textarea
                className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-mono min-h-[140px] focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder={"أحمد بوخالفة\nسارة لعريبي\nيونس بلحاج\nمحمد زياني..."}
                value={rosterBatchNames}
                onChange={(e) => setRosterBatchNames(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                انسخ العمود مباشرة من ملف إكسل أو وورد والصقه هنا.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleImportRoster}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition"
              >
                استيراد القائمة مباشرة
              </button>
              <button
                type="button"
                onClick={() => setIsRosterModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── نافذة المعاينة والطباعة الرسمية لكشف التقويم المستمر A4 ── */}
      <PrintModal
        isOpen={showEvalPrintModal}
        onClose={() => setShowEvalPrintModal(false)}
        documentTitle={`كشف تفريغ علامات التقويم المستمر — ${selectedClass}`}
      >
        <EvaluationRosterPrintDoc
          className={selectedClass}
          groupName={selectedGroup}
          evaluations={currentStudentsList.map((st, idx) => {
            const studentScores = [];
            for (const s of sessions) {
              const rec = s.records?.[st.studentName];
              if (rec && typeof rec.score === 'number') studentScores.push(rec.score);
            }
            const avg =
              studentScores.length > 0
                ? Number((studentScores.reduce((a, b) => a + b, 0) / studentScores.length).toFixed(1))
                : 15;

            const lastS = sessions.length > 0 ? sessions[sessions.length - 1] : null;
            const r = lastS?.records?.[st.studentName];

            return {
              id: `eval_print_${idx}`,
              studentName: st.studentName,
              className: selectedClass,
              groupName: selectedGroup,
              notebookScore: r ? Math.min(5, Math.round((r.lessonsDone / (lastS?.totalLessons || 8)) * 5)) : 4,
              homeworkScore: r ? Math.min(5, Math.round((r.homeworksDone / (lastS?.totalHomeworks || 8)) * 5)) : 4,
              toolsScore: r?.behaviorScore ?? 4,
              activityScore: r?.activityScore ?? 4,
              totalScore: avg,
              rating: avg >= 16 ? 'excellent' : avg >= 14 ? 'very_good' : avg >= 12 ? 'good' : avg >= 10 ? 'medium' : 'weak',
              ratingColor: avg >= 14 ? 'emerald' : avg >= 10 ? 'amber' : 'rose',
              updatedAt: new Date().toISOString(),
            };
          })}
        />
      </PrintModal>
    </div>
  );
}