"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, X } from "lucide-react";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. التحقق من حالة الاتصال
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 2. تحميل وحفظ الخط والصفحات تلقائياً في الخلفية بدون أي أزرار وبدون إزعاج المستخدم
    let timer: NodeJS.Timeout | null = null;
    if ("caches" in window && navigator.onLine) {
      timer = setTimeout(async () => {
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
            "/fonts/alexandria-arabic.woff2",
            "/fonts/alexandria-latin.woff2",
          ];

          for (const url of urlsToCache) {
            try {
              const matched = await cache.match(url);
              if (!matched) {
                const response = await fetch(url);
                if (response.ok) {
                  await cache.put(url, response);
                }
              }
            } catch {
              // تجاهل بصمت للحفاظ على تجربة المستخدم
            }
          }
        } catch {
          // تجاهل أي خطأ في بيئة المتصفح
        }
      }, 2000);
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // شريط التنبيه اللطيف فقط عند انقطاع الإنترنت الفعلي
  if (isOffline && !dismissed) {
    return (
      <aside aria-label="تنبيه حالة الاتصال" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-bounce-in" dir="rtl">
        <div className="bg-amber-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 border border-amber-500/40 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-700/60 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-amber-200" />
            </div>
            <div className="text-right">
              <p className="text-xs font-black">وضع العمل دون إنترنت (أوفلاين)</p>
              <p className="text-[11px] text-amber-100">
                الصفحات والخطوط محملة ومحفوظة تلقائياً في جهازك
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

  return null;
}

// دالة لا ترسم أي زر (لأن التحميل يتم تلقائياً في الخلفية)
export function SaveOfflineButton(_props: { className?: string }) {
  return null;
}
