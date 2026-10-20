"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Lock, Mail, Loader2, AlertCircle, ArrowLeft, GraduationCap, ShieldCheck, Clock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingReview, setPendingReview] = useState(false);

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
      setErrorMsg(
        err.message === "Invalid login credentials"
          ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
          : err.message || "حدث خطأ أثناء تسجيل الدخول"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20 mb-2">
          <GraduationCap className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-full text-[11px] text-emerald-800 font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>بوابة الدخول الموحدة — ولاية الوادي</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          تسجيل الدخول
        </h1>
        <p className="text-xs text-slate-500">
          دخول الأساتذة ومفتشي التعليم المتوسط لمادة الرياضيات
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-200/80">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-bold animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
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

          <div className="mt-5 text-center text-xs text-slate-500">
            أستاذ جديد وتريد الانضمام؟{" "}
            <Link href="/register" className="text-emerald-700 font-bold hover:underline">
              تسجيل حساب أستاذ جديد هنا
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
