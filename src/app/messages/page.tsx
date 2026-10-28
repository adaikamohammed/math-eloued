"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useTeacherId, withTeacher, useTeacherInfo, teacherLabel } from "@/lib/teacherParam";
import {
  ArrowRight,
  ShieldCheck,
  Send,
  HelpCircle,
  Lightbulb,
  Scale,
  MessageCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { MessageCategory } from "@/lib/types";

const CATEGORIES: {
  id: MessageCategory;
  label: string;
  icon: any;
  color: string;
  desc: string;
}[] = [
  {
    id: "question",
    label: "سؤال حول درس أو تمرين",
    icon: HelpCircle,
    color: "from-blue-600 to-indigo-600",
    desc: "نقطة لم تفهمها في القسم أو صعوبة في حل تمرين",
  },
  {
    id: "suggestion",
    label: "اقتراح أو فكرة تطويرية",
    icon: Lightbulb,
    color: "from-amber-500 to-yellow-600",
    desc: "فكرة لتحسين الحصة، تنظيم التمارين أو الموقع",
  },
  {
    id: "criticism",
    label: "نقد بنّاء أو ملاحظة صريحة",
    icon: Scale,
    color: "from-purple-600 to-pink-600",
    desc: "ملاحظة حول وتيرة الشرح، المعاملة، أو أي استياء لمعالجته",
  },
  {
    id: "other",
    label: "استفسار أو رسالة عامة",
    icon: MessageCircle,
    color: "from-emerald-600 to-teal-600",
    desc: "أي رسالة تود توجيهها للأستاذ بكل صدق وشفافية",
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

export default function MessagesPage() {
  const teacherId = useTeacherId();
  const teacherInfo = useTeacherInfo(teacherId);
  const [category, setCategory] = useState<MessageCategory>("question");
  const [targetLevel, setTargetLevel] = useState("");
  const [content, setContent] = useState("");
  const [hpWebsite, setHpWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [urlLvl, setUrlLvl] = useState<string | null>(null);

  useEffect(() => {
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

  const backHref = teacherId
    ? `/t/${teacherId}${urlLvl ? `?lvl=${urlLvl}` : ""}`
    : "/";

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans py-6 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* رأس الصفحة وزر العودة */}
        <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
          <Link
            href={backHref}
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition shrink-0"
            aria-label="الرجوع للرئيسية"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 mb-0.5">
              <Lock className="w-3 h-3 text-emerald-600" /> شفافية وسرية 100%
            </div>
            <h1 className="text-base font-extrabold text-slate-900 truncate">
              صندوق الصراحة والشفافية
            </h1>
            <p className="text-[11px] text-slate-500">
              وجّه رسالة سرية أو ملاحظة {teacherInfo ? `لـ ${teacherInfo.full_name}` : "للأستاذ"}
            </p>
          </div>
        </div>

        {/* ميثاق الأمان والسرية التامة */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-3xl shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-200 shrink-0" />
            <h2 className="text-sm font-black text-white">هويتك محمية ومجهولة تماماً 🔒</h2>
          </div>
          <p className="text-xs text-emerald-50 leading-relaxed font-medium">
            هذا الصندوق مخصص لتعزيز الصراحة البناءة بين الأستاذ وتلاميذه وأوليائهم. لن يتم
            تسجيل اسمك أو بريدك أو رقم هاتفك أو أي معلومة تكشف هويتك. اكتب بكل راحة
            واطمئنان أي نقد، سؤال أو اقتراح يساهم في مصلحتكم جميعاً.
          </p>
        </div>

        {success ? (
          /* شاشة نجاح الإرسال */
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm text-center space-y-4 fade-up">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                وصلت رسالتك بسرية تامة!
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                شكراً لصراحتك وحرصك على التواصل. سيطّلع الأستاذ على رسالتك ويأخذ ملاحظتك بعين
                الاعتبار في الحصص القادمة إن شاء الله.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={() => setSuccess(false)}
                className="py-2.5 px-5 rounded-xl bg-slate-100 text-slate-700 text-xs font-black hover:bg-slate-200 transition"
              >
                كتابة رسالة أخرى
              </button>
              <Link
                href={backHref}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition shadow-sm"
              >
                العودة إلى فضاء الأستاذ
              </Link>
            </div>
          </div>
        ) : (
          /* نموذج كتابة الرسالة */
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs space-y-4"
          >
            {/* حقل فخ لمنع الروبوتات من إغراق المنظومة (مخفي برمجياً عن المستخدمين الحقيقيين) */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, width: 0, overflow: "hidden" }}>
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
            {/* 1. نوع الرسالة */}
            <div>
              <label className="text-xs font-black text-slate-800 block mb-2">
                1. ما هو موضوع رسالتك؟:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const active = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-2xl border text-right transition flex items-start gap-2.5 cursor-pointer ${
                        active
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          active ? "bg-white/20 text-white" : "bg-white text-slate-700 shadow-2xs"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black">{cat.label}</div>
                        <div
                          className={`text-[10px] mt-0.5 leading-snug ${
                            active ? "text-slate-300" : "text-slate-400"
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

            {/* 2. الصف أو الصفة (اختياري تماماً) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-800">
                  2. الصف أو الصفة (اختياري):
                </label>
                <span className="text-[10px] text-slate-400 font-bold">
                  لمساعدة الأستاذ في فهم السياق
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {audiencesList.map((aud) => (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => setTargetLevel(aud.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                      targetLevel === aud.id
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {aud.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. نص الرسالة */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-800">
                  3. اكتب رسالتك وملاحظتك بكل حرية وصراحة: <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-bold">
                  {content.length} / 3000
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="اكتب هنا ما تشاء بكل صراحة... مثلاً: لم أفهم طريقة حل التمرين الفلاني، أو أقترح تسريع/تبطيء وتيرة الشرح، أو ملاحظة حول طريقة معينة..."
                rows={5}
                maxLength={3000}
                className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition leading-relaxed"
                required
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* زر الإرسال */}
            <button
              type="submit"
              disabled={sending || !content.trim()}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
    </div>
  );
}