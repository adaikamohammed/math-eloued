import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

// حالة الجلسة الحالية (حساب Supabase): يستعملها فضاء الأستاذ للتحقق من الدخول
export async function GET() {
  const { user, profile } = await getSessionProfile();
  const isTeacher = Boolean(user && profile && (profile.role === "teacher" || profile.role === "admin"));
  return NextResponse.json(
    {
      authenticated: isTeacher,
      role: profile?.role ?? null,
      profile: isTeacher ? profile : null,
      user: isTeacher ? profile : null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// تسجيل الخروج (مسح كوكيز الجلسة)
export async function DELETE() {
  const { supabase } = await getSessionProfile();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
