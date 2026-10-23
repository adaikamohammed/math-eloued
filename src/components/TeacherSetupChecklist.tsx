"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowLeft,
  Calendar,
  ClipboardList,
  BookOpen,
  Share2,
  ChevronDown,
  ChevronUp,
  X,
  Users,
} from "lucide-react";

interface Props {
  teacherId: string;
  hasLevelsAndClasses: boolean;
  hasTimetable: boolean;
  hasDiary: boolean;
  hasLessons: boolean;
  onOpenOnboarding: () => void;
  onOpenShareModal: () => void;
  onOpenAddLesson: () => void;
}

export function TeacherSetupChecklist({
  teacherId,
  hasLevelsAndClasses,
  hasTimetable,
  hasDiary,
  hasLessons,
  onOpenOnboarding,
  onOpenShareModal,
  onOpenAddLesson,
}: Props) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem(`dismissed_checklist_${teacherId}`) === "true";
      setIsDismissed(dismissed);
    }
  }, [teacherId]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(`dismissed_checklist_${teacherId}`, "true");
    }
  };

  const tasks = [
    {
      id: "levels",
      title: "تحديد المستويات والأفواج التربوية",
      desc: "لتخصيص اللوحة وحجب المستويات التي لا تدرسها هذا الموسم.",
      done: hasLevelsAndClasses,
      action: (
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="text-xs font-black text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition cursor-pointer"
        >
          {hasLevelsAndClasses ? "تعديل المستويات" : "تهيئة الآن"}
        </button>
      ),
    },
    {
      id: "timetable",
      title: "إعداد جدول التوقيت وساعة الاستقبال",
      desc: "ليتعرف الأولياء والتلاميذ على أوقات الحصص وموعد الاستقبال المعتمد.",
      done: hasTimetable,
      action: (
        <Link
          href="/admin/timetable"
          className="text-xs font-black text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1"
        >
          <span>ضبط التوقيت</span>
          <ArrowLeft className="w-3 h-3" />
        </Link>
      ),
    },
    {
      id: "diary",
      title: "الدفتر اليومي (ماذا سأدرس غداً)",
      desc: "لتوثيق المورد المعرفي ومؤشرات الكفاءة وطباعة كراس النصوص بنقرة واحدة.",
      done: hasDiary,
      action: (
        <Link
          href="/admin/diary"
          className="text-xs font-black text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition inline-flex items-center gap-1"
        >
          <span>فتح الدفتر</span>
          <ArrowLeft className="w-3 h-3" />
        </Link>
      ),
    },
    {
      id: "lesson",
      title: "نشر أول درس أو صورة سبورة للقسم",
      desc: "ليجد التلميذ المورد المعرفي وصور السبورة عند مراجعته في المنزل.",
      done: hasLessons,
      action: (
        <button
          type="button"
          onClick={onOpenAddLesson}
          className="text-xs font-black text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition cursor-pointer inline-flex items-center gap-1"
        >
          <span>إضافة درس</span>
          <ArrowLeft className="w-3 h-3" />
        </button>
      ),
    },
    {
      id: "share",
      title: "مشاركة رمز الفوج المخصص مع الأولياء",
      desc: "ليدخل كل ولي حصراً لكراس مستوى ابنه دون الاطلاع على المستويات الأخرى.",
      done: false, // مهمة مستمرة
      action: (
        <button
          type="button"
          onClick={onOpenShareModal}
          className="text-xs font-black text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition cursor-pointer inline-flex items-center gap-1"
        >
          <span>مشاركة الرموز</span>
          <Share2 className="w-3 h-3 text-emerald-600" />
        </button>
      ),
    },
  ];

  const completedCount = tasks.filter((t) => t.done).length;
  const percentage = Math.round((completedCount / tasks.length) * 100);

  if (isDismissed) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            setIsDismissed(false);
            if (typeof window !== "undefined") {
              localStorage.removeItem(`dismissed_checklist_${teacherId}`);
            }
          }}
          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 transition cursor-pointer flex items-center gap-1"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>إظهار خطة تجهيز الحساب ({completedCount}/{tasks.length})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-teal-50/70 to-emerald-50/50 rounded-2xl p-4 sm:p-5 border border-emerald-200/90 shadow-2xs space-y-3 transition-all duration-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-emerald-600 text-white shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-emerald-950 flex items-center gap-2">
              <span>خطة تجهيز واستكشاف فضائك التعليمي خطوة بخطوة</span>
              <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                {completedCount} من {tasks.length} مكتملة ({percentage}%)
              </span>
            </h3>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              تدرج في تجهيز حسابك بسهولة لتوفير تجربة بيداغوجية متكاملة لتلاميذك وأوليائهم.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
            title={isCollapsed ? "توسيع" : "طي"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="إخفاء الدليل"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* شريط التقدم */}
      <div className="w-full bg-emerald-100/80 rounded-full h-2 overflow-hidden">
        <div
          className="bg-emerald-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* قائمة المهام */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                task.done
                  ? "bg-white/90 border-emerald-300/80 shadow-2xs"
                  : "bg-white/60 border-slate-200/90 hover:bg-white"
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="shrink-0 mt-0.5">
                  {task.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400" />
                  )}
                </span>
                <div>
                  <h4
                    className={`text-xs font-black ${
                      task.done ? "text-emerald-950 line-through decoration-emerald-500/50" : "text-slate-800"
                    }`}
                  >
                    {task.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{task.desc}</p>
                </div>
              </div>
              <div className="shrink-0">{task.action}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
