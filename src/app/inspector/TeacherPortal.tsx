"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Calendar,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileText,
  FileUp,
  FolderLock,
  GraduationCap,
  Info,
  Loader2,
  MapPin,
  Megaphone,
  Paperclip,
  Printer,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { BUCKETS, getPrivateNoteSignedUrl, getPrivateSignedUrl, supabase } from "@/lib/supabase";
import { compressIfImage, safeStorageName, validateUpload } from "@/lib/compress";
import {
  CIRCULAR_IMPORTANCE,
  LEVELS,
  NOTE_STATUS,
  PEDAGOGICAL_DOC_TYPES,
  type InspectorCircular,
  type PedagogicalDocType,
  type PedagogicalNote,
  type UserProfile,
} from "@/lib/types";
import {
  DISTRICTS_INFO,
  formatDate,
  VISIT_TYPES,
  type DistrictData,
  type InspectionVisitRecord,
} from "./shared";

type TeacherSubTab = "circulars" | "seminars" | "documents" | "visits" | "timetable";

const inputCls =
  "w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500";

export function TeacherPortal({
  profile,
  districtId,
  data,
  onReload,
  onSwitchToInspector,
}: {
  profile: UserProfile;
  districtId: number;
  data: DistrictData;
  onReload: () => void;
  onSwitchToInspector?: () => void;
}) {
  const [subTab, setSubTab] = useState<TeacherSubTab>("circulars");
  const [openCircularId, setOpenCircularId] = useState<string | null>(null);
  const [circularFilter, setCircularFilter] = useState<"all" | "unread" | "urgent" | "seminar">("all");
  const [circularQuery, setCircularQuery] = useState("");
  const [readingId, setReadingId] = useState<string | null>(null);

  // استمارة إيداع مذكرة / وثيقة
  const [docType, setDocType] = useState<PedagogicalDocType>("lesson_plan");
  const [level, setLevel] = useState<number>(profile.levels_taught?.[0] || 1);
  const [semester, setSemester] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState("");
  const [field, setField] = useState("");
  const [section, setSection] = useState("");
  const [sessionNumber, setSessionNumber] = useState("");
  const [teacherNotes, setTeacherNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [submittingDoc, setSubmittingDoc] = useState(false);
  const [docMessage, setDocMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // مذكرات هذا الأستاذ
  const myNotes = useMemo(() => {
    return data.notes.filter((n) => n.teacher_id === profile.id);
  }, [data.notes, profile.id]);

  // مناشير موجهة لهذا الأستاذ
  const readsMap = useMemo(() => {
    return Object.fromEntries(data.reads.filter((r) => r.teacher_id === profile.id).map((r) => [r.circular_id, r.read_at]));
  }, [data.reads, profile.id]);

  const myCirculars = useMemo(() => {
    return data.circulars.filter((c) => {
      if (c.target_teacher_id && c.target_teacher_id !== profile.id) return false;
      if (c.target_school_id && c.target_school_id !== profile.middle_school_id) return false;
      return true;
    });
  }, [data.circulars, profile.id, profile.middle_school_id]);

  const unreadCount = useMemo(() => {
    return myCirculars.filter((c) => !readsMap[c.id]).length;
  }, [myCirculars, readsMap]);

  const upcomingSeminars = useMemo(() => {
    return myCirculars
      .filter((c) => c.importance === "seminar" && c.event_date)
      .sort((a, b) => (a.event_date || "").localeCompare(b.event_date || ""));
  }, [myCirculars]);

  // الزيارات المسجلة للأستاذ
  const myVisits = useMemo(() => {
    return data.visits.filter((v) => v.teacherId === profile.id || v.teacherId === "teacher-default");
  }, [data.visits, profile.id]);

  // جدول التوقيت الخاص بالأستاذ
  const myTimetable = useMemo(() => {
    const t = data.teachers.find((t) => t.profile.id === profile.id);
    return t?.timetable || null;
  }, [data.teachers, profile.id]);

  // تسجيل قراءة منشور
  const handleMarkAsRead = async (circularId: string) => {
    if (readsMap[circularId]) return;
    setReadingId(circularId);
    try {
      const { error } = await supabase
        .from("circular_reads")
        .upsert({ circular_id: circularId, teacher_id: profile.id, read_at: new Date().toISOString() });
      if (!error) {
        onReload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReadingId(null);
    }
  };

  // فتح مرفق المنشور
  const openAttachment = async (path?: string | null) => {
    if (!path) return;
    const url = await getPrivateSignedUrl(BUCKETS.INSPECTOR_DOCS, path, 900);
    if (url) window.open(url, "_blank", "noopener");
    else alert("تعذر فتح المرفق أو انتهت صلاحيته");
  };

  // فتح وثيقة بيداغوجية خاصة
  const openNoteFile = async (path?: string) => {
    if (!path) return;
    const url = await getPrivateNoteSignedUrl(path, 900);
    if (url) window.open(url, "_blank", "noopener");
    else alert("تعذر فتح الوثيقة المشفرة أو انتهت صلاحيتها");
  };

  // إرسال وثيقة للمفتش
  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setSubmittingDoc(true);
    setDocMessage(null);
    try {
      const invalid = validateUpload(file);
      if (invalid) throw new Error(invalid);
      const prepared = await compressIfImage(file);
      const storagePath = `${profile.id}/${safeStorageName(prepared.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.PRIVATE_NOTES)
        .upload(storagePath, prepared, { contentType: prepared.type || undefined });
      if (uploadError) throw new Error(uploadError.message);

      const { error: insertError } = await supabase.from("pedagogical_notes").insert({
        teacher_id: profile.id,
        district_id: districtId,
        doc_type: docType,
        level,
        semester,
        lesson_title: title.trim(),
        field: field.trim() || null,
        section: section.trim() || null,
        session_number: sessionNumber ? Number(sessionNumber) : null,
        teacher_notes: teacherNotes.trim() || null,
        file_path: storagePath,
        file_name: file.name,
      });

      if (insertError) {
        await supabase.storage.from(BUCKETS.PRIVATE_NOTES).remove([storagePath]);
        throw new Error(insertError.message);
      }

      setTitle("");
      setField("");
      setSection("");
      setSessionNumber("");
      setTeacherNotes("");
      setFile(null);
      setFileKey((k) => k + 1);
      setDocMessage({
        type: "ok",
        text: "✓ تم إيداع الوثيقة بنجاح لدى مفتشية المقاطعة؛ ستظهر حالة المراجعة هنا فور معاينتها.",
      });
      onReload();
    } catch (err: any) {
      setDocMessage({ type: "err", text: "فشل الإيداع: " + (err?.message || "حدث خطأ غير متوقع") });
    } finally {
      setSubmittingDoc(false);
    }
  };

  // حذف وثيقة (إذا لم تعتمد بعد)
  const handleDeleteDoc = async (note: PedagogicalNote) => {
    if (!confirm(`هل أنت متأكد من سحب الوثيقة "${note.lesson_title || note.lessonTitle}"؟`)) return;
    try {
      const { error } = await supabase.from("pedagogical_notes").delete().eq("id", note.id);
      if (note.file_path || note.filePath) {
        await supabase.storage.from(BUCKETS.PRIVATE_NOTES).remove([note.file_path || note.filePath!]);
      }
      if (!error) onReload();
    } catch (e) {
      console.error(e);
    }
  };

  // فلترة المناشير
  const filteredCirculars = useMemo(() => {
    return myCirculars.filter((c) => {
      const isRead = Boolean(readsMap[c.id]);
      if (circularFilter === "unread" && isRead) return false;
      if (circularFilter === "urgent" && c.importance !== "urgent") return false;
      if (circularFilter === "seminar" && c.importance !== "seminar") return false;
      if (circularQuery.trim()) {
        const q = circularQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.content.toLowerCase().includes(q) ||
          (c.event_place && c.event_place.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [myCirculars, readsMap, circularFilter, circularQuery]);

  return (
    <div className="space-y-5">
      {/* ─── ترويسة فضاء الأستاذ ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <GraduationCap className="w-7 h-7 text-indigo-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200">
                  فضاء الأستاذ والمقاطعة التفتيشية
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                  {profile.teacher_code || "MTH"}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                أهلاً بك، {profile.full_name || "الأستاذ(ة)"}
              </h2>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                {profile.school_custom_name || "المتوسطة"} • {DISTRICTS_INFO[districtId] || "المقاطعة التفتيشية"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            {onSwitchToInspector && (
              <button
                onClick={onSwitchToInspector}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center gap-2 transition"
                title="معاينة لوحة قيادة المفتش"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>معاينة لوحة المفتش</span>
              </button>
            )}
            <button
              onClick={onReload}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* إحصائيات سريعة للأستاذ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="flex items-center justify-between text-indigo-200 text-xs font-medium">
              <span>المناشير والبلاغات</span>
              <Megaphone className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-white">{myCirculars.length}</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                  {unreadCount} غير مقروء
                </span>
              )}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="flex items-center justify-between text-indigo-200 text-xs font-medium">
              <span>الندوات المبرمجة</span>
              <CalendarDays className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-white">{upcomingSeminars.length}</span>
              <span className="text-[10px] text-indigo-200">أيام دراسية</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="flex items-center justify-between text-indigo-200 text-xs font-medium">
              <span>المذكرات المودعة</span>
              <FolderLock className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-white">{myNotes.length}</span>
              <span className="text-[10px] text-emerald-300 font-bold">
                {myNotes.filter((n) => n.status === "reviewed").length} معتمدة
              </span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <div className="flex items-center justify-between text-indigo-200 text-xs font-medium">
              <span>سجل التفتيش</span>
              <ShieldCheck className="w-4 h-4 text-indigo-300" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-white">{myVisits.length}</span>
              <span className="text-[10px] text-indigo-200">زيارات وتوجيهات</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── شريط التبويبات للأستاذ ─── */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto bg-white p-1 rounded-2xl shadow-xs">
        <button
          onClick={() => setSubTab("circulars")}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            subTab === "circulars"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>المناشير والبلاغات الرسمية</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab("seminars")}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            subTab === "seminars"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>الندوات والأيام الدراسية</span>
          {upcomingSeminars.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black">
              {upcomingSeminars.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab("documents")}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            subTab === "documents"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <FileUp className="w-4 h-4" />
          <span>إيداع ومتابعة المذكرات</span>
          {myNotes.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
              {myNotes.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab("visits")}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            subTab === "visits"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>سجل زيارات وتوجيهات التفتيش</span>
          {myVisits.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
              {myVisits.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab("timetable")}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
            subTab === "timetable"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>جدول التوقيت المعتمد</span>
        </button>
      </div>

      {/* ─── محتوى التبويبات ─── */}

      {/* تبويب 1: المناشير والبلاغات */}
      {subTab === "circulars" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(
                [
                  ["all", "كل المناشير"],
                  ["unread", `غير المقروءة (${unreadCount})`],
                  ["urgent", "عاجل وهام"],
                  ["seminar", "ندوات تكوينية"],
                ] as const
              ).map(([filterKey, label]) => (
                <button
                  key={filterKey}
                  onClick={() => setCircularFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    circularFilter === filterKey
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative min-w-56">
              <input
                value={circularQuery}
                onChange={(e) => setCircularQuery(e.target.value)}
                placeholder="بحث في المناشير والبلاغات..."
                className="w-full pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
          </div>

          {filteredCirculars.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
              <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">لا توجد مناشير تطابق هذا الاختيار</p>
              <p className="text-xs text-slate-400">ستظهر هنا المناشير والتعليمات فور صدورها من مفتش المقاطعة.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCirculars.map((c) => {
                const isRead = Boolean(readsMap[c.id]);
                const importance = CIRCULAR_IMPORTANCE[c.importance] ?? CIRCULAR_IMPORTANCE.normal;
                const isOpen = openCircularId === c.id;
                const isReading = readingId === c.id;

                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isRead
                        ? "bg-white border-slate-200 shadow-xs"
                        : "bg-gradient-to-r from-indigo-50/70 to-blue-50/50 border-indigo-300 shadow-sm"
                    }`}
                  >
                    <div
                      onClick={() => setOpenCircularId(isOpen ? null : c.id)}
                      className="p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            c.importance === "urgent"
                              ? "bg-red-100 text-red-600 animate-pulse"
                              : c.importance === "seminar"
                              ? "bg-indigo-100 text-indigo-600"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Megaphone className="w-5 h-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${importance.className}`}
                            >
                              {importance.label}
                            </span>
                            {!isRead && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                                جديد • يتطلب الاطلاع
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500">{formatDate(c.created_at, true)}</span>
                          </div>

                          <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-1 leading-snug">
                            {c.title}
                          </h3>

                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {c.content}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
                            <span>
                              {c.district_id == null
                                ? "🏛️ منشور ولائي عام"
                                : c.target_teacher_id
                                ? "👤 موجه لك خصيصاً"
                                : c.target_school_id
                                ? "🏫 موجه لمتوسطتك"
                                : "👥 لكل أساتذة المقاطعة"}
                            </span>
                            {c.attachment_path && (
                              <span className="text-indigo-600 font-bold flex items-center gap-1">
                                <Paperclip className="w-3.5 h-3.5" /> وثيقة مرفقة
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <ChevronDown
                          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {isOpen && (
                      <div className="px-4 pb-5 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/50">
                        {/* نص المنشور كاملاً */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                          {c.content}
                        </div>

                        {/* معلومات الندوة إن وجدت */}
                        {c.importance === "seminar" && (c.event_date || c.event_place) && (
                          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-950 space-y-1.5">
                            <p className="font-black text-indigo-900 flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-indigo-600" /> موعد ومكان انعقاد الندوة
                            </p>
                            {c.event_date && (
                              <p className="flex items-center gap-1.5 font-bold">
                                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                {new Date(c.event_date).toLocaleString("ar-DZ", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                            {c.event_place && (
                              <p className="flex items-center gap-1.5 font-bold">
                                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                                المتوسطة المستقبلة: {c.event_place}
                              </p>
                            )}
                          </div>
                        )}

                        {/* أزرار الإجراءات: قراءة + تحميل المرفق + طباعة */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="flex items-center gap-2">
                            {!isRead ? (
                              <button
                                disabled={isReading}
                                onClick={() => handleMarkAsRead(c.id)}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
                              >
                                {isReading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                                تأكيد الاطلاع والمصادقة على المنشور ✓
                              </button>
                            ) : (
                              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5">
                                <CheckCheck className="w-4 h-4 text-emerald-600" />
                                تم الاطلاع في {formatDate(readsMap[c.id], true)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {c.attachment_path && (
                              <button
                                onClick={() => openAttachment(c.attachment_path)}
                                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                              >
                                <Download className="w-4 h-4 text-indigo-600" />
                                تنزيل المرفق الرسمي
                              </button>
                            )}
                            <button
                              onClick={() => window.print()}
                              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition"
                            >
                              <Printer className="w-4 h-4" />
                              طباعة
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* تبويب 2: الندوات التربوية والأيام الدراسية */}
      {subTab === "seminars" && (
        <div className="space-y-4">
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3 text-xs text-indigo-900">
            <CalendarDays className="w-5 h-5 text-indigo-600 shrink-0" />
            <p>
              <strong>الندوات البيداغوجية والأيام الدراسية:</strong> محطات تكوينية وتبادل للخبرات ينظمها مفتش المقاطعة
              لمرافقة الأساتذة وتطوير الممارسات الصفية.
            </p>
          </div>

          {upcomingSeminars.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">لا توجد ندوات تربوية مبرمجة حالياً</p>
              <p className="text-xs text-slate-400">ستصلك دعوات الندوات ومحاورها فور جدولتها من طرف المفتشية.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingSeminars.map((sem) => {
                const isRead = Boolean(readsMap[sem.id]);
                return (
                  <div
                    key={sem.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <CalendarDays className="w-5 h-5" />
                        </span>
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                            ندوة تكوينية رسمية
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm mt-1">{sem.title}</h3>
                        </div>
                      </div>
                      {!isRead && (
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                      {sem.content}
                    </p>

                    <div className="space-y-1.5 text-xs text-slate-700 font-medium pt-1">
                      {sem.event_date && (
                        <div className="flex items-center gap-2 text-indigo-900 font-bold">
                          <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>
                            {new Date(sem.event_date).toLocaleString("ar-DZ", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      )}
                      {sem.event_place && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>المقر: {sem.event_place}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                      {!isRead ? (
                        <button
                          onClick={() => handleMarkAsRead(sem.id)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Check className="w-3.5 h-3.5" /> تأكيد الحضور والاستلام
                        </button>
                      ) : (
                        <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                          <CheckCheck className="w-4 h-4 text-emerald-600" /> تم تأكيد الاستلام
                        </span>
                      )}

                      {sem.attachment_path && (
                        <button
                          onClick={() => openAttachment(sem.attachment_path)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-600" /> المرفق
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* تبويب 3: إيداع ومتابعة الوثائق والمذكرات البيداغوجية */}
      {subTab === "documents" && (
        <div className="space-y-6">
          {/* استمارة الإيداع المباشرة */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    إيداع وثيقة بيداغوجية جديدة لفحص السيد المفتش
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    مذكرة نموذجية، توزيع سنوي، نماذج تقويم وفروض، أو دفتر نصوص مشفر ومحمي.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> فضاء آمن وخاص
              </span>
            </div>

            {docMessage && (
              <p
                className={`p-3 rounded-xl text-xs font-bold ${
                  docMessage.type === "ok"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {docMessage.text}
              </p>
            )}

            <form onSubmit={handleUploadDoc} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع الوثيقة</label>
                  <select
                    className={inputCls}
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as PedagogicalDocType)}
                  >
                    {(Object.keys(PEDAGOGICAL_DOC_TYPES) as PedagogicalDocType[]).map((k) => (
                      <option key={k} value={k}>
                        {PEDAGOGICAL_DOC_TYPES[k].icon} {PEDAGOGICAL_DOC_TYPES[k].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المستوى التعليمي</label>
                  <select
                    className={inputCls}
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        السنة {n} متوسط ({n}م)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الفصل الدراسي</label>
                  <select
                    className={inputCls}
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value) as 1 | 2 | 3)}
                  >
                    <option value={1}>الفصل الأول</option>
                    <option value={2}>الفصل الثاني</option>
                    <option value={3}>الفصل الثالث</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان المورد أو الدرس *</label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثلاً: خاصية طاليس والبرهان الهندسي / التوزيع السنوي 2026-2027"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الميدان</label>
                  <input
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    placeholder="أنشطة عددية / أنشطة هندسية / ..."
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">المقطع البيداغوجي</label>
                  <input
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="مثلاً: المقطع 02 — الحساب الحرفي"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الحصة (اختياري)</label>
                  <input
                    type="number"
                    value={sessionNumber}
                    onChange={(e) => setSessionNumber(e.target.value)}
                    placeholder="مثلاً: 03"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">ملاحظات أو استفسار للسيد المفتش (اختياري)</label>
                <textarea
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="يمكنك كتابة تساؤل بيداغوجي، أو الإشارة لنقطة تود رأي المفتش فيها..."
                  className={`${inputCls} min-h-16`}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <label className="flex-1 flex items-center justify-between gap-2 p-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 text-xs text-indigo-900 cursor-pointer hover:bg-indigo-50 transition">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="truncate font-bold">
                      {file ? file.name : "اختر ملف الوثيقة (PDF أو صورة أو Word) *"}
                    </span>
                  </div>
                  {file && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-600 text-white">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                  )}
                  <input
                    key={fileKey}
                    type="file"
                    required
                    accept="application/pdf,image/jpeg,image/png,image/webp,.doc,.docx"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>

                <button
                  type="submit"
                  disabled={submittingDoc || !file || !title.trim()}
                  className="py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 transition"
                >
                  {submittingDoc ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري الضغط والرفع...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      إيداع الوثيقة لدى المفتشية
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* قائمة المذكرات والوثائق المودعة */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-indigo-600" />
              سجل وثائقي المودعة وحالة المعاينة والتثمين ({myNotes.length})
            </h4>

            {myNotes.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                لم تقم بإيداع أي وثائق بيداغوجية بعد. استخدم الاستمارة أعلاه لإرسال مذكراتك للمفتش.
              </div>
            ) : (
              <div className="space-y-3">
                {myNotes.map((note) => {
                  const statusInfo = NOTE_STATUS[note.status] || NOTE_STATUS.submitted;
                  const docInfo = PEDAGOGICAL_DOC_TYPES[note.doc_type || "lesson_plan"] || PEDAGOGICAL_DOC_TYPES.lesson_plan;

                  return (
                    <div
                      key={note.id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0">
                            {docInfo.icon}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusInfo.className}`}>
                                {statusInfo.label}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {docInfo.label}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                                {note.level}م • ف{note.semester}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {formatDate(note.created_at || note.createdAt)}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm mt-1">
                              {note.lesson_title || note.lessonTitle}
                            </h4>
                            {(note.field || note.section) && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {note.field} {note.section ? `• ${note.section}` : ""}{" "}
                                {note.session_number ? `(حصة ${note.session_number})` : ""}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {(note.file_path || note.filePath) && (
                            <button
                              onClick={() => openNoteFile(note.file_path || note.filePath)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                            >
                              <Download className="w-3.5 h-3.5 text-indigo-600" />
                              معاينة الوثيقة
                            </button>
                          )}
                          {note.status === "submitted" && (
                            <button
                              onClick={() => handleDeleteDoc(note)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              title="سحب الوثيقة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ملاحظات الأستاذ */}
                      {(note.teacher_notes || note.teacherNotes) && (
                        <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-600 border border-slate-100">
                          <strong className="text-slate-800">ملاحظتك:</strong> {note.teacher_notes || note.teacherNotes}
                        </div>
                      )}

                      {/* ملاحظات وتوجيهات المفتش */}
                      {(note.inspector_feedback || note.inspectorFeedback) && (
                        <div
                          className={`p-3 rounded-xl text-xs border ${
                            note.status === "reviewed"
                              ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                              : "bg-amber-50/80 border-amber-200 text-amber-950"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold mb-1">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>توجيهات وملاحظات السيد المفتش:</span>
                          </div>
                          <p className="leading-relaxed font-medium">
                            {note.inspector_feedback || note.inspectorFeedback}
                          </p>
                          {(note.reviewed_at || note.reviewedAt) && (
                            <p className="text-[10px] text-slate-500 mt-1">
                              تم الفحص بتاريخ: {formatDate(note.reviewed_at || note.reviewedAt, true)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* تبويب 4: سجل زيارات التفتيش والتوصيات البيداغوجية */}
      {subTab === "visits" && (
        <div className="space-y-4">
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-indigo-900">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <strong>سجل الزيارات والتوجيهات البيداغوجية:</strong>
                <p className="text-indigo-800/80 text-[11px] mt-0.5">
                  أرشيف الزيارات الميدانية والتوصيات الصادرة عن المفتشية لترقية الأداء الصفي والترقية في الرتبة.
                </p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-2xs hover:bg-indigo-50 transition"
            >
              <Printer className="w-4 h-4" /> طباعة السجل
            </button>
          </div>

          {myVisits.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">لا توجد زيارات مسجلة بعد</p>
              <p className="text-xs text-slate-400">ستظهر هنا بطاقات الزيارات والتوصيات فور تسجيلها من طرف المفتشية.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myVisits.map((v) => {
                const visitTypeInfo = VISIT_TYPES[v.visitType] || VISIT_TYPES.followup;
                return (
                  <div
                    key={v.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4 printable-visit"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${visitTypeInfo.badge}`}>
                            {visitTypeInfo.label}
                          </span>
                          <span className="text-xs text-slate-500 font-bold">
                            بتاريخ: {formatDate(v.visitDate)}
                          </span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            القسم: {v.className}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base mt-2">
                          مورد التعلم المعالج: {v.lessonTopic}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          المؤسسة: {v.schoolName} • المشرف: {v.inspectorName || "مفتش المقاطعة"}
                        </p>
                      </div>

                      {v.pedagogicalScore != null && (
                        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-center self-start sm:self-center">
                          <p className="text-[10px] text-emerald-700 font-bold">النقطة التربوية</p>
                          <p className="text-2xl font-black text-emerald-800">{v.pedagogicalScore} / 20</p>
                        </div>
                      )}
                    </div>

                    {/* نقاط القوة والتوصيات */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl space-y-1.5">
                        <h4 className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          نقاط القوة والإشادة البيداغوجية:
                        </h4>
                        <p className="text-xs text-emerald-950 leading-relaxed font-medium">
                          {v.strengths}
                        </p>
                      </div>

                      <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl space-y-1.5">
                        <h4 className="text-xs font-black text-amber-800 flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-amber-600" />
                          التوصيات والتوجيهات البيداغوجية:
                        </h4>
                        <p className="text-xs text-amber-950 leading-relaxed font-medium">
                          {v.recommendations}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                      <span>{visitTypeInfo.desc}</span>
                      <button
                        onClick={() => window.print()}
                        className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" /> طباعة بطاقة الزيارة A4
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* تبويب 5: جدول التوقيت المعتمد */}
      {subTab === "timetable" && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                التوقيت الأسبوعي للأستاذ المعتمد لدى المفتشية
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                يعتمد مفتش المقاطعة هذا الجدول لبرمجة الزيارات التفتيشية وحصص المرافقة البيداغوجية.
              </p>
            </div>
            <Link
              href="/admin/timetable"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition self-start sm:self-auto"
            >
              <Calendar className="w-4 h-4" />
              تعديل وضبط جدول التوقيت
            </Link>
          </div>

          {!myTimetable || myTimetable.slots.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-2 text-xs text-slate-500">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">لم يتم ضبط جدول التوقيت بعد</p>
              <p className="text-slate-400">
                يمكنك إدخال حصصك الأسبوعية والتفويج والاستراحة بضغطة زر من صفحة التوقيت الأسبوعي.
              </p>
              <Link
                href="/admin/timetable"
                className="inline-block mt-2 text-indigo-600 font-bold hover:underline"
              >
                انتقل لإعداد الجدول الأسبوعي الآن ←
              </Link>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                <span>إجمالي الحصص المسجلة: <strong>{myTimetable.slots.length} حصة</strong></span>
                {myTimetable.updated_at && (
                  <span>آخر تحديث: {formatDate(myTimetable.updated_at, true)}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {(["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"] as const).map((day) => {
                  const daySlots = myTimetable.slots
                    .filter((s) => s.day === day)
                    .sort((a, b) => a.start.localeCompare(b.start));

                  return (
                    <div key={day} className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2">
                      <div className="font-black text-xs text-slate-800 pb-1.5 border-b border-slate-200 text-center">
                        {day}
                      </div>

                      {daySlots.length === 0 ? (
                        <p className="text-[10px] text-slate-400 text-center py-4">راحة أو لا توجد حصص</p>
                      ) : (
                        <div className="space-y-1.5">
                          {daySlots.map((slot, i) => (
                            <div
                              key={i}
                              className={`p-2 rounded-xl border text-[11px] font-medium space-y-0.5 ${
                                slot.sessionType === "reception"
                                  ? "bg-purple-50 border-purple-200 text-purple-900"
                                  : slot.sessionType === "remedial"
                                  ? "bg-amber-50 border-amber-200 text-amber-900"
                                  : slot.sessionType === "free"
                                  ? "bg-slate-100 border-slate-200 text-slate-500"
                                  : "bg-white border-slate-200 text-slate-800"
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                                <span>{slot.start} - {slot.end}</span>
                                {slot.room && <span>{slot.room}</span>}
                              </div>
                              <div className="font-bold">{slot.className}</div>
                              {slot.subgroup && (
                                <div className="text-[10px] text-indigo-600 font-bold">
                                  {slot.subgroup}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
