import Link from "next/link";
import {
  Search,
  ArrowLeft,
  FileText,
  Layers,
  Key,
  Scale,
  BookOpen,
  Trophy,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import TeacherWallet from "@/components/TeacherWallet";
import { LandingHeader } from "@/components/LandingHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function WilayaHomePage() {
  return (
    <div className="min-h-screen bg-[#fafaf7] text-[#1a1a2e] flex flex-col font-sans" dir="rtl">
      {/* ─── شريط الهبوط العلوي البسيط (شعار + زر دخول الأستاذ فقط) ─── */}
      <LandingHeader />

      {/* ─── المحتوى الرئيسي لصفحة الهبوط الخاصة بالولي والتلميذ ─── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 sm:py-12 space-y-8">
        {/* ── قسم الترحيب الرئيسي (Hero Section للولي والتلميذ) ── */}
        <section className="relative overflow-hidden bg-white border border-[#e8e8e0] rounded-3xl p-6 sm:p-10 shadow-xs text-center space-y-6">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#107a57] via-teal-500 to-[#107a57]" />
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-100/20 rounded-full blur-3xl pointer-events-none -z-10" />

          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            {/* الشارة الرسمية لمديرية التربية */}
            <div className="inline-flex items-center gap-2 bg-[#e6f4ee] border border-[#107a57]/20 px-3.5 py-1.5 rounded-full text-[#107a57] text-xs font-black shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#107a57] animate-pulse" />
              <span>مديرية التربية لولاية الوادي • التعليم المتوسط</span>
            </div>

            {/* العنوان الموجه لولي الأمر والتلميذ */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-gray-900">
                فضاء الأولياء والتلاميذ
                <span className="text-[#107a57] block mt-1.5 text-xl sm:text-3xl lg:text-4xl">
                  تابع كراس القسم، السبورات اليومية، ونقاط ابنك
                </span>
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed font-medium">
                المنصة الرقمية الموحدة لكافة مواد التعليم المتوسط. أدخل كود الأستاذ المسلم لابنك في الكراس للاطلاع الفوري على الدروس والواجبات ونقاط التقويم.
              </p>
            </div>

            {/* حقل البحث السريع بالرمز للدخول الفوري */}
            <div className="pt-2">
              <form action="/t/search" method="GET" className="flex flex-col sm:flex-row items-stretch gap-2.5 max-w-xl mx-auto">
                <div className="relative flex-1">
                  <input
                    type="text"
                    name="q"
                    required
                    placeholder="اكتب كود الأستاذ (مثال: MTH-101 أو ARB-205)..."
                    className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-[#e8e8e0] text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] transition bg-[#fafaf7] font-mono tracking-wider placeholder:font-sans placeholder:tracking-normal text-gray-900 shadow-2xs uppercase"
                  />
                  <Search className="w-4.5 h-4.5 text-gray-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                <button
                  type="submit"
                  className="btn-primary text-xs sm:text-sm py-3.5 px-7 justify-center font-black shadow-md cursor-pointer active:scale-98 transition-all shrink-0"
                >
                  <span>عرض فضاء الأستاذ</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </form>

              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-3 font-medium">
                <span className="text-[#107a57]">💡</span>
                <span>يمنح الأستاذ الكود لولي الأمر في الكراس المدرسي. لا يلزم أي تسجيل حساب للولي.</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── محفظة أساتذة أبنائي (تلقائية بالكامل وتدعم جميع المواد) ─── */}
        <section>
          <TeacherWallet />
        </section>

        {/* ─── مميزات المنصة للولي والتلميذ ─── */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e8e8e0] shadow-xs space-y-5">
          <div className="border-b border-[#e8e8e0] pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-[#107a57] mb-0.5">شفافية وتواصل مستمر</p>
              <h2 className="text-base sm:text-lg font-black text-gray-900">
                ماذا يقدّم فضاء الأستاذ لولي الأمر؟
              </h2>
            </div>
            <span className="text-[10px] bg-[#e6f4ee] text-[#107a57] font-black px-2.5 py-1 rounded-full border border-[#107a57]/20">
              لكافة المواد 📚
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="bg-[#fafaf7] border border-[#e8e8e0] p-4 rounded-2xl space-y-2 hover:bg-white hover:border-[#107a57]/30 transition shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-[#e6f4ee] text-[#107a57] flex items-center justify-center font-bold">
                <Layers className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-black text-sm text-gray-900">كراس القسم وصور السبورة</h3>
              <p className="text-gray-600 leading-relaxed font-medium">
                توثيق لوحة الدرس والكراس اليومي لمساعدة التلميذ على تدارك الغيابات ومراجعة ملخصات الحصة من المنزل.
              </p>
            </div>

            <div className="bg-[#fafaf7] border border-[#e8e8e0] p-4 rounded-2xl space-y-2 hover:bg-white hover:border-[#107a57]/30 transition shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <Scale className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-black text-sm text-gray-900">ميثاق التقويم المستمر (20/20)</h3>
              <p className="text-gray-600 leading-relaxed font-medium">
                معايير معلنة بشفافية تامة (الكراس، السلوك، الواجبات، الاستجوابات) ليعرف الولي تفاصيل نقاط ابنه باستمرار.
              </p>
            </div>

            <div className="bg-[#fafaf7] border border-[#e8e8e0] p-4 rounded-2xl space-y-2 hover:bg-white hover:border-[#107a57]/30 transition shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-black text-sm text-gray-900">الواجبات والحلول النموذجية</h3>
              <p className="text-gray-600 leading-relaxed font-medium">
                متابعة التمارين المنزلية ومواعيد تسليمها، مع إتاحة الحلول النموذجية للتلميذ فور انتهاء الأجل المحدد.
              </p>
            </div>

            <div className="bg-[#fafaf7] border border-[#e8e8e0] p-4 rounded-2xl space-y-2 hover:bg-white hover:border-[#107a57]/30 transition shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Trophy className="w-4.5 h-4.5" />
              </div>
              <h3 className="font-black text-sm text-gray-900">لوحة الشرف وتكريم المتفوقين</h3>
              <p className="text-gray-600 leading-relaxed font-medium">
                تحفيز التلميذ المتميز في كل فوج وتكريمه معنوياً لتعزيز روح المنافسة الشريفة والاجتهاد في القسم.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ─── التذييل الرسمي للمنصة ─── */}
      <footer className="bg-white border-t border-[#e8e8e0] py-6 text-center text-xs text-gray-500 font-medium space-y-1">
        <p className="font-bold text-gray-800">
          منصة جسور التعليمية — المنصة الرقمية الموحدة للتعليم المتوسط • ولاية الوادي
        </p>
        <p className="text-[11px] text-gray-400">
          الجمهورية الجزائرية الديمقراطية الشعبية • مديرية التربية لولاية الوادي
        </p>
      </footer>
    </div>
  );
}
