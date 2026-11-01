"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useTeacherId, withTeacher, teacherHomeHref } from "@/lib/teacherParam";
import { ChevronLeft, Image as ImageIcon, BookOpen, Layers, StickyNote, Sparkles, FileText } from "lucide-react";
import { LEVELS, NOTEBOOKS, isPdfFile, type Lesson, type NotebookType } from "@/lib/types";
import { BackHeader, Loading, Empty } from "@/components/ui";

export function YearLessons({ level }: { level: 1 | 2 | 3 | 4 }) {
  const teacherId = useTeacherId();
  const [activeTab, setActiveTab] = useState<NotebookType>("lessons");
  const [allLessons, setAllLessons] = useState<Lesson[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(withTeacher(`/api/lessons?level=${level}&_t=${Date.now()}`), { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.lessons) {
          setAllLessons(data.lessons);
        } else {
          setError("تعذر تحميل الدروس");
        }
      })
      .catch(() => setError("تعذر الاتصال بالخادم"))
      .finally(() => setLoading(false));
  }, [level]);

  // تقسيم الدروس حسب نوع الكراس والقسم
  const lessonsItems = useMemo(() => {
    if (!allLessons) return [];
    return allLessons.filter((l) => !l.type || l.type === "lessons");
  }, [allLessons]);

  const directedWorkItems = useMemo(() => {
    if (!allLessons) return [];
    return allLessons.filter((l) => l.type === "directed_work");
  }, [allLessons]);

  const worksheetsItems = useMemo(() => {
    if (!allLessons) return [];
    return allLessons.filter((l) => l.type === "worksheets");
  }, [allLessons]);

  const summariesItems = useMemo(() => {
    if (!allLessons) return [];
    return allLessons.filter((l) => l.type === "summaries");
  }, [allLessons]);

  // تجميع كراس الدروس حسب: الميدان -> المقطع المعرفي -> الموارد المعرفية
  const groupedLessons = useMemo(() => {
    const groups: {
      field: string;
      sections: {
        section: string;
        items: Lesson[];
      }[];
    }[] = [];

    const fieldMap = new Map<string, Map<string, Lesson[]>>();

    for (const item of lessonsItems) {
      const field = (item.field || "أنشطة عددية").trim();
      const section = (item.section || "المقطع 1 : الأعداد الطبيعية والأعداد العشرية").trim();

      if (!fieldMap.has(field)) {
        fieldMap.set(field, new Map());
      }
      const sectionMap = fieldMap.get(field)!;
      if (!sectionMap.has(section)) {
        sectionMap.set(section, []);
      }
      sectionMap.get(section)!.push(item);
    }

    for (const [field, secMap] of fieldMap.entries()) {
      const sectionsList: { section: string; items: Lesson[] }[] = [];
      for (const [section, items] of secMap.entries()) {
        // ترتيب الموارد تصاعدياً حسب رقم المورد
        items.sort((a, b) => a.number - b.number);
        sectionsList.push({ section, items });
      }
      groups.push({ field, sections: sectionsList });
    }

    return groups;
  }, [lessonsItems]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 space-y-5 fade-up font-sans" dir="rtl">
      <BackHeader href={teacherHomeHref(teacherId)} title={LEVELS[level].label} subtitle="اختر القسم لمشاهدة الدروس أو السلاسل والملخصات" />

      {/* أزرار اختيار الأقسام الـ 4 (الدروس، الأعمال الموجهة، سلاسل التمارين، الملخصات) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-2xs">
        {/* 1. زر كراس الدروس */}
        <button
          onClick={() => setActiveTab("lessons")}
          className={`p-2.5 rounded-xl text-right transition flex flex-col justify-between relative overflow-hidden border ${
            activeTab === "lessons"
              ? "bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-500"
              : "border-slate-100 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-lg">📘</span>
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                activeTab === "lessons"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {lessonsItems.length} موارد
            </span>
          </div>
          <div className="font-black text-xs text-slate-800">كراس الدروس</div>
          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">192ص وحلول الواجبات</div>
        </button>

        {/* 2. زر كراس الأعمال الموجهة */}
        <button
          onClick={() => setActiveTab("directed_work")}
          className={`p-2.5 rounded-xl text-right transition flex flex-col justify-between relative overflow-hidden border ${
            activeTab === "directed_work"
              ? "bg-sky-50/70 border-sky-500 shadow-xs ring-1 ring-sky-500"
              : "border-slate-100 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-lg">📗</span>
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                activeTab === "directed_work"
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {directedWorkItems.length} حصص
            </span>
          </div>
          <div className="font-black text-xs text-slate-800">الأعمال الموجهة</div>
          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">96ص وحصص التفويج</div>
        </button>

        {/* 3. زر سلاسل التمارين */}
        <button
          onClick={() => setActiveTab("worksheets")}
          className={`p-2.5 rounded-xl text-right transition flex flex-col justify-between relative overflow-hidden border ${
            activeTab === "worksheets"
              ? "bg-indigo-50/70 border-indigo-500 shadow-xs ring-1 ring-indigo-500"
              : "border-slate-100 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-lg">📑</span>
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                activeTab === "worksheets"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {worksheetsItems.length} سلاسل
            </span>
          </div>
          <div className="font-black text-xs text-slate-800">سلاسل التمارين</div>
          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">تمارين المقاطع وتطبيقاتها</div>
        </button>

        {/* 4. زر الملخصات والمطويات */}
        <button
          onClick={() => setActiveTab("summaries")}
          className={`p-2.5 rounded-xl text-right transition flex flex-col justify-between relative overflow-hidden border ${
            activeTab === "summaries"
              ? "bg-amber-50/70 border-amber-500 shadow-xs ring-1 ring-amber-500"
              : "border-slate-100 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-lg">📌</span>
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                activeTab === "summaries"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {summariesItems.length} ملخصات
            </span>
          </div>
          <div className="font-black text-xs text-slate-800">الملخصات والمطويات</div>
          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">قواعد ومراجعة الاختبارات</div>
        </button>
      </div>

      {error && <p className="text-xs text-center text-red-600 font-bold py-2">{error}</p>}

      {loading ? (
        <Loading />
      ) : activeTab === "lessons" ? (
        /* ==================== عرض كراس الدروس ==================== */
        <div className="space-y-5">
          {/* شريط تعريفي بكراس الدروس */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <span>📘</span>
              <span>كراس الدروس — {LEVELS[level].short}</span>
            </span>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
              5 نقاط في التقويم
            </span>
          </div>

          {groupedLessons.length === 0 ? (
            <Empty text="لم تُضف موارد معرفية بعد في كراس الدروس" />
          ) : (
            groupedLessons.map((grp, gIdx) => (
              <div key={grp.field} className="space-y-3.5">
                {/* 1. عنوان الميدان */}
                <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-3 rounded-2xl shadow-sm flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-black shrink-0">
                    📐
                  </span>
                  <div>
                    <div className="text-[10px] text-emerald-200 font-bold">الميدان:</div>
                    <div className="font-black text-xs leading-none">{grp.field}</div>
                  </div>
                </div>

                {/* 2. المقاطع المعرفية داخل الميدان */}
                {grp.sections.map((sec, sIdx) => (
                  <div key={sec.section} className="space-y-2 bg-slate-50/60 p-2.5 rounded-2xl border border-slate-100">
                    {/* شريط المقطع المعرفي */}
                    <div className="flex items-center gap-2 px-1 py-1 text-slate-700">
                      <span className="text-emerald-600 font-black text-xs">📑</span>
                      <span className="font-black text-xs text-slate-800">{sec.section}</span>
                    </div>

                    {/* 3. الموارد المعرفية التابعة لهذا المقطع */}
                    <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-2">
                      {sec.items.map((l) => {
                        const count = l.images?.length || 0;
                        return (
                          <Link
                            key={l.id}
                            href={withTeacher(`/lesson/${l.id}`, teacherId)}
                            className="flex items-start gap-3 bg-white rounded-xl p-3 border border-slate-100 shadow-2xs active:scale-[0.99] transition hover:border-slate-200"
                          >
                            {/* شارة رقم المورد */}
                            <span className="w-8 h-8 shrink-0 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-xs mt-0.5">
                              {l.number}
                            </span>

                            {/* تفاصيل المورد المعرفي - العنوان كامل دون اقتطاع */}
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-emerald-600 font-bold mb-0.5">
                                المورد المعرفي {l.number}
                              </div>
                              <h3 className="font-bold text-xs text-slate-800 leading-snug break-words">
                                {l.title}
                              </h3>

                              {/* الملاحظات وعدد الصور وحالة الواجب */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {((l.images || []).some(isPdfFile) || (l.homeworkImages || []).some(isPdfFile)) && (
                                  <span className="flex items-center gap-1 text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200/70 font-bold">
                                    <FileText className="w-3 h-3 text-red-500" />
                                    <span>ملف PDF</span>
                                  </span>
                                )}

                                <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                                  <ImageIcon className="w-3 h-3 text-slate-400" />
                                  <span>{count} {count === 1 ? "صورة" : "صور"}</span>
                                </span>

                                {(l.homeworkImages?.length || 0) > 0 ? (
                                  <span className="flex items-center gap-1 text-[10px] text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80 font-black">
                                    📝 حل الواجب متوفر ✓
                                  </span>
                                ) : l.homeworkNotes ? (
                                  <span className="flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                                    📖 تمرين واجب
                                  </span>
                                ) : null}

                                {l.notes && (
                                  <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 font-bold">
                                    <StickyNote className="w-3 h-3 text-amber-600" />
                                    <span>ملاحظة الأستاذ</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0 mt-2" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      ) : activeTab === "directed_work" ? (
        /* ==================== عرض كراس الأعمال الموجهة ==================== */
        <div className="space-y-3">
          {/* شريط تعريفي بالأعمال الموجهة */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <span>📗</span>
              <span>كراس الأعمال الموجهة — {LEVELS[level].short}</span>
            </span>
            <span className="text-[11px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md">
              حصص نصف الفوج
            </span>
          </div>

          {directedWorkItems.length === 0 ? (
            <Empty text="لم تُضف حصص أعمال موجهة بعد" />
          ) : (
            <div className="space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-2.5">
              {directedWorkItems.map((l) => {
                const count = l.images?.length || 0;
                return (
                  <Link
                    key={l.id}
                    href={withTeacher(`/lesson/${l.id}`, teacherId)}
                    className="flex items-start gap-3 bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs active:scale-[0.99] transition hover:border-slate-200"
                  >
                    {/* شارة رقم الحصة */}
                    <span className="w-9 h-9 shrink-0 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-black text-xs mt-0.5">
                      {l.number}
                    </span>

                    {/* تفاصيل الحصة */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-sky-600 font-bold mb-0.5">
                        حصة الأعمال الموجهة {l.number}
                      </div>
                      <h3 className="font-bold text-xs text-slate-800 leading-snug break-words">
                        {l.title}
                      </h3>

                      {/* الملاحظات وعدد الصور */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {((l.images || []).some(isPdfFile) || (l.homeworkImages || []).some(isPdfFile)) && (
                          <span className="flex items-center gap-1 text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200/70 font-bold">
                            <FileText className="w-3 h-3 text-red-500" />
                            <span>ملف PDF</span>
                          </span>
                        )}

                        <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                          <ImageIcon className="w-3 h-3 text-slate-400" />
                          <span>{count} {count === 1 ? "صورة" : "صور"}</span>
                        </span>

                        {l.notes && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 font-bold">
                            <StickyNote className="w-3 h-3 text-amber-600" />
                            <span>ملاحظة الأستاذ</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0 mt-2" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "worksheets" ? (
        /* ==================== عرض سلاسل التمارين ==================== */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <span>📑</span>
              <span>سلاسل التمارين والواجبات الورقية — {LEVELS[level].short}</span>
            </span>
            <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
              تمارين المقاطع
            </span>
          </div>

          {worksheetsItems.length === 0 ? (
            <Empty text="لم تُضف سلاسل تمارين بعد لهذا المستوى" />
          ) : (
            <div className="space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-2.5">
              {worksheetsItems.map((l) => {
                const count = l.images?.length || 0;
                return (
                  <Link
                    key={l.id}
                    href={withTeacher(`/lesson/${l.id}`, teacherId)}
                    className="flex items-start gap-3 bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs active:scale-[0.99] transition hover:border-slate-200"
                  >
                    <span className="w-9 h-9 shrink-0 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xs mt-0.5">
                      {l.number}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-indigo-600 font-bold mb-0.5">
                        سلسلة تمارين رقم {l.number}
                      </div>
                      <h3 className="font-bold text-xs text-slate-800 leading-snug break-words">
                        {l.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {((l.images || []).some(isPdfFile) || (l.homeworkImages || []).some(isPdfFile)) && (
                          <span className="flex items-center gap-1 text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200/70 font-bold">
                            <FileText className="w-3 h-3 text-red-500" />
                            <span>مستند PDF</span>
                          </span>
                        )}

                        <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                          <ImageIcon className="w-3 h-3 text-slate-400" />
                          <span>{count} {count === 1 ? "ملف/صورة" : "ملفات وصور"}</span>
                        </span>

                        {(l.homeworkImages?.length || 0) > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md font-bold">
                            📝 الحل متوفر
                          </span>
                        )}

                        {l.notes && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 font-bold">
                            <StickyNote className="w-3 h-3 text-amber-600" />
                            <span>ملاحظة الأستاذ</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0 mt-2" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ==================== عرض الملخصات والمطويات ==================== */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <span>📌</span>
              <span>الملخصات والمطويات وقوانين المقاطع — {LEVELS[level].short}</span>
            </span>
            <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md">
              مراجعة سريعة
            </span>
          </div>

          {summariesItems.length === 0 ? (
            <Empty text="لم تُضف ملخصات أو مطويات بعد لهذا المستوى" />
          ) : (
            <div className="space-y-2.5 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-2.5">
              {summariesItems.map((l) => {
                const count = l.images?.length || 0;
                return (
                  <Link
                    key={l.id}
                    href={withTeacher(`/lesson/${l.id}`, teacherId)}
                    className="flex items-start gap-3 bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs active:scale-[0.99] transition hover:border-slate-200"
                  >
                    <span className="w-9 h-9 shrink-0 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black text-xs mt-0.5">
                      {l.number}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-amber-600 font-bold mb-0.5">
                        ملخص رقم {l.number}
                      </div>
                      <h3 className="font-bold text-xs text-slate-800 leading-snug break-words">
                        {l.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {((l.images || []).some(isPdfFile) || (l.homeworkImages || []).some(isPdfFile)) && (
                          <span className="flex items-center gap-1 text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200/70 font-bold">
                            <FileText className="w-3 h-3 text-red-500" />
                            <span>مستند PDF</span>
                          </span>
                        )}

                        <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">
                          <ImageIcon className="w-3 h-3 text-slate-400" />
                          <span>{count} {count === 1 ? "ملف/صورة" : "ملفات وصور"}</span>
                        </span>

                        {l.notes && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 font-bold">
                            <StickyNote className="w-3 h-3 text-amber-600" />
                            <span>ملاحظة الأستاذ</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0 mt-2" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
