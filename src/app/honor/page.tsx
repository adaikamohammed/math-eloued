"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTeacherId, withTeacher, teacherHomeHref, useTeacherInfo, teacherLabel } from "@/lib/teacherParam";
import {
  ArrowRight,
  Trophy,
  Sparkles,
  Search,
  Loader2,
} from "lucide-react";
import { HonorStudent } from "@/lib/types";

export default function HonorRollPage() {
  const teacherId = useTeacherId();
  const teacherInfo = useTeacherInfo(teacherId);
  const [honors, setHonors] = useState<HonorStudent[]>([]);
  const [classesList, setClassesList] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [urlLvl, setUrlLvl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const lvl = new URLSearchParams(window.location.search).get("lvl");
      if (lvl) setUrlLvl(lvl);
    }
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

      const lvlParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("lvl") : null;
      let allCls: string[] = [];
      if (Array.isArray(data.customClasses) && data.customClasses.length > 0) {
        allCls = data.customClasses;
      } else {
        allCls = Array.from(new Set(honorsData.map((h) => h.className).filter(Boolean)));
      }

      if (lvlParam) {
        const scopedCls = allCls.filter((cls) => {
          const norm = cls.replace(/\s+/g, "").trim();
          return norm.startsWith(lvlParam) || norm.includes(`${lvlParam}م`) || norm.includes(lvlParam);
        });
        setClassesList(scopedCls);
      } else {
        setClassesList(allCls);
      }
    } catch (e) {
      console.error("Error fetching honors:", e);
    } finally {
      setLoading(false);
    }
  };

  const normalizeClass = (c?: string) => (c ? c.replace(/\s+/g, "").trim() : "");

  // تصفية حسب القسم والمستوى والبحث
  const filteredHonors = honors.filter((item) => {
    if (urlLvl) {
      const clsNorm = normalizeClass(item.className);
      const matchesLevel = clsNorm.startsWith(urlLvl) || clsNorm.includes(`${urlLvl}م`) || clsNorm.includes(urlLvl);
      if (!matchesLevel) return false;
    }
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
    if (cls === "all") return filteredHonors.length;
    return filteredHonors.filter((h) => normalizeClass(h.className) === normalizeClass(cls)).length;
  };

  const backHref = teacherHomeHref(teacherId) + (urlLvl ? `?lvl=${urlLvl}` : "");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans py-6 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto pb-16 space-y-4">
        {/* رأس الصفحة مع زر الرجوع */}
        <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
          <Link
            href={backHref}
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition shrink-0"
            aria-label="الرجوع"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base font-black text-slate-900 truncate">لوحة الشرف وتكريم النوابغ</h1>
              <span className="text-amber-500 text-sm">✨</span>
              {urlLvl && (
                <span className="text-[10px] bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded-full border border-amber-300">
                  السنة {urlLvl} متوسط ⭐
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-bold truncate">
              {teacherLabel(teacherInfo)}
            </p>
          </div>
        </div>

        {/* بنر تشجيعي جذاب وراقي */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-5 text-white shadow-md border border-slate-800">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-xs font-black border border-amber-300/30">
              <Trophy className="w-3.5 h-3.5" />
              <span>فرسان التفوق والاجتهاد</span>
            </div>
            <h2 className="text-lg font-black tracking-tight text-white">
              هنا يُكرَّم المثابرون وأصحاب الهمم العالية
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl font-medium">
              لوحة شرفية تتجدد دورياً تثميناً لجهود التلاميذ المتميزين في حل الواجبات، تنظيم الكراريس، والمواظبة على المشاركة الإيجابية في القسم.
            </p>
          </div>
        </div>

        {/* فلاتر الأقسام (تظهر فقط إذا كانت هناك أقسام مسجلة) */}
        {classesList.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedClass("all")}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedClass === "all"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
              }`}
            >
              جميع الأفواج ({getClassCount("all")})
            </button>
            {classesList.map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  selectedClass === cls
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                }`}
              >
                {cls} ({getClassCount(cls)})
              </button>
            ))}
          </div>
        )}

        {/* شريط البحث السريع */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full bg-white rounded-xl border border-slate-200 py-2.5 pr-10 pl-4 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition"
            placeholder="ابحث باسم التلميذ أو الفوج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
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
                  : urlLvl
                  ? `لم تُنشر لوحة شرف السنة ${urlLvl} متوسط بعد`
                  : "لم يتم نشر لوحة الشرف لهذا الفصل بعد"}
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                {search
                  ? "تأكد من كتابة الاسم بشكل صحيح."
                  : urlLvl
                  ? `يقوم الأستاذ بتكريم التلاميذ النوابغ في السنة ${urlLvl} متوسط فور رصد التقييمات والمشاركات المتميزة.`
                  : "سيقوم الأستاذ بإضافة أسماء النوابغ والمتميزين فور الانتهاء من تقييم الحصص والفروض إن شاء الله."}
              </p>
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {filteredHonors.map((item) => (
                <div
                  key={item.id}
                  className="relative bg-white rounded-2xl p-3.5 border border-amber-200/70 shadow-2xs hover:border-amber-400 hover:shadow-xs transition group overflow-hidden"
                >
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-emerald-500 to-amber-500 opacity-80" />

                  <div className="flex items-start gap-3 pt-1">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center text-lg font-black shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      ⭐
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-black text-slate-900 truncate">
                          {item.studentName}
                        </h3>
                        <span className="text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-md shrink-0">
                          {item.className}
                        </span>
                      </div>

                      {item.badge && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded-md">
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{item.badge}</span>
                        </div>
                      )}

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
      </div>
    </div>
  );
}