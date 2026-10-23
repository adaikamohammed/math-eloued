import { supabase } from "./supabase";

// الأعمدة العامة المسموح بها في سياسات الأمان
export const PUBLIC_TEACHER_COLUMNS =
  "id, full_name, district_id, middle_school_id, school_custom_name, teacher_code, slug, levels_taught, avatar_url, bio, reception";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// البحث عن أستاذ بالمعرّف أو الرابط أو الكود باستعلامات منفصلة
export async function findPublicTeacher(key: string) {
  const value = decodeURIComponent(key).trim();
  if (!value) return null;

  const base = () =>
    supabase
      .from("profiles")
      .select(PUBLIC_TEACHER_COLUMNS)
      .eq("role", "teacher");

  if (UUID_RE.test(value)) {
    const { data } = await base().eq("id", value).maybeSingle();
    if (data) return data;
  }
  const bySlug = await base().eq("slug", value).maybeSingle();
  if (bySlug.data) return bySlug.data;
  const byCode = await base().eq("teacher_code", value.toUpperCase()).maybeSingle();
  return byCode.data ?? null;
}
