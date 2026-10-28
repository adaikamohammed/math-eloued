"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Lock, Mail, Loader2, AlertCircle, ArrowLeft, ArrowRight, GraduationCap, ShieldCheck, Clock, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingReview, setPendingReview] = useState(false);
  const [isSharedDevice, setIsSharedDevice] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setPendingReview(false);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("لم يتم العثور على بيانات المستخدم");
      }

      // جلب الملف الشخصي لمعرفة الدور وحالة التفعيل والاعتماد
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role, full_name, district_id, is_verified, verification_status")
        .eq("id", data.user.id)
        .single();

      if (profileErr || !profile) {
        throw new Error("تعذر تحميل ملف الحساب، يرجى المحاولة مرة أخرى");
      }

      // التحقق من حالة اعتماد الأستاذ
      if (profile.role === "teacher" && profile.is_verified === false) {
        await supabase.auth.signOut();
        setPendingReview(true);
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

      // توجيه ذكي حسب الدور
      const next = new URLSearchParams(window.location.search).get("next");
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
      const isSchemaError =
        rawMsg.includes("Database error querying schema") ||
        rawMsg.includes("AuthRetryableFetchError") ||
        rawMsg.includes("unexpected_failure") ||
        err?.status === 500;

      if (isSchemaError) {
        setErrorMsg(
          "تعذر تسجيل الدخول بالحساب التجريبي (Database error querying schema): يتطلب تشغيل استعلام الإصلاح في Supabase Dashboard -> SQL Editor، أو يمكنك الضغط أدناه لإنشاء حساب أستاذ جديد فوراً وموثق بنقرة واحدة."
        );
      } else {
        setErrorMsg(
          rawMsg === "Invalid login credentials"
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : rawMsg || "حدث خطأ أثناء تسجيل الدخول"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 mb-6 transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للرئيسية</span>
        </Link>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/20">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            تسجيل دخول الأستاذ والمفتش
          </h2>
          <p className="text-xs text-slate-500">
            أدخل بريدك الإلكتروني وكلمة المرور للوصول إلى لوحة التحكم
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-100 sm:px-10">
          {errorMsg && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold animate-shake space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                <div className="space-y-2 leading-relaxed">
                  <p>{errorMsg}</p>
                  {(errorMsg.includes("Database error") || errorMsg.includes("استعلام الإصلاح")) && (
                    <div className="pt-1">
                      <Link
                        href="/join?key=asateza-2026"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>إنشاء حساب أستاذ جديد فوراً بدعوة خاصة</span>
                        <ArrowLeft className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {pendingReview && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>حسابك قيد التدقيق الإداري</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                ملف انضمامك والوثيقة الإثباتية قيد الفحص والمراجعة حالياً من قبل إدارة المنصة والمفتشية. سيتم تفعيل حسابك فور التحقق.
              </p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-mono"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-mono"
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
                  className="rounded text-emerald-600 focus:ring-emerald-500 mt-1 cursor-pointer"
                />
                <div className="text-right">
                  <span className="text-xs font-black text-slate-800 block">
                    حاسوب قاعة الأساتذة أو جهاز مشترك 🖥️
                  </span>
                  <span className="text-[10px] text-slate-500 leading-snug block mt-0.5">
                    حماية الجلسة: تسجيل خروج ومسح الذاكرة المؤقتة تلقائياً عند إغلاق التبويب.
                  </span>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-700/20 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
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
          </form>

          <div className="mt-5 text-center text-xs text-slate-500 space-y-2">
            <p>التسجيل مخصص لأساتذة التعليم المتوسط عبر رابط دعوة رسمي من إدارة المؤسسة.</p>
            <Link
              href="/join?key=asateza-2026"
              className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-extrabold hover:underline"
            >
              <span>هل أنت أستاذ ولديك رمز دعوة؟ أنشئ حسابك الآن</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* حسابات العرض التجريبي للمقاطعة 1 */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                حسابات العرض التجريبي (المقاطعة 1):
              </span>
              <span className="text-[10px] text-slate-400 font-normal">نقرة واحدة للتعبئة</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-right">
              <button
                type="button"
                onClick={() => {
                  setEmail("prof.kaddouri@eloued-math.dz");
                  setPassword("ProfKaddouri2026!");
                }}
                className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/70 hover:bg-emerald-100/70 text-right text-xs transition cursor-pointer"
              >
                <div className="font-bold text-emerald-900">الأستاذ بلقاسم قدوري</div>
                <div className="text-[10px] text-emerald-700 font-mono">MTH-101 • 1م و 4م</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail("prof.adaika@eloued-math.dz");
                  setPassword("ProfAdaika2026!");
                }}
                className="p-2.5 rounded-xl border border-teal-100 bg-teal-50/70 hover:bg-teal-100/70 text-right text-xs transition cursor-pointer"
              >
                <div className="font-bold text-teal-900">الأستاذة مريم عدايكة</div>
                <div className="text-[10px] text-teal-700 font-mono">MTH-102 • 2م و 3م</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail("prof.tidjani@eloued-math.dz");
                  setPassword("ProfTidjani2026!");
                }}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-right text-xs transition cursor-pointer"
              >
                <div className="font-bold text-slate-800">الأستاذ إبراهيم التجاني</div>
                <div className="text-[10px] text-slate-600 font-mono">MTH-103 • 3م و 4م</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail("inspecteur.laamouri@eloued-math.dz");
                  setPassword("Inspecteur2026!");
                }}
                className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-right text-xs transition cursor-pointer"
              >
                <div className="font-bold text-amber-900 flex items-center justify-between">
                  <span>المفتش عبد القادر لعموري</span>
                  <span className="text-[9px] bg-amber-200/80 text-amber-900 px-1 py-0.2 rounded font-bold">مفتش 1</span>
                </div>
                <div className="text-[10px] text-amber-700">مفتشية المقاطعة 1</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
