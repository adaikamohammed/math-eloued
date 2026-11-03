"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  MessageCircle,
  RotateCcw,
  Clock,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  Building2,
  Calendar,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { ParentInquiry } from "@/lib/types";
import { INQUIRY_CATEGORIES } from "@/lib/inquiries";
import {
  getLocalInquiries,
  removeLocalInquiry,
  syncLocalInquiriesWithServer,
} from "@/lib/parentInquiriesStore";

interface ParentInquiriesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewInquiry?: () => void;
}

export function ParentInquiriesListModal({
  isOpen,
  onClose,
  onOpenNewInquiry,
}: ParentInquiriesListModalProps) {
  const [inquiries, setInquiries] = useState<ParentInquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "answered" | "pending">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const initial = getLocalInquiries();
      setInquiries(initial);
      setLoading(true);
      syncLocalInquiriesWithServer()
        .then((synced) => {
          setInquiries(synced);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRemove = (id: string) => {
    if (confirm("هل ترغب في إزالة هذا الاستفسار من هاتفك؟")) {
      removeLocalInquiry(id);
      setInquiries((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const filteredInquiries = inquiries.filter((inq) => {
    if (filter === "answered") return inq.status === "answered" || Boolean(inq.reply);
    if (filter === "pending") return inq.status !== "answered" && !inq.reply;
    return true;
  });

  const answeredCount = inquiries.filter((i) => i.status === "answered" || Boolean(i.reply)).length;
  const pendingCount = inquiries.length - answeredCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* رأس النافذة */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                استفساراتي مع الأساتذة 👨‍👩‍👧‍👦
              </h3>
              <p className="text-xs text-slate-500">
                متابعة ردود وتوجيهات الأساتذة بخصوص أبنائك
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* أزرار التصفية والتحديث */}
        <div className="p-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filter === "all"
                  ? "bg-white text-slate-900 shadow-2xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              الكل ({inquiries.length})
            </button>
            <button
              onClick={() => setFilter("answered")}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filter === "answered"
                  ? "bg-white text-emerald-800 shadow-2xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              تم الرد ({answeredCount}) 🟢
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filter === "pending"
                  ? "bg-white text-amber-800 shadow-2xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              قيد الانتظار ({pendingCount}) ⏳
            </button>
          </div>

          <button
            onClick={() => {
              setLoading(true);
              syncLocalInquiriesWithServer()
                .then((synced) => setInquiries(synced))
                .finally(() => setLoading(false));
            }}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
            title="تحديث ومزامنة الردود"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>

        {/* قائمة الاستفسارات */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5">
          {inquiries.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                💬
              </div>
              <h4 className="text-sm font-black text-slate-800">
                لا توجد استفسارات مسجلة بعد
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                يمكنك توجيه استفسار لأي أستاذ من بطاقته في محفظة العائلة أو صفحته الرسمية، وسيظهر رده هنا فور كتابته.
              </p>
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-bold">
              لا توجد استفسارات مطابقة للفلتر المحدد.
            </div>
          ) : (
            filteredInquiries.map((inq) => {
              const hasReply = Boolean(inq.reply && inq.reply.content);
              const catConfig =
                INQUIRY_CATEGORIES.find((c) => c.id === inq.category) || INQUIRY_CATEGORIES[5];

              let dateFormatted = "";
              try {
                dateFormatted = new Intl.DateTimeFormat("ar-DZ", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(inq.createdAt));
              } catch {
                dateFormatted = inq.createdAt;
              }

              return (
                <div
                  key={inq.id}
                  className={`rounded-2xl p-4 border transition space-y-3 ${
                    hasReply
                      ? "bg-white border-emerald-300 shadow-xs ring-1 ring-emerald-500/10"
                      : "bg-white border-slate-200/90 shadow-2xs"
                  }`}
                >
                  {/* رأس البطاقة */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* حالة الرد */}
                      {hasReply ? (
                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>وصل رد الأستاذ 🟢</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>قيد انتظار رد الأستاذ ⏳</span>
                        </span>
                      )}

                      {/* موضوع الاستفسار */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${catConfig.badgeBg} ${catConfig.badgeText} ${catConfig.badgeBorder}`}
                      >
                        {catConfig.label}
                      </span>

                      {/* كود التتبع */}
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                        {inq.trackingCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyCode(inq.id, inq.trackingCode)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title="نسخ كود التتبع"
                      >
                        {copiedId === inq.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleRemove(inq.id)}
                        className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="حذف من جهازي"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* بيانات التلميذ والأستاذ */}
                  <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-700 gap-1">
                    <span>
                      👨‍🏫 الأستاذ: <span className="text-slate-900">{inq.teacherName || "أستاذ المادة"}</span>
                      {inq.subject ? ` (${inq.subject})` : ""}
                    </span>
                    <span className="text-slate-500 font-medium text-[11px]">
                      🎒 التلميذ: <strong className="text-slate-800">{inq.studentName}</strong> ({inq.studentGroup})
                    </span>
                  </div>

                  {/* نص سؤال الولي */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    <span className="font-bold text-slate-400 block mb-0.5 text-[10px]">سؤالك:</span>
                    {inq.content}
                  </div>

                  {/* فقاعة رد الأستاذ إن توفر */}
                  {hasReply && inq.reply ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-1.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-[11px] font-black text-emerald-800 border-b border-emerald-200/60 pb-1">
                        <span className="flex items-center gap-1">
                          <span>رد الأستاذ {inq.reply.teacherName || inq.teacherName} 🌸:</span>
                        </span>
                        <span className="text-[10px] text-emerald-600 font-normal">
                          {inq.reply.repliedAt ? new Date(inq.reply.repliedAt).toLocaleDateString("ar-DZ") : ""}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-line font-medium text-emerald-900">
                        {inq.reply.content}
                      </p>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-700 bg-amber-50/60 px-3 py-1.5 rounded-xl border border-amber-200/60 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>استفسارك بانتظار رد الأستاذ، سيظهر الرد هنا تلقائياً بمجرد اعتماده.</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* أسفل النافذة */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            منصة جسور التعليمية — جسر تواصل آمن ومباشر بين الأستاذ والولي والتلميذ
          </p>
        </div>
      </div>
    </div>
  );
}
