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
  Layers,
} from "lucide-react";

interface ParentShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherName: string;
  teacherCode: string;
  schoolName?: string;
  slug?: string;
  levelsTaught?: number[];
}

export function ParentShareModal({
  isOpen,
  onClose,
  teacherName,
  teacherCode,
  schoolName = "متوسطة ولاية الوادي",
  slug,
  levelsTaught,
}: ParentShareModalProps) {
  const [dataUrl, setDataUrl] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedLvlCode, setCopiedLvlCode] = useState<number | null>(null);
  const [copiedLvlLink, setCopiedLvlLink] = useState<number | null>(null);

  const levels = Array.isArray(levelsTaught) && levelsTaught.length > 0 ? levelsTaught : [1, 2, 3, 4];

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

  // نص الرسالة العامة الموجهة للأولياء
  const whatsappMessage = `السلام عليكم ورحمة الله وبركاته،
أولياء التلاميذ المحترمين:
لمتابعة دروس، سبورة القسم، والواجبات المنزلية لأبنائكم، يرجى الدخول إلى المنصة الرسمية:
🔗 الرابط المباشر: ${publicUrl}
🔑 أو ادخل إلى المنصة: ${homeUrl} واكتب رمز الأستاذ: *${teacherCode}*

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

  const handleCopyLevelCode = async (lvl: number) => {
    const code = `${teacherCode}-${lvl}`;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedLvlCode(lvl);
      setTimeout(() => setCopiedLvlCode(null), 2000);
    } catch {}
  };

  const handleCopyLevelLink = async (lvl: number) => {
    const link = `${publicUrl}?lvl=${lvl}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLvlLink(lvl);
      setTimeout(() => setCopiedLvlLink(null), 2000);
    } catch {}
  };

  const handleShareLevelWhatsApp = (lvl: number) => {
    const lvlText = `السلام عليكم ورحمة الله وبركاته،
أولياء وتلاميذ السنة ${lvl} متوسط المحترمين:
لمتابعة كراس الدروس وصور السبورة اليومية والواجبات لمستوى ابنكم حصراً، يرجى الدخول عبر الرابط المباشر:
🔗 ${publicUrl}?lvl=${lvl}
🔑 أو ادخل للمنصة (${homeUrl}) واكتب رمز المستوى: *${teacherCode}-${lvl}*

الأستاذ(ة): ${teacherName}
${schoolName}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(lvlText)}`;
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
              <h2 className="text-base sm:text-lg font-bold">رموز ومشاركة الفضاء مع الأولياء</h2>
              <p className="text-xs text-emerald-200">
                شارك الرابط العام أو رمز كل مستوى لمتابعة الدروس والسبورة
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
          {/* قسم الرموز الخاصة بكل مستوى */}
          <div className="bg-emerald-50/70 border-2 border-emerald-500/30 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-emerald-950">
                  رموز المستويات المباشرة (كل مستوى يرى حصراً دروسه)
                </h3>
                <p className="text-[11px] text-emerald-700">
                  أعط أولياء كل مستوى رمزهم الخاص، ليفتح لهم فضاء وسبورة قسمهم فقط مع إخفاء باقي المستويات!
                </p>
              </div>
            </div>

            <div className="grid gap-2.5">
              {levels.map((lvl) => {
                const lvlCode = `${teacherCode}-${lvl}`;
                const isCodeCopied = copiedLvlCode === lvl;
                const isLinkCopied = copiedLvlLink === lvl;

                return (
                  <div
                    key={lvl}
                    className="bg-white rounded-2xl p-3 border border-emerald-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                        {lvl}م
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">السنة {lvl} متوسط:</span>
                          <code className="text-sm font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            {lvlCode}
                          </code>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          رابط مباشر يفتح دروس وسبورة السنة {lvl}م فقط
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
                      <button
                        onClick={() => handleCopyLevelCode(lvl)}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                        title="نسخ الرمز"
                      >
                        {isCodeCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCodeCopied ? "تم نسخ الرمز" : "نسخ الرمز"}</span>
                      </button>

                      <button
                        onClick={() => handleCopyLevelLink(lvl)}
                        className="py-1.5 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                        title="نسخ الرابط المباشر"
                      >
                        {isLinkCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Key className="w-3.5 h-3.5" />}
                        <span>{isLinkCopied ? "تم نسخ الرابط" : "نسخ الرابط"}</span>
                      </button>

                      <button
                        onClick={() => handleShareLevelWhatsApp(lvl)}
                        className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-2xs"
                        title="إرسال إلى مجموعة أولياء هذا المستوى في واتساب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>مشاركة واتساب</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 1. الرمز العام للأستاذ */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-center space-y-3">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest bg-slate-200/70 px-3 py-1 rounded-full">
              الرمز العام للأستاذ (يعرض جميع مستوياتك)
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-black text-slate-900 tracking-wider">
                {teacherCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? "تم النسخ" : "نسخ الرمز العام"}</span>
              </button>
            </div>
          </div>

          {/* 2. الإرسال عبر واتساب / وسائل التواصل */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>رسالة عامة جاهزة لمجموعات الأولياء</span>
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
                <span>{copiedMsg ? "تم نسخ الرسالة ✓" : "نسخ الرسالة"}</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="py-2 px-3.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Key className="w-4 h-4" />}
                <span>{copiedLink ? "تم نسخ الرابط ✓" : "نسخ الرابط العام"}</span>
              </button>
            </div>
          </div>

          {/* 3. رمز QR */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
            <div className="w-32 h-32 rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 flex items-center justify-center shrink-0 p-2">
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
                يمكن طباعة هذا الرمز أو إلصاقه في القسم أو في كراس التلميذ لمسحه بكاميرا الهاتف والوصول فوراً للفضاء.
              </p>
              {dataUrl && (
                <a
                  href={dataUrl}
                  download={`QR-${teacherCode}.png`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل صورة الرمز (PNG)</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* التذييل */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}