"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  Building2,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  ShieldCheck,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { MIDDLE_SCHOOL_SUBJECTS } from "@/lib/types";

// مفتاح الدعوة السري الافتراضي للأساتذة
const VALID_INVITE_KEYS = ["asateza-2026", "eloued-teachers", "bahi-ali-2026"];

const DISTRICTS = [
  { id: 1, name: "المقاطعة 1" },
  { id: 2, name: "المقاطعة 2" },
  { id: 3, name: "المقاطعة 3" },
  { id: 4, name: "المقاطعة 4" },
  { id: 5, name: "المقاطعة 5" },
  { id: 0, name: "غير محدد" },
];

function JoinTeacherForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // فحص مفتاح الدعوة من الرابط (?key=... أو ?invite=...)
  const keyFromUrl = searchParams.get("key") || searchParams.get("invite") || "";
  const [inviteKeyInput, setInviteKeyInput] = useState(keyFromUrl);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // حقول بيانات الأستاذ
  const [fullName, setFullName] = useState("");
  const [subject, setSubject] = useState("mathematics");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [districtId, setDistrictId] = useState("1");
  const [middleSchoolName, setMiddleSchoolName] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [registeredCode, setRegisteredCode] = useState<string | null>(null);

  // التحقق التلقائي عند فتح الرابط بمفتاح الدعوة
  useEffect(() => {
    const key = (keyFromUrl || "").trim().toLowerCase();
    if (VALID_INVITE_KEYS.some((k) => k.toLowerCase() === key)) {
      setIsAuthorized(true);
    }
  }, [keyFromUrl]);

  const handleVerifyKey = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inviteKeyInput.trim().toLowerCase();
    if (VALID_INVITE_KEYS.some((k) => k.toLowerCase() === clean)) {
      setIsAuthorized(true);
      setErrorMsg("");
    } else {
      setErrorMsg("رمز الدعوة غير صحيح. يرجى مراجعة إدارة المؤسسة للحصول على الرمز الصحيح.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg("يرجى ملء جميع الحقول الإلزامية");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام");
      return;
    }

    setLoading(true);

    try {
      // 1. توليد كود الأستاذ تلقائياً بحسب المادة
      const subjectObj = MIDDLE_SCHOOL_SUBJECTS.find((s) => s.id === subject);
      const prefix = subjectObj?.codePrefix || "MTH";
      const randomCode = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
      const cleanSlug = `prof-${Math.random().toString(36).substring(2, 8)}`;
      const cleanEmail = email.trim().toLowerCase();

      // 2. استدعاء دالة التسجيل الفوري المباشر (تنشئ الحساب مفعل فوراً بدون رسائل وبدون قيود Rate Limit)
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("register_teacher_instant", {
        p_email: cleanEmail,
        p_password: password,
        p_full_name: fullName.trim(),
        p_subject: subject,
        p_district_id: Number(districtId) || 1,
        p_school_custom_name: middleSchoolName.trim() || "متوسطة ولاية الوادي",
        p_teacher_code: randomCode,
        p_slug: cleanSlug,
      });

      if (rpcErr) {
        if (rpcErr.message?.includes("does not exist") || rpcErr.code === "42883") {
          throw new Error("يرجى تشغيل استعلام التسجيل الفوري في Supabase Dashboard -> SQL Editor أولاً لتفعيل إنشاء الحسابات.");
        }
        throw new Error(rpcErr.message || "حدث خطأ أثناء إنشاء الحساب");
      }

      if (rpcRes && rpcRes.success === false) {
        throw new Error(rpcRes.error || "فشل تسجيل الحساب");
      }

      // 3. تسجيل الدخول الفوري للحساب
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (loginErr) {
        console.warn("Auto login warning:", loginErr);
      }

      setRegisteredCode(randomCode);

      // توجيه تلقائي بعد ثانية ونصف إلى لوحة الأستاذ
      setTimeout(() => {
        router.push("/admin?welcome=1");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error("Join error:", err);
      const raw = String(err?.message || "");

      if (raw.includes("rate limit") || raw.includes("over_email_send_rate_limit")) {
        setErrorMsg(
          "تم تجاوز الحد التجريبي لإرسال الرسائل في خادم Supabase. يرجى تشغيل استعلام instant_teacher_registration.sql المحدث في SQL Editor للتسجيل الفوري بدون رسائل."
        );
      } else if (raw.includes("already registered") || raw.includes("مسجل مسبقاً")) {
        setErrorMsg(
          "هذا البريد مسجل مسبقاً في المنصة. إذا كان هذا حسابك، يمكنك التوجه لصفحة تسجيل الدخول مباشرة."
        );
      } else {
        setErrorMsg(raw || "حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة مجدداً");
      }
      setLoading(false);
    }
  };

  // ─── الشاشة الأولى: بوابة الحماية في حال الدخول بدون مفتاح دعوة ───
  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-10 px-4 font-sans" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#e8e8e0] shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 flex items-center justify-center mx-auto shadow-sm">
            <KeyRound className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black text-[#107a57] bg-[#e6f4ee] px-3 py-1 rounded-full border border-[#107a57]/20">
              فضاء خاص بالأسرة التربوية
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              تسجيل الأساتذة بدعوة خاصة
            </h1>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              إنشاء حساب أستاذ في المنصة مخصص حصرياً للأساتذة عبر رابط دعوة رسمي ترسلها إدارة المؤسسة أو المفتشية البيداغوجية.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 text-right">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* حقل إدخال رمز الدعوة يدوياً لمن يملك الرمز */}
          <form onSubmit={handleVerifyKey} className="space-y-3 pt-2 text-right">
            <label className="block text-xs font-bold text-gray-700">
              أدخل رمز الدعوة المرسل إليك:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteKeyInput}
                onChange={(e) => setInviteKeyInput(e.target.value)}
                placeholder="مثال: asateza-2026"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-mono text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
              />
              <button
                type="submit"
                className="btn-primary text-xs px-4 py-2.5 shrink-0"
              >
                تفعيل
              </button>
            </div>
          </form>

          {/* رابط تسجيل الدخول لمن لديه حساب */}
          <div className="pt-4 border-t border-[#e8e8e0] space-y-2">
            <p className="text-xs text-gray-500 font-medium">
              هل لديك حساب مسجل بالفعل؟
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#107a57] hover:underline"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>تسجيل الدخول إلى حسابك</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── الشاشة الثانية: نجاح التسجيل الفوري ───
  if (registeredCode) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-10 px-4 font-sans" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#e8e8e0] shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              تم التفعيل الفوري للحساب 🎉
            </span>
            <h1 className="text-2xl font-black text-gray-900">
              أهلاً بك أستاذنا الفاضل في المنصة!
            </h1>
            <p className="text-xs text-gray-600 leading-relaxed">
              تم إنشاء مساحتك التعليمية بنجاح واعتماد كودك الخاص:
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#fafaf7] border border-[#e8e8e0] space-y-1">
            <p className="text-xs text-gray-500 font-bold">كود الأستاذ المخصص لك:</p>
            <p className="text-2xl font-black font-mono text-[#107a57] tracking-wider">
              {registeredCode}
            </p>
            <p className="text-[11px] text-gray-500">
              (امنح هذا الكود لأولياء تلاميذك ليدخلوا إلى فضاء دروسك مباشرة)
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-[#107a57]" />
            <span>جارٍ نقلك تلقائياً إلى لوحة التحكم...</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── الشاشة الثالثة: استمارة التسجيل السريعة والفورية ───
  return (
    <div className="min-h-screen bg-[#fafaf7] py-6 sm:py-10 px-4 font-sans" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-bold transition bg-white px-3 py-1.5 rounded-xl border border-[#e8e8e0] shadow-2xs"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للرئيسية</span>
          </Link>
          <span className="text-[11px] font-mono text-[#107a57] bg-[#e6f4ee] px-2.5 py-1 rounded-lg border border-[#107a57]/20 font-bold">
            رابط دعوة معتمد 🔒
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#e8e8e0] shadow-xl space-y-6">
        {/* رأس الاستمارة */}
        <div className="border-b border-[#e8e8e0] pb-5 space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 px-3 py-1 rounded-full text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>دعوة رسمية معتمدة • تسجيل فوري ومباشر</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
            إنشاء حساب الأستاذ
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 font-medium">
            سجّل بياناتك لتفعيل فضاء كراس القسم، السبورات اليومية، وميثاق التقويم (20/20).
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          {/* الاسم واللقب */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-gray-800">
              الاسم واللقب الكامل <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: أ. محمد بلحاج أو أ. عبد الرحيم"
                className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] transition"
              />
              <User className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* مادة التدريس */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-gray-800">
              المادة التعليمية التي تدرّسها <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] transition appearance-none font-bold"
              >
                {MIDDLE_SCHOOL_SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name}
                  </option>
                ))}
              </select>
              <BookOpen className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* المؤسسة التعليمية والمقاطعة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-gray-800">
                المتوسطة / المؤسسة <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={middleSchoolName}
                  onChange={(e) => setMiddleSchoolName(e.target.value)}
                  placeholder="مثال: متوسطة الأمير عبد القادر"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] transition"
                />
                <Building2 className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-gray-800">
                المقاطعة التفتيشية <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] transition appearance-none font-bold"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <MapPin className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* البريد الإلكتروني وكلمة المرور */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-gray-800">
                البريد الإلكتروني <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] transition font-mono"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-gray-800">
                كلمة المرور <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="لا تقل عن 6 خانات..."
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] transition"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* زر التأكيد */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-xs sm:text-sm font-black justify-center shadow-md active:scale-98 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ إنشاء الحساب وتوليد الكود...</span>
                </>
              ) : (
                <>
                  <GraduationCap className="w-5 h-5" />
                  <span>تأكيد الحساب والانضمام الفوري</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-gray-500 text-center">
            بالتسجيل، أنت تلتزم بالأمانة البيداغوجية والمسؤولية عن المحتوى التعليمي المنشور لتلاميذك.
          </p>
        </form>
      </div>
    </div>
  </div>
  );
}

export default function JoinTeacherPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      }
    >
      <JoinTeacherForm />
    </Suspense>
  );
}
