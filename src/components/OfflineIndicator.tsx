"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, Download, CheckCircle, RefreshCw, X } from "lucide-react";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // التحقق من حالة الاتصال الأولية
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);

      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => {
        setIsOffline(true);
        setDismissed(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // دالة تحميل وحفظ الخط والصفحات للعمل دون إنترنت
  const handleSaveForOffline = async () => {
    if (!("caches" in window)) {
      alert("متصفحك لا يدعم خاصية التخزين المؤقت المحلي.");
      return;
    }

    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const cache = await caches.open("jusoor-offline-v1");
      const urlsToCache = [
        "/",
        "/offline",
        "/eval",
        "/t/search",
        "/assessment",
        "/manifest.json",
        "/icon.svg",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
        "/icons/apple-touch-icon.png",
        "/fonts/alexandria-arabic.woff2",
        "/fonts/alexandria-latin.woff2",
      ];

      // تحميل كل ملف وتخزينه في الكاش
      for (const url of urlsToCache) {
        try {
          const response = await fetch(url, { cache: "reload" });
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch {
          // تجاهل الأخطاء الفردية للاستمرار في حفظ باقي الملفات
        }
      }

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
      }, 5000);
    } catch (err) {
      console.warn("Error caching for offline:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // شريط التنبيه عند انقطاع الإنترنت
  if (isOffline && !dismissed) {
    return (
      <aside aria-label="تنبيه حالة الاتصال" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-bounce-in" dir="rtl">
        <div className="bg-amber-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-amber-500/40 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-700/60 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-amber-200" />
            </div>
            <div className="text-right">
              <p className="text-xs font-black">أنت تتصفح في وضع الأوفلاين (بدون إنترنت)</p>
              <p className="text-[11px] text-amber-100">
                الخط والصفحات محفوظة محلياً في جهازك
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg hover:bg-white/10 text-amber-200 hover:text-white transition cursor-pointer"
            title="إخفاء التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // عند نجاح الحفظ اليدوي للأوفلاين
  if (savedSuccess) {
    return (
      <aside aria-label="تأكيد حفظ البيانات محلياً" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50" dir="rtl">
        <div className="bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500/40">
          <CheckCircle className="w-5 h-5 text-emerald-200 shrink-0" />
          <div className="text-right flex-1">
            <p className="text-xs font-black">تم الحفظ بنجاح على جهازك!</p>
            <p className="text-[11px] text-emerald-100">
              الخط والصفحات جاهزة الآن للعمل بدون إنترنت
            </p>
          </div>
        </div>
      </aside>
    );
  }

  return null;
}

// زر تفاعلي يمكن وضعه في القائمة أو الشريط الجانبي لحفظ المنصة
export function SaveOfflineButton({ className = "" }: { className?: string }) {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    if (!("caches" in window)) {
      alert("خاصية التخزين المحلي غير مدعومة في هذا المتصفح.");
      return;
    }

    setSaving(true);
    setDone(false);

    try {
      const cache = await caches.open("jusoor-offline-v1");
      const urls = [
        "/",
        "/offline",
        "/eval",
        "/t/search",
        "/assessment",
        "/manifest.json",
        "/icon.svg",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
        "/fonts/alexandria-arabic.woff2",
        "/fonts/alexandria-latin.woff2",
      ];

      for (const u of urls) {
        try {
          const res = await fetch(u, { cache: "reload" });
          if (res.ok) await cache.put(u, res);
        } catch {
          // ignore individual asset failure
        }
      }

      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
        done
          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
      } ${className}`}
      title="تحميل الخط والصفحات لحفظها في ذاكرة الهاتف أو الحاسوب"
    >
      {saving ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
      ) : done ? (
        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
      ) : (
        <Download className="w-3.5 h-3.5 text-slate-500" />
      )}
      <span>{saving ? "جاري الحفظ للجهاز..." : done ? "محفوظ في جهازك أوفلاين" : "حفظ المنصة للعمل أوفلاين"}</span>
    </button>
  );
}
