"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { validatePasswordStrength } from "@/lib/passwordPolicy";
import { MIDDLE_SCHOOL_SUBJECTS } from "@/lib/types";
import {
  Lock,
  Mail,
  User,
  Building2,
  MapPin,
  Loader2,
  AlertCircle,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  BookOpen,
  CheckCircle2,
  LogIn,
  UserPlus,
} from "lucide-react";

const DISTRICTS = [
  { id: 1, name: "المقاطعة 1 — الوادي 1" },
  { id: 2, name: "المقاطعة 2 — الوادي 2" },
  { id: 3, name: "المقاطعة 3 — قمار" },
  { id: 4, name: "المقاطعة 4 — الرقيبة" },
  { id: 5, name: "المقاطعة 5 — الدبيلة والمقرن" },
  { id: 0, name: "ولاية أخرى / مقاطعة أخرى" },
];

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // التبويب الافتراضي هو "إنشاء حساب" (register) فوراً بناءً على طلب المنصة للعامة
  const initialTab = searchParams.get("tab") === "login" ? "login" : "register";
  const [activeTab, setActiveTab] = useState<"register" | "login">(initialTab);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "login") setActiveTab("login");
    else if (tab === "register") setActiveTab("register");
  }, [searchParams]);

  // حقول تسجيل الدخول
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSharedDevice, setIsSharedDevice] = useState(false);

  // حقول إنشاء حساب جديد
  const [fullName, setFullName] = useState("");
  const [subject, setSubject] = useState("mathematics");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [districtId, setDistrictId] = useState("1");
  const [middleSchoolName, setMiddleSchoolName] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [registeredCode, setRegisteredCode] = useState<string | null>(null);

  // ── 1. معالجة إنشاء الحساب فورياً ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    const pwdCheck = validatePasswordStrength(regPassword);
    if (!pwdCheck.valid) {
      setErrorMsg(pwdCheck.error || "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على أرقام وأحرف");
      return;
    }

    setLoading(true);

    try {
      const subjectObj = MIDDLE_SCHOOL_SUBJECTS.find((s) => s.id === subject);
      const prefix = subjectObj?.codePrefix || "MTH";
      const randomCode = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
      const cleanSlug = `prof-${Math.random().toString(36).substring(2, 8)}`;
      const cleanEmail = regEmail.trim().toLowerCase();

      // محاولة التسجيل عبر دالة النظام المباشرة
      let registeredSuccessfully = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("register_teacher_instant", {
          p_email: cleanEmail,
          p_password: regPassword,
          p_full_name: fullName.trim(),
          p_subject: subject,
          p_district_id: Number(districtId) || 1,
          p_school_custom_name: middleSchoolName.trim() || "متوسطة ولاية الوادي",
          p_teacher_code: randomCode,
          p_slug: cleanSlug,
        });

        if (!rpcErr && rpcRes && rpcRes.success !== false) {
          registeredSuccessfully = true;
        }
      } catch {
        registeredSuccessfully = false;
      }

      // في حال عدم توفر الـ RPC يتم التسجيل المباشر عبر Supabase Auth
      if (!registeredSuccessfully) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: regPassword,
          options: {
            data: {
              full_name: fullName.trim(),
              role: "teacher",
              subject: subject,
              district_id: Number(districtId) || 1,
              school_custom_name: middleSchoolName.trim() || "متوسطة ولاية الوادي",
              teacher_code: randomCode,
              slug: cleanSlug,
            },
          },
        });

        if (signUpErr) {
          throw signUpErr;
        }
      }

      // تسجيل الدخول التلقائي بعد إنشاء الحساب
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: regPassword,
      });

      if (loginErr) {
        console.warn("Auto login warning:", loginErr);
      }

      setRegisteredCode(randomCode);

      setTimeout(() => {
        router.push("/admin?welcome=1");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error("Register error:", err);
      const raw = String(err?.message || "");

      if (raw.includes("already registered") || raw.includes("User already registered") || raw.includes("مسجل مسبقاً")) {
        setErrorMsg("هذا البريد الإلكتروني مسجل مسبقاً في المنصة. يمكنك التبديل إلى تبويب 'تسجيل الدخول' أعلاه.");
      } else if (raw.includes("rate limit") || raw.includes("over_email_send_rate_limit")) {
        setErrorMsg("تم تجاوز الحد المسموح به حالياً. يرجى المحاولة بعد لحظات.");
      } else {
        setErrorMsg(raw || "حدث خطأ أثناء إنشاء الحساب، يرجى التحقق من البيانات والمحاولة مجدداً");
      }
      setLoading(false);
    }
  };

  // ── 2. معالجة تسجيل الدخول ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("لم يتم العثور على بيانات المستخدم");
      }

      // جلب الملف الشخصي لمعرفة الدور
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role, full_name, district_id, is_verified")
        .eq("id", data.user.id)
        .single();

      if (profileErr || !profile) {
        // إذا كان أستاذ مسجل جديد نوجهه للأدمن مباشرة
        router.push("/admin");
        return;
      }

      // حفظ وضع الحاسوب المشترك في الجلسة لتأمين الحساب
      try {
        if (isSharedDevice) {
          sessionStorage.setItem("jusoor_shared_device", "true");
        } else {
          sessionStorage.removeItem("jusoor_shared_device");
        }
      } catch {}

      const next = searchParams.get("next");
      let safeNext: string | null = null;
      if (next && next.startsWith("/") && !/[\\\s]/.test(next)) {
        try {
          const target = new URL(next, window.location.origin);
          if (target.origin === window.location.origin) safeNext = target.pathname + target.search + target.hash;
        } catch {
          safeNext = null;
        }
      }

      if (profile.role === "admin") {
        router.push("/super-admin");
      } else if (profile.role === "inspector") {
        router.push("/inspector");
      } else {
        router.push(safeNext || "/admin");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const rawMsg = String(err?.message || "");
      if (rawMsg === "Invalid login credentials") {
        setErrorMsg("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else {
        setErrorMsg(rawMsg || "حدث خطأ أثناء تسجيل الدخول");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── شاشة النجاح الفوري ──
  if (registeredCode) {
    return (
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            تم إنشاء وتفعيل الحساب بنجاح 🎉
          </span>
          <h1 className="text-2xl font-black text-slate-900">
            مرحباً بك أستاذنا الفاضل!
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            تم فتح فضاءك التعليمي باعتماد كود الأستاذ الخاص بك:
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 text-white font-mono text-xl font-black tracking-widest shadow-inner">
          {registeredCode}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          <span>جاري نقلك فوراً إلى لوحة التحكم...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-lg">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 mb-5 transition"
      >
        <ArrowRight className="w-4 h-4" />
        <span>العودة للرئيسية</span>
      </Link>

      {/* بطاقة الواجهة الرئيسية */}
      <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/90 sm:px-10 space-y-6">
        {/* رأس البطاقة */}
        <div className="text-center space-y-2 pb-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            منصة جسور التعليمية
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {activeTab === "register"
              ? "إنشاء حساب أستاذ جديد وتفعيل الفضاء البيداغوجي فوراً"
              : "تسجيل دخول الأساتذة والمفتشين المعتمدين"}
          </p>
        </div>

        {/* أزرار التبديل الاحترافية (إنشاء حساب أولاً بشكل افتراضي) */}
        <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl text-xs font-black">
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setErrorMsg("");
            }}
            className={`py-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "register"
                ? "bg-white text-emerald-800 shadow-sm font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>إنشاء حساب جديد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setErrorMsg("");
            }}
            className={`py-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "login"
                ? "bg-white text-emerald-800 shadow-sm font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LogIn className="w-4 h-4 text-slate-500" />
            <span>تسجيل الدخول</span>
          </button>
        </div>

        {/* رسالة الخطأ إن وجدت */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            نموذج 1: إنشاء حساب أستاذ جديد (الافتراضي للعامة)
            ════════════════════════════════════════════════════════ */}
        {activeTab === "register" && (
          <form className="space-y-4 text-xs" onSubmit={handleRegister}>
            {/* الاسم الكامل */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                الاسم واللقب الكامل للأستاذ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: أستاذ عبد القادر بن عمارة"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            {/* مادة التدريس (جميع مواد التعليم المتوسط) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                مادة التدريس (التعليم المتوسط) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-medium appearance-none cursor-pointer"
                >
                  {MIDDLE_SCHOOL_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.name} ({s.codePrefix})
                    </option>
                  ))}
                </select>
                <BookOpen className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            {/* المقاطعة التفتيشية أو الولاية */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  المقاطعة التفتيشية
                </label>
                <div className="relative">
                  <select
                    value={districtId}
                    onChange={(e) => setDistrictId(e.target.value)}
                    className="w-full py-2.5 pl-3 pr-9 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-medium appearance-none cursor-pointer"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  اسم المتوسطة
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="مثال: متوسطة الشهيد..."
                    value={middleSchoolName}
                    onChange={(e) => setMiddleSchoolName(e.target.value)}
                    className="w-full py-2.5 pl-3 pr-9 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50"
                  />
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>
            </div>

            {/* البريد الإلكتروني */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                البريد الإلكتروني <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="prof.name@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-mono text-left"
                  dir="ltr"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            {/* كلمة المرور */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                كلمة المرور <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-mono text-left"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">
                8 أحرف على الأقل، تتضمن أحرفاً وأرقاماً.
              </span>
            </div>

            {/* زر إنشاء الحساب الفوري */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-800/20 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ إنشاء الحساب وتفعيل الفضاء...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>إنشاء وتفعيل حساب الأستاذ فوراً</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center text-[11px] text-slate-500 font-medium">
              <span>لديك حساب بالفعل في المنصة؟ </span>
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                تسجيل الدخول هنا
              </button>
            </div>
          </form>
        )}

        {/* ════════════════════════════════════════════════════════
            نموذج 2: تسجيل الدخول
            ════════════════════════════════════════════════════════ */}
        {activeTab === "login" && (
          <form className="space-y-4 text-xs" onSubmit={handleLogin}>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-mono text-left"
                  dir="ltr"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-mono text-left"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            {/* خيار حماية الجلسة في الحواسيب المشتركة بقاعة الأساتذة */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={isSharedDevice}
                  onChange={(e) => setIsSharedDevice(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer accent-emerald-600"
                />
                <div className="text-right">
                  <span className="text-xs font-black text-slate-800 block">
                    حاسوب قاعة الأساتذة أو جهاز مشترك 🖥️
                  </span>
                  <span className="text-[10px] text-slate-500 leading-snug block mt-0.5">
                    حماية الجلسة: مسح الذاكرة المؤقتة تلقائياً عند إغلاق التبويب.
                  </span>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-800/20 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>دخول إلى المنصة</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center text-[11px] text-slate-500 font-medium">
              <span>أستاذ جديد وليس لديك حساب بعد؟ </span>
              <button
                type="button"
                onClick={() => setActiveTab("register")}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                أنشئ حسابك فوراً الآن
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <Suspense
        fallback={
          <div className="max-w-md mx-auto text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>جاري تحميل الواجهة...</span>
          </div>
        }
      >
        <AuthForm />
      </Suspense>
    </div>
  );
}
