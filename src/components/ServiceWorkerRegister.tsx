"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. تسجيل الـ Service Worker لتمكين PWA وتلقي إشعارات الويب
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((registration) => {
            // التحقق من وجود تحديثات دورية
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                    console.log("[PWA] تحديث جديد متاح لمنصة جسور.");
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.warn("[PWA] Service Worker registration failed:", err);
          });
      });
    }

    // 2. التقاط حدث التثبيت beforeinstallprompt لتمكين التثبيت بضغطة زر
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredPwaPrompt = e;
      window.dispatchEvent(new CustomEvent("pwaInstallable"));
    };

    const handleAppInstalled = () => {
      (window as any).__deferredPwaPrompt = null;
      window.dispatchEvent(new CustomEvent("pwaInstalled"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return null;
}
