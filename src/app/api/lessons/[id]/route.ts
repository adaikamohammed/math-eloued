import { NextRequest, NextResponse } from "next/server";
import { getLessonsData, saveLessonsData, deleteImageFile } from "@/lib/storage";
import { requireTeacher, resolveReader } from "@/lib/auth";
import { hideUnpublishedSolution } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await resolveReader(req);
  if (!ctx) {
    return NextResponse.json({ error: "يرجى تحديد الأستاذ" }, { status: 400 });
  }
  const { id } = await params;
  const data = await getLessonsData(ctx);
  const lesson = data.lessons.find((l) => l.id === id);

  if (!lesson) {
    return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
  }

  return NextResponse.json(
    { lesson: ctx.mode === "public" ? hideUnpublishedSolution(lesson) : lesson },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك - يرجى تسجيل الدخول" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const body = await req.json();
    const data = await getLessonsData(ctx);
    const lesson = data.lessons.find((l) => l.id === id);
    if (!lesson) {
      return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
    }

    if (body.title !== undefined) lesson.title = String(body.title).trim();
    if (body.level !== undefined) lesson.level = Number(body.level) as 1 | 2 | 3 | 4;
    if (body.number !== undefined) lesson.number = Number(body.number);
    if (body.field !== undefined) lesson.field = body.field ? String(body.field).trim() : undefined;
    if (body.section !== undefined) lesson.section = body.section ? String(body.section).trim() : undefined;
    if (body.notes !== undefined) lesson.notes = body.notes ? String(body.notes).trim() : undefined;
    if (body.homeworkNotes !== undefined) lesson.homeworkNotes = body.homeworkNotes ? String(body.homeworkNotes).trim() : undefined;
    if (body.type !== undefined) lesson.type = String(body.type).trim();
    if (body.homeworkDueAt !== undefined) lesson.homeworkDueAt = body.homeworkDueAt || undefined;
    if (body.solutionPublishAt !== undefined) lesson.solutionPublishAt = body.solutionPublishAt || undefined;

    await saveLessonsData(ctx, data);
    return NextResponse.json({ success: true, lesson });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "فشل تعديل الدرس" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(req, { params });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك - يرجى تسجيل الدخول" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const data = await getLessonsData(ctx);
    const index = data.lessons.findIndex((l) => l.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
    }

    const [removed] = data.lessons.splice(index, 1);
    if (removed.images && Array.isArray(removed.images)) {
      for (const img of removed.images) {
        if (img?.url) {
          await deleteImageFile(ctx, img.url);
        }
      }
    }

    await saveLessonsData(ctx, data);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "فشل حذف الدرس" }, { status: 500 });
  }
}
