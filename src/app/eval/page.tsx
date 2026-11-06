"use client";

import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { LoginRequired } from "@/components/LoginRequired";
import { PageExplainer } from "@/components/PageExplainer";
import { useProfile } from "@/lib/useProfile";
import {
  OfficialGradeRecord,
  StudentRosterItem,
  LessonsData,
  sortClasses,
  MIDDLE_SCHOOL_SUBJECTS,
  getOfficialSubjectCoefficient,
  getLevelFromClassName,
  ContinuousCriterion,
  ContinuousEvalConfig,
  OFFICIAL_MINISTERIAL_CRITERIA,
  EQUAL_FOUR_CRITERIA,
} from "@/lib/types";
import { checkTeacherSession, getPersistedTeacherSession } from "@/lib/offlineAuth";
import { saveTeacherOfflineData, setupAutoSync } from "@/lib/offlineStorage";
import {
  printGradebookReport,
  downloadGradebookPDF,
} from "@/lib/gradebookPdfGenerator";
import {
  Scale,
  Users,
  Plus,
  Trash2,
  Printer,
  Search,
  BookOpen,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  Check,
  Download,
  Loader2,
  Award,
  Sliders,
  TrendingUp,
  Settings,
  ArrowRight,
  ShieldCheck,
  BookMarked,
  Save,
  FileSpreadsheet,
  ChevronDown,
  Info,
  Zap,
  Flame,
  CheckCheck,
  ClipboardCheck,
  HelpCircle,
  Clock,
  Layers,
  Smartphone,
  Lock,
} from "lucide-react";

const getScopedGradebookKey = (teacherId: string) => `jusoor_gradebook_${teacherId}`;

// عبارات التوجيه والملاحظات البيداغوجية المعتمدة
const PRESET_REMARKS = [
  "عمل ممتاز ونتائج مشرفة، واصل التألق 🌟",
  "تلميذ مجتهد ومواظب، بارك الله فيك 👏",
  "نتائج حسنة جداً، مزيداً من الجد والاجتهاد 🟢",
  "مستوى حسن، قادر على تحقيق الأفضل بالإصرار 💪",
  "نتائج مقبولة، يحتاج لمضاعفة التركيز والمراجعة 📝",
  "تراجع طفيف، عليك مراجعة دروسك أولاً بأول ⚠️",
  "انتبه لكراسك وإنجاز الواجبات المنزلية بجدية 📖",
  "المشاركة ضعيفة، عليك التفاعل الإيجابي في القسم 🙋‍♂️",
  "احذر التهاون وكثرة الغيابات المؤثرة على التحصيل ❌",
  "تلميذ مشوش، مطلوب الانضباط التام داخل الصف ⚠️",
];

// أسباب الزيادة والخصم السريعة أثناء الحصة
const QUICK_BONUS_REASONS = [
  { label: "إجابة ممتازة على السبورة (+1)", delta: 1.0 },
  { label: "حل نشاط / تمرين إضافي (+0.5)", delta: 0.5 },
  { label: "فكرة ذكية وإبداعية (+0.5)", delta: 0.5 },
  { label: "كراس متميز ونظيف (+0.5)", delta: 0.5 },
  { label: "مساعدة زميل في الفوج (+0.5)", delta: 0.5 },
];

const QUICK_PENALTY_REASONS = [
  { label: "نسيان الأدوات الهندسية (-0.5)", delta: -0.5 },
  { label: "تشويش داخل الصف (-0.5)", delta: -0.5 },
  { label: "عدم إحضار كراس المحاولات (-0.5)", delta: -0.5 },
  { label: "إهمال إنجاز الواجب (-1.0)", delta: -1.0 },
  { label: "كراس غير مكتمل أو به بياض (-1.0)", delta: -1.0 },
];

export default function GradebookEvaluationPage() {
  const { profile } = useProfile();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);


  // الأفواج والتلاميذ
  const [customClasses, setCustomClasses] = useState<string[]>(["1م1", "1م2", "2م3"]);
  const [selectedClass, setSelectedClass] = useState<string>("1م1");
  const [studentRoster, setStudentRoster] = useState<StudentRosterItem[]>([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("الكل");
  const [searchQuery, setSearchQuery] = useState("");

  // الفصل الدراسي والمادة والمعامل
  const [selectedTrimester, setSelectedTrimester] = useState<1 | 2 | 3>(1);
  const [teacherSubject, setTeacherSubject] = useState<string>("الرياضيات");
  const [customCoefficient, setCustomCoefficient] = useState<number | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // إعدادات سلم التقويم المستمر (الوزاري، المتساوي 4×5، أو مخصص)
  const [rubricConfig, setRubricConfig] = useState<ContinuousEvalConfig>({
    rubricType: "official_ministerial",
    totalMax: 20,
    criteria: OFFICIAL_MINISTERIAL_CRITERIA,
    allowBonusPoints: true,
  });
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);

  // سجلات النقاط (مفتاحها: `${selectedClass}_${studentName}_T${trimester}`)
  const [gradeRecords, setGradeRecords] = useState<Record<string, OfficialGradeRecord>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [evalViewMode, setEvalViewMode] = useState<"table" | "cards">("table");

  // نافذة تفاصيل تقويم تلميذ محدد (Drawer / Modal)
  const [detailStudentName, setDetailStudentName] = useState<string | null>(null);

  // مرجع للتركيز بالأسهم ولوحة المفاتيح
  const tableRef = useRef<HTMLTableElement | null>(null);

  // التحقق من الحساب مع دعم وضع عدم الاتصال (Offline-First)
  const checkAuth = useCallback(async () => {
    const res = await checkTeacherSession();
    setAuthenticated(res.authenticated);
  }, []);

  useEffect(() => {
    checkAuth();
    const session = getPersistedTeacherSession();
    if (session?.id) {
      const cleanup = setupAutoSync(session.id, () => {
        showToast("ok", "🟢 تم استعادة الاتصال ومزامنة سجل التقويم تلقائياً مع السحابة!");
      });
      return cleanup;
    }
  }, [checkAuth]);

  // إشعار سريع للمستخدم
  const showToast = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  };

  // جلب البيانات من الخادم والكاش المحلي
  useEffect(() => {
    // 1. محاولة القراءة الفورية من الكاش المحلي المعزول لهذا الأستاذ
    const persisted = getPersistedTeacherSession();
    if (persisted?.id && typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(getScopedGradebookKey(persisted.id));
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.classes && parsed.classes.length > 0) {
            setCustomClasses(parsed.classes);
            setSelectedClass((prev) => prev || parsed.classes[0]);
          }
          if (parsed.roster && Array.isArray(parsed.roster)) {
            setStudentRoster(parsed.roster);
          }
          if (parsed.records && typeof parsed.records === "object") {
            setGradeRecords(parsed.records);
          }
          if (parsed.subject) {
            const rawSubj = typeof parsed.subject === "string"
              ? parsed.subject
              : (parsed.subject?.name || parsed.subject?.id || "الرياضيات");
            setTeacherSubject(rawSubj);
          }
          if (parsed.rubricConfig) {
            setRubricConfig(parsed.rubricConfig);
          }
        }
      } catch {}
    }

    // 2. المزامنة مع الخادم
    setLoading(true);
    fetch("/api/lessons")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LessonsData | null) => {
        if (!data) return;

        // استخراج الأقسام
        const classes = sortClasses(
          data.customClasses && data.customClasses.length > 0
            ? data.customClasses
            : Array.from(new Set((data.studentRoster || []).map((s) => s.className).filter(Boolean)))
        );
        if (classes.length > 0) {
          setCustomClasses(classes);
          setSelectedClass((prev) => (classes.includes(prev) ? prev : classes[0]));
        }

        // مسرد التلاميذ
        if (Array.isArray(data.studentRoster)) {
          setStudentRoster(data.studentRoster);
        }

        // المادة
        if (data.subject) {
          const rawSubj = typeof data.subject === "string"
            ? data.subject
            : ((data.subject as any)?.name || (data.subject as any)?.id || "الرياضيات");
          const found = MIDDLE_SCHOOL_SUBJECTS.find(
            (s) => s.id === rawSubj || s.name === rawSubj
          );
          if (found) setTeacherSubject(found.name);
          else setTeacherSubject(rawSubj);
        }

        // إعدادات سلم التقويم
        if (data.continuousEvalConfig && data.continuousEvalConfig[classes[0] || "1م1"]) {
          setRubricConfig(data.continuousEvalConfig[classes[0] || "1م1"]);
        }

        // سجلات النقاط الرسمية
        const map: Record<string, OfficialGradeRecord> = {};
        if (Array.isArray(data.gradebookRecords)) {
          data.gradebookRecords.forEach((rec) => {
            if (rec.studentName && rec.className) {
              const key = `${rec.className.replace(/\s+/g, "")}_${rec.studentName.trim()}_T${rec.trimester || 1}`;
              map[key] = rec;
            }
          });
        }
        setGradeRecords(map);

        // تحديث الكاش المعزول
        if (persisted?.id) {
          try {
            localStorage.setItem(
              getScopedGradebookKey(persisted.id),
              JSON.stringify({
                classes,
                roster: data.studentRoster || [],
                records: map,
                subject: data.subject || "الرياضيات",
                rubricConfig,
              })
            );
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // حساب معامل المادة بناءً على المستوى والمادة
  const currentLevelNum = useMemo(() => getLevelFromClassName(selectedClass), [selectedClass]);
  const activeCoefficient = useMemo(() => {
    if (customCoefficient !== null) return customCoefficient;
    return getOfficialSubjectCoefficient(teacherSubject, currentLevelNum);
  }, [teacherSubject, currentLevelNum, customCoefficient]);

  // تلاميذ الفوج الحالي
  const classStudents = useMemo(() => {
    const normClass = selectedClass.replace(/\s+/g, "");
    return studentRoster
      .filter((s) => (s.className || "").replace(/\s+/g, "") === normClass)
      .sort((a, b) => a.studentName.localeCompare(b.studentName, "ar"));
  }, [studentRoster, selectedClass]);

  // تصفية التلاميذ حسب الفوج الفرعي والبحث
  const filteredStudents = useMemo(() => {
    return classStudents.filter((st) => {
      if (selectedGroupFilter !== "الكل" && st.groupName !== selectedGroupFilter) {
        return false;
      }
      if (searchQuery.trim() && !st.studentName.toLowerCase().includes(searchQuery.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [classStudents, selectedGroupFilter, searchQuery]);

  // دالة حساب علامة التقويم المستمر الإجمالية بدقة من المعايير ورصيد الزيادة/النقصان
  const computeTotalContinuous = useCallback(
    (record: Partial<OfficialGradeRecord>): number => {
      let base = 0;
      if (rubricConfig.rubricType === "official_ministerial") {
        const b = record.behaviorScore ?? 4;
        const nb1 = record.notebook1Score ?? 2;
        const nb2 = record.notebook2Score ?? 2;
        const hw1 = record.homework1Score ?? 2;
        const hw2 = record.homework2Score ?? 2;
        const q1 = record.quiz1Score ?? 4;
        const q2 = record.quiz2Score ?? 4;
        base = b + nb1 + nb2 + hw1 + hw2 + q1 + q2;
      } else if (rubricConfig.rubricType === "equal_four") {
        const b = record.behaviorScore ?? 5;
        const nb = record.notebook1Score ?? 5;
        const hw = record.homework1Score ?? 5;
        const q = record.quiz1Score ?? 5;
        base = b + nb + hw + q;
      } else {
        // مخصص: نجمع من customScores
        if (record.customScores) {
          base = Object.values(record.customScores).reduce((a, c) => a + (c || 0), 0);
        } else {
          base = record.continuousScore ?? 20;
        }
      }

      // إضافة رصيد الزيادة والنقصان الصفي (bonusPoints)
      const bonus = record.bonusPoints || 0;
      const total = base + bonus;
      return Math.min(20, Math.max(0, Math.round(total * 10) / 10));
    },
    [rubricConfig]
  );

  // دالة جلب سجل التلميذ
  const getRecordForStudent = useCallback(
    (studentName: string): OfficialGradeRecord => {
      const key = `${selectedClass.replace(/\s+/g, "")}_${studentName.trim()}_T${selectedTrimester}`;
      const rec = gradeRecords[key];
      if (rec) return rec;

      return {
        studentName,
        className: selectedClass,
        trimester: selectedTrimester,
        continuousScore: 20,
        behaviorScore: rubricConfig.rubricType === "equal_four" ? 5 : 4,
        notebook1Score: rubricConfig.rubricType === "equal_four" ? 5 : 2,
        notebook2Score: 2,
        homework1Score: rubricConfig.rubricType === "equal_four" ? 5 : 2,
        homework2Score: 2,
        quiz1Score: rubricConfig.rubricType === "equal_four" ? 5 : 4,
        quiz2Score: 4,
        bonusPoints: 0,
      };
    },
    [gradeRecords, selectedClass, selectedTrimester, rubricConfig]
  );

  // تحديث سجل تلميذ
  const updateStudentField = useCallback(
    (studentName: string, updates: Partial<OfficialGradeRecord>) => {
      setGradeRecords((prev) => {
        const key = `${selectedClass.replace(/\s+/g, "")}_${studentName.trim()}_T${selectedTrimester}`;
        const existing = prev[key] || {
          studentName,
          className: selectedClass,
          trimester: selectedTrimester,
          continuousScore: 20,
          behaviorScore: rubricConfig.rubricType === "equal_four" ? 5 : 4,
          notebook1Score: rubricConfig.rubricType === "equal_four" ? 5 : 2,
          notebook2Score: 2,
          homework1Score: rubricConfig.rubricType === "equal_four" ? 5 : 2,
          homework2Score: 2,
          quiz1Score: rubricConfig.rubricType === "equal_four" ? 5 : 4,
          quiz2Score: 4,
          bonusPoints: 0,
        };

        const merged: OfficialGradeRecord = {
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        // إذا تم تعديل أحد عناصر التقويم أو رصيد الزيادة/النقصان، نحسب الإجمالي آلياً
        if (
          updates.behaviorScore !== undefined ||
          updates.notebook1Score !== undefined ||
          updates.notebook2Score !== undefined ||
          updates.homework1Score !== undefined ||
          updates.homework2Score !== undefined ||
          updates.quiz1Score !== undefined ||
          updates.quiz2Score !== undefined ||
          updates.bonusPoints !== undefined ||
          updates.customScores !== undefined
        ) {
          merged.continuousScore = computeTotalContinuous(merged);
        }

        const next = { ...prev, [key]: merged };

        // حفظ فوري في الكاش المحلي المعزول
        const session = getPersistedTeacherSession();
        if (session?.id) {
          try {
            localStorage.setItem(
              getScopedGradebookKey(session.id),
              JSON.stringify({
                classes: customClasses,
                roster: studentRoster,
                records: next,
                subject: teacherSubject,
                rubricConfig,
              })
            );
          } catch {}
        }

        return next;
      });
      setHasUnsavedChanges(true);
    },
    [selectedClass, selectedTrimester, customClasses, studentRoster, teacherSubject, rubricConfig, computeTotalContinuous]
  );

  // زيادة أو إنقاص سريع في رصيد نقاط الحصة (+ / -)
  const addBonusPoints = useCallback(
    (studentName: string, delta: number, reason?: string) => {
      const rec = getRecordForStudent(studentName);
      const curBonus = rec.bonusPoints || 0;
      const nextBonus = Math.round((curBonus + delta) * 10) / 10;
      updateStudentField(studentName, {
        bonusPoints: nextBonus,
        notes: reason ? (rec.notes ? `${rec.notes} • ${reason}` : reason) : rec.notes,
      });
      showToast(delta > 0 ? "ok" : "err", `${delta > 0 ? "🌟 تم إضافة" : "⚠️ تم خصم"} ${Math.abs(delta)} نقطة لـ ${studentName}`);
    },
    [getRecordForStudent, updateStudentField]
  );

  // حفظ التغييرات سحابياً
  const handleSaveToServer = async () => {
    setSaving(true);
    const allRecords = Object.values(gradeRecords);
    const teacherSession = getPersistedTeacherSession();
    if (teacherSession?.id) {
      saveTeacherOfflineData(
        teacherSession.id,
        {
          gradebookRecords: allRecords,
          continuousEvalConfig: { [selectedClass]: rubricConfig },
        },
        true
      );
    }

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("offline");
      }
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradebookRecords: allRecords,
          continuousEvalConfig: { [selectedClass]: rubricConfig },
        }),
      });

      if (res.ok) {
        setHasUnsavedChanges(false);
        showToast("ok", "✅ تم حفظ سجل التنقيط والتقويم المستمر سحابياً ومحلياً بنجاح!");
      } else {
        showToast("ok", "⚡ تم الحفظ محلياً في جهازك بأمان (أوفلاين) وسيُرفع تلقائياً عند عودة النت.");
      }
    } catch {
      showToast("ok", "⚡ تم الحفظ محلياً في جهازك بأمان (وضع أوفلاين) وسيتم الرفع تلقائياً عند عودة النت.");
    } finally {
      setSaving(false);
    }
  };

  // إحصائيات الفوج الحالية
  const statistics = useMemo(() => {
    let gradedCount = 0;
    let sumAverages = 0;
    let passCount = 0;
    let maxAvg = -1;
    let minAvg = 21;

    classStudents.forEach((st) => {
      const rec = getRecordForStudent(st.studentName);
      const continuous = rec.continuousScore ?? 20;
      const test = rec.test1Score;
      const exam = rec.examScore;

      if (test !== undefined && exam !== undefined) {
        const monitoring = (continuous + test) / 2;
        const avg = (monitoring + 2 * exam) / 3;
        gradedCount++;
        sumAverages += avg;
        if (avg >= 10) passCount++;
        if (avg > maxAvg) maxAvg = avg;
        if (avg < minAvg) minAvg = avg;
      }
    });

    const classAvg = gradedCount > 0 ? sumAverages / gradedCount : undefined;
    const passRate = gradedCount > 0 ? Math.round((passCount / gradedCount) * 100) : 0;

    return {
      totalStudents: classStudents.length,
      gradedCount,
      classAvg,
      passRate,
      passCount,
      maxAvg: maxAvg >= 0 ? maxAvg : undefined,
      minAvg: minAvg <= 20 ? minAvg : undefined,
    };
  }, [classStudents, getRecordForStudent]);

  // التنقل السلس بين الخانات بلوحة المفاتيح
  const handleTableKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colName: "test1" | "exam" | "notes"
  ) => {
    const cols: ("test1" | "exam" | "notes")[] = ["test1", "exam", "notes"];
    const colIdx = cols.indexOf(colName);

    if (e.key === "ArrowDown" || e.key === "Enter") {
      e.preventDefault();
      const nextRow = rowIndex + 1;
      const target = tableRef.current?.querySelector(
        `input[data-row="${nextRow}"][data-col="${colName}"]`
      ) as HTMLInputElement | null;
      target?.focus();
      target?.select();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevRow = rowIndex - 1;
      const target = tableRef.current?.querySelector(
        `input[data-row="${prevRow}"][data-col="${colName}"]`
      ) as HTMLInputElement | null;
      target?.focus();
      target?.select();
    } else if (e.key === "ArrowLeft" && e.currentTarget.selectionEnd === e.currentTarget.value.length) {
      if (colIdx < cols.length - 1) {
        e.preventDefault();
        const nextCol = cols[colIdx + 1];
        const target = tableRef.current?.querySelector(
          `input[data-row="${rowIndex}"][data-col="${nextCol}"]`
        ) as HTMLInputElement | null;
        target?.focus();
        target?.select();
      }
    } else if (e.key === "ArrowRight" && e.currentTarget.selectionStart === 0) {
      if (colIdx > 0) {
        e.preventDefault();
        const prevCol = cols[colIdx - 1];
        const target = tableRef.current?.querySelector(
          `input[data-row="${rowIndex}"][data-col="${prevCol}"]`
        ) as HTMLInputElement | null;
        target?.focus();
        target?.select();
      }
    }
  };

  // تشغيل الطباعة الأفقية الرسمية
  const handlePrintLandscape = () => {
    printGradebookReport({
      teacherName: profile?.fullName || "الأستاذ(ة)",
      schoolName: profile?.schoolCustomName || "المؤسسة التعليمية",
      inspectorName: "السيد مفتش التعليم المتوسط",
      principalName: "السيد مدير المؤسسة",
      wilayaName: "الوادي",
      subjectName: teacherSubject,
      className: selectedClass,
      coefficient: activeCoefficient,
      trimester: selectedTrimester,
      students: classStudents,
      records: gradeRecords,
      includeCriteriaBreakdown: false,
    });
  };

  // تشغيل حفظ وتحميل PDF أفقياً
  const handleDownloadPDF = () => {
    downloadGradebookPDF({
      teacherName: profile?.fullName || "الأستاذ(ة)",
      schoolName: profile?.schoolCustomName || "المؤسسة التعليمية",
      inspectorName: "السيد مفتش التعليم المتوسط",
      principalName: "السيد مدير المؤسسة",
      wilayaName: "الوادي",
      subjectName: teacherSubject,
      className: selectedClass,
      coefficient: activeCoefficient,
      trimester: selectedTrimester,
      students: classStudents,
      records: gradeRecords,
      includeCriteriaBreakdown: false,
    });
  };

  // تصدير جدول النقاط إلى ملف Excel / CSV نظيف مع دعم كامل للعربية
  const handleExportCSV = () => {
    if (classStudents.length === 0) {
      showToast("err", "لا يوجد تلاميذ لتصديرهم في هذا الفوج.");
      return;
    }

    const headers = [
      "الرقم",
      "اسم ولقب التلميذ",
      "الفوج",
      "التقويم المستمر (20ن)",
      "رصيد الزيادة والخصم الصفي",
      "الفرض 1 (20ن)",
      "معدل المراقبة المستمرة (20ن)",
      "الاختبار الفصلي (20ن)",
      "معدل المادة الفصلي (20ن)",
      `المجموع الموزون (×${activeCoefficient})`,
      "ملاحظات وتوجيهات الأستاذ",
    ];

    const rows = classStudents.map((st, idx) => {
      const rec = getRecordForStudent(st.studentName);
      const continuous = rec.continuousScore ?? 20;
      const test = rec.test1Score;
      const monitoring = test !== undefined ? (continuous + test) / 2 : undefined;
      const exam = rec.examScore;
      const subjectAvg = monitoring !== undefined && exam !== undefined ? (monitoring + 2 * exam) / 3 : undefined;
      const weighted = subjectAvg !== undefined ? subjectAvg * activeCoefficient : undefined;

      return [
        idx + 1,
        `"${st.studentName}"`,
        `"${st.groupName || "فوج 1"}"`,
        continuous.toFixed(2),
        (rec.bonusPoints || 0) > 0 ? `+${rec.bonusPoints}` : (rec.bonusPoints || 0),
        test !== undefined ? test.toFixed(2) : "",
        monitoring !== undefined ? monitoring.toFixed(2) : "",
        exam !== undefined ? exam.toFixed(2) : "",
        subjectAvg !== undefined ? subjectAvg.toFixed(2) : "",
        weighted !== undefined ? weighted.toFixed(2) : "",
        `"${(rec.notes || "").replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `سجل_تنقيط_${selectedClass}_الفصل_${selectedTrimester}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("ok", "📊 تم تصدير النقاط بنجاح إلى ملف Excel / CSV!");
  };

  // منح 20ن في التقويم المستمر لجميع تلاميذ القسم دفعة واحدة
  const handleSetFullScoreForAll = () => {
    if (confirm(`هل أنت متأكد من منح 20/20 في التقويم المستمر لجميع تلاميذ ${selectedClass}؟`)) {
      classStudents.forEach((st) => {
        updateStudentField(st.studentName, {
          continuousScore: 20,
          behaviorScore: rubricConfig.rubricType === "equal_four" ? 5 : 4,
          notebook1Score: rubricConfig.rubricType === "equal_four" ? 5 : 2,
          notebook2Score: 2,
          homework1Score: rubricConfig.rubricType === "equal_four" ? 5 : 2,
          homework2Score: 2,
          quiz1Score: rubricConfig.rubricType === "equal_four" ? 5 : 4,
          quiz2Score: 4,
          bonusPoints: 0,
        });
      });
      showToast("ok", "🌟 تم منح 20/20 في التقويم المستمر لجميع تلاميذ الفوج بنجاح!");
    }
  };

  if (authenticated === false) {
    return <LoginRequired next="/eval" title="سجل التنقيط والتقويم المستمر" />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] py-6 sm:py-8 px-3 sm:px-6 font-sans text-right" dir="rtl">
      {/* فرض التوجيه الأفقي A4 Landscape في الطباعة المباشرة */}
      <style jsx global>{`
        @page {
          size: A4 landscape;
          margin: 6mm 8mm;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-5">
        {/* ─── شريط المسار وأزرار العمليات العلوية ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <Link href="/admin" className="hover:text-gray-900 transition flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              لوحة الأستاذ
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-black">سجل التنقيط والتقويم المستمر</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/eval/continuous"
              className="px-3.5 py-1.5 rounded-xl border border-emerald-400 bg-emerald-600 hover:bg-emerald-700 text-xs font-black text-white transition shadow-sm flex items-center gap-1.5"
              title="فتح صفحة دفتر التقويم المستمر الصفي اليومي للتنقيط السريع من الهاتف"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-100" />
              <span>دفتر التقويم اليومي 📱</span>
            </Link>
            <button
              onClick={() => setIsRubricModalOpen(true)}
              type="button"
              className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-black text-indigo-800 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="تخصيص سلم التقويم المستمر وتوزيع النقاط على ذوق الأستاذ"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>تخصيص سلم التنقيط ⚙️</span>
            </button>
            <button
              onClick={handleExportCSV}
              type="button"
              className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="تصدير جدول النقاط إلى ملف Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>تصدير Excel 📊</span>
            </button>
            <button
              onClick={handlePrintLandscape}
              type="button"
              className="px-3.5 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-800 hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="طباعة سجل التنقيط أفقياً A4 رسمي"
            >
              <Printer className="w-3.5 h-3.5 text-[#107a57]" />
              <span>طباعة أفقياً A4 🖨️</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              type="button"
              className="px-3.5 py-1.5 rounded-xl border border-[#107a57]/30 bg-[#e6f4ee] text-xs font-black text-[#107a57] hover:bg-[#d8efe5] transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="حفظ وتنزيل كراس التنقيط كملف PDF أفقي عالي الدقة"
            >
              <Download className="w-3.5 h-3.5 text-[#107a57]" />
              <span>تحميل PDF أفقياً 📄</span>
            </button>
            <button
              onClick={handleSaveToServer}
              disabled={saving}
              type="button"
              className={`btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 shadow-sm cursor-pointer ${
                hasUnsavedChanges ? "animate-pulse" : ""
              }`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? "جاري الحفظ..." : hasUnsavedChanges ? "حفظ التغييرات 💾 *" : "حفظ التغييرات 💾"}</span>
            </button>
          </div>
        </div>

        {/* ─── دليل الصفحة البيداغوجي ─── */}
        <div className="print:hidden">
          <PageExplainer
            pageId="eval"
            title="سجل التنقيط والمتابعة البيداغوجية المستمرة (خاص بالأستاذ والمفتشية والإدارة)"
            teacherRoleExplanation="سجل رسمي لرصد علامات التقويم المستمر، الفروض المحروسة، والاختبارات الفصلية لكل قسم، وحساب معدل المادة الفصلي آلياً وفق المنشور الوزاري المعتمد."
            inspectorExplanation="وثيقة تقييم رسمية مطابقة للسلم الوزاري (20 نقطة) وقاعدة احتساب المعدل الفصلي للمادة، لمتابعة نسب النجاح والتحصيل الدراسي."
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

        {/* ─── بطاقة الترويسة الرئيسية + اختيار الفوج والفصل والمادة ─── */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e8e8e0] shadow-sm space-y-4 print:hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 px-3 py-0.5 rounded-full text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>سجل المتابعة والتنقيط الرسمي المعتمد للتثبيت والترسيم</span>
              </div>
              <h1 className="text-xl font-black text-gray-900">
                جدول رصد النقاط والمعدل الفصلي للمادة
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                رصد علامات الفروض والاختبارات، مع استيراد تلقائي لنقاط التقويم المستمر من دفتر التقويم اليومي وحساب معدل المادة الفصلي آلياً.
              </p>
            </div>

            {/* شارة المادة والمعامل وسلّم التقويم */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl text-right">
                <div className="text-[11px] text-gray-500 font-medium">المادة والمعامل:</div>
                <div className="text-xs font-black text-slate-800">
                  {teacherSubject} • <span className="text-[#107a57]">المعامل ×{activeCoefficient}</span>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 p-2.5 rounded-2xl text-right">
                <div className="text-[11px] text-indigo-700 font-medium">سلم التقويم المستمر:</div>
                <div className="text-xs font-black text-indigo-950">
                  {rubricConfig.rubricType === "official_ministerial"
                    ? "السلم الوزاري (20ن)"
                    : rubricConfig.rubricType === "equal_four"
                    ? "الأرباع (4×5=20ن)"
                    : "سلم مخصص (20ن)"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                title="تخصيص المادة والمعامل"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* تبويبات الأقسام والفصول والفوج الفرعي */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* 1. ألسنة الأقسام */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-gray-500 ml-1">الفوج:</span>
              {customClasses.map((cls) => {
                const isActive = selectedClass === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                      isActive
                        ? "bg-[#107a57] text-white shadow-sm"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span>{cls}</span>
                  </button>
                );
              })}
            </div>

            {/* 2. أزرار الفصول الثلاثة */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setSelectedTrimester(1)}
                className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                  selectedTrimester === 1
                    ? "bg-white text-amber-900 shadow-2xs font-black"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                الفصل الأول 🍂
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrimester(2)}
                className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                  selectedTrimester === 2
                    ? "bg-white text-blue-900 shadow-2xs font-black"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                الفصل الثاني ❄️
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrimester(3)}
                className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                  selectedTrimester === 3
                    ? "bg-white text-emerald-900 shadow-2xs font-black"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                الفصل الثالث 🌸
              </button>
            </div>

            {/* 3. إجراءات سريعة */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetFullScoreForAll}
                className="px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 transition cursor-pointer"
                title="منح 20ن في التقويم المستمر لجميع تلاميذ الفوج"
              >
                <span>🌟 20ن للجميع</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── شريط الإحصائيات الحية للفوج ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 print:hidden">
          <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-2xs">
            <div className="text-[11px] text-gray-500 font-medium">تلاميذ الفوج:</div>
            <div className="text-base font-black text-gray-900 mt-0.5">
              {statistics.totalStudents} <span className="text-xs font-normal text-gray-400">تلميذ</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-2xs">
            <div className="text-[11px] text-gray-500 font-medium">المكتمل رصدهم:</div>
            <div className="text-base font-black text-slate-800 mt-0.5">
              {statistics.gradedCount} / {statistics.totalStudents}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-2xs">
            <div className="text-[11px] text-gray-500 font-medium">معدل الفوج العام:</div>
            <div className="text-base font-black text-[#107a57] mt-0.5">
              {statistics.classAvg !== undefined ? `${statistics.classAvg.toFixed(2)} / 20` : "قيد الرصد"}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-2xs">
            <div className="text-[11px] text-gray-500 font-medium">نسبة الحاصلين على المعدل:</div>
            <div className="text-base font-black text-blue-900 mt-0.5">
              {statistics.passRate}% ({statistics.passCount})
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-2xs col-span-2 sm:col-span-1">
            <div className="text-[11px] text-gray-500 font-medium">أعلى / أدنى علامة:</div>
            <div className="text-xs font-black text-gray-800 mt-1">
              {statistics.maxAvg !== undefined ? (
                <>
                  <span className="text-emerald-700">🔝 {statistics.maxAvg.toFixed(2)}</span> •{" "}
                  <span className="text-rose-700">🔻 {statistics.minAvg?.toFixed(2)}</span>
                </>
              ) : (
                "-"
              )}
            </div>
          </div>
        </div>

        {/* ─── فلتر البحث والتفويج ─── */}
        <div className="bg-white rounded-2xl p-3 border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="ابحث عن اسم تلميذ في الفوج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#107a57] focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-gray-500">التفويج:</span>
            {["الكل", "فوج 1", "فوج 2"].map((grp) => (
              <button
                key={grp}
                type="button"
                onClick={() => setSelectedGroupFilter(grp)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedGroupFilter === grp
                    ? "bg-slate-800 text-white font-black"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {grp}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            جدول رصد النقاط والمعدل الفصلي (الكشف العام الشامل)
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden print:border-none print:shadow-none animate-in fade-in duration-200">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <Users className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-sm font-bold text-gray-700">لا توجد أسماء تلاميذ مسجلة في فوج {selectedClass}</p>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  يمكنك إضافة واستيراد قائمة تلاميذ هذا الفوج بضغطة زر واحدة من صفحة إدارة التلاميذ.
                </p>
                <Link
                  href="/admin/students"
                  className="btn-primary inline-flex text-xs px-4 py-2 items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إدراج تلاميذ الفوج الآن</span>
                </Link>
              </div>
            ) : (
              <div>
                {/* شريط التبديل وإرشاد السحب في الشاشات الصغيرة */}
                <div className="sm:hidden flex items-center justify-between p-2.5 bg-slate-100 border-b border-gray-200">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                    <span>العرض للهاتف:</span>
                    <div className="inline-flex p-0.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setEvalViewMode("table")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-black transition ${
                          evalViewMode === "table" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600"
                        }`}
                      >
                        جدول 📊
                      </button>
                      <button
                        type="button"
                        onClick={() => setEvalViewMode("cards")}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-black transition ${
                          evalViewMode === "cards" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600"
                        }`}
                      >
                        بطاقات 📱
                      </button>
                    </div>
                  </div>
                  {evalViewMode === "table" && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                      اسحب أفقياً ↔️
                    </span>
                  )}
                </div>

                {/* ── نمط البطاقات المخصصة للهاتف ── */}
                {evalViewMode === "cards" && (
                  <div className="sm:hidden p-2.5 space-y-2.5 bg-slate-50">
                    {filteredStudents.map((st, idx) => {
                      const rec = getRecordForStudent(st.studentName);
                      const continuous = rec.continuousScore ?? 20;
                      const test1 = rec.test1Score;
                      const monitoring = test1 !== undefined ? (continuous + test1) / 2 : undefined;
                      const exam = rec.examScore;
                      const subjectAvg =
                        monitoring !== undefined && exam !== undefined ? (monitoring + 2 * exam) / 3 : undefined;

                      return (
                        <div
                          key={st.studentName}
                          className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-mono font-bold text-xs flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <h4 className="font-black text-xs text-slate-900">{st.studentName}</h4>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                                {st.groupName || "فوج 1"}
                              </span>
                              <button
                                type="button"
                                onClick={() => setDetailStudentName(st.studentName)}
                                className="p-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                                title="تفاصيل التقويم"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-emerald-50/70 p-1.5 rounded-xl border border-emerald-100">
                              <span className="text-[10px] text-emerald-900 font-bold block">ت. مستمر</span>
                              <span className="font-mono font-black text-xs text-emerald-950">
                                {continuous.toFixed(2)}
                              </span>
                            </div>

                            <div className="bg-blue-50/70 p-1.5 rounded-xl border border-blue-200">
                              <span className="text-[10px] text-blue-900 font-bold block">الفرض (20ن)</span>
                              <input
                                type="number"
                                dir="ltr"
                                step="0.25"
                                min="0"
                                max="20"
                                placeholder="-"
                                value={rec.test1Score !== undefined ? rec.test1Score : ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                  updateStudentField(st.studentName, {
                                    test1Score: val !== undefined ? Math.min(20, Math.max(0, val)) : undefined,
                                  });
                                }}
                                className="w-full mt-0.5 py-1 text-center font-mono font-black text-xs bg-white border border-blue-300 rounded-lg text-blue-950"
                              />
                            </div>

                            <div className="bg-amber-50/70 p-1.5 rounded-xl border border-amber-200">
                              <span className="text-[10px] text-amber-900 font-bold block">الاختبار (20ن)</span>
                              <input
                                type="number"
                                dir="ltr"
                                step="0.25"
                                min="0"
                                max="20"
                                placeholder="-"
                                value={rec.examScore !== undefined ? rec.examScore : ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                  updateStudentField(st.studentName, {
                                    examScore: val !== undefined ? Math.min(20, Math.max(0, val)) : undefined,
                                  });
                                }}
                                className="w-full mt-0.5 py-1 text-center font-mono font-black text-xs bg-white border border-amber-300 rounded-lg text-amber-950"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-200 font-bold">
                            <div>
                              <span className="text-slate-500 text-[10px]">م. المراقبة: </span>
                              <span className="font-mono font-black text-slate-800">
                                {monitoring !== undefined ? monitoring.toFixed(2) : "-"}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 text-[10px]">معدل المادة: </span>
                              <span
                                className={`font-mono font-black px-2 py-0.5 rounded-md ${
                                  subjectAvg !== undefined && subjectAvg >= 10
                                    ? "bg-emerald-100 text-emerald-900"
                                    : subjectAvg !== undefined
                                    ? "bg-rose-100 text-rose-900"
                                    : "text-slate-400"
                                }`}
                              >
                                {subjectAvg !== undefined ? subjectAvg.toFixed(2) : "-"}
                              </span>
                            </div>
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="ملاحظة الأستاذ للتلميذ..."
                              value={rec.notes || ""}
                              onChange={(e) => updateStudentField(st.studentName, { notes: e.target.value })}
                              className="w-full py-1 px-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── نمط الجدول العريض مع تجميد عمود الاسم للأجهزة ── */}
                <div className={`overflow-x-auto relative ${evalViewMode === "cards" ? "hidden sm:block" : "block"}`}>
                  <table ref={tableRef} className="w-full text-right border-collapse text-xs min-w-[880px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-800 font-black border-b border-gray-200">
                        <th className="py-3 px-2 w-10 text-center sticky right-0 bg-slate-100 z-20">#</th>
                        <th className="py-3 px-3 min-w-[170px] sticky right-10 bg-slate-100 z-20 border-l border-gray-200 shadow-xs">
                          اسم ولقب التلميذ(ة)
                        </th>
                        <th className="py-3 px-2 w-16 text-center">الفوج</th>
                      <th className="py-3 px-2 w-36 text-center bg-emerald-50 text-emerald-950 font-black border-l border-emerald-100">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="flex items-center gap-1">
                            <span>التقويم المستمر (20ن)</span>
                            <span title="العلامة مستوردة آلياً من دفتر التقويم المستمر وغير قابلة للتعديل هنا">🔒</span>
                          </div>
                          <Link
                            href="/eval/continuous"
                            className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold underline decoration-dotted"
                            title="الانتقال لدفتر التقويم الصفي لتعديل جزئيات النقاط"
                          >
                            (تعديل بالدفتر 📱)
                          </Link>
                        </div>
                      </th>
                      <th className="py-3 px-2 w-24 text-center bg-blue-50/60 text-blue-950 font-black">
                        الفرض (20ن)
                      </th>
                      <th className="py-3 px-2 w-24 text-center bg-teal-50 text-teal-950 font-black">
                        م. المراقبة (20ن)
                      </th>
                      <th className="py-3 px-2 w-24 text-center bg-amber-50 text-amber-950 font-black">
                        الاختبار (20ن)
                      </th>
                      <th className="py-3 px-2 w-28 text-center bg-emerald-100 text-emerald-950 font-black">
                        معدل المادة (20ن)
                      </th>
                      <th className="py-3 px-2 w-24 text-center text-slate-700">
                        المجموع (×{activeCoefficient})
                      </th>
                      <th className="py-3 px-3 min-w-[200px]">ملاحظات وتوجيهات الأستاذ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.map((st, idx) => {
                      const rec = getRecordForStudent(st.studentName);
                      const continuous = rec.continuousScore ?? 20;
                      const test1 = rec.test1Score;
                      const monitoring = test1 !== undefined ? (continuous + test1) / 2 : undefined;
                      const exam = rec.examScore;
                      const subjectAvg =
                        monitoring !== undefined && exam !== undefined ? (monitoring + 2 * exam) / 3 : undefined;
                      const weighted = subjectAvg !== undefined ? subjectAvg * activeCoefficient : undefined;
                      const bonus = rec.bonusPoints || 0;

                      return (
                        <tr key={st.studentName} className="hover:bg-slate-50/80 transition">
                          {/* الرقم */}
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-bold">
                            {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                          </td>

                          {/* اسم التلميذ */}
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            <div className="flex items-center justify-between">
                              <span>{st.studentName}</span>
                              <button
                                type="button"
                                onClick={() => setDetailStudentName(st.studentName)}
                                className="opacity-40 hover:opacity-100 p-1 rounded hover:bg-indigo-50 text-indigo-700 transition"
                                title="عرض وتعديل تفاصيل تقويم هذا التلميذ"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* الفوج الفرعي */}
                          <td className="py-2.5 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold">
                              {st.groupName || "فوج 1"}
                            </span>
                          </td>

                          {/* التقويم المستمر (20ن) غير قابل للتعديل المباشر هنا - يأتي من دفتر التقويم المستمر */}
                          <td className="py-2.5 px-2 text-center bg-emerald-50/30 border-l border-emerald-100">
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <span className="font-mono font-black text-xs text-emerald-950 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg shadow-2xs">
                                {continuous !== undefined ? Number(continuous).toFixed(2) : "20.00"}
                              </span>
                              <Link
                                href="/eval/continuous"
                                className="text-slate-400 hover:text-emerald-700 p-0.5 transition"
                                title="العلامة مستوردة آلياً من دفتر التقويم الصفي — انقر لتعديلها في صفحة التقويم"
                              >
                                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                              </Link>
                            </div>
                          </td>

                          {/* الفرض المحروس (20ن) */}
                          <td className="py-2.5 px-2 text-center bg-blue-50/20">
                            <input
                              type="number"
                              dir="ltr"
                              step="0.25"
                              min="0"
                              max="20"
                              placeholder="-"
                              data-row={idx}
                              data-col="test1"
                              value={rec.test1Score !== undefined ? rec.test1Score : ""}
                              onKeyDown={(e) => handleTableKeyDown(e, idx, "test1")}
                              onChange={(e) => {
                                const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                updateStudentField(st.studentName, {
                                  test1Score: val !== undefined ? Math.min(20, Math.max(0, val)) : undefined,
                                });
                              }}
                              className="w-16 py-1 px-1 text-center font-mono font-black text-xs bg-white border border-blue-200 rounded-lg focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-2xs text-blue-950"
                            />
                          </td>

                          {/* معدل المراقبة المستمرة = (التقويم + الفرض) ÷ 2 */}
                          <td className="py-2.5 px-2 text-center bg-teal-50/20">
                            <span className="font-mono font-bold text-xs text-teal-900 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                              {monitoring !== undefined ? monitoring.toFixed(2) : "-"}
                            </span>
                          </td>

                          {/* الاختبار الفصلي (20ن) */}
                          <td className="py-2.5 px-2 text-center bg-amber-50/20">
                            <input
                              type="number"
                              dir="ltr"
                              step="0.25"
                              min="0"
                              max="20"
                              placeholder="-"
                              data-row={idx}
                              data-col="exam"
                              value={rec.examScore !== undefined ? rec.examScore : ""}
                              onKeyDown={(e) => handleTableKeyDown(e, idx, "exam")}
                              onChange={(e) => {
                                const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                updateStudentField(st.studentName, {
                                  examScore: val !== undefined ? Math.min(20, Math.max(0, val)) : undefined,
                                });
                              }}
                              className="w-16 py-1 px-1 text-center font-mono font-black text-xs bg-white border border-amber-300 rounded-lg focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600 shadow-2xs text-amber-950"
                            />
                          </td>

                          {/* معدل المادة الفصلي المعتمد وزارياً */}
                          <td className="py-2.5 px-2 text-center bg-emerald-50/40">
                            {subjectAvg !== undefined ? (
                              <span
                                className={`font-mono font-black text-xs px-2.5 py-1 rounded-xl border ${
                                  subjectAvg >= 10
                                    ? "bg-emerald-100 text-emerald-950 border-emerald-300 shadow-2xs"
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}
                              >
                                {subjectAvg.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">-</span>
                            )}
                          </td>

                          {/* المجموع الموزون (المعدل × المعامل) */}
                          <td className="py-2.5 px-2 text-center">
                            <span className="font-mono font-black text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg">
                              {weighted !== undefined ? weighted.toFixed(2) : "-"}
                            </span>
                          </td>

                          {/* ملاحظات وتوجيهات الأستاذ */}
                          <td className="py-2.5 px-3">
                            <div className="relative flex items-center gap-1.5">
                              <input
                                type="text"
                                placeholder="أدخل ملاحظة للتلميذ..."
                                data-row={idx}
                                data-col="notes"
                                value={rec.notes || ""}
                                onKeyDown={(e) => handleTableKeyDown(e, idx, "notes")}
                                onChange={(e) => updateStudentField(st.studentName, { notes: e.target.value })}
                                className="w-full py-1 px-2 text-xs bg-white border border-gray-200 rounded-lg focus:border-[#107a57] focus:outline-none"
                              />
                              <select
                                aria-label="ملاحظات سريعة جاهزة"
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    updateStudentField(st.studentName, { notes: e.target.value });
                                  }
                                }}
                                className="w-6 h-7 p-0 opacity-40 hover:opacity-100 border border-gray-200 rounded text-[11px] bg-gray-50 cursor-pointer"
                                title="اختر ملاحظة جاهزة بنقرة واحدة"
                              >
                                <option value="">...</option>
                                {PRESET_REMARKS.map((rem, rIdx) => (
                                  <option key={rIdx} value={rem}>
                                    {rem}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ─── زر حفظ التغييرات العائم في أسفل الصفحة ─── */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-6 left-6 z-40 bg-white/95 backdrop-blur-md border border-[#107a57]/30 shadow-xl rounded-2xl p-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 print:hidden">
            <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
            <span className="text-xs font-bold text-gray-800">توجد نقاط وتعديلات جديدة غير محفوظة</span>
            <button
              onClick={handleSaveToServer}
              disabled={saving}
              type="button"
              className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات الآن"}</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── نافذة تفاصيل تقويم تلميذ محدد (Drawer / Modal) ─── */}
      {detailStudentName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-200 space-y-4 text-right animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#107a57]" />
                  <span>تفاصيل التقويم المستمر: {detailStudentName}</span>
                </h3>
                <p className="text-[11px] text-gray-400">
                  الفوج: {selectedClass} • الفصل: {selectedTrimester}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailStudentName(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const rec = getRecordForStudent(detailStudentName);
              const continuous = rec.continuousScore ?? 20;
              const bonus = rec.bonusPoints || 0;

              return (
                <div className="space-y-4 text-xs">
                  {/* النتيجة الإجمالية الحالية */}
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-emerald-900 font-bold block">العلامة النهائية في التقويم المستمر:</span>
                      <span className="text-[11px] text-emerald-700">تنعكس تلقائياً في جدول رصد النقاط والمعدل</span>
                    </div>
                    <span className="text-xl font-mono font-black text-[#107a57]">
                      {continuous} / 20
                    </span>
                  </div>

                  {/* عناصر المعايير */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                      <span className="font-bold">1. المشاركة والسلوك الصفي:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="4"
                        value={rec.behaviorScore ?? 4}
                        onChange={(e) =>
                          updateStudentField(detailStudentName, { behaviorScore: parseFloat(e.target.value) || 0 })
                        }
                        className="w-16 p-1 text-center font-mono font-bold bg-white border border-gray-200 rounded-lg"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                      <span className="font-bold">2. كراس التلميذ (مقطع 1 + مقطع 2):</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="2"
                          value={rec.notebook1Score ?? 2}
                          onChange={(e) =>
                            updateStudentField(detailStudentName, { notebook1Score: parseFloat(e.target.value) || 0 })
                          }
                          className="w-12 p-1 text-center font-mono font-bold bg-white border border-gray-200 rounded-lg"
                          title="المقطع 1"
                        />
                        <span>+</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="2"
                          value={rec.notebook2Score ?? 2}
                          onChange={(e) =>
                            updateStudentField(detailStudentName, { notebook2Score: parseFloat(e.target.value) || 0 })
                          }
                          className="w-12 p-1 text-center font-mono font-bold bg-white border border-gray-200 rounded-lg"
                          title="المقطع 2"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                      <span className="font-bold">3. الوظائف والواجبات المنزلية (وظيفة 1 + 2):</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="2"
                          value={rec.homework1Score ?? 2}
                          onChange={(e) =>
                            updateStudentField(detailStudentName, { homework1Score: parseFloat(e.target.value) || 0 })
                          }
                          className="w-12 p-1 text-center font-mono font-bold bg-white border border-gray-200 rounded-lg"
                        />
                        <span>+</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="2"
                          value={rec.homework2Score ?? 2}
                          onChange={(e) =>
                            updateStudentField(detailStudentName, { homework2Score: parseFloat(e.target.value) || 0 })
                          }
                          className="w-12 p-1 text-center font-mono font-bold bg-white border border-gray-200 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                      <span className="font-bold">4. الاستجوابات الكتابية (استجواب 1 + 2):</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="4"
                          value={rec.quiz1Score ?? 4}
                          onChange={(e) =>
                            updateStudentField(detailStudentName, { quiz1Score: parseFloat(e.target.value) || 0 })
                          }
                          className="w-12 p-1 text-center font-mono font-bold bg-white border border-gray-200 rounded-lg"
                        />
                        <span>+</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="4"
                          value={rec.quiz2Score ?? 4}
                          onChange={(e) =>
                            updateStudentField(detailStudentName, { quiz2Score: parseFloat(e.target.value) || 0 })
                          }
                          className="w-12 p-1 text-center font-mono font-bold bg-white border border-gray-200 rounded-lg"
                        />
                      </div>
                    </div>

                    {/* رصيد الزيادة والخصم الصفي */}
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-950 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-600" />
                          <span>رصيد الزيادة والخصم أثناء الحصص:</span>
                        </span>
                        <span className="font-mono font-black text-xs text-amber-900">
                          {bonus > 0 ? `+${bonus}` : bonus}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => addBonusPoints(detailStudentName, 0.5, "مشاركة متميزة")}
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs"
                        >
                          +0.5
                        </button>
                        <button
                          type="button"
                          onClick={() => addBonusPoints(detailStudentName, 1.0, "حل نشاط")}
                          className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold text-xs"
                        >
                          +1.0
                        </button>
                        <button
                          type="button"
                          onClick={() => addBonusPoints(detailStudentName, -0.5, "تهاون")}
                          className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-xs"
                        >
                          -0.5
                        </button>
                        <button
                          type="button"
                          onClick={() => addBonusPoints(detailStudentName, -1.0, "إهمال")}
                          className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-xs"
                        >
                          -1.0
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStudentField(detailStudentName, { bonusPoints: 0 })}
                          className="px-2 py-1 rounded bg-gray-200 text-gray-700 text-xs ml-auto"
                        >
                          إعادة ضبط
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailStudentName(null)}
                className="btn-primary text-xs px-5 py-2 cursor-pointer"
              >
                حفظ وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة تخصيص سلم التقويم المستمر (Rubric Config) ─── */}
      {isRubricModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-200 space-y-4 text-right animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>تخصيص سلم ومعايير التقويم المستمر</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsRubricModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-500 font-medium">
                اختر النموذج المناسب لطريقتكم في التدريس، وسيتم تكييف حساب التقويم المستمر لجميع تلاميذ الفوج تلقائياً:
              </p>

              {/* النماذج الجاهزة */}
              <div className="space-y-2">
                <label
                  onClick={() =>
                    setRubricConfig({
                      rubricType: "official_ministerial",
                      totalMax: 20,
                      criteria: OFFICIAL_MINISTERIAL_CRITERIA,
                      allowBonusPoints: true,
                    })
                  }
                  className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                    rubricConfig.rubricType === "official_ministerial"
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="rubric"
                    checked={rubricConfig.rubricType === "official_ministerial"}
                    onChange={() => {}}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-gray-900">1. السلم الوزاري الرسمي المعتمد (20ن) [الموصى به]</div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      المشاركة والسلوك (4ن) + كراس التلميذ (4ن) + الوظائف المنزلية (4ن) + الاستجوابات الكتابية (8ن) = 20 نقطة.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() =>
                    setRubricConfig({
                      rubricType: "equal_four",
                      totalMax: 20,
                      criteria: EQUAL_FOUR_CRITERIA,
                      allowBonusPoints: true,
                    })
                  }
                  className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                    rubricConfig.rubricType === "equal_four"
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="rubric"
                    checked={rubricConfig.rubricType === "equal_four"}
                    onChange={() => {}}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold text-gray-900">2. نموذج الأرباع المتساوية (4 × 5 = 20ن)</div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      كراس الدروس (5ن) + الواجبات (5ن) + السلوك والأدوات (5ن) + المشاركة والاستجوابات (5ن) = 20 نقطة.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsRubricModalOpen(false);
                  showToast("ok", "تم تحديث سلم التقويم المستمر للفوج بنجاح!");
                }}
                className="btn-primary text-xs px-5 py-2 cursor-pointer"
              >
                اعتماد وتطبيق السلم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة تخصيص المادة والمعامل ─── */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-200 space-y-4 text-right animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#107a57]" />
                <span>تخصيص مادة التدريس ومعامل الفوج</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">مادة التدريس:</label>
                <select
                  value={teacherSubject}
                  onChange={(e) => {
                    setTeacherSubject(e.target.value);
                    setCustomCoefficient(null);
                  }}
                  className="w-full p-2 border border-gray-200 rounded-xl bg-gray-50 text-xs font-bold"
                >
                  {MIDDLE_SCHOOL_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  معامل الفوج ({selectedClass}):
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCustomCoefficient(val)}
                      className={`flex-1 py-2 rounded-xl font-mono font-black text-xs transition cursor-pointer border ${
                        activeCoefficient === val
                          ? "bg-[#107a57] text-white border-[#107a57]"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      ×{val}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  المعامل الوزاري المقترح لـ {selectedClass} هو: <strong>×{getOfficialSubjectCoefficient(teacherSubject, currentLevelNum)}</strong>
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="btn-primary text-xs px-5 py-2 cursor-pointer"
              >
                تطبيق واعتماد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}