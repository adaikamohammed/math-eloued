import { NextRequest, NextResponse } from "next/server";
import { getLessonsData, saveLessonsData } from "@/lib/storage";
import { requireTeacher, resolveReader } from "@/lib/auth";
import { Announcement, AnnouncementCategory } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// جلب قائمة الإعلانات (متاح للجميع مع دعم الفلترة حسب المستوى أو الفوج)
export async function GET(req: NextRequest) {
  const ctx = await resolveReader(req);
  if (!ctx) {
    return NextResponse.json({ error: "يرجى تحديد الأستاذ" }, { status: 400 });
  }
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";
  const level = searchParams.get("level"); // e.g. "1am", "2am", "3am", "4am"
  const targetClass = searchParams.get("class");

  const data = await getLessonsData(ctx);
  let list = data.announcements || [];

  // إذا لم يكن طلباً شاملاً، نظهر الإعلانات النشطة فقط
  if (!all) {
    list = list.filter((a) => a.active !== false);
  }

  // فلترة حسب المستوى إن وجد
  if (level) {
    const lvlKey = level.toLowerCase();
    list = list.filter(
      (a) =>
        !a.targetLevel ||
        a.targetLevel === "all" ||
        a.targetLevel.toLowerCase().includes(lvlKey) ||
        (lvlKey === "1am" && a.targetLevel.includes("1م")) ||
        (lvlKey === "2am" && a.targetLevel.includes("2م")) ||
        (lvlKey === "3am" && a.targetLevel.includes("3م")) ||
        (lvlKey === "4am" && a.targetLevel.includes("4م"))
    );
  }

  // فلترة حسب الفوج إن وجد
  if (targetClass) {
    const cleanCls = targetClass.trim().replace(/\s+/g, "");
    list = list.filter(
      (a) =>
        !a.targetLevel ||
        a.targetLevel === "all" ||
        a.targetLevel.replace(/\s+/g, "").includes(cleanCls)
    );
  }

  // ترتيب الإعلانات: المثبت أولاً (pinned)، ثم الأحدث إنشاءً أو تاريخاً
  list.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
  });

  return NextResponse.json(
    { announcements: list },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

// إضافة إعلان جديد بصوت أو صورة أو نص ومحدد المستوى (للأستاذ فقط)
export async function POST(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك - يرجى تسجيل الدخول" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      title,
      content,
      category = "general",
      date,
      pinned = false,
      targetLevel = "all",
      imageUrl,
      audioUrl,
      audioDuration,
    } = body;

    if (!title?.trim() && !content?.trim() && !audioUrl && !imageUrl) {
      return NextResponse.json({ error: "يرجى كتابة عنوان أو نص أو إرفاق صورة/تسجيل صوتي" }, { status: 400 });
    }

    const data = await getLessonsData(ctx);
    data.announcements = data.announcements || [];

    const now = new Date();
    const newAnnouncement: Announcement = {
      id: `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: String(title || "إعلان وتنبيه جديد").trim(),
      content: String(content || "").trim(),
      category: (category as AnnouncementCategory) || "general",
      date: date ? String(date).trim() : now.toLocaleDateString("ar-DZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      pinned: Boolean(pinned),
      active: true,
      createdAt: now.toISOString(),
      targetLevel: targetLevel ? String(targetLevel).trim() : "all",
      imageUrl: imageUrl ? String(imageUrl) : undefined,
      audioUrl: audioUrl ? String(audioUrl) : undefined,
      audioDuration: typeof audioDuration === "number" ? audioDuration : undefined,
      teacherId: ctx.teacherId,
    };

    data.announcements.unshift(newAnnouncement);
    await saveLessonsData(ctx, data);

    return NextResponse.json({ success: true, announcement: newAnnouncement });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "حدث خطأ أثناء حفظ الإعلان" }, { status: 500 });
  }
}

// تعديل إعلان (للأستاذ فقط)
export async function PUT(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك - يرجى تسجيل الدخول" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      id,
      title,
      content,
      category,
      date,
      pinned,
      active,
      targetLevel,
      imageUrl,
      audioUrl,
      audioDuration,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "معرّف الإعلان مطلوب" }, { status: 400 });
    }

    const data = await getLessonsData(ctx);
    data.announcements = data.announcements || [];

    const index = data.announcements.findIndex((a) => a.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "الإعلان غير موجود" }, { status: 404 });
    }

    const existing = data.announcements[index];
    data.announcements[index] = {
      ...existing,
      title: title !== undefined ? String(title).trim() : existing.title,
      content: content !== undefined ? String(content).trim() : existing.content,
      category: category !== undefined ? (category as AnnouncementCategory) : existing.category,
      date: date !== undefined ? String(date).trim() : existing.date,
      pinned: pinned !== undefined ? Boolean(pinned) : existing.pinned,
      active: active !== undefined ? Boolean(active) : existing.active,
      targetLevel: targetLevel !== undefined ? String(targetLevel).trim() : existing.targetLevel,
      imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
      audioUrl: audioUrl !== undefined ? audioUrl : existing.audioUrl,
      audioDuration: audioDuration !== undefined ? audioDuration : existing.audioDuration,
    };

    await saveLessonsData(ctx, data);

    return NextResponse.json({ success: true, announcement: data.announcements[index] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "حدث خطأ أثناء تعديل الإعلان" }, { status: 500 });
  }
}

// حذف إعلان (للأستاذ فقط)
export async function DELETE(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك - يرجى تسجيل الدخول" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "معرّف الإعلان مطلوب" }, { status: 400 });
    }

    const data = await getLessonsData(ctx);
    data.announcements = (data.announcements || []).filter((a) => a.id !== id);

    await saveLessonsData(ctx, data);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "حدث خطأ أثناء حذف الإعلان" }, { status: 500 });
  }
}
