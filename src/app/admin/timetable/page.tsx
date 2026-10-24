"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Building2,
  Users,
  Plus,
  Pencil,
  Trash2,
  Printer,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  School,
  X,
  RotateCcw,
  Sliders,
  Sparkles,
  Coffee,
  Check,
  Save,
  HelpCircle,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { PageExplainer } from "@/components/PageExplainer";
import {
  SCHOOL_DAYS,
  TimetableSlot,
  TimetableSettings,
  TeacherTimetable,
  LessonsData,
} from "@/lib/types";

const LOCAL_STORAGE_CLASSES_KEY = "last_active_classes";
const LOCAL_STORAGE_TIMETABLE_KEY = "math_teacher_timetable_cache";

// الإعدادات الافتراضية للتوقيت الجزائري
const DEFAULT_SETTINGS: TimetableSettings = {
  orientation: "days-as-rows",
  morningStart: "08:00",
  morningSlotsCount: 4, // 08-09, 09-10, 10-11, 11-12
  breakStart: "12:00",
  breakEnd: "13:30",
  afternoonStart: "13:30",
  afternoonSlotsCount: 3, // 13:30-14:30, 14:30-15:30, 15:30-16:30
  tuesdayAfternoonOff: true,
};

interface TimeSlotItem {
  start: string;
  end: string;
  label: string;
  period: "morning" | "afternoon";
}

// دالة مساعدة لتوليد فترات الساعات بحسب إعدادات المؤسسة
function generateTimeSlots(settings: TimetableSettings): {
  morningSlots: TimeSlotItem[];
  afternoonSlots: TimeSlotItem[];
  allSlots: TimeSlotItem[];
} {
  const morningSlots: TimeSlotItem[] = [];
  const afternoonSlots: TimeSlotItem[] = [];

  // 1. فترات الصباح
  const mStartHour = parseInt(settings.morningStart?.split(":")[0] || "8", 10);
  const mCount = settings.morningSlotsCount || 4;
  for (let i = 0; i < mCount; i++) {
    const sH = mStartHour + i;
    const eH = sH + 1;
    const startStr = `${sH < 10 ? "0" : ""}${sH}:00`;
    const endStr = `${eH < 10 ? "0" : ""}${eH}:00`;
    morningSlots.push({
      start: startStr,
      end: endStr,
      label: `${startStr} - ${endStr}`,
      period: "morning",
    });
  }

  // 2. فترات المساء
  const aStartParts = (settings.afternoonStart || "13:30").split(":");
  const aStartHour = parseInt(aStartParts[0] || "13", 10);
  const aStartMin = parseInt(aStartParts[1] || "30", 10);
  const aCount = settings.afternoonSlotsCount || 3;

  for (let i = 0; i < aCount; i++) {
    const sH = aStartHour + i;
    const eH = sH + 1;
    const minStr = aStartMin === 0 ? "00" : `${aStartMin}`;
    const startStr = `${sH < 10 ? "0" : ""}${sH}:${minStr}`;
    const endStr = `${eH < 10 ? "0" : ""}${eH}:${minStr}`;
    afternoonSlots.push({
      start: startStr,
      end: endStr,
      label: `${startStr} - ${endStr}`,
      period: "afternoon",
    });
  }

  return {
    morningSlots,
    afternoonSlots,
    allSlots: [...morningSlots, ...afternoonSlots],
  };
}

export default function TeacherTimetablePage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [settings, setSettings] = useState<TimetableSettings>(DEFAULT_SETTINGS);
  const [officialImagePath, setOfficialImagePath] = useState<string | null>(null);

  // نافذة تعديل أو إضافة حصة
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<(typeof SCHOOL_DAYS)[number]>("الأحد");
  const [selectedStart, setSelectedStart] = useState("08:00");
  const [selectedEnd, setSelectedEnd] = useState("09:00");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSessionType, setSelectedSessionType] = useState<"lesson" | "td" | "remedial" | "reception">("lesson");
  const [selectedSubgroup, setSelectedSubgroup] = useState<"فوج 1" | "فوج 2" | "تناوب">("فوج 1");
  const [selectedRoom, setSelectedRoom] = useState("قاعة 01");
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  // نافذة ضبط مواقيت المؤسسة والاستراحة
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [presetType, setPresetType] = useState<string>("national_1");

  const [mounted, setMounted] = useState(false);

  // توليد الفترات الزمنية بحسب الإعدادات الحالية
  const { morningSlots, afternoonSlots, allSlots } = useMemo(() => {
    return generateTimeSlots(settings);
  }, [settings]);

  // التحقق الأولي الفوري من الجلسة والتخزين المحلي (0ms)
  useEffect(() => {
    setMounted(true);

    if (typeof window !== "undefined") {
      try {
        const storedClasses = localStorage.getItem(LOCAL_STORAGE_CLASSES_KEY);
        if (storedClasses) {
          const parsed = JSON.parse(storedClasses);
          if (Array.isArray(parsed) && parsed.length > 0) setCustomClasses(parsed);
        }

        const storedTimetable = localStorage.getItem(LOCAL_STORAGE_TIMETABLE_KEY);
        if (storedTimetable) {
          const parsed = JSON.parse(storedTimetable);
          if (parsed && Array.isArray(parsed.slots)) setSlots(parsed.slots);
          if (parsed && parsed.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
          if (parsed && parsed.image_path) setOfficialImagePath(parsed.image_path);
        }
      } catch (e) {
        console.warn("Error reading local timetable cache", e);
      }
    }

    setLoading(true);
    Promise.all([
      fetch("/api/auth")
        .then((res) => res.json())
        .catch(() => ({ authenticated: false })),
      fetch("/api/lessons")
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ])
      .then(([authData, data]: [any, LessonsData | null]) => {
        setAuthenticated(authData?.authenticated === true);

        if (data) {
          const teacherClasses =
            Array.isArray(data.customClasses) && data.customClasses.length > 0
              ? data.customClasses
              : [];
          setCustomClasses(teacherClasses);

          if (data.timetable && Array.isArray(data.timetable.slots)) {
            setSlots(data.timetable.slots);
            setOfficialImagePath(data.timetable.image_path || null);
            if (data.timetable.settings) {
              setSettings({ ...DEFAULT_SETTINGS, ...data.timetable.settings });
            }

            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(LOCAL_STORAGE_TIMETABLE_KEY, JSON.stringify(data.timetable));
              } catch {}
            }
          }
        }
      })
      .catch((err) => {
        console.error(err);
        setMessage({ type: "err", text: "حدث خطأ أثناء تحميل جدول التوقيت" });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // قفل تمرير الصفحة أثناء فتح النوافذ المنبثقة
  const anyModalOpen = isSlotModalOpen || isSettingsModalOpen;
  useEffect(() => {
    if (anyModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [anyModalOpen]);

  // حفظ التعديلات في الخادم والتخزين المحلي
  const persistTimetable = async (
    newSlots: TimetableSlot[],
    newSettings = settings,
    imagePath = officialImagePath
  ) => {
    setSaving(true);
    const payload: TeacherTimetable = {
      teacher_id: "current",
      slots: newSlots,
      settings: newSettings,
      image_path: imagePath,
      updated_at: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_TIMETABLE_KEY, JSON.stringify(payload));
      } catch {}
    }

    try {
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timetable: payload,
        }),
      });
      if (!res.ok) throw new Error("فشل حفظ التوقيت");
      setMessage({ type: "ok", text: "تم تحديث جدول التوقيت الأسبوعي بنجاح 🗓️✨" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "err", text: err.message || "فشل حفظ جدول التوقيت" });
    } finally {
      setSaving(false);
    }
  };

  // تبديل اتجاه الجدول (أفقي / رأسي)
  const handleToggleOrientation = () => {
    const nextOrientation: "days-as-rows" | "days-as-cols" =
      settings.orientation === "days-as-cols" ? "days-as-rows" : "days-as-cols";
    const updatedSettings: TimetableSettings = { ...settings, orientation: nextOrientation };
    setSettings(updatedSettings);
    persistTimetable(slots, updatedSettings);
  };

  // فتح نافذة لحصة محددة في الشبكة
  const handleOpenCell = (day: (typeof SCHOOL_DAYS)[number], start: string, end: string) => {
    const existingIndex = slots.findIndex(
      (s) => s.day === day && s.start === start && s.end === end
    );

    setSelectedDay(day);
    setSelectedStart(start);
    setSelectedEnd(end);

    if (existingIndex >= 0) {
      const existing = slots[existingIndex];
      setSelectedClass(existing.className);
      setSelectedSessionType(existing.sessionType || (existing.className === "استقبال الأولياء" ? "reception" : existing.subgroup ? "td" : "lesson"));
      setSelectedSubgroup((existing.subgroup as "فوج 1" | "فوج 2" | "تناوب") || "فوج 1");
      setSelectedRoom(existing.room || "قاعة 01");
      setEditingSlotIndex(existingIndex);
    } else {
      setSelectedClass(customClasses[0] || "");
      setSelectedSessionType("lesson");
      setSelectedSubgroup("فوج 1");
      setSelectedRoom("قاعة 01");
      setEditingSlotIndex(null);
    }
    setIsSlotModalOpen(true);
  };

  // حفظ الحصة من النافذة
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    let updated: TimetableSlot[];

    let finalClassName = selectedClass;
    if (selectedSessionType === "reception") {
      finalClassName = "استقبال الأولياء";
    } else if (selectedSessionType === "remedial") {
      finalClassName = selectedClass ? `استدراك (${selectedClass})` : "استدراك عام";
    }

    const newSlot: TimetableSlot = {
      day: selectedDay,
      start: selectedStart,
      end: selectedEnd,
      className: finalClassName,
      sessionType: selectedSessionType,
      subgroup: selectedSessionType === "td" ? selectedSubgroup : undefined,
      room: selectedRoom.trim() || undefined,
    };

    if (editingSlotIndex !== null) {
      updated = slots.map((s, idx) => (idx === editingSlotIndex ? newSlot : s));
    } else {
      const filtered = slots.filter(
        (s) => !(s.day === selectedDay && s.start === selectedStart && s.end === selectedEnd)
      );
      updated = [...filtered, newSlot];
    }

    setSlots(updated);
    setIsSlotModalOpen(false);
    await persistTimetable(updated);
  };

  // حذف حصة
  const handleDeleteSlot = async () => {
    if (editingSlotIndex === null) return;
    const updated = slots.filter((_, idx) => idx !== editingSlotIndex);
    setSlots(updated);
    setIsSlotModalOpen(false);
    await persistTimetable(updated);
  };

  // تطبيق نظام مواقيت محدد
  const handleApplyPreset = (preset: string) => {
    setPresetType(preset);
    if (preset === "national_1") {
      // 08:00 - 12:00 | استراحة 12:00 - 13:30 | 13:30 - 16:30
      setSettings((prev) => ({
        ...prev,
        morningStart: "08:00",
        morningSlotsCount: 4,
        breakStart: "12:00",
        breakEnd: "13:30",
        afternoonStart: "13:30",
        afternoonSlotsCount: 3,
        tuesdayAfternoonOff: true,
      }));
    } else if (preset === "national_2") {
      // 08:00 - 12:00 | استراحة 12:00 - 13:00 | 13:00 - 17:00
      setSettings((prev) => ({
        ...prev,
        morningStart: "08:00",
        morningSlotsCount: 4,
        breakStart: "12:00",
        breakEnd: "13:00",
        afternoonStart: "13:00",
        afternoonSlotsCount: 4,
        tuesdayAfternoonOff: true,
      }));
    } else if (preset === "south_eloued") {
      // توقيت ولايات الجنوب (الوادي، بسكرة...): استراحة منتصف النهار ساعتين
      setSettings((prev) => ({
        ...prev,
        morningStart: "08:00",
        morningSlotsCount: 4,
        breakStart: "12:00",
        breakEnd: "14:00",
        afternoonStart: "14:00",
        afternoonSlotsCount: 3,
        tuesdayAfternoonOff: true,
      }));
    }
  };

  const handleSaveSettings = () => {
    setIsSettingsModalOpen(false);
    persistTimetable(slots, settings);
  };

  // البحث عن الحصة في الشبكة
  const getSlotFor = (day: (typeof SCHOOL_DAYS)[number], start: string, end: string) => {
    return slots.find((s) => s.day === day && s.start === start && s.end === end);
  };

  // فحص ما إذا كانت الخانة في فترة راحة مساء الثلاثاء
  const isTuesdayAfternoonSlot = (day: string, period: "morning" | "afternoon") => {
    return settings.tuesdayAfternoonOff !== false && day === "الثلاثاء" && period === "afternoon";
  };

  // إحصائيات توزيع الساعات على الأفواج
  const classHoursSummary = useMemo(() => {
    const summary: Record<string, { total: number; normal: number; td: number; remedial: number }> = {};

    customClasses.forEach((cls) => {
      summary[cls] = { total: 0, normal: 0, td: 0, remedial: 0 };
    });

    let receptionCount = 0;
    let otherCount = 0;

    slots.forEach((s) => {
      if (s.sessionType === "reception" || s.className === "استقبال الأولياء") {
        receptionCount++;
        return;
      }

      // البحث عن الفوج المطابق
      const matchedClass = customClasses.find(
        (cls) => s.className === cls || s.className.startsWith(cls) || s.className.includes(`(${cls})`)
      );

      if (matchedClass) {
        summary[matchedClass].total++;
        if (s.sessionType === "td") summary[matchedClass].td++;
        else if (s.sessionType === "remedial") summary[matchedClass].remedial++;
        else summary[matchedClass].normal++;
      } else {
        otherCount++;
      }
    });

    return {
      classesSummary: summary,
      receptionCount,
      otherCount,
      totalHours: slots.length,
    };
  }, [slots, customClasses]);

  if (authenticated === false) {
    return <LoginRequired next="/admin/timetable" title="جدول التوقيت الأسبوعي" />;
  }

  const isDaysAsCols = settings.orientation === "days-as-cols";

  return (
    <div className="min-h-screen bg-[#fafaf7] py-5 sm:py-8 px-3 sm:px-6 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* شريط المسار والتنقل والإجراءات الرئيسية */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <Link href="/admin" className="hover:text-gray-900 transition flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              لوحة الأستاذ
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-black">جدول التوقيت وتوزيع الأفواج</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* زر تدوير الجدول (الأيام صفوف أو أعمدة) */}
            <button
              onClick={handleToggleOrientation}
              className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-black text-gray-800 hover:bg-gray-100 transition shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="تبديل شكل الجدول: الأيام كصفوف أو كأعمدة"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                {isDaysAsCols ? "🔄 عرض الأيام كصفوف" : "🔄 تدوير: الأيام كأعمدة"}
              </span>
            </button>

            {/* زر ضبط مواقيت المؤسسة */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-gray-600" />
              <span>ضبط مواقيت الحصص والاستراحة</span>
            </button>

            {/* طباعة الجدول */}
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl border border-[#e8e8e0] bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" />
              <span>طباعة التوقيت</span>
            </button>

            <Link
              href="/admin/students"
              className="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-xs font-bold text-emerald-950 hover:bg-emerald-100 transition shadow-2xs flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-emerald-700" />
              <span>إدارة الأفواج والتلاميذ</span>
            </Link>
          </div>
        </div>

        {/* دليل الصفحة البيداغوجي */}
        <div className="print:hidden">
          <PageExplainer
            pageId="timetable"
            title="التوقيت الأسبوعي وتوزيع الأفواج"
            teacherRoleExplanation="وزع ساعات أفواجه على أيام الأسبوع، وحدد حصص التفويج (ف1 / ف2)، وحصة الاستدراك، وساعة استقبال الأولياء مع إمكانية تدوير شكل الجدول وضبط مواقيت المؤسسة بدقة."
            parentRoleExplanation="يطلع الولي على جدول حصص ابنه مع معرفة ساعة استقبال الأستاذ الرسمية بدقة."
            inspectorExplanation="يعاين المفتش مطابقة النصاب الساعي الأسبوعي للأستاذ وتوزيع حصص التعلم وحصص الأعمال الموجهة والاستدراك."
          />
        </div>

        {/* تنبيهات النجاح أو الخطأ */}
        {message && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in duration-200 print:hidden ${
              message.type === "ok"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {message.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* ─── بطاقة ترويسة التوقيت والإحصائيات وتوزيع ساعات الأفواج ─── */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e8e8e0] shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e8e0] pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-0.5 rounded-full text-xs font-black print:hidden">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                <span>الموسم الدراسي 2025 / 2026</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-gray-900">
                جدول التوقيت الأسبوعي وتوزيع ساعات التدريس
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                انقر على أي خانة في الشبكة لتعيين أو تعديل الحصة. راحة مساء الثلاثاء واستراحة منتصف النهار موضحة بدقة.
              </p>
            </div>

            {/* الحجم الساعي الإجمالي */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl px-5 py-2.5 text-center">
                <span className="block text-[11px] font-bold text-gray-600">الحجم الساعي الأسبوعي</span>
                <span className="text-2xl font-black font-mono text-emerald-900">
                  {classHoursSummary.totalHours} سا
                </span>
              </div>
            </div>
          </div>

          {/* لوحة توزيع الحصص على الأفواج المسندة */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5">
                <School className="w-4 h-4 text-emerald-700" />
                <span>توزيع النصاب الساعي على الأفواج المسندة:</span>
              </span>
              <span className="text-[11px] text-gray-400">
                (النصاب الرسمي: عادة 18 إلى 20 ساعة أسبوعياً)
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-0.5">
              {customClasses.length === 0 ? (
                <span className="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  ⚠️ لم تقم بإضافة أفواجك بعد. انتقل إلى إدارة الأفواج لإضافتها.
                </span>
              ) : (
                customClasses.map((cls) => {
                  const stat = classHoursSummary.classesSummary[cls] || { total: 0, normal: 0, td: 0, remedial: 0 };
                  return (
                    <div
                      key={cls}
                      className="bg-[#fafaf7] border border-[#e8e8e0] rounded-xl px-3 py-1.5 text-xs flex items-center gap-2"
                    >
                      <span className="font-black text-gray-900">فوج {cls}:</span>
                      <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {stat.total} سا
                      </span>
                      {stat.td > 0 && (
                        <span className="text-[10px] font-bold text-purple-900 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                          {stat.td} تفويج
                        </span>
                      )}
                    </div>
                  );
                })
              )}

              {/* استقبال الأولياء */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5 text-sky-950 font-bold">
                <span>🤝 استقبال الأولياء:</span>
                <span className="font-mono font-black text-sky-900">
                  {classHoursSummary.receptionCount} سا
                </span>
              </div>

              {/* استدراك */}
              {slots.some((s) => s.sessionType === "remedial" || s.className.includes("استدراك")) && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5 text-orange-950 font-bold">
                  <span>🛠️ استدراك:</span>
                  <span className="font-mono font-black text-orange-900">
                    {slots.filter((s) => s.sessionType === "remedial" || s.className.includes("استدراك")).length} سا
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── شبكة جدول التوقيت التفاعلي (Layout 1: الأيام صفوف | Layout 2: الأيام أعمدة) ─── */}
        <div className="bg-white rounded-3xl border border-[#e8e8e0] shadow-sm overflow-hidden">
          {loading && slots.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-700" />
              <p>جارٍ تحميل جدول التوقيت الأسبوعي...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* ─────────────────────────────────────────────────────────────
                 الوضع 1: الأيام كصفوف والساعات كأعمدة (الوضع الكلاسيكي الشائع)
              ───────────────────────────────────────────────────────────── */}
              {!isDaysAsCols ? (
                <table className="w-full border-collapse text-center min-w-[840px]">
                  <thead>
                    <tr className="bg-[#fafaf7] border-b border-[#e8e8e0] text-[11px] font-black text-gray-700">
                      <th className="py-3 px-3 w-28 border-l border-[#e8e8e0] bg-[#f0f0eb]">
                        اليوم / التوقيت
                      </th>

                      {/* ساعات الصباح */}
                      {morningSlots.map((t) => (
                        <th key={t.start} className="py-2.5 px-2 border-l border-[#e8e8e0]">
                          <span className="block font-black text-gray-900">{t.label}</span>
                          <span className="text-[10px] text-blue-700 font-bold">الفترة الصباحية</span>
                        </th>
                      ))}

                      {/* عمود استراحة منتصف النهار باللون الرمادي كما طلب الأستاذ */}
                      <th className="py-2.5 px-2 w-28 border-l border-[#e8e8e0] bg-slate-200/90 text-slate-700 font-black">
                        <span className="block text-[11px] flex items-center justify-center gap-1">
                          <Coffee className="w-3.5 h-3.5 text-slate-600" />
                          <span>استراحة الغداء</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-600">
                          {settings.breakStart} - {settings.breakEnd}
                        </span>
                      </th>

                      {/* ساعات المساء */}
                      {afternoonSlots.map((t) => (
                        <th key={t.start} className="py-2.5 px-2 border-l border-[#e8e8e0] last:border-l-0">
                          <span className="block font-black text-gray-900">{t.label}</span>
                          <span className="text-[10px] text-teal-700 font-bold">الفترة المسائية</span>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#e8e8e0] text-xs">
                    {SCHOOL_DAYS.map((day) => {
                      return (
                        <tr key={day} className="hover:bg-gray-50/40 transition">
                          {/* اسم اليوم */}
                          <td className="py-3 px-3 font-black text-gray-900 bg-[#fafaf7] border-l border-[#e8e8e0] text-xs">
                            {day}
                          </td>

                          {/* خانات الصباح */}
                          {morningSlots.map((slotTime) => {
                            const slot = getSlotFor(day, slotTime.start, slotTime.end);
                            return (
                              <td
                                key={slotTime.start}
                                onClick={() => handleOpenCell(day, slotTime.start, slotTime.end)}
                                className={`p-1.5 border-l border-[#e8e8e0] transition cursor-pointer relative group h-20 min-w-[105px] ${
                                  slot ? "bg-emerald-50/40 hover:bg-emerald-100/60" : "hover:bg-gray-100/70"
                                }`}
                              >
                                {renderSlotCellContent(slot)}
                              </td>
                            );
                          })}

                          {/* خلية استراحة منتصف النهار باللون الرمادي */}
                          <td className="p-2 border-l border-[#e8e8e0] bg-slate-100 text-slate-500 font-bold text-[10px] select-none text-center">
                            <span className="block text-slate-400">☕</span>
                            <span className="text-[9px]">راحة</span>
                          </td>

                          {/* خانات المساء */}
                          {afternoonSlots.map((slotTime) => {
                            const isTueOff = isTuesdayAfternoonSlot(day, slotTime.period);
                            const slot = getSlotFor(day, slotTime.start, slotTime.end);

                            return (
                              <td
                                key={slotTime.start}
                                onClick={() => handleOpenCell(day, slotTime.start, slotTime.end)}
                                className={`p-1.5 border-l border-[#e8e8e0] last:border-l-0 transition cursor-pointer relative group h-20 min-w-[105px] ${
                                  slot
                                    ? "bg-emerald-50/40 hover:bg-emerald-100/60"
                                    : isTueOff
                                    ? "bg-slate-100/70 hover:bg-slate-200/60 text-slate-400"
                                    : "hover:bg-gray-100/70"
                                }`}
                              >
                                {slot ? (
                                  renderSlotCellContent(slot)
                                ) : isTueOff ? (
                                  <div className="h-full flex flex-col items-center justify-center p-1 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                                    <Coffee className="w-3.5 h-3.5 text-slate-400 mb-0.5" />
                                    <span className="text-[10px] font-bold">راحة رسمية</span>
                                    <span className="text-[8px] text-slate-400">مساء الثلاثاء</span>
                                  </div>
                                ) : (
                                  <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                    <Plus className="w-4 h-4 text-gray-300" />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                /* ─────────────────────────────────────────────────────────────
                   الوضع 2: الأيام كأعمدة والساعات كصفوف (تدوير الجدول حسب الرغبة)
                ───────────────────────────────────────────────────────────── */
                <table className="w-full border-collapse text-center min-w-[800px]">
                  <thead>
                    <tr className="bg-[#fafaf7] border-b border-[#e8e8e0] text-[11px] font-black text-gray-700">
                      <th className="py-3 px-3 w-32 border-l border-[#e8e8e0] bg-[#f0f0eb]">
                        التوقيت / اليوم
                      </th>
                      {SCHOOL_DAYS.map((day) => (
                        <th key={day} className="py-3 px-3 border-l border-[#e8e8e0] last:border-l-0">
                          <span className="text-xs font-black text-gray-900">{day}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#e8e8e0] text-xs">
                    {/* ساعات الصباح */}
                    {morningSlots.map((slotTime) => (
                      <tr key={slotTime.start} className="hover:bg-gray-50/40 transition">
                        <td className="py-2 px-3 font-mono font-black text-gray-900 bg-[#fafaf7] border-l border-[#e8e8e0] text-xs">
                          <div>{slotTime.label}</div>
                          <span className="text-[9px] text-blue-700 font-bold block">صباحاً</span>
                        </td>

                        {SCHOOL_DAYS.map((day) => {
                          const slot = getSlotFor(day, slotTime.start, slotTime.end);
                          return (
                            <td
                              key={day}
                              onClick={() => handleOpenCell(day, slotTime.start, slotTime.end)}
                              className={`p-1.5 border-l border-[#e8e8e0] last:border-l-0 transition cursor-pointer relative group h-20 min-w-[110px] ${
                                slot ? "bg-emerald-50/40 hover:bg-emerald-100/60" : "hover:bg-gray-100/70"
                              }`}
                            >
                              {renderSlotCellContent(slot)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* سطر استراحة منتصف النهار باللون الرمادي يمتد عبر كل الأيام */}
                    <tr className="bg-slate-200/90 text-slate-700 font-black border-y-2 border-slate-300">
                      <td className="py-2.5 px-3 border-l border-slate-300 text-xs font-mono">
                        {settings.breakStart} - {settings.breakEnd}
                      </td>
                      <td colSpan={SCHOOL_DAYS.length} className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-xs font-black text-slate-700">
                          <Coffee className="w-4 h-4 text-slate-600" />
                          <span>☕ استراحة منتصف النهار / الغداء ({settings.breakStart} - {settings.breakEnd})</span>
                        </div>
                      </td>
                    </tr>

                    {/* ساعات المساء */}
                    {afternoonSlots.map((slotTime) => (
                      <tr key={slotTime.start} className="hover:bg-gray-50/40 transition">
                        <td className="py-2 px-3 font-mono font-black text-gray-900 bg-[#fafaf7] border-l border-[#e8e8e0] text-xs">
                          <div>{slotTime.label}</div>
                          <span className="text-[9px] text-teal-700 font-bold block">مساءً</span>
                        </td>

                        {SCHOOL_DAYS.map((day) => {
                          const isTueOff = isTuesdayAfternoonSlot(day, slotTime.period);
                          const slot = getSlotFor(day, slotTime.start, slotTime.end);

                          return (
                            <td
                              key={day}
                              onClick={() => handleOpenCell(day, slotTime.start, slotTime.end)}
                              className={`p-1.5 border-l border-[#e8e8e0] last:border-l-0 transition cursor-pointer relative group h-20 min-w-[110px] ${
                                slot
                                  ? "bg-emerald-50/40 hover:bg-emerald-100/60"
                                  : isTueOff
                                  ? "bg-slate-100/70 hover:bg-slate-200/60 text-slate-400"
                                  : "hover:bg-gray-100/70"
                              }`}
                            >
                              {slot ? (
                                renderSlotCellContent(slot)
                              ) : isTueOff ? (
                                <div className="h-full flex flex-col items-center justify-center p-1 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                                  <Coffee className="w-3.5 h-3.5 text-slate-400 mb-0.5" />
                                  <span className="text-[10px] font-bold">راحة رسمية</span>
                                  <span className="text-[8px] text-slate-400">مساء الثلاثاء</span>
                                </div>
                              ) : (
                                <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                  <Plus className="w-4 h-4 text-gray-300" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* ─── قسم صورة التوقيت الرسمي المؤشر من الإدارة ─── */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e8e8e0] shadow-sm space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-700" />
                <span>النسخة الورقية للتوقيت المعتمد (اختياري)</span>
              </h3>
              <p className="text-[11px] text-gray-500">
                يمكنك الاحتفاظ بصورة لجدول التوقيت الورقي المختوم من إدارة المؤسسة.
              </p>
            </div>
          </div>

          {officialImagePath ? (
            <div className="p-3 bg-[#fafaf7] rounded-2xl border border-[#e8e8e0] text-center space-y-2">
              <img
                src={officialImagePath}
                alt="التوقيت الأسبوعي الرسمي"
                className="max-h-60 mx-auto rounded-xl border border-[#e8e8e0] shadow-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setOfficialImagePath(null);
                  persistTimetable(slots, settings, null);
                }}
                className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
              >
                حذف الصورة
              </button>
            </div>
          ) : (
            <div className="p-3 bg-[#fafaf7] rounded-2xl border border-dashed border-gray-300 text-center text-xs text-gray-500">
              جدول التوقيت التفاعلي أعلاه متكامل تماماً ويغنيك عن الورقي، ويدعم الطباعة الرسمية بضغطة زر واحدة.
            </div>
          )}
        </div>

        {/* ─── Modal تعيين وتعديل الحصة الدراسية ─── */}
        {mounted && isSlotModalOpen && createPortal(
          <div className="fixed inset-0 z-[999999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150" dir="rtl">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#e8e8e0] pb-3 shrink-0">
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {editingSlotIndex !== null ? "تعديل الحصة الدراسية" : "إضافة حصة إلى جدول التوقيت"}
                  </h3>
                  <span className="text-[11px] text-emerald-800 font-bold">
                    {selectedDay} • {selectedStart} إلى {selectedEnd}
                  </span>
                </div>
                <button
                  onClick={() => setIsSlotModalOpen(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSlot} className="space-y-4 overflow-y-auto flex-1 pr-0.5">
                {/* 1. اختيار نوع النشاط / الحصة */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">
                    طبيعة الحصة البيداغوجية <span className="text-red-500">*</span>:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-black">
                    <button
                      type="button"
                      onClick={() => setSelectedSessionType("lesson")}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                        selectedSessionType === "lesson"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-2xs"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-emerald-700" />
                        <span>حصة قسم كامل</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-normal block mt-0.5">درس لجميع تلاميذ الفوج</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSessionType("td")}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                        selectedSessionType === "td"
                          ? "bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/20 shadow-2xs"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-purple-700" />
                        <span>حصة تفويج (TD)</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-normal block mt-0.5">أعمال موجهة (فوج 1 أو 2)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSessionType("remedial")}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                        selectedSessionType === "remedial"
                          ? "bg-orange-50 border-orange-500 text-orange-950 ring-2 ring-orange-500/20 shadow-2xs"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>🛠️</span>
                        <span>حصة استدراك</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-normal block mt-0.5">معالجة بيداغوجية ودعم</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSessionType("reception")}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                        selectedSessionType === "reception"
                          ? "bg-sky-50 border-sky-500 text-sky-950 ring-2 ring-sky-500/20 shadow-2xs"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>🤝</span>
                        <span>استقبال الأولياء</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-normal block mt-0.5">ساعة الاستقبال المعتمدة</span>
                    </button>
                  </div>
                </div>

                {/* 2. اختيار الفوج التربوي (إذا لم تكن استقبال أولياء) */}
                {selectedSessionType !== "reception" && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-800">
                      الفوج التربوي المعني <span className="text-red-500">*</span>:
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                    >
                      {customClasses.length === 0 ? (
                        <option value="">-- يرجى إضافة فوج في إدارة الأفواج --</option>
                      ) : (
                        customClasses.map((c) => (
                          <option key={c} value={c}>
                            فوج {c}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}

                {/* 3. في حالة التفويج: اختيار فوج 1 أو فوج 2 أو بالتناوب */}
                {selectedSessionType === "td" && (
                  <div className="space-y-1.5 p-3 rounded-2xl bg-purple-50/70 border border-purple-200">
                    <label className="block text-xs font-black text-purple-950">
                      الفوج الفرعي المستهدف (التفويج):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSubgroup("فوج 1")}
                        className={`py-2 px-2 rounded-xl border text-xs font-black transition cursor-pointer text-center ${
                          selectedSubgroup === "فوج 1"
                            ? "bg-purple-700 text-white border-purple-700 shadow-xs"
                            : "bg-white text-purple-900 border-purple-200 hover:bg-purple-100/50"
                        }`}
                      >
                        👥 فوج 1
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedSubgroup("فوج 2")}
                        className={`py-2 px-2 rounded-xl border text-xs font-black transition cursor-pointer text-center ${
                          selectedSubgroup === "فوج 2"
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                            : "bg-white text-amber-900 border-amber-200 hover:bg-amber-100/50"
                        }`}
                      >
                        👥 فوج 2
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedSubgroup("تناوب")}
                        className={`py-2 px-1 rounded-xl border text-[11px] font-black transition cursor-pointer text-center ${
                          selectedSubgroup === "تناوب"
                            ? "bg-gray-900 text-white border-gray-900 shadow-xs"
                            : "bg-white text-gray-800 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        🔄 بالتناوب
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. القاعة أو المخبر */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">
                    القاعة / المخبر (اختياري):
                  </label>
                  <input
                    type="text"
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    placeholder="مثال: قاعة 04 أو مخبر 02"
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#e8e8e0] shrink-0">
                  {editingSlotIndex !== null ? (
                    <button
                      type="button"
                      onClick={handleDeleteSlot}
                      className="text-xs font-bold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      حذف الحصة
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSlotModalOpen(false)}
                      className="px-3.5 py-2 rounded-xl border border-[#e8e8e0] text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5 cursor-pointer shadow-md font-black"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>تثبيت الحصة</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ─── Modal ضبط مواقيت الحصص والاستراحة ─── */}
        {mounted && isSettingsModalOpen && createPortal(
          <div className="fixed inset-0 z-[999999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150" dir="rtl">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#e8e8e0] pb-3 shrink-0">
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    ضبط مواقيت الحصص واستراحة منتصف النهار
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    تكييف ساعات الجدول بحسب التنظيم الساعي المعتمد في مؤسستك
                  </p>
                </div>
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                {/* أنظمة التوقيت الجاهزة */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-800">
                    اختر نظام التوقيت المعتمد في متوسطتك:
                  </label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("national_1")}
                      className={`w-full p-3 rounded-2xl border text-right transition cursor-pointer ${
                        presetType === "national_1"
                          ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900">النظام الوطني الشائع 1 (استراحة ساعة ونصف)</span>
                        {presetType === "national_1" && <Check className="w-4 h-4 text-emerald-700" />}
                      </div>
                      <span className="text-[11px] text-gray-500 block mt-0.5">
                        الصباح: 08:00 - 12:00 | استراحة الغداء: 12:00 - 13:30 | المساء: 13:30 - 16:30
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset("national_2")}
                      className={`w-full p-3 rounded-2xl border text-right transition cursor-pointer ${
                        presetType === "national_2"
                          ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900">النظام الوطني 2 (استراحة ساعة تامة)</span>
                        {presetType === "national_2" && <Check className="w-4 h-4 text-emerald-700" />}
                      </div>
                      <span className="text-[11px] text-gray-500 block mt-0.5">
                        الصباح: 08:00 - 12:00 | استراحة الغداء: 12:00 - 13:00 | المساء: 13:00 - 17:00
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyPreset("south_eloued")}
                      className={`w-full p-3 rounded-2xl border text-right transition cursor-pointer ${
                        presetType === "south_eloued"
                          ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900">توقيت ولايات الجنوب (الوادي، بسكرة... - استراحة ساعتين)</span>
                        {presetType === "south_eloued" && <Check className="w-4 h-4 text-emerald-700" />}
                      </div>
                      <span className="text-[11px] text-gray-500 block mt-0.5">
                        الصباح: 08:00 - 12:00 | استراحة الغداء: 12:00 - 14:00 | المساء: 14:00 - 17:00
                      </span>
                    </button>
                  </div>
                </div>

                {/* خيار راحة مساء الثلاثاء */}
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-amber-950 block">راحة مساء الثلاثاء (تنسيق بيداغوجي رسمي):</span>
                    <span className="text-[11px] text-amber-800/90 block">تمييز خانات بعد الظهر ليوم الثلاثاء تلقائياً كراحة أسبوعية</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.tuesdayAfternoonOff !== false}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, tuesdayAfternoonOff: e.target.checked }))
                    }
                    className="w-4 h-4 text-emerald-700 rounded border-gray-300 focus:ring-emerald-700 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e8e8e0] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5 shadow-md font-black cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>تطبيق وحفظ المواقيت</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

// دالة مساعدة لتصيير محتوى خلية الحصة في شبكة التوقيت
function renderSlotCellContent(slot?: TimetableSlot) {
  if (!slot) return null;

  const isTD = slot.sessionType === "td" || Boolean(slot.subgroup);
  const isReception = slot.sessionType === "reception" || slot.className === "استقبال الأولياء";
  const isRemedial = slot.sessionType === "remedial" || slot.className.includes("استدراك");

  return (
    <div className="h-full flex flex-col justify-between text-right p-1.5 rounded-xl bg-white border border-[#e8e8e0] shadow-xs hover:border-emerald-400 transition">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-1">
          {/* شارة النشاط بالألوان المعتمدة */}
          {isReception ? (
            <span className="text-[11px] font-black bg-sky-50 text-sky-900 border border-sky-300 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
              <span>🤝</span>
              <span>استقبال الأولياء</span>
            </span>
          ) : isRemedial ? (
            <span className="text-[11px] font-black bg-orange-50 text-orange-950 border border-orange-300 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
              <span>🛠️</span>
              <span>{slot.className}</span>
            </span>
          ) : isTD ? (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-black text-xs text-gray-900">
                {slot.className}
              </span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${
                  slot.subgroup === "فوج 2"
                    ? "bg-amber-50 text-amber-950 border-amber-300"
                    : slot.subgroup === "تناوب"
                    ? "bg-gray-100 text-gray-800 border-gray-300"
                    : "bg-purple-50 text-purple-950 border-purple-300"
                }`}
              >
                {slot.subgroup === "فوج 2" ? "👥 ف2" : slot.subgroup === "تناوب" ? "🔄 تناوب" : "👥 ف1"}
              </span>
            </div>
          ) : (
            <span className="font-black text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              {slot.className}
            </span>
          )}

          {/* القاعة */}
          {slot.room && (
            <span className="text-[9px] text-gray-500 font-mono bg-gray-50 px-1 py-0.5 rounded border border-gray-200 shrink-0">
              {slot.room}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[9px] text-gray-400 font-mono pt-1">
        <span>{slot.start} - {slot.end}</span>
        <Pencil className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100 transition" />
      </div>
    </div>
  );
}
