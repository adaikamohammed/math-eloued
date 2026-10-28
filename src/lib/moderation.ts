// منظومة فلترة المحتوى والحماية من الشتائم والسبام
// مخصصة للبيئة التربوية الجزائرية لحماية الأساتذة وصون الأخلاق العامة

// تنظيف وتوحيد الحروف العربية لكشف محاولات التمويه (التطويل، الحركات، الهمزات)
export function normalizeArabic(text: string): string {
  return text
    // إزالة علامات التشكيل
    .replace(/[\u064B-\u065F\u0670]/g, "")
    // إزالة التطويل (الكشيدة) مثل: كـــــلب
    .replace(/\u0640+/g, "")
    // توحيد الألفات
    .replace(/[إأآا]/g, "ا")
    // توحيد الياء والألف المقصورة
    .replace(/[ىي]/g, "ي")
    // توحيد التاء المربوطة والهاء
    .replace(/ة/g, "ه")
    // إزالة الرموز والنقاط الفاصلة بين الحروف مثل ك.ل.ب
    .replace(/[._\-*~#@$%/\\|]/g, " ")
    // تقليص الحروف المتكررة أكثر من مرتين (مثل: حماااااار -> حمار)
    .replace(/(.)\1{2,}/g, "$1$1")
    .toLowerCase();
}

// قائمة الكلمات والمصطلحات الممنوعة (شتائم، سب وقذف، عبارات مسيئة في الوسط المدرسي)
const BANNED_WORDS: string[] = [
  "كلب",
  "كلاب",
  "حمار",
  "حمير",
  "غبي",
  "اغبياء",
  "حقير",
  "سافل",
  "تافه",
  "قذر",
  "وسخ",
  "تفو",
  "تفه",
  "طحان",
  "طحين",
  "شيات",
  "زامل",
  "زوامل",
  "قواد",
  "قواده",
  "منيوك",
  "شرموط",
  "شرموطه",
  "خرا",
  "خراء",
  "زب",
  "كس",
  "طيز",
  "يلعن",
  "لعنه",
  "نعل",
  "ينعل",
  "نيك",
  "ننيك",
  "ينيك",
  "قحبه",
  "قحبة",
  "حقود",
];

// عبارات كاملة مسيئة
const BANNED_PHRASES: string[] = [
  "الله ينعل",
  "الله يلعن",
  "بنت القحبه",
  "ولد القحبه",
  "روح تموت",
  "امشي تموت",
];

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  isSpamBot?: boolean;
}

/**
 * فحص الرسالة والتحقق من سلامتها من السبام والألفاظ النابية
 */
export function moderateMessage(content: string, honeypotField?: string): ModerationResult {
  // 1. فحص حقل الفخ (Honeypot) - إذا تم ملؤه فهو روبوت إغراق
  if (honeypotField && honeypotField.trim().length > 0) {
    return {
      allowed: false,
      reason: "تم حظر الإرسال الآلي (Spam Bot detected)",
      isSpamBot: true,
    };
  }

  const raw = content.trim();

  // 2. التحقق من الطول الأدنى
  if (raw.length < 3) {
    return {
      allowed: false,
      reason: "الرسالة قصيرة جداً (3 أحرف على الأقل)",
    };
  }

  // 3. منع الإغراق بروابط مشبوهة أو كثرة الروابط (أكثر من رابطين في رسالة مدرسية يعتبر سبام)
  const urlMatches = raw.match(/https?:\/\/[^\s]+/gi) || [];
  if (urlMatches.length > 2) {
    return {
      allowed: false,
      reason: "عذراً، يمنع إدراج روابط متعددة في الرسائل لصيانة أمان المنصة.",
    };
  }

  // 4. منع اختصارات الروابط الخطرة (phishing / redirectors)
  const suspiciousDomains = ["bit.ly", "tinyurl.com", "t.co", "cutt.ly", "shorturl.at", "adf.ly"];
  if (suspiciousDomains.some((d) => raw.toLowerCase().includes(d))) {
    return {
      allowed: false,
      reason: "عذراً، الروابط المختصرة محظورة لأسباب أمنية.",
    };
  }

  // 5. فحص التكرار العبثي للأحرف (مثل aaaaaaaaaaaaaaaaaaaa...)
  const repeatingCharPattern = /(.)\1{25,}/;
  if (repeatingCharPattern.test(raw)) {
    return {
      allowed: false,
      reason: "يرجى كتابة نص مفيد وتجنب تكرار الأحرف دون معنى.",
    };
  }

  // 6. فحص الألفاظ النابية والشتائم بدقة متوافقة مع الحروف العربية
  const normalized = normalizeArabic(raw);

  // فحص العبارات المركبة
  for (const phrase of BANNED_PHRASES) {
    const normPhrase = normalizeArabic(phrase);
    if (normalized.includes(normPhrase)) {
      return {
        allowed: false,
        reason: "تحتوي الرسالة على عبارات غير لائقة، يرجى الالتزام بالاحترام المتبادل والآداب العامة والأخلاق التربوية.",
      };
    }
  }

  // تجزئة الكلمات وفحصها بدقة (تجنب مشاكل \b في الحروف غير اللاتينية)
  const tokens = normalized.split(/[\s,;:.!?؟!()\\[\]{}<>"'`]+/);
  for (const token of tokens) {
    if (!token) continue;
    for (const banned of BANNED_WORDS) {
      const normBanned = normalizeArabic(banned);
      // تطابق كامل للكلمة أو ملحقة بضمير (مثال: حمارك، كلابهم)
      if (
        token === normBanned ||
        token === normBanned + "ك" ||
        token === normBanned + "كم" ||
        token === normBanned + "هم" ||
        token === "يا" + normBanned ||
        token === "ال" + normBanned
      ) {
        return {
          allowed: false,
          reason: "تحتوي الرسالة على عبارات غير لائقة، يرجى الالتزام بالاحترام المتبادل والآداب العامة والأخلاق التربوية.",
        };
      }
    }
  }

  return { allowed: true };
}
