import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase";

// سياق الطلب: من يقرأ أو يكتب بيانات أي أستاذ
export interface TeacherContext {
  supabase: SupabaseClient;
  teacherId: string;
  // owner: الأستاذ صاحب الحساب (قراءة وكتابة كاملة) — public: زائر يقرأ البيانات العامة فقط
  mode: "owner" | "public";
  email?: string;
}

// عميل Supabase على الخادم مرتبط بجلسة المستخدم (الكوكيز)
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // مكوّن خادم (Server Component): لا يمكن كتابة الكوكيز، ويكفي تحديثها من المتصفح
        }
      },
    },
  });
}

export async function getSessionProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, district_id, slug, teacher_code, school_custom_name, middle_school_id, levels_taught, is_verified")
    .eq("id", user.id)
    .single();
  return { supabase, user, profile };
}

// الأستاذ المسجل دخوله (يحل محل كلمة المرور المشتركة القديمة)
export async function requireTeacher(): Promise<TeacherContext | null> {
  const { supabase, user, profile } = await getSessionProfile();
  if (!user || !profile) return null;
  if (profile.role !== "teacher" && profile.role !== "admin") return null;
  if (profile.is_verified === false) return null; // حساب معلق من طرف المشرف العام
  return { supabase, teacherId: user.id, mode: "owner", email: user.email };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// قارئ البيانات العامة: ?teacher=<id> للأولياء، أو الأستاذ نفسه إن كان مسجلاً
export async function resolveReader(req: Request): Promise<TeacherContext | null> {
  const teacherParam = new URL(req.url).searchParams.get("teacher");
  const owner = await requireTeacher();

  if (teacherParam) {
    if (!UUID_RE.test(teacherParam)) return null;
    if (owner && owner.teacherId === teacherParam) return owner;
    const supabase = await createSupabaseServerClient();
    return { supabase, teacherId: teacherParam, mode: "public" };
  }
  return owner;
}
