"use client";

import type { LessonsData } from "./types";

export const STORAGE_KEY = (teacherId: string) => `jusoor_offline_data_${teacherId}`;
export const PENDING_KEY = (teacherId: string) => `jusoor_pending_sync_${teacherId}`;
export const META_KEY = (teacherId: string) => `jusoor_offline_meta_${teacherId}`;

export interface OfflineMetadata {
  teacherId: string;
  lastModifiedAt: string;
  lastSyncedAt?: string;
  version: number;
}

/**
 * استرجاع بيانات الأستاذ الكاملة المخزنة محلياً في جهازه
 */
export function getTeacherOfflineData(teacherId: string): LessonsData | null {
  if (typeof window === "undefined" || !teacherId) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY(teacherId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as LessonsData;
    }
  } catch (err) {
    console.warn("Failed to parse local teacher data:", err);
  }
  return null;
}

/**
 * جلب قائمة التعديلات المعلقة التي أُجريت في وضع الأوفلاين ولم تُرفع بعد للسيرفر
 */
export function getTeacherPendingSync(teacherId: string): Partial<LessonsData> | null {
  if (typeof window === "undefined" || !teacherId) return null;
  try {
    const raw = localStorage.getItem(PENDING_KEY(teacherId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
      return parsed as Partial<LessonsData>;
    }
  } catch (err) {
    console.warn("Failed to parse pending sync data:", err);
  }
  return null;
}

/**
 * التحقق مما إذا كان هناك تعديلات غير مزامنة
 */
export function hasPendingSync(teacherId: string): boolean {
  const pending = getTeacherPendingSync(teacherId);
  return Boolean(pending && Object.keys(pending).length > 0);
}

/**
 * مسح قائمة التعديلات المعلقة بعد نجاح رفعها للسيرفر
 */
export function clearTeacherPendingSync(teacherId: string): void {
  if (typeof window === "undefined" || !teacherId) return;
  try {
    localStorage.removeItem(PENDING_KEY(teacherId));
    const metaRaw = localStorage.getItem(META_KEY(teacherId));
    const meta: OfflineMetadata = metaRaw
      ? JSON.parse(metaRaw)
      : { teacherId, lastModifiedAt: new Date().toISOString(), version: 1 };
    meta.lastSyncedAt = new Date().toISOString();
    localStorage.setItem(META_KEY(teacherId), JSON.stringify(meta));
  } catch (err) {
    console.warn("Failed to clear pending sync:", err);
  }
}

/**
 * حفظ وتحديث بيانات الأستاذ محلياً في جهازه
 * @param teacherId معرّف الأستاذ
 * @param updates التعديلات أو البيانات المحدثة
 * @param markPending هل يتم توثيق هذه التعديلات لرفعها للسيرفر عند عودة النت (افتراضياً نعم)
 */
export function saveTeacherOfflineData(
  teacherId: string,
  updates: Partial<LessonsData>,
  markPending: boolean = true
): LessonsData {
  if (typeof window === "undefined" || !teacherId) {
    return { lessons: [], ...(updates as any) };
  }

  const existing = getTeacherOfflineData(teacherId) || { lessons: [] };
  const merged: LessonsData = {
    ...existing,
    ...updates,
  };

  try {
    // 1. حفظ البيانات المدمجة في ملف التخزين المحلي المحمي للأستاذ
    localStorage.setItem(STORAGE_KEY(teacherId), JSON.stringify(merged));

    // 2. تحديث الميتاداتا
    const meta: OfflineMetadata = {
      teacherId,
      lastModifiedAt: new Date().toISOString(),
      version: 1,
    };
    localStorage.setItem(META_KEY(teacherId), JSON.stringify(meta));

    // 3. توثيق التغيير في قائمة الانتظار للرفع التلقائي
    if (markPending) {
      const currentPending = getTeacherPendingSync(teacherId) || {};
      const newPending = {
        ...currentPending,
        ...updates,
      };
      localStorage.setItem(PENDING_KEY(teacherId), JSON.stringify(newPending));

      // إشعار باقي مكونات الصفحة بوجود تغيير محلي
      window.dispatchEvent(
        new CustomEvent("jusoor_offline_change", {
          detail: { teacherId, keys: Object.keys(updates) },
        })
      );
    }
  } catch (err) {
    console.warn("Error saving teacher offline data:", err);
  }

  return merged;
}

/**
 * تحديث الكاش المحلي ببيانات الخادم عند توفر الاتصال دون مسح التعديلات المحلية المعلقة
 */
export function cacheServerDataLocally(teacherId: string, serverData: LessonsData): LessonsData {
  if (typeof window === "undefined" || !teacherId) return serverData;

  const pending = getTeacherPendingSync(teacherId);
  // إذا كانت هناك تعديلات محلية معلقة لم تُرفع بعد، ندمجها فوق بيانات الخادم حتى لا تضيع
  const safeMerged: LessonsData = {
    ...serverData,
    ...(pending || {}),
  };

  try {
    localStorage.setItem(STORAGE_KEY(teacherId), JSON.stringify(safeMerged));
  } catch (err) {
    console.warn("Failed to cache server data locally:", err);
  }

  return safeMerged;
}

/**
 * المزامنة السحابية الفورية: ترفع كافة التعديلات المعلقة إلى قاعدة البيانات
 */
export async function syncTeacherOfflineData(
  teacherId: string
): Promise<{ success: boolean; syncedKeys?: string[]; error?: string }> {
  if (typeof window === "undefined" || !teacherId) {
    return { success: false, error: "no_window" };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { success: false, error: "offline" };
  }

  const pending = getTeacherPendingSync(teacherId);
  if (!pending || Object.keys(pending).length === 0) {
    return { success: true, syncedKeys: [] };
  }

  try {
    const res = await fetch("/api/lessons", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pending),
    });

    if (res.ok) {
      const result = await res.json();
      const syncedKeys = Object.keys(pending);
      clearTeacherPendingSync(teacherId);

      // إشعار كافة أجزاء التطبيق بنجاح المزامنة وتحديث البيانات
      window.dispatchEvent(
        new CustomEvent("jusoor_data_synced", {
          detail: { teacherId, syncedKeys, result },
        })
      );

      return { success: true, syncedKeys };
    } else {
      const errJson = await res.json().catch(() => null);
      return { success: false, error: errJson?.error || "server_error" };
    }
  } catch (err: any) {
    console.warn("Failed to sync offline data to server:", err);
    return { success: false, error: err?.message || "network_error" };
  }
}

/**
 * تصدير ملف JSON فعلي يمكن للأستاذ تنزيله وحفظه مباشرة في حاسوبه أو هاتفه
 */
export function exportTeacherDataAsJson(teacherId: string, teacherName?: string): void {
  if (typeof window === "undefined" || !teacherId) return;

  const data = getTeacherOfflineData(teacherId) || { lessons: [] };
  const safeName = (teacherName || "الاستاذ").replace(/[^\u0621-\u064A\w-]/g, "_");
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `نسخة_بيانات_جسور_${safeName}_${dateStr}.json`;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * إعداد مراقب المزامنة التلقائية فور عودة الاتصال
 */
export function setupAutoSync(
  teacherId: string,
  onSyncSuccess?: (syncedKeys: string[]) => void
): () => void {
  if (typeof window === "undefined" || !teacherId) {
    return () => {};
  }

  const handleOnline = async () => {
    if (hasPendingSync(teacherId)) {
      const res = await syncTeacherOfflineData(teacherId);
      if (res.success && res.syncedKeys && res.syncedKeys.length > 0) {
        onSyncSuccess?.(res.syncedKeys);
      }
    }
  };

  window.addEventListener("online", handleOnline);

  // فحص المزامنة عند عودة التركيز للنافذة أيضاً
  const handleFocus = () => {
    if (navigator.onLine && hasPendingSync(teacherId)) {
      handleOnline();
    }
  };
  window.addEventListener("focus", handleFocus);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("focus", handleFocus);
  };
}
