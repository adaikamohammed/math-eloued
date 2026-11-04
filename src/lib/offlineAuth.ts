"use client";

import type { ReceptionInfo } from "./types";

export type TeacherSession = {
  id: string;
  full_name: string | null;
  slug: string | null;
  teacher_code: string | null;
  school_custom_name: string | null;
  levels_taught: number[] | null;
  subject?: string | null;
  reception?: ReceptionInfo | null;
  role?: string | null;
  email?: string | null;
};

export const CACHE_KEY_PROFILE = "math_teacher_profile_cache";
export const CACHE_KEY_LOGGED_IN = "math_teacher_logged_in";

/**
 * استرجاع الجلسة المحفوظة للأستاذ من التخزين المحلي (تسمح بالدخول حتى عند غياب الإنترنت تماماً)
 */
export function getPersistedTeacherSession(): TeacherSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY_PROFILE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.id) {
      return parsed as TeacherSession;
    }
  } catch (e) {
    console.warn("Failed to parse persisted teacher session:", e);
  }
  return null;
}

/**
 * حفظ جلسة الأستاذ في التخزين المحلي لضمان عدم الخروج التلقائي
 */
export function savePersistedTeacherSession(profile: TeacherSession): void {
  if (typeof window === "undefined" || !profile?.id) return;
  try {
    localStorage.setItem(CACHE_KEY_PROFILE, JSON.stringify(profile));
    localStorage.setItem(CACHE_KEY_LOGGED_IN, "true");
  } catch (e) {
    console.warn("Failed to save persisted teacher session:", e);
  }
}

/**
 * مسح الجلسة نهائياً - يُستدعى حصراً عند نقر الأستاذ على "تسجيل الخروج" الصريح
 */
export function clearPersistedTeacherSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHE_KEY_PROFILE);
    localStorage.removeItem(CACHE_KEY_LOGGED_IN);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("jusoor_shared_device");
    }
  } catch (e) {
    console.warn("Failed to clear persisted session:", e);
  }
}

/**
 * فحص الجلسة الذكي المتسامح مع وضع عدم الاتصال (Offline-First Auth Check)
 * - إذا كان هناك جلسة محفوظة وتوفر الاتصال: يحدثها بهدوء في الخلفية.
 * - إذا فشل الاتصال أو كان الجهاز أوفلاين: يعتمد الجلسة المحلية ولا يخرج الأستاذ إطلاقاً!
 */
export async function checkTeacherSession(): Promise<{
  authenticated: boolean;
  profile: TeacherSession | null;
  isOffline: boolean;
}> {
  const persisted = getPersistedTeacherSession();

  // فحص مباشر لحالة اتصال المتصفح
  const isBrowserOffline = typeof navigator !== "undefined" && !navigator.onLine;

  if (isBrowserOffline && persisted) {
    return { authenticated: true, profile: persisted, isOffline: true };
  }

  try {
    const res = await fetch("/api/auth", {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.authenticated && data.profile) {
        savePersistedTeacherSession(data.profile);
        return { authenticated: true, profile: data.profile, isOffline: false };
      }
      if (data?.authenticated === false) {
        // الخادم رد رسمياً بعدم وجود جلسة
        clearPersistedTeacherSession();
        return { authenticated: false, profile: null, isOffline: false };
      }
    } else if (res.status === 401 || res.status === 403) {
      clearPersistedTeacherSession();
      return { authenticated: false, profile: null, isOffline: false };
    }
  } catch (err) {
    // فشل الاتصال بالشبكة (أوفلاين أو انقطاع النت أو تعذر الوصول للخادم)
    // نعتمد الجلسة المحفوظة ولا نغلق حساب الأستاذ أبداً!
    if (persisted) {
      return { authenticated: true, profile: persisted, isOffline: true };
    }
    return { authenticated: false, profile: null, isOffline: true };
  }

  // في حال وجود جلسة مخزنة مسبقاً ولم يرفضها الخادم صراحةً
  if (persisted) {
    return { authenticated: true, profile: persisted, isOffline: isBrowserOffline };
  }

  return { authenticated: false, profile: null, isOffline: false };
}

/**
 * تنفيذ تسجيل الخروج الآمن ومسح كافة الكوكيز والبيانات المؤقتة
 */
export async function logoutTeacher(): Promise<void> {
  clearPersistedTeacherSession();
  try {
    await fetch("/api/auth", { method: "DELETE" });
  } catch {}
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
