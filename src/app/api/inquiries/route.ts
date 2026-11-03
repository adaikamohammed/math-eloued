import { NextRequest, NextResponse } from "next/server";
import { getLessonsData, saveLessonsData } from "@/lib/storage";
import { requireTeacher, createSupabaseServerClient } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { moderateMessage } from "@/lib/moderation";
import { ParentInquiry } from "@/lib/types";
import {
  generateSecretToken,
  generateTrackingCode,
  validateInquiryPayload,
} from "@/lib/inquiries";
import { findPublicTeacher } from "@/lib/teachers";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// إرسال استفسار جديد من الولي للأستاذ
export async function POST(req: NextRequest) {
  const limited = rateLimit(`inq:${clientIp(req)}`, 10, 10 * 60_000);
  if (limited) return limited;

  try {
    const body = await req.json();
    const { teacherId, teacherCode, website, hp_email } = body;

    // 1. فحص السبام
    const contentText = (body.content || "").trim();
    const mod = moderateMessage(contentText, website || hp_email);
    if (mod.isSpamBot) {
      return NextResponse.json({
        success: true,
        trackingCode: "INQ-JSR-OK",
        message: "تم إرسال استفسارك بنجاح للأستاذ وسيتم الرد عليه قريباً.",
      });
    }
    if (!mod.allowed) {
      return NextResponse.json(
        { error: mod.reason || "تعذر إرسال الاستفسار لمخالفته معايير النشر." },
        { status: 400 }
      );
    }

    // 2. التحقق من صحة حقول الاستفسار
    const validation = validateInquiryPayload(body);
    if (!validation.valid || !validation.cleanData) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // 3. تحديد الأستاذ المستهدف والتحقق من حسابه بشكل قطعي ومرن
    const targetKey = (teacherId || teacherCode || body.teacherSlug || "").toString().trim();
    const teacherProfile = await findPublicTeacher(targetKey);

    if (!teacherProfile || !teacherProfile.id) {
      return NextResponse.json({ error: "الأستاذ المستهدف غير موجود أو لم يتم تحديده" }, { status: 404 });
    }
    const resolvedTeacherId = teacherProfile.id;

    // 4. إنشاء نموذج الاستفسار المنظم
    const inquiryId = `inq_${Date.now()}_${randomBytes(3).toString("hex")}`;
    const trackingCode = generateTrackingCode(teacherProfile.teacher_code);
    const secretToken = generateSecretToken();

    const inquiry: ParentInquiry = {
      id: inquiryId,
      trackingCode,
      secretToken,
      teacherId: resolvedTeacherId,
      teacherCode: teacherProfile.teacher_code || undefined,
      teacherName: teacherProfile.full_name || "الأستاذ",
      subject: (teacherProfile as any).subject || undefined,
      parentName: validation.cleanData.parentName,
      studentName: validation.cleanData.studentName,
      studentGroup: validation.cleanData.studentGroup,
      parentPhone: validation.cleanData.parentPhone,
      category: validation.cleanData.category,
      content: validation.cleanData.content,
      createdAt: new Date().toISOString(),
      status: "pending",
      readByTeacher: false,
    };

    // 5. حفظ الاستفسار في فضاء الأستاذ عبر دالة post_anonymous_message المحمية
    // لضمان الوصول إلى teacher_private_data دون الحاجة لمفتاح service_role
    const payloadForStorage = {
      category: "question",
      targetLevel: `ولي أمر - ${validation.cleanData.studentName} (${validation.cleanData.studentGroup})`,
      content: JSON.stringify({
        __type: "parent_inquiry",
        inquiry,
      }),
    };

    const { error: rpcErr } = await supabase.rpc("post_anonymous_message", {
      p_teacher_id: resolvedTeacherId,
      p_message: payloadForStorage,
    });

    if (rpcErr) {
      console.error("RPC post_anonymous_message error:", rpcErr);
      throw new Error("تعذر إيصال الاستفسار لقاعدة البيانات");
    }

    return NextResponse.json({
      success: true,
      message: "تم إرسال استفسارك بنجاح إلى أستاذ المادة 📨",
      inquiry,
      trackingCode,
      secretToken,
    });
  } catch (err: any) {
    console.error("Error submitting parent inquiry:", err);
    return NextResponse.json(
      { error: err.message || "حدث خطأ أثناء إرسال الاستفسار، يرجى المحاولة لاحقاً" },
      { status: 500 }
    );
  }
}

// جلب قائمة الاستفسارات الخاصة بالأستاذ المسجل
export async function GET(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }

  try {
    const data = await getLessonsData(ctx);

    // دمج الاستفسارات من parentInquiries واستخراج أي استفسارات وردت عبر anonymousMessages
    const directInquiries = Array.isArray(data.parentInquiries) ? data.parentInquiries : [];
    const fromMessages: ParentInquiry[] = [];

    if (Array.isArray(data.anonymousMessages)) {
      for (const msg of data.anonymousMessages) {
        if (msg.content && msg.content.includes('"__type":"parent_inquiry"')) {
          try {
            const parsed = JSON.parse(msg.content);
            if (parsed && parsed.__type === "parent_inquiry" && parsed.inquiry) {
              const inq = parsed.inquiry as ParentInquiry;
              // مزامنة حالة القراءة إن وُجدت
              if (msg.read !== undefined) inq.readByTeacher = Boolean(msg.read);
              fromMessages.push(inq);
            }
          } catch {}
        }
      }
    }

    // دمج ومنع التكرار حسب المعرّف
    const map = new Map<string, ParentInquiry>();
    for (const item of directInquiries) {
      map.set(item.id, item);
    }
    for (const item of fromMessages) {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    }

    const allInquiries = Array.from(map.values());
    allInquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(
      { inquiries: allInquiries },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "حدث خطأ في جلب الاستفسارات" }, { status: 500 });
  }
}

// تبديل حالة القراءة للأستاذ
export async function PATCH(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });

  try {
    const { id, read } = await req.json();
    if (!id) return NextResponse.json({ error: "معرف الاستفسار مطلوب" }, { status: 400 });

    const data = await getLessonsData(ctx);
    data.parentInquiries = data.parentInquiries || [];

    let found = false;
    data.parentInquiries = data.parentInquiries.map((i) => {
      if (i.id === id) {
        found = true;
        return { ...i, readByTeacher: read !== undefined ? Boolean(read) : !i.readByTeacher };
      }
      return i;
    });

    // تحديث أيضاً في anonymousMessages إن كانت مخزنة هناك
    if (Array.isArray(data.anonymousMessages)) {
      data.anonymousMessages = data.anonymousMessages.map((m) => {
        if (m.content.includes(id)) {
          return { ...m, read: read !== undefined ? Boolean(read) : !m.read };
        }
        return m;
      });
    }

    await saveLessonsData(ctx, data);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// حذف استفسار
export async function DELETE(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "معرف الاستفسار مطلوب" }, { status: 400 });

    const data = await getLessonsData(ctx);
    data.parentInquiries = (data.parentInquiries || []).filter((i) => i.id !== id);
    data.publicInquiries = (data.publicInquiries || []).filter((i) => i.id !== id);
    if (Array.isArray(data.anonymousMessages)) {
      data.anonymousMessages = data.anonymousMessages.filter((m) => !m.content.includes(id));
    }

    await saveLessonsData(ctx, data);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
