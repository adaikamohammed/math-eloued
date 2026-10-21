import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PUBLIC_TEACHER_COLUMNS } from "@/lib/teachers";
import { Search, Building2, User, ArrowRight, ChevronLeft, Key, AlertCircle } from "lucide-react";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function TeacherSearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  // إزالة المحارف الخاصة بصيغة فلاتر PostgREST
  const query = (q || "").replace(/[,()*%\:"]/g, " ").trim().slice(0, 60);

  let teachers: any[] = [];

  if (query) {
    // البحث بكود الأستاذ حصراً لحماية الخصوصية
    const { data } = await supabase
      .from("profiles")
      .select(PUBLIC_TEACHER_COLUMNS)
      .eq("role", "teacher")
      .ilike("teacher_code", `%${query}%`)
      .limit(10);

    teachers = data || [];

    // إذا كان الكود مطابقاً تماماً لكود أستاذ واحد، نوجه الولي لصفحة الأستاذ مباشرة
    if (teachers.length === 1 && query.toUpperCase() === (teachers[0].teacher_code || "").toUpperCase()) {
      redirect(`/t/${teachers[0].slug || teachers[0].teacher_code}`);
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
                الوصول لفضاء الأستاذ عبر الكود
              </h2>
              <p className="text-xs text-slate-500">
                أدخل الكود المستلم من أستاذ ابنك (مثال: MTH-101)
              </p>
            </div>
          </div>

          <form action="/t/search" method="GET" className="relative">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="اكتب كود الأستاذ (مثال: MTH-101)..."
              className="w-full pl-3 pr-10 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:font-sans placeholder:tracking-normal"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
          </form>

          <div className="bg-amber-50 border border-amber-200/70 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
            💡 <strong>تنبيه للأولياء:</strong> حفاظاً على خصوصية الأساتذة، يتم الوصول فقط عبر الكود المسلم لكم من طرف الأستاذ في الكراس أو عبر الرسالة المدرسية.
          </div>
        </div>

        {/* نتائج البحث */}
        <div className="space-y-3">
          {query && teachers.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-bold">
                لم يتم العثور على أستاذ يحمل الكود &quot;{query}&quot;
              </p>
              <p className="text-xs text-slate-400">
                يرجى التأكد من كتابة الكود بشكل صحيح كما هو مدون في كراس التلميذ (مثال: MTH-101).
              </p>
            </div>
          ) : (
            teachers.map((teacher) => (
              <Link
                key={teacher.id}
                href={`/t/${teacher.slug || teacher.teacher_code}`}
                className="block bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition">
                        {teacher.full_name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{teacher.school_custom_name || "متوسطة"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                      {teacher.teacher_code}
                    </span>
                    <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
