"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { LoginRequired } from "@/components/LoginRequired";
import {
  Scale,
  ClipboardCheck,
  Calculator,
  Users,
  Plus,
  Trash2,
  Printer,
  Search,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  Check,
  Download,
  Upload,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  LogIn,
  Loader2,
  FileText,
  Award,
  ChevronRight,
  Sliders,
  TrendingUp,
  BarChart3,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import {
  type InspectionSession,
  type InspectionRecord,
  type StudentRosterItem,
  type StudentEvaluation,
} from "@/lib/types";
import { PrintModal } from "@/components/print/PrintModal";
import { EvaluationRosterPrintDoc } from "@/components/print/EvaluationRosterPrintDoc";
import { SaveOfflineButton } from "@/components/OfflineIndicator";

export default function FastEvaluationPage() {
  const [authenticated, setAuthenticated] = useState<boolean>(false);

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

  return (
    <EvaluationDashboard
      isAuthenticated={Boolean(authenticated)}
      onLogout={() => setAuthenticated(false)}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════
   2. لوحة التقويم البيداغوجي وميثاق 20/20 الحديثة المتجاوبة بالكامل
   ═══════════════════════════════════════════════════════════════════ */
function EvaluationDashboard({
  isAuthenticated,
  onLogout,
}: {
  isAuthenticated: boolean;
  onLogout: () => void;
}) {
  // التبويب النشط
  const [activeTab, setActiveTab] = useState<"charter" | "roster" | "sessions">("charter");

  // بيانات الأستاذ والأقسام
  const [teacherProfile, setTeacherProfile] = useState<{
    name: string;
    school: string;
    subject: string;
  }>({
    name: "الأستاذ",
    school: "المؤسسة التعليمية",
    subject: "الرياضيات",
  });
  const [selectedClass, setSelectedClass] = useState<string>("1م1");
  const [teacherClasses, setTeacherClasses] = useState<string[]>(["1م1", "1م2", "2م1", "2م2"]);
  const [selectedGroup, setSelectedGroup] = useState<"فوج 1" | "فوج 2" | "القسم كامل">("فوج 1");
  const [searchStudent, setSearchStudent] = useState("");

  // جلسات المراقبة وقائمة التلاميذ
  const [sessions, setSessions] = useState<InspectionSession[]>([]);
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // حالة الاتصال والأوفلاين
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // نوافذ الحوار (Modals)
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [sessionTitleInput, setSessionTitleInput] = useState("");
  const [sessionDateInput, setSessionDateInput] = useState("");
  const [sessionLessonsCount, setSessionLessonsCount] = useState<number>(8);
  const [sessionHomeworksCount, setSessionHomeworksCount] = useState<number>(8);

  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [rosterBatchNames, setRosterBatchNames] = useState("");
  const [singleStudentName, setSingleStudentName] = useState("");

  const [showEvalPrintModal, setShowEvalPrintModal] = useState(false);
  const [showCharterPrintModal, setShowCharterPrintModal] = useState(false);

  // حاسبة التقويم التفاعلية التجريبية (Simulator)
  const [simLessons, setSimLessons] = useState<number>(5);
  const [simHomework, setSimHomework] = useState<number>(4.5);
  const [simBehavior, setSimBehavior] = useState<number>(5);
  const [simActivity, setSimActivity] = useState<number>(4);

  // إشعارات Toast
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => {
      setToastMsg((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  };

  const CACHE_KEY = `jusoor_eval_cache_${selectedClass.replace(/\s+/g, "")}`;
  const PENDING_KEY = `jusoor_eval_pending_${selectedClass.replace(/\s+/g, "")}`;

  // 1. مراقبة حالة الاتصال بالإنترنت
  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      showToast("success", "🟢 تم استعادة الاتصال بالإنترنت! بياناتك جاهزة للمزامنة السحابية.");
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast("error", "📡 أنت الآن في وضع العمل بدون إنترنت (أوفلاين). يتم الحفظ محلياً بأمان.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 2. جلب بيانات الدروس والأقسام وهوية الأستاذ
  useEffect(() => {
    fetch("/api/lessons")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.customClasses && Array.isArray(data.customClasses) && data.customClasses.length > 0) {
          setTeacherClasses(data.customClasses);
          setSelectedClass((prev) => (prev ? prev : data.customClasses[0]));
        }
        if (data?.teacherProfile) {
          setTeacherProfile({
            name: data.teacherProfile.full_name || "الأستاذ",
            school: data.teacherProfile.school_custom_name || "المؤسسة التعليمية",
            subject: data.teacherProfile.subject_name || "الرياضيات",
          });
        }
      })
      .catch(() => {});
  }, []);

  // 3. تحميل البيانات من الكاش المحلي فوراً
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

  // 4. جلب البيانات من السيرفر عند وجود اتصال
  const loadData = useCallback(async () => {
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/inspections?class=${encodeURIComponent(selectedClass)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.sessions && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          if (data.sessions.length > 0) {
            setActiveSessionId(data.sessions[data.sessions.length - 1].id);
          }
        }
        if (data.roster && Array.isArray(data.roster)) {
          setRoster(data.roster);
        }
      }
    } catch {
      // الاعتماد على الكاش
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 5. حفظ نسخة احتياطية في ذاكرة المتصفح تلقائياً مع كل تعديل
  useEffect(() => {
    if (sessions.length > 0 || roster.length > 0) {
      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            className: selectedClass,
            sessions,
            roster,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (e) {
        console.warn("Could not save to localStorage", e);
      }
    }
  }, [sessions, roster, selectedClass, CACHE_KEY]);

  // الجلسة الحالية
  const currentSession = useMemo(() => {
    if (!activeSessionId) return sessions[sessions.length - 1] || null;
    return sessions.find((s) => s.id === activeSessionId) || sessions[sessions.length - 1] || null;
  }, [sessions, activeSessionId]);

  // قائمة التلاميذ المصفاة وفق الفوج والبحث
  const filteredStudents = useMemo(() => {
    const list = roster.filter((r) => {
      const classMatch =
        (r.className || "").trim().toLowerCase() === selectedClass.trim().toLowerCase();
      const groupMatch =
        selectedGroup === "القسم كامل" || (r.groupName || "").trim() === selectedGroup.trim();
      return classMatch && groupMatch;
    });

    if (!searchStudent.trim()) return list;
    return list.filter((s) => s.studentName.toLowerCase().includes(searchStudent.toLowerCase()));
  }, [roster, selectedClass, selectedGroup, searchStudent]);

  // إحصائيات سريعة للقسم الحالي
  const stats = useMemo(() => {
    const totalStudents = filteredStudents.length;
    if (totalStudents === 0 || !currentSession) {
      return { totalStudents, avgScore: 0, fullScoresCount: 0, homeworkAvg: 0 };
    }

    let sumScore = 0;
    let fullScores = 0;
    let sumHW = 0;

    filteredStudents.forEach((st) => {
      const rec = currentSession.records?.[st.studentName];
      if (rec) {
        sumScore += rec.score || 0;
        if (rec.score >= 19.5) fullScores++;
        sumHW += rec.homeworksDone || 0;
      }
    });

    const avgScore = totalStudents > 0 ? Math.round((sumScore / totalStudents) * 10) / 10 : 0;
    const homeworkAvg =
      totalStudents > 0 && currentSession.totalHomeworks > 0
        ? Math.round((sumHW / (totalStudents * currentSession.totalHomeworks)) * 100)
        : 0;

    return { totalStudents, avgScore, fullScoresCount: fullScores, homeworkAvg };
  }, [filteredStudents, currentSession]);

  // دالة المزامنة السحابية
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
        showToast("success", "✓ تمت المزامنة السحابية بنجاح! السجلات محدثة بالكامل ☁️");
      } else {
        throw new Error();
      }
    } catch {
      showToast("error", "تعذر الاتصال بالسيرفر حالياً. بياناتك محفوظة محلياً على جهازك.");
    } finally {
      setIsSyncing(false);
    }
  };

  // تحديث رصد التلميذ
  const handleUpdateRecord = async (studentName: string, updates: Partial<InspectionRecord>) => {
    if (!currentSession) return;
    const existing = currentSession.records?.[studentName] || {
      studentName,
      lessonsDone: currentSession.totalLessons,
      homeworksDone: currentSession.totalHomeworks,
      behaviorScore: 5,
      activityScore: 5,
      score: 20,
    };

    const updatedRec: InspectionRecord = {
      ...existing,
      ...updates,
    };

    // إعادة حساب العلامة
    const tL = currentSession.totalLessons > 0 ? currentSession.totalLessons : 1;
    const tH = currentSession.totalHomeworks > 0 ? currentSession.totalHomeworks : 1;
    const nbPts = Math.min(5, Math.max(0, (updatedRec.lessonsDone / tL) * 5));
    const hwPts = Math.min(5, Math.max(0, (updatedRec.homeworksDone / tH) * 5));
    const behPts = Math.min(5, Math.max(0, updatedRec.behaviorScore || 0));
    const actPts = Math.min(5, Math.max(0, updatedRec.activityScore || 0));

    const total = nbPts + hwPts + behPts + actPts;
    updatedRec.score = Math.min(20, Math.max(0, Math.round(total * 10) / 10));

    // تحديث الواجهة فورياً 0ms
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== currentSession.id) return s;
        return {
          ...s,
          records: {
            ...s.records,
            [studentName]: updatedRec,
          },
        };
      })
    );

    // إرسال للخادم
    if (!navigator.onLine) {
      setPendingSyncCount((c) => c + 1);
      return;
    }

    try {
      await fetch("/api/inspections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSession.id,
          studentName,
          ...updates,
        }),
      });
    } catch {
      setPendingSyncCount((c) => c + 1);
    }
  };

  // منح 20/20 كاملة للتلميذ
  const handleSetFullScore = (studentName: string) => {
    if (!currentSession) return;
    handleUpdateRecord(studentName, {
      lessonsDone: currentSession.totalLessons,
      homeworksDone: currentSession.totalHomeworks,
      behaviorScore: 5,
      activityScore: 5,
    });
    showToast("success", `🌟 تم منح علامة 20/20 كاملة للتلميذ (${studentName})`);
  };

  // إنشاء جلسة جديدة
  const handleCreateSession = async () => {
    if (!sessionTitleInput.trim()) return;
    try {
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "session",
          className: selectedClass,
          title: sessionTitleInput.trim(),
          inspectionDate: sessionDateInput || new Date().toISOString().slice(0, 10),
          range: `الدروس (1 إلى ${sessionLessonsCount})`,
          totalLessons: Number(sessionLessonsCount) || 8,
          totalHomeworks: Number(sessionHomeworksCount) || 8,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("success", "✓ تم إنشاء جلسة المراقبة بنجاح!");
      setIsNewSessionModalOpen(false);
      setSessionTitleInput("");
      await loadData();
      if (data.session) setActiveSessionId(data.session.id);
    } catch (err: any) {
      showToast("error", err.message || "فشل إنشاء الجلسة");
    }
  };

  // استيراد دفعة تلاميذ
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
          groupName: selectedGroup === "القسم كامل" ? "فوج 1" : selectedGroup,
          students: names,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast("success", `✓ تم استيراد (${data.addedCount}) تلميذ بنجاح!`);
      setIsRosterModalOpen(false);
      setRosterBatchNames("");
      loadData();
    } catch (err: any) {
      showToast("error", err.message || "فشل استيراد الأسماء");
    }
  };

  // إضافة تلميذ فردي
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
          groupName: selectedGroup === "القسم كامل" ? "فوج 1" : selectedGroup,
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

  // حذف تلميذ
  const handleDeleteStudent = async (studentName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف التلميذ "${studentName}" من قائمة هذا القسم؟`)) return;
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
      showToast("error", "فشل حذف التلميذ");
    }
  };

  // تصدير ملف JSON
  const handleExportJson = () => {
    const exportObject = {
      platform: "JusoorEducationalPlatform",
      className: selectedClass,
      exportedAt: new Date().toISOString(),
      sessions,
      roster,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `تقييم_جسور_${selectedClass}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast("success", "✓ تم تصدير وتحميل النسخة الاحتياطية بنجاح 📥");
  };

  // تحويل بيانات الرصد لصيغة الطباعة
  const evaluationsForPrint: StudentEvaluation[] = useMemo(() => {
    if (!currentSession) return [];
    return filteredStudents.map((st, idx) => {
      const rec = currentSession.records?.[st.studentName] || {
        studentName: st.studentName,
        lessonsDone: currentSession.totalLessons,
        homeworksDone: currentSession.totalHomeworks,
        behaviorScore: 5,
        activityScore: 5,
        score: 20,
      };
      const tL = currentSession.totalLessons > 0 ? currentSession.totalLessons : 1;
      const tH = currentSession.totalHomeworks > 0 ? currentSession.totalHomeworks : 1;
      const nb = Math.min(5, Math.round(((rec.lessonsDone || 0) / tL) * 5 * 10) / 10);
      const hw = Math.min(5, Math.round(((rec.homeworksDone || 0) / tH) * 5 * 10) / 10);
      const total = rec.score || Math.min(20, nb + hw + (rec.behaviorScore || 5) + (rec.activityScore || 5));

      const rating = total >= 18 ? "excellent" : total >= 15 ? "very_good" : total >= 12 ? "good" : total >= 10 ? "medium" : "weak";
      const ratingColor: "green" | "emerald" | "amber" | "rose" = total >= 18 ? "emerald" : total >= 15 ? "green" : total >= 10 ? "amber" : "rose";
      const grp = (st.groupName === "فوج 2" ? "فوج 2" : st.groupName === "القسم كامل" ? "القسم كامل" : "فوج 1") as "فوج 1" | "فوج 2" | "القسم كامل";

      return {
        id: `ev_${idx}`,
        studentName: st.studentName,
        className: selectedClass,
        groupName: grp,
        notebookScore: nb,
        homeworkScore: hw,
        behaviorScore: rec.behaviorScore || 5,
        toolsScore: rec.behaviorScore || 5,
        activityScore: rec.activityScore || 5,
        totalScore: total,
        rating,
        ratingColor,
        notes: "",
        updatedAt: new Date().toISOString(),
      };
    });
  }, [currentSession, filteredStudents, selectedClass]);

  // حساب معدل الحاسبة التجريبية
  const simTotal = Math.min(
    20,
    Math.max(0, Math.round((simLessons + simHomework + simBehavior + simActivity) * 10) / 10)
  );

  const getGradeAssessment = (score: number) => {
    if (score >= 18) return { label: "ممتاز جداً 🌟", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (score >= 15) return { label: "جيد جداً 👏", color: "text-teal-700 bg-teal-50 border-teal-200" };
    if (score >= 12) return { label: "جيد وسلوك إيجابي 👍", color: "text-blue-700 bg-blue-50 border-blue-200" };
    if (score >= 10) return { label: "متوسط (يحتاج دعم في الواجبات)", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { label: "دون المتوسط (يستلزم استدعاء الولي للمتابعة)", color: "text-red-700 bg-red-50 border-red-200" };
  };

  return (
    <div className="min-h-screen bg-[#fafaf7] pb-20 pt-4 sm:pt-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* ─── إشعار Toast العائم ─── */}
      {toastMsg && (
        <div
          className={`fixed top-5 left-4 right-4 sm:left-auto sm:right-6 z-50 max-w-md p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs sm:text-sm font-bold border transition-all ${
            toastMsg.type === "success"
              ? "bg-emerald-700 text-white border-emerald-600 shadow-emerald-900/20"
              : "bg-red-700 text-white border-red-600 shadow-red-900/20"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="flex-1">{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── ترويسة الصفحة العريضة والفخمة ─── */}
      <header className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-full text-xs font-black border border-emerald-200/70">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>الجمهورية الجزائرية الديمقراطية الشعبية • منصة جسور التعليمية</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ميثاق ونظام التقويم البيداغوجي المستمر (20/20)
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  معايير التنقيط المعتمدة في التعليم المتوسط والربط الميداني الشفاف بين الأستاذ، الولي، والتلميذ
                </p>
              </div>
            </div>
          </div>

          {/* أزرار الإجراءات السريعة */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowCharterPrintModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-700" />
              <span>طباعة الميثاق (PDF)</span>
            </button>

            <SaveOfflineButton className="shadow-2xs text-xs py-2.5 px-3.5" />

            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>متصل بالسحابة</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>أوفلاين محلي</span>
                </>
              )}
            </div>

            {isAuthenticated ? (
              <button
                onClick={async () => {
                  await fetch("/api/auth", { method: "DELETE" });
                  onLogout();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 text-xs font-bold transition cursor-pointer"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج الأستاذ</span>
              </button>
            ) : (
              <Link
                href="/login?next=/eval"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول الأستاذ لرصد الأفواج</span>
              </Link>
            )}
          </div>
        </div>

        {/* ─── شريط التبويبات الرئيسي ─── */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("charter")}
            className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeTab === "charter"
                ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/20"
                : "bg-slate-100/80 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>1. ميثاق التقويم ومعايير 20/20</span>
          </button>

          <button
            onClick={() => setActiveTab("roster")}
            className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeTab === "roster"
                ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/20"
                : "bg-slate-100/80 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>2. شبكة الرصد والتنقيط الميداني</span>
            {filteredStudents.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
                activeTab === "roster" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
              }`}>
                {filteredStudents.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-2 py-3 px-5 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeTab === "sessions"
                ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/20"
                : "bg-slate-100/80 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>3. سجل الجلسات والمعدلات</span>
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════
          التبويب 1: ميثاق التقويم الرسمي ومعايير 20/20 (الميثاق والحاسبة)
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "charter" && (
        <section className="space-y-6 fade-up">
          {/* المعايير البيداغوجية الأربعة */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* المعيار 1: كراس الدروس */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:border-emerald-500/40 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="text-xl font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                  05 ن
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-black text-base text-slate-800">1. كراس القسم والمحاولات</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  الوثيقة الشاهدة على مرافقة التلميذ للحصة اليومية ومجهوده الكتابي.
                </p>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>اكتمال عناصر الدرس وخلوه من البياض</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>نظافة الكراس والتسطير والعناية بالخط</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>تدوين المحاولات وحل التمارين وتصحيحها</span>
                </li>
              </ul>
            </div>

            {/* المعيار 2: الواجبات المنزلية */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:border-amber-500/40 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-xl font-black text-amber-800 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                  05 ن
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-black text-base text-slate-800">2. الواجبات والأنشطة المنزلية</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  قياس مدى التزام التلميذ بالتعلم الذاتي خارج حجرة التدريس.
                </p>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>تسليم التمارين في مواعيدها المحددة</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>الجدية في المحاولات وتجنب النقل الحرفي</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>المشاركة في المشاريع والبحوث المقررة</span>
                </li>
              </ul>
            </div>

            {/* المعيار 3: الانضباط والسلوك */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:border-blue-500/40 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">
                  <Award className="w-6 h-6" />
                </div>
                <span className="text-xl font-black text-blue-800 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                  05 ن
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-black text-base text-slate-800">3. الانضباط والسلوك والمواظبة</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  التحلي بالآداب التربوية واحترام النظام الداخلي للمؤسسة.
                </p>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>الحضور المنتظم وتجنب الغيابات غير المبررة</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>إحضار الكتاب والأدوات المدرسية كاملة</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>حسن الاستماع وتجنب أي سلوك مشوش</span>
                </li>
              </ul>
            </div>

            {/* المعيار 4: الاستجوابات والمشاركة */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:border-purple-500/40 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-black">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="text-xl font-black text-purple-800 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200">
                  05 ن
                </span>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-black text-base text-slate-800">4. الاستجوابات والتقويم المرحلي</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  التقويم المستمر للقدرات الاستيعابية والتفاعل الصفي الحي.
                </p>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-3">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>الاستجوابات الكتابية الدورية والفجائية</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>المشاركة الإيجابية في بناء الدرس على السبورة</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>الرغبة المستمرة في التدارك والتحسن</span>
                </li>
              </ul>
            </div>
          </div>

          {/* الحاسبة التفاعلية لحساب علامة التقويم (20/20) مع التوجيه */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    الحاسبة البيداغوجية التقديرية (Simulator)
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    جرّب إدخال علامات المعايير الأربعة لمعاينة النتيجة والتقدير الموجه للتلميذ والولي
                  </p>
                </div>
              </div>

              {/* النتيجة الإجمالية */}
              <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500">العلامة الإجمالية:</span>
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {simTotal} / 20
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getGradeAssessment(simTotal).color}`}>
                  {getGradeAssessment(simTotal).label}
                </span>
              </div>
            </div>

            {/* أدوات التحكم بالسلايدرات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>كراس الدروس (5ن)</span>
                  <span className="text-emerald-700 font-mono font-black">{simLessons} / 5</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={simLessons}
                  onChange={(e) => setSimLessons(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>الواجبات المنزلية (5ن)</span>
                  <span className="text-amber-700 font-mono font-black">{simHomework} / 5</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={simHomework}
                  onChange={(e) => setSimHomework(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>السلوك والمواظبة (5ن)</span>
                  <span className="text-blue-700 font-mono font-black">{simBehavior} / 5</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={simBehavior}
                  onChange={(e) => setSimBehavior(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>المشاركة والاستجوابات (5ن)</span>
                  <span className="text-purple-700 font-mono font-black">{simActivity} / 5</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={simActivity}
                  onChange={(e) => setSimActivity(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100 text-xs text-emerald-900 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>توجيه بيداغوجي للولي والتلميذ:</strong> التقويم المستمر ليس مجرد نقطة عددية، بل هو مسار تربوي تراكمي يمنح التلميذ فرصة يومية للتعويض والارتقاء عبر العناية بكراسه وحل واجباته.
                </span>
              </div>
              <button
                onClick={() => setActiveTab("roster")}
                className="btn-primary text-xs py-2 px-4 shrink-0 shadow-2xs font-bold cursor-pointer"
              >
                <span>الانتقال لشبكة الرصد الميداني</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════
          التبويب 2: شبكة الرصد والتنقيط الميداني للأفواج
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "roster" && (
        !isAuthenticated ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-xs text-center space-y-4 max-w-lg mx-auto my-8 fade-up">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <ClipboardCheck className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-800">فضاء رصد علامات وتفقد الأفواج</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                هذا القسم مخصص للأساتذة لتنقيط ومتابعة التلاميذ والكراريس والواجبات وإصدار الكشوفات. سجّل الدخول بحسابك للوصول الفوري.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/login?next=/eval"
                className="btn-primary text-xs py-3 px-8 font-black shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول كأستاذ</span>
              </Link>
            </div>
          </div>
        ) : (
        <section className="space-y-6 fade-up">
          {/* شريط التحكم واختيار القسم والفوج */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* اختيار القسم */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-slate-500 ml-1">القسم:</span>
                {teacherClasses.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                      selectedClass === cls
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>

              {/* اختيار الفوج */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-500 ml-1">حصة التفويج:</span>
                {(["فوج 1", "فوج 2", "القسم كامل"] as const).map((grp) => (
                  <button
                    key={grp}
                    onClick={() => setSelectedGroup(grp)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedGroup === grp
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>

              {/* أزرار الإجراءات السريعة في الفوج */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRosterModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>استيراد أسماء الفوج</span>
                </button>

                <button
                  onClick={() => setShowEvalPrintModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-700" />
                  <span>طباعة الكشف الرسمي</span>
                </button>

                <button
                  onClick={handleSyncWithServer}
                  disabled={isSyncing}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="مزامنة السجلات مع السيرفر"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-emerald-600" : ""}`} />
                  <span>مزامنة</span>
                </button>
              </div>
            </div>

            {/* شريط الإحصائيات ومعلومات الجلسة النشطة */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-slate-400 font-bold">تعداد التلاميذ:</p>
                <p className="text-lg font-black text-slate-800">{stats.totalStudents} تلميذ</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-slate-400 font-bold">متوسط التقويم:</p>
                <p className="text-lg font-black text-emerald-700">{stats.avgScore} / 20</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-slate-400 font-bold">العلامات الكاملة (20):</p>
                <p className="text-lg font-black text-emerald-800">{stats.fullScoresCount} تلميذ</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-slate-400 font-bold">الجلسة المفعلة:</p>
                <p className="text-xs font-black text-slate-800 truncate" title={currentSession?.title || "لا توجد جلسة"}>
                  {currentSession?.title || "افتراضية (1 إلى 8)"}
                </p>
              </div>
            </div>
          </div>

          {/* حقل البحث السريع وإضافة تلميذ فردي */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="ابحث عن اسم تلميذ في هذا الفوج..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full pr-10 pl-4 py-3 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>

            <form onSubmit={handleAddSingleStudent} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="اسم ولقب تلميذ جديد..."
                value={singleStudentName}
                onChange={(e) => setSingleStudentName(e.target.value)}
                className="w-48 sm:w-56 px-4 py-3 rounded-2xl bg-white border border-slate-200 text-xs focus:outline-none focus:border-emerald-600 transition"
              />
              <button
                type="submit"
                className="btn-primary text-xs py-3 px-4 font-bold shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة</span>
              </button>
            </form>
          </div>

          {/* ─── جدول الرصد الميداني العريض (Desktop & Mobile) ─── */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-16 px-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-slate-800 text-base">لا توجد أسماء تلاميذ مسجلة في {selectedClass} ({selectedGroup})</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    يمكنك استيراد قائمة الأسماء دفعة واحدة عبر زر "استيراد أسماء الفوج" بالأعلى أو إضافتها تدريجياً.
                  </p>
                </div>
                <button
                  onClick={() => setIsRosterModalOpen(true)}
                  className="btn-primary text-xs py-2.5 px-6 font-bold cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>استيراد قائمة الفوج الآن</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 text-xs font-black border-b border-slate-100">
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4">اسم ولقب التلميذ</th>
                      <th className="py-3.5 px-4 w-24 text-center">الفوج</th>
                      <th className="py-3.5 px-4 w-36 text-center">كراس القسم (5ن)</th>
                      <th className="py-3.5 px-4 w-36 text-center">الواجبات (5ن)</th>
                      <th className="py-3.5 px-4 w-32 text-center">السلوك (5ن)</th>
                      <th className="py-3.5 px-4 w-32 text-center">المشاركة (5ن)</th>
                      <th className="py-3.5 px-4 w-28 text-center">المجموع (20)</th>
                      <th className="py-3.5 px-4 w-32 text-center">إجراءات سريعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredStudents.map((student, idx) => {
                      const rec = currentSession?.records?.[student.studentName] || {
                        studentName: student.studentName,
                        lessonsDone: currentSession?.totalLessons || 8,
                        homeworksDone: currentSession?.totalHomeworks || 8,
                        behaviorScore: 5,
                        activityScore: 5,
                        score: 20,
                      };

                      return (
                        <tr key={student.studentName} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 text-center text-slate-400 font-mono font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {student.studentName}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold">
                              {student.groupName}
                            </span>
                          </td>

                          {/* كراس القسم (تعديل سريع) */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                              <button
                                onClick={() =>
                                  handleUpdateRecord(student.studentName, {
                                    lessonsDone: Math.max(0, (rec.lessonsDone || 0) - 1),
                                  })
                                }
                                className="w-5 h-5 rounded-md bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="font-mono font-black text-emerald-800 px-1 text-xs">
                                {rec.lessonsDone} / {currentSession?.totalLessons || 8}
                              </span>
                              <button
                                onClick={() =>
                                  handleUpdateRecord(student.studentName, {
                                    lessonsDone: Math.min(
                                      currentSession?.totalLessons || 8,
                                      (rec.lessonsDone || 0) + 1
                                    ),
                                  })
                                }
                                className="w-5 h-5 rounded-md bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* الواجبات */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                              <button
                                onClick={() =>
                                  handleUpdateRecord(student.studentName, {
                                    homeworksDone: Math.max(0, (rec.homeworksDone || 0) - 1),
                                  })
                                }
                                className="w-5 h-5 rounded-md bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="font-mono font-black text-amber-800 px-1 text-xs">
                                {rec.homeworksDone} / {currentSession?.totalHomeworks || 8}
                              </span>
                              <button
                                onClick={() =>
                                  handleUpdateRecord(student.studentName, {
                                    homeworksDone: Math.min(
                                      currentSession?.totalHomeworks || 8,
                                      (rec.homeworksDone || 0) + 1
                                    ),
                                  })
                                }
                                className="w-5 h-5 rounded-md bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* السلوك (من 5) */}
                          <td className="py-3 px-4 text-center">
                            <select
                              value={rec.behaviorScore ?? 5}
                              onChange={(e) =>
                                handleUpdateRecord(student.studentName, {
                                  behaviorScore: Number(e.target.value),
                                })
                              }
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-blue-800 focus:outline-none cursor-pointer"
                            >
                              {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1, 0].map((v) => (
                                <option key={v} value={v}>
                                  {v} ن
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* المشاركة والاستجوابات (من 5) */}
                          <td className="py-3 px-4 text-center">
                            <select
                              value={rec.activityScore ?? 5}
                              onChange={(e) =>
                                handleUpdateRecord(student.studentName, {
                                  activityScore: Number(e.target.value),
                                })
                              }
                              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-purple-800 focus:outline-none cursor-pointer"
                            >
                              {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1, 0].map((v) => (
                                <option key={v} value={v}>
                                  {v} ن
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* المجموع من 20 */}
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono font-black text-sm px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {rec.score ?? 20}
                            </span>
                          </td>

                          {/* زر لمسة واحدة 20/20 + حذف */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleSetFullScore(student.studentName)}
                                className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] transition cursor-pointer"
                                title="منح علامة 20/20 كاملة"
                              >
                                🌟 20
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(student.studentName)}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-600 transition cursor-pointer"
                                title="حذف من الفوج"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
        )
      )}

      {/* ════════════════════════════════════════════════════════════════
          التبويب 3: سجل جلسات المراقبة الدورية والتحميل الاحتياطي
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "sessions" && (
        !isAuthenticated ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200/80 shadow-xs text-center space-y-4 max-w-lg mx-auto my-8 fade-up">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-800">سجل جلسات التفقد الدوري</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                توثيق جلسات المراقبة الدورية للكراريس والواجبات متاح للأستاذ المسجل. يرجى تسجيل الدخول بحسابك.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/login?next=/eval"
                className="btn-primary text-xs py-3 px-8 font-black shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول كأستاذ</span>
              </Link>
            </div>
          </div>
        ) : (
        <section className="space-y-6 fade-up">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">سجل جلسات التفقد الدوري للكراريس والواجبات</h2>
                <p className="text-xs text-slate-500 font-medium">
                  توثيق المراقبات المرحلية (الدروس 1-8، 9-16...) لربط التلميذ بالمراجعة الدورية
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsNewSessionModalOpen(true)}
                  className="btn-primary text-xs py-2.5 px-4 font-bold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>بدء جلسة مراقبة جديدة</span>
                </button>
                <button
                  onClick={handleExportJson}
                  className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="تصدير نسخة احتياطية JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير JSON</span>
                </button>
              </div>
            </div>

            {/* بطاقات الجلسات */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  onClick={() => {
                    setActiveSessionId(sess.id);
                    setActiveTab("roster");
                  }}
                  className={`p-5 rounded-2xl border transition cursor-pointer space-y-3 ${
                    activeSessionId === sess.id
                      ? "bg-emerald-50/60 border-emerald-500 shadow-xs"
                      : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                      {sess.className}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {sess.date || "مستمرة"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-sm text-slate-900">{sess.title}</h3>
                    <p className="text-xs text-slate-500 font-medium">{sess.lessonRange || "الدروس المقررة"}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-500">
                      الدروس: <strong>{sess.totalLessons}</strong> • الواجبات: <strong>{sess.totalHomeworks}</strong>
                    </span>
                    <span className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-1">
                      <span>عرض الرصد</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        )
      )}

      {/* ─── نافذة طباعة كشف التنقيط الرسمي للأفواج ─── */}
      <PrintModal
        isOpen={showEvalPrintModal}
        onClose={() => setShowEvalPrintModal(false)}
        documentTitle={`كشف تقويم ${selectedClass} (${selectedGroup})`}
      >
        <EvaluationRosterPrintDoc
          className={selectedClass}
          groupName={selectedGroup}
          evaluations={evaluationsForPrint}
          teacherName={teacherProfile.name}
          schoolName={teacherProfile.school}
          subjectName={teacherProfile.subject}
        />
      </PrintModal>

      {/* ─── نافذة طباعة ميثاق التقويم الرسمي 20/20 ─── */}
      <PrintModal
        isOpen={showCharterPrintModal}
        onClose={() => setShowCharterPrintModal(false)}
        documentTitle="ميثاق التقويم البيداغوجي المستمر (20/20)"
      >
        <div className="p-8 space-y-6 text-black font-sans leading-relaxed" dir="rtl">
          <div className="text-center space-y-1 border-b-2 border-black pb-4">
            <p className="text-xs font-bold">الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التربية الوطنية</p>
            <h2 className="text-lg font-black">{teacherProfile.school}</h2>
            <h1 className="text-xl font-black mt-2">
              ميثاق ونظام التقويم البيداغوجي المستمر (20/20)
            </h1>
            <p className="text-xs text-gray-600">
              المعايير المعتمدة للمراقبة المستمرة لمادة {teacherProfile.subject} — الأستاذ: {teacherProfile.name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="border border-black p-3 rounded-lg space-y-1">
              <p className="font-black text-sm">1. كراس الدروس والمحاولات (05 نقاط)</p>
              <p className="text-gray-700 leading-relaxed">
                اكتمال كافة عناصر الدرس، نظافة الكراس والتسطير، تدوين كافة التمارين وتصحيحها.
              </p>
            </div>

            <div className="border border-black p-3 rounded-lg space-y-1">
              <p className="font-black text-sm">2. الواجبات المنزلية والأنشطة (05 نقاط)</p>
              <p className="text-gray-700 leading-relaxed">
                تسليم الواجبات في مواعيدها، الجدية في المحاولات الفردية والمشاركة في المشاريع التربوية.
              </p>
            </div>

            <div className="border border-black p-3 rounded-lg space-y-1">
              <p className="font-black text-sm">3. الانضباط والسلوك والمواظبة (05 نقاط)</p>
              <p className="text-gray-700 leading-relaxed">
                احترام النظام الداخلي للمؤسسة، الحضور المنتظم، إحضار الكتاب والأدوات المدرسية كاملة.
              </p>
            </div>

            <div className="border border-black p-3 rounded-lg space-y-1">
              <p className="font-black text-sm">4. الاستجوابات والتقويم المرحلي (05 نقاط)</p>
              <p className="text-gray-700 leading-relaxed">
                الاستجوابات الكتابية المفاجئة والدورية، المشاركة في بناء الدرس، والحرص على التدارك.
              </p>
            </div>
          </div>

          <div className="border-t border-black pt-4 flex justify-between items-center text-xs font-bold">
            <div>
              <p>توقيع وختم أستاذ المادة:</p>
              <p className="mt-8 font-normal">{teacherProfile.name}</p>
            </div>
            <div>
              <p>توقيع وختم السيد مدير المتوسطة:</p>
              <p className="mt-8 font-normal">....................................</p>
            </div>
          </div>
        </div>
      </PrintModal>

      {/* ─── نافذة إنشاء جلسة جديدة ─── */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-sm">بدء جلسة مراقبة وتفقد جديدة</h3>
              <button onClick={() => setIsNewSessionModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">عنوان الجلسة:</label>
                <input
                  type="text"
                  placeholder="مثال: المراقبة الأولى للكراريس والواجبات"
                  value={sessionTitleInput}
                  onChange={(e) => setSessionTitleInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">عدد الدروس المقررة:</label>
                  <input
                    type="number"
                    value={sessionLessonsCount}
                    onChange={(e) => setSessionLessonsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 mb-1">عدد الواجبات المقررة:</label>
                  <input
                    type="number"
                    value={sessionHomeworksCount}
                    onChange={(e) => setSessionHomeworksCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsNewSessionModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateSession}
                className="btn-primary text-xs py-2 px-5 font-bold cursor-pointer"
              >
                تأكيد وبدء الجلسة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة استيراد أسماء الفوج دفعة واحدة ─── */}
      {isRosterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-sm">
                استيراد أسماء تلاميذ {selectedClass} ({selectedGroup})
              </h3>
              <button onClick={() => setIsRosterModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-500">
                الصق قائمة الأسماء هنا (كل تلميذ في سطر مستقل أو مفصولة بفواصل):
              </p>
              <textarea
                rows={6}
                value={rosterBatchNames}
                onChange={(e) => setRosterBatchNames(e.target.value)}
                placeholder={"محمد علي\nسارة أحمد\nيوسف خليل\n..."}
                className="w-full p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-emerald-600 text-xs leading-relaxed"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsRosterModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleImportRoster}
                className="btn-primary text-xs py-2 px-5 font-bold cursor-pointer"
              >
                استيراد وإضافة للقائمة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}