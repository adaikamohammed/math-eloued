"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  OctagonAlert,
  AlertTriangle,
  Search,
  Calendar,
  StickyNote,
  GraduationCap,
  ShieldAlert,
  Loader2,
  MinusCircle,
  FileWarning,
} from "lucide-react";
import { Penalty } from "@/lib/types";

export default function PenaltiesPage() {
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth")
      .then((res) => res.json())
      .then((authData) => {
        if (!authData.authenticated) {
          window.location.href = "/login?next=/penalties";
        } else {
          fetchPenalties();
        }
      })
      .catch(() => {
        window.location.href = "/login?next=/penalties";
      });
  }, []);

  const fetchPenalties = async () => {
    try {
      const res = await fetch(`/api/penalties?t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data = await res.json();
      setPenalties(Array.isArray(data.penalties) ? data.penalties : []);
    } catch (e) {
      console.error("Error fetching penalties:", e);
    } finally {
      setLoading(false);
    }
  };

  const classesList = useMemo(() => {
    const set = new Set<string>();
    penalties.forEach((p) => {
      if (p.className) set.add(p.className);
    });
    return Array.from(set).sort();
  }, [penalties]);

  const normalizeClass = (c?: string) => (c ? c.replace(/\s+/g, "").trim() : "");

  // تصفية حسب القسم والبحث
  const filteredPenalties = penalties.filter((item) => {
    const matchesClass =
      selectedClass === "all" ||
      normalizeClass(item.className) === normalizeClass(selectedClass);
    const matchesSearch =
      !search.trim() ||
      item.studentName.toLowerCase().includes(search.toLowerCase()) ||
      item.reason.toLowerCase().includes(search.toLowerCase()) ||
      item.deduction.toLowerCase().includes(search.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));
    return matchesClass && matchesSearch;
  });

  // حساب عدد الخصومات في كل قسم
  const getClassCount = (cls: string) => {
    if (cls === "all") return penalties.length;
    return penalties.filter((p) => normalizeClass(p.className) === normalizeClass(cls)).length;
  };

  return (
    <div className="pb-16 pt-3 fade-up space-y-4">
      {/* رأس الصفحة مع زر الرجوع */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-red-100 shadow-2xs">
        <Link
          href="/"
          className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700 hover:bg-red-100 active:scale-95 transition shrink-0"
          aria-label="الرجوع"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-black text-red-950 truncate">سجل الخصومات والعقوبات</h1>
            <span className="text-red-600 text-sm font-black">⚠️</span>
          </div>
          <p className="text-[11px] text-red-700 font-bold truncate">
            سجل خاص بالأستاذ — لا يظهر للأولياء ولا للتلاميذ
          </p>
        </div>
      </div>

      {/* إشعار خاص بالأستاذ */}
      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-3 text-xs font-bold flex items-center gap-2">
        <span className="text-base shrink-0">🔒</span>
        <span>
          <b>تنبيه خاص:</b> هذا السجل يظهر لك أنت فقط بصفتك الأستاذ (تم إخفاؤه تماماً عن الطلاب وأولياء الأمور في الموقع العام حتى لا يزعجهم).
        </span>
      </div>

      {/* بنر تحذيري وتوضيحي باللون الأحمر */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-700 via-rose-800 to-red-900 rounded-3xl p-5 text-white shadow-lg shadow-red-700/20 border border-red-500/30">
        <div className="absolute top-0 left-0 -translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 translate-x-4 translate-y-4 w-32 h-32 bg-black/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-2xl shrink-0 shadow-inner border border-white/20">
            🛑
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black bg-white/20 px-2.5 py-0.5 rounded-full text-red-50 tracking-wide uppercase border border-white/20">
                ميثاق الانضباط والتقويم المستمر
              </span>
            </div>
            <h2 className="text-sm font-black leading-snug">
              سجل متابعة الخصومات والعقوبات المدرسية
            </h2>
            <p className="text-[11px] text-red-100 leading-relaxed font-medium">
              «التنقيط وفق نظام دقيق لا نظلم فيه أحداً.. الانضباط وإحضار الأدوات وإكمال الدروس وحل الواجبات أساسيات لا تهاون فيها. أي إخلال يترتب عليه خصم مباشر من علامة التقويم المستمر.»
            </p>
          </div>
        </div>

        {/* إحصائية الخصومات الإجمالية */}
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs font-bold text-red-100">
          <span className="flex items-center gap-1.5">
            <FileWarning className="w-3.5 h-3.5 text-red-200" />
            <span>الخصومات المسجلة حسب الأقسام</span>
          </span>
          <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-white font-black text-[11px] border border-white/20">
            {penalties.length} خصم مسجل
          </span>
        </div>
      </div>

      {/* شريط اختيار القسم (أقسام الأستاذ: 1م1، 1م2، 1م3، 2م3) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-red-600" />
            <span>اختر القسم لعرض خصوماته:</span>
          </span>
          <span className="text-[11px] text-slate-400 font-bold">أقسام الأستاذ</span>
        </div>

        {/* أزرار الأقسام مع تعداد الخصومات */}
        <div className="grid grid-cols-5 gap-1.5">
          <button
            onClick={() => setSelectedClass("all")}
            className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border ${
              selectedClass === "all"
                ? "bg-red-700 text-white border-red-700 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:border-red-200"
            }`}
          >
            <span>الكل</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
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
                className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border ${
                  isSelected
                    ? "bg-red-600 text-white border-red-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-red-200"
                }`}
              >
                <span>{cls}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? "bg-white/25 text-white"
                      : count > 0
                      ? "bg-red-50 text-red-700 font-black border border-red-200"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* حقل البحث السريع بالاسم أو السبب */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن اسم تلميذ أو سبب العقوبة..."
          className="w-full bg-white text-xs font-bold rounded-2xl py-3 pr-10 pl-4 border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-hidden transition shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 px-1"
          >
            مسح
          </button>
        )}
      </div>

      {/* قائمة الخصومات والعقوبات باللون الأحمر */}
      {loading ? (
        <div className="text-center py-16 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto" />
          <p className="text-xs font-bold text-slate-500">جاري تحميل سجل الخصومات...</p>
        </div>
      ) : filteredPenalties.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-3xl border border-dashed border-emerald-200 shadow-2xs space-y-2.5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl">
            👏
          </div>
          <h3 className="text-sm font-black text-slate-800">
            {search
              ? "لم يتم العثور على نتائج مطابقة للبحث"
              : selectedClass === "all"
              ? "لا توجد أي عقوبات أو خصومات مسجلة حالياً"
              : `لا توجد خصومات مسجلة لقسم ${selectedClass}`}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            {search
              ? "تأكد من كتابة الاسم أو سبب العقوبة بشكل صحيح"
              : "قسم منضبط ومثالي! نأمل استمرار جميع التلاميذ في الجدية والمواظبة."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPenalties.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl p-4 border-2 border-red-100 hover:border-red-300 shadow-xs transition-all space-y-3 relative overflow-hidden group"
            >
              {/* شريط جانبي أحمر لتمييز العقوبة */}
              <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-gradient-to-b from-red-500 via-rose-600 to-red-700" />

              {/* صف الرأس: اسم التلميذ والقسم والخصم */}
              <div className="flex items-start justify-between gap-2.5 pr-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm text-slate-900 group-hover:text-red-950 transition">
                      {item.studentName}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-red-50 text-red-800 border border-red-200">
                      قسم {item.className}
                    </span>
                  </div>

                  {item.date && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{item.date}</span>
                    </div>
                  )}
                </div>

                {/* شارة العقوبة / الخصم باللون الأحمر البارز */}
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 text-white font-black text-xs shadow-xs border border-red-700">
                    <MinusCircle className="w-3.5 h-3.5 text-red-100" />
                    <span>{item.deduction}</span>
                  </span>
                </div>
              </div>

              {/* صندوق سبب العقوبة */}
              <div className="bg-red-50/70 rounded-2xl p-3 border border-red-100/90 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-red-800">
                  <OctagonAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>السبب:</span>
                </div>
                <p className="text-xs text-red-950 leading-relaxed font-bold pr-5 whitespace-pre-line">
                  {item.reason}
                </p>
              </div>

              {/* ملاحظات وتوجيه الأستاذ الإضافي */}
              {item.notes && (
                <div className="bg-amber-50/60 rounded-2xl p-2.5 border border-amber-200/70 space-y-0.5 text-amber-900">
                  <div className="flex items-center gap-1 text-[11px] font-black text-amber-800">
                    <StickyNote className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>توجيه الأستاذ لولي الأمر:</span>
                  </div>
                  <p className="text-[11px] text-amber-950 pr-4 leading-relaxed font-medium">
                    {item.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
