"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X, Copy, Check, Share2, QrCode, Heart, ExternalLink } from "lucide-react";
import type { SavedTeacher } from "./TeacherWallet";
import { buildFamilyShareUrl, buildWhatsAppShareUrl } from "@/lib/familyWallet";

interface FamilyWalletShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: SavedTeacher[];
}

export function FamilyWalletShareModal({
  isOpen,
  onClose,
  wallet,
}: FamilyWalletShareModalProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || wallet.length === 0) return;

    const url = buildFamilyShareUrl(wallet);
    setShareUrl(url);

    if (url) {
      QRCode.toDataURL(url, {
        width: 480,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#064e3b", light: "#ffffff" },
      })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(""));
    }
  }, [isOpen, wallet]);

  if (!isOpen) return null;

  const childrenNames = Array.from(
    new Set(wallet.map((t) => t.childName?.trim()).filter(Boolean))
  ) as string[];

  const waUrl = buildWhatsAppShareUrl(shareUrl, childrenNames);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full border border-emerald-100 shadow-2xl p-5 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* رأس النافذة */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 flex items-center justify-center font-black shrink-0">
              <Share2 className="w-5 h-5 text-[#107a57]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                مشاركة ونقل كافة الأساتذة إلى جهاز آخر
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                مزامنة فورية لنقل كافة الأساتذة المحفوظين لتجدهم في هاتفك الآخر أو جهاز العائلة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* إرشادات سريعة */}
        <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-xs text-emerald-900 leading-relaxed font-medium">
          💡 <strong>كيف تعمل المزامنة مع جهاز آخر؟</strong>
          <br />
          عند فتح هذا الرابط أو مسح الرمز من جهازك الآخر، ستنتقل قائمة كافة الأساتذة المحفوظين وتُخزّن تلقائياً لتتابع دروسهم وواجباتهم من أي جهاز دون إعادة إدخال الأكواد.
        </div>

        {/* رمز QR للمسح المباشر هاتف بهاتف */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5">
          <div className="w-48 h-48 sm:w-52 sm:h-52 bg-white rounded-2xl border border-slate-200/80 p-2 shadow-xs flex items-center justify-center">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="رمز QR لمشاركة محفظة الأساتذة"
                className="w-full h-full object-contain rounded-xl"
              />
            ) : (
              <QrCode className="w-12 h-12 text-slate-300 animate-pulse" />
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-bold text-center">
            امسح هذا الرمز بكاميرا جهازك الآخر لمزامنة كافة الأساتذة في ثانية واحدة
          </p>
        </div>

        {/* ملخص الأساتذة المشمولين بالمشاركة */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
            <span>كافة الأساتذة المنقولين للمحفظة ({wallet.length}):</span>
            {childrenNames.length > 0 && (
              <span className="text-emerald-700 font-black">
                👦 {childrenNames.join(" • ")}
              </span>
            )}
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-slate-50 rounded-xl border border-slate-100 custom-scrollbar">
            {wallet.map((t, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-1.5 bg-white rounded-lg border border-slate-100 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span>{t.subjectIcon || "📚"}</span>
                  <span className="font-bold text-slate-800 truncate">{t.name}</span>
                  <span className="text-[10px] text-slate-400 truncate">
                    ({t.subjectName || "مادة"})
                  </span>
                </div>
                <span className="font-mono text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 shrink-0">
                  {t.code}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* أزرار الإجراء السريع */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black flex items-center justify-center gap-2 transition shadow-xs"
          >
            <span>إرسال الرابط عبر واتساب 💬</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>تم نسخ الرابط العائلي ✓</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>نسخ رابط كافة الأساتذة</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
