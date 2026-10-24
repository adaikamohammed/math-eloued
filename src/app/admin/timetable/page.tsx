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
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  School,
  X,
  Eye,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { PageExplainer } from "@/components/PageExplainer";
import {
  SCHOOL_DAYS,
  TimetableSlot,
  TeacherTimetable,
  LessonsData,
} from "@/lib/types";

// الفترات الزمنية المعتمدة في التعليم المتوسط الجزائري
const TIME_SLOTS = [
  { start: "08:00", end: "09:00", label: "08:00 - 09:00", period: "morning" },
  { start: "09:00", end: "10:00", label: "09:00 - 10:00", period: "morning" },
  { start: "10:00", end: "11:00", label: "10:00 - 11:00", period: "morning" },
  { start: "11:00", end: "12:00", label: "11:00 - 12:00", period: "morning" },
  { start: "13:30", end: "14:30", label: "13:30 - 14:30", period: "afternoon" },
  { start: "14:30", end: "15:30", label: "14:30 - 15:30", period: "afternoon" },
  { start: "15:30", end: "16:30", label: "15:30 - 16:30", period: "afternoon" },
];

export default function TeacherTimetablePage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [officialImagePath, setOfficialImagePath] = useState<string | null>(null);

  // نافذة تعديل أو إضافة حصة
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<(typeof SCHOOL_DAYS)[number]>("الأحد");
  const [selectedStart, setSelectedStart] = useState("08:00");
  const [selectedEnd, setSelectedEnd] = useState("09:00");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("قاعة 01");
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // التحقق من الجلسة
  useEffect(() => {
    setMounted(true);
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => {
        setAuthenticated(data.authenticated === true);
      })
      .catch(() => setAuthenticated(false));
  }, []);

  // قفل تمرير الصفحة أثناء فتح النافذة المنبثقة
  useEffect(() => {
    if (isSlotModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isSlotModalOpen]);

  // تحميل البيانات
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/lessons");
      if (!res.ok) throw new Error("تعذر تحميل جدول التوقيت");
      const data: LessonsData = await res.json();

      const teacherClasses = Array.isArray(data.customClasses) && data.customClasses.length > 0
        ? data.customClasses
        : [];
      setCustomClasses(teacherClasses);

      if (data.timetable && Array.isArray(data.timetable.slots)) {
        setSlots(data.timetable.slots);
        setOfficialImagePath(data.timetable.image_path || null);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "err", text: err.message || "حدث خطأ أثناء تحميل جدول التوقيت" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadData();
    }
  }, [authenticated, loadData]);

  // حفظ التعديلات
  const persistTimetable = async (newSlots: TimetableSlot[], imagePath = officialImagePath) => {
    setSaving(true);
    try {
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timetable: {
            teacher_id: "current",
            slots: newSlots,
            image_path: imagePath,
            updated_at: new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) throw new Error("فشل حفظ التوقيت");
      setMessage({ type: "ok", text: "تم تحديث جدول التوقيت الأسبوعي بنجاح 🗓️" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "err", text: err.message || "فشل حفظ جدول التوقيت" });
    } finally {
      setSaving(false);
    }
  };

  // فتح نافذة لحصة محددة
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
      setSelectedRoom(existing.room || "قاعة 01");
      setEditingSlotIndex(existingIndex);
    } else {
      setSelectedClass(customClasses[0] || "");
      setSelectedRoom("قاعة 01");
      setEditingSlotIndex(null);
    }
    setIsSlotModalOpen(true);
  };

  // حفظ الحصة
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    let updated: TimetableSlot[];

    const newSlot: TimetableSlot = {
      day: selectedDay,
      start: selectedStart,
      end: selectedEnd,
      className: selectedClass,
      room: selectedRoom.trim() || undefined,
    };

    if (editingSlotIndex !== null) {
      updated = slots.map((s, idx) => (idx === editingSlotIndex ? newSlot : s));
    } else {
      // إزالة أي تعارض سابق في نفس اليوم والوقت
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

  // البحث عن الحصة في الشبكة
  const getSlotFor = (day: (typeof SCHOOL_DAYS)[number], start: string, end: string) => {
    return slots.find((s) => s.day === day && s.start === start && s.end === end);
  };

  // إحصائيات الحصص
  const totalWeeklyHours = slots.length;

  if (authenticated === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#107a57]" />
      </div>
    );
  }

  if (authenticated === false) {
    return <LoginRequired next="/admin/timetable" title="جدول التوقيت الأسبوعي" />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] py-6 sm:py-8 px-4 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* شريط المسار والتنقل */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <Link href="/admin" className="hover:text-gray-900 transition flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              لوحة الأستاذ
            </Link>
            <span>/</span>
            <span className="text-gray-900">جدول التوقيت الأسبوعي</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl border border-[#e8e8e0] bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" />
              <span>طباعة التوقيت الرسمي</span>
            </button>
            <Link
              href="/admin/students"
              className="px-3.5 py-1.5 rounded-xl border border-[#e8e8e0] bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-[#107a57]" />
              <span>إدارة الأفواج والتلاميذ</span>
            </Link>
          </div>
        </div>

        {/* دليل الصفحة البيداغوجي */}
        <div className="print:hidden">
          <PageExplainer
            pageId="timetable"
            title="التوقيت الأسبوعي وساعة الاستقبال"
            teacherRoleExplanation="اضغط على أي خانة فارغة في الشبكة لتعيين حصة الفوج والقاعة وساعة الاستقبال الرسمية، مع إمكانية طباعة جدول ورقي مطابق للمقاييس التربوية الرسمية."
            parentRoleExplanation="يظهر للولي توقيت حصص ابنه مع توضيح ساعة استقبالك المعتمدة لتجنب إحراج الزيارات المفاجئة."
            inspectorExplanation="يمكّن المفتشية من مطابقة النصاب الساعي الأسبوعي للأستاذ ومعاينة توزيع الحصص والقاعات."
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

        {/* ترويسة الصفحة الرسمية للطباعة والمعاينة */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e8e8e0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 px-3 py-0.5 rounded-full text-xs font-bold print:hidden">
              <Calendar className="w-3.5 h-3.5" />
              <span>الموسم الدراسي 2025 / 2026</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              جدول التوقيت الأسبوعي للأستاذ
            </h1>
            <p className="text-xs text-gray-600 font-medium">
              توزيع الحصص الأسبوعية، القاعات، وساعات الاستقبال الرسمية للأولياء. انقر على أي خانة للتعديل.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#fafaf7] border border-[#e8e8e0] rounded-2xl px-4 py-2 text-center">
              <span className="block text-[10px] font-bold text-gray-500">الحجم الساعي الأسبوعي</span>
              <span className="text-xl font-black font-mono text-[#107a57]">{totalWeeklyHours} سا</span>
            </div>
          </div>
        </div>

        {/* شبكة جدول التوقيت التفاعلي */}
        <div className="bg-white rounded-3xl border border-[#e8e8e0] shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-xs text-gray-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#107a57]" />
              <p>جارٍ تحميل جدول التوقيت...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="bg-[#fafaf7] border-b border-[#e8e8e0] text-[11px] font-black text-gray-700">
                    <th className="py-3 px-3 w-28 border-l border-[#e8e8e0]">اليوم / التوقيت</th>
                    {TIME_SLOTS.map((t) => (
                      <th key={t.start} className="py-3 px-2 border-l border-[#e8e8e0] last:border-l-0">
                        <span className="block">{t.label}</span>
                        <span className="text-[9px] font-normal text-gray-400">
                          {t.period === "morning" ? "صباحاً" : "مساءً"}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e0] text-xs">
                  {SCHOOL_DAYS.map((day) => (
                    <tr key={day} className="hover:bg-gray-50/50 transition">
                      {/* اسم اليوم */}
                      <td className="py-3 px-3 font-black text-gray-900 bg-[#fafaf7]/50 border-l border-[#e8e8e0]">
                        {day}
                      </td>

                      {/* خانات الحصص */}
                      {TIME_SLOTS.map((slotTime) => {
                        const slot = getSlotFor(day, slotTime.start, slotTime.end);
                        return (
                          <td
                            key={slotTime.start}
                            onClick={() => handleOpenCell(day, slotTime.start, slotTime.end)}
                            className={`p-2 border-l border-[#e8e8e0] last:border-l-0 transition cursor-pointer relative group h-20 min-w-[100px] ${
                              slot
                                ? "bg-emerald-50/60 hover:bg-emerald-100/70"
                                : "hover:bg-gray-100/80"
                            }`}
                          >
                            {slot ? (
                              <div className="h-full flex flex-col justify-between text-right p-1 rounded-xl bg-white/90 border border-emerald-200/80 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-xs text-[#107a57]">
                                    {slot.className}
                                  </span>
                                  {slot.room && (
                                    <span className="text-[10px] text-gray-500 font-mono">
                                      {slot.room}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] text-gray-400 font-mono">
                                  {slot.start} - {slot.end}
                                </span>
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
            </div>
          )}
        </div>

        {/* قسم رفع صورة التوقيت الرسمي المعتمد من الإدارة */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e8e8e0] shadow-sm space-y-4 print:hidden">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#107a57]" />
                <span>نسخة التوقيت الأسبوعي الرسمية (صورة أو وثيقة)</span>
              </h3>
              <p className="text-xs text-gray-500">
                يمكنك رفع صورة لجدول التوقيت المطبوع والمختوم من إدارة المؤسسة لحفظه والرجوع إليه.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#fafaf7] border border-dashed border-[#e8e8e0] text-center space-y-3">
            {officialImagePath ? (
              <div className="space-y-2">
                <img
                  src={officialImagePath}
                  alt="التوقيت الأسبوعي الرسمي"
                  className="max-h-64 mx-auto rounded-xl border border-[#e8e8e0] shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setOfficialImagePath(null);
                    persistTimetable(slots, null);
                  }}
                  className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                >
                  حذف الصورة
                </button>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <Upload className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs text-gray-600 font-bold">
                  جدول التوقيت التفاعلي في الأعلى يكفي تماماً للتنظيم والطباعة الرسمية
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Modal تعيين الحصة ─── */}
        {mounted && isSlotModalOpen && createPortal(
          <div className="fixed inset-0 z-[999999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150" dir="rtl">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#e8e8e0] pb-3 shrink-0">
                <h3 className="text-base font-black text-gray-900">
                  {editingSlotIndex !== null ? "تعديل الحصة" : "إضافة حصة دراسية"}
                </h3>
                <button
                  onClick={() => setIsSlotModalOpen(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSlot} className="space-y-4">
                <div className="p-3 rounded-2xl bg-[#fafaf7] border border-[#e8e8e0] flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>اليوم: {selectedDay}</span>
                  <span className="font-mono text-[#107a57]">
                    {selectedStart} ← {selectedEnd}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">
                    الفوج التربوي / النشاط <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
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
                    <option value="استقبال الأولياء">استقبال الأولياء 🤝</option>
                    <option value="أعمال موجهة (ف1)">أعمال موجهة (فوج 1)</option>
                    <option value="أعمال موجهة (ف2)">أعمال موجهة (فوج 2)</option>
                    <option value="حصة استدراك">حصة استدراك / دعم</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">القاعة / المخبر</label>
                  <input
                    type="text"
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    placeholder="مثال: قاعة 04 أو مخبر 2"
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#e8e8e0]">
                  {editingSlotIndex !== null ? (
                    <button
                      type="button"
                      onClick={handleDeleteSlot}
                      className="text-xs font-bold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-xl transition"
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
                      className="px-3.5 py-2 rounded-xl border border-[#e8e8e0] text-xs font-bold text-gray-600 hover:bg-gray-100"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>حفظ</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
