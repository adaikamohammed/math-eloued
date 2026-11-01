"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useTeacherId, withTeacher, useTeacherInfo } from "@/lib/teacherParam";
import {
  ArrowRight,
  ShieldCheck,
  Send,
  HelpCircle,
  Lightbulb,
  Scale,
  MessageCircle,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  Building2,
  Lock,
  Check,
  UserCheck,
} from "lucide-react";
import { MessageCategory, MIDDLE_SCHOOL_SUBJECTS } from "@/lib/types";

// أصناف الرسائل
const CATEGORIES: {
  id: MessageCategory;
  label: string;
  icon: any;
  color: string;
  activeColor: string;
  desc: string;
}[] = [
  {
    id: "question",
    label: "سؤال حول درس أو تمرين",
    icon: HelpCircle,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    activeColor: "bg-blue-600 text-white border-blue-600 shadow-sm",
    desc: "نقطة لم يفهمها ابنك في الحصة أو صعوبة في حل تمرين وواجب",
  },
  {
    id: "suggestion",
    label: "اقتراح أو فكرة تطويرية",
    icon: Lightbulb,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    activeColor: "bg-amber-600 text-white border-amber-600 shadow-sm",
    desc: "فكرة لتحسين الحصة، تنظيم التمارين أو الفضاء التعليمي",
  },
  {
    id: "criticism",
    label: "نقد بنّاء أو ملاحظة صريحة",
    icon: Scale,
    color: "text-purple-600 bg-purple-50 border-purple-200",
    activeColor: "bg-purple-600 text-white border-purple-600 shadow-sm",
    desc: "ملاحظة حول وتيرة الشرح، المعاملة، أو أي نقطة لمعالجتها",
  },
  {
    id: "other",
    label: "استفسار أو رسالة عامة",
    icon: MessageCircle,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    activeColor: "bg-emerald-700 text-white border-emerald-700 shadow-sm",
    desc: "أي رسالة تود توجيهها للأستاذ بكل صدق وشفافية وبدون إحراج",
  },
];

const AUDIENCES = [
  { id: "", label: "🔒 بدون تحديد (سري تماماً)" },
  { id: "ولي أمر", label: "ولي أمر تلميذ 👨‍👩‍👦" },
  { id: "تلميذ", label: "تلميذ بالقسم 🎒" },
  { id: "1 متوسط", label: "1 متوسط" },
  { id: "2 متوسط", label: "2 متوسط" },
  { id: "3 متوسط", label: "3 متوسط" },
  { id: "4 متوسط", label: "4 متوسط" },
];

export default function SendMessagePage() {
  const teacherId = useTeacherId();
  const teacherInfo = useTeacherInfo(teacherId);

  const [mounted, setMounted] = useState(false);
  const [category, setCategory] = useState<MessageCategory>("question");
  const [targetLevel, setTargetLevel] = useState("");
  const [content, setContent] = useState("");
  const [hpWebsite, setHpWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [urlLvl, setUrlLvl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const lvl = new URLSearchParams(window.location.search).get("lvl");
      if (lvl) {
        setUrlLvl(lvl);
        setTargetLevel(`${lvl} متوسط`);
      }
    }
  }, []);

  const audiencesList = useMemo(() => {
    if (urlLvl) {
      return [
        { id: `ولي أمر (${urlLvl} متوسط)`, label: `👨‍👩‍👦 ولي أمر (${urlLvl} متوسط)` },
        { id: `تلميذ (${urlLvl} متوسط)`, label: `🎒 تلميذ (${urlLvl} متوسط)` },
        { id: `${urlLvl} متوسط`, label: `🎯 قسم ${urlLvl} متوسط` },
        { id: "", label: "🔒 بدون تحديد (سري تماماً)" },
      ];
    }
    return AUDIENCES;
  }, [urlLvl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMsg("يرجى كتابة نص رسالتك أولاً");
      return;
    }
    if (content.trim().length < 5) {
      setErrorMsg("يرجى توضيح رسالتك أكثر (5 أحرف على الأقل)");
      return;
    }

    setSending(true);
    setErrorMsg("");

    try {
      const res = await fetch(withTeacher("/api/messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          targetLevel: targetLevel || undefined,
          content: content.trim(),
          website: hpWebsite,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        setContent("");
      } else {
        setErrorMsg(data.error || "حدث خطأ أثناء الإرسال");
      }
    } catch {
      setErrorMsg("تعذر الاتصال بالخادم، يرجى المحاولة بعد قليل");
    } finally {
      setSending(false);
    }
  };

  const teacherSlug = teacherInfo?.slug || teacherId;
  const backHref = teacherSlug
    ? `/t/${teacherSlug}${urlLvl ? `?lvl=${urlLvl}` : ""}`
    : "/";

  const subjectObj = MIDDLE_SCHOOL_SUBJECTS.find(
    (s) => s.id === teacherInfo?.subject || s.codePrefix === teacherInfo?.teacher_code?.split("-")[0]
  );

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 font-sans pb-24" dir="rtl">
      {/* ─── رأس الصفحة العريض المتناسق ─── */}
      <header className="bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-900 text-white py-6 sm:py-8 px-4 sm:px-6 lg:px-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition flex items-center gap-2 text-xs font-bold shrink-0 backdrop-blur-md"
              title="الرجوع لصفحة الأستاذ"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لفضاء الأستاذ</span>
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-bold text-emerald-100 border border-white/20">
                  {subjectObj ? `مادة ${subjectObj.name}` : "التعليم المتوسط"}
                </span>
                <span className="text-[10px] bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-black">
                  🔒 خصوصية مشفرة ومجهولة
                </span>
              </div>
              <h1 className="text-base sm:text-xl font-black text-white mt-1">
                صندوق الرسائل والمقترحات السرية
                {teacherInfo?.full_name ? ` — ${teacherInfo.full_name}` : ""}
              </h1>
            </div>
          </div>

          {teacherInfo && (
            <div className="flex items-center gap-2 text-xs text-emerald-100 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 shrink-0">
              <Building2 className="w-4 h-4 text-emerald-300" />
              <span className="font-bold">{teacherInfo.school_custom_name || "المتوسطة"}</span>
            </div>
          )}
        </div>
      </header>

      {/* ─── الحاوية الرئيسية للشاشات الكبيرة والمحمولة ─── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* ════════ العمود الأيمن (استمارة الإرسال - 8 أعمدة) ════════ */}
          <div className="lg:col-span-8 space-y-5">
            {success ? (
              /* شاشة تأكيد النجاح */
              <div className="bg-white rounded-3xl p-6 sm:p-10 border border-emerald-200 shadow-sm text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-inner">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">
                    وصلت رسالتك للأستاذ بسرية تامة! ✨
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed font-medium">
                    شكراً لحرصك واهتمامك. ستصل هذه الرسالة مباشرة لحساب الأستاذ ليطّلع عليها ويأخذ ملاحظتك بعين
                    الاعتبار في الحصص القادمة إن شاء الله.
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-2.5 justify-center">
                  <button
                    type="button"
                    onClick={() => setSuccess(false)}
                    className="py-2.5 px-5 rounded-2xl bg-slate-100 text-slate-700 text-xs font-black hover:bg-slate-200 transition cursor-pointer"
                  >
                    كتابة رسالة أخرى
                  </button>
                  <Link
                    href={backHref}
                    className="py-2.5 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition shadow-sm"
                  >
                    العودة إلى فضاء الأستاذ
                  </Link>
                </div>
              </div>
            ) : (
              /* نموذج كتابة الرسالة */
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5"
              >
                {/* حقل فخ لمنع الروبوتات */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    opacity: 0,
                    height: 0,
                    width: 0,
                    overflow: "hidden",
                  }}
                >
                  <label htmlFor="website">اترك هذا الحقل فارغاً</label>
                  <input
                    id="website"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={hpWebsite}
                    onChange={(e) => setHpWebsite(e.target.value)}
                  />
                </div>

                {/* 1. نوع وموضوع الرسالة */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-900">
                      1. اختر موضوع الرسالة: <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">اختر الصنف الأنسب</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const active = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`p-3.5 rounded-2xl border text-right transition flex items-start gap-3 cursor-pointer select-none ${
                            active
                              ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/20"
                              : "bg-slate-50/70 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-white text-slate-700 shadow-2xs border border-slate-200"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black">{cat.label}</div>
                            <div
                              className={`text-[10px] mt-0.5 leading-snug font-medium ${
                                active ? "text-slate-300" : "text-slate-500"
                              }`}
                            >
                              {cat.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. الصف أو الصفة (اختياري) */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-900">
                      2. الصف أو الصفة (اختياري):
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      لمساعدة الأستاذ في فهم سياق الملاحظة
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {audiencesList.map((aud) => (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => setTargetLevel(aud.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                          targetLevel === aud.id
                            ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs font-black"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {aud.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. نص الرسالة */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-900">
                      3. اكتب رسالتك وملاحظتك بكل حرية وصراحة: <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-bold font-mono">
                      {content.length} / 3000
                    </span>
                  </div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="اكتب هنا ما تشاء بكل صراحة... مثلاً: لم يفهم ابني طريقة حل التمرين الفلاني، أو أقترح تسريع/تبطيء وتيرة الشرح، أو استفسار حول نقطة معينة..."
                    rows={6}
                    maxLength={3000}
                    className="w-full rounded-2xl border border-slate-200 p-4 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition leading-relaxed bg-slate-50/50 hover:bg-white focus:bg-white font-medium"
                    required
                  />
                </div>

                {errorMsg && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* زر الإرسال */}
                <button
                  type="submit"
                  disabled={sending || !content.trim()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الإرسال بسرية...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال الرسالة بسرية تامة 🔒</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* ════════ العمود الأيسر (دليل السرية والنصائح - 4 أعمدة في الحاسوب) ════════ */}
          <aside className="lg:col-span-4 space-y-5">
            {/* بطاقة ميثاق الأمان والسرية التامة */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 sm:p-6 rounded-3xl shadow-sm space-y-3 border border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    هويتك محمية ومجهولة تماماً 🔒
                  </h3>
                  <span className="text-[10px] text-emerald-300 font-bold">ضمان الأمان البيداغوجي</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                هذا الصندوق مخصص لتعزيز الصراحة البناءة بين الأستاذ وتلاميذه وأوليائهم. لن يتم
                تسجيل اسمك، بريدك، رقم هاتفك، أو أي معلومة تكشف هويتك.
              </p>

              <div className="pt-2 border-t border-white/10 space-y-2 text-xs text-emerald-100/90 font-bold">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>بدون الحاجة لأي تسجيل دخول</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>مشفر ومجهول المصدر بالكامل</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>يصل مباشرة لصندوق الأستاذ الخاص</span>
                </div>
              </div>
            </div>

            {/* بطاقة إرشادات لكتابة رسالة فعالة */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>نصائح لكتابة ملاحظة نافعة</span>
              </h4>

              <ul className="text-xs text-slate-600 space-y-2 font-medium leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">💡</span>
                  <span>إذا كان استفساراً علمياً، اذكر رقم التمرين أو الصفحة أو عنوان الدرس بدقة.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">💡</span>
                  <span>عبّر عن ملاحظتك بلباقة وصراحة لمساعدة الأستاذ في تطوير الحصة.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">💡</span>
                  <span>يمكنك ترك وسيلة اتصال في نص الرسالة إذا رغبت برد فردي من الأستاذ.</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
