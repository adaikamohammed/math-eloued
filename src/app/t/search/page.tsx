import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PUBLIC_TEACHER_COLUMNS } from "@/lib/teachers";
import { Search, Building2, User, ArrowRight, ChevronLeft, Key, AlertCircle, Sparkles } from "lucide-react";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    code?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function TeacherSearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const rawInput = (params.q || params.code || "").replace(/[,()*%\:"]/g, " ").trim().slice(0, 60);

  let baseCode = rawInput;
  let targetLevel: number | null = null;

  // فحص ما إذا كان المدخل يتضمن رقم المستوى (مثال: MTH-101-1 أو MTH-101-2M أو MTH101-3)
  const match = rawInput.match(/^([A-Za-z]{2,5}[-_]?\d{2,5})[-_/\s]?([1-4])(?:[mMم])?$/i);
  if (match) {
    baseCode = match[1];
    targetLevel = parseInt(match[2], 10);
  }

  let teachers: any[] = [];

  if (baseCode) {
    // 1. البحث المطابق أولاً
    const { data: exactMatch } = await supabase
      .from("profiles")
      .select(PUBLIC_TEACHER_COLUMNS)
      .eq("role", "teacher")
      .ilike("teacher_code", baseCode)
      .limit(5);

    if (exactMatch && exactMatch.length > 0) {
      teachers = exactMatch;
    } else {
      // 2. البحث الجزئي في حال لم يكن مطابقاً تماماً
      const { data: partialMatch } = await supabase
        .from("profiles")
        .select(PUBLIC_TEACHER_COLUMNS)
        .eq("role", "teacher")
        .ilike("teacher_code", `%${baseCode}%`)
        .limit(10);
      teachers = partialMatch || [];
    }

    // إذا كان الكود مطابقاً تماماً لأستاذ واحد، نوجه الولي لصفحته مباشرة
    if (teachers.length === 1 && baseCode.toUpperCase() === (teachers[0].teacher_code || "").toUpperCase()) {
      const targetSlug = teachers[0].slug || teachers[0].teacher_code;
      if (targetLevel) {
        redirect(`/t/${targetSlug}?lvl=${targetLevel}`);
      } else {
        redirect(`/t/${targetSlug}`);
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
          <span className="text-xs font-bold text-emerald-700">فضاء الولي والتلميذ</span>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                الوصول لفضاء الأستاذ عبر الرمز
              </h2>
              <p className="text-xs text-slate-500">
                أدخل رمز الأستاذ العام (مثال: MTH-101) أو رمز مستوى ابنك (مثال: MTH-101-1)
              </p>
            </div>
          </div>

          <form action="/t/search" method="GET" className="relative">
            <input
              type="text"
              name="q"
              defaultValue={rawInput}
              placeholder="اكتب رمز الأستاذ أو المستوى (مثال: MTH-101 أو MTH-101-1)..."
              className="w-full pl-3 pr-10 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:font-sans placeholder:tracking-normal"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          </form>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 text-xs text-emerald-900 leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              ميزة الرمز الخاص بكل مستوى:
            </p>
            <p className="text-[11px] text-emerald-700">
              إذا منحك الأستاذ رمزاً ينتهي برقم المستوى (مثل: <strong>MTH-101-1</strong> للسنة 1م، أو <strong>MTH-101-2</strong> للسنة 2م)، فستفتح لك المنصة صفحة وسبورة مستوى ابنك مباشرة، مع إخفاء المستويات الأخرى احتراماً لخصوصية وترتيب دراسته.
            </p>
          </div>
        </div>

        {/* نتائج البحث */}
        <div className="space-y-3">
          {rawInput && teachers.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-bold">
                لم يتم العثور على أستاذ يحمل الرمز &quot;{rawInput}&quot;
              </p>
              <p className="text-xs text-slate-400">
                يرجى التأكد من كتابة الرمز بشكل صحيح كما هو مدون في كراس التلميذ (مثال: MTH-101 أو MTH-101-1).
              </p>
            </div>
          ) : (
            teachers.map((teacher) => {
              const teacherSlug = teacher.slug || teacher.teacher_code;
              const linkUrl = targetLevel ? `/t/${teacherSlug}?lvl=${targetLevel}` : `/t/${teacherSlug}`;
              const levels: number[] = Array.isArray(teacher.levels_taught) ? teacher.levels_taught : [1, 2, 3, 4];

              return (
                <div
                  key={teacher.id}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">
                          {teacher.full_name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{teacher.school_custom_name || "متوسطة"}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                      {teacher.teacher_code}
                    </span>
                  </div>

                  {/* روابط المستويات المباشرة */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-bold ml-1">الدخول لمستوى:</span>
                      {levels.map((lvl) => (
                        <Link
                          key={lvl}
                          href={`/t/${teacherSlug}?lvl=${lvl}`}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition border ${
                            targetLevel === lvl
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                        >
                          السنة {lvl}م ({teacher.teacher_code}-{lvl})
                        </Link>
                      ))}
                    </div>

                    <Link
                      href={linkUrl}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 shrink-0 mr-auto"
                    >
                      <span>{targetLevel ? `فتح فضاء ${targetLevel}م` : "تصفح الفضاء العام"}</span>
                      <ChevronLeft className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}