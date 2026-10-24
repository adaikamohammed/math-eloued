"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  School,
  Sliders,
  RotateCcw,
  Printer,
  X,
  Check,
  Trash2,
  Edit2,
  Sparkles,
  Smartphone,
  Coffee,
  Palette,
  Eye,
  FileText,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import {
  TimetableSlot,
  TeacherTimetable,
  TimetableSettings,
  LessonsData,
  StudentRosterItem,
} from "@/lib/types";

// مفاتيح التخزين المحلي لضمان المزامنة الفورية بدون تأخير
const LOCAL_STORAGE_CLASSES_KEYS = ["last_active_classes", "math_custom_classes"];
const LOCAL_STORAGE_TIMETABLE_KEY = "math_teacher_timetable_cache";
const LOCAL_STORAGE_STUDENTS_KEY = "math_teacher_students_cache";

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
  colorMode: "distinct",
  schoolName: "",
  teacherName: "",
  inspectorName: "",
  principalName: "",
  wilayaName: "الوادي",
  subjectName: "الرياضيات",
};

// لوحة ألوان منسقة ومتناغمة لكل فوج لسهولة التمييز البصري
export const CLASS_PALETTE = [
  { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-950", badge: "bg-emerald-700 text-white", lightBadge: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-950", badge: "bg-blue-700 text-white", lightBadge: "bg-blue-100 text-blue-900 border-blue-300" },
  { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-950", badge: "bg-purple-700 text-white", lightBadge: "bg-purple-100 text-purple-900 border-purple-300" },
  { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-950", badge: "bg-amber-700 text-white", lightBadge: "bg-amber-100 text-amber-900 border-amber-300" },
  { bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-950", badge: "bg-rose-700 text-white", lightBadge: "bg-rose-100 text-rose-900 border-rose-300" },
  { bg: "bg-teal-50", border: "border-teal-300", text: "text-teal-950", badge: "bg-teal-700 text-white", lightBadge: "bg-teal-100 text-teal-900 border-teal-300" },
  { bg: "bg-indigo-50", border: "border-indigo-300", text: "text-indigo-950", badge: "bg-indigo-700 text-white", lightBadge: "bg-indigo-100 text-indigo-900 border-indigo-300" },
  { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-950", badge: "bg-orange-700 text-white", lightBadge: "bg-orange-100 text-orange-900 border-orange-300" },
  { bg: "bg-cyan-50", border: "border-cyan-300", text: "text-cyan-950", badge: "bg-cyan-700 text-white", lightBadge: "bg-cyan-100 text-cyan-900 border-cyan-300" },
  { bg: "bg-fuchsia-50", border: "border-fuchsia-300", text: "text-fuchsia-950", badge: "bg-fuchsia-700 text-white", lightBadge: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300" },
  { bg: "bg-lime-50", border: "border-lime-300", text: "text-lime-950", badge: "bg-lime-700 text-white", lightBadge: "bg-lime-100 text-lime-900 border-lime-300" },
  { bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-900", badge: "bg-slate-700 text-white", lightBadge: "bg-slate-200 text-slate-900 border-slate-300" },
];

function getClassColors(
  className: string,
  customClasses: string[],
  colorMode: "distinct" | "unified" = "distinct"
) {
  if (colorMode === "unified") {
    return {
      bg: "bg-emerald-50",
      border: "border-emerald-300",
      text: "text-emerald-950",
      badge: "bg-emerald-700 text-white",
      lightBadge: "bg-emerald-100 text-emerald-900 border-emerald-300",
    };
  }
  const idx = customClasses.indexOf(className);
  if (idx >= 0) {
    return CLASS_PALETTE[idx % CLASS_PALETTE.length];
  }
  let hash = 0;
  for (let i = 0; i < className.length; i++) hash = (hash << 5) - hash + className.charCodeAt(i);
  return CLASS_PALETTE[Math.abs(hash) % CLASS_PALETTE.length];
}

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

  // الأفواج والجدول والإعدادات وقائمة التلاميذ
  const [customClasses, setCustomClasses] = useState<string[]>(DEFAULT_MIDDLE_SCHOOL_CLASSES);
  const [studentRoster, setStudentRoster] = useState<StudentRosterItem[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [settings, setSettings] = useState<TimetableSettings>(DEFAULT_SETTINGS);
  const [officialImagePath, setOfficialImagePath] = useState<string | null>(null);

  // وضع التوزيع السريع (Stamp Mode): عند تفعيل فوج معين، أي نقرة على خانة فارغة تسند الفوج فوراً بضغطة واحدة!
  const [quickStampClass, setQuickStampClass] = useState<string | null>(null);

  // فلترة الأسبوع الدوري (أ / ب أو كل الحصص)
  const [activeWeekFilter, setActiveWeekFilter] = useState<"all" | "week_a" | "week_b">("all");

  // وضع التصفح على الهواتف والشاشات الصغيرة (اختيار يوم محدد أو عرض الكل)
  const [mobileActiveDay, setMobileActiveDay] = useState<string>("all");

  // نافذة تعديل أو إضافة حصة
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<(typeof SCHOOL_DAYS)[number]>("الأحد");
  const [selectedStart, setSelectedStart] = useState("08:00");
  const [selectedEnd, setSelectedEnd] = useState("09:00");
  const [selectedClass, setSelectedClass] = useState("1م1");
  const [selectedSessionType, setSelectedSessionType] = useState<
    "lesson" | "td" | "remedial" | "reception" | "free"
  >("lesson");
  const [selectedSubgroup, setSelectedSubgroup] = useState<"فوج 1" | "فوج 2" | "كامل القسم">("فوج 1");
  const [selectedWeekRotation, setSelectedWeekRotation] = useState<"all" | "week_a" | "week_b">("all");
  const [selectedRoom, setSelectedRoom] = useState("");

  // بيانات حصة الاستدراك (فوج أو أكثر + تحديد أسماء التلاميذ اختيارياً)
  const [selectedRemedialClasses, setSelectedRemedialClasses] = useState<string[]>([]);
  const [selectedRemedialStudents, setSelectedRemedialStudents] = useState<string[]>([]);
  const [showStudentsPicker, setShowStudentsPicker] = useState<boolean>(false);

  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  // نافذة ضبط مواقيت المؤسسة والاستراحة
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [presetType, setPresetType] = useState<string>("national_1");

  // نافذة معاينة وضبط الطباعة الرسمية A4
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printFormData, setPrintFormData] = useState({
    schoolName: "",
    teacherName: "",
    inspectorName: "",
    principalName: "",
    wilayaName: "الوادي",
    subjectName: "الرياضيات",
  });

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

        const storedStudents = localStorage.getItem(LOCAL_STORAGE_STUDENTS_KEY);
        if (storedStudents) {
          try {
            const parsedS = JSON.parse(storedStudents);
            if (Array.isArray(parsedS)) setStudentRoster(parsedS);
          } catch {}
        }

        const storedTimetable = localStorage.getItem(LOCAL_STORAGE_TIMETABLE_KEY);
        if (storedTimetable) {
          const parsed = JSON.parse(storedTimetable);
          if (parsed && Array.isArray(parsed.slots)) setSlots(parsed.slots);
          if (parsed && parsed.settings) {
            setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
            setPrintFormData({
              schoolName: parsed.settings.schoolName || "",
              teacherName: parsed.settings.teacherName || "",
              inspectorName: parsed.settings.inspectorName || "",
              principalName: parsed.settings.principalName || "",
              wilayaName: parsed.settings.wilayaName || "الوادي",
              subjectName: parsed.settings.subjectName || "الرياضيات",
            });
          }
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
          if (Array.isArray(data.studentRoster)) {
            setStudentRoster(data.studentRoster);
          }

          let candidateClasses: string[] = [];
          if (Array.isArray(data.customClasses) && data.customClasses.length > 0) {
            candidateClasses = data.customClasses;
          } else if (Array.isArray(data.studentRoster) && data.studentRoster.length > 0) {
            candidateClasses = Array.from(
              new Set(data.studentRoster.map((s) => s.className).filter(Boolean))
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
              const merged = { ...DEFAULT_SETTINGS, ...data.timetable.settings };
              setSettings(merged);
              setPrintFormData({
                schoolName: merged.schoolName || "",
                teacherName: merged.teacherName || "",
                inspectorName: merged.inspectorName || "",
                principalName: merged.principalName || "",
                wilayaName: merged.wilayaName || "الوادي",
                subjectName: merged.subjectName || "الرياضيات",
              });
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
  const anyModalOpen = isSlotModalOpen || isSettingsModalOpen || isPrintModalOpen;
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

  // تبديل نمط الألوان (ألوان مميزة لكل فوج ⮂ لون موحد)
  const handleToggleColorMode = () => {
    const nextMode: "distinct" | "unified" = settings.colorMode === "unified" ? "distinct" : "unified";
    const updated = { ...settings, colorMode: nextMode };
    setSettings(updated);
    persistTimetable(slots, updated);
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

      const st =
        existing.sessionType ||
        (existing.className === "استقبال الأولياء"
          ? "reception"
          : existing.className === "فراغ"
          ? "free"
          : existing.className.includes("استدراك")
          ? "remedial"
          : existing.subgroup
          ? "td"
          : "lesson");

      setSelectedSessionType(st);
      setSelectedSubgroup((existing.subgroup as "فوج 1" | "فوج 2" | "كامل القسم") || "فوج 1");
      setSelectedWeekRotation(existing.weekRotation || "all");
      setSelectedRoom(existing.room || "");

      if (existing.remedialClasses && existing.remedialClasses.length > 0) {
        setSelectedRemedialClasses(existing.remedialClasses);
      } else {
        setSelectedRemedialClasses(customClasses.slice(0, 1));
      }
      setSelectedRemedialStudents(existing.remedialStudents || []);
      setShowStudentsPicker(Boolean(existing.remedialStudents && existing.remedialStudents.length > 0));

      setEditingSlotIndex(existingIndex);
    } else {
      setSelectedClass(quickStampClass || customClasses[0] || DEFAULT_MIDDLE_SCHOOL_CLASSES[0]);
      setSelectedSessionType("lesson");
      setSelectedSubgroup("فوج 1");
      setSelectedWeekRotation("all");
      setSelectedRoom("");
      setSelectedRemedialClasses(customClasses.slice(0, 1));
      setSelectedRemedialStudents([]);
      setShowStudentsPicker(false);
      setEditingSlotIndex(null);
    }
    setIsSlotModalOpen(true);
  };

  // النقر على خانة في الجدول
  const handleCellClick = (day: (typeof SCHOOL_DAYS)[number], start: string, end: string) => {
    const existingIndex = slots.findIndex(
      (s) => s.day === day && s.start === start && s.end === end
    );

    // التوزيع السريع إذا كان مفعل
    if (quickStampClass && existingIndex === -1) {
      const newSlot: TimetableSlot = {
        day,
        start,
        end,
        className: quickStampClass,
        sessionType: "lesson",
        room: undefined,
      };
      const updated = [...slots, newSlot];
      setSlots(updated);
      persistTimetable(updated);
      return;
    }

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

    if (selectedSessionType === "free") {
      finalClassName = "فراغ";
    } else if (selectedSessionType === "reception") {
      finalClassName = "استقبال الأولياء";
    } else if (selectedSessionType === "remedial") {
      finalClassName =
        selectedRemedialClasses.length > 0
          ? `استدراك (${selectedRemedialClasses.join(" + ")})`
          : "استدراك عام";
    }

    const newSlot: TimetableSlot = {
      day: selectedDay,
      start: selectedStart,
      end: selectedEnd,
      className: finalClassName,
      sessionType: selectedSessionType,
      subgroup: selectedSessionType === "td" ? selectedSubgroup : undefined,
      weekRotation: selectedSessionType === "td" || selectedSessionType === "remedial" ? selectedWeekRotation : undefined,
      room: selectedSessionType !== "free" && selectedRoom.trim() ? selectedRoom.trim() : undefined,
      remedialClasses: selectedSessionType === "remedial" ? selectedRemedialClasses : undefined,
      remedialStudents:
        selectedSessionType === "remedial" && showStudentsPicker ? selectedRemedialStudents : undefined,
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

  // تأكيد بيانات الطباعة وبدء طباعة الصفحة الأفقية
  const handleConfirmPrint = () => {
    const updated = {
      ...settings,
      ...printFormData,
    };
    setSettings(updated);
    persistTimetable(slots, updated);
    setIsPrintModalOpen(false);

    // إطلاق الطباعة بعد تحديث الواجهة
    setTimeout(() => {
      window.print();
    }, 250);
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
    let freeCount = 0;
    let remedialCount = 0;
    let activeTeachingHours = 0;

    slots.forEach((s) => {
      if (s.sessionType === "free" || s.className === "فراغ") {
        freeCount++;
        return;
      }

      if (s.sessionType === "reception" || s.className === "استقبال الأولياء") {
        receptionCount++;
        return;
      }

      if (s.sessionType === "remedial" || s.className.includes("استدراك")) {
        remedialCount++;
        activeTeachingHours++;
        if (s.remedialClasses && Array.isArray(s.remedialClasses)) {
          s.remedialClasses.forEach((rc) => {
            if (summary[rc]) summary[rc].remedial++;
          });
        }
        return;
      }

      activeTeachingHours++;
      const matchedClass = customClasses.find(
        (cls) => s.className === cls || s.className.startsWith(cls) || s.className.includes(`(${cls})`)
      );

      if (matchedClass) {
        if (!summary[matchedClass]) {
          summary[matchedClass] = { total: 0, normal: 0, td: 0, remedial: 0 };
        }
        summary[matchedClass].total++;
        if (s.sessionType === "td") summary[matchedClass].td++;
        else summary[matchedClass].normal++;
      }
    });

    return {
      classesSummary: summary,
      receptionCount,
      freeCount,
      remedialCount,
      activeTeachingHours,
      totalSlots: slots.length,
    };
  }, [slots, customClasses]);

  // التلاميذ المتاحون للأفواج المحددة في نافذة الاستدراك
  const remedialCandidates = useMemo(() => {
    if (selectedRemedialClasses.length === 0) return [];
    return studentRoster.filter((st) => selectedRemedialClasses.includes(st.className));
  }, [studentRoster, selectedRemedialClasses]);

  if (authenticated === false) {
    return <LoginRequired next="/admin/timetable" title="جدول التوقيت الأسبوعي" />;
  }

  const isDaysAsCols = settings.orientation === "days-as-cols";
  const isDistinctColors = settings.colorMode !== "unified";

  return (
    <div className="min-h-screen bg-[#fafaf7] py-4 sm:py-8 px-2 sm:px-6 font-sans" dir="rtl">
      {/* ─────────────────────────────────────────────────────────────
         قواعد الطباعة الرسمية ورقة A4 أفقية (Landscape)
      ───────────────────────────────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>

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
            {/* زر تبديل نمط الألوان */}
            <button
              onClick={handleToggleColorMode}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                isDistinctColors
                  ? "bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
              }`}
              title="تبديل بين تلوين مميز لكل فوج أو لون موحد"
            >
              <Palette className="w-3.5 h-3.5 text-purple-700" />
              <span>{isDistinctColors ? "🎨 ألوان مميزة للأفواج" : "🔘 لون موحد للأفواج"}</span>
            </button>

            {/* زر ضبط مواقيت المؤسسة */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-gray-600" />
              <span>مواقيت الحصص والاستراحة</span>
            </button>

            {/* زر الطباعة الرسمية A4 */}
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-1.5 rounded-xl border border-emerald-600 bg-emerald-700 text-xs font-black text-white hover:bg-emerald-800 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة A4 أفقية رسمية</span>
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
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#e8e8e0] shadow-sm space-y-4 print:hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e8e0] pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-0.5 rounded-full text-xs font-black">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                <span>الموسم الدراسي 2025 / 2026</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-gray-900">
                جدول التوقيت الأسبوعي وتوزيع ساعات التدريس
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                توزيع ساعات التدريس على الأفواج مباشرة. انقر على أي خانة للتعديل، أو اختر فوجاً لتفعيل التوزيع السريع.
              </p>
            </div>

            {/* الحجم الساعي الفعلي للتدريس */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl px-5 py-2.5 text-center">
                <span className="block text-[11px] font-bold text-gray-600">حجم ساعات التدريس</span>
                <span className="text-2xl font-black font-mono text-emerald-900">
                  {classHoursSummary.activeTeachingHours} سا
                </span>
              </div>
            </div>
          </div>

          {/* لوحة توزيع الحصص على الأفواج المسندة بالألوان المميزة */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5">
                <School className="w-4 h-4 text-emerald-700" />
                <span>الأفواج المسندة (انقر على أي فوج لتفعيل التوزيع السريع ⚡):</span>
              </span>
              <span className="text-[11px] text-gray-400">
                (النصاب الرسمي: عادة 18 إلى 20 ساعة أسبوعياً)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {customClasses.map((cls) => {
                const stat = classHoursSummary.classesSummary[cls] || { total: 0, normal: 0, td: 0, remedial: 0 };
                const isSelectedForStamp = quickStampClass === cls;
                const colors = getClassColors(cls, customClasses, settings.colorMode);

                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setQuickStampClass(isSelectedForStamp ? null : cls)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-black transition cursor-pointer flex items-center gap-2 border ${
                      isSelectedForStamp
                        ? `${colors.badge} shadow-md ring-2 ring-emerald-400 scale-105`
                        : `${colors.bg} ${colors.text} ${colors.border} hover:opacity-90`
                    }`}
                    title={isSelectedForStamp ? "انقر لإلغاء وضع التوزيع السريع" : `تفعيل التوزيع السريع لفوج ${cls}`}
                  >
                    <span>فوج {cls}</span>
                    <span
                      className={`font-mono text-xs px-2 py-0.5 rounded-md ${
                        isSelectedForStamp
                          ? "bg-white text-gray-900"
                          : colors.lightBadge
                      }`}
                    >
                      {stat.total} سا
                    </span>
                    {stat.td > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border bg-white/80">
                        {stat.td} تفويج
                      </span>
                    )}
                  </button>
                );
              })}

              {/* استدراك */}
              {classHoursSummary.remedialCount > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5 text-orange-950 font-bold">
                  <span>🛠️ استدراك:</span>
                  <span className="font-mono font-black text-orange-900">
                    {classHoursSummary.remedialCount} سا
                  </span>
                </div>
              )}

              {/* استقبال الأولياء */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5 text-sky-950 font-bold">
                <span>🤝 استقبال الأولياء:</span>
                <span className="font-mono font-black text-sky-900">
                  {classHoursSummary.receptionCount} سا
                </span>
              </div>

              {/* حصص الفراغ */}
              {classHoursSummary.freeCount > 0 && (
                <div className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5 text-slate-700 font-bold">
                  <span>☕ ساعات فراغ:</span>
                  <span className="font-mono font-black text-slate-900">
                    {classHoursSummary.freeCount} سا
                  </span>
                </div>
              )}
            </div>

            {/* شريط وضع التوزيع السريع */}
            {quickStampClass && (
              <div className="bg-emerald-100/90 border border-emerald-300 text-emerald-950 px-4 py-2 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700 animate-bounce" />
                  <span>
                    ⚡ وضع التوزيع السريع مفعل للفوج <strong>[{quickStampClass}]</strong>: انقر على أي خانة فارغة في الجدول لإسنادها بضغطة واحدة!
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

        {/* ─── شريط التحكم البارز في تدوير الجدول وعرض الأسبوع الدوري (أ / ب) ─── */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-3.5 sm:p-4 rounded-3xl border border-emerald-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
          {/* محدد التدوير */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-gray-900 block">
                تدوير شكل الجدول:
              </span>
              <div className="inline-flex p-1 bg-white rounded-xl border border-gray-300 shadow-2xs mt-1">
                <button
                  type="button"
                  onClick={() => handleSetOrientation("days-as-rows")}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    !isDaysAsCols
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "text-gray-700 hover:text-gray-950 hover:bg-gray-100"
                  }`}
                >
                  <span>▤ الأيام كصفوف (أفقي)</span>
                  {!isDaysAsCols && <Check className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSetOrientation("days-as-cols")}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    isDaysAsCols
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "text-gray-700 hover:text-gray-950 hover:bg-gray-100"
                  }`}
                >
                  <span>▥ الأيام كأعمدة (عمودي)</span>
                  {isDaysAsCols && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* محدد التناوب الدوري (الأسبوع أ / الأسبوع ب) */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[11px] font-black text-gray-700 block">معاينة التناوب الدوري:</span>
              <div className="inline-flex p-1 bg-white rounded-xl border border-gray-300 shadow-2xs mt-1">
                <button
                  type="button"
                  onClick={() => setActiveWeekFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeWeekFilter === "all"
                      ? "bg-gray-900 text-white shadow-xs"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  الجدول الشامل
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWeekFilter("week_a")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeWeekFilter === "week_a"
                      ? "bg-purple-700 text-white shadow-xs"
                      : "text-purple-900 hover:bg-purple-50"
                  }`}
                >
                  الأسبوع (أ)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWeekFilter("week_b")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeWeekFilter === "week_b"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-amber-900 hover:bg-amber-50"
                  }`}
                >
                  الأسبوع (ب)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── تصفح الهواتف المحمولة ─── */}
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

        {/* ─── وضع العرض المخصص للهاتف ─── */}
        {mobileActiveDay !== "all" && (
          <div className="block md:hidden space-y-3 print:hidden">
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
                        ? s.sessionType === "free" || s.className === "فراغ"
                          ? "bg-slate-100 border-slate-300"
                          : s.sessionType === "reception"
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
                                    : "bg-teal-700 text-white"
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
                            {(s.sessionType === "free" || s.className === "فراغ") && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-300 text-slate-800">
                                ساعة شاغرة
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
                        <span>+ إضافة حصة هنا</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
           الوثيقة الرسمية للطباعة A4 أفقية (تظهر فقط عند الطباعة)
        ───────────────────────────────────────────────────────────── */}
        <div className="hidden print:block font-sans text-black" dir="rtl">
          {/* الترويسة الوزارية الرسمية */}
          <div className="border-b-2 border-black pb-2 mb-3">
            <div className="text-center font-bold text-xs leading-relaxed mb-1">
              الجمهورية الجزائرية الديمقراطية الشعبية
              <br />
              وزارة التربية الوطنية
            </div>

            <div className="flex items-start justify-between text-[11px] font-bold leading-normal">
              {/* الجهة اليمنى: الإدارة والمؤسسة */}
              <div className="space-y-0.5 w-1/3">
                <div>مديرية التربية لولاية: <strong>{settings.wilayaName || "الوادي"}</strong></div>
                <div>متوسطة: <strong>{settings.schoolName || "......................................."}</strong></div>
                <div>الموسم الدراسي: <strong>2025 / 2026</strong></div>
              </div>

              {/* الوسط: عنوان الوثيقة */}
              <div className="text-center w-1/3">
                <div className="inline-block border-2 border-black px-4 py-1 rounded-lg text-sm font-black tracking-wide bg-gray-100">
                  جدول التوقيت الأسبوعي للأستاذ
                </div>
                <div className="text-[10px] font-bold mt-1 text-gray-700">
                  الحجم الساعي الأسبوعي: <strong>{classHoursSummary.activeTeachingHours} ساعة</strong> تدريس
                </div>
              </div>

              {/* الجهة اليسرى: معلومات الأستاذ والمادة */}
              <div className="space-y-0.5 text-left w-1/3" dir="ltr">
                <div dir="rtl">الأستاذ(ة): <strong>{settings.teacherName || "......................................."}</strong></div>
                <div dir="rtl">المادة: <strong>{settings.subjectName || "الرياضيات"}</strong></div>
                <div dir="rtl">ساعة الاستقبال: <strong>{classHoursSummary.receptionCount > 0 ? "معتمدة بالجدول" : "غير محددة"}</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── شبكة جدول التوقيت التفاعلي (Desktop & Full Grid View & Print) ─── */}
        <div
          className={`bg-white rounded-3xl border border-[#e8e8e0] shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none ${
            mobileActiveDay !== "all" ? "hidden md:block" : "block"
          }`}
        >
          {loading && slots.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-500 space-y-2 print:hidden">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-700" />
              <p>جارٍ تحميل جدول التوقيت الأسبوعي...</p>
            </div>
          ) : (
            <div className="overflow-x-auto relative scrollbar-thin">
              {/* إشعار سحب الجدول للشاشات الصغيرة */}
              <div className="md:hidden bg-amber-50 border-b border-amber-200 px-3 py-1 text-[11px] font-bold text-amber-900 text-center print:hidden">
                👉 يمكنك سحب الجدول أفقياً لتصفح بقية الساعات والأيام
              </div>

              {/* ─────────────────────────────────────────────────────────────
                 الوضع 1: الأيام كصفوف والساعات كأعمدة (الوضع الكلاسيكي الشائع)
              ───────────────────────────────────────────────────────────── */}
              {!isDaysAsCols ? (
                <table className="w-full border-collapse text-center min-w-[900px] print:min-w-full print:border print:border-black">
                  <thead>
                    <tr className="bg-[#fafaf7] border-b border-[#e8e8e0] text-[11px] font-black text-gray-700 print:bg-gray-100 print:border-black print:text-black">
                      <th className="py-2.5 px-3 w-28 border-l border-[#e8e8e0] bg-[#f0f0eb] sticky right-0 z-20 shadow-xs print:static print:border-black print:bg-gray-200">
                        اليوم / التوقيت
                      </th>

                      {/* ساعات الصباح */}
                      {morningSlots.map((t) => (
                        <th key={t.start} className="py-2 px-1 border-l border-[#e8e8e0] print:border-black">
                          <span className="block font-black text-gray-900 print:text-black">{t.label}</span>
                          <span className="text-[10px] text-blue-700 font-bold print:hidden">الفترة الصباحية</span>
                        </th>
                      ))}

                      {/* عمود استراحة منتصف النهار */}
                      <th className="py-2 px-2 w-16 bg-slate-200 text-slate-700 border-l border-[#e8e8e0] font-black text-[11px] print:border-black print:bg-gray-200 print:text-black">
                        <span className="block">استراحة</span>
                        <span className="text-[9px] text-slate-500 font-mono print:text-black">
                          {settings.breakStart} - {settings.breakEnd}
                        </span>
                      </th>

                      {/* ساعات المساء */}
                      {afternoonSlots.map((t) => (
                        <th key={t.start} className="py-2 px-1 border-l border-[#e8e8e0] last:border-l-0 print:border-black">
                          <span className="block font-black text-gray-900 print:text-black">{t.label}</span>
                          <span className="text-[10px] text-amber-700 font-bold print:hidden">الفترة المسائية</span>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {SCHOOL_DAYS.map((day) => (
                      <tr key={day} className="border-b border-[#e8e8e0] hover:bg-slate-50/40 transition print:border-black">
                        {/* عمود اسم اليوم */}
                        <td className="py-3 px-2 font-black text-xs text-gray-900 bg-[#f7f7f2] border-l border-[#e8e8e0] sticky right-0 z-10 shadow-xs print:static print:border-black print:bg-gray-100 print:text-black">
                          {day}
                        </td>

                        {/* خانات الصباح */}
                        {morningSlots.map((t) => {
                          const s = getSlotFor(day, t.start, t.end);
                          return (
                            <td
                              key={t.start}
                              onClick={() => handleCellClick(day, t.start, t.end)}
                              className="p-1 border-l border-[#e8e8e0] align-middle h-16 transition cursor-pointer hover:bg-emerald-50/40 relative group print:border-black print:h-12"
                            >
                              {s ? (
                                <SlotBadge
                                  slot={s}
                                  customClasses={customClasses}
                                  colorMode={settings.colorMode}
                                  onDelete={(e) => handleQuickDeleteSlot(e, day, t.start, t.end)}
                                />
                              ) : (
                                <EmptySlotHint quickStampClass={quickStampClass} />
                              )}
                            </td>
                          );
                        })}

                        {/* خانة استراحة منتصف النهار */}
                        <td className="bg-slate-200/90 text-slate-700 border-l border-slate-300 p-1 text-[11px] font-black select-none print:bg-gray-200 print:border-black print:text-black">
                          <span className="block transform rotate-180 writing-mode-vertical text-[10px] text-slate-500 tracking-wider print:text-black">
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
                                className="p-1 border-l border-[#e8e8e0] last:border-l-0 align-middle h-16 bg-slate-100/90 text-slate-500 transition cursor-pointer hover:bg-slate-200/70 print:border-black print:bg-gray-100 print:text-black print:h-12"
                                title="راحة رسمية (مساء الثلاثاء)"
                              >
                                <div className="text-[10px] font-bold text-slate-600 flex flex-col items-center justify-center gap-0.5 print:text-black">
                                  <span className="print:hidden">☕</span>
                                  <span>راحة رسمية</span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={t.start}
                              onClick={() => handleCellClick(day, t.start, t.end)}
                              className="p-1 border-l border-[#e8e8e0] last:border-l-0 align-middle h-16 transition cursor-pointer hover:bg-emerald-50/40 relative group print:border-black print:h-12"
                            >
                              {s ? (
                                <SlotBadge
                                  slot={s}
                                  customClasses={customClasses}
                                  colorMode={settings.colorMode}
                                  onDelete={(e) => handleQuickDeleteSlot(e, day, t.start, t.end)}
                                />
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
                <table className="w-full border-collapse text-center min-w-[900px] print:min-w-full print:border print:border-black">
                  <thead>
                    <tr className="bg-[#fafaf7] border-b border-[#e8e8e0] text-[11px] font-black text-gray-700 print:bg-gray-100 print:border-black print:text-black">
                      <th className="py-2.5 px-3 w-32 border-l border-[#e8e8e0] bg-[#f0f0eb] sticky right-0 z-20 shadow-xs print:static print:border-black print:bg-gray-200">
                        التوقيت / اليوم
                      </th>
                      {SCHOOL_DAYS.map((day) => (
                        <th key={day} className="py-2 px-3 border-l border-[#e8e8e0] last:border-l-0 font-black text-xs text-gray-900 print:border-black print:text-black">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {/* ساعات الصباح */}
                    {morningSlots.map((t) => (
                      <tr key={t.start} className="border-b border-[#e8e8e0] hover:bg-slate-50/40 transition print:border-black">
                        <td className="py-2 px-2 bg-[#f7f7f2] border-l border-[#e8e8e0] font-mono text-xs font-black text-gray-800 sticky right-0 z-10 shadow-xs print:static print:border-black print:bg-gray-100 print:text-black">
                          <div>{t.label}</div>
                          <span className="text-[10px] text-blue-700 font-sans font-bold print:hidden">صباحاً</span>
                        </td>

                        {SCHOOL_DAYS.map((day) => {
                          const s = getSlotFor(day, t.start, t.end);
                          return (
                            <td
                              key={day}
                              onClick={() => handleCellClick(day, t.start, t.end)}
                              className="p-1 border-l border-[#e8e8e0] last:border-l-0 align-middle h-16 transition cursor-pointer hover:bg-emerald-50/40 relative group print:border-black print:h-12"
                            >
                              {s ? (
                                <SlotBadge
                                  slot={s}
                                  customClasses={customClasses}
                                  colorMode={settings.colorMode}
                                  onDelete={(e) => handleQuickDeleteSlot(e, day, t.start, t.end)}
                                />
                              ) : (
                                <EmptySlotHint quickStampClass={quickStampClass} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* صف استراحة منتصف النهار */}
                    <tr className="bg-slate-200 border-y-2 border-slate-300 print:border-black print:bg-gray-200">
                      <td className="py-1.5 px-2 font-mono text-xs font-black text-slate-700 border-l border-slate-300 sticky right-0 z-10 bg-slate-200 shadow-xs print:static print:border-black print:text-black">
                        {settings.breakStart} - {settings.breakEnd}
                      </td>
                      <td colSpan={SCHOOL_DAYS.length} className="py-1.5 text-center text-xs font-black text-slate-700 tracking-wider print:text-black">
                        🍱 استراحة منتصف النهار / وجبة الغداء
                      </td>
                    </tr>

                    {/* ساعات المساء */}
                    {afternoonSlots.map((t) => (
                      <tr key={t.start} className="border-b border-[#e8e8e0] hover:bg-slate-50/40 transition print:border-black">
                        <td className="py-2 px-2 bg-[#f7f7f2] border-l border-[#e8e8e0] font-mono text-xs font-black text-gray-800 sticky right-0 z-10 shadow-xs print:static print:border-black print:bg-gray-100 print:text-black">
                          <div>{t.label}</div>
                          <span className="text-[10px] text-amber-700 font-sans font-bold print:hidden">مساءً</span>
                        </td>

                        {SCHOOL_DAYS.map((day) => {
                          const isTueRest = isTuesdayAfternoonSlot(day, "afternoon");
                          const s = getSlotFor(day, t.start, t.end);

                          if (isTueRest && !s) {
                            return (
                              <td
                                key={day}
                                onClick={() => handleCellClick(day, t.start, t.end)}
                                className="p-1 border-l border-[#e8e8e0] last:border-l-0 align-middle h-16 bg-slate-100/90 text-slate-500 transition cursor-pointer hover:bg-slate-200/70 print:border-black print:bg-gray-100 print:text-black print:h-12"
                                title="راحة رسمية (مساء الثلاثاء)"
                              >
                                <div className="text-[10px] font-bold text-slate-600 flex flex-col items-center justify-center gap-0.5 print:text-black">
                                  <span className="print:hidden">☕</span>
                                  <span>راحة رسمية</span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={day}
                              onClick={() => handleCellClick(day, t.start, t.end)}
                              className="p-1 border-l border-[#e8e8e0] last:border-l-0 align-middle h-16 transition cursor-pointer hover:bg-emerald-50/40 relative group print:border-black print:h-12"
                            >
                              {s ? (
                                <SlotBadge
                                  slot={s}
                                  customClasses={customClasses}
                                  colorMode={settings.colorMode}
                                  onDelete={(e) => handleQuickDeleteSlot(e, day, t.start, t.end)}
                                />
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

        {/* ─────────────────────────────────────────────────────────────
           التذييل الرسمي للطباعة: مربعات الإمضاءات الثلاثة (A4 Landscape Footer)
        ───────────────────────────────────────────────────────────── */}
        <div className="hidden print:block font-sans text-black mt-4 pt-2 border-t-2 border-black" dir="rtl">
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* 1. توقيع الأستاذ */}
            <div className="border border-black p-2 rounded h-24 flex flex-col justify-between">
              <span className="font-black text-xs">توقيع أستاذ(ة) المادة</span>
              <span className="text-[10px] text-gray-600">بتاريخ: ...............................</span>
            </div>

            {/* 2. تأشيرة مدير المتوسطة */}
            <div className="border border-black p-2 rounded h-24 flex flex-col justify-between">
              <span className="font-black text-xs">توقيع وخاتم السيد مدير المتوسطة</span>
              <span className="text-[10px] text-gray-600">بتاريخ: ...............................</span>
            </div>

            {/* 3. تأشيرة مفتش المادة */}
            <div className="border border-black p-2 rounded h-24 flex flex-col justify-between">
              <span className="font-black text-xs">تأشيرة وخاتم السيد مفتش التعليم المتوسط</span>
              <span className="text-[10px] text-gray-600">بتاريخ: ...............................</span>
            </div>
          </div>
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
              <span className="w-3.5 h-3.5 rounded bg-teal-700 inline-block shadow-2xs" />
              <span>أعمال موجهة (كامل القسم)</span>
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
              <span>حصة فراغ / استراحة</span>
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                      <span className="text-[10px] text-gray-500 font-normal block mt-0.5">معالجة ودعم بيداغوجي</span>
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

                    {/* حصة فراغ */}
                    <button
                      type="button"
                      onClick={() => setSelectedSessionType("free")}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer ${
                        selectedSessionType === "free"
                          ? "bg-slate-200 border-slate-600 text-slate-900 ring-2 ring-slate-400 shadow-2xs font-bold"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Coffee className="w-4 h-4 text-slate-700" />
                        <span>حصة فراغ</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-normal block mt-0.5">ساعة شاغرة (لا تدريس)</span>
                    </button>
                  </div>
                </div>

                {/* 2. اختيار الفوج المعتمد فقط (بدون خيار فوج آخر) */}
                {(selectedSessionType === "lesson" || selectedSessionType === "td") && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black text-gray-800">
                        الفوج التربوي المعني <span className="text-red-500">*</span>:
                      </label>
                      <span className="text-[11px] text-emerald-800 font-bold">
                        الفوج المختار حالياً: [{selectedClass || "غير محدد"}]
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {customClasses.map((c) => {
                        const colors = getClassColors(c, customClasses, settings.colorMode);
                        const isSelected = selectedClass === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setSelectedClass(c)}
                            className={`py-2.5 px-2 rounded-xl border text-xs font-black transition cursor-pointer text-center ${
                              isSelected
                                ? `${colors.badge} shadow-md ring-2 ring-emerald-300 scale-102`
                                : `${colors.bg} ${colors.text} ${colors.border} hover:opacity-90`
                            }`}
                          >
                            فوج {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. في حالة حصة استدراك: تحديد فوج أو أكثر + خيار تحديد أسماء التلاميذ */}
                {selectedSessionType === "remedial" && (
                  <div className="space-y-3 p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-black text-orange-950">
                          حدد الفوج أو الأفواج المعنية بالاستدراك (يمكن اختيار أكثر من فوج) *:
                        </label>
                        <span className="text-[11px] font-bold text-orange-800">
                          {selectedRemedialClasses.length} أفواج محددة
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {customClasses.map((c) => {
                          const isChecked = selectedRemedialClasses.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedRemedialClasses(selectedRemedialClasses.filter((x) => x !== c));
                                } else {
                                  setSelectedRemedialClasses([...selectedRemedialClasses, c]);
                                }
                              }}
                              className={`py-2 px-2 rounded-xl border text-xs font-black transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                                isChecked
                                  ? "bg-orange-600 text-white border-orange-600 shadow-xs"
                                  : "bg-white text-gray-800 border-gray-200 hover:bg-orange-100/50"
                              }`}
                            >
                              <span>فوج {c}</span>
                              {isChecked && <Check className="w-3.5 h-3.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* خيار تحديد أسماء التلاميذ المعنيين */}
                    <div className="border-t border-orange-200 pt-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-orange-950 select-none">
                          <input
                            type="checkbox"
                            checked={showStudentsPicker}
                            onChange={(e) => setShowStudentsPicker(e.target.checked)}
                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <span>تحديد أسماء التلاميذ المعنيين بالاستدراك (اختياري)</span>
                        </label>
                        {showStudentsPicker && selectedRemedialStudents.length > 0 && (
                          <span className="text-[11px] font-black text-orange-900 bg-orange-200 px-2 py-0.5 rounded-full">
                            {selectedRemedialStudents.length} تلاميذ
                          </span>
                        )}
                      </div>

                      {showStudentsPicker && (
                        <div className="bg-white rounded-xl border border-orange-200 p-2 max-h-48 overflow-y-auto space-y-1">
                          {remedialCandidates.length === 0 ? (
                            <p className="text-[11px] text-gray-500 text-center py-2">
                              لم يتم العثور على تلاميذ مسجلين في الأفواج المحددة أعلاه. يمكنك إضافة أسمائهم من صفحة «إدارة الأفواج».
                            </p>
                          ) : (
                            remedialCandidates.map((st) => {
                              const isStSelected = selectedRemedialStudents.includes(st.studentName);
                              return (
                                <div
                                  key={st.id || st.studentName}
                                  onClick={() => {
                                    if (isStSelected) {
                                      setSelectedRemedialStudents(
                                        selectedRemedialStudents.filter((n) => n !== st.studentName)
                                      );
                                    } else {
                                      setSelectedRemedialStudents([...selectedRemedialStudents, st.studentName]);
                                    }
                                  }}
                                  className={`p-1.5 px-2 rounded-lg text-xs flex items-center justify-between cursor-pointer border transition ${
                                    isStSelected
                                      ? "bg-orange-50 border-orange-300 font-black text-orange-950 shadow-2xs"
                                      : "bg-white border-transparent text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isStSelected}
                                      readOnly
                                      className="w-3.5 h-3.5 text-orange-600 rounded pointer-events-none"
                                    />
                                    <span>{st.studentName}</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                      {st.className}
                                    </span>
                                    {st.groupName && (
                                      <span className="text-[10px] text-purple-700 font-medium">
                                        ({st.groupName})
                                      </span>
                                    )}
                                  </div>
                                  {st.isRepeater && (
                                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1 rounded">
                                      معيد
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. في حالة التفويج: خيارات التفويج المعتمدة (فوج 1 أو 2 أو كامل القسم) */}
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
                        onClick={() => setSelectedSubgroup("كامل القسم")}
                        className={`py-2 px-1 rounded-xl border text-xs font-black transition cursor-pointer text-center ${
                          selectedSubgroup === "كامل القسم"
                            ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                            : "bg-white text-teal-900 border-teal-200 hover:bg-teal-50"
                        }`}
                      >
                        🏛️ كامل القسم
                      </button>
                    </div>
                  </div>
                )}

                {/* دورية الأسبوع (التناوب بين أسبوع أ وأسبوع ب) */}
                {(selectedSessionType === "td" || selectedSessionType === "remedial") && (
                  <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <label className="block text-xs font-black text-slate-800">
                      دورية الأسبوع (التناوب):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedWeekRotation("all")}
                        className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                          selectedWeekRotation === "all"
                            ? "bg-gray-900 text-white border-gray-900 shadow-xs"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        دائم (كل أسبوع)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedWeekRotation("week_a")}
                        className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                          selectedWeekRotation === "week_a"
                            ? "bg-purple-700 text-white border-purple-700 shadow-xs"
                            : "bg-white text-purple-900 border-purple-200 hover:bg-purple-50"
                        }`}
                      >
                        الأسبوع (أ) فقط
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedWeekRotation("week_b")}
                        className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                          selectedWeekRotation === "week_b"
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                            : "bg-white text-amber-900 border-amber-200 hover:bg-amber-50"
                        }`}
                      >
                        الأسبوع (ب) فقط
                      </button>
                    </div>
                  </div>
                )}

                {/* توضيحات الفراغ والاستقبال */}
                {selectedSessionType === "free" && (
                  <div className="p-3 rounded-2xl bg-slate-100 border border-slate-300 text-xs text-slate-800 font-bold flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-slate-600" />
                    <span>☕ هذه الساعة شاغرة (فراغ بيداغوجي)، لا يدرس فيها الأستاذ أي قسم.</span>
                  </div>
                )}

                {selectedSessionType === "reception" && (
                  <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-950 font-bold">
                    🤝 هذه الساعة مخصصة رسمياً لاستقبال أولياء التلاميذ والرد على استفساراتهم التربوية.
                  </div>
                )}

                {/* 5. القاعة أو المخبر (اختياري بالكامل) */}
                {selectedSessionType !== "free" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black text-gray-800">
                        القاعة / المخبر (اختياري):
                      </label>
                      {selectedRoom ? (
                        <span className="text-[11px] font-bold text-gray-700">
                          المحددة: [{selectedRoom}]
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500">
                          (بدون قاعة محددة)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pb-1">
                      <button
                        type="button"
                        onClick={() => setSelectedRoom("")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black border transition cursor-pointer ${
                          !selectedRoom
                            ? "bg-slate-800 text-white border-slate-800 shadow-2xs"
                            : "bg-white text-slate-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        🚫 بدون قاعة (لا يوجد)
                      </button>

                      {["قاعة 01", "قاعة 02", "قاعة 03", "مخبر 01", "مخبر الإعلام الآلي"].map((rm) => (
                        <button
                          key={rm}
                          type="button"
                          onClick={() => setSelectedRoom(rm)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            selectedRoom === rm
                              ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
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
                      placeholder="أو اكتب رقم أو اسم القاعة يدوياً (أو اتركها فارغة)"
                      className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                    />
                  </div>
                )}

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

        {/* ─── Modal معاينة وضبط الطباعة الرسمية A4 ─── */}
        {mounted && isPrintModalOpen && createPortal(
          <div className="fixed inset-0 z-[999999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150" dir="rtl">
            <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#e8e8e0] pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">
                      إعدادات طباعة وثيقة التوقيت الأسبوعي الرسمية (A4 أفقي)
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      تخصيص البيانات الرسمية التي تظهر في ترويسة وتذييل الجدول المطبوع
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs font-black text-gray-800 mb-1">
                    اسم الأستاذ(ة):
                  </label>
                  <input
                    type="text"
                    value={printFormData.teacherName}
                    onChange={(e) => setPrintFormData({ ...printFormData, teacherName: e.target.value })}
                    placeholder="مثال: دايخة محمد"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-gray-800 mb-1">
                      اسم المتوسطة:
                    </label>
                    <input
                      type="text"
                      value={printFormData.schoolName}
                      onChange={(e) => setPrintFormData({ ...printFormData, schoolName: e.target.value })}
                      placeholder="مثال: متوسطة الشهيد حمة الأخضر"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-800 mb-1">
                      مديرية التربية لولاية:
                    </label>
                    <input
                      type="text"
                      value={printFormData.wilayaName}
                      onChange={(e) => setPrintFormData({ ...printFormData, wilayaName: e.target.value })}
                      placeholder="مثال: الوادي"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-gray-800 mb-1">
                      مادة التدريس:
                    </label>
                    <input
                      type="text"
                      value={printFormData.subjectName}
                      onChange={(e) => setPrintFormData({ ...printFormData, subjectName: e.target.value })}
                      placeholder="مثال: الرياضيات"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-800 mb-1">
                      السيد المفتش (اختياري):
                    </label>
                    <input
                      type="text"
                      value={printFormData.inspectorName}
                      onChange={(e) => setPrintFormData({ ...printFormData, inspectorName: e.target.value })}
                      placeholder="مفتش المقاطعة"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 font-bold space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-700" />
                    <span>جاهز للطباعة في صفحة A4 أفقية واحدة (Landscape):</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 font-normal">
                    تتضمن الوثيقة الترويسة الوزارية الرسمية، والجدول بتنسيق متناسق، بالإضافة لمربعات الإمضاءات الثلاثة (توقيع الأستاذ، ختم المدير، وتأشيرة المفتش).
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#e8e8e0] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#e8e8e0] text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={handleConfirmPrint}
                  className="btn-primary text-xs px-6 py-2.5 flex items-center gap-2 cursor-pointer shadow-md font-black"
                >
                  <Printer className="w-4 h-4" />
                  <span>بدء الطباعة الرسمية الآن (A4 أفقي)</span>
                </button>
              </div>
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
  customClasses,
  colorMode,
  onDelete,
}: {
  slot: TimetableSlot;
  customClasses: string[];
  colorMode?: "distinct" | "unified";
  onDelete: (e: React.MouseEvent) => void;
}) {
  const isFree = slot.sessionType === "free" || slot.className === "فراغ";
  const isReception = slot.sessionType === "reception" || slot.className === "استقبال الأولياء";
  const isRemedial = slot.sessionType === "remedial" || slot.className.includes("استدراك");
  const isTD = slot.sessionType === "td" || !!slot.subgroup;

  if (isFree) {
    return (
      <div className="w-full h-full min-h-[50px] p-1 rounded-xl border border-slate-300 bg-slate-100/90 text-slate-700 shadow-2xs flex flex-col justify-between text-right relative group/badge transition hover:scale-[1.02] print:border-black print:bg-gray-100 print:text-black">
        <div className="flex items-start justify-between gap-1">
          <span className="font-black text-xs text-slate-800 flex items-center gap-1 print:text-black">
            <span className="print:hidden">☕</span>
            <span>ساعة شاغرة</span>
          </span>
          <button
            type="button"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-red-600 transition cursor-pointer shrink-0 print:hidden"
            title="مسح الحصة"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        <div className="text-[10px] text-slate-500 font-bold print:text-black">
          فراغ (لا تدريس)
        </div>
      </div>
    );
  }

  // حساب الألوان حسب نمط التلوين
  const colors = getClassColors(slot.className, customClasses, colorMode);

  let bgClass = `${colors.bg} ${colors.border} ${colors.text}`;
  if (isReception) bgClass = "bg-sky-50 border-sky-300 text-sky-950";
  else if (isRemedial) bgClass = "bg-orange-50 border-orange-300 text-orange-950";

  return (
    <div
      className={`w-full h-full min-h-[50px] p-1.5 rounded-xl border ${bgClass} shadow-2xs flex flex-col justify-between text-right relative group/badge transition hover:scale-[1.02] print:border-black print:bg-transparent print:text-black print:shadow-none`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-black text-xs leading-tight line-clamp-1 print:text-black">
          {slot.className}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-red-600 transition cursor-pointer shrink-0 print:hidden"
          title="مسح الحصة"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-1 mt-1 flex-wrap">
        {slot.subgroup && (
          <span
            className={`text-[9px] font-black px-1.5 py-0.2 rounded print:border print:border-black print:bg-transparent print:text-black ${
              slot.subgroup === "فوج 1"
                ? "bg-purple-700 text-white"
                : slot.subgroup === "فوج 2"
                ? "bg-amber-600 text-white"
                : "bg-teal-700 text-white"
            }`}
          >
            {slot.subgroup}
          </span>
        )}

        {slot.weekRotation && slot.weekRotation !== "all" && (
          <span className="text-[9px] font-black px-1 rounded bg-gray-800 text-white print:border print:border-black print:text-black print:bg-transparent">
            {slot.weekRotation === "week_a" ? "أسبوع أ" : "أسبوع ب"}
          </span>
        )}

        {isRemedial && (
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-orange-600 text-white print:border print:border-black print:text-black print:bg-transparent">
            استدراك
          </span>
        )}

        {isRemedial && slot.remedialStudents && slot.remedialStudents.length > 0 && (
          <span
            className="text-[9px] font-black px-1 py-0.2 rounded bg-orange-200 text-orange-900 border border-orange-300 truncate print:border-black print:text-black print:bg-transparent"
            title={`التلاميذ المعنيون: ${slot.remedialStudents.join("، ")}`}
          >
            👥 {slot.remedialStudents.length}
          </span>
        )}

        {isReception && (
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-600 text-white print:border print:border-black print:text-black print:bg-transparent">
            استقبال
          </span>
        )}

        {slot.room && slot.room.trim() !== "" && (
          <span className="text-[10px] text-gray-500 font-medium truncate mr-auto print:text-black">
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
      <div className="w-full h-full min-h-[50px] rounded-xl border border-dashed border-emerald-300 bg-emerald-50/30 flex items-center justify-center text-[11px] font-black text-emerald-800 transition hover:bg-emerald-100/60 print:hidden">
        <span>+ إسناد {quickStampClass}</span>
      </div>
    );
  }
  return (
    <div className="w-full h-full min-h-[50px] rounded-xl border border-dashed border-transparent hover:border-gray-300 hover:bg-gray-50/60 flex items-center justify-center text-[10px] text-gray-300 hover:text-gray-500 transition print:hidden">
      <span>+ إضافة</span>
    </div>
  );
}
