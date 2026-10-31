"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Save,
  CheckCircle2,
  Smartphone,
  Sparkles,
  Search,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  LayoutList,
  UserCheck,
  TrendingUp,
  Filter,
} from "lucide-react";
import {
  OfficialGradeRecord,
  StudentRosterItem,
  LessonsData,
  ContinuousCriterion,
  OFFICIAL_MINISTERIAL_CRITERIA,
  sortClasses,
} from "@/lib/types";

// المعايير البيداغوجية الرسمية المعتمدة
const CRITERIA_ITEMS: Array<{
  key: keyof OfficialGradeRecord;
  name: string;
  max: number;
  icon: string;
  quickValues: number[];
  color: string;
}> = [
  {
    key: "behaviorScore",
    name: "المشاركة والسلوك والانضباط",
    max: 4,
    icon: "🙋‍♂️",
    quickValues: [4, 3.5, 3, 2.5, 2, 1, 0],
    color: "emerald",
  },
  {
    key: "notebook1Score",
    name: "كراس التلميذ: المقطع 1",
    max: 2,
    icon: "📖",
    quickValues: [2, 1.5, 1, 0.5, 0],
    color: "sky",
  },
  {
    key: "notebook2Score",
    name: "كراس التلميذ: المقطع 2",
    max: 2,
    icon: "📖",
    quickValues: [2, 1.5, 1, 0.5, 0],
    color: "indigo",
  },
  {
    key: "homework1Score",
    name: "الوظيفة المنزلية 1",
    max: 2,
    icon: "📝",
    quickValues: [2, 1.5, 1, 0.5, 0],
    color: "amber",
  },
  {
    key: "homework2Score",
    name: "الوظيفة المنزلية 2",
    max: 2,
    icon: "📝",
    quickValues: [2, 1.5, 1, 0.5, 0],
    color: "orange",
  },
  {
    key: "quiz1Score",
    name: "الاستجواب الكتابي 1",
    max: 4,
    icon: "✍️",
    quickValues: [4, 3.5, 3, 2.5, 2, 1, 0],
    color: "purple",
  },
  {
    key: "quiz2Score",
    name: "الاستجواب الكتابي 2",
    max: 4,
    icon: "✍️",
    quickValues: [4, 3.5, 3, 2.5, 2, 1, 0],
    color: "rose",
  },
];

export default function ContinuousEvalMobilePage() {
  // حالة المصادقة والتحميل
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // الفوج والفصل
  const [customClasses, setCustomClasses] = useState<string[]>(["1م1", "1م2", "1م3", "2م3"]);
  const [selectedClass, setSelectedClass] = useState<string>("1م1");
  const [selectedTrimester, setSelectedTrimester] = useState<1 | 2 | 3>(1);
  const [studentRoster, setStudentRoster] = useState<StudentRosterItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // سجلات النقاط: مفتاحها `${className}_${studentName}_T${trimester}`
  const [records, setRecords] = useState<Record<string, OfficialGradeRecord>>({});

  // نمط العرض: "single" (معيار واحد سريع للهاتف) أو "grid" (جدول المعايير الكامل)
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");

  // المعيار النشط حالياً في نمط الهاتف الفردي (الافتراضي: المشاركة أو الواجب)
  const [activeCriterionKey, setActiveCriterionKey] = useState<string>("behaviorScore");

  // بطاقة تفصيل التلميذ المفتوحة (Accordion)
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // مؤقت الحفظ التلقائي
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // حساب علامة التقويم الإجمالية من 20
  const computeStudentTotal = useCallback((rec: Partial<OfficialGradeRecord>): number => {
    const beh = rec.behaviorScore ?? 4;
    const nb1 = rec.notebook1Score ?? 2;
    const nb2 = rec.notebook2Score ?? 2;
    const hw1 = rec.homework1Score ?? 2;
    const hw2 = rec.homework2Score ?? 2;
    const q1 = rec.quiz1Score ?? 4;
    const q2 = rec.quiz2Score ?? 4;
    const bonus = rec.bonusPoints || 0;
    const total = beh + nb1 + nb2 + hw1 + hw2 + q1 + q2 + bonus;
    return Math.min(20, Math.max(0, Math.round(total * 10) / 10));
  }, []);

  // دالة جلب سجل تلميذ محدد
  const getRecord = useCallback(
    (studentName: string): OfficialGradeRecord => {
      const key = `${selectedClass.replace(/\s+/g, "")}_${studentName.trim()}_T${selectedTrimester}`;
      const existing = records[key];
      if (existing) return existing;

      return {
        studentName,
        className: selectedClass,
        trimester: selectedTrimester,
        continuousScore: 20,
        behaviorScore: 4,
        notebook1Score: 2,
        notebook2Score: 2,
        homework1Score: 2,
        homework2Score: 2,
        quiz1Score: 4,
        quiz2Score: 4,
        bonusPoints: 0,
      };
    },
    [records, selectedClass, selectedTrimester]
  );

  // حفظ التغييرات إلى السيرفر والكاش
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

  // تحديث حقل لتلميذ
  const handleScoreChange = useCallback(
    (studentName: string, field: keyof OfficialGradeRecord, value: number) => {
      setRecords((prev) => {
        const key = `${selectedClass.replace(/\s+/g, "")}_${studentName.trim()}_T${selectedTrimester}`;
        const current = prev[key] || {
          studentName,
          className: selectedClass,
          trimester: selectedTrimester,
          continuousScore: 20,
          behaviorScore: 4,
          notebook1Score: 2,
          notebook2Score: 2,
          homework1Score: 2,
          homework2Score: 2,
          quiz1Score: 4,
          quiz2Score: 4,
          bonusPoints: 0,
        };

        const updated: OfficialGradeRecord = {
          ...current,
          [field]: value,
        };

        // إعادة حساب المجموع الإجمالي
        updated.continuousScore = computeStudentTotal(updated);
        updated.updatedAt = new Date().toISOString();

        const next = { ...prev, [key]: updated };
        triggerAutoSave(next);
        return next;
      });
    },
    [selectedClass, selectedTrimester, computeStudentTotal, triggerAutoSave]
  );

  // زيادة أو إنقاص نقاط إضافية صفيّة بلمسة واحدة
  const handleBonusChange = useCallback(
    (studentName: string, delta: number) => {
      setRecords((prev) => {
        const key = `${selectedClass.replace(/\s+/g, "")}_${studentName.trim()}_T${selectedTrimester}`;
        const current = prev[key] || {
          studentName,
          className: selectedClass,
          trimester: selectedTrimester,
          continuousScore: 20,
          behaviorScore: 4,
          notebook1Score: 2,
          notebook2Score: 2,
          homework1Score: 2,
          homework2Score: 2,
          quiz1Score: 4,
          quiz2Score: 4,
          bonusPoints: 0,
        };

        const newBonus = Math.round(((current.bonusPoints || 0) + delta) * 10) / 10;
        const updated: OfficialGradeRecord = {
          ...current,
          bonusPoints: newBonus,
        };
        updated.continuousScore = computeStudentTotal(updated);
        updated.updatedAt = new Date().toISOString();

        const next = { ...prev, [key]: updated };
        triggerAutoSave(next);
        return next;
      });
    },
    [selectedClass, selectedTrimester, computeStudentTotal, triggerAutoSave]
  );

  // وضع العلامة الكاملة لجميع تلاميذ الفوج في المعيار النشط
  const handleSetMaxForCriterion = useCallback(
    (field: keyof OfficialGradeRecord, maxValue: number) => {
      setRecords((prev) => {
        const next = { ...prev };
        studentRoster
          .filter((s) => (s.className || "").replace(/\s+/g, "") === selectedClass.replace(/\s+/g, ""))
          .forEach((st) => {
            const key = `${selectedClass.replace(/\s+/g, "")}_${st.studentName.trim()}_T${selectedTrimester}`;
            const current = next[key] || {
              studentName: st.studentName,
              className: selectedClass,
              trimester: selectedTrimester,
              continuousScore: 20,
              behaviorScore: 4,
              notebook1Score: 2,
              notebook2Score: 2,
              homework1Score: 2,
              homework2Score: 2,
              quiz1Score: 4,
              quiz2Score: 4,
              bonusPoints: 0,
            };

            const updated: OfficialGradeRecord = {
              ...current,
              [field]: maxValue,
            };
            updated.continuousScore = computeStudentTotal(updated);
            updated.updatedAt = new Date().toISOString();
            next[key] = updated;
          });

        triggerAutoSave(next);
        return next;
      });
    },
    [studentRoster, selectedClass, selectedTrimester, computeStudentTotal, triggerAutoSave]
  );

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
    if (classStudents.length === 0) return { avg: "0.00", count: 0, above10: 0 };
    let sum = 0;
    let above10 = 0;
    classStudents.forEach((st) => {
      const rec = getRecord(st.studentName);
      const score = rec.continuousScore ?? 20;
      sum += score;
      if (score >= 10) above10++;
    });
    return {
      avg: (sum / classStudents.length).toFixed(2),
      count: classStudents.length,
      above10,
    };
  }, [classStudents, getRecord]);

  // المعيار النشط الحالي
  const activeCriterion = useMemo(() => {
    return CRITERIA_ITEMS.find((c) => c.key === activeCriterionKey) || CRITERIA_ITEMS[0];
  }, [activeCriterionKey]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans antialiased" dir="rtl">
      {/* ─── الشريط العلوي الثابت ─── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* زر العودة وعنوان الصفحة */}
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/eval"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center shrink-0"
              title="العودة إلى جدول رصد النقاط والمعدل"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1">
                  <span>📱</span> دفتر التقويم المستمر
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  تنقيط صفي يومي
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                وضع النقاط فقط • مزامنة تلقائية مع جدول الرصد
              </p>
            </div>
          </div>

          {/* حالة الحفظ وزر التبديل لجدول الرصد */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium">
              {saveStatus === "saving" ? (
                <span className="flex items-center gap-1 text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                  جارِ الحفظ...
                </span>
              ) : saveStatus === "saved" ? (
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  تم الحفظ
                </span>
              ) : (
                <span className="text-slate-400 text-[11px]">محفوظ تلقائياً</span>
              )}
            </div>

            <Link
              href="/eval"
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition shadow-sm"
            >
              <span>جدول الرصد الفصلي</span>
              <TableIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─── الحاوية الرئيسية ─── */}
      <main className="max-w-4xl mx-auto px-3 py-3 space-y-3">
        {/* ─── 1. شريط اختيار الفوج والفصل الدراسي ─── */}
        <section className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-2.5">
          {/* اختيار الفوج كأزرار لمس كبيرة وسريعة */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-1.5 px-0.5">
              <span>اختر الفوج التربوي:</span>
              <span className="text-emerald-700 font-black">
                {classStudents.length} تلميذاً مسجلاً
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {customClasses.map((cls) => {
                const isSelected = selectedClass === cls;
                return (
                  <button
                    key={cls}
                    onClick={() => {
                      setSelectedClass(cls);
                      setExpandedStudent(null);
                    }}
                    className={`px-4 py-2 rounded-xl font-black text-sm transition-all shrink-0 active:scale-95 ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/20"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {cls}
                  </button>
                );
              })}
            </div>
          </div>

          {/* اختيار الفصل الدراسي والبحث السريع */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            {/* أزرار الفصول */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              {([1, 2, 3] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTrimester(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    selectedTrimester === t
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ف{t}
                </button>
              ))}
            </div>

            {/* مربع البحث عن تلميذ */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن اسم تلميذ..."
                className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* زر تبديل نمط العرض (فردي / جدول) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setViewMode("single")}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === "single"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="نمط المعيار الفردي السريع للهاتف"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === "grid"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="نمط جدول المعايير الشامل"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ─── 2. في نمط الهاتف الفردي: شريط اختيار المعيار ─── */}
        {viewMode === "single" && (
          <section className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>ماذا تريد تنقيطه الآن؟</span>
              <button
                onClick={() =>
                  handleSetMaxForCriterion(
                    activeCriterion.key,
                    activeCriterion.max
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] flex items-center gap-1 transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>وضع {activeCriterion.max}/{activeCriterion.max} للجميع</span>
              </button>
            </div>

            {/* أزرار المعايير السبعة كشريط أفقي مريح */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {CRITERIA_ITEMS.map((item) => {
                const isActive = activeCriterionKey === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveCriterionKey(item.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isActive
                          ? "bg-emerald-700 text-emerald-100"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {item.max}ن
                    </span>
                  </button>
                );
              })}

              {/* زر رصيد النقاط الإضافية */}
              <button
                onClick={() => setActiveCriterionKey("bonusPoints")}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
                  activeCriterionKey === "bonusPoints"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                <span>⚡</span>
                <span>نقاط إضافية (+/-)</span>
              </button>
            </div>
          </section>
        )}

        {/* ─── 3. شريط إحصائي مصغر ─── */}
        <div className="flex items-center justify-between px-2 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              معدل التقويم الفوجي:{" "}
              <strong className="text-emerald-700 font-black">
                {classStats.avg} / 20
              </strong>
            </span>
            <span>
              الحاصلون على ≥ 10:{" "}
              <strong className="text-slate-800 font-bold">
                {classStats.above10} من {classStats.count}
              </strong>
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {classStudents.length} تلميذ
          </span>
        </div>

        {/* ─── 4. قائمة التلاميذ ─── */}
        {classStudents.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 space-y-2">
            <p className="font-bold text-sm">لا توجد أسماء تلاميذ مسجلة في الفوج {selectedClass}</p>
            <p className="text-xs text-slate-400">
              يمكنك استيراد أو إضافة التلاميذ من صفحة إدارة التلاميذ.
            </p>
            <Link
              href="/admin/students"
              className="inline-block px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
            >
              إدارة قوائم التلاميذ
            </Link>
          </div>
        ) : viewMode === "single" ? (
          /* ══════════════════════════════════════════════════════════════
             النمط الفردي السريع للهاتف (Cards View)
             ══════════════════════════════════════════════════════════════ */
          <div className="space-y-2">
            {filteredStudents.map((st, index) => {
              const rec = getRecord(st.studentName);
              const currentScore =
                activeCriterionKey === "bonusPoints"
                  ? rec.bonusPoints || 0
                  : (rec[activeCriterion.key] as number) ?? activeCriterion.max;

              const isExpanded = expandedStudent === st.studentName;

              return (
                <div
                  key={st.id || st.studentName}
                  className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all space-y-2.5"
                >
                  {/* رأس بطاقة التلميذ: الاسم ورقم الترتيب والمجموع الكلي */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-black text-sm text-slate-900 truncate">
                        {st.studentName}
                      </span>
                      {rec.bonusPoints ? (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            rec.bonusPoints > 0
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {rec.bonusPoints > 0 ? `+${rec.bonusPoints}` : rec.bonusPoints}
                        </span>
                      ) : null}
                    </div>

                    {/* المجموع الإجمالي المحسوب */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block leading-tight">
                          المجموع الكلي
                        </span>
                        <span
                          className={`text-sm font-black ${
                            rec.continuousScore >= 10
                              ? "text-emerald-700"
                              : "text-rose-600"
                          }`}
                        >
                          {rec.continuousScore?.toFixed(1) || "20.0"}{" "}
                          <span className="text-[10px] text-slate-400">/20</span>
                        </span>
                      </div>

                      {/* زر فتح بقية المعايير لهذا التلميذ */}
                      <button
                        onClick={() =>
                          setExpandedStudent(isExpanded ? null : st.studentName)
                        }
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                        title="عرض كامل علامات التلميذ"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* أزرار التنقيط السريع للمعيار النشط (لمسة واحدة بالأصبع) */}
                  {activeCriterionKey === "bonusPoints" ? (
                    // تنقيط الرصيد الإضافي (+ / -)
                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-500">
                        الرصيد الصفي:{" "}
                        <strong className="text-amber-700">
                          {rec.bonusPoints || 0} ن
                        </strong>
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleBonusChange(st.studentName, +1)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-black transition active:scale-95"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleBonusChange(st.studentName, +0.5)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black transition active:scale-95"
                        >
                          +0.5
                        </button>
                        <button
                          onClick={() => handleBonusChange(st.studentName, -0.5)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black transition active:scale-95"
                        >
                          -0.5
                        </button>
                        <button
                          onClick={() => handleBonusChange(st.studentName, -1)}
                          className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-black transition active:scale-95"
                        >
                          -1
                        </button>
                        {rec.bonusPoints !== 0 && (
                          <button
                            onClick={() =>
                              handleScoreChange(st.studentName, "bonusPoints", 0)
                            }
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                            title="تصفير الرصيد الإضافي"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    // تنقيط المعيار العادي (أزرار سريعة ومربع رقمي)
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                        {activeCriterion.quickValues.map((val) => {
                          const isSelected = currentScore === val;
                          return (
                            <button
                              key={val}
                              onClick={() =>
                                handleScoreChange(
                                  st.studentName,
                                  activeCriterion.key,
                                  val
                                )
                              }
                              className={`px-3 py-1.5 rounded-xl font-black text-xs transition active:scale-95 shrink-0 ${
                                isSelected
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>

                      {/* إدخال رقمي مباشر إن أراد الأستاذ قيمة كسرية دقيقة */}
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.25"
                          min="0"
                          max={activeCriterion.max}
                          value={currentScore}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            handleScoreChange(
                              st.studentName,
                              activeCriterion.key,
                              isNaN(v) ? 0 : Math.min(activeCriterion.max, Math.max(0, v))
                            );
                          }}
                          className="w-14 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                        />
                        <span className="text-[10px] text-slate-400">
                          /{activeCriterion.max}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* تفصيل جميع المعايير للتلميذ عند النقر على السهم */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-200/80 mt-2 bg-slate-50/70 -mx-3 -mb-3 p-3 rounded-b-2xl space-y-2">
                      <div className="text-[11px] font-black text-slate-600 mb-1">
                        جميع جزئيات تقويم {st.studentName}:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {CRITERIA_ITEMS.map((item) => {
                          const val = (rec[item.key] as number) ?? item.max;
                          return (
                            <div
                              key={item.key}
                              className="bg-white p-2 rounded-xl border border-slate-200/80 flex items-center justify-between"
                            >
                              <div className="truncate min-w-0 pr-1">
                                <span className="text-[11px] font-bold text-slate-700 block truncate">
                                  {item.icon} {item.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  من {item.max}ن
                                </span>
                              </div>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.5"
                                min="0"
                                max={item.max}
                                value={val}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  handleScoreChange(
                                    st.studentName,
                                    item.key,
                                    isNaN(v) ? 0 : Math.min(item.max, Math.max(0, v))
                                  );
                                }}
                                className="w-12 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-800 focus:bg-white focus:outline-hidden"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════
             نمط الجدول الشامل (Full Criteria Matrix Grid)
             ══════════════════════════════════════════════════════════════ */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-black border-b border-slate-200">
                    <th className="py-2.5 px-2 text-center w-8">#</th>
                    <th className="py-2.5 px-3 min-w-[130px] sticky right-0 bg-slate-100 z-10">
                      اسم التلميذ
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]">
                      مشاركة (4)
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]">
                      كراس 1 (2)
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]">
                      كراس 2 (2)
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]">
                      وظيفة 1 (2)
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]">
                      وظيفة 2 (2)
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]">
                      استجواب 1 (4)
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[65px]">
                      استجواب 2 (4)
                    </th>
                    <th className="py-2.5 px-2 text-center min-w-[55px]">
                      إضافي (+/-)
                    </th>
                    <th className="py-2.5 px-3 text-center min-w-[75px] bg-emerald-50 text-emerald-900">
                      المجموع (20)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((st, idx) => {
                    const rec = getRecord(st.studentName);
                    return (
                      <tr
                        key={st.id || st.studentName}
                        className="hover:bg-slate-50/80 transition"
                      >
                        <td className="py-2 px-2 text-center text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-black text-slate-900 sticky right-0 bg-white z-10 shadow-xs">
                          {st.studentName}
                        </td>

                        {/* مشاركة */}
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min="0"
                            max="4"
                            value={rec.behaviorScore ?? 4}
                            onChange={(e) =>
                              handleScoreChange(
                                st.studentName,
                                "behaviorScore",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-12 text-center py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
                          />
                        </td>

                        {/* كراس 1 */}
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min="0"
                            max="2"
                            value={rec.notebook1Score ?? 2}
                            onChange={(e) =>
                              handleScoreChange(
                                st.studentName,
                                "notebook1Score",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-12 text-center py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
                          />
                        </td>

                        {/* كراس 2 */}
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min="0"
                            max="2"
                            value={rec.notebook2Score ?? 2}
                            onChange={(e) =>
                              handleScoreChange(
                                st.studentName,
                                "notebook2Score",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-12 text-center py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
                          />
                        </td>

                        {/* وظيفة 1 */}
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min="0"
                            max="2"
                            value={rec.homework1Score ?? 2}
                            onChange={(e) =>
                              handleScoreChange(
                                st.studentName,
                                "homework1Score",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-12 text-center py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
                          />
                        </td>

                        {/* وظيفة 2 */}
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min="0"
                            max="2"
                            value={rec.homework2Score ?? 2}
                            onChange={(e) =>
                              handleScoreChange(
                                st.studentName,
                                "homework2Score",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-12 text-center py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
                          />
                        </td>

                        {/* استجواب 1 */}
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min="0"
                            max="4"
                            value={rec.quiz1Score ?? 4}
                            onChange={(e) =>
                              handleScoreChange(
                                st.studentName,
                                "quiz1Score",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-12 text-center py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
                          />
                        </td>

                        {/* استجواب 2 */}
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min="0"
                            max="4"
                            value={rec.quiz2Score ?? 4}
                            onChange={(e) =>
                              handleScoreChange(
                                st.studentName,
                                "quiz2Score",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-12 text-center py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
                          />
                        </td>

                        {/* إضافي */}
                        <td className="py-2 px-1 text-center">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            value={rec.bonusPoints || 0}
                            onChange={(e) =>
                              handleScoreChange(
                                st.studentName,
                                "bonusPoints",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-12 text-center py-1 bg-amber-50/70 border border-amber-200 rounded text-xs font-bold text-amber-900"
                          />
                        </td>

                        {/* المجموع */}
                        <td className="py-2 px-3 text-center bg-emerald-50/50 font-black text-sm">
                          <span
                            className={
                              rec.continuousScore >= 10
                                ? "text-emerald-700"
                                : "text-rose-600"
                            }
                          >
                            {rec.continuousScore?.toFixed(1) || "20.0"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── 5. تذييل تنبيهي خفيف ─── */}
        <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/70 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <span>💡</span>
            <span>
              جميع النقاط المسجلة هنا تُحسب آلياً وتنتقل فوراً إلى خانة{" "}
              <strong>«التقويم المستمر من 20»</strong> في جدول رصد النقاط الرسمي.
            </span>
          </div>
          <Link
            href="/eval"
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 shadow-xs"
          >
            معاينة جدول الرصد
          </Link>
        </div>
      </main>
    </div>
  );
}
