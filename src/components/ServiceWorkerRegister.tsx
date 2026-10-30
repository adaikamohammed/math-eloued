"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // تحديث الخدمة في الخلفية عند توفر إصدار جديد
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn("Service Worker registration notice:", err);
        });
    }
  }, []);

  return null;
}
