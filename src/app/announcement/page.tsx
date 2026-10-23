"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { PUBLIC_TEACHER_COLUMNS } from "@/lib/teachers";
import { useTeacherId, teacherHomeHref } from "@/lib/teacherParam";
import type { UserProfile } from "@/lib/types";
import {
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  Scale,
  Users,
  GraduationCap,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export default function AnnouncementPage() {
  const [activeTab, setActiveTab] = useState<"all" | "supplies" | "reception">("all");
  const teacherId = useTeacherId();
  const [teacher, setTeacher] = useState<UserProfile | null>(null);

  // بطاقة استقبال الأستاذ ونبذته من ملفه العام
  useEffect(() => {
    if (!teacherId) return;
    supabase
      .from("profiles")
      .select(PUBLIC_TEACHER_COLUMNS)
      .eq("id", teacherId)
      .maybeSingle()
      .then(({ data }) => setTeacher((data as UserProfile) ?? null));
  }, [teacherId]);

  const reception = teacher?.reception;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans py-6 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto pb-16 space-y-5">
        {/* رأس الصفحة وزر الرجوع */}
        <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
          <Link
            href={teacherHomeHref(teacherId)}
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition shrink-0"
            aria-label="الرجوع للرئيسية"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 mb-0.5">
              <Sparkles className="w-3 h-3 text-emerald-600" /> دليل وتوجيهات الأستاذ
            </span>
            <h1 className="text-base font-extrabold text-slate-900 truncate">
              ساعة الاستقبال والتوجيهات البيداغوجية
            </h1>
            <p className="text-[11px] text-slate-500 font-bold truncate">
              {teacher ? `${teacher.full_name}${teacher.school_custom_name ? ` — ${teacher.school_custom_name}` : ""}` : "التعليم المتوسط"}
            </p>
          </div>
        </div>

        {/* شريط التبويبات السريعة للتنقل */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold items-center">
          {[
            { id: "all", label: "📋 الدليل كاملاً" },
            { id: "reception", label: "🤝 ساعة الاستقبال" },
            { id: "supplies", label: "📚 الكراريس والتوجيهات" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-100 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <Link
            href="/assessment"
            className="px-3.5 py-2 rounded-xl whitespace-nowrap bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition shrink-0 flex items-center gap-1.5 font-bold"
          >
            <span>⚖️ ميثاق التقويم</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>

        {/* ==================== 1. قسم استقبال الأولياء ==================== */}
        {(activeTab === "all" || activeTab === "reception") && (
          <section className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800">ساعة استقبال أولياء الأمور</h2>
                <p className="text-[11px] text-slate-400">التواصل البنّاء والمستمر لصالح التلميذ</p>
              </div>
            </div>

            {reception?.officialDay ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 font-extrabold">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>
                    الموعد الأسبوعي الرسمي: كل {reception.officialDay}
                    {reception.officialTime ? ` (${reception.officialTime})` : ""}
                  </span>
                </div>
                {reception.extraDay && (
                  <div className="flex items-center gap-2 text-teal-800 font-bold">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span>
                      موعد إضافي: {reception.extraDay}
                      {reception.extraTime ? ` (${reception.extraTime})` : ""}
                    </span>
                  </div>
                )}
                {(reception.location || teacher?.school_custom_name) && (
                  <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{[reception.location, teacher?.school_custom_name].filter(Boolean).join(" — ")}</span>
                  </div>
                )}
                {reception.guidance && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-slate-700 text-xs leading-relaxed space-y-1 mt-2">
                    <p className="font-bold text-slate-900">توجيهات الأستاذ للأولياء الكرام:</p>
                    <p className="whitespace-pre-wrap">{reception.guidance}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto text-base">
                  🤝
                </div>
                <p className="text-xs font-bold text-slate-700">
                  لم يقم الأستاذ بتحديد موعد الاستقبال الأسبوعي بعد
                </p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  يرجى المتابعة لاحقاً، أو إرسال استفسار عبر صندوق الرسائل السرية، أو التواصل عبر إدارة المؤسسة.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ==================== 2. قسم الأدوات وتنظيم الكراريس ==================== */}
        {(activeTab === "all" || activeTab === "supplies") && (
          <section className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800">توجيهات مسك الكراريس والأدوات</h2>
                <p className="text-[11px] text-slate-400">إرشادات عامة تضمن للتلميذ المتابعة الجيدة والتفوق</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  كراس الدروس
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  يجب العناية بنظافة وتنظيم كراس الدروس وكتابة كافة عناصر الدرس والأنشطة والقواعد، مع تصحيح التمارين والفروض السابقة في نهايته ليكون مرجعاً معتمداً للتلميذ أثناء المراجعة.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  كراس المحاولات والواجبات
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  مخصص للمحاولات الفردية داخل القسم، وحل الواجبات المنزلية المقررة. الأهم هو بذل الجهد والمحاولة المستمرة في كل تمرين لترسيخ الفهم واكتشاف الأخطاء ومعالجتها.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                <div className="font-extrabold text-amber-900 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  الأدوات الهندسية والكتاب المدرسي
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  الحرص الدائم على إحضار الكتاب المدرسي والأدوات الهندسية الأساسية (المسطرة، الكوس، نصف الدائرة، المدور) في جميع الحصص لإنجاز الأنشطة التطبيقية بدقة.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== 3. بطاقة ميثاق التقويم ==================== */}
        <section className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50/50 rounded-3xl p-5 border border-teal-200/80 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">ميثاق ومعايير التقويم المستمر (20 / 20)</h2>
                <p className="text-[11px] text-teal-800 font-bold">العدل والشفافية التامة — لكل مجتهد نصيب</p>
              </div>
            </div>
            <Link
              href="/assessment"
              className="shrink-0 px-3.5 py-2 rounded-xl bg-teal-600 text-white text-xs font-black hover:bg-teal-700 active:scale-95 transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>عرض ميثاق التقويم وحاسبة النقطة</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </Link>
          </div>
        </section>

        {/* نبذة عن الأستاذ إن وجدت */}
        {teacher?.bio && (
          <section className="bg-slate-900 text-white rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-black">نبذة عن الأستاذ</h3>
                <p className="text-[10px] text-slate-400">{teacher.full_name}</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">{teacher.bio}</p>
          </section>
        )}

        {/* زر العودة لفضاء الأستاذ */}
        <div className="text-center pt-2">
          <Link
            href={teacherHomeHref(teacherId)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition shadow-sm"
          >
            <span>العودة لفضاء الأستاذ والدروس</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}