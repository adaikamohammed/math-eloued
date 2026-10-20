import Link from "next/link";
import {
  GraduationCap,
  ShieldCheck,
  Search,
  Building2,
  Users,
  MapPin,
  Sparkles,
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  Layers,
  Award,
  MessageSquare,
  FileText,
  Clock,
  Compass,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TeacherWallet from "@/components/TeacherWallet";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DISTRICTS_DATA = [
  {
    id: 1,
    name: "المقاطعة التفتيشية الأولى",
    zone: "الوادي 1",
    desc: "متوسطات وسط مدينة الوادي والبلديات المجاورة (البياضة، حساني عبد الكريم...)",
    color: "from-emerald-600 to-teal-700",
  },
  {
    id: 2,
    name: "المقاطعة التفتيشية الثانية",
    zone: "الوادي 2",
    desc: "متوسطات جنوب وشرق الولاية (الرباح، النخلة، العقلة، وادي العلندة، أميه ونس...)",
    color: "from-teal-600 to-emerald-700",
  },
  {
    id: 3,
    name: "المقاطعة التفتيشية الثالثة",
    zone: "قمار",
    desc: "متوسطات دائرة قمار والبلديات التابعة لها (قمار، تاغزوت، وادي الترك...)",
    color: "from-emerald-700 to-slate-800",
  },
  {
    id: 4,
    name: "المقاطعة التفتيشية الرابعة",
    zone: "الرقيبة",
    desc: "متوسطات دائرة الرقيبة والبلديات المجاورة (الرقيبة، حمراية، سيدي عون...)",
    color: "from-slate-800 to-teal-800",
  },
  {
    id: 5,
    name: "المقاطعة التفتيشية الخامسة",
    zone: "الدبيلة والمقرن",
    desc: "متوسطات دوائر الدبيلة، المقرن، حاسي خليفة، وسيدي خليل، الطريفاوي",
    color: "from-teal-700 to-emerald-800",
  },
];

export default async function WilayaHomePage() {
  // جلب إحصائيات حية من قاعدة بيانات Supabase
  const [{ count: teacherCount }, { count: schoolCount }, { count: topicCount }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
    supabase.from("middle_schools").select("id", { count: "exact", head: true }),
    supabase.from("forum_topics").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20" dir="rtl">
      {/* ─── 1. ترويسة الواجهة المؤسساتية الرئاسية (Hero Section) ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 text-white pt-8 pb-20 px-4 sm:px-6 rounded-b-[2.5rem] sm:rounded-b-[3.5rem] shadow-2xl border-b border-emerald-900/50">
        {/* خلفية زخرفية رياضية وهندسية خافتة */}
        <div className="absolute inset-0 opacity-5 pointer-events-none select-none overflow-hidden font-mono text-3xl">
          <span className="absolute top-8 left-12">f(x) = ax + b</span>
          <span className="absolute top-24 right-20">π ≈ 3.14159</span>
          <span className="absolute bottom-16 left-1/4">∑(xᵢ - x̄)²</span>
          <span className="absolute bottom-10 right-16">√a² + b² = c</span>
          <span className="absolute top-1/2 left-10">cos²θ + sin²θ = 1</span>
        </div>

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          {/* الشارة الرسمية الفاخرة */}
          <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-emerald-500/15 via-teal-500/20 to-emerald-500/15 border border-emerald-400/30 px-4 py-1.5 rounded-full text-emerald-300 text-xs font-bold backdrop-blur-md shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>مديرية التربية لولاية الوادي • مفتشية مادة الرياضيات</span>
          </div>

          {/* العنوان الرئيسي */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-none text-white">
              المنصة الرقمية الموحدة لمادة الرياضيات
            </h1>
            <p className="text-emerald-400 text-lg sm:text-2xl font-bold tracking-wide">
              مرحلة التعليم المتوسط — ولاية الوادي
            </p>
          </div>

          <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            البوابة البيداغوجية المركزية المشتركة لأساتذة ومفتشي المقاطعات الخمس، والنافذة الرقمية المباشرة للأولياء والتلاميذ لمتابعة دروس وسبورة المادة، المذكرات، والتوجيهات الميدانية الرسمية.
          </p>

          {/* أزرار العمل السريع */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-700/30 hover:shadow-emerald-600/50 hover:scale-[1.02] active:scale-[0.98] transition flex items-center gap-2.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
              <span>دخول الأستاذ / المفتش</span>
            </Link>

            <Link
              href="/forum"
              className="py-3 px-6 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-extrabold text-xs sm:text-sm backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] transition flex items-center gap-2.5"
            >
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>ملتقى الأساتذة التفاعلي</span>
            </Link>

            <Link
              href="/register"
              className="py-3 px-5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 font-bold text-xs sm:text-sm hover:scale-[1.02] active:scale-[0.98] transition flex items-center gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              <span>انضمام أستاذ جديد</span>
            </Link>
          </div>

          {/* ─── بطاقات الإحصائيات الحية للمنصة ─── */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-right">
            <div className="bg-slate-900/70 border border-emerald-900/40 p-3.5 sm:p-4 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                <MapPin className="w-4 h-4" />
                <span>المقاطعات التفتيشية</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">5 مقاطعات</div>
              <p className="text-[10px] text-slate-400 mt-0.5">تغطية لكافة دوائر الولاية</p>
            </div>

            <div className="bg-slate-900/70 border border-emerald-900/40 p-3.5 sm:p-4 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-bold mb-1">
                <Building2 className="w-4 h-4" />
                <span>المتوسطات التابعة</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{schoolCount || 120}+ متوسطة</div>
              <p className="text-[10px] text-slate-400 mt-0.5">دليل مدرسي مركزي موحد</p>
            </div>

            <div className="bg-slate-900/70 border border-emerald-900/40 p-3.5 sm:p-4 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                <Users className="w-4 h-4" />
                <span>الأساتذة المسجلون</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{teacherCount || 45}+ أستاذ</div>
              <p className="text-[10px] text-slate-400 mt-0.5">مساحات عمل مستقلة ومحمية</p>
            </div>

            <div className="bg-slate-900/70 border border-emerald-900/40 p-3.5 sm:p-4 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-bold mb-1">
                <MessageSquare className="w-4 h-4" />
                <span>مواضيع الملتقى</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{topicCount || 20}+ موضوع</div>
              <p className="text-[10px] text-slate-400 mt-0.5">نقاشات وتوجيهات بيداغوجية</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. فضاء الولي والتلميذ: البحث السريع ─── */}
      <div className="max-w-5xl mx-auto px-4 -mt-10 space-y-8 relative z-20">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/60 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  فضاء الولي والتلميذ: الوصول لدروس وسبورة أستاذك
                </h2>
                <p className="text-xs text-slate-500">
                  تابع كراس القسم، السلاسل، الواجبات المنزلية، ولوحة الشرف بنقرة واحدة
                </p>
              </div>
            </div>
            <Link
              href="/my-children"
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>صفحة «أبنائي» للولي</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* نموذج البحث المباشر */}
          <form action="/t/search" method="GET" className="flex flex-col sm:flex-row items-stretch gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                name="q"
                placeholder="أدخل كود الأستاذ المكتوب في الكراس (مثال: MTH-102) أو اسمه الكامل..."
                className="w-full pl-4 pr-11 py-3.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-3 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50"
              />
              <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
            </div>
            <button
              type="submit"
              className="py-3.5 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>عرض دروس الأستاذ</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </form>

          {/* روابط مساعدة سريعة */}
          <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>لا تعرف كود الأستاذ؟</span>
              <Link href="/t/schools" className="text-emerald-700 font-bold hover:underline">
                استعرض أساتذة ولاية الوادي حسب المقاطعة والمتوسطة
              </Link>
            </div>
            <div className="text-[11px] text-slate-400">
              متاح لجميع سنوات الطور المتوسط (1م • 2م • 3م • 4م)
            </div>
          </div>
        </div>

        {/* محفظة الولي السريعة (تظهر في حال كان الولي قد حفظ معلماً من قبل في المتصفح) */}
        <TeacherWallet />

        {/* ─── 3. المقاطعات التفتيشية الخمس لولاية الوادي ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base sm:text-lg">
                  المقاطعات التفتيشية لمادة الرياضيات — ولاية الوادي
                </h3>
                <p className="text-xs text-slate-500">
                  الهيكل الإشرافي والتنظيمي المعتمد من مديرية التربية
                </p>
              </div>
            </div>
            <Link
              href="/t/schools"
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>دليل كافة المتوسطات</span>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DISTRICTS_DATA.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-xl">
                      {d.name}
                    </span>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {d.zone}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed min-h-[38px]">
                    {d.desc}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <Link
                    href={`/t/schools?district=${d.id}`}
                    className="text-slate-700 hover:text-emerald-700 font-bold flex items-center gap-1"
                  >
                    <span>متوسطات المقاطعة</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/register?district=${d.id}`}
                    className="text-emerald-600 group-hover:text-emerald-700 font-bold hover:underline"
                  >
                    انضمام أستاذ بالمقاطعة ←
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── 4. ركائز ومميزات المنصة البيداغوجية ─── */}
        <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/40 pb-4">
            <div>
              <span className="text-xs font-bold text-emerald-400">رؤية بيداغوجية حديثة</span>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                لماذا أنشئت هذه المنصة لقطاع التربية بولاية الوادي؟
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>رقمنة حقيقية تخدم الأستاذ والتلميذ والمفتش</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-emerald-200">الملف البيداغوجي الرقمي</h4>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                رفع المذكرات، التوزيع السنوي، دفتر النصوص، وجدول التوقيت ليطلع عليها مفتش المقاطعة مباشرة وبسرية تامة.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-teal-200">سبورة الدروس للأولياء</h4>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                تصوير لوحة الدرس ورفعها بتقنية ضغط ذكية تمكن الأولياء والتلاميذ من مراجعة الدرس من المنزل فوراً وبأقل استهلاك بيانات.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-amber-200">ملتقى الأساتذة التفاعلي</h4>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                طرح الإشكاليات البيداغوجية، تبادل الوضعيات الانطلاقية، وتثبيت توجيهات المفتش كـ «توجيه رسمي معتمد».
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-sky-200">حماية وخصوصية تامة</h4>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                عزل تقني كامل بقواعد أمان RLS: مذكرات وأرقام هواتف الأساتذة لا يراها إلا المفتش والمشرف، وحلول الواجبات محجوبة حتى موعدها.
              </p>
            </div>
          </div>
        </div>

        {/* ─── 5. تذييل الصفحة المؤسساتي ─── */}
        <footer className="pt-8 border-t border-slate-200 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
            <GraduationCap className="w-4 h-4 text-emerald-700" />
            <span>المنصة الرقمية الموحدة لمادة الرياضيات — مديرية التربية لولاية الوادي</span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            مشروع تربوي بيداغوجي مخصص لمرحلة التعليم المتوسط عبر المقاطعات التفتيشية الخمس بولاية الوادي (39). جميع الحقوق محفوظة {new Date().getFullYear()}.
          </p>
        </footer>
      </div>
    </div>
  );
}
