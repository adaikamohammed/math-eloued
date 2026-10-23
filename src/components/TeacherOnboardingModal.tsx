"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  BookOpen,
  Users,
  Clock,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Share2,
  Copy,
  ExternalLink,
  Loader2,
  HelpCircle,
  School,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TeacherSession } from "@/app/admin/page";
import { ReceptionInfo, SCHOOL_DAYS } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: TeacherSession;
  currentClasses: string[];
  initialLevels?: number[];
  onComplete: (newLevels: number[], newClasses: string[], reception?: ReceptionInfo) => void;
}

export function TeacherOnboardingModal({
  isOpen,
  onClose,
  profile,
  currentClasses,
  initialLevels = [],
  onComplete,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // الخطوة 1: المستويات
  const [selectedLevels, setSelectedLevels] = useState<number[]>(
    initialLevels.length > 0 ? initialLevels : [1]
  );

  // الخطوة 2: الأفواج
  const [classes, setClasses] = useState<string[]>(currentClasses);
  const [customClassInput, setCustomClassInput] = useState("");

  // الخطوة 3: ساعة الاستقبال
  const [receptionDay, setReceptionDay] = useState("");
  const [receptionTime, setReceptionTime] = useState("");
  const [receptionLocation, setReceptionLocation] = useState("قاعة الأساتذة");
  const [receptionGuidance, setReceptionGuidance] = useState("");

  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  // تبديل اختيار المستوى
  const toggleLevel = (lvl: number) => {
    setSelectedLevels((prev) => {
      if (prev.includes(lvl)) {
        if (prev.length === 1) return prev; // إبقاء مستوى واحد على الأقل
        return prev.filter((l) => l !== lvl);
      } else {
        return [...prev, lvl].sort();
      }
    });
  };

  // إضافة فوج سريع
  const addQuickClass = (clsName: string) => {
    if (!classes.includes(clsName)) {
      setClasses((prev) => [...prev, clsName]);
    }
  };

  // حذف فوج
  const removeClass = (clsName: string) => {
    setClasses((prev) => prev.filter((c) => c !== clsName));
  };

  // إضافة فوج مخصص
  const handleAddCustomClass = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customClassInput.trim();
    if (clean && !classes.includes(clean)) {
      setClasses((prev) => [...prev, clean]);
      setCustomClassInput("");
    }
  };

  // حفظ الإعدادات في قاعدة البيانات
  const handleSaveAndProceed = async () => {
    setSaving(true);
    try {
      const sortedLevels = [...selectedLevels].sort();
      const cleanReception: ReceptionInfo = {};
      if (receptionDay) cleanReception.officialDay = receptionDay;
      if (receptionTime) cleanReception.officialTime = receptionTime;
      if (receptionLocation) cleanReception.location = receptionLocation;
      if (receptionGuidance) cleanReception.guidance = receptionGuidance;

      // 1. تحديث جدول profiles في Supabase
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          levels_taught: sortedLevels,
          reception: Object.keys(cleanReception).length > 0 ? cleanReception : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (profileErr) {
        console.warn("Update profile error:", profileErr);
      }

      // 2. تحديث الأفواج عبر API
      await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customClasses: classes,
        }),
      });

      // 3. تخزين محلي لسرعة الاستجابة
      if (typeof window !== "undefined") {
        localStorage.setItem(`custom_classes_${profile.id}`, JSON.stringify(classes));
      }

      onComplete(sortedLevels, classes, cleanReception);
      setStep(4); // الانتقال لشاشة النجاح والرموز المخصصة
    } catch (err) {
      console.error("Save error:", err);
      // حتى لو فشل الاتصال، نحدث محلياً لينتقل الأستاذ
      onComplete(selectedLevels, classes);
      setStep(4);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-emerald-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* الترويسة وشريط الخطوات */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition text-white/80 hover:text-white"
            title="إغلاق المعالج"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
              <Sparkles className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-emerald-200 tracking-wide">
              معالج تجهيز حساب الأستاذ
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black">
            {step === 1 && "الخطوة ①: تحديد المستويات المسندة"}
            {step === 2 && "الخطوة ②: إضافة الأفواج التربوية (أقسامك)"}
            {step === 3 && "الخطوة ③: ساعة الاستقبال والتواصل مع الأولياء"}
            {step === 4 && "🎉 مبارك! تم تجهيز فضائك التعليمي"}
          </h2>

          <p className="text-xs text-emerald-100/90 mt-1">
            {step === 1 && "اختر فقط السنوات التي تدرسها هذا الموسم لتخصيص الواجهة لك ولأوليائك بدقة."}
            {step === 2 && "أضف الأقسام التي تدرسها بنقرة واحدة لتنظيم كراس القسم والتقويمات."}
            {step === 3 && "حدد موعد استقبالك الأسبوعي للأولياء لبناء جسر تواصل تربوي منظم."}
            {step === 4 && "إليك الرموز وروابط الفضاء المخصصة حصراً لما تدرسه، جاهزة للمشاركة."}
          </p>

          {/* مؤشر الخطوات */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex flex-col gap-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s <= step ? "bg-emerald-400" : "bg-white/20"
                  }`}
                />
                <span
                  className={`text-[10px] text-center font-bold ${
                    s === step ? "text-emerald-300 font-black" : "text-white/50"
                  }`}
                >
                  {s === 1 && "المستويات"}
                  {s === 2 && "الأفواج"}
                  {s === 3 && "الاستقبال"}
                  {s === 4 && "الرموز"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* محتوى الخطوة */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* ────── الخطوة 1: المستويات ────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-start gap-2.5">
                <HelpCircle className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  <strong>توجيه بيداغوجي:</strong> في النظام السابق كانت كل المستويات تظهر عشوائياً. الآن، ما تحدده هنا هو فقط ما سيظهر لك في اللوحة وفي رموز الأولياء؛ وأي مستوى لا تدرسه سيُخفى تماماً من حسابك.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { lvl: 1, title: "السنة 1 متوسط", desc: "الأعداد الطبيعية والعشرية، الحساب الحرفي..." },
                  { lvl: 2, title: "السنة 2 متوسط", desc: "العمليات على الكسور، الزوايا، التناظر المركزي..." },
                  { lvl: 3, title: "السنة 3 متوسط", desc: "الأعداد النسبية، نظرية طالس، القوى..." },
                  { lvl: 4, title: "السنة 4 متوسط (BEM)", desc: "الحساب الشعاعي، فيثاغورس، الدوال، الإحصاء..." },
                ].map(({ lvl, title, desc }) => {
                  const isSelected = selectedLevels.includes(lvl);
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => toggleLevel(lvl)}
                      className={`text-right p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                        isSelected
                          ? "bg-emerald-50/60 border-emerald-600 shadow-sm"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-black text-slate-900">{title}</span>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                            isSelected
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{desc}</p>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                يمكنك اختيار مستوى واحد أو أكثر حسب إسناد مؤسستك، ويمكن تعديلها لاحقاً من الإعدادات في أي وقت.
              </p>
            </div>
          )}

          {/* ────── الخطوة 2: الأفواج ────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 flex items-start gap-2.5">
                <School className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-relaxed font-medium">
                  <strong>أفواجك الفعلية:</strong> اضغط على الأزرار السريعة أدناه لإضافة أقسامك المسندة، أو اكتب اسم أي فوج خاص بك (مثل: 1م3، 2م5).
                </p>
              </div>

              {/* أزرار سريعة للأفواج بحسب المستويات المختارة */}
              {selectedLevels.map((lvl) => (
                <div key={lvl} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                  <span className="text-xs font-black text-slate-800 block">
                    أفواج السنة {lvl} متوسط المقترحة:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                      const candidate = `${lvl}م${num}`;
                      const isAdded = classes.includes(candidate);
                      return (
                        <button
                          key={candidate}
                          type="button"
                          onClick={() => (isAdded ? removeClass(candidate) : addQuickClass(candidate))}
                          className={`text-xs font-black px-2.5 py-1 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                            isAdded
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50"
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{candidate}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3 text-slate-400" />
                              <span>{candidate}</span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* إضافة فوج مخصص */}
              <form onSubmit={handleAddCustomClass} className="flex gap-2">
                <input
                  type="text"
                  value={customClassInput}
                  onChange={(e) => setCustomClassInput(e.target.value)}
                  placeholder="اسم فوج آخر (مثلاً: 1م فوج خاص)..."
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!customClassInput.trim()}
                  className="btn-primary py-2 px-3 text-xs font-bold whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </form>

              {/* قائمة الأفواج المضافة حالياً */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  الأفواج المعتمدة في حسابك ({classes.length}):
                </span>
                {classes.length === 0 ? (
                  <div className="text-center py-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                    لم تقم بإضافة أي فوج بعد. انقر على أزرار المقترحات بالأعلى.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {classes.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-black shadow-2xs"
                      >
                        <span>{c}</span>
                        <button
                          type="button"
                          onClick={() => removeClass(c)}
                          className="text-emerald-700 hover:text-red-600 transition"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ────── الخطوة 3: ساعة الاستقبال ────── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-2.5">
                <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  <strong>تنظيم استقبال الأولياء:</strong> ساعة الاستقبال تظهر في صفحة أولياء تلاميذك مع تنبيه بأنه لن يُستقبل الولي خارج هذا التوقيت الرسمي تجنباً للإحراج. يمكنك تركها وتعديلها لاحقاً إذا لم تتلقَ توقيتك الرسمي بعد.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    يوم الاستقبال الرسمي:
                  </label>
                  <select
                    value={receptionDay}
                    onChange={(e) => setReceptionDay(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- لم يُحدد بعد --</option>
                    {SCHOOL_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التوقيت (الساعة):
                  </label>
                  <input
                    type="text"
                    value={receptionTime}
                    onChange={(e) => setReceptionTime(e.target.value)}
                    placeholder="مثال: من 10:00 إلى 11:00"
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مكان الاستقبال:</label>
                <input
                  type="text"
                  value={receptionLocation}
                  onChange={(e) => setReceptionLocation(e.target.value)}
                  placeholder="مثال: قاعة الأساتذة / المكتبة المدرسية"
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  توجيه أو نصيحة للأولياء عند الزيارة (اختياري):
                </label>
                <textarea
                  value={receptionGuidance}
                  onChange={(e) => setReceptionGuidance(e.target.value)}
                  rows={2}
                  placeholder="مثال: يُرجى إحضار كراس التلميذ وجدول متابعة الواجبات عند الحضور..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* ────── الخطوة 4: شاشة النجاح والرموز المخصصة ────── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1">
                <span className="text-2xl">🎉</span>
                <h3 className="text-sm font-black text-emerald-950">
                  تم حفظ إعدادات فضائك التعليمي بنجاح!
                </h3>
                <p className="text-xs text-emerald-800">
                  تم حصر حسابك على المستويات المسندة إليك: (
                  {selectedLevels.map((l) => `السنة ${l}م`).join(" و ")}) مع {classes.length} أفواج تربوية.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-black text-slate-800 block">
                  رموز فضاء الأولياء المخصصة لك لمشاركتها:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedLevels.map((lvl) => {
                    const code = `${profile.teacher_code || "MTH"}-${lvl}`;
                    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/t/${profile.slug || profile.teacher_code}?lvl=${lvl}`;
                    const isCopied = copiedCode === code;

                    return (
                      <div
                        key={lvl}
                        className="bg-white p-3 rounded-2xl border border-emerald-200 shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-slate-600 block">
                            السنة {lvl} متوسط
                          </span>
                          <code className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                            {code}
                          </code>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(code);
                              setCopiedCode(code);
                              setTimeout(() => setCopiedCode(null), 2000);
                            }}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer text-xs"
                            title="نسخ الرمز"
                          >
                            {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(
                              `السلام عليكم أولياء تلاميذ السنة ${lvl} متوسط (مادة ${profile.subject || "الرياضيات"}):\nإليكم رابط ورمز متابعة كراس القسم والدروس الأسبوعية:\nرمز المستوى: ${code}\nالرابط المباشر: ${url}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition text-xs"
                            title="مشاركة عبر واتساب"
                          >
                            <Share2 className="w-4 h-4 text-emerald-600" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* أزرار التنقل السفلية */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          {step > 1 && step < 4 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="btn-secondary py-2.5 px-4 text-xs font-bold cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 ml-1" />
              <span>السابق</span>
            </button>
          )}

          {step === 1 && (
            <div className="text-[11px] text-slate-400">الخطوة 1 من 3</div>
          )}

          <div className="flex items-center gap-2 mr-auto">
            {step === 3 && (
              <button
                type="button"
                onClick={handleSaveAndProceed}
                disabled={saving}
                className="py-2.5 px-3 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                تخطي وحفظ الآن
              </button>
            )}

            {step < 3 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as any)}
                className="btn-primary py-2.5 px-5 text-xs font-black cursor-pointer shadow-md"
              >
                <span>متابعة</span>
                <ArrowLeft className="w-4 h-4 mr-1" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleSaveAndProceed}
                disabled={saving}
                className="btn-primary py-2.5 px-6 text-xs font-black cursor-pointer shadow-md"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-1" />
                    <span>جارٍ حفظ الفضاء...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 ml-1" />
                    <span>تأكيد وانطلاق</span>
                  </>
                )}
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={onClose}
                className="btn-primary py-2.5 px-6 text-xs font-black cursor-pointer shadow-md"
              >
                <span>دخول لوحة التحكم الآن 🚀</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
