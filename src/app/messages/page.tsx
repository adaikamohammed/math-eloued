"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useTeacherId, withTeacher, useTeacherInfo } from "@/lib/teacherParam";
import {
  ArrowRight,
  ShieldCheck,
  Send,
  HelpCircle,
  Lightbulb,
  Scale,
  MessageCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  Loader2,
  AlertCircle,
  MessageSquare,
  Search,
  X,
  Check,
  Copy,
  Trash2,
  Share2,
  Inbox,
  Eye,
  RefreshCw,
  Calendar,
  User,
  GraduationCap,
} from "lucide-react";
import { MessageCategory, AnonymousMessage } from "@/lib/types";

// أصناف الرسائل
const CATEGORIES: {
  id: MessageCategory;
  label: string;
  icon: any;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  desc: string;
}[] = [
  {
    id: "question",
    label: "سؤال حول درس أو تمرين",
    icon: HelpCircle,
    color: "from-blue-600 to-indigo-600",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-800",
    badgeBorder: "border-blue-200",
    desc: "نقطة لم تفهمها في القسم أو صعوبة في حل تمرين",
  },
  {
    id: "suggestion",
    label: "اقتراح أو فكرة تطويرية",
    icon: Lightbulb,
    color: "from-amber-500 to-yellow-600",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    badgeBorder: "border-amber-200",
    desc: "فكرة لتحسين الحصة، تنظيم التمارين أو الموقع",
  },
  {
    id: "criticism",
    label: "نقد بنّاء أو ملاحظة صريحة",
    icon: Scale,
    color: "from-purple-600 to-pink-600",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-800",
    badgeBorder: "border-purple-200",
    desc: "ملاحظة حول وتيرة الشرح، المعاملة، أو أي استياء لمعالجته",
  },
  {
    id: "other",
    label: "استفسار أو رسالة عامة",
    icon: MessageCircle,
    color: "from-emerald-600 to-teal-600",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-200",
    desc: "أي رسالة تود توجيهها للأستاذ بكل صدق وشفافية",
  },
];

const AUDIENCES = [
  { id: "", label: "🔒 بدون تحديد (سري تماماً)" },
  { id: "تلميذ", label: "تلميذ بالقسم 🎒" },
  { id: "ولي أمر", label: "ولي أمر تلميذ 👨‍👩‍👦" },
  { id: "1 متوسط", label: "1 متوسط" },
  { id: "2 متوسط", label: "2 متوسط" },
  { id: "3 متوسط", label: "3 متوسط" },
  { id: "4 متوسط", label: "4 متوسط" },
];

export default function MessagesPage() {
  const teacherId = useTeacherId();
  const teacherInfo = useTeacherInfo(teacherId);

  // حالة المصادقة
  const [mounted, setMounted] = useState(false);
  const [isTeacher, setIsTeacher] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // وضع العرض: "inbox" للأستاذ لمطالعة الرسائل، أو "send" لإرسال رسالة
  const [viewMode, setViewMode] = useState<"inbox" | "send">("inbox");

  // بيانات صندوق الوارد للأستاذ
  const [messages, setMessages] = useState<AnonymousMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<"all" | "unread" | "read">("all");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // بيانات نموذج الإرسال (للطلبة / الأولياء / المعاينة)
  const [category, setCategory] = useState<MessageCategory>("question");
  const [targetLevel, setTargetLevel] = useState("");
  const [content, setContent] = useState("");
  const [hpWebsite, setHpWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [urlLvl, setUrlLvl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // فحص حالة تسجيل الدخول
  useEffect(() => {
    fetch("/api/auth")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.authenticated) {
          setIsTeacher(true);
          // إذا كان الرابط يحتوي صراحة على ?send=true أو لم يسجل المعلم، يفتح الإرسال
          const params = new URLSearchParams(window.location.search);
          if (params.get("send") === "true") {
            setViewMode("send");
          } else {
            setViewMode("inbox");
          }
        } else {
          setIsTeacher(false);
          setViewMode("send");
        }
      })
      .catch(() => {
        setIsTeacher(false);
        setViewMode("send");
      })
      .finally(() => setAuthLoading(false));
  }, []);

  // جلب مستوى الرابط إن وجد
  useEffect(() => {
    if (typeof window !== "undefined") {
      const lvl = new URLSearchParams(window.location.search).get("lvl");
      if (lvl) {
        setUrlLvl(lvl);
        setTargetLevel(`${lvl} متوسط`);
      }
    }
  }, []);

  // جلب الرسائل الواردة للأستاذ
  const fetchMessages = useCallback(async () => {
    if (!isTeacher) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/messages?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      }
    } catch (e) {
      console.error("Error fetching messages:", e);
    } finally {
      setLoadingMessages(false);
    }
  }, [isTeacher]);

  useEffect(() => {
    if (isTeacher && viewMode === "inbox") {
      fetchMessages();
    }
  }, [isTeacher, viewMode, fetchMessages]);

  // تبديل حالة القراءة
  const handleToggleRead = async (msg: AnonymousMessage) => {
    const nextRead = !msg.read;
    // تحديث متفائل فوري
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, read: nextRead } : m))
    );
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id, read: nextRead }),
      });
    } catch {
      // استرجاع الحالة في حال الفشل
      fetchMessages();
    }
  };

  // حذف رسالة
  const handleDeleteMessage = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الرسالة نهائياً؟")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/messages?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
      }
    } catch {
      alert("تعذر حذف الرسالة، يرجى المحاولة لاحقاً");
    } finally {
      setDeletingId(null);
    }
  };

  // نسخ رابط الصندوق للعامة
  const handleCopyPublicLink = () => {
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    const link = teacherId
      ? `${origin}/messages?teacher=${teacherId}`
      : `${origin}/messages`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // معالجة إرسال رسالة جديدة
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMsg("يرجى كتابة نص رسالتك أولاً");
      return;
    }
    if (content.trim().length < 5) {
      setErrorMsg("يرجى توضيح رسالتك أكثر (5 أحرف على الأقل)");
      return;
    }

    setSending(true);
    setErrorMsg("");

    try {
      const res = await fetch(withTeacher("/api/messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          targetLevel: targetLevel || undefined,
          content: content.trim(),
          website: hpWebsite,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        setContent("");
      } else {
        setErrorMsg(data.error || "حدث خطأ أثناء الإرسال");
      }
    } catch {
      setErrorMsg("تعذر الاتصال بالخادم، يرجى المحاولة بعد قليل");
    } finally {
      setSending(false);
    }
  };

  // إحصائيات الرسائل الواردة للأستاذ
  const stats = useMemo(() => {
    const total = messages.length;
    const unread = messages.filter((m) => !m.read).length;
    const questions = messages.filter((m) => m.category === "question").length;
    const suggestions = messages.filter((m) => m.category === "suggestion").length;
    const criticisms = messages.filter((m) => m.category === "criticism").length;
    const others = messages.filter((m) => m.category === "other").length;
    return { total, unread, questions, suggestions, criticisms, others };
  }, [messages]);

  // تصفية الرسائل في صندوق الوارد
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      // بحث نصي
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!m.content.toLowerCase().includes(q)) return false;
      }
      // تصفية الصنف
      if (filterCategory !== "all" && m.category !== filterCategory) {
        return false;
      }
      // تصفية المستوى
      if (filterLevel !== "all") {
        if (!m.targetLevel || !m.targetLevel.includes(filterLevel)) return false;
      }
      // تصفية حالة القراءة
      if (filterRead === "unread" && m.read) return false;
      if (filterRead === "read" && !m.read) return false;

      return true;
    });
  }, [messages, searchQuery, filterCategory, filterLevel, filterRead]);

  const audiencesList = useMemo(() => {
    if (urlLvl) {
      return [
        { id: `ولي أمر (${urlLvl} متوسط)`, label: `👨‍👩‍👦 ولي أمر (${urlLvl} متوسط)` },
        { id: `تلميذ (${urlLvl} متوسط)`, label: `🎒 تلميذ (${urlLvl} متوسط)` },
        { id: `${urlLvl} متوسط`, label: `🎯 قسم ${urlLvl} متوسط` },
        { id: "", label: "🔒 بدون تحديد (سري تماماً)" },
      ];
    }
    return AUDIENCES;
  }, [urlLvl]);

  const backHref = teacherId
    ? `/t/${teacherId}${urlLvl ? `?lvl=${urlLvl}` : ""}`
    : "/";

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-sm font-black text-slate-700">جاري تحميل صندوق الرسائل...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24" dir="rtl">
      {/* ─── السطر العلوي الموحد مع هوية المنصة ─── */}
      <header className="bg-white border-b border-slate-200/90 px-3 sm:px-6 py-3 transition-all shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* زر الرجوع والعنوان */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href={isTeacher ? "/eval" : backHref}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 shrink-0 text-xs font-bold cursor-pointer"
              title="العودة"
            >
              <ArrowRight className="w-4 h-4" />
              <span className="hidden sm:inline">العودة</span>
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>صندوق الرسائل والمقترحات</span>
                </h1>
                {isTeacher && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    لوحة الأستاذ
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block truncate mt-0.5">
                {isTeacher
                  ? "متابعة ملاحظات وأسئلة واقتراحات التلاميذ وأوليائهم بكل سرية وشفافية"
                  : `وجّه رسالة سرية أو ملاحظة ${teacherInfo ? `لـ ${teacherInfo.full_name}` : "للأستاذ"}`}
              </p>
            </div>
          </div>

          {/* تبديل الأوضاع وإجراءات الأستاذ */}
          {isTeacher && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* زر نسخ الرابط للعامة */}
              <button
                type="button"
                onClick={handleCopyPublicLink}
                className="py-2 px-3 sm:px-3.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="نسخ الرابط لمشاركته مع التلاميذ أو الأولياء"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">تم نسخ الرابط بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>نسخ رابط الصندوق للعامة</span>
                  </>
                )}
              </button>

              {/* أزرار التبديل بين صندوق الوارد ونموذج الإرسال */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode("inbox")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "inbox"
                      ? "bg-white text-emerald-950 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5 text-emerald-600" />
                  <span>الوارد ({stats.total})</span>
                  {stats.unread > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode("send")}
                  className={`py-1.5 px-3 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "send"
                      ? "bg-white text-emerald-950 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>معاينة الإرسال</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ─── المحتوى الرئيسي ─── */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-5 space-y-4">
        {/* ══════════════════════════════════════════════════════════════
           وضع 1: صندوق الوارد للأستاذ (Inbox)
           ══════════════════════════════════════════════════════════════ */}
        {isTeacher && viewMode === "inbox" ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* بطاقات المؤشرات والإحصائيات */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block mb-1">
                  إجمالي الرسائل
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                  {stats.total}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block mb-1 flex items-center justify-between">
                  <span>غير مقروءة</span>
                  {stats.unread > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </span>
                <span
                  className={`text-xl sm:text-2xl font-black font-mono ${
                    stats.unread > 0 ? "text-rose-600" : "text-slate-400"
                  }`}
                >
                  {stats.unread}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 shadow-2xs">
                <span className="text-[11px] font-bold text-blue-900 block mb-1">
                  أسئلة وتمارين ❓
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-blue-800">
                  {stats.questions}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-900 block mb-1">
                  اقتراحات وأفكار 💡
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-800">
                  {stats.suggestions}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 shadow-2xs">
                <span className="text-[11px] font-bold text-purple-900 block mb-1">
                  نقد وملاحظات ⚖️
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-purple-800">
                  {stats.criticisms}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-900 block mb-1">
                  استفسارات عامة 💬
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-800">
                  {stats.others}
                </span>
              </div>
            </div>

            {/* شريط البحث والفلاتر */}
            <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* مربع البحث في محتوى الرسائل */}
                <div className="relative flex-1 sm:min-w-[260px]">
                  <input
                    type="text"
                    placeholder="ابحث في نص الرسائل الواردة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2 pr-9 pl-8 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-bold transition focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute left-2.5 top-2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* أزرار تصفية حالة القراءة */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterRead("all")}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      filterRead === "all"
                        ? "bg-white text-slate-900 shadow-2xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    كل الرسائل
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterRead("unread")}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      filterRead === "unread"
                        ? "bg-white text-rose-700 shadow-2xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    غير المقروءة ({stats.unread})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterRead("read")}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      filterRead === "read"
                        ? "bg-white text-emerald-800 shadow-2xs font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    المقروءة
                  </button>
                </div>

                {/* زر تحديث الرسائل */}
                <button
                  type="button"
                  onClick={fetchMessages}
                  disabled={loadingMessages}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-slate-50 transition cursor-pointer"
                  title="تحديث صندوق الرسائل"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loadingMessages ? "animate-spin text-emerald-600" : ""}`}
                  />
                </button>
              </div>

              {/* تبويبات التصنيف والأقسام */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <span className="text-[11px] text-slate-400 ml-1">التصنيف:</span>
                {[
                  { id: "all", label: "الكل" },
                  { id: "question", label: "❓ أسئلة الدروس" },
                  { id: "suggestion", label: "💡 اقتراحات" },
                  { id: "criticism", label: "⚖️ نقد وملاحظات" },
                  { id: "other", label: "💬 استفسارات عامة" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFilterCategory(c.id)}
                    className={`px-2.5 py-1 rounded-xl transition cursor-pointer ${
                      filterCategory === c.id
                        ? "bg-slate-900 text-white font-black shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* قائمة الرسائل الواردة */}
            <div className="space-y-3">
              {loadingMessages ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">جاري تحميل الرسائل...</p>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
                    <Inbox className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-800">
                      {messages.length === 0
                        ? "صندوق الرسائل جاهز وفارغ حالياً"
                        : "لا توجد رسائل مطابقة للبحث أو الفلتر"}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      {messages.length === 0
                        ? "انسخ رابط الصندوق وشاركه مع تلاميذك وأوليائهم لتلقي أسئلتهم ومقترحاتهم وملاحظاتهم البناءة بسرية تامة."
                        : "جرّب تغيير كلمات البحث أو إزالة الفلاتر لعرض الرسائل الأخرى."}
                    </p>
                  </div>
                  {messages.length === 0 && (
                    <button
                      type="button"
                      onClick={handleCopyPublicLink}
                      className="py-2.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition cursor-pointer shadow-sm inline-flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{copiedLink ? "تم النسخ!" : "نسخ رابط الصندوق للمشاركة"}</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const catConfig =
                    CATEGORIES.find((c) => c.id === msg.category) || CATEGORIES[3];
                  const Icon = catConfig.icon;

                  let dateStr = "";
                  try {
                    dateStr = new Intl.DateTimeFormat("ar-DZ", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(msg.createdAt));
                  } catch {
                    dateStr = msg.createdAt;
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`rounded-2xl p-4 sm:p-5 border transition space-y-3.5 ${
                        !msg.read
                          ? "bg-white border-emerald-300 shadow-sm ring-2 ring-emerald-500/10"
                          : "bg-white border-slate-200/90 shadow-2xs hover:border-slate-300"
                      }`}
                    >
                      {/* رأس بطاقة الرسالة */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* صنف الرسالة */}
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl border ${catConfig.badgeBg} ${catConfig.badgeText} ${catConfig.badgeBorder}`}
                          >
                            <Icon className="w-3 h-3 shrink-0" />
                            <span>{catConfig.label}</span>
                          </span>

                          {/* جهة الإرسال أو الصفة */}
                          {msg.targetLevel && (
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              {msg.targetLevel}
                            </span>
                          )}

                          {/* تاريخ وتوقيت الوصول */}
                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{dateStr}</span>
                          </span>

                          {/* وسم جديد أو مقروء */}
                          {!msg.read ? (
                            <span className="text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.2 rounded-full flex items-center gap-1 animate-pulse">
                              <span>جديدة</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.2 rounded-full">
                              مقروءة ✓
                            </span>
                          )}
                        </div>

                        {/* أزرار الإجراءات على الرسالة */}
                        <div className="flex items-center gap-1.5">
                          {/* زر التبديل كمقروء / غير مقروء */}
                          <button
                            type="button"
                            onClick={() => handleToggleRead(msg)}
                            className={`py-1.5 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                              msg.read
                                ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                : "bg-emerald-100 hover:bg-emerald-200 text-emerald-900 shadow-2xs"
                            }`}
                            title={msg.read ? "تحديد كغير مقروءة" : "تحديد كمقروءة"}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{msg.read ? "غير مقروءة" : "تمت القراءة"}</span>
                          </button>

                          {/* زر نسخ نص الرسالة */}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              alert("تم نسخ نص الرسالة إلى الحافظة 📋");
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            title="نسخ نص الرسالة"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* زر حذف الرسالة */}
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            disabled={deletingId === msg.id}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                            title="حذف الرسالة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* نص الرسالة ومحتواها الصريح */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 border border-slate-100 text-slate-900 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line select-text">
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════
             وضع 2: نموذج إرسال الرسالة (للطلبة / الأولياء / المعاينة)
             ══════════════════════════════════════════════════════════════ */
          <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-150">
            {/* شريط تنبيه المعاينة إن كان المستخدم أستاذاً */}
            {isTeacher && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-950 font-bold">
                <div className="flex items-center gap-2">
                  <span>💡</span>
                  <span>أنت الآن في وضع المعاينة (ما يراه التلاميذ والأولياء عند فتح الرابط)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode("inbox")}
                  className="py-1 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition cursor-pointer shadow-2xs"
                >
                  العودة لصندوق الوارد ({stats.total})
                </button>
              </div>
            )}

            {/* بطاقة ميثاق الأمان والسرية التامة المحدثة */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-3xl shadow-sm space-y-2 border border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-sm sm:text-base font-black text-white">
                  هويتك محمية ومجهولة تماماً 🔒
                </h2>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium pt-1">
                هذا الصندوق مخصص لتعزيز الصراحة البناءة بين الأستاذ وتلاميذه وأوليائهم. لن يتم
                تسجيل اسمك أو بريدك أو رقم هاتفك أو أي معلومة تكشف هويتك. اكتب بكل راحة
                واطمئنان أي نقد، سؤال أو اقتراح يساهم في مصلحتكم جميعاً.
              </p>
            </div>

            {success ? (
              /* شاشة تأكيد النجاح */
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-sm text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-inner">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-black text-slate-900">
                    وصلت رسالتك بسرية تامة!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                    شكراً لصراحتك وحرصك على التواصل. سيطّلع الأستاذ على رسالتك ويأخذ ملاحظتك بعين
                    الاعتبار في الحصص القادمة إن شاء الله.
                  </p>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => setSuccess(false)}
                    className="py-2.5 px-5 rounded-xl bg-slate-100 text-slate-700 text-xs font-black hover:bg-slate-200 transition cursor-pointer"
                  >
                    كتابة رسالة أخرى
                  </button>
                  <Link
                    href={backHref}
                    className="py-2.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition shadow-sm"
                  >
                    العودة إلى فضاء الأستاذ
                  </Link>
                </div>
              </div>
            ) : (
              /* نموذج كتابة الرسالة المطور */
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-xs space-y-4"
              >
                {/* حقل فخ لمنع الروبوتات */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    opacity: 0,
                    height: 0,
                    width: 0,
                    overflow: "hidden",
                  }}
                >
                  <label htmlFor="website">اترك هذا الحقل فارغاً</label>
                  <input
                    id="website"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={hpWebsite}
                    onChange={(e) => setHpWebsite(e.target.value)}
                  />
                </div>

                {/* 1. نوع وموضوع الرسالة */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-800 block">
                    1. ما هو موضوع رسالتك؟: <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const active = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`p-3 rounded-2xl border text-right transition flex items-start gap-2.5 cursor-pointer ${
                            active
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-white text-slate-700 shadow-2xs border border-slate-200"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-black">{cat.label}</div>
                            <div
                              className={`text-[10px] mt-0.5 leading-snug ${
                                active ? "text-slate-300" : "text-slate-500"
                              }`}
                            >
                              {cat.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. الصف أو الصفة (اختياري) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800">
                      2. الصف أو الصفة (اختياري):
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold">
                      لمساعدة الأستاذ في فهم السياق
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {audiencesList.map((aud) => (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => setTargetLevel(aud.id)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                          targetLevel === aud.id
                            ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs font-black"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {aud.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. نص الرسالة */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800">
                      3. اكتب رسالتك وملاحظتك بكل حرية وصراحة: <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold font-mono">
                      {content.length} / 3000
                    </span>
                  </div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="اكتب هنا ما تشاء بكل صراحة... مثلاً: لم أفهم طريقة حل التمرين الفلاني، أو أقترح تسريع/تبطيء وتيرة الشرح، أو ملاحظة حول طريقة معينة..."
                    rows={5}
                    maxLength={3000}
                    className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition leading-relaxed bg-slate-50/50 hover:bg-white focus:bg-white"
                    required
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* زر الإرسال */}
                <button
                  type="submit"
                  disabled={sending || !content.trim()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 hover:from-emerald-800 hover:to-teal-900 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الإرسال بسرية...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال الرسالة بسرية تامة 🔒</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}