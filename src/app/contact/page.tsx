"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Search,
  Lock,
  User,
  Sparkles,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  Building2,
  Phone,
  Mail,
  BookOpen,
  HelpCircle,
  HeartHandshake,
  FileText,
  Lightbulb,
  Scale,
  Crown,
  Eye,
  EyeOff,
  Share2,
} from "lucide-react";
import {
  ADMIN_INQUIRY_CATEGORIES,
  getLocalAdminTickets,
  saveAdminTicketLocally,
  removeLocalAdminTicket,
} from "@/lib/adminInquiries";
import { AdminInquiry, AdminInquiryCategory } from "@/lib/types";
import { supabase } from "@/lib/supabase";

function ContactPageInner() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";
  const initialToken = searchParams.get("token") || "";

  // التبويب النشط: "send" أو "track"
  const [activeTab, setActiveTab] = useState<"send" | "track">(
    initialCode ? "track" : "send"
  );

  // حالة تسجيل الدخول التلقائي للأستاذ
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    schoolName?: string;
  } | null>(null);

  // بيانات النموذج
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderRole, setSenderRole] = useState("أستاذ");
  const [schoolName, setSchoolName] = useState("");
  const [category, setCategory] = useState<AdminInquiryCategory>("general");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // نتيجة الإرسال الناجح
  const [submittedTicket, setSubmittedTicket] = useState<AdminInquiry | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // تبويب التتبع وقائمة التذاكر المحلية
  const [searchCodeInput, setSearchCodeInput] = useState(initialCode);
  const [searchTokenInput, setSearchTokenInput] = useState(initialToken);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedInquiry, setTrackedInquiry] = useState<AdminInquiry | null>(null);
  const [trackingError, setTrackingError] = useState("");

  // قائمة التذاكر المحفوظة في هذا المتصفح
  const [localTickets, setLocalTickets] = useState<AdminInquiry[]>([]);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [syncingLocal, setSyncingLocal] = useState(false);

  // التحقق من جلسة المستخدم الحالي لتعبئة البيانات تلقائياً
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from("profiles")
          .select("id, full_name, email, role, school_name")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setCurrentUser({
                id: data.id,
                fullName: data.full_name || "",
                email: data.email || session.user.email || "",
                role: data.role || "teacher",
                schoolName: data.school_name || "",
              });
              setSenderName(data.full_name || "");
              setSenderEmail(data.email || session.user.email || "");
              setSchoolName(data.school_name || "");
              setSenderRole(
                data.role === "admin"
                  ? "إدارة"
                  : data.role === "inspector"
                  ? "مفتش"
                  : data.role === "principal"
                  ? "مدير مؤسسة"
                  : "أستاذ"
              );
            }
          });
      }
    });
  }, []);

  // جلب التذاكر المحلية عند التحميل
  useEffect(() => {
    const list = getLocalAdminTickets();
    setLocalTickets(list);
    if (list.length > 0) {
      syncLocalTickets(list);
    }
  }, []);

  // البحث التلقائي إذا جاء الرابط مع بارامتر code
  useEffect(() => {
    if (initialCode) {
      handleTrackByCode(initialCode, initialToken);
    }
  }, [initialCode, initialToken]);

  // مزامنة التذاكر المحلية مع الخادم لجلب الردود الجديدة
  const syncLocalTickets = async (currentList: AdminInquiry[]) => {
    if (!currentList.length) return;
    setSyncingLocal(true);
    try {
      const ticketsToQuery = currentList.map((t) => ({
        trackingCode: t.trackingCode,
        secretToken: t.secretToken,
      }));

      const res = await fetch("/api/admin-inquiries/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickets: ticketsToQuery }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.inquiries)) {
          // تحديث التذاكر المحلية
          data.inquiries.forEach((item: AdminInquiry) => {
            saveAdminTicketLocally(item);
          });
          setLocalTickets(getLocalAdminTickets());
        }
      }
    } catch (err) {
      console.warn("Error syncing tickets:", err);
    } finally {
      setSyncingLocal(false);
    }
  };

  // استعلام عن تذكرة برمز التتبع والرمز السري
  const handleTrackByCode = async (codeToSearch: string, tokenToSearch?: string) => {
    const cleanCode = codeToSearch.trim().toUpperCase();
    if (!cleanCode) {
      setTrackingError("يرجى إدخال رمز التتبع (مثال: ADM-1234-DZ)");
      return;
    }

    setTrackingLoading(true);
    setTrackingError("");
    setTrackedInquiry(null);

    try {
      const url = new URL("/api/admin-inquiries/track", window.location.origin);
      url.searchParams.set("code", cleanCode);
      if (tokenToSearch?.trim()) {
        url.searchParams.set("token", tokenToSearch.trim());
      }

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!res.ok) {
        setTrackingError(data.error || "لم يتم العثور على تذكرة مطابقة بهذا الرمز.");
        return;
      }

      if (data.inquiry) {
        setTrackedInquiry(data.inquiry);
        // حفظها محلياً أيضاً لسهولة الرجوع
        saveAdminTicketLocally(data.inquiry);
        setLocalTickets(getLocalAdminTickets());
      }
    } catch {
      setTrackingError("تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت وحاول مجدداً.");
    } finally {
      setTrackingLoading(false);
    }
  };

  // إرسال الرسالة إلى إدارة المنصة
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!isAnonymous && !senderName.trim()) {
      setErrorMsg("يرجى كتابة الاسم واللقب، أو تفعيل خيار «إرسال من مجهول» للسرية التامة.");
      return;
    }

    if (!title.trim() || title.trim().length < 4) {
      setErrorMsg("يرجى كتابة عنوان واضح للرسالة (4 أحرف على الأقل).");
      return;
    }

    if (!content.trim() || content.trim().length < 10) {
      setErrorMsg("يرجى كتابة نص الرسالة وتفاصيل الانشغال (10 أحرف على الأقل).");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        category,
        title: title.trim(),
        content: content.trim(),
        isAnonymous,
        senderName: isAnonymous ? undefined : senderName.trim(),
        senderEmail: isAnonymous ? undefined : senderEmail.trim() || undefined,
        senderPhone: isAnonymous ? undefined : senderPhone.trim() || undefined,
        senderRole: isAnonymous ? undefined : senderRole.trim() || undefined,
        schoolName: isAnonymous ? undefined : schoolName.trim() || undefined,
        teacherId: isAnonymous ? undefined : currentUser?.id || undefined,
      };

      const res = await fetch("/api/admin-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة لاحقاً.");
        return;
      }

      if (data.inquiry) {
        // حفظ محلي في المتصفح لضمان وصول الرد
        saveAdminTicketLocally(data.inquiry);
        setLocalTickets(getLocalAdminTickets());
        setSubmittedTicket(data.inquiry);
        // تصفير الحقول
        setTitle("");
        setContent("");
      }
    } catch {
      setErrorMsg("تعذر إرسال الرسالة. تحقق من اتصال الإنترنت وحاول مجدداً.");
    } finally {
      setSubmitting(false);
    }
  };

  // نسخ كود التتبع
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // نسخ رابط التتبع السري المباشر
  const handleCopyLink = (code: string, token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/contact?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // حذف تذكرة من المتصفح
  const handleDeleteTicket = (idOrCode: string) => {
    if (confirm("هل تريد إزالة هذه التذكرة من سجل هذا المتصفح؟ لن تُحذف من خادم الإدارة.")) {
      removeLocalAdminTicket(idOrCode);
      setLocalTickets(getLocalAdminTickets());
      if (trackedInquiry?.trackingCode === idOrCode || trackedInquiry?.id === idOrCode) {
        setTrackedInquiry(null);
      }
    }
  };

  // الحصول على معلومات التصنيف
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

  return (
    <div className="min-h-screen bg-[#fcfcf9] py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ─── ترويسة الصفحة ─── */}
        <div className="bg-gradient-to-br from-[#0a4b35] via-[#107a57] to-[#14966c] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-[#107a57]/15 relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-300/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-xs font-bold border border-white/20 mb-3">
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>بريد إدارة المنصة والمشرف العام</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                تواصل مباشر مع مدير المنصة
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 mt-2 max-w-xl leading-relaxed">
                فضاء مخصص للأساتذة والزوار لطرح الأسئلة، الاقتراحات، والملاحظات البيداغوجية والتقنية — يمكنك الإرسال باسمك أو بسرية تامة من مجهول 🎭 مع ضمان وصول الرد بدقة ومتابعته في أي وقت.
              </p>
            </div>

            <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto shrink-0">
              <Link
                href="/"
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition w-full sm:w-auto"
              >
                <span>العودة للرئيسية</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </Link>
            </div>
          </div>
        </div>

        {/* ─── أزرار التبديل بين الإرسال والمتابعة ─── */}
        <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setActiveTab("send")}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition ${
              activeTab === "send"
                ? "bg-[#107a57] text-white shadow-md shadow-[#107a57]/20"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>إرسال رسالة جديدة ✍️</span>
          </button>

          <button
            onClick={() => setActiveTab("track")}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition relative ${
              activeTab === "track"
                ? "bg-[#107a57] text-white shadow-md shadow-[#107a57]/20"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>متابعة الردود وتذاكري 📬</span>
            {localTickets.some((t) => t.status === "answered") && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse" />
            )}
            {localTickets.length > 0 && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                {localTickets.length}
              </span>
            )}
          </button>
        </div>

        {/* ───────────────────────────────────────────────────────── */}
        {/* التبويب الأول: إرسال رسالة جديدة                          */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === "send" && (
          <div className="space-y-6">
            {/* بطاقة نجاح الإرسال الفوري */}
            {submittedTicket && (
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-300 shadow-lg shadow-emerald-500/10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
                      <span>تم الاستلام بنجاح 📬</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-emerald-950">
                      وصلت رسالتك لإدارة المنصة بنجاح!
                    </h2>
                    <p className="text-xs sm:text-sm text-emerald-800 mt-1 leading-relaxed">
                      تم حفظ تذكرتك في قاعدة البيانات وفي هذا المتصفح تلقائياً. سيقوم مدير المنصة بمراجعتها والرد عليها بدقة.
                    </p>
                  </div>
                </div>

                {/* كود التتبع ورابط التتبع الخاص */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200 space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-100">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block">
                        رمز التتبع الموحد لتذكرتك:
                      </span>
                      <span className="font-mono text-xl sm:text-2xl font-black text-[#107a57] tracking-wider">
                        {submittedTicket.trackingCode}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCode(submittedTicket.trackingCode)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>تم النسخ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>نسخ رمز التتبع</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-slate-500 block">
                        الرابط السري المباشر للاطلاع على الرد من أي هاتف أو جهاز:
                      </span>
                      <span className="text-xs text-slate-600 font-mono truncate block max-w-md">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/contact?code=${submittedTicket.trackingCode}`
                          : ""}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopyLink(
                          submittedTicket.trackingCode,
                          submittedTicket.secretToken || ""
                        )
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#107a57] hover:bg-[#0c6145] text-white text-xs font-bold transition shadow-xs"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>تم نسخ الرابط!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span>نسخ الرابط المباشر</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setActiveTab("track");
                      setTrackedInquiry(submittedTicket);
                    }}
                    className="btn-primary text-xs py-2.5 px-4"
                  >
                    <span>معاينة التذكرة في سجل المراسلات 📋</span>
                  </button>

                  <button
                    onClick={() => setSubmittedTicket(null)}
                    className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-900 hover:bg-emerald-100 text-xs font-bold transition"
                  >
                    إرسال رسالة أخرى ✍️
                  </button>
                </div>
              </div>
            )}

            {/* استمارة كتابة الرسالة */}
            {!submittedTicket && (
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6"
              >
                {/* 1. اختيار الهوية: بهويتي أو من مجهول */}
                <div className="space-y-3">
                  <label className="text-xs sm:text-sm font-black text-slate-800 block">
                    1. كيفية إرسال الرسالة وهويتك:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAnonymous(false)}
                      className={`p-4 rounded-2xl border-2 text-right transition flex items-start gap-3 ${
                        !isAnonymous
                          ? "border-[#107a57] bg-emerald-50/50 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          !isAnonymous
                            ? "bg-[#107a57] text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-black text-slate-900">
                            بهويتي ومعلوماتي الشخصية
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          أكتب اسمي، بريدي أو هاتفي لتصلني إشعارات أو لتواصل الإدارة معي مباشرة.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAnonymous(true)}
                      className={`p-4 rounded-2xl border-2 text-right transition flex items-start gap-3 ${
                        isAnonymous
                          ? "border-amber-500 bg-amber-50/50 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isAnonymous
                            ? "bg-amber-500 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <EyeOff className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-black text-slate-900">
                            رسالة سرية من مجهول 🎭
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                          لن يتم حفظ اسمك أو بريدك أو أي بيانات عنك. ستحصل على كود تتبع سري لمعاينة الرد.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* تنبيه السرية التامة */}
                  {isAnonymous && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">أمان وسرية تامة:</span> لا يتم ربط حسابك بهذه الرسالة ولا يمكن لأي طرف معرفة هوية المرسل. سيتم تزويدك بكود تتبع خاص فور الإرسال لتقرأ رد الإدارة بكل أمان.
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. بيانات المرسل (تظهر فقط إذا لم يكن مجهولاً) */}
                {!isAnonymous && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <label className="text-xs sm:text-sm font-black text-slate-800 block">
                      2. معلومات التواصل والتعريف:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          الاسم واللقب <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="مثال: الأستاذ محمد بن علي"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] outline-none transition"
                          />
                          <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          الصفة أو الرتبة
                        </label>
                        <select
                          value={senderRole}
                          onChange={(e) => setSenderRole(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] outline-none transition bg-white"
                        >
                          <option value="أستاذ">👨‍🏫 أستاذ(ة) تعليم متوسط</option>
                          <option value="ولي تلميذ">👨‍👩‍👧 ولي تلميذ</option>
                          <option value="تلميذ">🎓 تلميذ(ة)</option>
                          <option value="مفتش">🛡️ مفتش إدارة أو بيداغوجي</option>
                          <option value="مدير مؤسسة">🏫 مدير متوسطة أو ناظر</option>
                          <option value="زائر">🌐 زائر مهتم</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          رقم الهاتف / الواتساب (اختياري، للرد السريع)
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            placeholder="06XXXXXXXX أو 07XXXXXXXX"
                            value={senderPhone}
                            onChange={(e) => setSenderPhone(e.target.value)}
                            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] outline-none transition font-mono"
                          />
                          <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          البريد الإلكتروني (اختياري)
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            placeholder="name@example.com"
                            value={senderEmail}
                            onChange={(e) => setSenderEmail(e.target.value)}
                            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] outline-none transition font-mono"
                          />
                          <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          المؤسسة أو البلدية (اختياري)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="مثال: متوسطة الشهيد بن باديس - الوادي"
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                            className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] outline-none transition"
                          />
                          <Building2 className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. تصنيف الرسالة */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="text-xs sm:text-sm font-black text-slate-800 block">
                    {isAnonymous ? "2. نوع وتصنيف الرسالة:" : "3. نوع وتصنيف الرسالة:"}
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {ADMIN_INQUIRY_CATEGORIES.map((cat) => {
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`p-3 rounded-2xl border text-right transition flex flex-col justify-between ${
                            isSelected
                              ? "border-[#107a57] bg-emerald-50/70 shadow-xs ring-1 ring-[#107a57]"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <span className="text-xs font-black text-slate-900 block mb-1">
                            {cat.label}
                          </span>
                          <span className="text-[10px] text-slate-500 leading-tight block">
                            {cat.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. عنوان ومحتوى الرسالة */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <label className="text-xs sm:text-sm font-black text-slate-800 block">
                    {isAnonymous ? "3. نص الرسالة والتفاصيل:" : "4. نص الرسالة والتفاصيل:"}
                  </label>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      عنوان الرسالة أو الموضوع <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: استفسار حول تنسيق المخطط الأسبوعي للدفتر اليومي"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] outline-none transition font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      نص الرسالة أو الاستفسار بالتفصيل <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="اكتب هنا كل تفاصيل انشغالك أو استفسارك بوضوح حتى يتسنى لإدارة المنصة الرد عليك بدقة وافية..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full p-3.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] outline-none transition font-medium leading-relaxed"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                      <span>الحد الأدنى 10 أحرف</span>
                      <span>{content.length} حرف</span>
                    </div>
                  </div>
                </div>

                {/* رسالة الخطأ */}
                {errorMsg && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* زر الإرسال */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#107a57] hover:bg-[#0c6145] text-white text-sm font-black shadow-lg shadow-[#107a57]/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جارٍ إرسال الرسالة إلى إدارة المنصة...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {isAnonymous
                            ? "إرسال الرسالة بسرية تامة من مجهول 🎭"
                            : "إرسال الرسالة لمدير المنصة 🚀"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* التبويب الثاني: متابعة الردود وتذاكري                      */}
        {/* ───────────────────────────────────────────────────────── */}
        {activeTab === "track" && (
          <div className="space-y-6">
            {/* البحث بكود التتبع */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#107a57]" />
                  <span>الاستعلام عن تذكرة برمز التتبع</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  أدخل رمز التتبع السري الذي حصلت عليه عند إرسال رسالتك (مثال: ADM-1234-DZ).
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTrackByCode(searchCodeInput, searchTokenInput);
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="رمز التتبع (مثال: ADM-1234-DZ)"
                    value={searchCodeInput}
                    onChange={(e) => setSearchCodeInput(e.target.value.toUpperCase())}
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] outline-none transition uppercase"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>

                <button
                  type="submit"
                  disabled={trackingLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#107a57] hover:bg-[#0c6145] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {trackingLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  )}
                  <span>معاينة الرد</span>
                </button>
              </form>

              {trackingError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{trackingError}</span>
                </div>
              )}
            </div>

            {/* نتيجة البحث الفردي المعروضة حالياً */}
            {trackedInquiry && (
              <div className="bg-white rounded-3xl border-2 border-emerald-500 shadow-md p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-[#107a57]">
                      {trackedInquiry.trackingCode}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        getCategoryMeta(trackedInquiry.category).badgeBg
                      } ${getCategoryMeta(trackedInquiry.category).badgeText} ${
                        getCategoryMeta(trackedInquiry.category).badgeBorder
                      }`}
                    >
                      {getCategoryMeta(trackedInquiry.category).label}
                    </span>
                  </div>

                  <div>
                    {trackedInquiry.status === "answered" ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تم الرد من إدارة المنصة 🟢</span>
                      </span>
                    ) : trackedInquiry.status === "closed" ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                        <span>مغلقة</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>بانتظار رد الإدارة ⏳</span>
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900">{trackedInquiry.title}</h3>
                  <p className="text-xs text-slate-700 mt-2 p-3.5 rounded-xl bg-slate-50 border border-slate-100 whitespace-pre-wrap leading-relaxed">
                    {trackedInquiry.content}
                  </p>
                  <div className="text-[10px] text-slate-400 mt-1">
                    تاريخ الإرسال: {new Date(trackedInquiry.createdAt).toLocaleDateString("ar-DZ")}
                  </div>
                </div>

                {/* صندوق رد إدارة المنصة */}
                {trackedInquiry.adminReply ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                        <Crown className="w-4 h-4 text-emerald-700" />
                        <span>رد إدارة المنصة والمشرف العام 🏛️</span>
                      </div>
                      {trackedInquiry.repliedAt && (
                        <span className="text-[10px] text-emerald-700 font-bold">
                          {new Date(trackedInquiry.repliedAt).toLocaleDateString("ar-DZ")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-emerald-900 whitespace-pre-wrap leading-relaxed font-medium">
                      {trackedInquiry.adminReply}
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      رسالتك قيد المراجعة لدى مدير المنصة، وسيظهر الرد هنا فور اعتماده. يمكنك العودة لهذه الصفحة في أي وقت.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* قائمة التذاكر المحفوظة في هذا المتصفح */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#107a57]" />
                    <span>سجل رسائلك المحفوظة في هذا المتصفح</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    يتم حفظ مراسلاتك هنا تلقائياً لتقرأ رد الإدارة فور صدوره دون الحاجة لكتابة الكود مجدداً.
                  </p>
                </div>

                {localTickets.length > 0 && (
                  <button
                    onClick={() => syncLocalTickets(localTickets)}
                    disabled={syncingLocal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingLocal ? "animate-spin" : ""}`} />
                    <span>تحديث الردود</span>
                  </button>
                )}
              </div>

              {localTickets.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <MessageSquare className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">لا توجد رسائل سابقة محفوظة في هذا المتصفح.</p>
                  <button
                    onClick={() => setActiveTab("send")}
                    className="inline-flex items-center gap-1 text-xs text-[#107a57] font-bold hover:underline"
                  >
                    إرسال رسالة جديدة الآن ✍️
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {localTickets.map((ticket) => {
                    const isExpanded = expandedTicketId === ticket.id || expandedTicketId === ticket.trackingCode;
                    const catMeta = getCategoryMeta(ticket.category);
                    const isAnswered = ticket.status === "answered";

                    return (
                      <div
                        key={ticket.id || ticket.trackingCode}
                        className={`rounded-2xl border transition overflow-hidden ${
                          isAnswered
                            ? "border-emerald-300 bg-emerald-50/20"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        {/* شريط رأس التذكرة */}
                        <div
                          onClick={() =>
                            setExpandedTicketId(isExpanded ? null : ticket.id || ticket.trackingCode)
                          }
                          className="p-4 cursor-pointer hover:bg-slate-50/80 transition flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-black text-[#107a57]">
                                  {ticket.trackingCode}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catMeta.badgeBg} ${catMeta.badgeText} ${catMeta.badgeBorder}`}
                                >
                                  {catMeta.label}
                                </span>
                                {ticket.isAnonymous && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                    مجهول 🎭
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate mt-1">
                                {ticket.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isAnswered ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">رد الإدارة متاح 🟢</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span className="hidden sm:inline">بانتظار الرد ⏳</span>
                              </span>
                            )}

                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* التفاصيل عند الفتح */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">
                            <div className="text-xs text-slate-700 p-3 rounded-xl bg-slate-50 border border-slate-100 whitespace-pre-wrap leading-relaxed">
                              {ticket.content}
                            </div>

                            {/* رد الإدارة إذا وجد */}
                            {ticket.adminReply ? (
                              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-black text-emerald-950">
                                  <span>رد إدارة المنصة 🏛️:</span>
                                  {ticket.repliedAt && (
                                    <span className="text-[10px] text-emerald-700 font-normal">
                                      {new Date(ticket.repliedAt).toLocaleDateString("ar-DZ")}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs sm:text-sm text-emerald-900 whitespace-pre-wrap leading-relaxed">
                                  {ticket.adminReply}
                                </p>
                              </div>
                            ) : (
                              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs">
                                رسالتك مسجلة لدى إدارة المنصة وبانتظار الرد. اضغط «تحديث الردود» للاطلاع على أي جديد.
                              </div>
                            )}

                            {/* أزرار التحكم بالتذكرة */}
                            <div className="flex items-center justify-between gap-2 pt-2 text-xs">
                              <button
                                onClick={() => handleCopyCode(ticket.trackingCode)}
                                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-bold"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>نسخ الكود</span>
                              </button>

                              <button
                                onClick={() =>
                                  handleDeleteTicket(ticket.id || ticket.trackingCode)
                                }
                                className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-700 font-bold"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف من السجل</span>
                              </button>
                            </div>
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
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fcfcf9] flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#107a57]" />
        </div>
      }
    >
      <ContactPageInner />
    </Suspense>
  );
}
