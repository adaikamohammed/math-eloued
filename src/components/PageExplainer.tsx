"use client";

import React, { useState, useEffect } from "react";
import { HelpCircle, Eye, ShieldCheck, X, Sparkles } from "lucide-react";

interface Props {
  pageId: string; // معرف الصفحة مثل "students", "timetable", "diary", "board"
  title: string;
  teacherRoleExplanation: string; // ما يفعله الأستاذ هنا
  parentRoleExplanation?: string; // ما يراه الولي
  inspectorExplanation?: string; // ما يراه المفتش
}

export function PageExplainer({
  pageId,
  title,
  teacherRoleExplanation,
  parentRoleExplanation,
  inspectorExplanation,
}: Props) {
  const [isDismissed, setIsDismissed] = useState(true); // افتراضياً true لتجنب وميض في SSR

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`explainer_${pageId}`);
      setIsDismissed(stored === "dismissed");
    }
  }, [pageId]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(`explainer_${pageId}`, "dismissed");
    }
  };

  const handleReopen = () => {
    setIsDismissed(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(`explainer_${pageId}`);
    }
  };

  if (isDismissed) {
    return (
      <div className="flex justify-end my-1">
        <button
          type="button"
          onClick={handleReopen}
          className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-2.5 py-1 rounded-xl border border-slate-200 transition flex items-center gap-1 cursor-pointer"
          title="شرح بيداغوجي لوظيفة هذه الصفحة"
        >
          <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>دليل هذه الصفحة</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-slate-50 rounded-2xl p-3.5 sm:p-4 border border-emerald-200/80 shadow-2xs relative my-2 animate-in fade-in duration-200">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 left-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition cursor-pointer"
        title="إغلاق وتخطي الشرح"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-2.5">
        <span className="p-1.5 rounded-xl bg-emerald-600 text-white shrink-0 shadow-2xs mt-0.5">
          <Sparkles className="w-4 h-4" />
        </span>
        <div className="space-y-1.5 flex-1 pr-1">
          <h4 className="text-xs sm:text-sm font-black text-emerald-950 flex items-center gap-2">
            <span>دليل الأستاذ البيداغوجي: {title}</span>
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed">
            {teacherRoleExplanation}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {parentRoleExplanation && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 border border-slate-200/80 text-[11px] text-slate-700 font-medium">
                <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  <strong>رؤية الولي:</strong> {parentRoleExplanation}
                </span>
              </div>
            )}
            {inspectorExplanation && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 border border-slate-200/80 text-[11px] text-slate-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  <strong>المفتشية:</strong> {inspectorExplanation}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-2 pt-2 border-t border-emerald-200/50">
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs font-black text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-xl transition cursor-pointer shadow-2xs"
        >
          فهمت ذلك ✓
        </button>
      </div>
    </div>
  );
}
