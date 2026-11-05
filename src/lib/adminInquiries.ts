import { AdminInquiry, AdminInquiryCategory } from "./types";

// دالة توليد عشوائي آمنة تعمل في المتصفح وبيئة Node.js معاً
function getSecureRandomHex(bytes: number): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(bytes);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // في Node.js
  try {
    const nodeCrypto = require("crypto");
    return nodeCrypto.randomBytes(bytes).toString("hex");
  } catch {
    return Math.random().toString(16).substring(2, 2 + bytes * 2);
  }
}

export const ADMIN_INQUIRY_CATEGORIES: {
  id: AdminInquiryCategory;
  label: string;
  iconName: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}[] = [
  {
    id: "general",
    label: "استفسار عام حول المنصة 💬",
    iconName: "MessageCircle",
    description: "أي سؤال أو استفسار عام لمدير المنصة حول الخدمات والتسجيل",
    badgeBg: "bg-slate-50",
    badgeText: "text-slate-800",
    badgeBorder: "border-slate-200",
  },
  {
    id: "pedagogical",
    label: "استفسار أو اقتراح بيداغوجي 📐",
    iconName: "BookOpen",
    description: "تنسيق يخص التدرجات والمذكرات ودفاتر النصوص والتقويم",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-200",
  },
  {
    id: "technical",
    label: "مشكلة تقنية أو خطأ برمجي 💻",
    iconName: "ShieldAlert",
    description: "إبلاغ عن عطل، صعوبة في طباعة الـ PDF، أو مشكلة في العرض",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-800",
    badgeBorder: "border-rose-200",
  },
  {
    id: "suggestion",
    label: "اقتراح تطوير ميزة جديدة 💡",
    iconName: "Lightbulb",
    description: "أفكار لتطوير المنصة وتحسين تجربة الأساتذة والأولياء",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    badgeBorder: "border-amber-200",
  },
  {
    id: "account_issue",
    label: "مشكلة في الحساب أو التسجيل 🔐",
    iconName: "Lock",
    description: "صعوبة تسجيل الدخول، استرجاع الحساب، أو تعديل البيانات",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-800",
    badgeBorder: "border-purple-200",
  },
  {
    id: "complaint",
    label: "ملاحظة أو شكوى خاصة ⚖️",
    iconName: "Scale",
    description: "ملاحظات سرية أو شكاوى موجهة لإدارة المنصة مباشرة",
    badgeBg: "bg-orange-50",
    badgeText: "text-orange-800",
    badgeBorder: "border-orange-200",
  },
];

// توليد كود تتبع قصير وأنيق ومميز للمنصة (مثال: ADM-7842-DZ)
export function generateAdminTrackingCode(): string {
  const numPart = Math.floor(1000 + Math.random() * 9000);
  const letterPart = getSecureRandomHex(1).toUpperCase();
  return `ADM-${numPart}-${letterPart}`;
}

// توليد رمز سري مشفر لحماية خصوصية الاستعلام
export function generateAdminSecretToken(): string {
  return `sec_${getSecureRandomHex(12)}`;
}

// مفتاح التخزين المحلي في متصفح المستخدم لمزامنة التذاكر والردود تلقائياً
const LOCAL_STORAGE_KEY = "jusoor_admin_tickets_v1";

export function getLocalAdminTickets(): AdminInquiry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAdminTicketLocally(ticket: AdminInquiry): void {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalAdminTickets();
    const index = current.findIndex((t) => t.id === ticket.id || t.trackingCode === ticket.trackingCode);
    if (index >= 0) {
      current[index] = { ...current[index], ...ticket };
    } else {
      current.unshift(ticket);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current.slice(0, 50)));
  } catch (err) {
    console.warn("Failed to save ticket locally:", err);
  }
}

export function removeLocalAdminTicket(idOrCode: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalAdminTickets();
    const updated = current.filter((t) => t.id !== idOrCode && t.trackingCode !== idOrCode);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to remove ticket locally:", err);
  }
}

// بناء رابط إشعار واتساب بضغطة زر لمدير المنصة
export function buildAdminWhatsAppReplyUrl(
  phone: string,
  ticketTitle: string,
  replyContent: string,
  trackingCode: string
): string {
  // تطهير رقم الهاتف الجزائري (إضافة +213 إذا بدأ بـ 0)
  let cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "213" + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith("213") && cleanPhone.length === 9) {
    cleanPhone = "213" + cleanPhone;
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://jusoor-dz.vercel.app";
  const trackLink = `${origin}/contact?code=${encodeURIComponent(trackingCode)}`;

  const messageText = `السلام عليكم ورحمة الله وبركاته،
بخصوص رسالتكم لإدارة منصة جسور التعليمية حول موضوع «${ticketTitle}» (رقم التذكرة: ${trackingCode}):

رد إدارة المنصة:
${replyContent}

يمكنكم متابعة التذكرة وتفاصيل الرد عبر الرابط الآمن:
${trackLink}

مع تحيات إدارة منصة جسور التعليمية 🏛️`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
}
