"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useTeacherId, withTeacher, teacherHomeHref, useTeacherInfo, teacherLabel } from "@/lib/teacherParam";
import { supabase } from "@/lib/supabase";
import { PUBLIC_TEACHER_COLUMNS } from "@/lib/teachers";
import type { ParentSummons, UserProfile } from "@/lib/types";
import {
  ArrowRight,
  Users,
  Clock,
  Calendar,
  Search,
  CheckCircle2,
  Sparkles,
  HeartHandshake,
  MapPin,
  MessageCircle,
  ArrowLeft,
  Mail,
  Lock,
  KeyRound,
  ShieldCheck,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  HelpCircle,
  Printer,
} from "lucide-react";
import { Loading } from "@/components/ui";
import { PrintModal } from "@/components/print/PrintModal";
import { ParentSummonsPrintDoc } from "@/components/print/ParentSummonsPrintDoc";

export default function ParentsPage() {
  const teacherId = useTeacherId();
  const teacherInfo = useTeacherInfo(teacherId);
  const [teacherProfile, setTeacherProfile] = useState<UserProfile | null>(null);
  const [selectedSummonsForPrint, setSelectedSummonsForPrint] = useState<ParentSummons | null>(null);

  // هل المستخدم الحالي هو الأستاذ صاحب الحساب؟
  const [isOwner, setIsOwner] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // بيانات استدعاءات الأستاذ (تظهر له وحده للإدارة)
  const [teacherSummons, setTeacherSummons] = useState<ParentSummons[]>([]);
  const [loadingSummons, setLoadingSummons] = useState(false);

  // استعلام الولي عبر الرمز السري الخاص (PIN)
  const [inputCode, setInputCode] = useState("");
  const [inputStudentName, setInputStudentName] = useState("");
  const [searchingCode, setSearchingCode] = useState(false);
  const [parentResult, setParentResult] = useState<ParentSummons | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  // استمارة إضافة استدعاء جديد من قبل الأستاذ
  const [newStudentName, setNewStudentName] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newIsUrgent, setNewIsUrgent] = useState(false);
  const [savingSummons, setSavingSummons] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [urlLvl, setUrlLvl] = useState<string | null>(null);

  // استخراج المستوى من الرابط إن وُجد
  useEffect(() => {
    if (typeof window !== "undefined") {
      const lvl = new URLSearchParams(window.location.search).get("lvl");
      if (lvl) setUrlLvl(lvl);
    }
  }, []);

  // التحقق من هوية المستخدم الحالية (أستاذ مالك أم ولي/زائر)
  useEffect(() => {
    fetch("/api/auth")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated && d.profile) {
          // إذا لم يحدد أستاذ في الرابط أو كان معرفه مطابقاً للجلسة
          if (!teacherId || d.profile.id === teacherId) {
            setIsOwner(true);
            fetchTeacherSummons();
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAuth(false));
  }, [teacherId]);

  // جلب الملف العام للأستاذ لمعرفة ساعة الاستقبال المعتمدة
  useEffect(() => {
    if (!teacherId) return;
    supabase
      .from("profiles")
      .select(PUBLIC_TEACHER_COLUMNS)
      .eq("id", teacherId)
      .maybeSingle()
      .then(({ data }) => setTeacherProfile((data as UserProfile) ?? null));
  }, [teacherId]);

  // جلب قائمة الاستدعاءات الكاملة للأستاذ المالك
  const fetchTeacherSummons = async () => {
    setLoadingSummons(true);
    try {
      const res = await fetch(withTeacher(`/api/summons?_t=${Date.now()}`), { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data.summons)) {
        setTeacherSummons(data.summons);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSummons(false);
    }
  };

  // استعلام الولي بالرمز السري
  const handleParentSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) return;

    setSearchingCode(true);
    setSearchAttempted(true);
    setParentResult(null);
    setRateLimitMessage(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.set("code", cleanCode);
      if (inputStudentName.trim()) {
        queryParams.set("student", inputStudentName.trim());
      }
      queryParams.set("_t", Date.now().toString());

      const url = withTeacher(`/api/summons?${queryParams.toString()}`);
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (res.status === 429 || data.rateLimited) {
        setRateLimitMessage(data.error || "تم حظر محاولات الاستعلام مؤقتاً لحماية الأمان. يرجى المحاولة بعد 15 دقيقة.");
        setParentResult(null);
        return;
      }

      if (Array.isArray(data.summons) && data.summons.length > 0) {
        setParentResult(data.summons[0]);
      } else {
        setParentResult(null);
      }
    } catch (err) {
      console.error(err);
      setParentResult(null);
    } finally {
      setSearchingCode(false);
    }
  };

  // إضافة استدعاء جديد من الأستاذ
  const handleCreateSummons = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newClassName.trim()) {
      setMessage({ type: "err", text: "يرجى كتابة اسم التلميذ وتحديد القسم" });
      return;
    }

    setSavingSummons(true);
    try {
      const res = await fetch("/api/summons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: newStudentName.trim(),
          className: newClassName.trim(),
          notes: newNotes.trim() || undefined,
          isUrgent: newIsUrgent,
        }),
      });

      if (!res.ok) throw new Error("فشل تسجيل الاستدعاء");
      const data = await res.json();

      setMessage({ type: "ok", text: `تم إنشاء الاستدعاء بنجاح! الرمز السري هو: ${data.summons?.accessCode || ""}` });
      setNewStudentName("");
      setNewNotes("");
      setNewIsUrgent(false);
      setShowAddForm(false);
      await fetchTeacherSummons();
    } catch (err: any) {
      setMessage({ type: "err", text: err.message || "حدث خطأ أثناء الحفظ" });
    } finally {
      setSavingSummons(false);
    }
  };

  // حذف استدعاء من قبل الأستاذ
  const handleDeleteSummons = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف استدعاء التلميذ "${name}"؟`)) return;
    try {
      const res = await fetch(`/api/summons?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل الحذف");
      setTeacherSummons((prev) => prev.filter((s) => s.id !== id));
      setMessage({ type: "ok", text: "تم حذف الاستدعاء بنجاح" });
    } catch (err: any) {
      setMessage({ type: "err", text: err.message || "تعذر الحذف" });
    }
  };

  // نسخ الرمز السري بنقرة واحدة
  const handleCopyCode = (id: string, code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const reception = teacherProfile?.reception;
  const backHref = teacherHomeHref(teacherId) + (urlLvl ? `?lvl=${urlLvl}` : "");

  return (
    <div className="pb-16 pt-3 fade-up space-y-5 max-w-3xl mx-auto px-4 font-sans text-right" dir="rtl">
      {/* ── رأس الصفحة وزر الرجوع ── */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-sky-100 shadow-2xs">
        <Link
          href={backHref}
          className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 hover:bg-sky-100 active:scale-95 transition shrink-0"
          aria-label="الرجوع"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-base font-black text-slate-900 truncate">
              استقبال وتشاور الأولياء
            </h1>
            <span className="text-[11px] bg-sky-100 text-sky-800 font-black px-2.5 py-0.5 rounded-full border border-sky-200">
              مرافقة لصالح التلميذ 🤝
            </span>
            {urlLvl && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                السنة {urlLvl} متوسط
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-bold truncate">
            {teacherLabel(teacherInfo)} {teacherProfile?.school_custom_name ? `— ${teacherProfile.school_custom_name}` : ""}
          </p>
        </div>
      </div>

      {/* ── تنبيهات الرسائل ── */}
      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in duration-200 ${
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

      {/* ── بنر توضيحي لطيف ومطمئن للأولياء ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-sky-700 via-blue-700 to-teal-800 rounded-3xl p-5 text-white shadow-md shadow-sky-600/15 border border-sky-400/30 space-y-3">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-black text-white">
              أهلاً بكم.. فضاء التشاور والتنسيق لمصلحة أبنائكم
            </h2>
            <p className="text-xs text-sky-50 leading-relaxed font-medium">
              «التواصل والتشاور مع الأستاذ ليس إجراءً عقابياً، بل حرص تربوي مشترك للوقوف على كراس الدروس ومعالجة أي صعوبة في حينها لضمان تفوق التلميذ وسلامة مساره التعليمي.»
            </p>
          </div>
        </div>
      </div>

      {/* ── بطاقة مواعيد الاستقبال المعتمدة في المؤسسة (عامة للجميع) ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2 text-xs font-black text-slate-900 border-b border-slate-100 pb-2.5">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>مواعيد استقبال وتشاور الأستاذ في المؤسسة:</span>
        </div>

        {reception?.officialDay ? (
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            {/* الموعد الرسمي المعتمد */}
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 space-y-1.5">
              <div className="flex items-center justify-between text-emerald-800 font-black text-[11px]">
                <span>🗓️ ساعة الاستقبال الرسمية المعتمدة</span>
                <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px]">أسبوعياً</span>
              </div>
              <div className="font-black text-slate-900 text-sm">كل يوم {reception.officialDay}</div>
              <div className="text-slate-700 font-bold text-xs">
                {reception.officialTime || "خلال أوقات الدوام الرسمي"}
              </div>
              {reception.location && (
                <div className="text-[11px] text-slate-600 font-medium pt-2 border-t border-emerald-200/60 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>المكان: <strong>{reception.location}</strong></span>
                </div>
              )}
            </div>

            {/* الموعد الإضافي إن وجد، أو توجيه الأستاذ */}
            {reception.extraDay ? (
              <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-100 space-y-1.5">
                <div className="flex items-center justify-between text-sky-800 font-black text-[11px]">
                  <span>⏰ توقيت إضافي (مبادرة من الأستاذ)</span>
                  <span className="bg-sky-600 text-white px-2 py-0.5 rounded text-[10px]">اختياري</span>
                </div>
                <div className="font-black text-slate-900 text-sm">يوم {reception.extraDay}</div>
                <div className="text-slate-700 font-bold text-xs">{reception.extraTime || "حسب الاتفاق"}</div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  (توقيت إضافي مرن للتشاور مع الحالات الخاصة)
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center text-right space-y-1">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <span>💡</span>
                  <span>توجيه الأستاذ للأولياء:</span>
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  {reception.guidance || "يُرجى إحضار كراس التلميذ ودفتر المتابعة عند الحضور لضمان فائدة اللقاء وتحقيق الهدف التربوي المنشود."}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-1.5">
            <p className="text-xs font-black text-slate-800">لم يحدد الأستاذ موعد استقبال رسمي بعد</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              يمكنكم التواصل مباشرة عبر صندوق الرسائل السرية للأستاذ أو عبر إدارة المؤسسة.
            </p>
          </div>
        )}

        {/* بطاقة توجيه لرسالة سرية للأستاذ */}
        <Link
          href={`/messages${teacherId ? `?teacher=${teacherId}` : ""}${urlLvl ? `&lvl=${urlLvl}` : ""}`}
          className="flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-slate-50 border border-purple-200/80 rounded-2xl hover:border-purple-300 hover:shadow-xs transition group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                <span>توجيه رسالة خاصة وسرية للأستاذ 🔒</span>
                <span className="text-[10px] font-bold bg-purple-200/70 text-purple-900 px-2 py-0.5 rounded-full">
                  صندوق الصراحة والشفافية
                </span>
              </span>
              <p className="text-[11px] text-purple-800/80 font-medium">
                إذا تعذر الحضور لموعد الاستقبال، يمكنكم إرسال أي استفسار أو ملاحظة حول التلميذ مباشرة وبسرية تامة.
              </p>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 text-purple-600 group-hover:-translate-x-1 transition shrink-0 mr-2" />
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          بوابة الاستعلام الخاصة بولي الأمر (بالرمز السري PIN)
          وفقاً للقانون الجزائري 18-07 وقانون حماية الطفل 15-12
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-emerald-100 pb-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <span>الاستعلام عن استدعاء أو توجيه خاص بابنك</span>
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                بسرية تامة 🔒
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              حفاظاً على كرامة وخصوصية التلاميذ، تُحجب بيانات الاستدعاءات علناً، وتتاح فقط لولي الأمر بالرمز السري.
            </p>
          </div>
        </div>

        <form onSubmit={handleParentSearch} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-[11px] font-black text-slate-700">
                الرمز السري للاستدعاء (4 أرقام من الأستاذ أو كراس التلميذ) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="مثال: 4819"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-sm font-black text-center tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700">
                اسم أو لقب التلميذ (اختياري للتحقق)
              </label>
              <input
                type="text"
                placeholder="اسم التلميذ..."
                value={inputStudentName}
                onChange={(e) => setInputStudentName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={searchingCode || !inputCode.trim()}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {searchingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>التحقق وعرض الاستدعاء والتوجيه</span>
          </button>
        </form>

        {/* نتيجة الاستعلام للولي */}
        {searchAttempted && (
          <div className="pt-3 border-t border-slate-100 animate-in fade-in duration-200">
            {parentResult ? (
              <div className="bg-emerald-50/80 rounded-2xl p-4 sm:p-5 border border-emerald-300 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-emerald-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base text-slate-900">{parentResult.studentName}</span>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-white text-emerald-900 border border-emerald-200">
                      قسم {parentResult.className}
                    </span>
                    {parentResult.isUrgent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                        مستعجل ⚠️
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-xl border border-emerald-200">
                    🗓️ موعد الاستقبال: كل {reception?.officialDay || "أسبوع"} {reception?.officialTime ? `(${reception.officialTime})` : ""}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-black text-emerald-950 block">
                    📌 رسالة وتوجيه الأستاذ لولي الأمر لصالح التلميذ:
                  </span>
                  <p className="text-xs text-slate-800 font-bold whitespace-pre-line leading-relaxed bg-white p-3.5 rounded-xl border border-emerald-200">
                    {parentResult.notes || "يُرجى الحضور في ساعة الاستقبال لمناقشة كراس المحاولات ومستوى التلميذ."}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-emerald-100">
                  <p className="text-[10px] text-emerald-700 font-medium">
                    🔒 تم فتح هذه البطاقة حصرياً بالرمز السري الممنوح لكم.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedSummonsForPrint(parentResult)}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة الاستدعاء الرسمي A4</span>
                  </button>
                </div>
              </div>
            ) : rateLimitMessage ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-1.5">
                <AlertCircle className="w-5 h-5 text-rose-600 mx-auto" />
                <p className="text-xs font-black text-rose-900">تنبيه أمان وحماية</p>
                <p className="text-[11px] text-rose-800 max-w-sm mx-auto font-medium">
                  {rateLimitMessage}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-1.5">
                <AlertCircle className="w-5 h-5 text-amber-600 mx-auto" />
                <p className="text-xs font-black text-amber-900">لم يتم العثور على أي استدعاء يطابق هذا الرمز السري</p>
                <p className="text-[11px] text-amber-800 max-w-sm mx-auto">
                  تأكد من كتابة الأرقام الأربعة بدقة كما سُلمت لكم. إذا لم تتلقَ رمزاً خاصاً، يمكنك دوماً الحضور في موعد الاستقبال الأسبوعي العام للتشاور حول مستوى ابنك.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          فضاء الأستاذ المالك: إدارة الاستدعاءات وتوليد الرموز السرية
         ══════════════════════════════════════════════════════════════════════ */}
      {isOwner && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-black text-slate-900">
                لوحة الأستاذ: إدارة استدعاءات الأولياء وتوليد الرموز
              </h2>
              <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                خاص بك كأستاذ 🔐
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? "إغلاق الاستمارة" : "إضافة استدعاء تلميذ جديد"}</span>
            </button>
          </div>

          {/* استمارة إضافة استدعاء جديد */}
          {showAddForm && (
            <form onSubmit={handleCreateSummons} className="p-4 rounded-2xl bg-[#fafaf7] border border-[#e8e8e0] space-y-3 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-800">
                    اسم التلميذ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: يوسف أحمد بن عامر"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#e8e8e0] text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-black text-slate-800">
                    القسم / الفوج <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 1م3 أو 4م1"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#e8e8e0] text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-800">
                  ملاحظة وتوجيه لولي الأمر (يقرأها الولي عند إدخال الرمز)
                </label>
                <textarea
                  rows={2}
                  placeholder="مثال: نود التشاور حول تنظيم كراس المحاولات وإنجاز الواجبات المنزلية لدعم مستوى التلميذ..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#e8e8e0] text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={newIsUrgent}
                    onChange={(e) => setNewIsUrgent(e.target.checked)}
                    className="rounded text-rose-600"
                  />
                  <span>تحديد كحالة مستعجلة ⚠️</span>
                </label>

                <button
                  type="submit"
                  disabled={savingSummons}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingSummons ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>حفظ وتوليد الرمز السري 🔒</span>
                </button>
              </div>
            </form>
          )}

          {/* قائمة الاستدعاءات الحالية للأستاذ */}
          {loadingSummons ? (
            <div className="py-6 text-center text-xs text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-emerald-600 mb-1" />
              <span>جارٍ تحميل سجل الاستدعاءات...</span>
            </div>
          ) : teacherSummons.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              لا توجد استدعاءات مسجلة حالياً.
            </p>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[11px] text-slate-500 font-bold">
                قائمة الاستدعاءات المسجلة (انسخ الرمز السري وسلّمه للتلميذ أو دوّنه في كراسه):
              </p>
              {teacherSummons.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-[#fafaf7] flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-slate-900">{item.studentName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                        {item.className}
                      </span>
                      {item.isUrgent && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800">
                          مستعجل
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-[11px] text-slate-600 line-clamp-1">{item.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* الرمز السري الخاص بالولي */}
                    <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-emerald-300">
                      <span className="text-[10px] text-slate-500 font-bold">رمز الولي:</span>
                      <span className="font-mono text-xs font-black text-emerald-700 tracking-wider">
                        {item.accessCode || "—"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(item.id, item.accessCode)}
                        className="p-1 rounded text-slate-400 hover:text-emerald-700 transition cursor-pointer"
                        title="نسخ الرمز السري"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedSummonsForPrint(item)}
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                      title="طباعة الاستدعاء الرسمي A4"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSummons(item.id, item.studentName)}
                      className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="حذف الاستدعاء"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* تنبيه قانوني وتربوي */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[11px] text-slate-600 leading-relaxed space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>حماية خصوصية التلميذ والأسرة (القانون الجزائري):</span>
        </div>
        <p>
          وفقاً لأحكام القانون رقم 15-12 المتعلق بحماية الطفل والقانون رقم 18-07 المتعلق بحماية المعطيات ذات الطابع الشخصي، تُعامل كافة الملاحظات والتوجيهات بيداغوجياً بسرية تامة لخدمة مصلحة التلميذ الفضلى وبناء أواصر التعاون والارتقاء بين الأسرة والمدرسة.
        </p>
      </div>

      {/* ── نافذة معاينة وطباعة الاستدعاء الرسمي A4 ── */}
      <PrintModal
        isOpen={Boolean(selectedSummonsForPrint)}
        onClose={() => setSelectedSummonsForPrint(null)}
        documentTitle="استدعاء وإشعار ولي أمر تلميذ رسمي"
      >
        {selectedSummonsForPrint && (
          <ParentSummonsPrintDoc
            summons={selectedSummonsForPrint}
            teacherName={teacherProfile?.full_name || teacherInfo?.full_name || "أستاذ المادة"}
            subjectName={teacherProfile?.subject ? "الرياضيات" : "الرياضيات"}
            schoolName={teacherProfile?.school_custom_name || "متوسطة ولاية الوادي"}
            receptionDay={reception?.officialDay || "الأحد"}
            receptionTime={reception?.officialTime || "صباحاً"}
          />
        )}
      </PrintModal>
    </div>
  );
}
