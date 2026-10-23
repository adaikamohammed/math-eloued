"use client";

import { useState, useMemo } from "react";
import {
  Camera,
  Calendar,
  Layers,
  Search,
  Maximize2,
  X,
  BookOpen,
  FileText,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Lesson, isPdfFile } from "@/lib/types";

interface Props {
  lessons: Lesson[];
  teacherName: string;
  subjectName: string;
  initialLevel?: number | "all";
  lockedLevel?: boolean;
}

export function ParentBoardViewer({
  lessons,
  teacherName,
  subjectName,
  initialLevel = "all",
  lockedLevel = false,
}: Props) {
  const [selectedLevel, setSelectedLevel] = useState<number | "all">(initialLevel);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return lessons
      .filter((l) => {
        if (selectedLevel !== "all" && l.level !== selectedLevel) return false;
        if (selectedType !== "all") {
          const t = l.type || "lessons";
          if (t !== selectedType) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (l.title || "").toLowerCase().includes(q);
          const matchField = (l.field || "").toLowerCase().includes(q);
          const matchSection = (l.section || "").toLowerCase().includes(q);
          const matchNotes = (l.notes || "").toLowerCase().includes(q);
          if (!matchTitle && !matchField && !matchSection && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => b.number - a.number || (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [lessons, selectedLevel, selectedType, searchQuery]);

  return (
    <div className="space-y-6">
      {/* بطاقة التنبيه للولي والتلميذ الغائب */}
      <div className="bg-[#e6f4ee] border border-[#107a57]/20 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
        <div className="w-9 h-9 rounded-xl bg-[#107a57] text-white flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs">
          <p className="font-black text-[#107a57]">
            هل تغيب ابنك عن حصة {subjectName}؟ 📋
          </p>
          <p className="text-gray-700 leading-relaxed">
            يمكن لابنك تصفح صور السبورة المنشورة أدناه ونقل عناصر الدرس والأنشطة والواجبات في كراسه مباشرة بدقة ووضوح عاليين دون الحاجة لاستعارة كراس من زملائه.
          </p>
        </div>
      </div>

      {/* شريط الفلاتر */}
      <div className="bg-white rounded-2xl border border-[#e8e8e0] p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {lockedLevel ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">المستوى:</span>
              <span className="bg-[#107a57] text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-2xs">
                السنة {selectedLevel} متوسط
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-gray-500 ml-1 shrink-0">المستوى:</span>
              <button
                type="button"
                onClick={() => setSelectedLevel("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  selectedLevel === "all"
                    ? "bg-[#107a57] text-white shadow-2xs"
                    : "bg-[#fafaf7] hover:bg-gray-100 text-gray-700 border border-[#e8e8e0]"
                }`}
              >
                الكل ({lessons.length})
              </button>
              {[1, 2, 3, 4].map((lvl) => {
                const count = lessons.filter((l) => l.level === lvl).length;
                if (count === 0 && selectedLevel !== lvl) return null;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedLevel(lvl)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                      selectedLevel === lvl
                        ? "bg-[#107a57] text-white shadow-2xs"
                        : "bg-[#fafaf7] hover:bg-gray-100 text-gray-700 border border-[#e8e8e0]"
                    }`}
                  >
                    {lvl} متوسط ({count})
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="ابحث بعنوان الدرس أو المقطع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-[#e8e8e0] focus:outline-none focus:border-[#107a57] bg-[#fafaf7]"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2 pointer-events-none" />
          </div>
        </div>

        {/* تصنيف الكراس */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 overflow-x-auto text-xs">
          <span className="text-gray-500 font-bold shrink-0">نوع المحتوى:</span>
          {[
            { id: "all", label: "الكل" },
            { id: "lessons", label: "صور السبورة (كراس الدروس)" },
            { id: "directed_work", label: "أعمال موجهة" },
            { id: "worksheets", label: "أوراق عمل وفروض" },
            { id: "summaries", label: "ملخصات ومطويات" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedType(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition shrink-0 cursor-pointer ${
                selectedType === cat.id
                  ? "bg-[#e6f4ee] text-[#107a57] font-black border border-[#107a57]/30"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* قائمة الدروس */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-[#e8e8e0] p-12 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto text-xl">
            📷
          </div>
          <h3 className="text-sm font-black text-gray-800">لا توجد دروس أو سبورات منشورة تطابق بحثك</h3>
          <p className="text-xs text-gray-500">يرجى تغيير خيارات الفلترة أو مراجعة الأستاذ لاحقاً.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((lesson) => {
            const typeLabel =
              lesson.type === "directed_work"
                ? "أعمال موجهة"
                : lesson.type === "worksheets"
                ? "ورقة عمل"
                : lesson.type === "summaries"
                ? "ملخص"
                : "كراس الدروس";

            return (
              <div
                key={lesson.id}
                className="bg-white rounded-3xl border border-[#e8e8e0] shadow-xs overflow-hidden transition-all hover:border-[#107a57]/30"
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* رأس الكارت */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 flex items-center justify-center text-xs font-black">
                        {lesson.level}م
                      </span>
                      <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-md">
                        {typeLabel}
                      </span>
                      <span className="text-xs font-mono text-gray-400 font-bold">
                        الدرس #{lesson.number}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {lesson.createdAt
                          ? new Date(lesson.createdAt).toLocaleDateString("ar-DZ")
                          : "مؤخراً"}
                      </span>
                    </div>
                  </div>

                  {/* عنوان الدرس والميدان */}
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-black text-gray-900 leading-snug">
                      {lesson.title}
                    </h3>
                    {(lesson.field || lesson.section) && (
                      <p className="text-xs text-gray-500 font-medium">
                        {lesson.field} {lesson.section && `• ${lesson.section}`}
                      </p>
                    )}
                  </div>

                  {/* صور السبورة */}
                  {lesson.images && lesson.images.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                        <span className="flex items-center gap-1.5 text-[#107a57]">
                          <Camera className="w-4 h-4" />
                          صور السبورة المكتوبة في القسم ({lesson.images.length}):
                        </span>
                        <span className="text-[11px] text-gray-400 font-normal">
                          انقر على أي صورة للتكبير بحجم الشاشة
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {lesson.images.map((img, i) => (
                          <div
                            key={img.id || i}
                            onClick={() => setLightboxImg(img.url)}
                            className="relative group aspect-4/3 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 cursor-pointer shadow-2xs hover:shadow-md transition-all"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={`صورة السبورة ${i + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-bold">
                              <Maximize2 className="w-4 h-4" />
                              <span>تكبير</span>
                            </div>
                            <span className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">
                              {i + 1} / {lesson.images.length}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* ملخص عناصر الدرس من السبورة */}
                  {lesson.notes && (
                    <div className="p-4 bg-[#fafaf7] rounded-2xl border border-[#e8e8e0] text-xs text-gray-700 space-y-1.5">
                      <span className="font-black text-gray-900 block text-xs flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-[#107a57]" />
                        عناصر وملخص ما كُتب على السبورة:
                      </span>
                      <p className="whitespace-pre-wrap leading-relaxed text-gray-600 font-medium">
                        {lesson.notes}
                      </p>
                    </div>
                  )}

                  {/* الواجب المنزلي المطلوب */}
                  {lesson.homeworkNotes && (
                    <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/70 text-xs text-amber-950 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black block text-xs flex items-center gap-1.5 text-amber-900">
                          <span>📝</span>
                          الواجب المنزلي المطلوب حله في كراس المحاولات:
                        </span>
                        {lesson.homeworkDueAt && (
                          <span className="text-[10px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-md font-bold">
                            آخر أجل: {new Date(lesson.homeworkDueAt).toLocaleDateString("ar-DZ")}
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {lesson.homeworkNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* عارض الصور المكبّرة (Lightbox) */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              className="absolute top-2 left-2 z-10 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center text-sm font-black transition cursor-pointer"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImg}
              alt="صورة السبورة مكبرة"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
