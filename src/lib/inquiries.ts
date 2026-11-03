import { randomBytes } from "crypto";
import { InquiryCategory, ParentInquiry } from "./types";

export const INQUIRY_CATEGORIES: {
  id: InquiryCategory;
  label: string;
  iconName: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}[] = [
  {
    id: "grade",
    label: "العلامات والتقويم المستمر 📊",
    iconName: "ClipboardCheck",
    description: "استفسار عن علامة فرض، اختبار، أو عناصر دفتر التقويم الصفي",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-200",
  },
  {
    id: "lesson",
    label: "صعوبة درس أو واجب منزلي 📖",
    iconName: "BookOpen",
    description: "نقطة غامضة في الحصة، تمرين مستعصٍ، أو مسألة في كراس المحاولات",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-800",
    badgeBorder: "border-blue-200",
  },
  {
    id: "behavior",
    label: "الانضباط والسلوك الصفي 🙋‍♂️",
    iconName: "UserCheck",
    description: "متابعة انتباه التلميذ ومشاركته وتعامله داخل القسم",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    badgeBorder: "border-amber-200",
  },
  {
    id: "absence",
    label: "تبرير أو استدراك غياب ⏳",
    iconName: "Calendar",
    description: "إعلام الأستاذ بسبب غياب التلميذ أو طلب توجيه لاستدراك الدرس والسبورة",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-800",
    badgeBorder: "border-rose-200",
  },
  {
    id: "appointment",
    label: "طلب موعد استقبال أسبوعي 🏛️",
    iconName: "Building2",
    description: "التنسيق لمقابلة الأستاذ في المؤسسة خلال ساعة الاستقبال الرسمية",
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-800",
    badgeBorder: "border-purple-200",
  },
  {
    id: "general",
    label: "استفسار أو رسالة عامة 💬",
    iconName: "MessageCircle",
    description: "أي ملاحظة أو شكر أو استفسار عام تود توجيهه لأستاذ المادة",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-800",
    badgeBorder: "border-slate-200",
  },
];

export function generateTrackingCode(teacherCode?: string): string {
  const prefix = teacherCode ? teacherCode.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() : "JSR";
  const randomPart = randomBytes(2).toString("hex").toUpperCase();
  return `INQ-${prefix}-${randomPart}`;
}

export function generateSecretToken(): string {
  return randomBytes(12).toString("hex");
}

export function validateInquiryPayload(payload: any): {
  valid: boolean;
  error?: string;
  cleanData?: {
    parentName: string;
    studentName: string;
    studentGroup: string;
    parentPhone?: string;
    category: InquiryCategory;
    content: string;
  };
} {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "بيانات الاستفسار غير صحيحة" };
  }

  const parentName = (payload.parentName || "").trim();
  const studentName = (payload.studentName || "").trim();
  const studentGroup = (payload.studentGroup || "").trim();
  const content = (payload.content || "").trim();
  let parentPhone = (payload.parentPhone || "").trim();

  if (parentName.length < 2) {
    return { valid: false, error: "يرجى كتابة اسم الولي الكريم (حرفين على الأقل)" };
  }
  if (studentName.length < 2) {
    return { valid: false, error: "يرجى كتابة اسم التلميذ كاملاً" };
  }
  if (!studentGroup) {
    return { valid: false, error: "يرجى تحديد الفوج أو القسم الذي يدرس فيه التلميذ (مثل 1م1 أو 2م3)" };
  }
  if (content.length < 5) {
    return { valid: false, error: "يرجى توضيح السؤال أو الملاحظة بشكل مفصل (5 أحرف على الأقل)" };
  }
  if (content.length > 3000) {
    return { valid: false, error: "نص الرسالة طويل جداً (الحد الأقصى 3000 حرف)" };
  }

  // تنظيف رقم الهاتف الجزائري إن وُجد
  if (parentPhone) {
    parentPhone = parentPhone.replace(/[^\d+]/g, "");
    if (parentPhone.startsWith("0")) {
      parentPhone = "+213" + parentPhone.slice(1);
    }
  }

  const validCategories: InquiryCategory[] = ["grade", "lesson", "behavior", "absence", "appointment", "general"];
  const category: InquiryCategory = validCategories.includes(payload.category) ? payload.category : "general";

  return {
    valid: true,
    cleanData: {
      parentName,
      studentName,
      studentGroup,
      parentPhone: parentPhone || undefined,
      category,
      content,
    },
  };
}

export function buildWhatsAppReplyUrl(
  parentPhone: string,
  studentName: string,
  teacherName: string,
  replyContent: string
): string {
  let cleanPhone = parentPhone.replace(/[^\d]/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "213" + cleanPhone.slice(1);
  } else if (cleanPhone.startsWith("+")) {
    cleanPhone = cleanPhone.slice(1);
  }

  const message = `السلام عليكم ورحمة الله،\nتحية طيبة لولي أمر التلميذ(ة): *${studentName}*،\n\nبخصوص استفساركم عبر *منصة جسور التعليمية*:\n"${replyContent}"\n\nمع تحيات الأستاذ: *${teacherName}* 🌸`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
