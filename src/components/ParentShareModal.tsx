"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  X,
  Copy,
  Check,
  QrCode,
  Download,
  Share2,
  Printer,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Key,
} from "lucide-react";

interface ParentShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherName: string;
  teacherCode: string;
  schoolName?: string;
  slug?: string;
}

export function ParentShareModal({
  isOpen,
  onClose,
  teacherName,
  teacherCode,
  schoolName = "متوسطة ولاية الوادي",
  slug,
}: ParentShareModalProps) {
  const [dataUrl, setDataUrl] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/t/${slug || teacherCode}`
    : `/t/${slug || teacherCode}`;

  const homeUrl = typeof window !== "undefined" ? window.location.origin : "https://math-eloued.dz";

  // توليد رمز QR
  useEffect(() => {
    if (isOpen && publicUrl) {
      QRCode.toDataURL(publicUrl, {
        width: 600,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#064e3b", light: "#ffffff" },
      })
        .then(setDataUrl)
        .catch(() => setDataUrl(""));
    }
  }, [isOpen, publicUrl]);

  if (!isOpen) return null;

  // نص الرسالة الموجهة للأولياء
  const whatsappMessage = `السلام عليكم ورحمة الله وبركاته،
أولياء التلاميذ المحترمين:
لمتابعة دروس، سبورة مادة الرياضيات، والواجبات المنزلية لأبنائكم، يرجى الدخول إلى المنصة الرسمية:
🔗 الرابط المباشر: ${publicUrl}
🔑 أو ادخل إلى المنصة: ${homeUrl} واكتب كود الأستاذ: *${teacherCode}*

الأستاذ(ة): ${teacherName}
${schoolName}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(teacherCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    } catch {}
  };

  const handleOpenWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, "_blank");
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      {/* نافذة المودال */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* الترويسة */}
        <div className="bg-gradient-to-l from-emerald-900 via-emerald-800 to-teal-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-300">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">بطاقة مشاركة الكود مع الأولياء</h2>
              <p className="text-xs text-emerald-200">
                كيف يتابع ولي التلميذ دروس وسبورة {teacherName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* محتوى المودال القابل للتمرير */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* 1. بطاقة الكود البارزة */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border-2 border-emerald-500/30 rounded-3xl p-5 text-center space-y-3 shadow-inner">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest bg-emerald-100/80 px-3 py-1 rounded-full">
              كود الأستاذ المخصص للأولياء
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl sm:text-4xl font-mono font-black text-emerald-950 tracking-wider">
                {teacherCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? "تم النسخ" : "نسخ الكود"}</span>
              </button>
            </div>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              يدخل الولي إلى الصفحة الرئيسية ويكتب هذا الكود فقط في خانة <strong>«فضاء الولي والتلميذ»</strong> ليفتح له كراس القسم والسبورة والواجبات فوراً.
            </p>
          </div>

          {/* 2. الإرسال عبر واتساب / وسائل التواصل */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>رسالة جاهزة لمجموعات الأولياء (WhatsApp / Telegram)</span>
              </div>
              <button
                onClick={handleOpenWhatsApp}
                className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>مشاركة بالواتساب</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-line relative">
              {whatsappMessage}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleCopyMessage}
                className="py-2 px-3.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedMsg ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedMsg ? "تم نسخ نص الرسالة ✓" : "نسخ الرسالة كاملة"}</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="py-2 px-3.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Key className="w-4 h-4" />}
                <span>{copiedLink ? "تم نسخ الرابط ✓" : "نسخ الرابط المباشر"}</span>
              </button>
            </div>
          </div>

          {/* 3. رمز QR ووصل مطبوع للأولياء */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
            <div className="w-36 h-36 rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 flex items-center justify-center shrink-0 p-2">
              {dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dataUrl} alt="QR Code" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <QrCode className="w-12 h-12 text-slate-300" />
              )}
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-right">
              <h3 className="font-bold text-sm text-slate-800">
                رمز الاستجابة السريعة (QR Code)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                يمكن للولي فتح الكاميرا في هاتفه ومسح الرمز ليدخل مباشرة لدروس ابنه دون كتابة أي رابط.
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {dataUrl && (
                  <a
                    href={dataUrl}
                    download={`qr-code-${teacherCode}.png`}
                    className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل صورة الرمز</span>
                  </a>
                )}
                <button
                  onClick={handlePrintSlip}
                  className="py-2 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة وصل إشعار الأولياء 🖨️</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. قسم الوصل الورقي المطبوع (المخصص للطباعة) */}
          <div className="border-t border-slate-200 pt-4" ref={printAreaRef}>
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-200 pb-2">
                <span>الجمهورية الجزائرية الديمقراطية الشعبية — مديرية التربية لولاية الوادي</span>
                <span className="font-bold text-emerald-800">وصل متابعة مادة الرياضيات</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-slate-900">{teacherName}</h4>
                  <p className="text-xs text-slate-600">{schoolName}</p>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block">كود الأستاذ للمنصة:</span>
                  <span className="font-mono font-black text-base text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                    {teacherCode}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                عزيزي ولي التلميذ: لمتابعة دروس مادة الرياضيات، صورة السبورة اليومية، كراس القسم، والواجبات المنزلية، تفضل بمسح رمز الاستجابة السريعة أعلاه أو ادخل إلى المنصة واكتب كود الأستاذ.
              </p>
            </div>
          </div>
        </div>

        {/* التذييل */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>منصة رياضيات ولاية الوادي — الرقمنة في خدمة التلميذ والولي</span>
          <button
            onClick={onClose}
            className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
