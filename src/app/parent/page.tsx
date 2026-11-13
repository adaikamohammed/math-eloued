"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  GraduationCap,
  Search,
  Award,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Camera,
  RotateCcw,
  BookOpen,
  Check,
  UserCheck,
  User,
  Sparkles,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Download,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  ParentStudentReport,
  StudentTrimesterGradeSummary,
  normalizeArabicText,
} from "@/lib/parentLookupHelper";

function ParentContent() {
  const searchParams = useSearchParams();

  const [inputCode, setInputCode] = useState("");
  const [inputName, setInputName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requireNameNotice, setRequireNameNotice] = useState(false);
  const [reports, setReports] = useState<ParentStudentReport[]>([]);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const [selectedTrimester, setSelectedTrimester] = useState<1 | 2 | 3>(1);
  const [downloadingImg, setDownloadingImg] = useState(false);

  const reportCardRef = useRef<HTMLDivElement | null>(null);

  // جلب كود وتاريخ واسم التلميذ من الرابط تلقائياً
  useEffect(() => {
    const codeFromUrl =
      searchParams.get("code") ||
      searchParams.get("birth") ||
      searchParams.get("birthDate");
    const nameFromUrl =
      searchParams.get("name") || searchParams.get("studentName");

    if (codeFromUrl) {
      const cleanCode = codeFromUrl.replace(/\//g, "-").trim();
      const cleanName = (nameFromUrl || "").trim();
      setInputCode(cleanCode);
      if (cleanName) setInputName(cleanName);
      performLookup(cleanCode, cleanName);
    } else {
      // محاولة استرجاع آخر تلميذ تم البحث عنه في هذا الجهاز
      try {
        const savedCode = localStorage.getItem("jusoor_parent_last_code");
        const savedName = localStorage.getItem("jusoor_parent_last_name");
        if (savedCode) setInputCode(savedCode);
        if (savedName) setInputName(savedName);
      } catch {}
    }
  }, [searchParams]);

  // تنفيذ البحث والاستعلام
  const performLookup = async (codeToSearch: string, nameToSearch?: string) => {
    const cleanCode = codeToSearch.replace(/\//g, "-").trim();
    const cleanName = (
      nameToSearch !== undefined ? nameToSearch : inputName
    ).trim();

    if (!cleanCode) {
      setError("يرجى كتابة تاريخ ميلاد التلميذ (مثال: 2013-07-10)");
      return;
    }

    setLoading(true);
    setError(null);
    setRequireNameNotice(false);

    try {
      // 1. فحص الكاش المحلي للأستاذ إذا كان على نفس الجهاز
      let localFound: ParentStudentReport[] = [];
      if (typeof window !== "undefined") {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("jusoor_gradebook_")) {
            try {
              const item = JSON.parse(localStorage.getItem(k) || "{}");
              const lookup = item.parentGradebookLookup;
              if (lookup && lookup[cleanCode]) {
                localFound.push(...lookup[cleanCode]);
              }
            } catch {}
          }
        }
      }

      if (cleanName && localFound.length > 0) {
        const normQ = normalizeArabicText(cleanName);
        localFound = localFound.filter((rep) =>
          normalizeArabicText(rep.studentName).includes(normQ)
        );
      }

      // 2. البحث عبر الخادم السحابي
      let url = `/api/parent/lookup?code=${encodeURIComponent(cleanCode)}`;
      if (cleanName) {
        url += `&name=${encodeURIComponent(cleanName)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.success && Array.isArray(data.reports) && data.reports.length > 0) {
        setReports(data.reports);
        setSelectedStudentIndex(0);
        setSelectedTrimester(data.reports[0].activeTrimester || 1);
        try {
          localStorage.setItem("jusoor_parent_last_code", cleanCode);
          if (cleanName) localStorage.setItem("jusoor_parent_last_name", cleanName);
        } catch {}
      } else if (data.requireName) {
        setReports([]);
        setRequireNameNotice(true);
        setError(data.error);
      } else if (localFound.length > 0) {
        // استخدام الكاش المحلي
        setReports(localFound);
        setSelectedStudentIndex(0);
        setSelectedTrimester(localFound[0].activeTrimester || 1);
      } else {
        setReports([]);
        setError(
          data.error ||
            "لم يتم العثور على أي نتائج مسجلة بهذا التاريخ والاسم. يرجى التأكد من الصيغة (2013-07-10) أو مراجعة الأستاذ."
        );
      }
    } catch (err: any) {
      setError("تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.");
    } finally {
      setLoading(false);
    }
  };

  const currentReport = reports[selectedStudentIndex] || null;
  const currentSummary: StudentTrimesterGradeSummary | undefined =
    currentReport?.trimesters?.[selectedTrimester];

  // تصدير كشف النقاط كصورة PNG
  const handleDownloadImage = async () => {
    if (!reportCardRef.current || !currentReport) return;
    setDownloadingImg(true);
    try {
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default || html2canvasModule;
      const canvas = await (html2canvas as any)(reportCardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `كشف_نقاط_${currentReport.studentName}_ف${selectedTrimester}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert("تعذر حفظ الصورة، يمكنك التقاط لقطة شاشة للشاشة بدلاً من ذلك.");
    } finally {
      setDownloadingImg(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans" dir="rtl">
      {/* ─── الشريط العلوي الرسمي ─── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-lg shadow-sm">
              ج
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900">
                منصة جسور التعليمية
              </h1>
              <p className="text-[10px] sm:text-xs text-emerald-800 font-bold">
                فضاء أولياء الأمور — المتابعة والتقويم المستمر 👨‍👩‍👧‍👦
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>خصوصية وسرية تامة</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 pt-6 space-y-6">
        {/* ─── بطاقة إدخال كود تاريخ الميلاد ─── */}
        <section className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mx-auto shadow-2xs">
            <GraduationCap className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base sm:text-xl font-black text-slate-900">
              اطلاع الولي على نقاط وتقويم التلميذ
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              أدخل تاريخ ميلاد ابنك واسمه للاطلاع على علاماته الكاملة وترتيبه في الفوج وملاحظات أستاذه بسرية تامة
            </p>
          </div>

          {/* نموذج الإدخال السريع */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              performLookup(inputCode, inputName);
            }}
            className="max-w-md mx-auto space-y-3 pt-2 text-right"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* حقل تاريخ الميلاد */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تاريخ الميلاد 🎂 <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="2013-07-10"
                    className="w-full py-2.5 px-3 rounded-xl border-2 border-emerald-500/40 focus:border-emerald-600 bg-slate-50 hover:bg-white focus:bg-white text-sm font-mono font-black text-center text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition shadow-inner"
                  />
                </div>
              </div>

              {/* حقل اسم أو لقب التلميذ */}
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span>اسم أو لقب التلميذ 👤</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="مثال: محمد أو بن علي"
                    className={`w-full py-2.5 px-3 rounded-xl border-2 ${
                      requireNameNotice
                        ? "border-amber-500 bg-amber-50 focus:border-amber-600 ring-2 ring-amber-400/20"
                        : "border-emerald-500/40 focus:border-emerald-600 bg-slate-50 hover:bg-white focus:bg-white"
                    } text-sm font-bold text-center text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition shadow-inner`}
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              💡 كتابة اسم التلميذ تضمن السرية التامة وتمنع أي تداخل بين الإخوة أو التوائم المشتركين في نفس تاريخ الميلاد.
            </p>

            <button
              type="submit"
              disabled={loading || !inputCode.trim()}
              className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white text-sm font-black transition shadow-md hover:shadow-lg active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري البحث واسترجاع النقاط...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>استعلام وعرض كشف النقاط 🔍</span>
                </>
              )}
            </button>
          </form>

          {/* تنبيه الخطأ أو طلب إدخال الاسم إن وجد */}
          {error && (
            <div className={`p-3.5 rounded-2xl ${
              requireNameNotice
                ? "bg-amber-50 border border-amber-300 text-amber-900"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            } text-xs font-bold flex items-center justify-center gap-2 max-w-lg mx-auto shadow-2xs`}>
              <AlertCircle className={`w-4 h-4 ${requireNameNotice ? "text-amber-600" : "text-rose-600"} shrink-0`} />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            عرض كشف نقاط التلميذ الشامل (Parent Student Report)
        ════════════════════════════════════════════════════════════════════ */}
        {currentReport && (
          <section className="space-y-4">
            {/* شريط الإجراءات: طباعة + حفظ كصورة + الفصول */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              {/* أزرار الفصول الثلاثة */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[1, 2, 3].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTrimester(t as 1 | 2 | 3)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      selectedTrimester === t
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    الفصل {t}
                  </button>
                ))}
              </div>

              {/* أزرار الحفظ والطباعة */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={downloadingImg}
                  className="py-1.5 px-3 rounded-xl bg-[#107a57] hover:bg-[#0d6346] text-white text-xs font-black flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                  title="حفظ بطاقة كشف النقاط كصورة عالية الدقة لمشاركتها عبر واتساب"
                >
                  {downloadingImg ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                  <span>حفظ كصورة 📸</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>طباعة 🖨️</span>
                </button>
              </div>
            </div>

            {/* بطاقة كشف النقاط الرسمية المعتمدة */}
            <div
              ref={reportCardRef}
              className="bg-white rounded-3xl border-2 border-emerald-600 p-5 sm:p-7 shadow-xl space-y-6"
            >
              {/* ترويسة الكشف */}
              <div className="flex items-start justify-between border-b-2 border-emerald-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-xl shadow-md">
                    ج
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      منصة جسور التعليمية الجزائرية
                    </h3>
                    <p className="text-xs text-emerald-800 font-bold">
                      كشف المتابعة والتقويم المستمر الفصلي (وثيقة رسمية للولي)
                    </p>
                  </div>
                </div>

                <div className="text-left text-xs font-bold text-slate-500">
                  <p className="text-slate-900 font-black">{currentReport.subjectName || "الرياضيات"}</p>
                  <p className="text-[11px]">{new Date().toLocaleDateString("ar-DZ")}</p>
                </div>
              </div>

              {/* بطاقة هوية التلميذ */}
              <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">الاسم واللقب:</span>
                  <strong className="text-slate-900 text-sm font-black">{currentReport.studentName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">القسم والفوج:</span>
                  <strong className="text-slate-900 font-black">
                    {currentReport.className} {currentReport.groupName ? `(${currentReport.groupName})` : ""}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">تاريخ الميلاد (الكود):</span>
                  <strong className="text-emerald-800 font-mono font-black">{currentReport.birthDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">الفصل الدراسي:</span>
                  <strong className="text-emerald-900 font-black">الفصل {selectedTrimester}</strong>
                </div>
              </div>

              {/* ─── الرتبة البيداغوجية في الفوج (كما طلب المستخدم بالضبط) ─── */}
              {currentSummary && (
                <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-2xl shadow-inner">
                      🏆
                    </div>
                    <div>
                      <p className="text-xs text-amber-100 font-bold">الترتيب والتحصيل في الفوج التربوي:</p>
                      <h4 className="text-lg sm:text-2xl font-black flex items-center gap-2 mt-0.5">
                        <span>المرتبة {currentSummary.rank}</span>
                        <span className="text-xs font-normal text-amber-100">
                          من بين {currentSummary.totalStudents} تلميذ في الفوج
                        </span>
                      </h4>
                    </div>
                  </div>

                  <div className="text-left bg-black/15 px-3 py-1.5 rounded-xl border border-white/20 text-xs font-bold">
                    <span className="block text-[10px] text-amber-200">التقدير البيداغوجي:</span>
                    <span className="text-sm font-black text-white">{currentSummary.appreciation}</span>
                  </div>
                </div>
              )}

              {/* ─── جدول علامات الفروض والاختبارات الرسمية (من صفحة /eval) ─── */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-700" />
                  <span>علامات التقويم الفصلي والامتحانات الرسمية:</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  {/* التقويم المستمر */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] text-slate-500 font-bold">التقويم المستمر</p>
                    <p className="text-xl font-mono font-black text-slate-900 mt-1">
                      {currentSummary?.continuousScore !== undefined ? `${currentSummary.continuousScore} ن` : "--"}
                    </p>
                    <span className="text-[10px] text-slate-400">من 20</span>
                  </div>

                  {/* الفرض الأول */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] text-slate-500 font-bold">الفرض الأول</p>
                    <p className="text-xl font-mono font-black text-emerald-700 mt-1">
                      {currentSummary?.test1Score !== undefined ? `${currentSummary.test1Score} ن` : "قيد الرصد"}
                    </p>
                    <span className="text-[10px] text-slate-400">من 20</span>
                  </div>

                  {/* الاختبار الفصلي */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] text-slate-500 font-bold">الاختبار الفصلي</p>
                    <p className="text-xl font-mono font-black text-indigo-700 mt-1">
                      {currentSummary?.examScore !== undefined ? `${currentSummary.examScore} ن` : "قيد الرصد"}
                    </p>
                    <span className="text-[10px] text-slate-400">من 20</span>
                  </div>

                  {/* المعدل الفصلي */}
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300">
                    <p className="text-[11px] text-emerald-800 font-bold">المعدل الفصلي للمادة</p>
                    <p className="text-2xl font-mono font-black text-emerald-900 mt-0.5">
                      {currentSummary?.termAverage !== undefined
                        ? `${currentSummary.termAverage.toFixed(2)}`
                        : currentSummary?.monitoringAverage !== undefined
                        ? `${currentSummary.monitoringAverage.toFixed(2)}*`
                        : "--"}
                    </p>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      {currentSummary?.termAverage !== undefined ? "المعدل النهائي (من 20)" : "معدل المراقبة"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── تفاصيل بنود التقويم المستمر (من صفحة /eval/continuous) ─── */}
              {currentSummary && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>التفصيل البيداغوجي لعناصر التقويم المستمر داخل القسم:</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 font-bold">المشاركة والسلوك:</span>
                      <strong className="font-mono text-slate-900">
                        {currentSummary.behaviorScore !== undefined ? `${currentSummary.behaviorScore} ن` : "--"}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 font-bold">كراس الدروس:</span>
                      <strong className="font-mono text-slate-900">
                        {currentSummary.notebook1Score !== undefined
                          ? `${currentSummary.notebook1Score + (currentSummary.notebook2Score || 0)} ن`
                          : "--"}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 font-bold">الواجبات والأنشطة:</span>
                      <strong className="font-mono text-slate-900">
                        {currentSummary.homework1Score !== undefined
                          ? `${currentSummary.homework1Score + (currentSummary.homework2Score || 0)} ن`
                          : "--"}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 font-bold">الاستجوابات الدورية:</span>
                      <strong className="font-mono text-slate-900">
                        {currentSummary.quiz1Score !== undefined
                          ? `${currentSummary.quiz1Score + (currentSummary.quiz2Score || 0)} ن`
                          : "--"}
                      </strong>
                    </div>
                  </div>

                  {/* رصيد نقاط الزيادة والمكافآت */}
                  {currentSummary.bonusPoints !== undefined && currentSummary.bonusPoints !== 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs flex items-center justify-between">
                      <span className="text-emerald-900 font-bold flex items-center gap-1.5">
                        <span>🌟 رصيد نقاط الزيادة والتفاعل الصفي:</span>
                      </span>
                      <strong className="font-mono font-black text-emerald-800 text-sm">
                        {currentSummary.bonusPoints > 0 ? `+${currentSummary.bonusPoints}` : currentSummary.bonusPoints} نقطة
                      </strong>
                    </div>
                  )}
                </div>
              )}

              {/* ─── ملاحظات وتوجيهات الأستاذ ─── */}
              {currentSummary?.notes && (
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1 text-xs">
                  <span className="font-black text-amber-950 flex items-center gap-1.5">
                    <span>💬 ملاحظات وتوجيهات الأستاذ لولي التلميذ:</span>
                  </span>
                  <p className="text-slate-800 font-bold leading-relaxed pr-2">
                    {currentSummary.notes}
                  </p>
                </div>
              )}

              {/* تذييل الكشف الرسمي */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                <span>منصة جسور التعليمية — وزارة التربية الوطنية 🇩🇿</span>
                <span>بيانات خاصة بسرية تامة</span>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function ParentPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#107a57] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-bold">جاري تحميل فضاء أولياء الأمور...</p>
          </div>
        </div>
      }
    >
      <ParentContent />
    </Suspense>
  );
}
