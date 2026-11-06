"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  Loader2,
  CheckCircle2,
  MessageCircle,
  HelpCircle,
  BookOpen,
  UserCheck,
  Calendar,
  Building2,
  Phone,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { InquiryCategory, ParentInquiry } from "@/lib/types";
import { INQUIRY_CATEGORIES } from "@/lib/inquiries";
import { saveInquiryLocally } from "@/lib/parentInquiriesStore";

interface ParentInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: {
    id?: string;
    code?: string;
    name: string;
    subject?: string;
    school?: string;
    classes?: string[];
  };
  initialStudentName?: string;
  initialStudentGroup?: string;
  onSuccess?: (inquiry: ParentInquiry) => void;
}

export function ParentInquiryModal({
  isOpen,
  onClose,
  teacher,
  initialStudentName = "",
  initialStudentGroup = "",
  onSuccess,
}: ParentInquiryModalProps) {
  const [parentName, setParentName] = useState("");
  const [studentName, setStudentName] = useState(initialStudentName);
  const [studentGroup, setStudentGroup] = useState(initialStudentGroup);
  const [customGroup, setCustomGroup] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [category, setCategory] = useState<InquiryCategory>("grade");
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedInquiry, setSubmittedInquiry] = useState<ParentInquiry | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (initialStudentName) setStudentName(initialStudentName);
    if (initialStudentGroup) setStudentGroup(initialStudentGroup);
  }, [initialStudentName, initialStudentGroup]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const effectiveGroup = studentGroup === "other" ? customGroup.trim() : studentGroup.trim();

    if (!parentName.trim()) {
      setErrorMsg("يرجى كتابة اسم الولي الكريم");
      return;
    }
    if (!studentName.trim()) {
      setErrorMsg("يرجى كتابة اسم التلميذ(ة) كاملاً");
      return;
    }
    if (!effectiveGroup) {
      setErrorMsg("يرجى تحديد الفوج أو القسم (مثل 1م1 أو 2م3)");
      return;
    }
    if (content.trim().length < 5) {
      setErrorMsg("يرجى توضيح السؤال أو الملاحظة بشكل مفصل (5 أحرف على الأقل)");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: teacher.id,
          teacherCode: teacher.code,
          parentName: parentName.trim(),
          studentName: studentName.trim(),
          studentGroup: effectiveGroup,
          parentPhone: parentPhone.trim() || undefined,
          category,
          content: content.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "تعذر إرسال الاستفسار، يرجى المحاولة لاحقاً");
      }

      const inq = data.inquiry as ParentInquiry;
      // حفظ في ذاكرة الهاتف ومحفظة العائلة
      saveInquiryLocally(inq);
      setSubmittedInquiry(inq);
      if (onSuccess) onSuccess(inq);
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!submittedInquiry) return;
    navigator.clipboard.writeText(submittedInquiry.trackingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                استفسار وتواصل مع الأستاذ
              </h3>
              <p className="text-xs text-slate-500">
                {teacher.name} {teacher.subject ? `• ${teacher.subject}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* شاشة النجاح بعد الإرسال */}
        {submittedInquiry ? (
          <div className="py-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-lg font-black text-slate-900">
                تم إرسال استفسارك بنجاح للأستاذ 📨
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                وصلت رسالتك مباشرة إلى فضاء الأستاذ، وسيصلك رده البيداغوجي هنا في المنصة.
              </p>
            </div>

            {/* بطاقة كود التتبع */}
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-center space-y-2">
              <span className="text-[11px] font-bold text-emerald-800 block">
                كود تتبع الاستفسار الخاص بك:
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-lg font-black text-emerald-950 bg-white px-3 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                  {submittedInquiry.trackingCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer shadow-xs"
                  title="نسخ كود التتبع"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-emerald-700">
                ✓ تم حفظ هذا الاستفسار تلقائياً في هاتفك بمحفظة العائلة لمتابعة رد الأستاذ فوراً.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition cursor-pointer shadow-sm"
            >
              إغلاق النافذة
            </button>
          </div>
        ) : (
          /* استمارة الاستفسار */
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            {/* صف اسم الولي والتلميذ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الولي الكريم <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: أحمد بن علي"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold transition focus:border-emerald-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم التلميذ(ة) بالكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: ياسمين بن علي"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold transition focus:border-emerald-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            {/* صف الفوج والهاتف */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الفوج / القسم الدراسي <span className="text-rose-500">*</span>
                </label>
                {teacher.classes && teacher.classes.length > 0 ? (
                  <select
                    value={studentGroup}
                    onChange={(e) => setStudentGroup(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold transition focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="">-- اختر الفوج الدراسي --</option>
                    {teacher.classes.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                    <option value="other">قسم آخر (كتابة يدوية)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="مثال: 1م1 أو 2م3"
                    value={studentGroup}
                    onChange={(e) => setStudentGroup(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold transition focus:border-emerald-500 focus:outline-hidden"
                    required
                  />
                )}
                {studentGroup === "other" && (
                  <input
                    type="text"
                    placeholder="اكتب الفوج الدراسي هنا..."
                    value={customGroup}
                    onChange={(e) => setCustomGroup(e.target.value)}
                    className="w-full mt-2 py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold transition focus:border-emerald-500"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>رقم الهاتف (اختياري)</span>
                  <span className="text-[10px] text-slate-400">للتواصل أو واتساب</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="0661122334"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full py-2.5 pr-8 pl-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold transition focus:border-emerald-500 focus:outline-hidden font-mono"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* اختيار تصنيف الاستفسار */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                موضوع الاستفسار <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INQUIRY_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2 rounded-xl border text-right transition cursor-pointer text-xs ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-black shadow-2xs ring-1 ring-emerald-500"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 font-bold"
                      }`}
                    >
                      <div className="truncate">{cat.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* نص السؤال والملاحظة */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>نص السؤال أو الملاحظة البيداغوجية <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-slate-400">كن واضحاً ومحدداً</span>
              </label>
              <textarea
                rows={4}
                placeholder="السلام عليكم أستاذ، أود الاستفسار عن..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm font-medium transition focus:border-emerald-500 focus:outline-hidden leading-relaxed resize-none"
                required
              />
            </div>

            {/* زر الإرسال */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-lg shadow-emerald-700/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري إرسال الاستفسار...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>إرسال الاستفسار إلى الأستاذ 📨</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
