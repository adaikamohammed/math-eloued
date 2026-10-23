"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useTeacherId, withTeacher, teacherHomeHref, useTeacherInfo, teacherLabel } from "@/lib/teacherParam";
import {
  ArrowRight,
  Users,
  Clock,
  Calendar,
  Search,
  CheckCircle2,
  Sparkles,
  HeartHandshake,
} from "lucide-react";
import type { ParentSummons } from "@/lib/types";
import { Loading } from "@/components/ui";

export default function ParentsPage() {
  const teacherId = useTeacherId();
  const teacherInfo = useTeacherInfo(teacherId);
  const [summons, setSummons] = useState<ParentSummons[] | null>(null);
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(withTeacher(`/api/summons?_t=${Date.now()}`), { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setSummons(data.summons || []);
      })
      .catch(() => setSummons([]))
      .finally(() => setLoading(false));
  }, []);

  const normalizeClass = (c?: string) => (c ? c.replace(/\s+/g, "").trim() : "");

  const classesList = useMemo(() => {
    if (!summons) return [];
    const set = new Set<string>();
    summons.forEach((s) => set.add(s.className));
    return Array.from(set).sort();
  }, [summons]);

  const filtered = useMemo(() => {
    if (!summons) return [];
    return summons.filter((s) => {
      const matchSearch =
        s.studentName.toLowerCase().includes(search.toLowerCase()) ||
        s.className.toLowerCase().includes(search.toLowerCase()) ||
        (s.notes && s.notes.toLowerCase().includes(search.toLowerCase()));
      const matchClass =
        selectedClass === "all" ||
        normalizeClass(s.className) === normalizeClass(selectedClass);
      return matchSearch && matchClass;
    });
  }, [summons, search, selectedClass]);

  const getClassCount = (cls: string) => {
    if (!summons) return 0;
    if (cls === "all") return summons.length;
    return summons.filter((s) => normalizeClass(s.className) === normalizeClass(cls)).length;
  };

  return (
    <div className="pb-16 pt-3 fade-up space-y-4">
      {/* رأس الصفحة وزر الرجوع */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-sky-100 shadow-2xs">
        <Link
          href={teacherHomeHref(teacherId)}
          className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 hover:bg-sky-100 active:scale-95 transition shrink-0"
          aria-label="الرجوع"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-black text-slate-900 truncate">
              أولياء أود استقبالهم
            </h1>
            <span className="text-[11px] bg-sky-100 text-sky-800 font-black px-2 py-0.5 rounded-full border border-sky-200">
              لصالح أبنائكم 🤝
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-bold truncate">
            {teacherLabel(teacherInfo)}
          </p>
        </div>
      </div>

      {/* بنر توضيحي لطيف ومطمئن للأولياء */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-blue-600 to-teal-700 rounded-3xl p-4 sm:p-5 text-white shadow-md shadow-sky-600/15 border border-sky-400/30 space-y-2.5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h2 className="text-xs sm:text-sm font-black text-white">
              أود التحدث معكم للتشاور ولمصلحة أبنائكم
            </h2>
            <p className="text-[11px] sm:text-xs text-sky-50 leading-relaxed font-medium">
              «أهلاً وسهلاً بكم.. هذه الخانة ليست استدعاءً عقابياً، بل حرصاً مني ومن بداية الفصل على لقائكم والتشاور معكم لصالح أبنائكم، للوقوف على كراس الدروس ومعالجة أي صعوبة لضمان فهمهم وتفوقهم في مادة الرياضيات.»
            </p>
          </div>
        </div>
      </div>

      {/* بطاقة مواعيد الاستقبال المختصرة */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-slate-800">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>مواعيد استقبال وتشاور الأستاذ في المؤسسة:</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          {/* الموعد الرسمي */}
          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 space-y-1">
            <div className="flex items-center justify-between text-emerald-800 font-black text-[11px]">
              <span>🗓️ ساعة الاستقبال الرسمية</span>
              <span className="bg-emerald-600 text-white px-2 py-0.2 rounded text-[10px]">أسبوعياً</span>
            </div>
            <div className="font-black text-slate-900 text-sm">كل يوم أربعاء</div>
            <div className="text-slate-600 font-bold text-xs">من 10:00 إلى 11:00 صباحاً</div>
          </div>

          {/* التوقيت الإضافي */}
          <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-100 space-y-1">
            <div className="flex items-center justify-between text-sky-800 font-black text-[11px]">
              <span>⏰ توقيت إضافي (مبادرة من الأستاذ)</span>
              <span className="bg-sky-600 text-white px-2 py-0.2 rounded text-[10px]">اختياري</span>
            </div>
            <div className="font-black text-slate-900 text-sm">يوم الأحد صباحاً</div>
            <div className="text-slate-600 font-bold text-xs">من 08:00 إلى 09:00 صباحاً</div>
            <p className="text-[10px] text-slate-500 leading-tight">
              (توقيت إضافي لعدم الانتظار لأسبوع كامل وليس ساعة استقبال رسمية)
            </p>
          </div>
        </div>

        {/* رسالة الأستاذ المختصرة */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-700 leading-relaxed font-semibold">
          💡 <span className="text-slate-900 font-bold">تنبيه حريص:</span> أود استقبالكم الآن من بداية السنة لمتابعة مستوى أبنائكم ومعالجة أي نقص، وليس بعد إعلان نتائج الفصل الأول.
        </div>
      </div>

      {/* قائمة التلاميذ المعنيين بالمقابلة */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-600" />
            <span>التلاميذ الذين أود التحدث مع أوليائهم لصالحهم:</span>
          </span>
          <span className="text-[11px] font-extrabold bg-sky-50 text-sky-700 px-2 py-0.5 rounded-md border border-sky-100">
            {filtered.length} تلميذ
          </span>
        </div>

        {/* أزرار تصفية الأقسام */}
        <div className="grid grid-cols-5 gap-1 text-center bg-white p-1 rounded-2xl border border-slate-100">
          <button
            onClick={() => setSelectedClass("all")}
            className={`py-1.5 rounded-xl text-xs font-black transition ${
              selectedClass === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            الكل ({getClassCount("all")})
          </button>
          {classesList.map((cls) => {
            const count = getClassCount(cls);
            return (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`py-1.5 rounded-xl text-xs font-black transition ${
                  normalizeClass(selectedClass) === normalizeClass(cls)
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {cls} ({count})
              </button>
            );
          })}
        </div>

        {/* حقل البحث بالاسم */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="w-full bg-white rounded-xl border border-slate-200 py-2.5 pr-10 pl-4 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 transition"
            placeholder="ابحث باسم التلميذ أو الفوج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* بطاقات التلاميذ */}
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-emerald-200 p-5 space-y-1.5">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-black text-xs text-slate-800">لا توجد مواعيد مقابلة مسجلة حالياً</h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              ساعة الاستقبال مفتوحة كل أربعاء للتشاور والاطلاع على كراس ومستوى التلميذ.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-sky-100 shadow-2xs space-y-2.5 hover:border-sky-300 transition"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-900">{item.studentName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-sky-50 text-sky-800 border border-sky-200">
                      قسم {item.className}
                    </span>
                  </div>

                  {item.isUrgent ? (
                    <span className="text-[10px] font-black bg-sky-50 text-sky-800 px-2 py-0.5 rounded border border-sky-200">
                      ⏰ توقيت إضافي: الأحد (08:00 - 09:00)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                      🗓️ الأربعاء (10:00 - 11:00)
                    </span>
                  )}
                </div>

                {item.notes && (
                  <div className="bg-sky-50/50 rounded-xl p-2.5 text-xs text-slate-700 space-y-0.5 border border-sky-100/60">
                    <span className="font-black text-[11px] text-sky-950 block">📌 ملاحظة الأستاذ لولي الأمر (لصالح ابنه):</span>
                    <p className="whitespace-pre-line leading-relaxed font-semibold text-slate-800">{item.notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 pt-1 border-t border-slate-100">
                  <span>الموعد: الأربعاء 10:00-11:00 {item.isUrgent ? "(أو الأحد 08:00-09:00)" : ""}</span>
                  <span>
                    {new Date(item.createdAt).toLocaleDateString("ar-DZ", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
