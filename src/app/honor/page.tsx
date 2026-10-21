"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTeacherId, withTeacher, teacherHomeHref, useTeacherInfo, teacherLabel } from "@/lib/teacherParam";
import {
  ArrowRight,
  Trophy,
  Star,
  Sparkles,
  Search,
  Award,
  GraduationCap,
  HeartHandshake,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { HonorStudent, HONOR_CLASSES } from "@/lib/types";

export default function HonorRollPage() {
  const teacherId = useTeacherId();
  const teacherInfo = useTeacherInfo(teacherId);
  const [honors, setHonors] = useState<HonorStudent[]>([]);
  const [classesList, setClassesList] = useState<string[]>([...HONOR_CLASSES]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHonors();
  }, []);

  const fetchHonors = async () => {
    try {
      const res = await fetch(withTeacher(`/api/honors?t=${Date.now()}`), {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data = await res.json();
      const honorsData: HonorStudent[] = Array.isArray(data.honors) ? data.honors : [];
      setHonors(honorsData);

      if (Array.isArray(data.customClasses) && data.customClasses.length > 0) {
        setClassesList(data.customClasses);
      } else {
        const unique = Array.from(new Set(honorsData.map((h) => h.className).filter(Boolean)));
        if (unique.length > 0) setClassesList(unique);
      }
    } catch (e) {
      console.error("Error fetching honors:", e);
    } finally {
      setLoading(false);
    }
  };

  const normalizeClass = (c?: string) => (c ? c.replace(/\s+/g, "").trim() : "");

  // تصفية حسب القسم والبحث
  const filteredHonors = honors.filter((item) => {
    const matchesClass =
      selectedClass === "all" ||
      normalizeClass(item.className) === normalizeClass(selectedClass);
    const matchesSearch =
      !search.trim() ||
      item.studentName.toLowerCase().includes(search.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(search.toLowerCase())) ||
      (item.badge && item.badge.toLowerCase().includes(search.toLowerCase()));
    return matchesClass && matchesSearch;
  });

  // حساب عدد المتميزين في كل قسم
  const getClassCount = (cls: string) => {
    if (cls === "all") return honors.length;
    return honors.filter((h) => normalizeClass(h.className) === normalizeClass(cls)).length;
  };

  return (
    <div className="pb-16 pt-3 fade-up space-y-4">
      {/* رأس الصفحة مع زر الرجوع */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
        <Link
          href={teacherHomeHref(teacherId)}
          className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition shrink-0"
          aria-label="الرجوع"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-black text-slate-900 truncate">لوحة الشرف وتكريم النوابغ</h1>
            <span className="text-amber-500 text-sm">✨</span>
          </div>
          <p className="text-[11px] text-slate-500 font-bold truncate">
            {teacherLabel(teacherInfo)}
          </p>
        </div>
      </div>

      {/* بنر تشجيعي جذاب وراقي متناسق مع هوية المنصة */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-5 text-white shadow-md border border-slate-800">
        <div className="absolute top-0 left-0 -translate-x-4 -translate-y-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 translate-x-4 translate-y-4 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center text-2xl shrink-0 shadow-inner">
            🏆
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2.5 py-0.5 rounded-full tracking-wide uppercase">
                لوحة التميز والإتقان
              </span>
            </div>
            <h2 className="text-sm font-black leading-snug text-white">
              نوابغ وأبطال أقسامنا المتميزة
            </h2>
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
              «هنيئاً لتلاميذنا الأفاضل الذين تميزوا بحسن الانضباط، إتقان الكراس والاجتهاد المستمر.. والفرصة مفتوحة دائماً لبقية زملائهم للانضمام!»
            </p>
          </div>
        </div>

        {/* إحصائية سريعة بدون ترتيب */}
        <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>كوكبة متميزة دون ترتيب تفضيلي</span>
          </span>
          <span className="bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg font-black text-[11px]">
            {honors.length} متميز ومتميزة
          </span>
        </div>
      </div>

      {/* أقسام الأستاذ المحددة تلقائياً */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>اختر القسم لعرض نوابغه:</span>
          </span>
          <span className="text-[11px] text-slate-400 font-bold">أقسام الأستاذ المعتمدة</span>
        </div>

        {/* أزرار الأقسام المعرفة للأستاذ */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedClass("all")}
            className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border ${
              selectedClass === "all"
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
            }`}
          >
            <span>الكل</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedClass === "all"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {getClassCount("all")}
            </span>
          </button>

          {classesList.map((cls) => {
            const count = getClassCount(cls);
            const isSelected = selectedClass === cls;
            return (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border ${
                  isSelected
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-600/20"
                    : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
                }`}
              >
                <span>{cls}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? "bg-white/25 text-white"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* حقل البحث السريع */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          className="w-full bg-white rounded-xl border border-slate-200 py-2.5 pr-10 pl-4 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition"
          placeholder="ابحث باسم التلميذ أو الملاحظة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            مسح
          </button>
        )}
      </div>

      {/* قائمة التلاميذ المتميزين */}
      <div className="space-y-3 pt-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
            <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
            <p className="text-xs font-bold text-slate-500">جاري تحميل لوحة الشرف...</p>
          </div>
        ) : filteredHonors.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center space-y-2 shadow-2xs">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
              🌟
            </div>
            <div className="text-xs font-black text-slate-800">
              {search
                ? "لا توجد نتائج مطابقة لبحثك"
                : selectedClass === "all"
                ? "سيتم إعلان أسماء المتميزين قريباً!"
                : `سيتم إضافة نوابغ قسم (${selectedClass}) قريباً!`}
            </div>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
              يتم ترشيح التلاميذ بناءً على إتقان كراس الدروس (192ص)، حل الواجبات والانضباط التام في الحصص.
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {filteredHonors.map((item) => (
              <div
                key={item.id}
                className="relative bg-white rounded-2xl p-3.5 border border-amber-200/70 shadow-2xs hover:border-amber-400 hover:shadow-xs transition group overflow-hidden"
              >
                {/* شريط جمالي علوي ذهبي خفيف */}
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-500 to-amber-500 opacity-80" />

                <div className="flex items-start gap-3 pt-1">
                  {/* أيقونة النجم / الوسام */}
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center text-lg font-black shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    ⭐
                  </div>

                  {/* معلومات التلميذ */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-slate-900 truncate">
                        {item.studentName}
                      </h3>
                      <span className="text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-md shrink-0">
                        {item.className}
                      </span>
                    </div>

                    {/* وسام / لقب تشجيعي إن وجد */}
                    {item.badge && (
                      <div className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded-md">
                        <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>{item.badge}</span>
                      </div>
                    )}

                    {/* ملاحظة الأستاذ إن وجدت (غير ضرورية واختيارية) */}
                    {item.notes && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 leading-relaxed font-semibold mt-1">
                        💬 «{item.notes}»
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* بطاقة تحفيزية لجميع التلاميذ والأولياء: كيف تدخل لوحة الشرف؟ */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 shadow-sm space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-black text-amber-400">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>كيف تكون من نوابغ لوحة الشرف؟</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
          <div className="bg-white/5 p-2 rounded-xl border border-white/10 flex items-center gap-2">
            <span className="text-emerald-400 font-bold">1.</span>
            <span>كراس دروس منظم وكامل (5/5 علامة التقويم)</span>
          </div>
          <div className="bg-white/5 p-2 rounded-xl border border-white/10 flex items-center gap-2">
            <span className="text-emerald-400 font-bold">2.</span>
            <span>حل الواجبات المنزلية والمحاولة المستمرة</span>
          </div>
          <div className="bg-white/5 p-2 rounded-xl border border-white/10 flex items-center gap-2">
            <span className="text-emerald-400 font-bold">3.</span>
            <span>الانضباط التام والمشاركة الفعالة بالقسم</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 text-center pt-1 font-semibold">
          💡 لوحة الشرف تتجدد دورياً وتتسع لكل تلميذ مخلص ومجتهد.. اجعل اسمك يزينها قريباً!
        </p>
      </div>
    </div>
  );
}
