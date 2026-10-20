import Link from "next/link";
import {
  GraduationCap,
  ShieldCheck,
  Search,
  Users,
  Sparkles,
  ArrowLeft,
  MessageSquare,
  FileText,
  Layers,
  Key,
  BookOpen,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TeacherWallet from "@/components/TeacherWallet";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WilayaHomePage() {
  const [{ count: teacherCount }, { count: topicCount }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
    supabase.from("forum_topics").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20" dir="rtl">

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 text-white pt-10 pb-24 px-4 sm:px-6 rounded-b-[3rem] shadow-2xl border-b border-emerald-900/40">
        {/* زخرفة رياضية خلفية */}
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none select-none overflow-hidden font-mono text-3xl tracking-widest">
          <span className="absolute top-10 left-14">f(x) = ax² + bx + c</span>
          <span className="absolute top-28 right-16">π ≈ 3.14159</span>
          <span className="absolute bottom-20 left-1/4">∑(xᵢ − x̄)²</span>
          <span className="absolute bottom-12 right-14">√a² + b² = c</span>
          <span className="absolute top-1/2 left-8">cos²θ + sin²θ = 1</span>
          <span className="absolute top-1/3 right-1/3">∫₀¹ x² dx = 1/3</span>
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-7 relative z-10">
          {/* شارة رسمية */}
          <div className="inline-flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-400/25 px-4 py-1.5 rounded-full text-emerald-300 text-xs font-semibold backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>مديرية التربية لولاية الوادي — مفتشية مادة الرياضيات</span>
          </div>

          {/* العنوان */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-white">
              المنصة الرقمية الموحدة
              <br />
              <span className="text-emerald-400">لمادة الرياضيات</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-light">
              فضاء تربوي مشترك يجمع الأساتذة، الأولياء، والتلاميذ في منصة رقمية واحدة لمتابعة دروس مرحلة التعليم المتوسط بولاية الوادي.
            </p>
          </div>

          {/* أزرار CTA */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="py-3 px-7 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-xl shadow-emerald-700/30 hover:shadow-emerald-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
              <span>تسجيل دخول الأستاذ</span>
            </Link>
            <Link
              href="/register"
              className="py-3 px-7 rounded-2xl bg-white/8 hover:bg-white/12 text-white border border-white/15 font-semibold text-sm backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2.5"
            >
              <GraduationCap className="w-4 h-4 text-emerald-300" />
              <span>إنشاء حساب الأستاذ</span>
            </Link>
            <Link
              href="/forum"
              className="py-3 px-5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-semibold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>ملتقى الأساتذة</span>
            </Link>
          </div>

          {/* إحصائيات */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            <div className="bg-slate-900/60 border border-emerald-900/40 p-3.5 rounded-2xl backdrop-blur-sm text-right">
              <div className="text-2xl font-bold text-white">{teacherCount || "—"}+</div>
              <div className="text-[11px] text-emerald-400 font-medium mt-0.5">أستاذ مسجّل</div>
            </div>
            <div className="bg-slate-900/60 border border-emerald-900/40 p-3.5 rounded-2xl backdrop-blur-sm text-right">
              <div className="text-2xl font-bold text-white">{topicCount || "—"}+</div>
              <div className="text-[11px] text-amber-400 font-medium mt-0.5">موضوع في الملتقى</div>
            </div>
            <div className="bg-slate-900/60 border border-emerald-900/40 p-3.5 rounded-2xl backdrop-blur-sm text-right col-span-2 sm:col-span-1">
              <div className="text-2xl font-bold text-white">4 مستويات</div>
              <div className="text-[11px] text-sky-400 font-medium mt-0.5">1م · 2م · 3م · 4م</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── قسم الولي / التلميذ ─── */}
      <div className="max-w-4xl mx-auto px-4 -mt-10 space-y-6 relative z-20">

        {/* بطاقة البحث بالكود */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="bg-gradient-to-l from-emerald-50 to-white px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">فضاء الولي والتلميذ</h2>
              <p className="text-xs text-slate-500 mt-0.5">أدخل الكود الذي منحك إياه الأستاذ للوصول إلى دروسه وسبورته</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <form action="/t/search" method="GET" className="flex flex-col sm:flex-row items-stretch gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  name="q"
                  placeholder="كود الأستاذ  (مثال: MTH-102)"
                  className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition bg-slate-50/60 font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal"
                />
                <Search className="w-4.5 h-4.5 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
              <button
                type="submit"
                className="py-3.5 px-7 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] cursor-pointer"
              >
                <span>عرض الدروس</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-3">
              <span className="text-amber-500 text-lg leading-none mt-0.5">💡</span>
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>كيف أحصل على الكود؟</strong> الكود يُرسل لك مباشرة من أستاذ ابنك أو ابنتك عبر الرسالة المدرسية أو الكراس. لا يمكن البحث باسم الأستاذ حفاظاً على الخصوصية.
              </p>
            </div>
          </div>
        </div>

        {/* محفظة الولي المحفوظة */}
        <TeacherWallet />

        {/* ─── مميزات المنصة ─── */}
        <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white space-y-5 shadow-xl border border-emerald-900/30">
          <div className="border-b border-emerald-800/30 pb-4">
            <p className="text-xs font-semibold text-emerald-400 mb-1">رؤية بيداغوجية حديثة</p>
            <h3 className="text-lg sm:text-xl font-semibold text-white">
              ماذا تقدم المنصة؟
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-white/5 border border-white/8 p-4 rounded-2xl space-y-2 hover:bg-white/8 transition">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-emerald-200">الملف البيداغوجي الرقمي</h4>
              <p className="text-slate-400 leading-relaxed">
                المذكرات، التوزيع السنوي، ودفتر النصوص — متاحة للمفتش مباشرة وبسرية تامة.
              </p>
            </div>

            <div className="bg-white/5 border border-white/8 p-4 rounded-2xl space-y-2 hover:bg-white/8 transition">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-teal-200">سبورة الدروس</h4>
              <p className="text-slate-400 leading-relaxed">
                تصوير لوحة الدرس ورفعها بضغط ذكي ليطلع عليها الأولياء والتلاميذ من المنزل فوراً.
              </p>
            </div>

            <div className="bg-white/5 border border-white/8 p-4 rounded-2xl space-y-2 hover:bg-white/8 transition">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-amber-200">ملتقى الأساتذة</h4>
              <p className="text-slate-400 leading-relaxed">
                طرح الإشكاليات البيداغوجية، تبادل الوضعيات الانطلاقية، وتثبيت توجيهات المفتش رسمياً.
              </p>
            </div>

            <div className="bg-white/5 border border-white/8 p-4 rounded-2xl space-y-2 hover:bg-white/8 transition">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-sm text-sky-200">حماية وخصوصية تامة</h4>
              <p className="text-slate-400 leading-relaxed">
                عزل تقني بقواعد أمان RLS: بيانات الأستاذ لا تُرى إلا للمفتش والمشرف العام.
              </p>
            </div>
          </div>
        </div>

        {/* ─── تذييل ─── */}
        <footer className="pt-6 border-t border-slate-200 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>المنصة الرقمية الموحدة لمادة الرياضيات — مديرية التربية لولاية الوادي</span>
          </div>
          <p className="text-[11px] text-slate-400">
            مشروع تربوي بيداغوجي — مرحلة التعليم المتوسط — ولاية الوادي (39) • {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
}
