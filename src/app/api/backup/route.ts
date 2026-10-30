import { NextRequest, NextResponse } from "next/server";
import { getLessonsData } from "@/lib/storage";
import { requireTeacher, getSessionProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// تصدير النسخة الاحتياطية الشاملة لبيانات الأستاذ (JSON Backup)
// يحفظ كامل مجهود الأستاذ: الدروس، دفتر النصوص، التوقيت، قوائم التلاميذ، الاستدعاءات، لوحات الشرف
export async function GET(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json(
      { error: "غير مصرح لك - يرجى تسجيل الدخول أولاً لتنزيل نسختك الاحتياطية." },
      { status: 401 }
    );
  }

  try {
    const { user, profile } = await getSessionProfile();
    const data = await getLessonsData(ctx);

    const backupPayload = {
      exportVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      platform: "منصة جسور التعليمية — حيث يلتقي الأستاذ، الولي، والتلميذ",
      teacher: {
        id: ctx.teacherId,
        email: ctx.email || user?.email || "",
        name: profile?.full_name || "الأستاذ",
      },
      summary: {
        totalLessons: data.lessons?.length || 0,
        totalDiaryEntries: data.diaryEntries?.length || 0,
        totalStudents: data.studentRoster?.length || 0,
        totalSummons: data.summons?.length || 0,
        totalHonors: data.honors?.length || 0,
      },
      data: data,
    };

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `jusoor-backup-${ctx.teacherId || "teacher"}-${dateStr}.json`;

    return new NextResponse(JSON.stringify(backupPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "حدث خطأ أثناء إعداد النسخة الاحتياطية" },
      { status: 500 }
    );
  }
}
