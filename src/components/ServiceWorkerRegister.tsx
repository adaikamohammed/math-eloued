"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      // 1. إلغاء تسجيل أي Service Worker قديم في متصفح المستخدم
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) => {
            for (const registration of registrations) {
              registration.unregister().catch(() => {});
            }
          })
          .catch(() => {});
      }

      // 2. تنظيف وحذف أي كاش قديم متبقي في ذاكرة المتصفح
      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => {
            for (const key of keys) {
              caches.delete(key).catch(() => {});
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  return null;
}
