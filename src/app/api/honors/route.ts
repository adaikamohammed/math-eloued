import { NextRequest, NextResponse } from "next/server";
import { getLessonsData, saveLessonsData } from "@/lib/storage";
import { requireTeacher, resolveReader } from "@/lib/auth";
import { HonorStudent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// جلب قائمة لوحة الشرف (عام للجميع)
export async function GET(
  req: NextRequest) {
  const ctx = await resolveReader(req);
  if (!ctx) {
    return NextResponse.json({ error: "يرجى تحديد الأستاذ" }, { status: 400 });
  }
  const { searchParams } = new URL(req.url);
  const className = searchParams.get("class");

  const data = await getLessonsData(ctx);
  let honors = data.honors || [];

  if (className && className !== "all") {
    honors = honors.filter((h) => h.className === className);
  }

  // بدون ترتيب تراتبي تفضيلي (المستخدم طلب: "بدون ترتيب")
  // نتركهم ككوكبة واحدة متألقة

  return NextResponse.json(
    { honors, customClasses: data.customClasses || [] },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

// إضافة تلميذ متميز إلى لوحة الشرف (للأستاذ فقط)
export async function POST(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك - يرجى تسجيل الدخول" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { studentName, className, notes, badge } = body;

    if (!studentName?.trim() || !className?.trim()) {
      return NextResponse.json({ error: "اسم التلميذ والقسم مطلوبان" }, { status: 400 });
    }

    const data = await getLessonsData(ctx);
    data.honors = data.honors || [];

    const newHonor: HonorStudent = {
      id: `honor_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studentName: String(studentName).trim(),
      className: String(className).trim(),
      notes: notes && String(notes).trim().length > 0 ? String(notes).trim() : undefined,
      badge: badge && String(badge).trim().length > 0 ? String(badge).trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    data.honors.unshift(newHonor);
    await saveLessonsData(ctx, data);

    return NextResponse.json({ success: true, honor: newHonor });
  } catch (err: any) {
    console.error("POST /api/honors error:", err);
    return NextResponse.json({ error: err?.message || "فشل إضافة التلميذ" }, { status: 500 });
  }
}

// تعديل بيانات تلميذ في لوحة الشرف (للأستاذ فقط)
export async function PUT(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك - يرجى تسجيل الدخول" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, studentName, className, notes, badge } = body;

    if (!id) {
      return NextResponse.json({ error: "معرّف التلميذ مطلوب" }, { status: 400 });
    }

    const data = await getLessonsData(ctx);
    data.honors = data.honors || [];
    const item = data.honors.find((h) => h.id === id);

    if (!item) {
      return NextResponse.json({ error: "التلميذ غير موجود في القائمة" }, { status: 404 });
    }

    if (studentName !== undefined) item.studentName = String(studentName).trim();
    if (className !== undefined) item.className = String(className).trim();
    if (notes !== undefined) item.notes = String(notes).trim() || undefined;
    if (badge !== undefined) item.badge = String(badge).trim() || undefined;

    await saveLessonsData(ctx, data);
    return NextResponse.json({ success: true, honor: item });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "فشل التعديل" }, { status: 500 });
  }
}

// حذف تلميذ من لوحة الشرف (للأستاذ فقط)
export async function DELETE(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك - يرجى تسجيل الدخول" }, { status: 401 });
  }

  let id = new URL(req.url).searchParams.get("id");
  if (!id) {
    try {
      const body = await req.json();
      id = body?.id;
    } catch {}
  }

  if (!id) {
    return NextResponse.json({ error: "معرّف التلميذ مطلوب" }, { status: 400 });
  }

  try {
    const data = await getLessonsData(ctx);
    data.honors = data.honors || [];
    const index = data.honors.findIndex((h) => h.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "التلميذ غير موجود" }, { status: 404 });
    }

    data.honors.splice(index, 1);
    await saveLessonsData(ctx, data);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "فشل الحذف" }, { status: 500 });
  }
}
