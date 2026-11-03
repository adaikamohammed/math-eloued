import { ParentInquiry } from "./types";

const STORAGE_KEY = "jusoor_parent_inquiries_v1";

export function getLocalInquiries(): ParentInquiry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveInquiryLocally(inquiry: ParentInquiry): void {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalInquiries();
    const existingIndex = current.findIndex((i) => i.id === inquiry.id);
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...inquiry };
    } else {
      current.unshift(inquiry);
    }
    // الاحتفاظ بأحدث 50 استفساراً فقط
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(0, 50)));
  } catch (err) {
    console.warn("Error saving inquiry locally:", err);
  }
}

export function removeLocalInquiry(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalInquiries();
    const updated = current.filter((i) => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Error removing local inquiry:", err);
  }
}

export async function syncLocalInquiriesWithServer(): Promise<ParentInquiry[]> {
  const localList = getLocalInquiries();
  if (localList.length === 0) return [];

  try {
    const items = localList.map((i) => ({
      id: i.id,
      trackingCode: i.trackingCode,
      secretToken: i.secretToken,
      teacherId: i.teacherId,
    }));

    const res = await fetch("/api/inquiries/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.inquiries)) {
        const serverInquiries = data.inquiries as ParentInquiry[];
        const merged = localList.map((loc) => {
          const match = serverInquiries.find((s) => s.id === loc.id || s.trackingCode === loc.trackingCode);
          return match ? { ...loc, ...match } : loc;
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
        return merged;
      }
    }
  } catch (err) {
    console.warn("Error syncing inquiries with server:", err);
  }

  return localList;
}
