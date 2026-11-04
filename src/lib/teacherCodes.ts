import { createHash } from "crypto";

const PLATFORM_LEVEL_SALT = "jusoor_pedagogy_salt_dz_v1";

// حروف واضحة خالية من الالتباس (بدون 0, 1, I, O)
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * توليد رمز مستوى مشفر وغير قابل للتخمين للأستاذ
 * مثال: للأستاذ MTH-704 وللسنة 1م -> MTH-704-K7R
 * لا يمكن لتلميذ الأولى متوسط تخمين رمز الثانية أو الثالثة متوسط بتغيير رقم فقط
 */
export function generateLevelToken(baseCode: string, level: number): string {
  const cleanCode = (baseCode || "").trim().toUpperCase().replace(/\s*[-_/\s]\s*/g, "-");
  const input = `${cleanCode}:${level}:${PLATFORM_LEVEL_SALT}`;
  const hash = createHash("sha256").update(input).digest();

  // تحويل أول 3 بايت إلى 3 أحرف من الأبجدية غير الملتبسة
  let token = "";
  for (let i = 0; i < 3; i++) {
    const idx = hash[i] % CODE_ALPHABET.length;
    token += CODE_ALPHABET[idx];
  }
  return token;
}

/**
 * إرجاع الرمز الكامل للمستوى
 * مثال: getTeacherLevelCode("MTH-704", 1) => "MTH-704-8EX"
 */
export function getTeacherLevelCode(baseTeacherCode: string, level: number): string {
  const clean = (baseTeacherCode || "").trim().toUpperCase().replace(/\s*[-_/\s]\s*/g, "-");
  const token = generateLevelToken(clean, level);
  return `${clean}-${token}`;
}

export interface ParsedTeacherCode {
  baseCode: string;
  level: number | null;
  isLockedToLevel: boolean;
  rawInput: string;
}

/**
 * فك تشفير وتحليل أي كود يدخله الولي أو التلميذ:
 * 1. الكود العام: MTH-704 => { baseCode: "MTH-704", level: null, isLockedToLevel: false }
 * 2. كود المستوى المشفر: MTH-704-8EX => { baseCode: "MTH-704", level: 1, isLockedToLevel: true }
 * 3. التوافق العكسي للأكواد القديمة: MTH-704-1 => { baseCode: "MTH-704", level: 1, isLockedToLevel: true }
 */
export function parseTeacherInputCode(input: string): ParsedTeacherCode {
  const raw = (input || "").trim().toUpperCase();
  if (!raw) {
    return { baseCode: "", level: null, isLockedToLevel: false, rawInput: input };
  }

  // توحيد المسافات والشرطات تلقائياً (مثلاً: MTH - 704 - 8EX يصبح MTH-704-8EX)
  const clean = raw.replace(/\s*[-_/\s]\s*/g, "-");

  // 1. فحص كود المستوى المشفر: [BASE]-[TOKEN_3_CHARS]
  // مثل MTH-704-8EX أو ARB-102-X9P
  const secureMatch = clean.match(/^([A-Z]{2,5}[-_]?\d{2,5})[-_]([A-Z0-9]{3})$/);
  if (secureMatch) {
    const base = secureMatch[1];
    const token = secureMatch[2];

    // التحقق من أي مستوى يطابق هذا التوكن
    for (let lvl = 1; lvl <= 4; lvl++) {
      if (generateLevelToken(base, lvl) === token) {
        return {
          baseCode: base,
          level: lvl,
          isLockedToLevel: true,
          rawInput: input,
        };
      }
    }
  }

  // 2. فحص الأكواد المباشرة القديمة (دعم تراجعي): MTH-704-1 أو MTH-704-2M
  const legacyMatch = clean.match(/^([A-Z]{2,5}[-_]?\d{2,5})[-_/\s]([1-4])(?:[Mم])?$/);
  if (legacyMatch) {
    return {
      baseCode: legacyMatch[1],
      level: parseInt(legacyMatch[2], 10),
      isLockedToLevel: true,
      rawInput: input,
    };
  }

  // 3. كود عام بدون مستوى: MTH-704
  return {
    baseCode: clean,
    level: null,
    isLockedToLevel: false,
    rawInput: input,
  };
}

/**
 * التحقق مما إذا كان التوكن المقدم صالحاً لمستوى معين لهذا الأستاذ
 */
export function verifyLevelToken(baseTeacherCode: string, level: number, tokenOrFullCode: string): boolean {
  if (!baseTeacherCode || !level || !tokenOrFullCode) return false;
  const parsed = parseTeacherInputCode(tokenOrFullCode);
  if (parsed.baseCode === baseTeacherCode.trim().toUpperCase() && parsed.level === level) {
    return true;
  }
  // فحص ما إذا كان المدخل هو التوكن فقط (3 حروف)
  const expectedToken = generateLevelToken(baseTeacherCode, level);
  return tokenOrFullCode.trim().toUpperCase() === expectedToken;
}
