"use client";

import { useEffect, useState } from "react";
import { autoSaveTeacherToWallet, isTeacherInWallet } from "./TeacherWallet";
import { CheckCircle2, Heart, Sparkles, X } from "lucide-react";
import { MIDDLE_SCHOOL_SUBJECTS } from "@/lib/types";

interface AutoSaveProps {
  profile: {
    id: string;
    slug?: string | null;
    teacher_code?: string | null;
    full_name?: string | null;
    subject?: string | null;
    school_custom_name?: string | null;
    levels_taught?: number[] | null;
  };
}

export function AutoSaveTeacherWallet({ profile }: AutoSaveProps) {
  const [showToast, setShowToast] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!profile) return;

    const teacherCode = profile.teacher_code || "MTH";
    const slug = profile.slug || teacherCode;
    const name = profile.full_name || "الأستاذ";

    const alreadyInWallet = isTeacherInWallet(slug) || isTeacherInWallet(teacherCode);

    // الحفظ التلقائي في محفظة المتصفح
    autoSaveTeacherToWallet({
      slug,
      name,
      code: teacherCode,
      subject: profile.subject || "mathematics",
      school: profile.school_custom_name || "متوسطة ولاية الوادي",
      levels: profile.levels_taught || undefined,
    });

    // إظهار التنبيه الترحيبي عند الزيارة الأولى للأستاذ
    if (!alreadyInWallet) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4500);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  if (!mounted || !showToast) return null;

  const subjObj = MIDDLE_SCHOOL_SUBJECTS.find((s) => s.id === profile.subject);
  const subjectName = subjObj ? subjObj.name : "المادة";

  return (
    <aside
      aria-label="تنبيه الحفظ في المحفظة"
      className="fixed bottom-20 lg:bottom-5 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-[#1a1a2e] text-white p-3.5 rounded-2xl shadow-2xl border border-gray-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#107a57] text-white flex items-center justify-center shrink-0">
            <Heart className="w-4 h-4 fill-white" />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-xs font-black truncate text-emerald-300">
              تم حفظ الأستاذ في محفظتك بنجاح! ✨
            </p>
            <p className="text-[11px] text-gray-300 truncate">
              {profile.full_name} • {subjectName} (كود: {profile.teacher_code})
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowToast(false)}
          className="p-1 text-gray-400 hover:text-white rounded-lg transition shrink-0"
          aria-label="إغلاق التنبيه"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
