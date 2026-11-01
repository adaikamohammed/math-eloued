"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { LoginRequired } from "@/components/LoginRequired";
import {
  ArrowRight,
  CheckCircle2,
  Smartphone,
  Search,
  Sliders,
  Table as TableIcon,
  Plus,
  Trash2,
  Edit2,
  HelpCircle,
  X,
} from "lucide-react";
import {
  OfficialGradeRecord,
  StudentRosterItem,
  LessonsData,
  sortClasses,
} from "@/lib/types";

// تعريف بنية العمود المرن في التقويم المستمر
export interface ContinuousColumn {
  id: string; // معرف فريد للعمود
  title: string; // عنوان العمود مثل: وظيفة 1، كراس 1، مشاركة، استجواب
  maxScore: number; // العلامة القصوى للعمود (مثلاً: 2، 4، 5)
  category?: "behavior" | "notebook" | "homework" | "quiz" | "custom";
}

// الأعمدة الافتراضية الرسمية (مجموعها 20 نقطة)
const DEFAULT_COLUMNS: ContinuousColumn[] = [
  { id: "col_behavior", title: "مشاركة وانضباط", maxScore: 4, category: "behavior" },
  { id: "col_nb1", title: "كراس 1", maxScore: 2, category: "notebook" },
  { id: "col_nb2", title: "كراس 2", maxScore: 2, category: "notebook" },
  { id: "col_hw1", title: "وظيفة 1", maxScore: 2, category: "homework" },
  { id: "col_hw2", title: "وظيفة 2", maxScore: 2, category: "homework" },
  { id: "col_q1", title: "استجواب 1", maxScore: 4, category: "quiz" },
  { id: "col_q2", title: "استجواب 2", maxScore: 4, category: "quiz" },
];

// نماذج جاهزة يمكن للأستاذ الاختيار منها بضغطة زر
const COLUMN_PRESETS = [
  {
    name: "النموذج الوزاري المعتمد (20ن)",
    description: "مشاركة (4ن) + كراس (2ن+2ن) + وظائف (2ن+2ن) + استجوابات (4ن+4ن)",
    columns: DEFAULT_COLUMNS,
  },
  {
    name: "نموذج الأرباع المتساوية (4 × 5ن = 20ن)",
    description: "مشاركة وسلوك (5ن) + كراس وتطبيقات (5ن) + واجبات منزلية (5ن) + استجوابات (5ن)",
    columns: [
      { id: "col_behavior", title: "المشاركة والسلوك", maxScore: 5, category: "behavior" as const },
      { id: "col_notebook", title: "الكراس والمحاولات", maxScore: 5, category: "notebook" as const },
      { id: "col_homework", title: "الواجبات المنزلية", maxScore: 5, category: "homework" as const },
      { id: "col_quiz", title: "الاستجوابات والأنشطة", maxScore: 5, category: "quiz" as const },
    ],
  },
  {
    name: "نموذج الواجبات والمتابعة السريعة (3 أعمدة)",
    description: "واجبات وكراريس (8ن) + استجوابات كتابية (8ن) + سلوك ومواظبة (4ن)",
    columns: [
      { id: "col_hw_nb", title: "الواجبات والكراريس", maxScore: 8, category: "homework" as const },
      { id: "col_quizzes", title: "الاستجوابات الدورية", maxScore: 8, category: "quiz" as const },
      { id: "col_behavior", title: "الانضباط والمشاركة", maxScore: 4, category: "behavior" as const },
    ],
  },
];

export default function ContinuousEvalMobilePage() {
  // حالة المصادقة والتحميل
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastEditedStudent, setLastEditedStudent] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.authenticated !== undefined) {
          setAuthenticated(Boolean(data.authenticated));
        } else {
          setAuthenticated(true);
        }
      })
      .catch(() => setAuthenticated(true));
  }, []);

  // الفوج والفصل
  const [customClasses, setCustomClasses] = useState<string[]>(["1م1", "1م2", "1م3", "2م3"]);
  const [selectedClass, setSelectedClass] = useState<string>("1م1");
  const [selectedTrimester, setSelectedTrimester] = useState<1 | 2 | 3>(1);
  const [studentRoster, setStudentRoster] = useState<StudentRosterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // سجلات النقاط: مفتاحها `${className}_${studentName}_T${trimester}`
  const [records, setRecords] = useState<Record<string, OfficialGradeRecord>>({});

  // الأعمدة الديناميكية للأستاذ
  const [columns, setColumns] = useState<ContinuousColumn[]>(DEFAULT_COLUMNS);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ContinuousColumn | null>(null);
  const [newColTitle, setNewColTitle] = useState("");
  const [newColMax, setNewColMax] = useState<number>(2);

  // مرجع لتأخير الحفظ التلقائي
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // جلب الأعمدة المحفوظة للفوج من التخزين المحلي
  useEffect(() => {
    try {
      const savedCols = localStorage.getItem(`jusoor_eval_cols_${selectedClass}`);
      if (savedCols) {
        const parsed = JSON.parse(savedCols);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setColumns(parsed);
          return;
        }
      }
    } catch {}
    // استخدام الأعمدة الافتراضية إذا لم توجد تخصيصات
    setColumns(DEFAULT_COLUMNS);
  }, [selectedClass]);

  // حفظ الأعمدة عند تعديلها
  const saveColumnsConfig = useCallback((newCols: ContinuousColumn[]) => {
    setColumns(newCols);
    try {
      localStorage.setItem(`jusoor_eval_cols_${selectedClass}`, JSON.stringify(newCols));
    } catch {}
  }, [selectedClass]);

  // جلب البيانات الأولية من الكاش ثم السيرفر
  useEffect(() => {
    try {
      const cached = localStorage.getItem("jusoor_gradebook_cache");
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
          setRecords(parsed.records);
        }
      }
    } catch {}

    fetch("/api/lessons")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LessonsData | null) => {
        if (!data) return;

        const classes = sortClasses(
          data.customClasses && data.customClasses.length > 0
            ? data.customClasses
            : ["1م1", "1م2", "1م3", "2م3"]
        );
        setCustomClasses(classes);
        setSelectedClass((prev) => (classes.includes(prev) ? prev : classes[0]));

        if (Array.isArray(data.studentRoster)) {
          setStudentRoster(data.studentRoster);
        }

        if (Array.isArray(data.gradebookRecords)) {
          const recMap: Record<string, OfficialGradeRecord> = {};
          data.gradebookRecords.forEach((r) => {
            if (r.studentName && r.className && r.trimester) {
              const k = `${r.className.replace(/\s+/g, "")}_${r.studentName.trim()}_T${r.trimester}`;
              recMap[k] = r;
            }
          });
          setRecords(recMap);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // مجموع النقاط القصوى لجميع الأعمدة المحددة حالياً
  const totalMaxScore = useMemo(() => {
    return columns.reduce((acc, col) => acc + (col.maxScore || 0), 0);
  }, [columns]);

  // حساب علامة التقويم المستمر الإجمالية بدقة من 20
  const computeStudentTotal = useCallback(
    (customScores: Record<string, number | undefined>, bonusPoints: number = 0): number => {
      let sum = 0;
      columns.forEach((col) => {
        const val = customScores[col.id];
        if (typeof val === "number" && !isNaN(val)) {
          sum += val;
        }
      });
      sum += bonusPoints || 0;

      if (totalMaxScore <= 0) return 0;

      // إذا كان مجموع الأعمدة 20 تماماً يكون الحساب مباشراً
      let finalScore = 0;
      if (totalMaxScore === 20) {
        finalScore = sum;
      } else {
        // إذا كان المجموع مختلفاً (مثلاً 15 أو 25) يتم تحويله بدقة على 20
        finalScore = (sum / totalMaxScore) * 20;
      }

      return Math.min(20, Math.max(0, Math.round(finalScore * 10) / 10));
    },
    [columns, totalMaxScore]
  );

  // دالة جلب سجل تلميذ محدد (الحالة الافتراضية صفر لجميع الخانات)
  const getRecord = useCallback(
    (studentName: string): OfficialGradeRecord => {
      const key = `${selectedClass.replace(/\s+/g, "")}_${studentName.trim()}_T${selectedTrimester}`;
      const existing = records[key];
      if (existing) {
        // التأكد من تهيئة customScores إن لم تكن موجودة
        if (!existing.customScores) {
          const cScores: Record<string, number> = {};
          // ربط الحقول القديمة إن كانت متوفرة وإلا فالحالة الافتراضية 0
          if (existing.behaviorScore !== undefined) cScores.col_behavior = existing.behaviorScore;
          if (existing.notebook1Score !== undefined) cScores.col_nb1 = existing.notebook1Score;
          if (existing.notebook2Score !== undefined) cScores.col_nb2 = existing.notebook2Score;
          if (existing.homework1Score !== undefined) cScores.col_hw1 = existing.homework1Score;
          if (existing.homework2Score !== undefined) cScores.col_hw2 = existing.homework2Score;
          if (existing.quiz1Score !== undefined) cScores.col_q1 = existing.quiz1Score;
          if (existing.quiz2Score !== undefined) cScores.col_q2 = existing.quiz2Score;
          existing.customScores = cScores;
        }
        return existing;
      }

      // سجل جديد نظيف: الافتراضي 0 في جميع الخانات
      const initialCustomScores: Record<string, number> = {};
      columns.forEach((col) => {
        initialCustomScores[col.id] = 0;
      });

      return {
        studentName,
        className: selectedClass,
        trimester: selectedTrimester,
        continuousScore: 0,
        behaviorScore: 0,
        notebook1Score: 0,
        notebook2Score: 0,
        homework1Score: 0,
        homework2Score: 0,
        quiz1Score: 0,
        quiz2Score: 0,
        bonusPoints: 0,
        customScores: initialCustomScores,
      };
    },
    [records, selectedClass, selectedTrimester, columns]
  );

  // حفظ التغييرات إلى السيرفر والكاش تلقائياً
  const triggerAutoSave = useCallback(
    (newRecords: Record<string, OfficialGradeRecord>) => {
      setSaveStatus("saving");
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // تحديث الكاش المحلي فوراً 0ms
      try {
        localStorage.setItem(
          "jusoor_gradebook_cache",
          JSON.stringify({
            classes: customClasses,
            roster: studentRoster,
            records: newRecords,
          })
        );
      } catch {}

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const recordsArray = Object.values(newRecords);
          const res = await fetch("/api/lessons", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gradebookRecords: recordsArray }),
          });
          if (res.ok) {
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2500);
          } else {
            setSaveStatus("idle");
          }
        } catch {
          setSaveStatus("idle");
        }
      }, 700);
    },
    [customClasses, studentRoster]
  );

  // تحديث علامة عمود معين لتلميذ
  const handleColumnScoreChange = useCallback(
    (studentName: string, columnId: string, value: number, isMissing: boolean = false) => {
      setRecords((prev) => {
        const key = `${selectedClass.replace(/\s+/g, "")}_${studentName.trim()}_T${selectedTrimester}`;
        const current = getRecord(studentName);
        const nextCustomScores = { ...(current.customScores || {}) };

        // تخزين النقطة
        nextCustomScores[columnId] = value;

        // حالة "لم يحضر" باللون الأحمر
        if (isMissing) {
          nextCustomScores[`missing_${columnId}`] = 1;
        } else {
          delete nextCustomScores[`missing_${columnId}`];
        }

        // التوافق مع الحقول القياسية
        const updated: OfficialGradeRecord = {
          ...current,
          customScores: nextCustomScores,
        };

        if (columnId === "col_behavior") updated.behaviorScore = value;
        if (columnId === "col_nb1") updated.notebook1Score = value;
        if (columnId === "col_nb2") updated.notebook2Score = value;
        if (columnId === "col_hw1") updated.homework1Score = value;
        if (columnId === "col_hw2") updated.homework2Score = value;
        if (columnId === "col_q1") updated.quiz1Score = value;
        if (columnId === "col_q2") updated.quiz2Score = value;

        // إعادة حساب العلامة الإجمالية من 20 بدقة
        updated.continuousScore = computeStudentTotal(nextCustomScores, updated.bonusPoints || 0);
        updated.updatedAt = new Date().toISOString();

        const next = { ...prev, [key]: updated };
        setLastEditedStudent(studentName);
        triggerAutoSave(next);
        return next;
      });
    },
    [selectedClass, selectedTrimester, getRecord, computeStudentTotal, triggerAutoSave]
  );

  // زيادة أو إنقاص نقاط إضافية صفيّة بلمسة واحدة
  const handleBonusChange = useCallback(
    (studentName: string, delta: number) => {
      setRecords((prev) => {
        const key = `${selectedClass.replace(/\s+/g, "")}_${studentName.trim()}_T${selectedTrimester}`;
        const current = getRecord(studentName);
        const newBonus = Math.round(((current.bonusPoints || 0) + delta) * 10) / 10;
        const updated: OfficialGradeRecord = {
          ...current,
          bonusPoints: newBonus,
        };
        updated.continuousScore = computeStudentTotal(updated.customScores || {}, newBonus);
        updated.updatedAt = new Date().toISOString();

        const next = { ...prev, [key]: updated };
        setLastEditedStudent(studentName);
        triggerAutoSave(next);
        return next;
      });
    },
    [selectedClass, selectedTrimester, getRecord, computeStudentTotal, triggerAutoSave]
  );

  // عمليات سريعة على العمود بالكامل (مثل: وضع علامة كاملة لمن أحضر الواجب)
  const handleBatchColumnAction = useCallback(
    (columnId: string, action: "set_max" | "set_zero" | "mark_all_missing") => {
      const targetCol = columns.find((c) => c.id === columnId);
      if (!targetCol) return;

      setRecords((prev) => {
        const next = { ...prev };
        studentRoster
          .filter((s) => (s.className || "").replace(/\s+/g, "") === selectedClass.replace(/\s+/g, ""))
          .forEach((st) => {
            const key = `${selectedClass.replace(/\s+/g, "")}_${st.studentName.trim()}_T${selectedTrimester}`;
            const current = getRecord(st.studentName);
            const nextCustomScores = { ...(current.customScores || {}) };

            if (action === "set_max") {
              nextCustomScores[columnId] = targetCol.maxScore;
              delete nextCustomScores[`missing_${columnId}`];
            } else if (action === "set_zero") {
              nextCustomScores[columnId] = 0;
              delete nextCustomScores[`missing_${columnId}`];
            } else if (action === "mark_all_missing") {
              nextCustomScores[columnId] = 0;
              nextCustomScores[`missing_${columnId}`] = 1;
            }

            const updated: OfficialGradeRecord = {
              ...current,
              customScores: nextCustomScores,
            };
            updated.continuousScore = computeStudentTotal(nextCustomScores, updated.bonusPoints || 0);
            updated.updatedAt = new Date().toISOString();
            next[key] = updated;
          });

        triggerAutoSave(next);
        return next;
      });
    },
    [columns, studentRoster, selectedClass, selectedTrimester, getRecord, computeStudentTotal, triggerAutoSave]
  );

  // إضافة عمود جديد
  const handleAddColumn = () => {
    if (!newColTitle.trim()) return;
    const newId = `col_${Date.now()}`;
    const newCol: ContinuousColumn = {
      id: newId,
      title: newColTitle.trim(),
      maxScore: Number(newColMax) || 2,
      category: "custom",
    };
    const updated = [...columns, newCol];
    saveColumnsConfig(updated);
    setNewColTitle("");
    setNewColMax(2);
  };

  // حذف عمود
  const handleDeleteColumn = (colId: string) => {
    if (columns.length <= 1) {
      alert("يجب الإبقاء على عمود واحد على الأقل في الجدول.");
      return;
    }
    const updated = columns.filter((c) => c.id !== colId);
    saveColumnsConfig(updated);
  };

  // تعديل عمود موجود
  const handleSaveEditColumn = () => {
    if (!editingColumn || !editingColumn.title.trim()) return;
    const updated = columns.map((c) =>
      c.id === editingColumn.id ? { ...editingColumn, maxScore: Number(editingColumn.maxScore) || 1 } : c
    );
    saveColumnsConfig(updated);
    setEditingColumn(null);
  };

  // تطبيق نموذج جاهز
  const handleApplyPreset = (presetColumns: ContinuousColumn[]) => {
    if (confirm("هل تريد بالتأكيد اعتماد هذا النموذج لتقسيم الأعمدة؟")) {
      saveColumnsConfig(presetColumns);
      setIsColumnModalOpen(false);
    }
  };

  // تلاميذ الفوج المختار مرتبين أبجدياً
  const classStudents = useMemo(() => {
    const norm = selectedClass.replace(/\s+/g, "");
    return studentRoster
      .filter((s) => (s.className || "").replace(/\s+/g, "") === norm)
      .sort((a, b) => a.studentName.localeCompare(b.studentName, "ar"));
  }, [studentRoster, selectedClass]);

  // التلاميذ المصفين بالبحث
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.trim().toLowerCase();
    return classStudents.filter((st) => st.studentName.toLowerCase().includes(q));
  }, [classStudents, searchQuery]);

  // إحصائيات سريعة للفوج
  const classStats = useMemo(() => {
    if (classStudents.length === 0) return { avg: "0.00", count: 0, above10: 0, missingTotal: 0 };
    let sum = 0;
    let above10 = 0;
    let missingTotal = 0;

    classStudents.forEach((st) => {
      const rec = getRecord(st.studentName);
      const score = rec.continuousScore ?? 0;
      sum += score;
      if (score >= 10) above10++;

      // عد الخانات باللون الأحمر (لم يحضر)
      if (rec.customScores) {
        Object.keys(rec.customScores).forEach((k) => {
          if (k.startsWith("missing_") && rec.customScores![k] === 1) {
            missingTotal++;
          }
        });
      }
    });

    return {
      avg: (sum / classStudents.length).toFixed(2),
      count: classStudents.length,
      above10,
      missingTotal,
    };
  }, [classStudents, getRecord]);

  if (authenticated === false) {
    return <LoginRequired next="/eval/continuous" title="دفتر التقويم المستمر الصفي" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28 font-sans antialiased" dir="rtl">
      {/* ─── الشريط العلوي الثابت ─── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* زر العودة وعنوان الصفحة */}
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/eval"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center shrink-0"
              title="العودة إلى جدول رصد النقاط والمعدل"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm font-black text-slate-900 flex items-center gap-1.5 truncate">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>دفتر التقويم المستمر الميداني</span>
                </h1>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  تنقيط صفي مرن
                </span>
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                تعديل وحرية الأعمدة • الافتراضي 0 • رصد الواجبات والكراريس باللون الأحمر
              </p>
            </div>
          </div>

          {/* مؤشر الحفظ والأزرار الإجرائية */}
          <div className="flex items-center gap-2 shrink-0">
            {saveStatus === "saving" && (
              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                <span>جارٍ الحفظ...</span>
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>محفوظ تلقائياً</span>
              </span>
            )}

            {/* زر فتح إدارة وتخصيص الأعمدة */}
            <button
              type="button"
              onClick={() => setIsColumnModalOpen(true)}
              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              title="إدارة وتعديل أعمدة التقويم المستمر"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-300" />
              <span>تخصيص الأعمدة ({columns.length})</span>
            </button>

            <Link
              href="/eval"
              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">جدول الرصد الفصلي</span>
              <span className="sm:hidden">الرصد</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── الحاوية الرئيسية ─── */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 space-y-3.5">
        {/* شريط اختيار الفوج والفصل والإحصائيات */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* أزرار الأفواج */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 ml-1">اختر الفوج:</span>
              {customClasses.map((cls) => {
                const isActive = selectedClass === cls;
                return (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      isActive
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {cls}
                  </button>
                );
              })}
            </div>

            {/* أزرار الفصول */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[1, 2, 3].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTrimester(t as 1 | 2 | 3)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    selectedTrimester === t
                      ? "bg-white text-emerald-900 shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ف{t}
                </button>
              ))}
            </div>

            {/* مربع البحث عن تلميذ */}
            <div className="relative flex-1 sm:flex-initial sm:min-w-[200px]">
              <input
                type="text"
                placeholder="ابحث عن اسم تلميذ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-1.5 pr-8 pl-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* شريط الإحصائيات والمعدل الفوجي */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold">
                عدد التلاميذ: <strong className="text-slate-900">{classStats.count}</strong>
              </span>
              <span>•</span>
              <span>
                معدل التقويم الفوجي:{" "}
                <strong className="text-emerald-700 font-mono font-black text-sm">
                  {classStats.avg} / 20
                </strong>
              </span>
              <span>•</span>
              <span>
                الحاصلون على ≥ 10:{" "}
                <strong className="text-emerald-800">
                  {classStats.above10} من {classStats.count}
                </strong>
              </span>
              {classStats.missingTotal > 0 && (
                <>
                  <span>•</span>
                  <span className="text-red-700 font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span>🔴 لم يحضروا الواجب / الكراس:</span>
                    <strong>{classStats.missingTotal} حالة</strong>
                  </span>
                </>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
              <span>مجموع نقاط الأعمدة: <strong className="font-mono text-slate-800">{totalMaxScore}ن</strong></span>
              {totalMaxScore !== 20 && (
                <span className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  تحويل آلي دقيق لـ 20/20
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
           الجدول الأساسي المرن للتقويم والتنقيط الميداني
           ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-800 font-black border-b border-slate-200 text-center">
                  <th className="py-3 px-2 w-9 border-l border-slate-200/80">#</th>
                  <th className="py-3 px-3 min-w-[150px] text-right sticky right-0 bg-slate-100 z-20 border-l border-slate-200/80 shadow-xs">
                    اسم التلميذ
                  </th>

                  {/* أعمدة التقويم المرنة */}
                  {columns.map((col, cIdx) => (
                    <th
                      key={col.id}
                      className="py-2.5 px-2 min-w-[110px] border-l border-slate-200/80 bg-slate-50/70"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-slate-900 text-xs truncate">
                            {col.title}
                          </span>
                          <span className="font-mono text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                            ({col.maxScore}ن)
                          </span>
                        </div>

                        {/* أزرار سريعة للعمود بالكامل */}
                        <div className="flex items-center justify-center gap-1 pt-1 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => handleBatchColumnAction(col.id, "set_max")}
                            className="text-[9px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded transition"
                            title={`وضع العلامة الكاملة (${col.maxScore}) لكل من أحضر`}
                          >
                            ✓ الكل أحضر
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBatchColumnAction(col.id, "mark_all_missing")}
                            className="text-[9px] bg-red-100 hover:bg-red-200 text-red-800 font-bold px-1.5 py-0.5 rounded transition"
                            title="تحديد الكل كـ (لم يحضر) باللون الأحمر"
                          >
                            🔴 لم يحضر
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBatchColumnAction(col.id, "set_zero")}
                            className="text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-700 px-1 py-0.5 rounded transition"
                            title="تصفير هذا العمود (0)"
                          >
                            0
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}

                  {/* عمود الرصيد الإضافي */}
                  <th className="py-2.5 px-2 text-center min-w-[80px] border-l border-slate-200/80 bg-amber-50/60 text-amber-950 font-black">
                    <div>إضافي (+/-)</div>
                    <span className="text-[10px] text-amber-700 font-normal">حصص</span>
                  </th>

                  {/* عمود المجموع النهائي من 20 */}
                  <th className="py-2.5 px-3 text-center min-w-[95px] bg-emerald-50 text-emerald-950 font-black">
                    <div>المجموع</div>
                    <span className="text-[10px] text-emerald-700 font-bold">(من 20.0)</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 3} className="py-12 text-center text-slate-400">
                      {searchQuery ? "لا يوجد تلميذ مطابق لنتائج البحث" : "لا يوجد تلاميذ مسجلين في هذا الفوج"}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, idx) => {
                    const rec = getRecord(st.studentName);
                    const isLastEdited = lastEditedStudent === st.studentName;
                    const finalScore = rec.continuousScore ?? 0;

                    return (
                      <tr
                        key={st.id || st.studentName}
                        className={`transition hover:bg-slate-50/90 ${
                          isLastEdited ? "bg-emerald-50/40" : ""
                        }`}
                      >
                        {/* الرقم الترتيبي */}
                        <td className="py-2 px-2 text-center text-slate-400 font-bold border-l border-slate-100">
                          {idx + 1}
                        </td>

                        {/* اسم التلميذ مثبت على اليمين */}
                        <td className="py-2 px-3 font-black text-slate-900 sticky right-0 bg-white z-10 border-l border-slate-200/80 shadow-2xs">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate">{st.studentName}</span>
                            {st.groupName && (
                              <span className="text-[10px] text-slate-400 font-normal shrink-0">
                                ({st.groupName})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* خلايا الأعمدة الديناميكية */}
                        {columns.map((col) => {
                          const customScores = rec.customScores || {};
                          const currentScore = customScores[col.id] ?? 0;
                          const isMissing = customScores[`missing_${col.id}`] === 1;

                          return (
                            <td
                              key={col.id}
                              className={`py-1.5 px-1.5 text-center border-l border-slate-100 transition ${
                                isMissing
                                  ? "bg-red-50/90 border-red-300"
                                  : currentScore > 0
                                  ? "bg-emerald-50/20"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1">
                                {/* حقل إدخال النقطة */}
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.25"
                                  min="0"
                                  max={col.maxScore}
                                  value={currentScore}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    handleColumnScoreChange(
                                      st.studentName,
                                      col.id,
                                      isNaN(val) ? 0 : Math.min(col.maxScore, Math.max(0, val)),
                                      false
                                    );
                                  }}
                                  className={`w-11 text-center py-1 rounded-lg text-xs font-black transition ${
                                    isMissing
                                      ? "bg-red-100 text-red-900 border border-red-300 focus:bg-white focus:ring-red-400"
                                      : currentScore > 0
                                      ? "bg-emerald-50 text-emerald-900 border border-emerald-300 focus:bg-white"
                                      : "bg-slate-50 text-slate-700 border border-slate-200 focus:bg-white focus:border-emerald-500"
                                  } focus:outline-hidden focus:ring-2`}
                                />

                                {/* زر الذكاء: تبديل حالة الإحضار (أخضر أحضر / أحمر لم يحضر) */}
                                <div className="flex flex-col gap-0.5">
                                  {/* زر أحضر الواجب (العلامة الكاملة بنقرة واحدة) */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleColumnScoreChange(
                                        st.studentName,
                                        col.id,
                                        col.maxScore,
                                        false
                                      )
                                    }
                                    className={`w-5 h-5 rounded flex items-center justify-center text-[10px] transition cursor-pointer ${
                                      currentScore === col.maxScore && !isMissing
                                        ? "bg-emerald-600 text-white font-bold"
                                        : "bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800"
                                    }`}
                                    title={`أحضر وأنجز المطلوب (${col.maxScore}ن)`}
                                  >
                                    ✓
                                  </button>

                                  {/* زر لم يُحضر (اللون الأحمر التنبيهي لمطالبته به) */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleColumnScoreChange(
                                        st.studentName,
                                        col.id,
                                        0,
                                        !isMissing
                                      )
                                    }
                                    className={`w-5 h-5 rounded flex items-center justify-center text-[9px] transition cursor-pointer ${
                                      isMissing
                                        ? "bg-red-600 text-white font-black animate-pulse"
                                        : "bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-700"
                                    }`}
                                    title="تحديد كـ (لم يحضر) باللون الأحمر لمطالبته بإحضاره"
                                  >
                                    🔴
                                  </button>
                                </div>
                              </div>

                              {/* وسم حالة لم يحضر */}
                              {isMissing && (
                                <span className="block text-[9px] font-black text-red-700 mt-0.5 leading-none">
                                  لم يُحضر ⚠️
                                </span>
                              )}
                            </td>
                          );
                        })}

                        {/* عمود الرصيد الإضافي (+ / -) */}
                        <td className="py-1.5 px-1 text-center border-l border-slate-100 bg-amber-50/20">
                          <div className="flex items-center justify-center gap-1">
                            <span
                              className={`font-mono text-xs font-black min-w-[24px] ${
                                (rec.bonusPoints || 0) > 0
                                  ? "text-emerald-700 font-extrabold"
                                  : (rec.bonusPoints || 0) < 0
                                  ? "text-rose-700 font-extrabold"
                                  : "text-slate-400"
                              }`}
                            >
                              {(rec.bonusPoints || 0) > 0 ? `+${rec.bonusPoints}` : rec.bonusPoints || 0}
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleBonusChange(st.studentName, 0.5)}
                                className="w-4 h-3.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[9px] font-bold flex items-center justify-center"
                                title="إضافة +0.5"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBonusChange(st.studentName, -0.5)}
                                className="w-4 h-3.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[9px] font-bold flex items-center justify-center"
                                title="خصم -0.5"
                              >
                                -
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* عمود المجموع النهائي المحسوب بدقة من 20 */}
                        <td className="py-2 px-2 text-center bg-emerald-50/60 font-mono font-black text-xs">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black shadow-2xs ${
                              finalScore >= 15
                                ? "bg-emerald-600 text-white"
                                : finalScore >= 10
                                ? "bg-teal-600 text-white"
                                : finalScore >= 8
                                ? "bg-amber-500 text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            {finalScore.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── بطاقة التوجيه السريع للاستخدام ─── */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span>إرشادات التنقيط السريع والميداني في القسم:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <strong className="text-emerald-800 block mb-0.5">✓ التنقيط بنقرة واحدة:</strong>
              اضغط على رمز (✓) لمن أحضر الواجب أو الكراس لأخذ العلامة كاملة مباشرة، أو اكتب علامة مخصصة في المربع.
            </div>
            <div className="p-2.5 rounded-xl bg-red-50/60 border border-red-200">
              <strong className="text-red-800 block mb-0.5">🔴 متابعة من لم يُحضر:</strong>
              اضغط على رمز (🔴) لمن لم يحضر الواجب؛ ستتحول الخانة إلى لون أحمر تنبيهي لتطالبه بإحضاره في الحصة المقبلة.
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200">
              <strong className="text-indigo-800 block mb-0.5">⚙️ حرية الأعمدة والحساب:</strong>
              يمكنك زيادة أو إنقاص أو تعديل مسميات الأعمدة كما تشاء، والمنظومة تتكفل بحساب علامة 20/20 الدقيقة ومزامنتها تلقائياً.
            </div>
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════
         نافذة تخصيص وإدارة الأعمدة (إضافة / تعديل / حذف / نماذج)
         ══════════════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════════
         نافذة تخصيص وإدارة الأعمدة (موسعة ومتجاوبة مع جميع الشاشات)
         ══════════════════════════════════════════════════════════════ */}
      {isColumnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl lg:max-w-4xl w-full shadow-2xl border border-slate-200 text-right flex flex-col max-h-[92vh] sm:max-h-[88vh] my-auto overflow-hidden">
            {/* رأس النافذة المثبت (Sticky Header) */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/90">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                  <Sliders className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    إدارة وتخصيص أعمدة التقويم المستمر
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                    فوج: <strong className="text-slate-800">{selectedClass}</strong> • الفصل الدراسي: <strong className="text-slate-800">ف{selectedTrimester}</strong> • عدد الأعمدة: <strong className="text-emerald-700">{columns.length}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsColumnModalOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition cursor-pointer"
                title="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* محتوى النافذة القابل للتمرير بسلاسة (Scrollable Body) */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* قسم 1: النماذج المعيارية الجاهزة (شبكة أفقية متجاوبة) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <span>نماذج معيارية جاهزة بضغطة زر:</span>
                  </label>
                  <span className="text-[11px] text-slate-500">اختر نموذجاً لتطبيقه مباشرة</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
                  {COLUMN_PRESETS.map((p, pIdx) => (
                    <div
                      key={pIdx}
                      className="p-3 sm:p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/60 hover:border-emerald-300 text-right transition flex flex-col justify-between gap-3 group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black text-slate-900 group-hover:text-emerald-800 transition">
                            {p.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {p.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyPreset(p.columns)}
                        className="w-full py-1.5 px-3 rounded-xl bg-white border border-slate-200 group-hover:bg-emerald-600 group-hover:border-emerald-600 group-hover:text-white text-emerald-800 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>تطبيق هذا النموذج</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* قسم 2: تعديل عمود نشط إن تم النقر عليه */}
              {editingColumn && (
                <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl space-y-3 animate-fade-in shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-1.5">
                      <Edit2 className="w-4 h-4 text-amber-700" />
                      <span>تعديل العمود: <strong className="underline">{editingColumn.title}</strong></span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingColumn(null)}
                      className="text-amber-700 hover:text-amber-900 text-xs font-bold cursor-pointer"
                    >
                      إلغاء التعديل
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-amber-900 block mb-1">اسم أو عنوان العمود:</label>
                      <input
                        type="text"
                        value={editingColumn.title}
                        onChange={(e) => setEditingColumn({ ...editingColumn, title: e.target.value })}
                        placeholder="عنوان العمود"
                        className="w-full p-2.5 rounded-xl border border-amber-300 text-xs sm:text-sm bg-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-amber-900 block mb-1">العلامة القصوى:</label>
                      <input
                        type="number"
                        min="0.5"
                        max="20"
                        step="0.5"
                        value={editingColumn.maxScore}
                        onChange={(e) =>
                          setEditingColumn({
                            ...editingColumn,
                            maxScore: parseFloat(e.target.value) || 1,
                          })
                        }
                        placeholder="النقاط القصوى"
                        className="w-full p-2.5 rounded-xl border border-amber-300 text-xs sm:text-sm bg-white font-mono font-bold text-center focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingColumn(null)}
                      className="px-4 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditColumn}
                      className="px-5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-xs transition cursor-pointer"
                    >
                      حفظ التعديل وتحديث الجدول
                    </button>
                  </div>
                </div>
              )}

              {/* قسم 3: الأعمدة المعتمدة حالياً (شبكة متجاوبة 2 أعمدة) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <span>الأعمدة المعتمدة حالياً في الجدول ({columns.length}):</span>
                  </label>
                  <span className="text-[11px] text-slate-500">يمكنك تعديل اسم أي عمود أو حذفه</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {columns.map((col, idx) => (
                    <div
                      key={col.id}
                      className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs flex items-center justify-between gap-3 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-xl bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-black text-slate-900 block truncate">
                            {col.title}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-700 font-bold">
                            العلامة القصوى: {col.maxScore}ن
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingColumn({ ...col })}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                          title="تعديل هذا العمود"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteColumn(col.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="حذف هذا العمود من الجدول"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* قسم 4: إضافة عمود جديد */}
              <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-2.5">
                <label className="text-xs sm:text-sm font-black text-slate-800 block">
                  إضافة عمود مخصص جديد إلى جدول الرصد:
                </label>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    placeholder="اسم العمود (مثلاً: واجب 3، نشاط صفي، مشروع، تلخيص...)"
                    value={newColTitle}
                    onChange={(e) => setNewColTitle(e.target.value)}
                    className="flex-1 py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <div className="flex items-center gap-1.5 shrink-0 justify-between sm:justify-start">
                    <span className="text-xs text-slate-600 font-bold">النقاط القصوى:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="20"
                      step="0.5"
                      value={newColMax}
                      onChange={(e) => setNewColMax(parseFloat(e.target.value) || 1)}
                      className="w-16 py-2 text-center rounded-xl border border-slate-200 text-xs sm:text-sm font-mono font-bold bg-white"
                    />
                    <span className="text-xs text-slate-600 font-bold">ن</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddColumn}
                    disabled={!newColTitle.trim()}
                    className="py-2.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-black text-xs sm:text-sm shrink-0 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة العمود</span>
                  </button>
                </div>
              </div>
            </div>

            {/* تذييل النافذة المثبت (Sticky Footer) */}
            <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 shrink-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-bold text-slate-600">
                  المجموع الحالي: <strong className="font-mono text-slate-900 text-sm font-black">{totalMaxScore}ن</strong>
                </span>
                {totalMaxScore === 20 ? (
                  <span className="text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>المجموع 20/20 مطابق تماماً للشبكة الرسمية</span>
                  </span>
                ) : (
                  <span className="text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1">
                    <span>💡 تحويل آلي نسبي دقيق لـ 20/20 في شبكة الرصد</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsColumnModalOpen(false)}
                className="py-2 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-black transition cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <span>تم والعودة للجدول</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
