import type { SavedTeacher } from "@/components/TeacherWallet";

export interface CompactTeacher {
  s: string;       // slug
  n: string;       // name
  c: string;       // code
  sub?: string;    // subject id
  sch?: string;    // school name
  ch?: string;     // child name
  l?: number[];    // levels taught
}

/**
 * تحويل نص آمن إلى Base64URL يدعم الحروف العربية في المتصفح و Node.js
 */
export function toBase64Url(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf-8").toString("base64url");
  }
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * فك تشفير Base64URL مع الحفاظ الكامل على الحروف العربية
 */
export function fromBase64Url(b64: string): string {
  try {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(b64, "base64url").toString("utf-8");
    }
    let base64 = b64.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

/**
 * تشفير قائمة أساتذة المحفظة في سلسلة نصية مدمجة وخفيفة
 */
export function encodeFamilyWallet(teachers: SavedTeacher[]): string {
  if (!Array.isArray(teachers) || teachers.length === 0) return "";
  const compact: CompactTeacher[] = teachers.map((t) => ({
    s: t.slug,
    n: t.name,
    c: t.code,
    sub: t.subject,
    sch: t.school,
    ch: t.childName,
    l: t.levels,
  }));
  return toBase64Url(JSON.stringify(compact));
}

/**
 * فك تشفير واسترجاع قائمة الأساتذة من السلسلة المشفرة
 */
export function decodeFamilyWallet(encoded: string): SavedTeacher[] {
  if (!encoded || typeof encoded !== "string") return [];
  try {
    const json = fromBase64Url(encoded.trim());
    if (!json) return [];
    const compact: CompactTeacher[] = JSON.parse(json);
    if (!Array.isArray(compact)) return [];

    return compact
      .filter((c) => c && c.s && c.n)
      .map((c) => ({
        slug: c.s,
        name: c.n,
        code: c.c || "MTH",
        subject: c.sub,
        school: c.sch,
        childName: c.ch,
        levels: Array.isArray(c.l) ? c.l : undefined,
        savedAt: Date.now(),
      }));
  } catch {
    return [];
  }
}

/**
 * توليد رابط المشاركة العائلي المباشر
 */
export function buildFamilyShareUrl(teachers: SavedTeacher[], origin?: string): string {
  const code = encodeFamilyWallet(teachers);
  if (!code) return "";
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/?import_wallet=${code}`;
}

/**
 * توليد رسالة واتساب أنيقة وجاهزة للإرسال للأم
 */
export function buildWhatsAppShareUrl(shareUrl: string, childrenNames?: string[]): string {
  const childrenText = childrenNames && childrenNames.length > 0
    ? ` لأبنائنا (${childrenNames.filter(Boolean).join(" و ")})`
    : " لأبنائنا";

  const message = `السلام عليكم 🌹\nهذا رابط محفظة أساتذة التعليم المتوسط${childrenText} لمتابعة دروسهم والواجبات اليومية عبر منصة جسور:\n\n${shareUrl}\n\n(بمجرد النقر على الرابط ستُحفظ قائمة جميع الأساتذة في هاتفك تلقائياً)`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}
