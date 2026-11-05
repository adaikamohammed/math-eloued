import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { moderateMessage } from "@/lib/moderation";
import { getSessionProfile } from "@/lib/auth";
import { isSuperAdminEmail, AdminInquiry, AdminInquiryCategory } from "@/lib/types";
import { generateAdminTrackingCode, generateAdminSecretToken } from "@/lib/adminInquiries";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FALLBACK_FILE = path.join(process.cwd(), "data", "admin_inquiries.json");

// قراءة التذاكر الاحتياطية محلياً في حال تعذر الاتصال بـ Supabase
async function readFallbackInquiries(): Promise<AdminInquiry[]> {
  try {
    const raw = await fs.readFile(FALLBACK_FILE, "utf-8");
    const json = JSON.parse(raw);
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

// حفظ تذكرة في الملف الاحتياطي
async function saveFallbackInquiry(inquiry: AdminInquiry): Promise<void> {
  try {
    const dir = path.dirname(FALLBACK_FILE);
    await fs.mkdir(dir, { recursive: true });
    const list = await readFallbackInquiries();
    const idx = list.findIndex((x) => x.id === inquiry.id || x.trackingCode === inquiry.trackingCode);
    if (idx >= 0) {
      list[idx] = inquiry;
    } else {
      list.unshift(inquiry);
    }
    await fs.writeFile(FALLBACK_FILE, JSON.stringify(list.slice(0, 500), null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save fallback inquiry:", err);
  }
}

// 1. إرسال رسالة جديدة لإدارة المنصة (مفتوح للجميع: أستاذ / زائر / معلوم / مجهول)
export async function POST(req: NextRequest) {
  const limited = rateLimit(`admin_inq:${clientIp(req)}`, 8, 10 * 60_000);
  if (limited) return limited;

  try {
    const body = await req.json();
    const {
      senderType = "visitor",
      isAnonymous = false,
      senderName,
      senderEmail,
      senderPhone,
      senderRole,
      teacherId,
      teacherCode,
      subjectName,
      schoolName,
      wilaya,
      category = "general",
      title,
      content,
      website,
      hp_email,
    } = body;

    // فحص المحتوى والسبام
    const cleanContent = String(content || "").trim();
    const cleanTitle = String(title || "").trim();

    if (!cleanTitle || !cleanContent) {
      return NextResponse.json(
        { error: "يرجى كتابة عنوان الرسالة ونص المحتوى كاملاً." },
        { status: 400 }
      );
    }

    const mod = moderateMessage(`${cleanTitle}\n${cleanContent}`, website || hp_email);
    if (mod.isSpamBot) {
      return NextResponse.json({
        success: true,
        trackingCode: "ADM-OK-BOT",
        secretToken: "sec_bot",
        message: "تم إرسال رسالتك بنجاح إلى إدارة المنصة وسيتم الرد عليها قريباً.",
      });
    }

    if (!mod.allowed) {
      return NextResponse.json(
        { error: mod.reason || "تعذر إرسال الرسالة لمخالفتها معايير الآداب العامة والنشر." },
        { status: 400 }
      );
    }

    // توليد المعرفات الفريدة
    const trackingCode = generateAdminTrackingCode();
    const secretToken = generateAdminSecretToken();
    const nowIso = new Date().toISOString();

    const inquiry: AdminInquiry = {
      id: `admtk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      trackingCode,
      secretToken,
      senderType: senderType === "teacher" ? "teacher" : "visitor",
      isAnonymous: Boolean(isAnonymous),
      senderName: isAnonymous ? "مجهول الهوية 🎭" : (senderName || "").trim() || "زائر للمنصة",
      senderEmail: isAnonymous ? undefined : (senderEmail || "").trim() || undefined,
      senderPhone: isAnonymous ? undefined : (senderPhone || "").trim() || undefined,
      senderRole: isAnonymous
        ? "مجهول الهوية"
        : (senderRole || (senderType === "teacher" ? "أستاذ بالمنصة" : "زائر")).trim(),
      teacherId: isAnonymous ? undefined : teacherId || undefined,
      teacherCode: isAnonymous ? undefined : teacherCode || undefined,
      subjectName: isAnonymous ? undefined : subjectName || undefined,
      schoolName: isAnonymous ? undefined : schoolName || undefined,
      wilaya: (wilaya || "الوادي").trim(),
      category: (category as AdminInquiryCategory) || "general",
      title: cleanTitle,
      content: cleanContent,
      status: "pending",
      readBySender: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // حفظ في قاعدة البيانات (Supabase مع دعم Fallback محلي)
    let dbSaved = false;
    try {
      const adminClient = getSupabaseAdmin() || supabase;
      const { error: dbErr } = await adminClient.from("admin_inquiries").insert({
        id: inquiry.id.startsWith("admtk_") ? undefined : inquiry.id,
        tracking_code: inquiry.trackingCode,
        secret_token: inquiry.secretToken,
        sender_type: inquiry.senderType,
        is_anonymous: inquiry.isAnonymous,
        sender_name: inquiry.senderName,
        sender_email: inquiry.senderEmail,
        sender_phone: inquiry.senderPhone,
        sender_role: inquiry.senderRole,
        teacher_id: inquiry.teacherId,
        teacher_code: inquiry.teacherCode,
        subject_name: inquiry.subjectName,
        school_name: inquiry.schoolName,
        wilaya: inquiry.wilaya,
        category: inquiry.category,
        title: inquiry.title,
        content: inquiry.content,
        status: "pending",
        created_at: inquiry.createdAt,
        updated_at: inquiry.updatedAt,
      });

      if (!dbErr) dbSaved = true;
    } catch {
      // Supabase table not created yet or connection error
    }

    // حفظ في الملف الاحتياطي لضمان عدم ضياع أي رسالة
    await saveFallbackInquiry(inquiry);

    return NextResponse.json({
      success: true,
      message: "تم إرسال رسالتك بنجاح إلى مدير المنصة 🏛️! احتفظ بكود التتبع للاطلاع على الرد بدقة.",
      trackingCode: inquiry.trackingCode,
      secretToken: inquiry.secretToken,
      inquiry,
    });
  } catch (err: any) {
    console.error("Error submitting admin inquiry:", err);
    return NextResponse.json(
      { error: err.message || "حدث خطأ أثناء إرسال الرسالة، يرجى المحاولة لاحقاً." },
      { status: 500 }
    );
  }
}

// 2. جلب كافة الرسائل لمدير المنصة فقط (حساب الإدارة والمشرف العام)
export async function GET(req: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile();
    const isSuper = Boolean(
      (user?.email && isSuperAdminEmail(user.email)) || profile?.role === "admin"
    );

    if (!isSuper) {
      return NextResponse.json(
        { error: "غير مصرح لك — هذا البريد خاص بمدير المنصة وحساب الإدارة فقط." },
        { status: 403 }
      );
    }

    const map = new Map<string, AdminInquiry>();

    // 1. جلب من Supabase
    try {
      const adminClient = getSupabaseAdmin() || supabase;
      const { data, error } = await adminClient
        .from("admin_inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        for (const r of data) {
          const item: AdminInquiry = {
            id: r.id,
            trackingCode: r.tracking_code,
            secretToken: r.secret_token,
            senderType: r.sender_type,
            isAnonymous: Boolean(r.is_anonymous),
            senderName: r.sender_name,
            senderEmail: r.sender_email,
            senderPhone: r.sender_phone,
            senderRole: r.sender_role,
            teacherId: r.teacher_id,
            teacherCode: r.teacher_code,
            subjectName: r.subject_name,
            schoolName: r.school_name,
            wilaya: r.wilaya,
            category: r.category,
            title: r.title,
            content: r.content,
            status: r.status,
            adminReply: r.admin_reply,
            repliedAt: r.replied_at,
            repliedBy: r.replied_by,
            readBySender: Boolean(r.read_by_sender),
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
          map.set(item.trackingCode, item);
        }
      }
    } catch {}

    // 2. دمج مع الملف الاحتياطي
    const fallbacks = await readFallbackInquiries();
    for (const fb of fallbacks) {
      if (!map.has(fb.trackingCode)) {
        map.set(fb.trackingCode, fb);
      }
    }

    const list = Array.from(map.values());
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ inquiries: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "حدث خطأ في جلب التذاكر." }, { status: 500 });
  }
}
