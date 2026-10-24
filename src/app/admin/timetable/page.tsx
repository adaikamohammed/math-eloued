"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  ArrowRight,
  School,
  Sliders,
  RotateCcw,
  Printer,
  X,
  Check,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Smartphone,
  Eye,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { TimetableSlot, TeacherTimetable, TimetableSettings, LessonsData } from "@/lib/types";

// مفاتيح التخزين المحلي لضمان المزامنة الفورية بدون تأخير
const LOCAL_STORAGE_CLASSES_KEYS = ["last_active_classes", "math_custom_classes"];
const LOCAL_STORAGE_TIMETABLE_KEY = "math_teacher_timetable_cache";

// الأفواج الافتراضية للتعليم المتوسط (في حال لم يدخل الأستاذ أفواجه بعد)
const DEFAULT_MIDDLE_SCHOOL_CLASSES = ["1م1", "1م2", "2م1", "4م3"];

// أيام الأسبوع الدراسي في الجزائر (من الأحد إلى الخميس)
const SCHOOL_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"] as const;

// الإعدادات الزمنية الافتراضية
const DEFAULT_SETTINGS: TimetableSettings = {
  orientation: "days-as-rows",
  morningStart: "08:00",
  morningSlotsCount: 4,
  breakStart: "12:00",
  breakEnd: "13:30",
  afternoonStart: "13:30",
  afternoonSlotsCount: 3,
  tuesdayAfternoonOff: true,
};

interface TimeSlotDef {
  start: string;
  end: string;
  label: string;
  period: "morning" | "afternoon";
}

// دالة حساب وتوليد الفترات الزمنية
function generateTimeSlots(settings: TimetableSettings): {
  morningSlots: TimeSlotDef[];
  afternoonSlots: TimeSlotDef[];
  allSlots: TimeSlotDef[];
} {
  const morningSlots: TimeSlotDef[] = [];
  const afternoonSlots: TimeSlotDef[] = [];

  // 1. الفترة الصباحية
  const mStartParts = (settings.morningStart || "08:00").split(":");
  const mStartHour = parseInt(mStartParts[0] || "8", 10);
  const mStartMin = parseInt(mStartParts[1] || "0", 10);
  const mCount = settings.morningSlotsCount || 4;

  for (let i = 0; i < mCount; i++) {
    const sH = mStartHour + i;
    const eH = sH + 1;
    const minStr = mStartMin === 0 ? "00" : `${mStartMin}`;
    const startStr = `${sH < 10 ? "0" : ""}${sH}:${minStr}`;
    const endStr = `${eH < 10 ? "0" : ""}${eH}:${minStr}`;
    morningSlots.push({
      start: startStr,
      end: endStr,
      label: `${startStr} - ${endStr}`,
      period: "morning",
    });
  }

  // 2. الفترة المسائية
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

  // الأفواج والجدول والإعدادات
  const [customClasses, setCustomClasses] = useState<string[]>(DEFAULT_MIDDLE_SCHOOL_CLASSES);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [settings, setSettings] = useState<TimetableSettings>(DEFAULT_SETTINGS);
  const [officialImagePath, setOfficialImagePath] = useState<string | null>(null);

  // وضع التوزيع السريع (Stamp Mode): عند تفعيل فوج معين، أي نقرة على خانة فارغة تسند الفوج فوراً بضغطة واحدة!
  const [quickStampClass, setQuickStampClass] = useState<string | null>(null);

  // وضع التصفح على الهواتف والشاشات الصغيرة (اختيار يوم محدد أو عرض الكل)
  const [mobileActiveDay, setMobileActiveDay] = useState<string>("all");

  // نافذة تعديل أو إضافة حصة
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<(typeof SCHOOL_DAYS)[number]>("الأحد");
  const [selectedStart, setSelectedStart] = useState("08:00");
  const [selectedEnd, setSelectedEnd] = useState("09:00");
  const [selectedClass, setSelectedClass] = useState("1م1");
  const [newClassInput, setNewClassInput] = useState("");
  const [showAddClassInput, setShowAddClassInput] = useState(false);
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
        // فحص كل مفاتيح الأفواج المحتملة
        let loadedClasses: string[] = [];
        for (const key of LOCAL_STORAGE_CLASSES_KEYS) {
          const val = localStorage.getItem(key);
          if (val) {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed) && parsed.length > 0) {
                loadedClasses = parsed;
                break;
              }
            } catch {}
          }
        }

        if (loadedClasses.length > 0) {
          setCustomClasses(loadedClasses);
          setSelectedClass(loadedClasses[0]);
        } else {
          setCustomClasses(DEFAULT_MIDDLE_SCHOOL_CLASSES);
          setSelectedClass(DEFAULT_MIDDLE_SCHOOL_CLASSES[0]);
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
          // استخراج الأفواج إما من customClasses أو من studentRoster أو timetable
          let candidateClasses: string[] = [];
          if (Array.isArray(data.customClasses) && data.customClasses.length > 0) {
            candidateClasses = data.customClasses;
          } else if (Array.isArray(data.studentRoster) && data.studentRoster.length > 0) {
            candidateClasses = Array.from(new Set(data.studentRoster.map((s) => s.className).filter(Boolean)));
          } else if (data.timetable && Array.isArray(data.timetable.slots)) {
            candidateClasses = Array.from(
              new Set(
                data.timetable.slots
                  .map((s) => s.className)
                  .filter((c) => c && c !== "استقبال الأولياء" && !c.includes("استدراك"))
              )
            );
          }

          if (candidateClasses.length > 0) {
            setCustomClasses(candidateClasses);
            setSelectedClass((prev) => (candidateClasses.includes(prev) ? prev : candidateClasses[0]));
            if (typeof window !== "undefined") {
              LOCAL_STORAGE_CLASSES_KEYS.forEach((k) => {
                try {
                  localStorage.setItem(k, JSON.stringify(candidateClasses));
                } catch {}
              });
            }
          }

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
    imagePath = officialImagePath,
    currentClasses = customClasses
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
        LOCAL_STORAGE_CLASSES_KEYS.forEach((k) => {
          try {
            localStorage.setItem(k, JSON.stringify(currentClasses));
          } catch {}
        });
      } catch {}
    }

    try {
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timetable: payload,
          customClasses: currentClasses,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "فشل حفظ التوقيت");
      }
      setMessage({ type: "ok", text: "تم تحديث جدول التوقيت الأسبوعي بنجاح 🗓️✨" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "err", text: err.message || "فشل حفظ جدول التوقيت" });
    } finally {
      setSaving(false);
    }
  };

  // تبديل أو تعيين اتجاه الجدول (أفقي / رأسي)
  const handleSetOrientation = (newOrientation: "days-as-rows" | "days-as-cols") => {
    const updatedSettings: TimetableSettings = { ...settings, orientation: newOrientation };
    setSettings(updatedSettings);
    persistTimetable(slots, updatedSettings);
  };

  const handleToggleOrientation = () => {
    const nextOrientation: "days-as-rows" | "days-as-cols" =
      settings.orientation === "days-as-cols" ? "days-as-rows" : "days-as-cols";
    handleSetOrientation(nextOrientation);
  };

  // إضافة فوج جديد مخصص على الفور من داخل الصفحة أو النافذة
  const handleAddNewClass = (clsName: string) => {
    const clean = clsName.trim();
    if (!clean) return;
    if (!customClasses.includes(clean)) {
      const updated = [...customClasses, clean];
      setCustomClasses(updated);
      setSelectedClass(clean);
      setNewClassInput("");
      setShowAddClassInput(false);
      persistTimetable(slots, settings, officialImagePath, updated);
    } else {
      setSelectedClass(clean);
      setShowAddClassInput(false);
    }
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
      setSelectedSessionType(
        existing.sessionType ||
          (existing.className === "استقبال الأولياء"
            ? "reception"
            : existing.subgroup
            ? "td"
            : "lesson")
      );
      setSelectedSubgroup((existing.subgroup as "فوج 1" | "فوج 2" | "تناوب") || "فوج 1");
      setSelectedRoom(existing.room || "قاعة 01");
      setEditingSlotIndex(existingIndex);
    } else {
      setSelectedClass(quickStampClass || customClasses[0] || DEFAULT_MIDDLE_SCHOOL_CLASSES[0]);
      setSelectedSessionType("lesson");
      setSelectedSubgroup("فوج 1");
      setSelectedRoom("قاعة 01");
      setEditingSlotIndex(null);
    }
    setIsSlotModalOpen(true);
  };

  // النقر على خانة في الجدول: إذا كان وضع التوزيع السريع مفعل للخانة الفارغة يتم إسنادها مباشرة بضغطة واحدة!
  const handleCellClick = (day: (typeof SCHOOL_DAYS)[number], start: string, end: string) => {
    const existingIndex = slots.findIndex(
      (s) => s.day === day && s.start === start && s.end === end
    );

    // إذا كان وضع التوزيع السريع مفعلاً والخانة فارغة -> إسناد فوري بضغطة واحدة!
    if (quickStampClass && existingIndex === -1) {
      const newSlot: TimetableSlot = {
        day,
        start,
        end,
        className: quickStampClass,
        sessionType: "lesson",
        room: "قاعة 01",
      };
      const updated = [...slots, newSlot];
      setSlots(updated);
      persistTimetable(updated);
      return;
    }

    // وإلا فتح النافذة التفاعلية
    handleOpenCell(day, start, end);
  };

  // حذف سريع مباشر لحصة من الخانة دون فتح النافذة
  const handleQuickDeleteSlot = (e: React.MouseEvent, day: string, start: string, end: string) => {
    e.stopPropagation();
    const updated = slots.filter(
      (s) => !(s.day === day && s.start === start && s.end === end)
    );
    setSlots(updated);
    persistTimetable(updated);
  };

  // حفظ الحصة من النافذة
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    let updated: TimetableSlot[];

    let finalClassName = selectedClass || customClasses[0] || DEFAULT_MIDDLE_SCHOOL_CLASSES[0];
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

  // حذف حصة من داخل النافذة
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
        if (!summary[matchedClass]) {
          summary[matchedClass] = { total: 0, normal: 0, td: 0, remedial: 0 };
        }
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
    <div className="min-h-screen bg-[#fafaf7] py-4 sm:py-8 px-2 sm:px-6 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
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
              <span>قوائم التلاميذ</span>
            </Link>
          </div>
        </div>

        {/* رسائل التنبيه والنجاح */}
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
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#e8e8e0] shadow-sm space-y-4">
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
                وزّع ساعات التدريس على الأفواج مباشرة من الشبكة. انقر على أي خانة للتعديل أو استخدم أداة التوزيع السريع.
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

          {/* لوحة توزيع الحصص على الأفواج المسندة + أداة التوزيع السريع */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5">
                <School className="w-4 h-4 text-emerald-700" />
                <span>الأفواج المسندة والنصاب الساعي (انقر على أي فوج لتفعيل التوزيع السريع ⚡):</span>
              </span>
              <span className="text-[11px] text-gray-400">
                (النصاب الرسمي: عادة 18 إلى 20 ساعة أسبوعياً)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {customClasses.map((cls) => {
                const stat = classHoursSummary.classesSummary[cls] || { total: 0, normal: 0, td: 0, remedial: 0 };
                const isSelectedForStamp = quickStampClass === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setQuickStampClass(isSelectedForStamp ? null : cls)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-black transition cursor-pointer flex items-center gap-2 border ${
                      isSelectedForStamp
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400 scale-105"
                        : "bg-[#fafaf7] hover:bg-emerald-50 text-gray-900 border-[#e8e8e0] hover:border-emerald-300"
                    }`}
                    title={isSelectedForStamp ? "انقر لإلغاء وضع التوزيع السريع" : `تفعيل التوزيع السريع لفوج ${cls}`}
                  >
                    <span>فوج {cls}</span>
                    <span
                      className={`font-mono text-xs px-2 py-0.5 rounded-md ${
                        isSelectedForStamp
                          ? "bg-white text-emerald-800"
                          : "bg-emerald-100 text-emerald-900"
                      }`}
                    >
                      {stat.total} سا
                    </span>
                    {stat.td > 0 && (
                      <span className="text-[10px] font-bold text-purple-900 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                        {stat.td} تفويج
                      </span>
                    )}
                  </button>
                );
              })}

              {/* زر إضافة فوج سريع */}
              {!showAddClassInput ? (
                <button
                  type="button"
                  onClick={() => setShowAddClassInput(true)}
                  className="px-3 py-2 rounded-xl border border-dashed border-gray-300 text-xs font-bold text-gray-600 hover:text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50/50 transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة فوج</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-emerald-400 shadow-2xs">
                  <input
                    type="text"
                    value={newClassInput}
                    onChange={(e) => setNewClassInput(e.target.value)}
                    placeholder="مثال: 3م2"
                    className="w-20 px-2 py-1 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddNewClass(newClassInput);
                      if (e.key === "Escape") setShowAddClassInput(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddNewClass(newClassInput)}
                    className="px-2 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 cursor-pointer"
                  >
                    إضافة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddClassInput(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* استقبال الأولياء */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5 text-sky-950 font-bold mr-auto">
                <span>🤝 استقبال الأولياء:</span>
                <span className="font-mono font-black text-sky-900">
                  {classHoursSummary.receptionCount} سا
                </span>
              </div>
            </div>

            {/* شريط وضع التوزيع السريع المنبثق عند تفعيله */}
            {quickStampClass && (
              <div className="bg-emerald-100/90 border border-emerald-300 text-emerald-950 px-4 py-2 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700 animate-bounce" />
                  <span>
                    ⚡ وضع التوزيع السريع مفعل للفوج <strong>[{quickStampClass}]</strong>: انقر مباشرة على أي خانة فارغة في الجدول لإسنادها فوراً بضغطة واحدة!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickStampClass(null)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-black transition cursor-pointer shadow-2xs"
                >
                  ✕ إلغاء التوزيع السريع
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── شريط التحكم البارز في تدوير شكل الجدول (أفقي / عمودي) ─── */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-3.5 sm:p-4 rounded-3xl border border-emerald-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-gray-900 block">
                شكل عرض وتدوير الجدول (الأيام صفوف ⮂ الأيام أعمدة):
              </span>
              <span className="text-[11px] text-gray-600 hidden sm:block">
                اختر النمط المناسب لك ولمؤسستك بسهولة بضغطة واحدة
              </span>
            </div>
          </div>

          <div className="inline-flex p-1 bg-white rounded-2xl border border-gray-300 shadow-2xs">
            <button
              type="button"
              onClick={() => handleSetOrientation("days-as-rows")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                !isDaysAsCols
                  ? "bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500"
                  : "text-gray-700 hover:text-gray-950 hover:bg-gray-100"
              }`}
            >
              <span>▤ الأيام كصفوف (أفقي كلاسيكي)</span>
              {!isDaysAsCols && <Check className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => handleSetOrientation("days-as-cols")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                isDaysAsCols
                  ? "bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500"
                  : "text-gray-700 hover:text-gray-950 hover:bg-gray-100"
              }`}
            >
              <span>▥ الأيام كأعمدة (عمودي)</span>
              {isDaysAsCols && <Check className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ─── أشرطة مساعدة وتصفح الهواتف المحمولة والشاشات الصغيرة ─── */}
        <div className="block md:hidden bg-white p-3 rounded-2xl border border-[#e8e8e0] shadow-xs space-y-2 print:hidden">
          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-700" />
              <span>تصفح الجدول على الهاتف:</span>
            </span>
            <span className="text-[10px] text-gray-400">انقر لعرض يوم محدد</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setMobileActiveDay("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                mobileActiveDay === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              عرض الشبكة الكاملة
            </button>
            {SCHOOL_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setMobileActiveDay(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                  mobileActiveDay === d
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* ─── وضع العرض المخصص للهاتف (عند اختيار يوم محدد) ─── */}
        {mobileActiveDay !== "all" && (
          <div className="block md:hidden space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <span className="font-black text-xs text-emerald-950">جدول يوم {mobileActiveDay}</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileActiveDay("all")}
                className="text-xs text-emerald-800 font-bold hover:underline"
              >
                العودة للشبكة
              </button>
            </div>

            <div className="space-y-2">
              {allSlots.map((slotDef, idx) => {
                const isBreak =
                  idx === morningSlots.length &&
                  settings.breakStart &&
                  settings.breakEnd;
                const isTueRest = isTuesdayAfternoonSlot(mobileActiveDay, slotDef.period);
                const s = getSlotFor(mobileActiveDay as (typeof SCHOOL_DAYS)[number], slotDef.start, slotDef.end);

                return (
                  <div
                    key={slotDef.start}
                    className={`p-3.5 rounded-2xl border transition ${
                      isBreak
                        ? "bg-slate-200/90 border-slate-300 text-slate-800"
                        : isTueRest
                        ? "bg-slate-100 border-slate-300 text-slate-600"
                        : s
                        ? s.sessionType === "reception"
                          ? "bg-sky-50 border-sky-300"
                          : s.sessionType === "remedial"
                          ? "bg-orange-50 border-orange-300"
                          : s.sessionType === "td"
                          ? "bg-purple-50 border-purple-300"
                          : "bg-white border-emerald-300 shadow-xs"
                        : "bg-white border-dashed border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-black text-gray-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {slotDef.label}
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold">
                        {slotDef.period === "morning" ? "فترة صباحية" : "فترة مسائية"}
                      </span>
                    </div>

                    {isTueRest ? (
                      <div className="text-center py-2 text-xs font-black text-slate-600">
                        ☕ راحة رسمية (مساء الثلاثاء)
                      </div>
                    ) : s ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-gray-900">
                              {s.className}
                            </span>
                            {s.subgroup && (
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                  s.subgroup === "فوج 1"
                                    ? "bg-purple-700 text-white"
                                    : s.subgroup === "فوج 2"
                                    ? "bg-amber-600 text-white"
                                    : "bg-gray-900 text-white"
                                }`}
                              >
                                {s.subgroup}
                              </span>
                            )}
                            {s.sessionType === "remedial" && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-orange-600 text-white">
                                استدراك
                              </span>
                            )}
                            {s.sessionType === "reception" && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-sky-600 text-white">
                                استقبال أولياء
                              </span>
                            )}
                          </div>
                          {s.room && (
                            <span className="text-[11px] text-gray-500 font-medium block mt-0.5">
                              📍 {s.room}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenCell(mobileActiveDay as (typeof SCHOOL_DAYS)[number], slotDef.start, slotDef.end)}
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleQuickDeleteSlot(e, mobileActiveDay, slotDef.start, slotDef.end)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCellClick(mobileActiveDay as (typeof SCHOOL_DAYS)[number], slotDef.start, slotDef.end)}
                        className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-xs font-bold text-gray-500 hover:text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50/40 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة حصة هنا</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── شبكة جدول التوقيت التفاعلي (Desktop & Full Grid View) ─── */}
        <div className={`bg-white rounded-3xl border border-[#e8e8e0] shadow-sm overflow-hidden ${mobileActiveDay !== "all" ? "hidden md:block" : "block"}`}>
          {loading && slots.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-700" />
              <p>جارٍ تحميل جدول التوقيت الأسبوعي...</p>
            </div>
          ) : (
            <div className="overflow-x-auto relative scrollbar-thin">
              {/* إشعار سحب الجدول للشاشات الصغيرة */}
              <div className="md:hidden bg-amber-50 border-b border-amber-200 px-3 py-1 text-[11px] font-bold text-amber-900 text-center">
                👉 يمكنك سحب الجدول أفقياً لتصفح بقية الساعات والأيام
              </div>

              {/* ─────────────────────────────────────────────────────────────
                 الوضع 1: الأيام كصفوف والساعات كأعمدة (الوضع الكلاسيكي الشائع)
              ───────────────────────────────────────────────────────────── */}
              {!isDaysAsCols ? (
                <table className="w-full border-collapse text-center min-w-[900px]">
                  <thead>
                    <tr className="bg-[#fafaf7] border-b border-[#e8e8e0] text-[11px] font-black text-gray-700">
                      <th className="py-3 px-3 w-28 border-l border-[#e8e8e0] bg-[#f0f0eb] sticky right-0 z-20 shadow-xs">
                        اليوم / التوقيت
                      </th>

                      {/* ساعات الصباح */}
                      {morningSlots.map((t) => (
                        <th key={t.start} className="py-2.5 px-2 border-l border-[#e8e8e0]">
                          <span className="block font-black text-gray-900">{t.label}</span>
                          <span className="text-[10px] text-blue-700 font-bold">الفترة الصباحية</span>
                        </th>
                      ))}

                      {/* عمود استراحة منتصف النهار باللون الرمادي */}
                      <th className="py-2.5 px-3 w-20 bg-slate-200 text-slate-700 border-l border-[#e8e8e0] font-black text-[11px]">
                        <span className="block">استراحة</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {settings.breakStart} - {settings.breakEnd}
                        </span>
                      </th>

                      {/* ساعات المساء */}
                      {afternoonSlots.map((t) => (
                        <th key={t.start} className="py-2.5 px-2 border-l border-[#e8e8e0] last:border-l-0">
                          <span className="block font-black text-gray-900">{t.label}</span>
                          <span className="text-[10px] text-amber-700 font-bold">الفترة المسائية</span>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {SCHOOL_DAYS.map((day) => (
                      <tr key={day} className="border-b border-[#e8e8e0] hover:bg-slate-50/40 transition">
                        {/* عمود اسم اليوم (ثابت في اليمين sticky عند التمرير الأفقي) */}
                        <td className="py-4 px-3 font-black text-xs text-gray-900 bg-[#f7f7f2] border-l border-[#e8e8e0] sticky right-0 z-10 shadow-xs">
                          {day}
                        </td>

                        {/* خانات الصباح */}
                        {morningSlots.map((t) => {
                          const s = getSlotFor(day, t.start, t.end);
                          return (
                            <td
                              key={t.start}
                              onClick={() => handleCellClick(day, t.start, t.end)}
                              className="p-1.5 border-l border-[#e8e8e0] align-middle h-20 transition cursor-pointer hover:bg-emerald-50/40 relative group"
                            >
                              {s ? (
                                <SlotBadge slot={s} onDelete={(e) => handleQuickDeleteSlot(e, day, t.start, t.end)} />
                              ) : (
                                <EmptySlotHint quickStampClass={quickStampClass} />
                              )}
                            </td>
                          );
                        })}

                        {/* خانة استراحة منتصف النهار بلون رمادي موحد */}
                        <td className="bg-slate-200/90 text-slate-700 border-l border-slate-300 p-1 text-[11px] font-black select-none">
                          <span className="block transform rotate-180 writing-mode-vertical text-[10px] text-slate-500 tracking-wider">
                            استراحة
                          </span>
                        </td>

                        {/* خانات المساء */}
                        {afternoonSlots.map((t) => {
                          const isTueRest = isTuesdayAfternoonSlot(day, "afternoon");
                          const s = getSlotFor(day, t.start, t.end);

                          if (isTueRest && !s) {
                            return (
                              <td
                                key={t.start}
                                onClick={() => handleCellClick(day, t.start, t.end)}
                                className="p-1.5 border-l border-[#e8e8e0] last:border-l-0 align-middle h-20 bg-slate-100/90 text-slate-500 transition cursor-pointer hover:bg-slate-200/70"
                                title="راحة رسمية (مساء الثلاثاء) - انقر لتعيين حصة استثنائية إن لزم الأمر"
                              >
                                <div className="text-[11px] font-bold text-slate-600 flex flex-col items-center justify-center gap-0.5">
                                  <span>☕</span>
                                  <span>راحة رسمية</span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={t.start}
                              onClick={() => handleCellClick(day, t.start, t.end)}
                              className="p-1.5 border-l border-[#e8e8e0] last:border-l-0 align-middle h-20 transition cursor-pointer hover:bg-emerald-50/40 relative group"
                            >
                              {s ? (
                                <SlotBadge slot={s} onDelete={(e) => handleQuickDeleteSlot(e, day, t.start, t.end)} />
                              ) : (
                                <EmptySlotHint quickStampClass={quickStampClass} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* ─────────────────────────────────────────────────────────────
                   الوضع 2: الأيام كأعمدة والساعات كصفوف (تدوير الجدول)
                ───────────────────────────────────────────────────────────── */
                <table className="w-full border-collapse text-center min-w-[900px]">
                  <thead>
                    <tr className="bg-[#fafaf7] border-b border-[#e8e8e0] text-[11px] font-black text-gray-700">
                      <th className="py-3 px-3 w-32 border-l border-[#e8e8e0] bg-[#f0f0eb] sticky right-0 z-20 shadow-xs">
                        التوقيت / اليوم
                      </th>
                      {SCHOOL_DAYS.map((day) => (
                        <th key={day} className="py-2.5 px-3 border-l border-[#e8e8e0] last:border-l-0 font-black text-xs text-gray-900">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {/* ساعات الصباح */}
                    {morningSlots.map((t) => (
                      <tr key={t.start} className="border-b border-[#e8e8e0] hover:bg-slate-50/40 transition">
                        <td className="py-3 px-2 bg-[#f7f7f2] border-l border-[#e8e8e0] font-mono text-xs font-black text-gray-800 sticky right-0 z-10 shadow-xs">
                          <div>{t.label}</div>
                          <span className="text-[10px] text-blue-700 font-sans font-bold">صباحاً</span>
                        </td>

                        {SCHOOL_DAYS.map((day) => {
                          const s = getSlotFor(day, t.start, t.end);
                          return (
                            <td
                              key={day}
                              onClick={() => handleCellClick(day, t.start, t.end)}
                              className="p-1.5 border-l border-[#e8e8e0] last:border-l-0 align-middle h-20 transition cursor-pointer hover:bg-emerald-50/40 relative group"
                            >
                              {s ? (
                                <SlotBadge slot={s} onDelete={(e) => handleQuickDeleteSlot(e, day, t.start, t.end)} />
                              ) : (
                                <EmptySlotHint quickStampClass={quickStampClass} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* صف استراحة منتصف النهار باللون الرمادي */}
                    <tr className="bg-slate-200 border-y-2 border-slate-300">
                      <td className="py-2 px-2 font-mono text-xs font-black text-slate-700 border-l border-slate-300 sticky right-0 z-10 bg-slate-200 shadow-xs">
                        {settings.breakStart} - {settings.breakEnd}
                      </td>
                      <td colSpan={SCHOOL_DAYS.length} className="py-2 text-center text-xs font-black text-slate-700 tracking-wider">
                        🍱 استراحة منتصف النهار / وجبة الغداء
                      </td>
                    </tr>

                    {/* ساعات المساء */}
                    {afternoonSlots.map((t) => (
                      <tr key={t.start} className="border-b border-[#e8e8e0] hover:bg-slate-50/40 transition">
                        <td className="py-3 px-2 bg-[#f7f7f2] border-l border-[#e8e8e0] font-mono text-xs font-black text-gray-800 sticky right-0 z-10 shadow-xs">
                          <div>{t.label}</div>
                          <span className="text-[10px] text-amber-700 font-sans font-bold">مساءً</span>
                        </td>

                        {SCHOOL_DAYS.map((day) => {
                          const isTueRest = isTuesdayAfternoonSlot(day, "afternoon");
                          const s = getSlotFor(day, t.start, t.end);

                          if (isTueRest && !s) {
                            return (
                              <td
                                key={day}
                                onClick={() => handleCellClick(day, t.start, t.end)}
                                className="p-1.5 border-l border-[#e8e8e0] last:border-l-0 align-middle h-20 bg-slate-100/90 text-slate-500 transition cursor-pointer hover:bg-slate-200/70"
                                title="راحة رسمية (مساء الثلاثاء)"
                              >
                                <div className="text-[11px] font-bold text-slate-600 flex flex-col items-center justify-center gap-0.5">
                                  <span>☕</span>
                                  <span>راحة رسمية</span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={day}
                              onClick={() => handleCellClick(day, t.start, t.end)}
                              className="p-1.5 border-l border-[#e8e8e0] last:border-l-0 align-middle h-20 transition cursor-pointer hover:bg-emerald-50/40 relative group"
                            >
                              {s ? (
                                <SlotBadge slot={s} onDelete={(e) => handleQuickDeleteSlot(e, day, t.start, t.end)} />
                              ) : (
                                <EmptySlotHint quickStampClass={quickStampClass} />
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

        {/* ─── دليل الألوان والمفاتيح البيداغوجية ─── */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e8e8e0] shadow-xs print:hidden space-y-2">
          <span className="text-xs font-black text-gray-800 block">دليل الألوان والرموز البيداغوجية:</span>
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block shadow-2xs" />
              <span>درس قسم كامل</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-purple-700 inline-block shadow-2xs" />
              <span>أعمال موجهة (فوج 1)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-600 inline-block shadow-2xs" />
              <span>أعمال موجهة (فوج 2)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-orange-500 inline-block shadow-2xs" />
              <span>حصة استدراك</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-sky-500 inline-block shadow-2xs" />
              <span>ساعة استقبال الأولياء</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-slate-300 inline-block shadow-2xs" />
              <span>استراحة منتصف النهار / راحة الثلاثاء</span>
            </div>
          </div>
        </div>

        {/* ─── Modal إضافة أو تعديل حصة تفاعلي وسهل ─── */}
        {mounted && isSlotModalOpen && createPortal(
          <div className="fixed inset-0 z-[999999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150" dir="rtl">
            <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#e8e8e0] pb-3 shrink-0">
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {editingSlotIndex !== null ? "تعديل بيانات الحصة" : "إضافة حصة إلى جدول التوقيت"}
                  </h3>
                  <p className="text-xs text-emerald-800 font-bold mt-0.5">
                    {selectedDay} • من {selectedStart} إلى {selectedEnd}
                  </p>
                </div>
                <button
                  onClick={() => setIsSlotModalOpen(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSlot} className="space-y-4 flex-1">
                {/* 1. نوع الحصة البيداغوجية */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">
                    طبيعة الحصة البيداغوجية <span className="text-red-500">*</span>:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSessionType("lesson")}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                        selectedSessionType === "lesson"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-2xs font-bold"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>🏛️</span>
                        <span>حصة قسم كامل</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-normal block mt-0.5">درس لجميع تلاميذ الفوج</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSessionType("td")}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                        selectedSessionType === "td"
                          ? "bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/20 shadow-2xs font-bold"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>👥</span>
                        <span>حصة تفويج (TD)</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-normal block mt-0.5">أعمال موجهة (فوج 1 أو 2)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSessionType("remedial")}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                        selectedSessionType === "remedial"
                          ? "bg-orange-50 border-orange-500 text-orange-950 ring-2 ring-orange-500/20 shadow-2xs font-bold"
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
                          ? "bg-sky-50 border-sky-500 text-sky-950 ring-2 ring-sky-500/20 shadow-2xs font-bold"
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

                {/* 2. اختيار الفوج التربوي المباشر (بأزرار واضحة بضغطة واحدة) */}
                {selectedSessionType !== "reception" ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black text-gray-800">
                        الفوج التربوي المعني <span className="text-red-500">*</span>:
                      </label>
                      <span className="text-[11px] text-emerald-800 font-bold">
                        الفوج المختار حالياً: [{selectedClass || "غير محدد"}]
                      </span>
                    </div>

                    {/* شبكة أزرار الأفواج بضغطة واحدة مباشرة */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {customClasses.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedClass(c)}
                          className={`py-2.5 px-2 rounded-xl border text-xs font-black transition cursor-pointer text-center ${
                            selectedClass === c
                              ? "bg-emerald-700 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300"
                              : "bg-white text-gray-800 border-gray-200 hover:bg-emerald-50 hover:border-emerald-300"
                          }`}
                        >
                          فوج {c}
                        </button>
                      ))}
                    </div>

                    {/* إمكانية إضافة فوج جديد فوراً إذا لم يكن موجوداً */}
                    <div className="pt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={newClassInput}
                        onChange={(e) => setNewClassInput(e.target.value)}
                        placeholder="فوج آخر؟ مثال: 3م1"
                        className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs w-36 font-bold focus:outline-none focus:border-emerald-600"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddNewClass(newClassInput);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNewClass(newClassInput)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition cursor-pointer"
                      >
                        + إضافة واعتماد الفوج
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-950 font-bold">
                    🤝 هذه الحصة مخصصة لاستقبال أولياء التلاميذ والرد على استفساراتهم التربوية.
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

                {/* 4. القاعة أو المخبر مع اقتراحات سريعة */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">
                    القاعة / المخبر:
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap pb-1">
                    {["قاعة 01", "قاعة 02", "قاعة 03", "مخبر 01", "مخبر الإعلام الآلي"].map((rm) => (
                      <button
                        key={rm}
                        type="button"
                        onClick={() => setSelectedRoom(rm)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          selectedRoom === rm
                            ? "bg-gray-800 text-white border-gray-800"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {rm}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    placeholder="أو اكتب رقم القاعة يدوياً"
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#e8e8e0] shrink-0">
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
                      className="btn-primary text-xs px-6 py-2 flex items-center gap-1.5 cursor-pointer shadow-md font-black"
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
            <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
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
                        <span className="text-xs font-black text-gray-900">النظام الوطني الشائع 2 (استراحة ساعة واحدة)</span>
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
                          ? "bg-amber-50 border-amber-500 ring-2 ring-amber-500/20"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-950">نظام ولايات الجنوب والوادي (استراحة ساعتان)</span>
                        {presetType === "south_eloued" && <Check className="w-4 h-4 text-amber-700" />}
                      </div>
                      <span className="text-[11px] text-gray-500 block mt-0.5">
                        الصباح: 08:00 - 12:00 | استراحة الغداء: 12:00 - 14:00 (لتفادي الحرارة) | المساء: 14:00 - 17:00
                      </span>
                    </button>
                  </div>
                </div>

                {/* الضبط اليدوي المفصل */}
                <div className="border-t border-[#e8e8e0] pt-4 space-y-3">
                  <span className="text-xs font-black text-gray-800 block">تعديل التوقيت بدقة يدوياً:</span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">بداية الصباح:</label>
                      <input
                        type="time"
                        value={settings.morningStart}
                        onChange={(e) => {
                          setPresetType("custom");
                          setSettings({ ...settings, morningStart: e.target.value });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">عدد حصص الصباح:</label>
                      <select
                        value={settings.morningSlotsCount}
                        onChange={(e) => {
                          setPresetType("custom");
                          setSettings({ ...settings, morningSlotsCount: Number(e.target.value) });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold"
                      >
                        <option value={3}>3 حصص (حتى 11:00)</option>
                        <option value={4}>4 حصص (حتى 12:00)</option>
                        <option value={5}>5 حصص (حتى 13:00)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">بداية الاستراحة:</label>
                      <input
                        type="time"
                        value={settings.breakStart}
                        onChange={(e) => {
                          setPresetType("custom");
                          setSettings({ ...settings, breakStart: e.target.value });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">نهاية الاستراحة:</label>
                      <input
                        type="time"
                        value={settings.breakEnd}
                        onChange={(e) => {
                          setPresetType("custom");
                          setSettings({
                            ...settings,
                            breakEnd: e.target.value,
                            afternoonStart: e.target.value,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">بداية المساء:</label>
                      <input
                        type="time"
                        value={settings.afternoonStart}
                        onChange={(e) => {
                          setPresetType("custom");
                          setSettings({ ...settings, afternoonStart: e.target.value });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">عدد حصص المساء:</label>
                      <select
                        value={settings.afternoonSlotsCount}
                        onChange={(e) => {
                          setPresetType("custom");
                          setSettings({ ...settings, afternoonSlotsCount: Number(e.target.value) });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 text-xs font-bold"
                      >
                        <option value={2}>حصتان (ساعتان)</option>
                        <option value={3}>3 حصص (3 ساعات)</option>
                        <option value={4}>4 حصص (4 ساعات)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.tuesdayAfternoonOff}
                        onChange={(e) => setSettings({ ...settings, tuesdayAfternoonOff: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-gray-800">
                        تظليل مساء الثلاثاء كراحة رسمية (معتمد في المنشورات الوزارية)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e8e8e0] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#e8e8e0] text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5 cursor-pointer shadow-md font-black"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>حفظ واعتماد التوقيت</span>
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

// عنصر عرض الحصة في الخانة
function SlotBadge({
  slot,
  onDelete,
}: {
  slot: TimetableSlot;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const isReception = slot.sessionType === "reception" || slot.className === "استقبال الأولياء";
  const isRemedial = slot.sessionType === "remedial" || slot.className.includes("استدراك");
  const isTD = slot.sessionType === "td" || !!slot.subgroup;

  let bgClass = "bg-emerald-50 border-emerald-300 text-emerald-950";
  if (isReception) bgClass = "bg-sky-50 border-sky-300 text-sky-950";
  else if (isRemedial) bgClass = "bg-orange-50 border-orange-300 text-orange-950";
  else if (isTD) bgClass = "bg-purple-50 border-purple-300 text-purple-950";

  return (
    <div
      className={`w-full h-full min-h-[58px] p-1.5 rounded-xl border ${bgClass} shadow-2xs flex flex-col justify-between text-right relative group/badge transition hover:scale-[1.02]`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-black text-xs leading-tight line-clamp-1">
          {slot.className}
        </span>
        {/* زر مسح فوري بلمسة واحدة */}
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-red-600 transition cursor-pointer shrink-0"
          title="مسح الحصة"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-1 mt-1">
        {slot.subgroup && (
          <span
            className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
              slot.subgroup === "فوج 1"
                ? "bg-purple-700 text-white"
                : slot.subgroup === "فوج 2"
                ? "bg-amber-600 text-white"
                : "bg-gray-900 text-white"
            }`}
          >
            {slot.subgroup}
          </span>
        )}

        {isRemedial && (
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange-600 text-white">
            استدراك
          </span>
        )}

        {isReception && (
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-600 text-white">
            استقبال
          </span>
        )}

        {slot.room && (
          <span className="text-[10px] text-gray-500 font-medium truncate mr-auto">
            {slot.room}
          </span>
        )}
      </div>
    </div>
  );
}

// عنصر تلميح الخانة الفارغة
function EmptySlotHint({ quickStampClass }: { quickStampClass: string | null }) {
  if (quickStampClass) {
    return (
      <div className="w-full h-full min-h-[54px] rounded-xl border border-dashed border-emerald-300 bg-emerald-50/30 flex items-center justify-center text-[11px] font-black text-emerald-800 transition hover:bg-emerald-100/60">
        <span>+ إسناد {quickStampClass}</span>
      </div>
    );
  }
  return (
    <div className="w-full h-full min-h-[54px] rounded-xl border border-dashed border-transparent hover:border-gray-300 hover:bg-gray-50/60 flex items-center justify-center text-[10px] text-gray-300 hover:text-gray-500 transition">
      <span>+ إضافة</span>
    </div>
  );
}
