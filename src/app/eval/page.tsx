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
  Settings,
  Edit2,
  FileSpreadsheet,
} from "lucide-react";
import {
  type InspectionSession,
  type InspectionRecord,
  type StudentRosterItem,
  type StudentEvaluation,
  type EvaluationCriterion,
  type ClassEvaluationSettings,
} from "@/lib/types";
import { PrintModal } from "@/components/print/PrintModal";
import {
  EvaluationRosterPrintDoc,
  type ExtendedStudentEvaluation,
} from "@/components/print/EvaluationRosterPrintDoc";
import { SaveOfflineButton } from "@/components/OfflineIndicator";

const DEFAULT_CRITERIA: EvaluationCriterion[] = [
  {
    id: "c_nb",
    name: "كراس القسم والمحاولات",
    maxScore: 5,
    description: "اكتمال عناصر الدرس وخلوه من البياض ونظافة الخط وتدوين التمارين وتصحيحها.",
  },
  {
    id: "c_hw",
    name: "الواجبات والأنشطة المنزلية",
    maxScore: 5,
    description: "تسليم الواجبات في مواعيدها المحددة، الجدية في المحاولات الفردية وتجنب النقل.",
  },
  {
    id: "c_beh",
    name: "الانضباط والسلوك والمواظبة",
    maxScore: 5,
    description: "احترام النظام الداخلي للمؤسسة، الحضور المنتظم وإحضار الأدوات والكتاب المدرسي.",
  },
  {
    id: "c_act",
    name: "المشاركة والاستجوابات",
    maxScore: 5,
    description: "الاستجوابات الكتابية الدورية، المشاركة الصفية الإيجابية في بناء الدرس على السبورة.",
  },
];

const DEFAULT_EVAL_SETTINGS: ClassEvaluationSettings = {
  testsCount: 1,
  coefficient: 2,
  criteria: DEFAULT_CRITERIA,
};


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

  // إعدادات التقويم والمعامل ونظام الفروض
  const [evalSettings, setEvalSettings] = useState<ClassEvaluationSettings>(DEFAULT_EVAL_SETTINGS);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingSettings, setEditingSettings] = useState<ClassEvaluationSettings>(DEFAULT_EVAL_SETTINGS);
  const [applyToAllClasses, setApplyToAllClasses] = useState(false);

  // نمط عرض جدول الرصد: كشف المعدل الفصلي الشامل أو تفصيل معايير التقويم
  const [rosterViewMode, setRosterViewMode] = useState<"comprehensive" | "criteria">("comprehensive");
  const [printDocMode, setPrintDocMode] = useState<"comprehensive" | "criteria">("comprehensive");

  // حاسبة التقويم التفاعلية بالمعايير المخصصة
  const [simCriteriaScores, setSimCriteriaScores] = useState<Record<string, number>>({});

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
  const SETTINGS_KEY = `jusoor_eval_settings_${selectedClass.replace(/\s+/g, "")}`;

  // تحميل إعدادات التقويم والمعامل للقسم الحالي من الكاش
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.criteria) && parsed.criteria.length > 0) {
          setEvalSettings(parsed);
          return;
        }
      }
      const globalSaved = localStorage.getItem("jusoor_eval_settings_global");
      if (globalSaved) {
        const parsed = JSON.parse(globalSaved);
        if (parsed && Array.isArray(parsed.criteria) && parsed.criteria.length > 0) {
          setEvalSettings(parsed);
          return;
        }
      }
      setEvalSettings(DEFAULT_EVAL_SETTINGS);
    } catch {
      setEvalSettings(DEFAULT_EVAL_SETTINGS);
    }
  }, [selectedClass, SETTINGS_KEY]);

  // تحديث علامات الحاسبة التجريبية عند تغير المعايير
  useEffect(() => {
    setSimCriteriaScores((prev) => {
      const updated = { ...prev };
      evalSettings.criteria.forEach((c) => {
        if (updated[c.id] === undefined) {
          updated[c.id] = c.maxScore;
        }
      });
      return updated;
    });
  }, [evalSettings.criteria]);

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
        if (data.evaluationSettings && typeof data.evaluationSettings === "object") {
          const classKey = selectedClass.replace(/\s+/g, "");
          const serverSettings =
            data.evaluationSettings[selectedClass] || data.evaluationSettings[classKey];
          if (
            serverSettings &&
            Array.isArray(serverSettings.criteria) &&
            serverSettings.criteria.length > 0
          ) {
            setEvalSettings(serverSettings);
            try {
              localStorage.setItem(SETTINGS_KEY, JSON.stringify(serverSettings));
            } catch {}
          }
        }
      }
    } catch {
      // الاعتماد على الكاش
    } finally {
      setLoading(false);
    }
  }, [selectedClass, SETTINGS_KEY]);

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

  // حساب دقيق لجميع علامات ومعدلات التلميذ وفق المنشور الوزاري الجزائري
  const getStudentMetrics = useCallback(
    (studentName: string) => {
      const rec = currentSession?.records?.[studentName];
      const continuousScore = rec?.score ?? 20;
      const t1 = rec?.test1Score !== undefined ? Number(rec.test1Score) : undefined;
      const t2 = rec?.test2Score !== undefined ? Number(rec.test2Score) : undefined;
      const exam = rec?.examScore !== undefined ? Number(rec.examScore) : undefined;

      // 1. معدل الفروض: فرض واحد أو متوسط الفرضين
      let testAvg: number | undefined;
      if (evalSettings.testsCount === 1) {
        testAvg = t1;
      } else {
        if (t1 !== undefined && t2 !== undefined) {
          testAvg = Math.round(((t1 + t2) / 2) * 100) / 100;
        } else if (t1 !== undefined) {
          testAvg = t1;
        } else if (t2 !== undefined) {
          testAvg = t2;
        }
      }

      // 2. معدل المراقبة المستمرة = (التقويم المستمر + معدل الفروض) ÷ 2
      let continuousMonitoringAvg: number | undefined;
      if (testAvg !== undefined) {
        continuousMonitoringAvg = Math.round(((continuousScore + testAvg) / 2) * 100) / 100;
      }

      // 3. معدل المادة الفصلي = (معدل المراقبة المستمرة + علامة الاختبار × 2) ÷ 3
      let subjectAverage: number | undefined;
      if (continuousMonitoringAvg !== undefined && exam !== undefined) {
        subjectAverage = Math.round(((continuousMonitoringAvg + exam * 2) / 3) * 100) / 100;
      }

      // 4. المجموع الموزون = معدل المادة × معامل المادة
      let weightedTotal: number | undefined;
      if (subjectAverage !== undefined) {
        weightedTotal = Math.round(subjectAverage * evalSettings.coefficient * 100) / 100;
      }

      return {
        continuousScore,
        t1,
        t2,
        testAvg,
        continuousMonitoringAvg,
        exam,
        subjectAverage,
        weightedTotal,
      };
    },
    [currentSession, evalSettings]
  );

  // إحصائيات سريعة للقسم الحالي
  const stats = useMemo(() => {
    const totalStudents = filteredStudents.length;
    if (totalStudents === 0 || !currentSession) {
      return { totalStudents, avgScore: 0, fullScoresCount: 0, avgSubj: 0, passingCount: 0 };
    }

    let sumScore = 0;
    let fullScores = 0;
    let sumSubj = 0;
    let countSubj = 0;
    let passing = 0;

    filteredStudents.forEach((st) => {
      const m = getStudentMetrics(st.studentName);
      sumScore += m.continuousScore;
      if (m.continuousScore >= 19.5) fullScores++;

      if (m.subjectAverage !== undefined) {
        sumSubj += m.subjectAverage;
        countSubj++;
        if (m.subjectAverage >= 10) passing++;
      }
    });

    const avgScore = totalStudents > 0 ? Math.round((sumScore / totalStudents) * 10) / 10 : 0;
    const avgSubj = countSubj > 0 ? Math.round((sumSubj / countSubj) * 10) / 10 : 0;

    return { totalStudents, avgScore, fullScoresCount: fullScores, avgSubj, passingCount: passing };
  }, [filteredStudents, currentSession, getStudentMetrics]);

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

  // حفظ تخصيص المعايير والمعامل ونظام الفروض
  const handleSaveSettings = async () => {
    if (!editingSettings.criteria || editingSettings.criteria.length === 0) {
      showToast("error", "يجب تحديد معيار تقويم واحد على الأقل");
      return;
    }
    const cleanSettings: ClassEvaluationSettings = {
      testsCount: editingSettings.testsCount === 2 ? 2 : 1,
      coefficient: Math.max(1, Number(editingSettings.coefficient) || 1),
      criteria: editingSettings.criteria.map((c, i) => ({
        id: c.id || `crit_${Date.now()}_${i}`,
        name: c.name.trim() || `معيار ${i + 1}`,
        maxScore: Math.max(0.5, Number(c.maxScore) || 5),
        description: c.description || "",
      })),
    };

    setEvalSettings(cleanSettings);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(cleanSettings));
      if (applyToAllClasses) {
        localStorage.setItem("jusoor_eval_settings_global", JSON.stringify(cleanSettings));
        teacherClasses.forEach((cls) => {
          localStorage.setItem(
            `jusoor_eval_settings_${cls.replace(/\s+/g, "")}`,
            JSON.stringify(cleanSettings)
          );
        });
      }
    } catch {}

    if (navigator.onLine) {
      try {
        await fetch("/api/inspections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "saveEvaluationSettings",
            className: selectedClass,
            settings: cleanSettings,
            applyToAll: applyToAllClasses,
          }),
        });
      } catch {}
    }

    setIsSettingsModalOpen(false);
    showToast("success", "✓ تم حفظ إعدادات التقويم والمعامل ونظام الفروض بنجاح");
  };

  // تحديث رصد التلميذ (التقويم، الفروض، الاختبار)
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

    if (updates.customScores) {
      updatedRec.customScores = {
        ...(existing.customScores || {}),
        ...updates.customScores,
      };
    }

    // حساب علامة التقويم المستمر من 20 تلقائياً
    const criteria = evalSettings.criteria;
    const totalMax = criteria.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0);

    if (updatedRec.customScores && Object.keys(updatedRec.customScores).length > 0 && totalMax > 0) {
      let earned = 0;
      criteria.forEach((c) => {
        const val = updatedRec.customScores?.[c.id] ?? c.maxScore;
        earned += Math.max(0, Math.min(c.maxScore, Number(val) || 0));
      });
      const scaled = totalMax === 20 ? earned : (earned / totalMax) * 20;
      updatedRec.score = Math.min(20, Math.max(0, Math.round(scaled * 10) / 10));
    } else if (updates.score !== undefined) {
      updatedRec.score = Math.min(20, Math.max(0, Number(updates.score)));
    } else {
      const tL = currentSession.totalLessons > 0 ? currentSession.totalLessons : 1;
      const tH = currentSession.totalHomeworks > 0 ? currentSession.totalHomeworks : 1;
      const nbPts = Math.min(5, Math.max(0, (updatedRec.lessonsDone / tL) * 5));
      const hwPts = Math.min(5, Math.max(0, (updatedRec.homeworksDone / tH) * 5));
      const behPts = Math.min(5, Math.max(0, updatedRec.behaviorScore || 0));
      const actPts = Math.min(5, Math.max(0, updatedRec.activityScore || 0));

      const total = nbPts + hwPts + behPts + actPts;
      updatedRec.score = Math.min(20, Math.max(0, Math.round(total * 10) / 10));
    }

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
          score: updatedRec.score,
        }),
      });
    } catch {
      setPendingSyncCount((c) => c + 1);
    }
  };

  // منح 20/20 كاملة للتلميذ في التقويم
  const handleSetFullScore = (studentName: string) => {
    if (!currentSession) return;
    const maxCustom: Record<string, number> = {};
    evalSettings.criteria.forEach((c) => {
      maxCustom[c.id] = c.maxScore;
    });
    handleUpdateRecord(studentName, {
      lessonsDone: currentSession.totalLessons,
      homeworksDone: currentSession.totalHomeworks,
      behaviorScore: 5,
      activityScore: 5,
      score: 20,
      customScores: maxCustom,
    });
    showToast("success", `🌟 تم منح علامة 20/20 كاملة في التقويم للتلميذ (${studentName})`);
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

  // تحويل بيانات الرصد لصيغة الطباعة الرسمية الشاملة
  const evaluationsForPrint: ExtendedStudentEvaluation[] = useMemo(() => {
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
      const m = getStudentMetrics(st.studentName);
      const total = m.continuousScore;

      const finalScore = m.subjectAverage ?? total;
      const rating =
        finalScore >= 18
          ? "excellent"
          : finalScore >= 15
          ? "very_good"
          : finalScore >= 12
          ? "good"
          : finalScore >= 10
          ? "medium"
          : "weak";
      const ratingColor: "green" | "emerald" | "amber" | "rose" =
        finalScore >= 18 ? "emerald" : finalScore >= 15 ? "green" : finalScore >= 10 ? "amber" : "rose";
      const grp = (st.groupName === "فوج 2"
        ? "فوج 2"
        : st.groupName === "القسم كامل"
        ? "القسم كامل"
        : "فوج 1") as "فوج 1" | "فوج 2" | "القسم كامل";

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
        test1Score: m.t1,
        test2Score: m.t2,
        testAvg: m.testAvg,
        continuousMonitoringAvg: m.continuousMonitoringAvg,
        examScore: m.exam,
        subjectAverage: m.subjectAverage,
        weightedTotal: m.weightedTotal,
        rating,
        ratingColor,
        notes: rec.notes || "",
        updatedAt: new Date().toISOString(),
      };
    });
  }, [currentSession, filteredStudents, selectedClass, getStudentMetrics]);

  // حساب معدل الحاسبة التجريبية التفاعلية وفق المعايير النشطة
  const simTotal = useMemo(() => {
    const totalMax = evalSettings.criteria.reduce((s, c) => s + (Number(c.maxScore) || 0), 0);
    if (totalMax <= 0) return 20;
    let earned = 0;
    evalSettings.criteria.forEach((c) => {
      earned += Number(simCriteriaScores[c.id] ?? c.maxScore);
    });
    const scaled = (earned / totalMax) * 20;
    return Math.min(20, Math.max(0, Math.round(scaled * 10) / 10));
  }, [evalSettings.criteria, simCriteriaScores]);

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

            <button
              onClick={() => {
                setEditingSettings({
                  ...evalSettings,
                  criteria: evalSettings.criteria.map((c) => ({ ...c })),
                });
                setIsSettingsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-emerald-200" />
              <span>تخصيص المعايير ونظام الفروض والمعامل</span>
            </button>
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
          {/* شريط الإشعار بالمعايير النشطة وزر التخصيص */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-800">
                  معايير ونظام التقويم المعتمد لمادة {teacherProfile.subject} ({selectedClass})
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  المعامل: <strong>{evalSettings.coefficient}</strong> • نظام الفروض:{" "}
                  <strong>{evalSettings.testsCount === 2 ? "فرضين (معدل الفرضين)" : "فرض واحد"}</strong> • عدد المعايير:{" "}
                  <strong>{evalSettings.criteria.length} معايير</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingSettings({
                  ...evalSettings,
                  criteria: evalSettings.criteria.map((c) => ({ ...c })),
                });
                setIsSettingsModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Settings className="w-4 h-4 text-emerald-600" />
              <span>تخصيص المعايير والنظام</span>
            </button>
          </div>

          {/* المعايير البيداغوجية المخصصة للأستاذ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {evalSettings.criteria.map((crit, idx) => (
              <div
                key={crit.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 hover:border-emerald-500/40 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                    {idx === 0 ? (
                      <BookOpen className="w-6 h-6" />
                    ) : idx === 1 ? (
                      <FileText className="w-6 h-6" />
                    ) : idx === 2 ? (
                      <Award className="w-6 h-6" />
                    ) : (
                      <Sparkles className="w-6 h-6" />
                    )}
                  </div>
                  <span className="text-xl font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                    {crit.maxScore} ن
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-black text-base text-slate-800">
                    {idx + 1}. {crit.name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {crit.description || "معيار تقويم مستمر معتمد لمتابعة التلميذ والتزامه البيداغوجي."}
                  </p>
                </div>
                <ul className="text-xs text-slate-600 space-y-2 border-t border-slate-100 pt-3">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>العلامة القصوى الممنوحة: {crit.maxScore} نقاط</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>تُحسب آلياً ضمن معدل التقويم المستمر (من 20)</span>
                  </li>
                </ul>
              </div>
            ))}
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
                    جرّب إدخال علامات المعايير لمعاينة النتيجة والتقدير الموجه للتلميذ والولي
                  </p>
                </div>
              </div>

              {/* النتيجة الإجمالية */}
              <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500">العلامة الإجمالية:</span>
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {simTotal} / 20
                </span>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    getGradeAssessment(simTotal).color
                  }`}
                >
                  {getGradeAssessment(simTotal).label}
                </span>
              </div>
            </div>

            {/* أدوات التحكم بالسلايدرات ديناميكياً لكل معيار */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
              {evalSettings.criteria.map((crit) => {
                const curVal = simCriteriaScores[crit.id] ?? crit.maxScore;
                return (
                  <div key={crit.id} className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="truncate" title={crit.name}>{crit.name}</span>
                      <span className="text-emerald-700 font-mono font-black shrink-0">
                        {curVal} / {crit.maxScore}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={crit.maxScore}
                      step="0.5"
                      value={curVal}
                      onChange={(e) =>
                        setSimCriteriaScores({
                          ...simCriteriaScores,
                          [crit.id]: Number(e.target.value),
                        })
                      }
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                );
              })}
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
                <p className="text-slate-400 font-bold">متوسط معدل المادة:</p>
                <p className="text-lg font-black text-teal-800">
                  {stats.avgSubj > 0 ? `${stats.avgSubj} / 20` : "-"}
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-slate-400 font-bold">التلاميذ الناجحون (≥ 10):</p>
                <p className="text-lg font-black text-emerald-800">
                  {stats.passingCount} من {stats.totalStudents}
                </p>
              </div>
            </div>

            {/* شريط التبديل بين نمط كشف المعدلات الفصلي ونمط معايير التقويم */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRosterViewMode("comprehensive")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    rosterViewMode === "comprehensive"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5 text-emerald-700" />
                  <span>كشف المعدل الفصلي الشامل (التقويم + الفروض + الاختبار = معدل المادة)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRosterViewMode("criteria")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    rosterViewMode === "criteria"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                  <span>تفصيل معايير التقويم المستمر</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingSettings({
                    ...evalSettings,
                    criteria: evalSettings.criteria.map((c) => ({ ...c })),
                  });
                  setIsSettingsModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  نظام المادة: معامل ({evalSettings.coefficient}) • (
                  {evalSettings.testsCount === 2 ? "فرضين" : "فرض واحد"}) • (
                  {evalSettings.criteria.length} معايير) ⚙️
                </span>
              </button>
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
                  <h3 className="font-black text-slate-800 text-base">
                    لا توجد أسماء تلاميذ مسجلة في {selectedClass} ({selectedGroup})
                  </h3>
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
            ) : rosterViewMode === "comprehensive" ? (
              /* ── 1. نمط كشف المعدل الفصلي الشامل ── */
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 text-slate-700 font-black border-b border-slate-200">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3">اسم ولقب التلميذ</th>
                      <th className="py-3 px-2 w-20 text-center">الفوج</th>
                      <th className="py-3 px-2 w-24 text-center bg-emerald-50/60 text-emerald-950">
                        التقويم (20ن)
                      </th>
                      <th className="py-3 px-2 w-24 text-center bg-blue-50/50 text-blue-950">
                        الفرض 1 (20ن)
                      </th>
                      {evalSettings.testsCount === 2 && (
                        <th className="py-3 px-2 w-24 text-center bg-blue-50/50 text-blue-950">
                          الفرض 2 (20ن)
                        </th>
                      )}
                      <th className="py-3 px-2 w-20 text-center text-slate-600">م. الفروض</th>
                      <th className="py-3 px-2 w-24 text-center bg-teal-50/50 text-teal-950">
                        م. المراقبة
                      </th>
                      <th className="py-3 px-2 w-24 text-center bg-amber-50/60 text-amber-950">
                        الاختبار (20ن)
                      </th>
                      <th className="py-3 px-2 w-28 text-center bg-emerald-100/70 text-emerald-950 font-black">
                        معدل المادة (20ن)
                      </th>
                      <th className="py-3 px-2 w-24 text-center text-slate-700">
                        المجموع (×{evalSettings.coefficient})
                      </th>
                      <th className="py-3 px-2 w-24 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student, idx) => {
                      const rec = currentSession?.records?.[student.studentName] || {
                        studentName: student.studentName,
                        lessonsDone: currentSession?.totalLessons || 8,
                        homeworksDone: currentSession?.totalHomeworks || 8,
                        behaviorScore: 5,
                        activityScore: 5,
                        score: 20,
                      };
                      const m = getStudentMetrics(student.studentName);

                      return (
                        <tr key={student.studentName} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {student.studentName}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold">
                              {student.groupName}
                            </span>
                          </td>

                          {/* التقويم المستمر من 20 */}
                          <td className="py-2.5 px-2 text-center bg-emerald-50/20">
                            <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200">
                              {m.continuousScore}
                            </span>
                          </td>

                          {/* الفرض 1 */}
                          <td className="py-2.5 px-2 text-center bg-blue-50/10">
                            <input
                              type="number"
                              dir="ltr"
                              step="0.25"
                              min="0"
                              max="20"
                              placeholder="-"
                              value={rec.test1Score !== undefined ? rec.test1Score : ""}
                              onChange={(e) => {
                                const val =
                                  e.target.value === "" ? undefined : parseFloat(e.target.value);
                                handleUpdateRecord(student.studentName, { test1Score: val });
                              }}
                              className="w-16 py-1 px-1 text-center font-mono font-black text-xs bg-white border border-slate-200 rounded-lg focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-2xs"
                            />
                          </td>

                          {/* الفرض 2 (إذا كان نظام الفروض فرضين) */}
                          {evalSettings.testsCount === 2 && (
                            <td className="py-2.5 px-2 text-center bg-blue-50/10">
                              <input
                                type="number"
                                dir="ltr"
                                step="0.25"
                                min="0"
                                max="20"
                                placeholder="-"
                                value={rec.test2Score !== undefined ? rec.test2Score : ""}
                                onChange={(e) => {
                                  const val =
                                    e.target.value === "" ? undefined : parseFloat(e.target.value);
                                  handleUpdateRecord(student.studentName, { test2Score: val });
                                }}
                                className="w-16 py-1 px-1 text-center font-mono font-black text-xs bg-white border border-slate-200 rounded-lg focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-2xs"
                              />
                            </td>
                          )}

                          {/* معدل الفروض */}
                          <td className="py-2.5 px-2 text-center">
                            <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                              {m.testAvg !== undefined ? m.testAvg.toFixed(2) : "-"}
                            </span>
                          </td>

                          {/* معدل المراقبة المستمرة = (التقويم + م.الفروض) ÷ 2 */}
                          <td className="py-2.5 px-2 text-center bg-teal-50/20">
                            <span className="font-mono font-bold text-xs text-teal-900 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                              {m.continuousMonitoringAvg !== undefined
                                ? m.continuousMonitoringAvg.toFixed(2)
                                : "-"}
                            </span>
                          </td>

                          {/* علامة الاختبار الفصلي */}
                          <td className="py-2.5 px-2 text-center bg-amber-50/20">
                            <input
                              type="number"
                              dir="ltr"
                              step="0.25"
                              min="0"
                              max="20"
                              placeholder="-"
                              value={rec.examScore !== undefined ? rec.examScore : ""}
                              onChange={(e) => {
                                const val =
                                  e.target.value === "" ? undefined : parseFloat(e.target.value);
                                handleUpdateRecord(student.studentName, { examScore: val });
                              }}
                              className="w-16 py-1 px-1 text-center font-mono font-black text-xs bg-white border border-amber-300 rounded-lg focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-2xs text-amber-950"
                            />
                          </td>

                          {/* معدل المادة الفصلي المحسوب بدقة */}
                          <td className="py-2.5 px-2 text-center bg-emerald-50/40">
                            {m.subjectAverage !== undefined ? (
                              <span
                                className={`font-mono font-black text-xs px-2.5 py-1 rounded-xl border ${
                                  m.subjectAverage >= 10
                                    ? "bg-emerald-100 text-emerald-950 border-emerald-300 shadow-2xs"
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}
                              >
                                {m.subjectAverage.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">-</span>
                            )}
                          </td>

                          {/* المجموع الموزون (المعدل × المعامل) */}
                          <td className="py-2.5 px-2 text-center">
                            <span className="font-mono font-black text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">
                              {m.weightedTotal !== undefined ? m.weightedTotal.toFixed(2) : "-"}
                            </span>
                          </td>

                          {/* إجراءات سريعة */}
                          <td className="py-2.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleSetFullScore(student.studentName)}
                                className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] transition cursor-pointer"
                                title="منح 20/20 في التقويم"
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
            ) : (
              /* ── 2. نمط تفصيل معايير التقويم المستمر المخصصة ── */
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 text-slate-700 font-black border-b border-slate-200">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3">اسم ولقب التلميذ</th>
                      <th className="py-3 px-2 w-20 text-center">الفوج</th>
                      {evalSettings.criteria.map((crit) => (
                        <th key={crit.id} className="py-3 px-3 text-center">
                          <span className="block truncate max-w-[150px] mx-auto font-black">{crit.name}</span>
                          <span className="text-[11px] font-mono text-emerald-700 font-bold">
                            ({crit.maxScore}ن)
                          </span>
                        </th>
                      ))}
                      <th className="py-3 px-3 w-28 text-center bg-emerald-50 text-emerald-950 font-black">
                        مجموع التقويم (20ن)
                      </th>
                      <th className="py-3 px-3 w-28 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
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
                        <tr key={student.studentName} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {student.studentName}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold">
                              {student.groupName}
                            </span>
                          </td>

                          {/* أعمدة المعايير المخصصة */}
                          {evalSettings.criteria.map((crit) => {
                            const curScore =
                              rec.customScores?.[crit.id] !== undefined
                                ? rec.customScores[crit.id]
                                : crit.maxScore;

                            return (
                              <td key={crit.id} className="py-2.5 px-3 text-center">
                                <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                                  <button
                                    onClick={() => {
                                      const nxt = Math.max(0, Math.round((curScore - 0.5) * 10) / 10);
                                      handleUpdateRecord(student.studentName, {
                                        customScores: { [crit.id]: nxt },
                                      });
                                    }}
                                    className="w-5 h-5 rounded-md bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="font-mono font-black text-emerald-800 px-1 text-xs">
                                    {curScore} / {crit.maxScore}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const nxt = Math.min(
                                        crit.maxScore,
                                        Math.round((curScore + 0.5) * 10) / 10
                                      );
                                      handleUpdateRecord(student.studentName, {
                                        customScores: { [crit.id]: nxt },
                                      });
                                    }}
                                    className="w-5 h-5 rounded-md bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                            );
                          })}

                          {/* مجموع التقويم من 20 */}
                          <td className="py-2.5 px-3 text-center bg-emerald-50/50">
                            <span className="font-mono font-black text-sm px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300">
                              {rec.score ?? 20}
                            </span>
                          </td>

                          {/* إجراءات سريعة */}
                          <td className="py-2.5 px-3 text-center">
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

      {/* ─── نافذة طباعة كشف التنقيط والمعدلات الرسمي للأفواج ─── */}
      <PrintModal
        isOpen={showEvalPrintModal}
        onClose={() => setShowEvalPrintModal(false)}
        documentTitle={`كشف تقويم ومعدلات ${selectedClass} (${selectedGroup})`}
      >
        <div className="mb-4 pb-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-gray-700">اختر نموذج الكشف المطبوع:</span>
            <button
              type="button"
              onClick={() => setPrintDocMode("comprehensive")}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                printDocMode === "comprehensive"
                  ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
              }`}
            >
              📊 كشف المعدلات الفصلي الشامل (التقويم + الفروض + الاختبار = معدل المادة)
            </button>
            <button
              type="button"
              onClick={() => setPrintDocMode("criteria")}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                printDocMode === "criteria"
                  ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
              }`}
            >
              📝 بطاقة تفريغ معايير التقويم المستمر
            </button>
          </div>
        </div>

        <EvaluationRosterPrintDoc
          className={selectedClass}
          groupName={selectedGroup}
          evaluations={evaluationsForPrint}
          teacherName={teacherProfile.name}
          schoolName={teacherProfile.school}
          subjectName={teacherProfile.subject}
          testsCount={evalSettings.testsCount}
          coefficient={evalSettings.coefficient}
          printMode={printDocMode}
        />
      </PrintModal>

      {/* ─── نافذة طباعة ميثاق التقويم الرسمي بالمعايير النشطة ─── */}
      <PrintModal
        isOpen={showCharterPrintModal}
        onClose={() => setShowCharterPrintModal(false)}
        documentTitle="ميثاق التقويم البيداغوجي المستمر (20/20)"
      >
        <div className="p-8 space-y-6 text-black font-sans leading-relaxed" dir="rtl">
          <div className="text-center space-y-1 border-b-2 border-black pb-4">
            <p className="text-xs font-bold">
              الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التربية الوطنية
            </p>
            <h2 className="text-lg font-black">{teacherProfile.school}</h2>
            <h1 className="text-xl font-black mt-2">
              ميثاق ونظام التقويم البيداغوجي المستمر (20/20)
            </h1>
            <p className="text-xs text-gray-600">
              المعايير المعتمدة للمراقبة المستمرة لمادة {teacherProfile.subject} (معامل:{" "}
              {evalSettings.coefficient} • نظام:{" "}
              {evalSettings.testsCount === 2 ? "فرضين" : "فرض واحد"}) — الأستاذ:{" "}
              {teacherProfile.name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {evalSettings.criteria.map((crit, idx) => (
              <div key={crit.id} className="border border-black p-3 rounded-lg space-y-1">
                <p className="font-black text-sm">
                  {idx + 1}. {crit.name} ({crit.maxScore} نقاط)
                </p>
                <p className="text-gray-700 leading-relaxed">
                  {crit.description ||
                    "معيار تقويم معتمد للمتابعة البيداغوجية المستمرة والتزام التلميذ الصفي."}
                </p>
              </div>
            ))}
          </div>

          <div className="border border-gray-400 p-2.5 rounded-lg bg-gray-50 text-[11px] text-gray-800">
            <p className="font-bold">ملاحظة بيداغوجية تنظيمية:</p>
            <p className="leading-relaxed">
              تُحسب علامة التقويم المستمر (من 20) انطلاقاً من مجموع معايير الأستاذ، وتدمج مع معدل
              الفروض ({evalSettings.testsCount === 2 ? "متوسط الفرضين" : "علامة الفرض الأول"})
              لحساب معدل المراقبة المستمرة، ثم يُحسب معدل المادة الفصلي بالمعادلة الوزارية: (معدل
              المراقبة + علامة الاختبار × 2) ÷ 3.
            </p>
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

      {/* ─── نافذة تخصيص معايير التقويم ونظام الفروض والمعامل ─── */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 space-y-6 shadow-2xl border border-slate-100"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    تخصيص معايير التقويم ونظام الفروض والمعامل
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    ضبط خصوصية المادة وقسم {selectedClass} وفق المنشور الوزاري للتعليم المتوسط
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 text-xs">
              {/* 1. نظام الفروض الفصلية */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <label className="block font-black text-slate-800 text-sm">
                  1. نظام الفروض الفصلية للمادة:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition cursor-pointer ${
                      editingSettings.testsCount === 1
                        ? "bg-white border-emerald-600 text-emerald-900 shadow-xs"
                        : "bg-white/60 border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="testsCount"
                      checked={editingSettings.testsCount === 1}
                      onChange={() => setEditingSettings({ ...editingSettings, testsCount: 1 })}
                      className="accent-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <p className="font-bold text-xs">فرض واحد فقط (الفرض 1)</p>
                      <p className="text-[11px] text-slate-400">معدل الفروض = علامة الفرض الأول</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition cursor-pointer ${
                      editingSettings.testsCount === 2
                        ? "bg-white border-emerald-600 text-emerald-900 shadow-xs"
                        : "bg-white/60 border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="testsCount"
                      checked={editingSettings.testsCount === 2}
                      onChange={() => setEditingSettings({ ...editingSettings, testsCount: 2 })}
                      className="accent-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <p className="font-bold text-xs">فرضين (الفرض 1 + الفرض 2)</p>
                      <p className="text-[11px] text-slate-400">
                        معدل الفروض = (الفرض 1 + الفرض 2) ÷ 2
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. معامل المادة */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-slate-800 text-sm">
                    2. معامل المادة (Coefficient):
                  </label>
                  <span className="text-xs font-bold text-slate-500">
                    المجموع الموزون = معدل المادة × المعامل
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 2, 3, 4, 5].map((coeff) => (
                    <button
                      key={coeff}
                      type="button"
                      onClick={() => setEditingSettings({ ...editingSettings, coefficient: coeff })}
                      className={`w-11 h-10 rounded-xl font-mono font-black text-sm transition cursor-pointer ${
                        editingSettings.coefficient === coeff
                          ? "bg-emerald-700 text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {coeff}
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 mr-3">
                    <span className="text-slate-500 font-bold">معامل مخصص:</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={editingSettings.coefficient}
                      onChange={(e) =>
                        setEditingSettings({
                          ...editingSettings,
                          coefficient: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="w-16 px-2.5 py-2 rounded-xl bg-white border border-slate-200 text-center font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 3. معايير التقويم المستمر ونقاطها المخصصة */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">
                      3. معايير التقويم المستمر ونقاطها المخصصة:
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      يمكنك تعديل أسماء المعايير ونقاطها القصوى بحرية تامة أو إضافة معايير جديدة وحذفها.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSettings({
                          ...editingSettings,
                          criteria: DEFAULT_CRITERIA.map((c) => ({ ...c })),
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>المعايير الافتراضية</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const newCrit: EvaluationCriterion = {
                          id: `c_${Date.now()}`,
                          name: `معيار جديد ${editingSettings.criteria.length + 1}`,
                          maxScore: 5,
                          description: "",
                        };
                        setEditingSettings({
                          ...editingSettings,
                          criteria: [...editingSettings.criteria, newCrit],
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة معيار</span>
                    </button>
                  </div>
                </div>

                {/* قائمة المعايير */}
                <div className="space-y-2.5">
                  {editingSettings.criteria.map((crit, idx) => (
                    <div
                      key={crit.id}
                      className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition"
                    >
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        {idx + 1}
                      </span>

                      <div className="flex-1">
                        <input
                          type="text"
                          value={crit.name}
                          onChange={(e) => {
                            const newArr = [...editingSettings.criteria];
                            newArr[idx].name = e.target.value;
                            setEditingSettings({ ...editingSettings, criteria: newArr });
                          }}
                          placeholder="اسم المعيار (مثال: كراس القسم، السلوك...)"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold focus:border-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-slate-400 font-bold text-xs">النقاط:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="20"
                          value={crit.maxScore}
                          onChange={(e) => {
                            const newArr = [...editingSettings.criteria];
                            newArr[idx].maxScore = Number(e.target.value) || 0;
                            setEditingSettings({ ...editingSettings, criteria: newArr });
                          }}
                          className="w-16 px-2 py-1.5 rounded-xl border border-slate-200 text-center font-mono font-bold text-xs focus:border-emerald-600 focus:outline-none"
                        />
                        <span className="text-slate-500 font-bold text-xs">ن</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (editingSettings.criteria.length <= 1) {
                            showToast("error", "يجب الإبقاء على معيار واحد على الأقل");
                            return;
                          }
                          const newArr = editingSettings.criteria.filter((_, i) => i !== idx);
                          setEditingSettings({ ...editingSettings, criteria: newArr });
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                        title="حذف هذا المعيار"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* مؤشر إجمالي النقاط */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-bold text-slate-600">إجمالي نقاط المعايير المحددة:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-800">
                      {editingSettings.criteria.reduce(
                        (s, c) => s + (Number(c.maxScore) || 0),
                        0
                      )}{" "}
                      نقطة
                    </span>
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold">
                      يتم ضبط المعدل تلقائياً بالنسبة إلى 20
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. تطبيق على جميع الأقسام */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-bold">
                  <input
                    type="checkbox"
                    checked={applyToAllClasses}
                    onChange={(e) => setApplyToAllClasses(e.target.checked)}
                    className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
                  />
                  <span>
                    تطبيق هذه المعايير ونظام الفروض والمعامل على جميع الأقسام المتبقية
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="btn-primary text-xs py-2.5 px-6 font-black shadow-md cursor-pointer inline-flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>حفظ الإعدادات وتطبيقها</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة إنشاء جلسة جديدة ─── */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-sm">بدء جلسة مراقبة وتفقد جديدة</h3>
              <button
                onClick={() => setIsNewSessionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
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
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
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
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-sm">
                استيراد أسماء تلاميذ {selectedClass} ({selectedGroup})
              </h3>
              <button
                onClick={() => setIsRosterModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
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
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
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