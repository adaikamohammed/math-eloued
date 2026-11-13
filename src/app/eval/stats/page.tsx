"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  Camera,
  GitCompare,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Trophy,
  UserCheck,
  Search,
  Check,
  Loader2,
  Share2,
} from "lucide-react";
import {
  OfficialGradeRecord,
  StudentRosterItem,
  LessonsData,
  sortClasses,
} from "@/lib/types";
import { getPersistedTeacherSession } from "@/lib/offlineAuth";
import {
  EvaluationType,
  EVALUATION_LABELS,
  calculateClassStats,
  EvaluationStats,
} from "@/lib/evalStatsHelper";

const getScopedGradebookKey = (teacherId: string) => `jusoor_gradebook_${teacherId}`;

function StatsContent() {
  const searchParams = useSearchParams();

  // الحالة العامة
  const [loading, setLoading] = useState(true);
  const [downloadingImg, setDownloadingImg] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // البيانات
  const [customClasses, setCustomClasses] = useState<string[]>(["1م1", "1م2", "2م3"]);
  const [studentRoster, setStudentRoster] = useState<StudentRosterItem[]>([]);
  const [gradeRecords, setGradeRecords] = useState<Record<string, OfficialGradeRecord>>({});
  const [teacherSubject, setTeacherSubject] = useState<string>("الرياضيات");
  const [teacherName, setTeacherName] = useState<string>("الأستاذ");

  // الفلاتر
  const [viewMode, setViewMode] = useState<"single" | "compare" | "all">("single");
  const [selectedClassA, setSelectedClassA] = useState<string>("1م1");
  const [selectedClassB, setSelectedClassB] = useState<string>("1م2");
  const [selectedTrimester, setSelectedTrimester] = useState<1 | 2 | 3>(1);
  const [selectedEvalType, setSelectedEvalType] = useState<EvaluationType>("test1");

  // فتح وإغلاق قوائم الأسماء في الشرائح
  const [expandedBrackets, setExpandedBrackets] = useState<{
    above15: boolean;
    between10and15: boolean;
    between5and10: boolean;
    under5: boolean;
  }>({
    above15: true,
    between10and15: false,
    between5and10: false,
    under5: true,
  });

  // مرجع لبطاقة الأولياء للتصدير كصورة
  const parentCardRef = useRef<HTMLDivElement | null>(null);

  // إشعار
  const showToast = (type: "ok" | "err", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // تحميل البيانات
  useEffect(() => {
    const classFromUrl = searchParams.get("class");
    const trimFromUrl = searchParams.get("trimester");
    if (trimFromUrl && [1, 2, 3].includes(Number(trimFromUrl))) {
      setSelectedTrimester(Number(trimFromUrl) as 1 | 2 | 3);
    }

    const session = getPersistedTeacherSession();
    if (session?.full_name) setTeacherName(session.full_name);

    // 1. قراءة من الكاش المحلي
    if (session?.id && typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(getScopedGradebookKey(session.id));
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.classes && parsed.classes.length > 0) {
            setCustomClasses(parsed.classes);
            setSelectedClassA(classFromUrl && parsed.classes.includes(classFromUrl) ? classFromUrl : parsed.classes[0]);
            if (parsed.classes.length > 1) {
              setSelectedClassB(parsed.classes[1]);
            }
          }
          if (Array.isArray(parsed.roster)) setStudentRoster(parsed.roster);
          if (parsed.records) setGradeRecords(parsed.records);
          if (parsed.subject) {
            const rawSubj = typeof parsed.subject === "string" ? parsed.subject : (parsed.subject?.name || "الرياضيات");
            setTeacherSubject(rawSubj);
          }
        }
      } catch {}
    }

    // 2. المزامنة مع الخادم
    fetch("/api/lessons")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LessonsData | null) => {
        if (!data) return;

        const classes = sortClasses(
          data.customClasses && data.customClasses.length > 0
            ? data.customClasses
            : Array.from(new Set((data.studentRoster || []).map((s) => s.className).filter(Boolean)))
        );
        if (classes.length > 0) {
          setCustomClasses(classes);
          setSelectedClassA((prev) => (classFromUrl && classes.includes(classFromUrl) ? classFromUrl : classes.includes(prev) ? prev : classes[0]));
          if (classes.length > 1) {
            setSelectedClassB((prev) => (classes.includes(prev) && prev !== classes[0] ? prev : classes[1]));
          }
        }
        if (Array.isArray(data.studentRoster)) setStudentRoster(data.studentRoster);
        if (Array.isArray(data.gradebookRecords)) {
          const dict: Record<string, OfficialGradeRecord> = {};
          data.gradebookRecords.forEach((r) => {
            dict[`${r.className}_${r.studentName}_T${r.trimester}`] = r;
          });
          setGradeRecords(dict);
        }
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  // إحصائيات الفوج أ
  const statsA = useMemo(() => {
    return calculateClassStats(selectedClassA, selectedEvalType, selectedTrimester, gradeRecords, studentRoster);
  }, [selectedClassA, selectedEvalType, selectedTrimester, gradeRecords, studentRoster]);

  // إحصائيات الفوج ب (للمقارنة)
  const statsB = useMemo(() => {
    return calculateClassStats(selectedClassB, selectedEvalType, selectedTrimester, gradeRecords, studentRoster);
  }, [selectedClassB, selectedEvalType, selectedTrimester, gradeRecords, studentRoster]);

  // إحصائيات جميع الأقسام
  const allClassStats = useMemo(() => {
    return customClasses.map((cls) =>
      calculateClassStats(cls, selectedEvalType, selectedTrimester, gradeRecords, studentRoster)
    );
  }, [customClasses, selectedEvalType, selectedTrimester, gradeRecords, studentRoster]);

  // تصدير كصورة للأولياء عبر html2canvas
  const handleExportParentCardImage = async () => {
    if (!parentCardRef.current) return;
    setDownloadingImg(true);
    try {
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const canvas = await (html2canvas as any)(parentCardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `نتائج_${selectedClassA}_${EVALUATION_LABELS[selectedEvalType]}_ف${selectedTrimester}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("ok", "📸 تم حفظ بطاقة النتائج كصورة عالية الدقة بنجاح!");
    } catch (err) {
      showToast("err", "تعذر حفظ الصورة، يرجى إعادة المحاولة.");
    } finally {
      setDownloadingImg(false);
    }
  };

  const toggleBracket = (key: keyof typeof expandedBrackets) => {
    setExpandedBrackets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16" dir="rtl">
      {/* ─── الشريط العلوي الفخم ─── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/eval"
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
              title="العودة لسجل التنقيط"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>📊 مركز الإحصائيات والتحليل البياني</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    رسمي
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                تحليل دقيق للفروض والاختبارات، نسب النجاح والشرائح، ومقارنة فورية بين الأفواج
              </p>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportParentCardImage}
              disabled={downloadingImg || statsA.gradedCount === 0}
              className="py-2 px-3.5 rounded-xl bg-[#107a57] hover:bg-[#0d6346] text-white text-xs font-black flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {downloadingImg ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-emerald-200" />
              )}
              <span>📸 حفظ كصورة للأولياء</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="py-2 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>طباعة 🖨️</span>
            </button>
          </div>
        </div>
      </header>

      {/* تنبيه سريع */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 mt-3">
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border animate-in fade-in ${
              message.type === "ok"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {message.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-5 space-y-6">
        {/* ─── شريط التصفية والتحكم ─── */}
        <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4 print:hidden">
          {/* سطر 1: أنماط العرض الثلاثة + الفصل */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            {/* أنماط العرض */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={`py-1.5 px-3 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === "single" ? "bg-white text-emerald-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>فوج واحد</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("compare")}
                className={`py-1.5 px-3 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === "compare" ? "bg-white text-emerald-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>مقارنة بين فوجين</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={`py-1.5 px-3 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === "all" ? "bg-white text-emerald-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>جميع الأقسام</span>
              </button>
            </div>

            {/* أزرار الفصول الثلاثة */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {[1, 2, 3].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTrimester(t as 1 | 2 | 3)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    selectedTrimester === t
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  الفصل {t}
                </button>
              ))}
            </div>
          </div>

          {/* سطر 2: اختيار الفوج ونوع التقييم */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* أزرار الأفواج */}
            {viewMode === "single" && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-500 ml-1">اختر الفوج:</span>
                {customClasses.map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClassA(cls)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      selectedClassA === cls
                        ? "bg-[#107a57] text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            )}

            {/* وضع المقارنة: اختيار الفوجين */}
            {viewMode === "compare" && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-800">الفوج الأول:</span>
                  <select
                    value={selectedClassA}
                    onChange={(e) => setSelectedClassA(e.target.value)}
                    className="py-1.5 px-3 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {customClasses.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <span className="text-slate-400 font-bold">مقابل ⚔️</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-indigo-800">الفوج الثاني:</span>
                  <select
                    value={selectedClassB}
                    onChange={(e) => setSelectedClassB(e.target.value)}
                    className="py-1.5 px-3 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {customClasses.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* أزرار نوع التقييم (الفرض، الاختبار، التقويم، المعدل) */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
              <span className="text-xs font-bold text-slate-500 ml-1">نوع التقييم:</span>
              {(["test1", "test2", "exam", "continuous", "termAverage"] as EvaluationType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedEvalType(type)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    selectedEvalType === type
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {EVALUATION_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            الوضع 1: فوج واحد (Single Class View)
        ════════════════════════════════════════════════════════════════════ */}
        {viewMode === "single" && (
          <div className="space-y-6">
            {/* بطاقات المؤشرات الرئيسية الأربعة */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold">إجمالي المرصودين</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {statsA.gradedCount} <span className="text-xs font-normal text-slate-400">/ {statsA.totalStudents}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    تلميذ في فوج {selectedClassA}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold">معدل الفوج</p>
                  <p className="text-2xl font-black text-[#107a57] font-mono mt-1">
                    {statsA.gradedCount > 0 ? statsA.average.toFixed(2) : "0.00"}{" "}
                    <span className="text-xs text-slate-400">/ 20</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    في {EVALUATION_LABELS[selectedEvalType]}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold">نسبة النجاح (≥ 10)</p>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-1">
                    {statsA.passRate}%
                  </p>
                  <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
                    {statsA.above15.length + statsA.between10and15.length} تلميذ ناجح
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                  <Award className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold">أعلى وأدنى علامة</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-emerald-700 font-mono font-black text-lg">
                      {statsA.highestScore !== undefined ? statsA.highestScore : "--"}
                    </span>
                    <span className="text-slate-300">/</span>
                    <span className="text-rose-600 font-mono font-black text-lg">
                      {statsA.lowestScore !== undefined ? statsA.lowestScore : "--"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    الفارق: {statsA.highestScore !== undefined && statsA.lowestScore !== undefined ? (statsA.highestScore - statsA.lowestScore).toFixed(1) : "--"} ن
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                  <Trophy className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* ─── الرسوم البيانية: دائرة نسبية وأعمدة ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* الدائرة النسبية (Donut Chart) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>🍩 الدائرة النسبية لتوزيع العلامات</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-bold">فوج {selectedClassA}</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                  {/* الرسم الدائري SVG */}
                  <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {/* خلفية */}
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="16" />
                      {/* القطاعات الأربعة */}
                      {(() => {
                        const total = statsA.gradedCount || 1;
                        const c = 2 * Math.PI * 38; // ~238.76
                        let accumulated = 0;

                        const segments = [
                          { count: statsA.above15.length, color: "#10b981", label: "≥ 15" },
                          { count: statsA.between10and15.length, color: "#0284c7", label: "10-15" },
                          { count: statsA.between5and10.length, color: "#f59e0b", label: "5-10" },
                          { count: statsA.under5.length, color: "#ef4444", label: "< 5" },
                        ];

                        return segments.map((seg, i) => {
                          const pct = seg.count / total;
                          const dash = pct * c;
                          const offset = -(accumulated * c);
                          accumulated += pct;

                          if (seg.count === 0) return null;

                          return (
                            <circle
                              key={i}
                              cx="50"
                              cy="50"
                              r="38"
                              fill="none"
                              stroke={seg.color}
                              strokeWidth="16"
                              strokeDasharray={`${dash} ${c - dash}`}
                              strokeDashoffset={offset}
                              className="transition-all duration-500"
                            />
                          );
                        });
                      })()}
                    </svg>

                    {/* النص في المركز */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-slate-900 font-mono">
                        {statsA.passRate}%
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">نسبة النجاح</span>
                    </div>
                  </div>

                  {/* مفتاح الدائرة النسبية */}
                  <div className="space-y-2.5 text-xs font-bold w-full sm:w-auto">
                    <div className="flex items-center justify-between gap-3 p-1.5 rounded-lg bg-emerald-50 text-emerald-900">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#10b981]" />
                        <span>ممتاز (≥ 15)</span>
                      </div>
                      <span className="font-mono">{statsA.above15.length} تلميذ ({statsA.above15Pct}%)</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 p-1.5 rounded-lg bg-sky-50 text-sky-900">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#0284c7]" />
                        <span>متوسط إلى جيد (10 - 15)</span>
                      </div>
                      <span className="font-mono">{statsA.between10and15.length} تلميذ ({statsA.between10and15Pct}%)</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 p-1.5 rounded-lg bg-amber-50 text-amber-900">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                        <span>تحت المعدل (5 - 10)</span>
                      </div>
                      <span className="font-mono">{statsA.between5and10.length} تلميذ ({statsA.between5and10Pct}%)</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 p-1.5 rounded-lg bg-rose-50 text-rose-900">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
                        <span>ضعيف جداً (&lt; 5)</span>
                      </div>
                      <span className="font-mono">{statsA.under5.length} تلميذ ({statsA.under5Pct}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* الأعمدة البيانية (Bar Chart) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>📊 الأعمدة البيانية لتوزيع الفئات</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-bold">{EVALUATION_LABELS[selectedEvalType]}</span>
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    { label: "الممتازون (≥ 15/20)", count: statsA.above15.length, pct: statsA.above15Pct, color: "bg-emerald-500", text: "text-emerald-700" },
                    { label: "المقبولون (10 إلى 14.99)", count: statsA.between10and15.length, pct: statsA.between10and15Pct, color: "bg-sky-500", text: "text-sky-700" },
                    { label: "المتعثرون (5 إلى 9.99)", count: statsA.between5and10.length, pct: statsA.between5and10Pct, color: "bg-amber-500", text: "text-amber-700" },
                    { label: "الضعفاء جداً (< 5/20)", count: statsA.under5.length, pct: statsA.under5Pct, color: "bg-rose-500", text: "text-rose-700" },
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700">{item.label}</span>
                        <span className={item.text}>
                          {item.count} تلميذ <span className="font-mono text-slate-400">({item.pct}%)</span>
                        </span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(item.pct, item.count > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>إجمالي الحاصلين على ≥ 10: <strong className="text-emerald-700 font-black">{statsA.above10Pct}%</strong></span>
                  <span>إجمالي الحاصلين على &lt; 10: <strong className="text-rose-700 font-black">{statsA.under10Pct}%</strong></span>
                </div>
              </div>
            </div>

            {/* ─── تحليل الذكور والإناث ─── */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>👦👧 مقارنة الذكور والإناث في الفوج</span>
                </h3>
                <span className="text-xs text-slate-500 font-bold">نسبة الجنس والتحصيل</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* بطاقة الذكور */}
                <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-sky-900 flex items-center gap-1.5">
                      <span>👦 الذكور</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-sky-800">
                      {statsA.maleCount} تلميذ ({statsA.gradedCount > 0 ? Math.round((statsA.maleCount / statsA.gradedCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                    <div className="bg-white/80 p-2 rounded-lg">
                      <p className="text-[10px] text-slate-500 font-bold">معدل الذكور</p>
                      <p className="text-base font-black text-sky-800 font-mono mt-0.5">{statsA.maleAvg.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg">
                      <p className="text-[10px] text-slate-500 font-bold">نسبة نجاحهم</p>
                      <p className="text-base font-black text-emerald-700 font-mono mt-0.5">{statsA.malePassRate}%</p>
                    </div>
                  </div>
                </div>

                {/* بطاقة الإناث */}
                <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                      <span>👧 الإناث</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-800">
                      {statsA.femaleCount} تلميذة ({statsA.gradedCount > 0 ? Math.round((statsA.femaleCount / statsA.gradedCount) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                    <div className="bg-white/80 p-2 rounded-lg">
                      <p className="text-[10px] text-slate-500 font-bold">معدل الإناث</p>
                      <p className="text-base font-black text-rose-800 font-mono mt-0.5">{statsA.femaleAvg.toFixed(2)}</p>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg">
                      <p className="text-[10px] text-slate-500 font-bold">نسبة نجاحهن</p>
                      <p className="text-base font-black text-emerald-700 font-mono mt-0.5">{statsA.femalePassRate}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── الشرائح الأربعة مع إظهار الأسماء ─── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>📋 شرائح النتائج وتفصيل أسماء التلاميذ</span>
                </h3>
                <span className="text-xs text-slate-500 font-bold">انقر على أي شريحة لإظهار/إخفاء الأسماء</span>
              </div>

              {/* 1. الممتازون >= 15 */}
              <div className="bg-white rounded-2xl border border-emerald-200 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleBracket("above15")}
                  className="w-full p-4 bg-emerald-50/60 hover:bg-emerald-50 flex items-center justify-between text-right cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                      ≥15
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-emerald-950 flex items-center gap-2">
                        <span>🌟 فئة الممتازين (15 فما فوق)</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-black">
                          {statsA.above15.length} تلميذ ({statsA.above15Pct}%)
                        </span>
                      </h4>
                      <p className="text-[11px] text-emerald-800 font-medium">علامات شرفية ممتازة واجتهاد بارز</p>
                    </div>
                  </div>
                  <div className="text-emerald-700">
                    {expandedBrackets.above15 ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {expandedBrackets.above15 && (
                  <div className="p-4 border-t border-emerald-100">
                    {statsA.above15.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold text-center py-2">لا يوجد تلاميذ في هذه الشريحة حالياً.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {statsA.above15.map((st, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400">#{i + 1}</span>
                              <span>{st.name}</span>
                              <span className="text-[10px] text-slate-400">({st.gender})</span>
                            </span>
                            <span className="font-mono font-black text-emerald-700 text-sm px-2 py-0.5 rounded-lg bg-emerald-100">
                              {st.score} ن
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. المتوسط إلى الجيد (10 إلى 14.99) */}
              <div className="bg-white rounded-2xl border border-sky-200 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleBracket("between10and15")}
                  className="w-full p-4 bg-sky-50/60 hover:bg-sky-50 flex items-center justify-between text-right cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-xs">
                      10-15
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-sky-950 flex items-center gap-2">
                        <span>🔵 فئة المتوسط إلى الجيد (من 10 إلى 14.99)</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-200 text-sky-900 font-black">
                          {statsA.between10and15.length} تلميذ ({statsA.between10and15Pct}%)
                        </span>
                      </h4>
                      <p className="text-[11px] text-sky-800 font-medium">حققوا المعدل وقادرون على بلوغ الامتياز</p>
                    </div>
                  </div>
                  <div className="text-sky-700">
                    {expandedBrackets.between10and15 ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {expandedBrackets.between10and15 && (
                  <div className="p-4 border-t border-sky-100">
                    {statsA.between10and15.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold text-center py-2">لا يوجد تلاميذ في هذه الشريحة حالياً.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {statsA.between10and15.map((st, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-sky-50/40 border border-sky-100 flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400">#{i + 1}</span>
                              <span>{st.name}</span>
                              <span className="text-[10px] text-slate-400">({st.gender})</span>
                            </span>
                            <span className="font-mono font-black text-sky-700 text-sm px-2 py-0.5 rounded-lg bg-sky-100">
                              {st.score} ن
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. تحت المعدل الخفيف (5 إلى 9.99) */}
              <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleBracket("between5and10")}
                  className="w-full p-4 bg-amber-50/60 hover:bg-amber-50 flex items-center justify-between text-right cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black text-xs">
                      5-10
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-2">
                        <span>🟠 فئة تحت المعدل (من 5 إلى 9.99)</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black">
                          {statsA.between5and10.length} تلميذ ({statsA.between5and10Pct}%)
                        </span>
                      </h4>
                      <p className="text-[11px] text-amber-800 font-medium">يحتاجون لمعالجة بيداغوجية ودعم منزلي عاجل</p>
                    </div>
                  </div>
                  <div className="text-amber-700">
                    {expandedBrackets.between5and10 ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {expandedBrackets.between5and10 && (
                  <div className="p-4 border-t border-amber-100">
                    {statsA.between5and10.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold text-center py-2">لا يوجد تلاميذ في هذه الشريحة حالياً.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {statsA.between5and10.map((st, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-amber-50/40 border border-amber-100 flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400">#{i + 1}</span>
                              <span>{st.name}</span>
                              <span className="text-[10px] text-slate-400">({st.gender})</span>
                            </span>
                            <span className="font-mono font-black text-amber-700 text-sm px-2 py-0.5 rounded-lg bg-amber-100">
                              {st.score} ن
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. الضعفاء جداً تحت 5 */}
              <div className="bg-white rounded-2xl border border-rose-200 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleBracket("under5")}
                  className="w-full p-4 bg-rose-50/60 hover:bg-rose-50 flex items-center justify-between text-right cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-black text-xs">
                      &lt;5
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-rose-950 flex items-center gap-2">
                        <span>🔴 فئة الضعف الحاد (أقل من 5 نقاط)</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-black">
                          {statsA.under5.length} تلميذ ({statsA.under5Pct}%)
                        </span>
                      </h4>
                      <p className="text-[11px] text-rose-800 font-medium">خطر الرسوب، يتطلب استدعاء فوري للولي</p>
                    </div>
                  </div>
                  <div className="text-rose-700">
                    {expandedBrackets.under5 ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {expandedBrackets.under5 && (
                  <div className="p-4 border-t border-rose-100">
                    {statsA.under5.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold text-center py-2">الحمد لله، لا يوجد تلاميذ دون 5 نقاط.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {statsA.under5.map((st, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-rose-50/40 border border-rose-100 flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400">#{i + 1}</span>
                              <span>{st.name}</span>
                              <span className="text-[10px] text-slate-400">({st.gender})</span>
                            </span>
                            <span className="font-mono font-black text-rose-700 text-sm px-2 py-0.5 rounded-lg bg-rose-100">
                              {st.score} ن
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            الوضع 2: مقارنة بين فوجين (Compare Two Classes)
        ════════════════════════════════════════════════════════════════════ */}
        {viewMode === "compare" && (
          <div className="space-y-6">
            {/* جدول المقارنة المباشر */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>⚖️ المقارنة البيداغوجية المباشرة بين الفوجين</span>
                </h3>
                <span className="text-xs text-slate-500 font-bold">
                  {EVALUATION_LABELS[selectedEvalType]} — الفصل {selectedTrimester}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                      <th className="p-3">المؤشر البيداغوجي</th>
                      <th className="p-3 text-emerald-800 bg-emerald-50/60 font-black">فوج {selectedClassA}</th>
                      <th className="p-3 text-indigo-800 bg-indigo-50/60 font-black">فوج {selectedClassB}</th>
                      <th className="p-3">الفارق والأفضلية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    <tr>
                      <td className="p-3 text-slate-600">إجمالي المفحوصين</td>
                      <td className="p-3 text-emerald-900 font-mono font-black bg-emerald-50/20">{statsA.gradedCount} تلميذ</td>
                      <td className="p-3 text-indigo-900 font-mono font-black bg-indigo-50/20">{statsB.gradedCount} تلميذ</td>
                      <td className="p-3 text-slate-500">{Math.abs(statsA.gradedCount - statsB.gradedCount)} تلميذ</td>
                    </tr>
                    <tr className="bg-slate-50/40">
                      <td className="p-3 text-slate-800 font-black">المعدل العام للفوج</td>
                      <td className="p-3 text-[#107a57] font-mono font-black text-sm bg-emerald-50/20">{statsA.average.toFixed(2)} / 20</td>
                      <td className="p-3 text-indigo-700 font-mono font-black text-sm bg-indigo-50/20">{statsB.average.toFixed(2)} / 20</td>
                      <td className="p-3 font-mono font-black">
                        {statsA.average > statsB.average ? (
                          <span className="text-emerald-700">+{ (statsA.average - statsB.average).toFixed(2) } لصالح {selectedClassA} 🟢</span>
                        ) : statsB.average > statsA.average ? (
                          <span className="text-indigo-700">+{ (statsB.average - statsA.average).toFixed(2) } لصالح {selectedClassB} 🔵</span>
                        ) : (
                          <span className="text-slate-500">متساويان 🤝</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-800 font-black">نسبة النجاح (≥ 10)</td>
                      <td className="p-3 text-emerald-900 font-mono font-black bg-emerald-50/20">{statsA.passRate}%</td>
                      <td className="p-3 text-indigo-900 font-mono font-black bg-indigo-50/20">{statsB.passRate}%</td>
                      <td className="p-3 font-mono font-black">
                        {statsA.passRate > statsB.passRate ? (
                          <span className="text-emerald-700">+{statsA.passRate - statsB.passRate}% لصالح {selectedClassA}</span>
                        ) : statsB.passRate > statsA.passRate ? (
                          <span className="text-indigo-700">+{statsB.passRate - statsA.passRate}% لصالح {selectedClassB}</span>
                        ) : (
                          <span className="text-slate-500">متساويان</span>
                        )}
                      </td>
                    </tr>
                    <tr className="bg-slate-50/40">
                      <td className="p-3 text-slate-600">الممتازون (≥ 15)</td>
                      <td className="p-3 text-emerald-900 font-mono font-black bg-emerald-50/20">{statsA.above15.length} ({statsA.above15Pct}%)</td>
                      <td className="p-3 text-indigo-900 font-mono font-black bg-indigo-50/20">{statsB.above15.length} ({statsB.above15Pct}%)</td>
                      <td className="p-3 text-slate-500 font-mono">{statsA.above15.length - statsB.above15.length} تلميذ</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-600">المتعثرون دون 10</td>
                      <td className="p-3 text-rose-700 font-mono font-black bg-emerald-50/20">{statsA.failRate}%</td>
                      <td className="p-3 text-rose-700 font-mono font-black bg-indigo-50/20">{statsB.failRate}%</td>
                      <td className="p-3 text-slate-500 font-mono">{statsA.failRate - statsB.failRate}%</td>
                    </tr>
                    <tr className="bg-slate-50/40">
                      <td className="p-3 text-slate-600">الضعفاء جداً (&lt; 5)</td>
                      <td className="p-3 text-rose-700 font-mono font-black bg-emerald-50/20">{statsA.under5.length} تلميذ</td>
                      <td className="p-3 text-rose-700 font-mono font-black bg-indigo-50/20">{statsB.under5.length} تلميذ</td>
                      <td className="p-3 text-slate-500 font-mono">{statsA.under5.length - statsB.under5.length} تلميذ</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-slate-600">أعلى علامة مسجلة</td>
                      <td className="p-3 text-emerald-900 font-mono font-black bg-emerald-50/20">{statsA.highestScore ?? "--"} ن</td>
                      <td className="p-3 text-indigo-900 font-mono font-black bg-indigo-50/20">{statsB.highestScore ?? "--"} ن</td>
                      <td className="p-3 text-slate-500 font-mono">--</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* رسم بياني مقارن للأعمدة */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>📊 مقارنة الأعمدة البيانية لتوزيع الفئات</span>
                </h3>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-800">
                    <span className="w-3 h-3 rounded-full bg-emerald-600" />
                    <span>فوج {selectedClassA}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-indigo-800">
                    <span className="w-3 h-3 rounded-full bg-indigo-600" />
                    <span>فوج {selectedClassB}</span>
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                {[
                  { label: "الممتازون (≥ 15)", a: statsA.above15Pct, b: statsB.above15Pct },
                  { label: "المقبولون (10 - 15)", a: statsA.between10and15Pct, b: statsB.between10and15Pct },
                  { label: "المتعثرون (5 - 10)", a: statsA.between5and10Pct, b: statsB.between5and10Pct },
                  { label: "الضعفاء جداً (< 5)", a: statsA.under5Pct, b: statsB.under5Pct },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800">{item.label}</span>
                      <span className="text-slate-500 font-mono">
                        {selectedClassA}: <strong className="text-emerald-700">{item.a}%</strong> | {selectedClassB}: <strong className="text-indigo-700">{item.b}%</strong>
                      </span>
                    </div>
                    {/* عمود الفوج أ */}
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${item.a}%` }} />
                    </div>
                    {/* عمود الفوج ب */}
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${item.b}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            الوضع 3: جميع الأقسام (All Classes Overview)
        ════════════════════════════════════════════════════════════════════ */}
        {viewMode === "all" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>🏆 ترتيب جميع الأقسام حسب التحصيل الدراسي</span>
                </h3>
                <span className="text-xs text-slate-500 font-bold">
                  {EVALUATION_LABELS[selectedEvalType]} — الفصل {selectedTrimester}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                      <th className="p-3">الترتيب</th>
                      <th className="p-3">الفوج</th>
                      <th className="p-3">المفحوصين</th>
                      <th className="p-3">معدل الفوج</th>
                      <th className="p-3">نسبة النجاح</th>
                      <th className="p-3">الممتازون (≥15)</th>
                      <th className="p-3">المتعثرون (&lt;10)</th>
                      <th className="p-3">أعلى علامة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {[...allClassStats]
                      .sort((a, b) => b.average - a.average)
                      .map((st, i) => (
                        <tr key={st.className} className={i === 0 ? "bg-emerald-50/40" : "hover:bg-slate-50"}>
                          <td className="p-3 font-mono font-black">
                            {i === 0 ? "🥇 1" : i === 1 ? "🥈 2" : i === 2 ? "🥉 3" : `#${i + 1}`}
                          </td>
                          <td className="p-3 font-black text-slate-900">{st.className}</td>
                          <td className="p-3 font-mono text-slate-600">{st.gradedCount} / {st.totalStudents}</td>
                          <td className="p-3 font-mono font-black text-emerald-800 text-sm">
                            {st.average.toFixed(2)} / 20
                          </td>
                          <td className="p-3 font-mono font-black text-slate-800">{st.passRate}%</td>
                          <td className="p-3 font-mono text-emerald-700">{st.above15.length} ({st.above15Pct}%)</td>
                          <td className="p-3 font-mono text-rose-600">{st.under10Pct}%</td>
                          <td className="p-3 font-mono font-black text-slate-900">{st.highestScore ?? "--"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            بطاقة الأولياء للتصدير كصورة (Parent WhatsApp Card)
            مخفية أو ظاهرة كمعاينة وتستخدمها html2canvas لالتقاط صورة عالية الدقة
        ════════════════════════════════════════════════════════════════════ */}
        <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>📸 بطاقة نتائج التقييم المخصصة لأولياء الأمور (WhatsApp)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                هذه البطاقة جاهزة للحفظ كصورة واضحة وإرسالها لمجموعة الأولياء لتعزيز التواصل والشفافية
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportParentCardImage}
              disabled={downloadingImg || statsA.gradedCount === 0}
              className="py-2 px-4 rounded-xl bg-[#107a57] hover:bg-[#0d6346] text-white text-xs font-black flex items-center gap-2 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {downloadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-emerald-200" />}
              <span>حفظ كصورة PNG 📥</span>
            </button>
          </div>

          {/* المعاينة الحقيقية للبطاقة التي ستُحفظ كصورة */}
          <div className="flex justify-center p-2 sm:p-4 bg-slate-100 rounded-2xl overflow-x-auto">
            <div
              ref={parentCardRef}
              className="w-full max-w-[620px] bg-white rounded-3xl p-6 border-2 border-emerald-600 shadow-xl space-y-5 text-right font-sans"
              style={{ minWidth: "320px" }}
            >
              {/* ترويسة البطاقة */}
              <div className="flex items-center justify-between border-b-2 border-emerald-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-xl shadow-md">
                    ج
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">منصة جسور التعليمية</h2>
                    <p className="text-xs text-emerald-800 font-bold">تقرير نتائج التقييم البيداغوجي للأولياء</p>
                  </div>
                </div>
                <div className="text-left text-xs text-slate-500 font-bold">
                  <p className="text-slate-900 font-black">{teacherSubject}</p>
                  <p>{new Date().toLocaleDateString("ar-DZ")}</p>
                </div>
              </div>

              {/* معلومات الفوج ونوع التقييم */}
              <div className="bg-emerald-50/80 rounded-2xl p-3.5 border border-emerald-100 flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-emerald-950">
                <span>الفوج التربوي: <strong className="text-emerald-900 text-sm font-black">{selectedClassA}</strong></span>
                <span>الفصل: <strong className="text-emerald-900">الفصل {selectedTrimester}</strong></span>
                <span>نوع التقييم: <strong className="text-emerald-900 text-sm font-black">{EVALUATION_LABELS[selectedEvalType]}</strong></span>
              </div>

              {/* المؤشرات الثلاثة الكبرى */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[11px] text-slate-500 font-bold">عدد التلاميذ</p>
                  <p className="text-xl font-black text-slate-900 font-mono mt-0.5">{statsA.gradedCount}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                  <p className="text-[11px] text-emerald-800 font-bold">معدل الفوج</p>
                  <p className="text-xl font-black text-emerald-700 font-mono mt-0.5">{statsA.average.toFixed(2)}</p>
                </div>
                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100">
                  <p className="text-[11px] text-amber-800 font-bold">نسبة النجاح</p>
                  <p className="text-xl font-black text-amber-700 font-mono mt-0.5">{statsA.passRate}%</p>
                </div>
              </div>

              {/* نسب الشرائح الأربعة */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-black text-slate-800">📊 التوزيع الإحصائي للعلامات في الفوج:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-bold">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-[10px] text-emerald-800">ممتاز (≥ 15)</p>
                    <p className="text-sm font-black text-emerald-900 font-mono mt-0.5">{statsA.above15.length} ({statsA.above15Pct}%)</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200">
                    <p className="text-[10px] text-sky-800">جيد (10 - 15)</p>
                    <p className="text-sm font-black text-sky-900 font-mono mt-0.5">{statsA.between10and15.length} ({statsA.between10and15Pct}%)</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-[10px] text-amber-800">متعثر (5 - 10)</p>
                    <p className="text-sm font-black text-amber-900 font-mono mt-0.5">{statsA.between5and10.length} ({statsA.between5and10Pct}%)</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                    <p className="text-[10px] text-rose-800">ضعيف (&lt; 5)</p>
                    <p className="text-sm font-black text-rose-900 font-mono mt-0.5">{statsA.under5.length} ({statsA.under5Pct}%)</p>
                  </div>
                </div>
              </div>

              {/* لوحة شرف للمتفوقين */}
              {statsA.above15.length > 0 && (
                <div className="bg-amber-50/50 rounded-2xl p-3 border border-amber-200 space-y-1.5">
                  <p className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>🌟 لوحة الشرف للمتفوقين في الفوج:</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                    {statsA.above15.slice(0, 6).map((st, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-white border border-amber-200 text-slate-800">
                        {st.name} ({st.score}ن)
                      </span>
                    ))}
                    {statsA.above15.length > 6 && (
                      <span className="text-[11px] text-amber-800 self-center">و {statsA.above15.length - 6} آخرين...</span>
                    )}
                  </div>
                </div>
              )}

              {/* توجيه عام لأولياء الأمور */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600 leading-relaxed">
                📢 <strong className="text-slate-800">توجيه بيداغوجي للأولياء الكرام:</strong> نرجو من الأولياء الكرام الاطلاع على كراس المحاولات ومتابعة إنجاز الواجبات أولاً بأول، وتشجيع الأبناء على المراجعة المنتظمة لتحقيق أفضل النتائج بإذن الله.
              </div>

              {/* تذييل البطاقة */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                <span>منصة جسور التعليمية الجزائرية 🇩🇿</span>
                <span>متابعة تربوية مستمرة</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function EvalStatsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#107a57] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-bold">جاري تحميل مركز الإحصائيات والتحليلات...</p>
          </div>
        </div>
      }
    >
      <StatsContent />
    </Suspense>
  );
}
