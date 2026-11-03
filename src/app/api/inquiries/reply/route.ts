import { NextRequest, NextResponse } from "next/server";
import { getLessonsData, saveLessonsData } from "@/lib/storage";
import { requireTeacher, getSessionProfile } from "@/lib/auth";
import { buildWhatsAppReplyUrl } from "@/lib/inquiries";
import { ParentInquiry } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك - الرد مخصص للأستاذ فقط" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { inquiryId, replyContent } = body;

    const trimmedReply = (replyContent || "").trim();
    if (!inquiryId) {
      return NextResponse.json({ error: "معرّف الاستفسار مطلوب" }, { status: 400 });
    }
    if (trimmedReply.length < 2) {
      return NextResponse.json({ error: "يرجى كتابة نص الرد البيداغوجي" }, { status: 400 });
    }

    const { profile } = await getSessionProfile();
    const teacherName = profile?.full_name || "الأستاذ";

    const data = await getLessonsData(ctx);
    data.parentInquiries = data.parentInquiries || [];
    data.publicInquiries = data.publicInquiries || [];

    // البحث عن الاستفسار في parentInquiries
    let inquiry = data.parentInquiries.find((i) => i.id === inquiryId);

    // إذا لم يكن موجوداً مباشرة، نبحث في anonymousMessages لاستخراجه
    if (!inquiry && Array.isArray(data.anonymousMessages)) {
      for (const msg of data.anonymousMessages) {
        if (msg.content && msg.content.includes(inquiryId)) {
          try {
            const parsed = JSON.parse(msg.content);
            if (parsed && parsed.__type === "parent_inquiry" && parsed.inquiry) {
              inquiry = parsed.inquiry as ParentInquiry;
              data.parentInquiries.push(inquiry);
              break;
            }
          } catch {}
        }
      }
    }

    if (!inquiry) {
      return NextResponse.json({ error: "الاستفسار غير موجود في فضاء الأستاذ" }, { status: 404 });
    }

    // تسجيل الرد وتحديث الحالة
    const repliedAt = new Date().toISOString();
    inquiry.reply = {
      content: trimmedReply,
      repliedAt,
      teacherName,
    };
    inquiry.status = "answered";
    inquiry.readByTeacher = true;

    // مزامنة الاستفسار والرد في publicInquiries ليتمكن الولي من قراءته فوراً بكود التتبع
    const pubIndex = data.publicInquiries.findIndex((p) => p.id === inquiryId);
    if (pubIndex >= 0) {
      data.publicInquiries[pubIndex] = inquiry;
    } else {
      data.publicInquiries.unshift(inquiry);
    }

    // تحديث أيضاً في anonymousMessages إن وُجدت
    if (Array.isArray(data.anonymousMessages)) {
      data.anonymousMessages = data.anonymousMessages.map((m) => {
        if (m.content.includes(inquiryId)) {
          return { ...m, read: true };
        }
        return m;
      });
    }

    await saveLessonsData(ctx, data);

    // تجهيز رابط الواتساب إن توفر هاتف الولي
    let whatsAppUrl = "";
    if (inquiry.parentPhone) {
      whatsAppUrl = buildWhatsAppReplyUrl(
        inquiry.parentPhone,
        inquiry.studentName,
        teacherName,
        trimmedReply
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم حفظ وإرسال ردك للولي بنجاح 🌸",
      inquiry,
      whatsAppUrl,
    });
  } catch (err: any) {
    console.error("Error replying to inquiry:", err);
    return NextResponse.json(
      { error: err.message || "حدث خطأ أثناء حفظ الرد" },
      { status: 500 }
    );
  }
}
