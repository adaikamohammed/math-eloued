"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  EyeOff,
  User,
  Phone,
  Mail,
  Building2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { AdminInquiry, AdminInquiryCategory, AdminInquiryStatus } from "@/lib/types";
import {
  ADMIN_INQUIRY_CATEGORIES,
  buildAdminWhatsAppReplyUrl,
} from "@/lib/adminInquiries";

interface AdminTicketsTabProps {
  onBadgeCountChange?: (pendingCount: number) => void;
}

export function AdminTicketsTab({ onBadgeCountChange }: AdminTicketsTabProps) {
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminInquiryStatus>("all");
  const [senderFilter, setSenderFilter] = useState<"all" | "anonymous" | "teacher" | "visitor">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | AdminInquiryCategory>("all");

  // التذكرة التي يجري الرد عليها حالياً
  const [replyingTicketId, setReplyingTicketId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyStatus, setReplyStatus] = useState<AdminInquiryStatus>("answered");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // جلب التذاكر من الخادم
  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin-inquiries");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.inquiries)) {
          setInquiries(data.inquiries);
          const pending = data.inquiries.filter((t: AdminInquiry) => t.status === "pending").length;
          onBadgeCountChange?.(pending);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch admin inquiries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  // إحصائيات سريعة
  const stats = useMemo(() => {
    const total = inquiries.length;
    const pending = inquiries.filter((t) => t.status === "pending").length;
    const answered = inquiries.filter((t) => t.status === "answered").length;
    const anonymous = inquiries.filter((t) => t.isAnonymous).length;
    const teachers = inquiries.filter((t) => !t.isAnonymous && (t.teacherId || t.senderRole === "أستاذ")).length;
    return { total, pending, answered, anonymous, teachers };
  }, [inquiries]);

  // فلترة التذاكر
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((ticket) => {
      // بحث نصي
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = ticket.trackingCode.toLowerCase().includes(q);
        const matchTitle = ticket.title.toLowerCase().includes(q);
        const matchContent = ticket.content.toLowerCase().includes(q);
        const matchSender = ticket.senderName?.toLowerCase().includes(q) || false;
        const matchSchool = ticket.schoolName?.toLowerCase().includes(q) || false;
        if (!matchCode && !matchTitle && !matchContent && !matchSender && !matchSchool) {
          return false;
        }
      }

      // فلتر الحالة
      if (statusFilter !== "all" && ticket.status !== statusFilter) {
        return false;
      }

      // فلتر المصدر
      if (senderFilter === "anonymous" && !ticket.isAnonymous) return false;
      if (senderFilter === "teacher" && (ticket.isAnonymous || (!ticket.teacherId && ticket.senderRole !== "أستاذ"))) return false;
      if (senderFilter === "visitor" && (ticket.isAnonymous || ticket.teacherId || ticket.senderRole === "أستاذ")) return false;

      // فلتر التصنيف
      if (categoryFilter !== "all" && ticket.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [inquiries, searchQuery, statusFilter, senderFilter, categoryFilter]);

  // إرسال رد الإدارة
  const handleSendReply = async (ticket: AdminInquiry) => {
    if (!replyContent.trim()) {
      setReplyError("يرجى كتابة نص الرد قبل الإرسال.");
      return;
    }

    setSubmittingReply(true);
    setReplyError("");

    try {
      const res = await fetch("/api/admin-inquiries/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryId: ticket.id,
          adminReply: replyContent.trim(),
          status: replyStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setReplyError(data.error || "فشل حفظ الرد.");
        return;
      }

      // تحديث القائمة المحلية
      setInquiries((prev) =>
        prev.map((item) =>
          item.id === ticket.id
            ? {
                ...item,
                adminReply: replyContent.trim(),
                status: replyStatus,
                repliedAt: new Date().toISOString(),
              }
            : item
        )
      );

      setReplyingTicketId(null);
      setReplyContent("");
      // تحديث العداد
      const newPending = inquiries.filter((t) => (t.id === ticket.id ? replyStatus === "pending" : t.status === "pending")).length;
      onBadgeCountChange?.(newPending);
    } catch {
      setReplyError("تعذر إرسال الرد. تحقق من الاتصال بالإنترنت.");
    } finally {
      setSubmittingReply(false);
    }
  };

  // نسخ كود التتبع
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const getCategoryMeta = (catId: AdminInquiryCategory) => {
    return (
      ADMIN_INQUIRY_CATEGORIES.find((c) => c.id === catId) || {
        id: catId,
        label: "عام",
        badgeBg: "bg-slate-50",
        badgeText: "text-slate-800",
        badgeBorder: "border-slate-200",
      }
    );
  };

  // قوالب ردود سريعة جاهزة للإدارة
  const quickReplies = [
    "السلام عليكم ورحمة الله، تم استلام اقتراحكم وسنقوم بإدراجه في التحديث القادم للمنصة بإذن الله. شكراً لمساهمتكم القيمة.",
    "السلام عليكم، تم التحقق من الإشكال التقني ومعالجته بنجاح. يرجى إعادة المحاولة الآن وإفادتنا بالنتيجة.",
    "وعليكم السلام ورحمة الله، بخصوص استفساركم البيداغوجي، نؤكد أن التدرج السنوي المعتمد يتطابق تماماً مع المنشور الوزاري الأخير.",
    "شكراً لتواصلك وحرصك على الارتقاء بالمنصة، تم تحويل طلبك للقسم المختص للمتابعة.",
  ];

  return (
    <div className="space-y-6">
      {/* ─── بطاقات الإحصاء السريع ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي الرسائل</span>
            <MessageSquare className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.total}</p>
          <span className="text-[10px] text-slate-400">من الأساتذة والزوار</span>
        </div>

        <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">بانتظار الرد</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">{stats.pending}</p>
          <span className="text-[10px] text-amber-700">تتطلب مراجعة المدير</span>
        </div>

        <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">تم الرد عليها</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2">{stats.answered}</p>
          <span className="text-[10px] text-emerald-700">ردود معتمدة واصلة</span>
        </div>

        <div className="bg-purple-50/70 rounded-2xl p-4 border border-purple-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800">رسائل مجهولة 🎭</span>
            <EyeOff className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-900 mt-2">{stats.anonymous}</p>
          <span className="text-[10px] text-purple-700">سرية تامة للمرسل</span>
        </div>
      </div>

      {/* ─── شريط البحث والفلترة ─── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ابحث بكود التتبع، الموضوع، المحتوى، أو اسم الأستاذ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          <button
            onClick={fetchInquiries}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث القائمة</span>
          </button>
        </div>

        {/* فلاتر متعددة */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-bold ml-1">الحالة:</span>
          {(
            [
              ["all", "الكل"],
              ["pending", "بانتظار الرد ⏳"],
              ["answered", "تم الرد 🟢"],
              ["closed", "مغلقة 🔒"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={`px-3 py-1 rounded-xl font-bold transition ${
                statusFilter === val
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}

          <span className="text-slate-400 font-bold mr-3 ml-1">المصدر:</span>
          {(
            [
              ["all", "كل المصادر"],
              ["teacher", "أساتذة مسجلون 👨‍🏫"],
              ["anonymous", "مجهول الهوية 🎭"],
              ["visitor", "زوار وأولياء 🌐"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSenderFilter(val)}
              className={`px-3 py-1 rounded-xl font-bold transition ${
                senderFilter === val
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── قائمة التذاكر ─── */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-500" />
            <p className="text-xs font-bold">جارٍ جلب رسائل وتذاكر الإدارة...</p>
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 space-y-2">
            <MessageSquare className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">لا توجد رسائل مطابقة للفلتر المحدد</p>
            <p className="text-xs text-slate-400">جرّب تغيير خيارات البحث أو الفلاتر أعلاه.</p>
          </div>
        ) : (
          filteredInquiries.map((ticket) => {
            const catMeta = getCategoryMeta(ticket.category);
            const isReplying = replyingTicketId === ticket.id;
            const isAnswered = ticket.status === "answered";

            return (
              <div
                key={ticket.id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                  ticket.status === "pending"
                    ? "border-amber-300 ring-1 ring-amber-100"
                    : "border-slate-200"
                }`}
              >
                {/* الرأس */}
                <div className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      {ticket.trackingCode}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${catMeta.badgeBg} ${catMeta.badgeText} ${catMeta.badgeBorder}`}
                    >
                      {catMeta.label}
                    </span>

                    {/* شارة هوية المرسل */}
                    {ticket.isAnonymous ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 text-xs font-bold border border-purple-200">
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>رسالة من مجهول 🎭</span>
                      </span>
                    ) : ticket.teacherId ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>أستاذ معتمد بالمنصة 👨‍🏫</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
                        <User className="w-3.5 h-3.5" />
                        <span>{ticket.senderRole || "زائر للمنصة"} 🌐</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(ticket.createdAt).toLocaleString("ar-DZ")}
                    </span>

                    {isAnswered ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تم الرد</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>بانتظار الرد</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* جسم التذكرة وبيانات المرسل */}
                <div className="p-5 space-y-4">
                  {/* بيانات المرسل إذا لم يكن مجهولاً */}
                  {!ticket.isAnonymous && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-wrap items-center gap-4 text-xs">
                      {ticket.senderName && (
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>المرسل: {ticket.senderName}</span>
                        </div>
                      )}

                      {ticket.schoolName && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>المؤسسة: {ticket.schoolName}</span>
                        </div>
                      )}

                      {ticket.senderPhone && (
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>الهاتف: {ticket.senderPhone}</span>
                        </div>
                      )}

                      {ticket.senderEmail && (
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>البريد: {ticket.senderEmail}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* موضوع ونص الرسالة */}
                  <div>
                    <h3 className="text-base font-black text-slate-900">{ticket.title}</h3>
                    <div className="text-xs sm:text-sm text-slate-700 mt-2 p-4 rounded-2xl bg-[#fafaf7] border border-slate-100 whitespace-pre-wrap leading-relaxed">
                      {ticket.content}
                    </div>
                  </div>

                  {/* الرد الحالي إذا وجد */}
                  {ticket.adminReply && !isReplying && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-950 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>رد إدارة المنصة والمشرف العام:</span>
                        </span>
                        {ticket.repliedAt && (
                          <span className="text-[10px] text-emerald-700">
                            {new Date(ticket.repliedAt).toLocaleString("ar-DZ")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-emerald-900 whitespace-pre-wrap leading-relaxed font-medium">
                        {ticket.adminReply}
                      </p>
                    </div>
                  )}

                  {/* استمارة كتابة وتعديل الرد */}
                  {isReplying && (
                    <div className="p-4 rounded-2xl bg-indigo-50/70 border-2 border-indigo-300 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                          <Send className="w-4 h-4 text-indigo-600" />
                          <span>كتابة رد إدارة المنصة:</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-bold text-indigo-900">حالة التذكرة:</label>
                          <select
                            value={replyStatus}
                            onChange={(e) => setReplyStatus(e.target.value as AdminInquiryStatus)}
                            className="text-xs font-bold py-1 px-2.5 rounded-lg border border-indigo-200 bg-white"
                          >
                            <option value="answered">تم الرد والمعالجة 🟢</option>
                            <option value="pending">قيد المتابعة ⏳</option>
                            <option value="closed">إغلاق التذكرة 🔒</option>
                          </select>
                        </div>
                      </div>

                      {/* نماذج رد سريعة */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-indigo-700 block">
                          نماذج ردود سريعة بضغطة زر:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {quickReplies.map((q, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setReplyContent(q)}
                              className="text-[10px] px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-right transition truncate max-w-xs"
                              title={q}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>

                      <textarea
                        rows={4}
                        placeholder="اكتب هنا الرد الوافي والمفصل على استفسار الأستاذ أو الزائر..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="w-full p-3 rounded-xl border border-indigo-200 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition bg-white leading-relaxed"
                      />

                      {replyError && (
                        <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{replyError}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSendReply(ticket)}
                            disabled={submittingReply}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                          >
                            {submittingReply ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>حفظ واعتماد الرد 🚀</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTicketId(null);
                              setReplyError("");
                            }}
                            className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
                          >
                            إلغاء
                          </button>
                        </div>

                        {/* زر إرسال عبر واتساب إذا توفر الهاتف */}
                        {ticket.senderPhone && replyContent.trim() && (
                          <a
                            href={buildAdminWhatsAppReplyUrl(
                              ticket.senderPhone,
                              ticket.title,
                              replyContent.trim(),
                              ticket.trackingCode
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>إرسال الرد عبر واتساب مباشرة 📲</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* أزرار الإجراءات في أسفل البطاقة */}
                  {!isReplying && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTicketId(ticket.id);
                            setReplyContent(ticket.adminReply || "");
                            setReplyStatus(ticket.status === "pending" ? "answered" : ticket.status);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition flex items-center gap-1.5 border border-indigo-200"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{ticket.adminReply ? "تعديل الرد" : "الرد على هذه الرسالة ✍️"}</span>
                        </button>

                        {/* إرسال واتساب مباشر إذا وجد هاتف ووجد رد سابق */}
                        {ticket.senderPhone && ticket.adminReply && (
                          <a
                            href={buildAdminWhatsAppReplyUrl(
                              ticket.senderPhone,
                              ticket.title,
                              ticket.adminReply,
                              ticket.trackingCode
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition flex items-center gap-1 border border-emerald-200"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>تذكير بالواتساب</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(ticket.trackingCode)}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-bold px-2 py-1 rounded-lg hover:bg-slate-50 transition"
                        >
                          {copiedCode === ticket.trackingCode ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الكود</span>
                            </>
                          )}
                        </button>

                        <a
                          href={`/contact?code=${encodeURIComponent(ticket.trackingCode)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-50 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>معاينة صفحة التتبع</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
