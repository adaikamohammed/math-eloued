"use client";

import { useState, useEffect, useCallback } from "react";

export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

export function useWebNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const supported = "Notification" in window && "serviceWorker" in navigator;
      setIsSupported(supported);
      if (supported) {
        setPermission(Notification.permission);
      } else {
        setPermission("unsupported");
      }
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      console.warn("Failed to request notification permission:", err);
      return "denied";
    }
  }, []);

  const sendNotification = useCallback(
    async (title: string, body: string, url: string = "/", icon: string = "/icons/icon-192.png") => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return false;
      }

      if (Notification.permission !== "granted") {
        const perm = await requestPermission();
        if (perm !== "granted") return false;
      }

      try {
        // المحاولة أولاً عبر Service Worker (لتظهر الإشعارات حتى في الخلفية وعلى الهاتف)
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body,
              icon,
              badge: icon,
              dir: "rtl",
              lang: "ar",
              data: { url },
            });
            return true;
          }
        }

        // كبديل قياسي
        new Notification(title, {
          body,
          icon,
          dir: "rtl",
          lang: "ar",
        });
        return true;
      } catch (err) {
        console.warn("Error displaying notification:", err);
        return false;
      }
    },
    [requestPermission]
  );

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
  };
}
