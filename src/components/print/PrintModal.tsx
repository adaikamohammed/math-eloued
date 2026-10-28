"use client";

import React, { useRef } from "react";
import { Printer, X, Download, HelpCircle, Eye } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  children: React.ReactNode;
}

export function PrintModal({ isOpen, onClose, documentTitle, children }: Props) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-sans text-right" dir="rtl">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
        {/* شريط التحكم العلوي (يُخفى تلقائياً عند الطباعة) */}
        <div className="no-print bg-gradient-to-r from-gray-900 to-slate-900 text-white p-4 px-6 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">{documentTitle}</h3>
              <p className="text-[11px] text-gray-300">
                معاينة الوثيقة الإدارية الرسمية قبل الطباعة أو الحفظ بصيغة PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-primary text-xs py-2 px-4 shadow-sm flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة / حفظ PDF 🖨️</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition font-bold"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* شريط الإرشادات والتلميح للطباعة النظيفة */}
        <div className="no-print bg-[#e6f4ee] border-b border-[#107a57]/20 p-2.5 px-6 text-[11px] text-[#0a5c40] font-medium flex items-center gap-2">
          <HelpCircle className="w-4 h-4 shrink-0 text-[#107a57]" />
          <span>
            <strong>نصيحة تقنية:</strong> للحصول على جودة وثيقة رسمية مثالية، اختر في نافذة الطباعة وجهة <strong>"حفظ بتنسيق PDF" (Save as PDF)</strong>، وتأكد من تفعيل خيار <strong>"الرسومات الخلفية" (Background graphics)</strong>.
          </span>
        </div>

        {/* مساحة المعاينة الورقية (محاكاة ورقة A4 على الشاشة) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-100 flex justify-center">
          <div className="printable-document bg-white w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-10 shadow-lg border border-gray-300 rounded-sm text-black">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
