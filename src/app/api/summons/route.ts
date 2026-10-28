import { NextRequest, NextResponse } from "next/server";
import { getLessonsData, saveLessonsData } from "@/lib/storage";
import { requireTeacher, resolveReader } from "@/lib/auth";
import { ParentSummons } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// توليد رمز سري مكون من 4 أرقام للاستدعاء
function generateAccessCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// جلب قائمة استدعاءات الأولياء
// للأستاذ المالك: تظهر جميع الاستدعاءات مع الرموز السرية لتسليمها للأولياء
// للولي أو الزائر العام: تتطلب إدخال الرمز السري الخاص بالتلميذ، ولا يُعرض أي اسم علناً (امتثالاً للقانون 18-07 و 15-12)
export async function GET(req: NextRequest) {
  const ctx = await resolveReader(req);
  if (!ctx) {
    return NextResponse.json({ error: "يرجى تحديد الأستاذ" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const codeParam = searchParams.get("code")?.trim().toUpperCase();
  const studentParam = searchParams.get("student")?.trim().toLowerCase();

  const data = await getLessonsData(ctx);
  let summons = data.summons || [];

  // إذا كان هناك استدعاءات قديمة ليس لها رمز سري، نولّد لها رموزاً تلقائياً
  let needsSave = false;
  summons = summons.map((s) => {
    if (!s.accessCode) {
      needsSave = true;
      return { ...s, accessCode: generateAccessCode() };
    }
    return s;
  });

  if (needsSave && ctx.mode === "owner") {
    data.summons = summons;
    try {
      await saveLessonsData(ctx, data);
    } catch {}
  }

  // 1. إذا كان الطالب هو الأستاذ صاحب الحساب: يرى جميع الاستدعاءات لإدارتها
  if (ctx.mode === "owner") {
    summons.sort((a, b) => {
      if (a.isUrgent && !b.isUrgent) return -1;
      if (!a.isUrgent && b.isUrgent) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(
      { summons, isOwner: true },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }

  // 2. إذا كان زائر عام أو ولي أمر:
  // حماية خصوصية الأطفال الصارمة: لا نرسل أي استدعاء إطلاقاً إلا إذا تطابق الرمز السري المدخل
  if (codeParam) {
    const matched = summons.filter((s) => {
      const codeMatch = (s.accessCode || "").trim().toUpperCase() === codeParam;
      if (!codeMatch) return false;
      if (studentParam) {
        const normName = s.studentName.trim().toLowerCase();
        return normName.includes(studentParam) || studentParam.includes(normName);
      }
      return true;
    });

    return NextResponse.json(
      {
        summons: matched,
        notFound: matched.length === 0,
        isOwner: false,
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

  // إذا لم يرسل الرمز السري: نرجع مصفوفة فارغة لعدم تسريب أي معطيات شخصية
  return NextResponse.json(
    { summons: [], isOwner: false, requiresCode: true },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

// إضافة استدعاء ولي أمر جديد (للأستاذ فقط)
export async function POST(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك - يرجى تسجيل الدخول" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { studentName, studentNames, className, notes, isUrgent, accessCode } = body;
    const rawNames = studentNames || studentName || "";
    const names: string[] = Array.isArray(rawNames)
      ? rawNames.map((s) => String(s).trim()).filter(Boolean)
      : String(rawNames)
          .split(/[\n,،]+/)
          .map((s) => s.trim())
          .filter(Boolean);

    if (names.length === 0 || !className?.trim()) {
      return NextResponse.json({ error: "اسم التلميذ والقسم مطلوبان" }, { status: 400 });
    }

    const data = await getLessonsData(ctx);
    data.summons = data.summons || [];

    const created: ParentSummons[] = [];
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const customCode = accessCode && names.length === 1 ? String(accessCode).trim().toUpperCase() : generateAccessCode();

      const newSummons: ParentSummons = {
        id: `summons_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${i}`,
        studentName: name,
        className: String(className).trim(),
        accessCode: customCode,
        notes: notes ? String(notes).trim() : undefined,
        isUrgent: Boolean(isUrgent),
        createdAt: new Date(Date.now() + i).toISOString(),
      };
      created.push(newSummons);
      data.summons.unshift(newSummons);
    }

    await saveLessonsData(ctx, data);

    return NextResponse.json({ success: true, summons: created[0], allSummons: created });
  } catch (err: any) {
    console.error("POST /api/summons error:", err);
    return NextResponse.json({ error: err?.message || "فشل تسجيل الاستدعاء" }, { status: 500 });
  }
}

// تعديل استدعاء (للأستاذ فقط)
export async function PUT(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك - يرجى تسجيل الدخول" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, studentName, className, notes, isUrgent, accessCode } = body;

    if (!id) {
      return NextResponse.json({ error: "معرّف الاستدعاء مطلوب" }, { status: 400 });
    }

    const data = await getLessonsData(ctx);
    data.summons = data.summons || [];
    const item = data.summons.find((s) => s.id === id);

    if (!item) {
      return NextResponse.json({ error: "الاستدعاء غير موجود" }, { status: 404 });
    }

    if (studentName !== undefined) item.studentName = String(studentName).trim();
    if (className !== undefined) item.className = String(className).trim();
    if (notes !== undefined) item.notes = notes ? String(notes).trim() : undefined;
    if (isUrgent !== undefined) item.isUrgent = Boolean(isUrgent);
    if (accessCode !== undefined) item.accessCode = accessCode ? String(accessCode).trim().toUpperCase() : generateAccessCode();

    await saveLessonsData(ctx, data);
    return NextResponse.json({ success: true, summons: item });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "فشل التعديل" }, { status: 500 });
  }
}

// حذف استدعاء (للأستاذ فقط)
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
    return NextResponse.json({ error: "معرّف الاستدعاء مطلوب" }, { status: 400 });
  }

  try {
    const data = await getLessonsData(ctx);
    data.summons = data.summons || [];
    const index = data.summons.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "الاستدعاء غير موجود" }, { status: 404 });
    }

    data.summons.splice(index, 1);
    await saveLessonsData(ctx, data);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "فشل الحذف" }, { status: 500 });
  }
}
