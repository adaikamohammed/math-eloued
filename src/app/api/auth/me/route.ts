import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

// نقطة وصول /api/auth/me ترجع الملف الشخصي للمستخدم وحالة الجلسة
export async function GET() {
  try {
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
  } catch (err: any) {
    return NextResponse.json(
      { authenticated: false, role: null, profile: null, user: null },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
