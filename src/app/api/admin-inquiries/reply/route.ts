import { NextRequest, NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { isSuperAdminEmail, AdminInquiry } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const FALLBACK_FILE = path.join(process.cwd(), "data", "admin_inquiries.json");

async function readFallbackInquiries(): Promise<AdminInquiry[]> {
  try {
    const raw = await fs.readFile(FALLBACK_FILE, "utf-8");
    const json = JSON.parse(raw);
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

async function updateFallbackInquiry(updated: AdminInquiry): Promise<void> {
  try {
    const list = await readFallbackInquiries();
    const idx = list.findIndex(
      (x) => x.id === updated.id || x.trackingCode === updated.trackingCode
    );
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updated };
      await fs.writeFile(FALLBACK_FILE, JSON.stringify(list, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("Failed to update fallback inquiry:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, profile } = await getSessionProfile();
    const isSuper = Boolean(
      (user?.email && isSuperAdminEmail(user.email)) || profile?.role === "admin"
    );

    if (!isSuper) {
      return NextResponse.json(
        { error: "غير مصرح لك — الرد على التذاكر محصور في مدير المنصة فقط." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, trackingCode, adminReply, status = "answered", repliedBy } = body;

    const replyClean = String(adminReply || "").trim();
    if (!replyClean) {
      return NextResponse.json({ error: "نص الرد لا يمكن أن يكون فارغاً." }, { status: 400 });
    }

    if (!id && !trackingCode) {
      return NextResponse.json({ error: "معرف التذكرة أو كود التتبع مطلوب." }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const managerName =
      (repliedBy || profile?.full_name || "مدير منصة جسور التعليمية").trim() + " 🏛️";

    let updatedTicket: AdminInquiry | null = null;

    // 1. تحديث في Supabase
    try {
      const adminClient = getSupabaseAdmin() || supabase;
      let query = adminClient
        .from("admin_inquiries")
        .update({
          admin_reply: replyClean,
          replied_at: nowIso,
          replied_by: managerName,
          status: status === "closed" ? "closed" : "answered",
          read_by_sender: false,
          updated_at: nowIso,
        });

      if (id) {
        query = query.eq("id", id);
      } else {
        query = query.eq("tracking_code", trackingCode);
      }

      const { data, error } = await query.select("*").maybeSingle();
      if (!error && data) {
        updatedTicket = {
          id: data.id,
          trackingCode: data.tracking_code,
          secretToken: data.secret_token,
          senderType: data.sender_type,
          isAnonymous: Boolean(data.is_anonymous),
          senderName: data.sender_name,
          senderEmail: data.sender_email,
          senderPhone: data.sender_phone,
          senderRole: data.sender_role,
          teacherId: data.teacher_id,
          teacherCode: data.teacher_code,
          subjectName: data.subject_name,
          schoolName: data.school_name,
          wilaya: data.wilaya,
          category: data.category,
          title: data.title,
          content: data.content,
          status: data.status,
          adminReply: data.admin_reply,
          repliedAt: data.replied_at,
          repliedBy: data.replied_by,
          readBySender: Boolean(data.read_by_sender),
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch {}

    // 2. تحديث في الملف الاحتياطي
    const fallbacks = await readFallbackInquiries();
    const fb = fallbacks.find(
      (f) => f.id === id || (trackingCode && f.trackingCode === trackingCode)
    );
    if (fb) {
      fb.adminReply = replyClean;
      fb.repliedAt = nowIso;
      fb.repliedBy = managerName;
      fb.status = status === "closed" ? "closed" : "answered";
      fb.readBySender = false;
      fb.updatedAt = nowIso;
      await updateFallbackInquiry(fb);
      if (!updatedTicket) updatedTicket = fb;
    }

    return NextResponse.json({
      success: true,
      message: "تم حفظ واعتماد الرد بنجاح! سيتمكن المرسل من قراءته فوراً.",
      inquiry: updatedTicket,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "فشل حفظ الرد." }, { status: 500 });
  }
}
