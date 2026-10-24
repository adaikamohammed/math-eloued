import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

// حالة الجلسة الحالية (حساب Supabase): يستعملها فضاء الأستاذ والمفتش للتحقق من الدخول
export async function GET() {
  const { user, profile } = await getSessionProfile();
  const isAuthenticated = Boolean(user && profile);
  return NextResponse.json(
    {
      authenticated: isAuthenticated,
      role: profile?.role ?? null,
      profile: isAuthenticated ? profile : null,
      user: isAuthenticated ? profile : null,
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
