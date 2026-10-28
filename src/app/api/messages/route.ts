import { NextRequest, NextResponse } from "next/server";
import { getLessonsData, saveLessonsData } from "@/lib/storage";
import { requireTeacher, resolveReader } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { MessageCategory } from "@/lib/types";
import { moderateMessage } from "@/lib/moderation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// إرسال رسالة مجهولة الهوية (مفتوح للجميع: تلميذ، ولي أمر... دون تسجيل أي هوية)
export async function POST(req: NextRequest) {
  const limited = rateLimit(`msg:${clientIp(req)}`, 5, 10 * 60_000);
  if (limited) return limited;

  try {
    const body = await req.json();
    const { content, category = "other", targetLevel, website, hp_email } = body;

    const trimmedContent = (content || "").trim();

    // فحص الأمان وفلترة المحتوى والسبام (Honeypot + Word filter)
    const mod = moderateMessage(trimmedContent, website || hp_email);
    if (mod.isSpamBot) {
      // الروبوتات يتم إسقاطها بهدوء مع إرجاع نجاح وهمي دون تلويث فضاء الأستاذ
      return NextResponse.json({
        success: true,
        message: "تم إرسال رسالتك بسرية تامة 🔒! شكراً لصراحتك وملاحظتك القيمة.",
      });
    }
    if (!mod.allowed) {
      return NextResponse.json(
        { error: mod.reason || "تعذر إرسال الرسالة لمخالفتها معايير النشر والآداب العامة." },
        { status: 400 }
      );
    }

    if (trimmedContent.length > 3000) {
      return NextResponse.json(
        { error: "الرسالة طويلة جداً (الحد الأقصى 3000 حرف)" },
        { status: 400 }
      );
    }

    // الأستاذ المستهدف (الرسالة تُحفظ في فضائه الخاص عبر دالة آمنة دون كشف أي بيانات)
    const reader = await resolveReader(req);
    if (!reader) {
      return NextResponse.json({ error: "يرجى تحديد الأستاذ" }, { status: 400 });
    }

    const { error } = await reader.supabase.rpc("post_anonymous_message", {
      p_teacher_id: reader.teacherId,
      p_message: {
        category: (category as MessageCategory) || "other",
        targetLevel: targetLevel ? String(targetLevel).trim() : undefined,
        content: trimmedContent,
      },
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      message: "تم إرسال رسالتك بسرية تامة 🔒! شكراً لصراحتك وملاحظتك القيمة.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة لاحقاً" },
      { status: 500 }
    );
  }
}

// قراءة الرسائل المجهولة (للأستاذ فقط بعد تسجيل الدخول)
export async function GET(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json(
      { error: "غير مصرح لك - هذه الرسائل سرية للأستاذ فقط" },
      { status: 401 }
    );
  }

  const data = await getLessonsData(ctx);
  const list = (data.anonymousMessages || []).slice();

  // ترتيب من الأحدث إلى الأقدم
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json(
    { messages: list },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

// تحديث حالة القراءة (للأستاذ فقط)
export async function PATCH(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, read } = body;

    if (!id) {
      return NextResponse.json({ error: "معرّف الرسالة مطلوب" }, { status: 400 });
    }

    const data = await getLessonsData(ctx);
    data.anonymousMessages = data.anonymousMessages || [];

    const msg = data.anonymousMessages.find((m) => m.id === id);
    if (!msg) {
      return NextResponse.json({ error: "الرسالة غير موجودة" }, { status: 404 });
    }

    msg.read = read !== undefined ? Boolean(read) : !msg.read;
    await saveLessonsData(ctx, data);

    return NextResponse.json({ success: true, message: msg });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "حدث خطأ" }, { status: 500 });
  }
}

// حذف رسالة (للأستاذ فقط)
export async function DELETE(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "معرّف الرسالة مطلوب" }, { status: 400 });
    }

    const data = await getLessonsData(ctx);
    data.anonymousMessages = (data.anonymousMessages || []).filter((m) => m.id !== id);

    await saveLessonsData(ctx, data);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "حدث خطأ أثناء الحذف" }, { status: 500 });
  }
}
