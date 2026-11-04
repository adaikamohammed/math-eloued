"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useTeacherId } from "@/lib/teacherParam";
import {
  HelpCircle,
  Lightbulb,
  Scale,
  MessageCircle,
  Search,
  X,
  Check,
  Copy,
  Trash2,
  Share2,
  Inbox,
  RefreshCw,
  Calendar,
  MessageSquare,
  Sparkles,
  Lock,
} from "lucide-react";
import { MessageCategory, AnonymousMessage } from "@/lib/types";
import { LoginRequired } from "@/components/LoginRequired";
import { checkTeacherSession } from "@/lib/offlineAuth";

// أصناف الرسائل وتنسيقاتها
const CATEGORIES: {
  id: MessageCategory;
  label: string;
  icon: any;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}[] = [
  {
    id: "question",
    label: "سؤال حول درس أو تمرين",
    icon: HelpCircle,
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-800",
    badgeBorder: "border-blue-200",
  },
  {
    id: "suggestion",
    label: "اقتراح أو فكرة تطويرية",
    icon: Lightbulb,
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    badgeBorder: "border-amber-200",
  },
  {
    id: "criticism",
    label: "نقد بنّاء أو ملاحظة صريحة",
    icon: Scale,
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-800",
    badgeBorder: "border-purple-200",
  },
  {
    id: "other",
    label: "استفسار أو رسالة عامة",
    icon: MessageCircle,
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-200",
  },
];

export default function MessagesInboxPage() {
  const teacherId = useTeacherId();

  const [mounted, setMounted] = useState(false);
  const [isTeacher, setIsTeacher] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // بيانات صندوق الوارد للأستاذ
  const [messages, setMessages] = useState<AnonymousMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<"all" | "unread" | "read">("all");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // فحص المصادقة مع دعم وضع الأوفلاين
  useEffect(() => {
    checkTeacherSession()
      .then((data) => {
        setIsTeacher(Boolean(data.authenticated));
      })
      .finally(() => setAuthLoading(false));
  }, []);

  // جلب الرسائل الواردة
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
    if (isTeacher) {
      fetchMessages();
    }
  }, [isTeacher, fetchMessages]);

  // تبديل حالة القراءة (مقروء / غير مقروء)
  const handleToggleRead = async (msg: AnonymousMessage) => {
    const nextRead = !msg.read;
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
      fetchMessages();
    }
  };

  // حذف رسالة نهائياً
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

  // نسخ رابط الإرسال العام لمشاركته مع التلاميذ والأولياء
  const handleCopyPublicLink = () => {
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    const link = teacherId
      ? `${origin}/messages/send?teacher=${teacherId}`
      : `${origin}/messages/send`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // نسخ محتوى رسالة معينة
  const handleCopyContent = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // إحصائيات الرسائل
  const stats = useMemo(() => {
    const total = messages.length;
    const unread = messages.filter((m) => !m.read).length;
    const questions = messages.filter((m) => m.category === "question").length;
    const suggestions = messages.filter((m) => m.category === "suggestion").length;
    const criticisms = messages.filter((m) => m.category === "criticism").length;
    const others = messages.filter((m) => m.category === "other").length;
    return { total, unread, questions, suggestions, criticisms, others };
  }, [messages]);

  // تصفية الرسائل حسب البحث والتصنيف والحالة
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!m.content.toLowerCase().includes(q)) return false;
      }
      if (filterCategory !== "all" && m.category !== filterCategory) {
        return false;
      }
      if (filterRead === "unread" && m.read) return false;
      if (filterRead === "read" && !m.read) return false;

      return true;
    });
  }, [messages, searchQuery, filterCategory, filterRead]);

  if (!mounted || authLoading) {
    return (
      <div
        className="py-20 flex flex-col items-center justify-center space-y-3"
        dir="rtl"
        suppressHydrationWarning
      >
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-black text-slate-700">جاري تحميل صندوق الرسائل...</span>
      </div>
    );
  }

  // إذا لم يكن مسجلاً كأستاذ، تظهر شاشة تسجيل الدخول أو رابط الإرسال
  if (!isTeacher) {
    return (
      <div
        className="py-12 max-w-md mx-auto space-y-6 text-center"
        dir="rtl"
        suppressHydrationWarning
      >
        <LoginRequired next="/messages" title="صندوق رسائل ومقترحات الأستاذ" />
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
          <p className="font-bold">هل أنت تلميذ أو ولي أمر وترغب في مراسلة الأستاذ؟</p>
          <Link
            href="/messages/send"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white font-black hover:bg-emerald-800 transition"
          >
            <span>إرسال رسالة سرية للأستاذ 🔒</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-5 animate-in fade-in duration-200"
      dir="rtl"
      suppressHydrationWarning
    >
      {/* ─── شريط الأدوات العلوي المدمج (Toolbar) ─── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/80 shadow-2xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">
                صندوق استقبال الرسائل والمقترحات
              </h2>
              {stats.unread > 0 ? (
                <span className="text-[10px] bg-rose-50 text-rose-800 font-black px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                  {stats.unread} غير مقروءة
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  محدث ✓
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              متابعة واستقبال ملاحظات وأسئلة واقتراحات التلاميذ وأوليائهم بسرية تامة
            </p>
          </div>
        </div>

        {/* الإجراءات: نسخ الرابط للعامة + زر التحديث */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyPublicLink}
            className="py-2 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
            title="نسخ رابط الإرسال لمشاركته مع التلاميذ أو الأولياء"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                <span>تم نسخ الرابط للعامة!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>نسخ رابط إرسال الرسائل للعامة</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={fetchMessages}
            disabled={loadingMessages}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            title="تحديث صندوق الرسائل"
          >
            <RefreshCw
              className={`w-4 h-4 ${loadingMessages ? "animate-spin text-emerald-600" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* ─── بطاقات المؤشرات والإحصائيات ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">
            إجمالي الوارد
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

      {/* ─── شريط البحث والتصفية ─── */}
      <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* مربع البحث */}
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
              كل الرسائل ({stats.total})
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
              المقروءة ({stats.total - stats.unread})
            </button>
          </div>
        </div>

        {/* تبويبات التصنيف */}
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

      {/* ─── قائمة الرسائل الواردة ─── */}
      <div className="space-y-3">
        {loadingMessages ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-bold">جاري تحديث الرسائل الواردة...</p>
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
                <span>{copiedLink ? "تم النسخ بنجاح!" : "نسخ رابط الصندوق للمشاركة"}</span>
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
                className={`rounded-3xl p-4 sm:p-5 border transition space-y-3.5 ${
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
                      <span className="text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        <span>جديدة</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
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
                      onClick={() => handleCopyContent(msg.id, msg.content)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      title="نسخ نص الرسالة"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
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

                {/* نص الرسالة الصريح */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 border border-slate-100 text-slate-900 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line select-text">
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}