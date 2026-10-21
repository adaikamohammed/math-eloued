"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone, Sparkles, Check } from "lucide-react";

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (already installed and opened as app)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Check dismissal cooldown (don't show if dismissed within 3 days)
    const lastDismissed = localStorage.getItem("pwa_install_dismissed");
    if (lastDismissed) {
      const diff = Date.now() - Number(lastDismissed);
      if (diff < 3 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua) && !(/crios|fxios/).test(ua);
    if (isAppleDevice) {
      setIsIOS(true);
      setShowBanner(true);
    }

    // Handle beforeinstallprompt on Android / Chromium
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback: alert instructions
      alert("لتثبيت التطبيق على هاتفك: افتح خيارات المتصفح (⋮) ثم اختر 'تثبيت التطبيق' أو 'إضافة إلى الشاشة الرئيسية'.");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa_install_dismissed", String(Date.now()));
  };

  if (!showBanner || installed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-45 fade-up">
      <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 backdrop-blur-md space-y-2">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-black text-xl shrink-0 shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xs text-white">تطبيق منصة جسور التعليمية</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded font-bold border border-emerald-400/30">
                  PWA ⚡
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight mt-0.5 font-medium">
                نزّل التطبيق على شاشة هاتفك ليعمل معك بسرعة وبدون إنترنت
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* زر التثبيت */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/10">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/40 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تنزيل وتثبيت على شاشة الهاتف</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition"
          >
            لاحقاً
          </button>
        </div>

        {/* إرشادات خاصة بـ iPhone iOS Safari */}
        {showIOSGuide && (
          <div className="bg-white/10 p-2.5 rounded-xl border border-white/15 text-[11px] text-emerald-100 space-y-1">
            <div className="font-bold text-white flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-amber-300" />
              <span>طريقة التثبيت على الآيفون (iOS):</span>
            </div>
            <ol className="list-decimal list-inside pr-1 space-y-0.5 text-slate-200">
              <li>اضغط على زر المشاركة <strong>(⎋ Share)</strong> في أسفل متصفح Safari.</li>
              <li>انزل في القائمة واختر <strong>"إضافة إلى الشاشة الرئيسية ➕" (Add to Home Screen)</strong>.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
