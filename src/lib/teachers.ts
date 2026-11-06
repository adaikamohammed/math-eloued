import { supabase } from "./supabase";
import { parseTeacherInputCode } from "./teacherCodes";

// الأعمدة العامة المسموح بها في سياسات الأمان
export const PUBLIC_TEACHER_COLUMNS =
  "id, role, full_name, district_id, middle_school_id, school_custom_name, teacher_code, slug, levels_taught, avatar_url, bio, reception";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// البحث عن أستاذ بالمعرّف أو الرابط أو الكود باستعلامات متسلسلة غير حساسة لحالة الأحرف
export async function findPublicTeacher(key: string) {
  const value = decodeURIComponent(key || "").trim();
  if (!value) return null;

  const base = () =>
    supabase
      .from("profiles")
      .select(PUBLIC_TEACHER_COLUMNS);

  // 1. فحص المعرف UUID
  if (UUID_RE.test(value)) {
    const { data } = await base().eq("id", value).maybeSingle();
    if (data) return data;
  }

  // 2. فحص الرابط Slug (مطابقة غير حساسة لحالة الأحرف ilike ومطابقة الأحرف الصغيرة)
  const bySlugIlike = await base().ilike("slug", value).maybeSingle();
  if (bySlugIlike.data) return bySlugIlike.data;

  const bySlugExact = await base().eq("slug", value.toLowerCase()).maybeSingle();
  if (bySlugExact.data) return bySlugExact.data;

  // 3. فحص كود الأستاذ teacher_code (مثل MTH-704 أو mth-704)
  const byCode = await base().ilike("teacher_code", value.toUpperCase()).maybeSingle();
  if (byCode.data) return byCode.data;

  // 4. فحص الكود المشفر للمستوى (مثل MTH-704-K7R أو MTH-704-1)
  const parsed = parseTeacherInputCode(value);
  if (parsed.baseCode && parsed.baseCode.toUpperCase() !== value.toUpperCase()) {
    const byParsed = await base().ilike("teacher_code", parsed.baseCode.toUpperCase()).maybeSingle();
    if (byParsed.data) return byParsed.data;
  }

  // 5. محاولة إضافية بدون شرطات
  const noDash = value.replace(/\s+/g, "").toUpperCase();
  if (noDash !== value.toUpperCase()) {
    const byNoDash = await base().ilike("teacher_code", noDash).maybeSingle();
    if (byNoDash.data) return byNoDash.data;
  }

  return null;
}
