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
  Scale,
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
    <div className="space-y-6 pb-16" dir="rtl">

      {/* ─── Hero Section الموحد والأنيق ─── */}
      <section className="relative overflow-hidden bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xs text-center space-y-6">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-teal-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-3xl mx-auto space-y-5 relative z-10">
          {/* شارة رسمية موحدة */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/90 px-4 py-1.5 rounded-full text-emerald-800 text-xs font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>مديرية التربية لولاية الوادي — المنصة الرقمية الموحدة للتعليم المتوسط</span>
          </div>

          {/* العنوان الرئيسي للمنصة */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-slate-900">
              المنصة الرقمية الموحدة للتعليم المتوسط
              <span className="text-emerald-700 block mt-1.5">«منصة جسور التعليمية»</span>
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed font-medium">
              فضاء بيداغوجي مستقل يجمع الأستاذ، الولي، والتلميذ في كافة المواد؛ لمتابعة كراس القسم، السبورات اليومية، وميثاق التقويم المستمر بشفافية تامة.
            </p>
          </div>

          {/* أزرار الإجراءات السريعة */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <Link
              href="/assessment"
              className="py-3 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs sm:text-sm shadow-xs active:scale-98 transition-all flex items-center gap-2"
            >
              <Scale className="w-4 h-4 text-emerald-700" />
              <span>ميثاق التقويم (20/20) ⚖️</span>
            </Link>
            <Link
              href="/forum"
              className="py-3 px-5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs sm:text-sm active:scale-98 transition-all flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>الملتقى البيداغوجي</span>
            </Link>
            <Link
              href="/login"
              className="py-3 px-5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs sm:text-sm active:scale-98 transition-all flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>تسجيل دخول الأساتذة</span>
            </Link>
          </div>

          {/* بطاقات الإحصائيات المضيئة */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
            <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl text-right">
              <div className="text-2xl font-black text-slate-900">{teacherCount || "—"}+</div>
              <div className="text-[11px] text-emerald-700 font-bold mt-0.5">أستاذ مسجّل في المنصة</div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl text-right">
              <div className="text-2xl font-black text-slate-900">{topicCount || "—"}+</div>
              <div className="text-[11px] text-indigo-700 font-bold mt-0.5">موضوع وتبادل بيداغوجي</div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl text-right col-span-2 sm:col-span-1">
              <div className="text-2xl font-black text-slate-900">4 أطوار</div>
              <div className="text-[11px] text-teal-700 font-bold mt-0.5">1م • 2م • 3م • 4م (BEM)</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── قسم الولي / التلميذ: البحث بكود الأستاذ ─── */}
      <div className="space-y-6">

        {/* بطاقة البحث بكود الأستاذ */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">فضاء الولي والتلميذ</h2>
              <p className="text-xs text-slate-500 mt-0.5">أدخل الكود الذي يمنحه الأستاذ للوصول إلى دروسه، سبورته، ونقاط ابنه</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <form action="/t/search" method="GET" className="flex flex-col sm:flex-row items-stretch gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  name="q"
                  placeholder="كود الأستاذ  (مثال: MTH-101 أو PHY-102)"
                  className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition bg-slate-50/70 font-mono tracking-widest placeholder:font-sans placeholder:tracking-normal text-slate-900"
                />
                <Search className="w-4.5 h-4.5 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
              <button
                type="submit"
                className="py-3.5 px-7 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>عرض فضاء الأستاذ</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-start gap-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl px-4 py-3">
              <span className="text-emerald-700 text-lg leading-none mt-0.5">💡</span>
              <p className="text-xs text-emerald-950 leading-relaxed font-medium">
                <strong>كيف أحصل على الكود؟</strong> يمنح الأستاذ الكود لولي الأمر مباشرة (عبر الكراس المدرسي أو الرسالة). لا تظهر أسماء الأساتذة للعموم حفاظاً على استقلالية كل أستاذ وخصوصية تلاميذه.
              </p>
            </div>
          </div>
        </div>

        {/* محفظة الولي المحفوظة للوصول السريع للأبناء */}
        <TeacherWallet />

        {/* ─── مميزات وخدمات المنصة الموحدة ─── */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-700 mb-0.5">رؤية بيداغوجية حديثة</p>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                ماذا تقدم المنصة للأستاذ والأسرة التربوية؟
              </h3>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md border border-slate-200">
              لكافة المواد 📚
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2 hover:bg-slate-100/70 transition">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">الملف البيداغوجي الرقمي</h4>
              <p className="text-slate-600 leading-relaxed">
                المذكرات، التوزيع السنوي، ودفتر النصوص — تنسيق سلس مع المفتشية البيداغوجية بسرية تامة.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2 hover:bg-slate-100/70 transition">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">كراس القسم وصور السبورة</h4>
              <p className="text-slate-600 leading-relaxed">
                توثيق لوحة الدرس والكراس النموذجي ليطلع عليها الأولياء والتلاميذ من المنزل وتدارك الغيابات فوراً.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2 hover:bg-slate-100/70 transition">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">ميثاق التقويم المستمر (20 / 20)</h4>
              <p className="text-slate-600 leading-relaxed">
                معايير واضحة ومعلنة (كراس، سلوك، واجبات، استجوابات) تحقق الشفافية الكاملة مع الولي والتلميذ.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2 hover:bg-slate-100/70 transition">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">الملتقى المهني للأساتذة</h4>
              <p className="text-slate-600 leading-relaxed">
                طرح الإشكاليات البيداغوجية، تبادل الوضعيات التعليمية، وتثبيت التوجيهات الرسمية للمفتشية.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
