import { NextRequest, NextResponse } from "next/server";
import { getLessonsData, saveLessonsData, deleteImageFile } from "@/lib/storage";
import { requireTeacher, resolveReader } from "@/lib/auth";
import { Lesson, NotebookType, hideUnpublishedSolution } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// جلب الدروس والأعمال الموجهة والسلاسل والملخصات
export async function GET(
  req: NextRequest) {
  const ctx = await resolveReader(req);
  if (!ctx) {
    return NextResponse.json({ error: "يرجى تحديد الأستاذ" }, { status: 400 });
  }
  const { searchParams } = new URL(req.url);
  const levelParam = searchParams.get("level");
  const typeParam = searchParams.get("type"); // "lessons" | "directed_work" | "worksheets" | "summaries"
  const data = await getLessonsData(ctx);

  let lessons = data.lessons;

  // فلترة حسب المستوى (1 أو 2 متوسط)
  if (levelParam) {
    const levelNum = Number(levelParam);
    lessons = lessons.filter((l) => l.level === levelNum);
  }

  // فلترة حسب نوع القسم (كراس الدروس، الأعمال الموجهة، سلاسل التمارين، الملخصات)
  if (typeParam === "directed_work") {
    lessons = lessons.filter((l) => l.type === "directed_work");
  } else if (typeParam === "worksheets") {
    lessons = lessons.filter((l) => l.type === "worksheets");
  } else if (typeParam === "summaries") {
    lessons = lessons.filter((l) => l.type === "summaries");
  } else if (typeParam === "lessons") {
    lessons = lessons.filter((l) => !l.type || l.type === "lessons");
  }

  // ترتيب الدروس تصاعدياً حسب رقم الدرس / الحصة / السلسلة
  lessons.sort((a, b) => a.number - b.number);

  if (ctx.mode === "public") {
    lessons = lessons.map((l) => hideUnpublishedSolution(l));
  }

  return NextResponse.json(
    {
      lessons,
      customClasses: data.customClasses || [],
      timetable: data.timetable || null,
      diaryEntries: data.diaryEntries || [],
      studentRoster: data.studentRoster || [],
      featureFlags: data.featureFlags || null,
      subject: data.subject || null,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

// إضافة درس / حصة أعمال موجهة / سلسلة / ملخص (للأستاذ فقط)
export async function POST(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك - يرجى تسجيل الدخول" }, { status: 401 });
  }

  try {
    const body = await req.json();
    let { level, type, field, section, number, title, notes, homeworkNotes } = body;

    if (!title || !level) {
      return NextResponse.json({ error: "يرجى كتابة عنوان المورد / الحصة / السلسلة" }, { status: 400 });
    }

    title = String(title).trim();
    const validTypes: NotebookType[] = ["lessons", "directed_work", "worksheets", "summaries"];
    const notebookType: NotebookType = validTypes.includes(type) ? type : "lessons";

    // استخراج الرقم تلقائياً إذا كان مكتوباً في العنوان ولم يُدخل يدوياً
    const match = title.match(/^(?:(?:الدرس|المورد|الحصة|سلسلة|ملخص)\s*)?0*(\d+)\s*[:\-–]\s*(.+)$/i);
    let itemNum = Number(number);
    if (!itemNum && match) {
      itemNum = parseInt(match[1], 10);
    }

    const data = await getLessonsData(ctx);
    const existingSame = data.lessons.filter(
      (l) => l.level === Number(level) && (notebookType === "lessons" ? (!l.type || l.type === "lessons") : l.type === notebookType)
    );

    if (!itemNum) {
      itemNum = existingSame.length ? Math.max(...existingSame.map((l) => l.number)) + 1 : 1;
    }

    const newLesson: Lesson = {
      id: `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      level: Number(level) as 1 | 2,
      type: notebookType,
      field: notebookType === "lessons" ? (field ? String(field).trim() : "أنشطة عددية") : (field ? String(field).trim() : undefined),
      section: section ? String(section).trim() : (notebookType === "lessons" ? "المقطع 1 : الأعداد الطبيعية والأعداد العشرية" : undefined),
      number: itemNum,
      title: title,
      notes: notes ? String(notes).trim() : undefined,
      homeworkNotes: homeworkNotes ? String(homeworkNotes).trim() : undefined,
      createdAt: new Date().toISOString(),
      images: [],
      homeworkImages: [],
    };

    data.lessons.push(newLesson);
    await saveLessonsData(ctx, data);

    return NextResponse.json({ lesson: newLesson });
  } catch (err: any) {
    console.error("POST /api/lessons error:", err);
    return NextResponse.json({ error: err?.message || "حدث خطأ أثناء الحفظ" }, { status: 500 });
  }
}

// تعديل بيانات درس / حصة أعمال موجهة / سلسلة / ملخص (للأستاذ فقط)
export async function PUT(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك - يرجى تسجيل الدخول" }, { status: 401 });
  }

  try {
    const body = await req.json();
        // 1. حفظ جدول التوقيت
    if (body.timetable !== undefined) {
      const data = await getLessonsData(ctx);
      data.timetable = body.timetable;
      if (body.customClasses && Array.isArray(body.customClasses)) {
        data.customClasses = body.customClasses;
      }
      await saveLessonsData(ctx, data);
      return NextResponse.json({ success: true, timetable: data.timetable });
    }

    // 2. حفظ قائمة التلاميذ أو الأفواج أو دفتر النصوص
    if (body.studentRoster !== undefined || body.customClasses !== undefined || body.diaryEntries !== undefined) {
      const data = await getLessonsData(ctx);
      if (body.studentRoster !== undefined) data.studentRoster = body.studentRoster;
      if (body.customClasses !== undefined) data.customClasses = body.customClasses;
      if (body.diaryEntries !== undefined) data.diaryEntries = body.diaryEntries;
      await saveLessonsData(ctx, data);
      return NextResponse.json({
        success: true,
        studentRoster: data.studentRoster,
        customClasses: data.customClasses,
        diaryEntries: data.diaryEntries,
      });
    }

    const { id, title, number, field, section, notes, homeworkNotes, type, homeworkDueAt, solutionPublishAt } = body;

    if (!id) {
      return NextResponse.json({ error: "معرّف العنصر مطلوب" }, { status: 400 });
    }

    const data = await getLessonsData(ctx);
    const lesson = data.lessons.find((l) => l.id === id);
    if (!lesson) {
      return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });
    }

    if (title !== undefined) lesson.title = String(title).trim();
    if (number !== undefined) lesson.number = Number(number);
    if (field !== undefined) lesson.field = field ? String(field).trim() : undefined;
    if (section !== undefined) lesson.section = section ? String(section).trim() : undefined;
    if (notes !== undefined) lesson.notes = notes ? String(notes).trim() : undefined;
    if (homeworkNotes !== undefined) lesson.homeworkNotes = homeworkNotes ? String(homeworkNotes).trim() : undefined;
    const toIso = (v: unknown) => {
      if (!v) return undefined;
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
    };
    if (homeworkDueAt !== undefined) lesson.homeworkDueAt = toIso(homeworkDueAt);
    if (solutionPublishAt !== undefined) lesson.solutionPublishAt = toIso(solutionPublishAt);
    if (type !== undefined) {
      const validTypes: NotebookType[] = ["lessons", "directed_work", "worksheets", "summaries"];
      if (validTypes.includes(type)) lesson.type = type;
    }

    await saveLessonsData(ctx, data);
    return NextResponse.json({ success: true, lesson });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "فشل التعديل" }, { status: 500 });
  }
}

// حذف عنصر وصوره (للأستاذ فقط)
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
    return NextResponse.json({ error: "معرّف العنصر مطلوب" }, { status: 400 });
  }

  try {
    const data = await getLessonsData(ctx);
    const index = data.lessons.findIndex((l) => l.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });
    }

    const [removed] = data.lessons.splice(index, 1);

    // حذف الصور من التخزين
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
    console.error("DELETE lesson error:", err);
    return NextResponse.json({ error: err?.message || "حدث خطأ أثناء حذف العنصر" }, { status: 500 });
  }
}
