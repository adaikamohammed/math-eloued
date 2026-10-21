"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Scale,
  FileText,
  UserCheck,
  Compass,
  Calculator,
  ChevronDown,
  Info,
  Clock,
  HeartHandshake,
  Loader2,
} from "lucide-react";
import { SafeHarborDisclaimer } from "@/components/SafeHarborDisclaimer";
import { supabase } from "@/lib/supabase";

export default function AssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <AssessmentContent />
    </Suspense>
  );
}

function AssessmentContent() {
  const searchParams = useSearchParams();
  const teacherId = searchParams.get("teacher");
  const [teacherProfile, setTeacherProfile] = useState<{ fullName?: string; schoolName?: string; slug?: string } | null>(null);

  useEffect(() => {
    if (!teacherId) return;
    supabase
      .from("profiles")
      .select("full_name, school_custom_name, slug")
      .eq("id", teacherId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTeacherProfile({
            fullName: data.full_name,
            schoolName: data.school_custom_name,
            slug: data.slug,
          });
        }
      });
  }, [teacherId]);

  // حاسبة تقديرية تفاعلية
  const [calcNotebook, setCalcNotebook] = useState(5);
  const [calcHomework, setCalcHomework] = useState(5);
  const [calcBehavior, setCalcBehavior] = useState(5);
  const [calcActivity, setCalcActivity] = useState(5);

  const totalCalc = calcNotebook + calcHomework + calcBehavior + calcActivity;

  const getRatingInfo = (total: number) => {
    if (total >= 18) return { label: "ممتاز جداً 🌟", color: "bg-emerald-600 text-white", badge: "نجم متفوق" };
    if (total >= 15) return { label: "جيد جداً 👏", color: "bg-teal-600 text-white", badge: "تلميذ منضبط" };
    if (total >= 12) return { label: "جيد 👍", color: "bg-blue-600 text-white", badge: "مستوى جيد" };
    if (total >= 10) return { label: "متوسط ⚠️", color: "bg-amber-600 text-white", badge: "يحتاج لمزيد من الجهد" };
    return { label: "دون المتوسط 🛑", color: "bg-red-600 text-white", badge: "تدارك عاجل مطلوب" };
  };

  const ratingInfo = getRatingInfo(totalCalc);

  const backUrl = teacherProfile?.slug ? `/t/${teacherProfile.slug}` : teacherId ? `/t/${teacherId}` : "/";

  return (
    <div className="pb-16 pt-3 fade-up space-y-4">
      {/* رأس الصفحة مع زر الرجوع */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-2xs">
        <Link
          href={backUrl}
          className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 active:scale-95 transition shrink-0"
          aria-label="الرجوع"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-black text-slate-900 truncate">
              ميثاق التقويم المستمر (20 / 20)
            </h1>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-md border border-emerald-200">
              شفافية كاملة ⚖️
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-bold truncate">
            {teacherProfile?.fullName ? `فضاء الأستاذ(ة) ${teacherProfile.fullName} — ${teacherProfile.schoolName || ""}` : "ميثاق التقويم المستمر — مادة الرياضيات (التعليم المتوسط)"}
          </p>
        </div>
      </div>

      {/* بنر الميثاق والحديث النبوي الشريف */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-850 via-teal-800 to-emerald-950 rounded-3xl p-5 text-white shadow-md shadow-emerald-900/20 border border-emerald-700/30 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-emerald-200 shrink-0 shadow-inner">
            <Scale className="w-6 h-6" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <span className="text-[10px] font-black bg-white/20 text-emerald-100 px-2.5 py-0.5 rounded-full border border-white/20">
              مبدأ العدالة الصفية المطلقة
            </span>
            <h2 className="text-sm font-black text-white">
              «أدق من الشعرة: لا زيادة بغير حق، ولا إنقاص لذي حق»
            </h2>
            <p className="text-[11px] text-emerald-100/90 leading-relaxed font-medium">
              قال رسول الله ﷺ: <span className="font-bold text-white">«إِنَّ اللَّهَ يُحِبُّ إِذَا عَمِلَ أَحَدُكُمْ عَمَلاً أَنْ يُتْقِنَهُ»</span>.
              العلامة في مادة الرياضيات ليست منحة شخصية ولا يمكن المساومة عليها، بل هي تحصيل حاصل دقيق ومباشر لانضباط التلميذ، تنظيمه لكراسه، وحله لواجباته.
            </p>
          </div>
        </div>

        {/* خلاصة توزيع الـ 20 نقطة */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/15 text-center">
          <div className="bg-white/10 rounded-xl p-2">
            <div className="text-base font-black text-emerald-300">5 نقاط</div>
            <div className="text-[10px] text-emerald-100 font-bold">📘 الكراريس وتنظيمها</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2">
            <div className="text-base font-black text-emerald-300">5 نقاط</div>
            <div className="text-[10px] text-emerald-100 font-bold">📝 الواجبات المنزلية</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2">
            <div className="text-base font-black text-emerald-300">5 نقاط</div>
            <div className="text-[10px] text-emerald-100 font-bold">⚖️ السلوك والأدوات</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2">
            <div className="text-base font-black text-emerald-300">5 نقاط</div>
            <div className="text-[10px] text-emerald-100 font-bold">🙋‍♂️ النشاط والمشاركة</div>
          </div>
        </div>
      </div>

      {/* تفصيل المحاور الأربعة للتقويم */}
      <div className="space-y-3">
        <div className="text-xs font-black text-slate-800 px-1 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-emerald-600" />
          <span>المعايير الدقيقة لكل محور من محاور التقويم (20 نقطة):</span>
        </div>

        {/* 1. الكراريس */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black text-xs">
                1
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900">
                  كراس الدروس (192ص) والأعمال الموجهة (96ص)
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">تفتيش دوري كل أسبوعين في حصة التفويج</span>
              </div>
            </div>
            <span className="text-xs font-black bg-teal-50 text-teal-800 px-2.5 py-1 rounded-xl border border-teal-200">
              5 نقاط
            </span>
          </div>

          <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
              <span><b>اكتمال الدروس 100%:</b> إذا درسنا 20 درساً فيجب أن يحتوي كراسك 20 درساً. أي نقص يترتب عليه خصم مباشر.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
              <span><b>التنظيم وإتقان الكتابة:</b> خط مفهوم وكتابة واضحة. عند بداية كل مقطع تعليمي نطوي ورقة ونكتب اسم المقطع بدقة. آخر 10 أوراق مخصصة لحل الفروض والامتحانات.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
              <span><b>كراس الأعمال الموجهة (96ص):</b> مصدر أساسي لحل سلاسل التمارين في حصة نصف القسم ولا غنى عنه.</span>
            </div>
          </div>

          {/* تنبيه الاستدراك الجزئي */}
          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-950 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <b>💡 قاعدة الاستدراك الجزئي لتدارك الدروس:</b> التلميذ الذي كان ينقصه درس في مراقبة سابقة وتداركه وكتبه في المراقبة اللاحقة يسترجع <b>نصف النقطة المخصومة</b> (تشجيعاً له على إكمال كراسه وعدم اليأس، مع حفظ حق التلميذ المنضبط في وقته).
            </div>
          </div>
        </div>

        {/* 2. الواجبات المنزلية */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-xs">
                2
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900">
                  حل الواجبات المنزلية والمهام المستقلة
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">كراس المحاولات (96ص) والواجبات الورقية</span>
              </div>
            </div>
            <span className="text-xs font-black bg-blue-50 text-blue-800 px-2.5 py-1 rounded-xl border border-blue-200">
              5 نقاط
            </span>
          </div>

          <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span><b>المحاولة في كل حصة:</b> في كل حصة يقدم الأستاذ واجباً منزلياً؛ التلميذ الذي يحل واجباته يثبت فهمه ولا يحتاج دروس دعم إطلاقاً.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span><b>كراس المحاولات (96ص):</b> اكتب فيه كما تريد وحاول بحرية، الأهم هو إثبات المحاولة الجادة في البيت وإحضاره في كل حصة.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span><b>الواجبات على ورقة مزدوجة منفصلة:</b> تسلم في الموعد المحدد للتصحيح الفردي الدقيق.</span>
            </div>
          </div>
        </div>

        {/* 3. السلوك والأدوات والكتاب */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xs">
                3
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900">
                  السلوك والانضباط وإحضار الأدوات والكتاب
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">الانضباط الصفي والوسائل الهندسية</span>
              </div>
            </div>
            <span className="text-xs font-black bg-purple-50 text-purple-800 px-2.5 py-1 rounded-xl border border-purple-200">
              5 نقاط
            </span>
          </div>

          <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
              <span><b>كتاب الرياضيات:</b> مطلوب كتاب رياضيات واحد على كل طاولة. عدم وجود كتاب على الطاولة يعني إنقاص علامة لكلا التلميذين.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
              <span><b>الأدوات المدرسية والهندسية:</b> السيالة والمسطرة أساسيتان، مع إحضار الأدوات الهندسية (المنقلة، الكوس، المدور) في الحصص المقررة.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
              <span><b>الانضباط الصفي:</b> الهدوء، حسن الاستماع، وعدم التشويش أو الخروج دون إذن.</span>
            </div>
          </div>
        </div>

        {/* 4. حل النشاط والمشاركة */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs">
                4
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900">
                  حل النشاط والمشاركة الفعالة على السبورة
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">المحاولة الجادة في بداية كل حصة</span>
              </div>
            </div>
            <span className="text-xs font-black bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-xl border border-emerald-200">
              5 نقاط
            </span>
          </div>

          <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><b>المحاولة في النشاط:</b> الأستاذ يمر بين الصفوف لتفقد محاولات التلاميذ؛ الجلوس مكتوف الأيدي دون محاولة يخصم من علامة النشاط.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><b>المشاركة الفعالة:</b> الصعود للسبورة، طرح الأسئلة المنهجية، والمساهمة في بناء النتيجة الرياضية.</span>
            </div>
          </div>
        </div>
      </div>

      {/* حاسبة تقديرية تفاعلية لنقطة التقويم المستمر */}
      <div className="bg-white rounded-3xl p-5 border-2 border-emerald-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900">
              حاسبة نقطة التقويم المستمر التقديرية
            </h3>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
            احسب مستحقك بنفسك
          </span>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          حرّك المؤشرات التالية وفقاً لمستواك في كل محور لتعرف علامتك وتقديرك الشفاف:
        </p>

        <div className="space-y-3.5 text-xs font-bold text-slate-700">
          {/* محور 1 */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>📘 كراس الدروس والأعمال الموجهة:</span>
              <span className="text-teal-700 font-black">{calcNotebook} من 5</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={calcNotebook}
              onChange={(e) => setCalcNotebook(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
          </div>

          {/* محور 2 */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>📝 حل الواجبات المنزلية:</span>
              <span className="text-blue-700 font-black">{calcHomework} من 5</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={calcHomework}
              onChange={(e) => setCalcHomework(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          {/* محور 3 */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>⚖️ السلوك والأدوات والكتاب:</span>
              <span className="text-purple-700 font-black">{calcBehavior} من 5</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={calcBehavior}
              onChange={(e) => setCalcBehavior(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
          </div>

          {/* محور 4 */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>🙋‍♂️ حل النشاط والمشاركة الفعالة:</span>
              <span className="text-emerald-700 font-black">{calcActivity} من 5</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={calcActivity}
              onChange={(e) => setCalcActivity(Number(e.target.value))}
              className="w-full accent-emerald-600"
            />
          </div>
        </div>

        {/* نتيجة الحاسبة */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl">
          <div>
            <div className="text-[11px] text-slate-500 font-bold">العلامة التقديرية الإجمالية:</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {totalCalc} <span className="text-xs text-slate-500 font-bold">/ 20</span>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black shadow-xs ${ratingInfo.color}`}>
              {ratingInfo.label}
            </span>
            <div className="text-[10px] text-slate-400 font-bold mt-1">
              التقدير: {ratingInfo.badge}
            </div>
          </div>
        </div>
      </div>

      {/* رسالة ختامية وتذكير بمواعيد الاستقبال */}
      <div className="p-4 rounded-3xl bg-slate-900 text-white space-y-2 text-xs">
        <div className="flex items-center gap-2 text-emerald-400 font-black">
          <HeartHandshake className="w-4 h-4" />
          <span>رسالة من الأستاذ لأولياء الأمور الكرام:</span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          «حرصك كولي أمر يبدأ من اليوم بتفقد كراس ابنك وواجباته في البيت.. أهلاً وسهلاً بكم في ساعات الاستقبال الأسبوعية (الأربعاء 10:00-11:00 صباحاً أو الأحد 08:00-09:00 صباحاً كفترة إضافية)، ويسعدني دائماً التعاون معكم لصالح أبنائكم.»
        </p>
      </div>

      {/* درع الحماية القانونية وإخلاء المسؤولية */}
      <SafeHarborDisclaimer
        teacherName={teacherProfile?.fullName}
        schoolName={teacherProfile?.schoolName}
        subjectName="مادة الرياضيات"
      />
    </div>
  );
}
