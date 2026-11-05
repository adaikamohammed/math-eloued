"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Share, PlusSquare, CheckCircle2, Sparkles } from "lucide-react";

export function PwaInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. التحقق إن كان التطبيق مثبت ومفتوح كـ Standalone بالفعل
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(standaloneMode);
    if (standaloneMode) return;

    // 2. التحقق من تاريخ الإغلاق السابق (عدم الإزعاج لمدة 5 أيام)
    const lastDismissed = localStorage.getItem("jusoor_pwa_dismissed");
    if (lastDismissed) {
      const diff = Date.now() - parseInt(lastDismissed, 10);
      if (diff < 5 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }
    setDismissed(false);

    // 3. كشف نظام iOS (Safari)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. الاستماع لجاهزية التثبيت في أندرويد وكروم
    if ((window as any).__deferredPwaPrompt) {
      setCanInstall(true);
    }

    const onInstallable = () => setCanInstall(true);
    const onInstalled = () => {
      setCanInstall(false);
      setIsStandalone(true);
    };

    window.addEventListener("pwaInstallable", onInstallable);
    window.addEventListener("pwaInstalled", onInstalled);

    return () => {
      window.removeEventListener("pwaInstallable", onInstallable);
      window.removeEventListener("pwaInstalled", onInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }

    const deferredPrompt = (window as any).__deferredPwaPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setCanInstall(false);
      }
      (window as any).__deferredPwaPrompt = null;
    } else {
      // إذا لم يكن الحدث جاهزاً (مثلاً في بعض متصفحات الهاتف الأخرى)
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem("jusoor_pwa_dismissed", Date.now().toString());
    } catch {}
  };

  if (isStandalone || dismissed || (!canInstall && !isIOS)) {
    return null;
  }

  return (
    <>
      {/* ─── الشريط العائم السفلي لتثبيت التطبيق ─── */}
      <div
        dir="rtl"
        className="fixed bottom-16 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-gradient-to-r from-[#0a5c40] via-[#064e3b] to-[#043327] text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
            <Smartphone className="w-5 h-5 text-emerald-300 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black flex items-center gap-1.5 truncate">
              <span>تثبيت تطبيق جسور</span>
              <span className="text-[10px] bg-emerald-400 text-emerald-950 font-black px-1.5 py-0.5 rounded-full">
                مجاني وخفيف
              </span>
            </h4>
            <p className="text-[11px] text-emerald-100/90 truncate">
              تصفح فوري، وصول بدون إنترنت، وتنبيهات لحظية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 text-xs font-black transition flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تثبيت 📲</span>
          </button>
          <button
            onClick={handleDismiss}
            aria-label="إغلاق التنبيه"
            className="p-1 rounded-lg hover:bg-white/10 text-emerald-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── دليل التثبيت لهواتف آيفون (iOS Safari) ─── */}
      {showIosGuide && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-slate-900">
                  تثبيت منصة جسور على الآيفون
                </h3>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              لتثبيت التطبيق على هاتفك والوصول إليه كأي تطبيق أصلي بدون متجر تطبيقات:
            </p>

            <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="flex items-center gap-1">
                  اضغط على زر المشاركة <Share className="w-3.5 h-3.5 text-blue-600 inline" /> أسفل شاشة Safari.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="flex items-center gap-1">
                  مرر القائمة واختر <PlusSquare className="w-3.5 h-3.5 text-emerald-700 inline" /> <strong>إضافة إلى الشاشة الرئيسية</strong>.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <span>
                  اضغط على <strong>«إضافة (Add)»</strong> أعلى اليمين.
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer"
            >
              فهمت ذلك، تم ✨
            </button>
          </div>
        </div>
      )}
    </>
  );
}
