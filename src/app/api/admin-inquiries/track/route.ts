import { NextRequest, NextResponse } from "next/server";
import { AdminInquiry } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

// 1. استعلام مفرد عن التذكرة بالرابط وكود التتبع والرمز السري (GET)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get("code") || "").trim();
    const token = (searchParams.get("token") || "").trim();

    if (!code) {
      return NextResponse.json({ error: "كود التتبع مطلوب" }, { status: 400 });
    }

    let found: AdminInquiry | null = null;

    // محاولة الاستعلام من Supabase
    try {
      const adminClient = getSupabaseAdmin() || supabase;
      let query = adminClient
        .from("admin_inquiries")
        .select("*")
        .ilike("tracking_code", code);

      if (token) {
        query = query.eq("secret_token", token);
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        found = {
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

    // إن لم توجد في Supabase، البحث في الملف الاحتياطي
    if (!found) {
      const fallbacks = await readFallbackInquiries();
      found =
        fallbacks.find(
          (f) =>
            f.trackingCode.toUpperCase() === code.toUpperCase() &&
            (!token || f.secretToken === token)
        ) || null;
    }

    if (!found) {
      return NextResponse.json(
        { error: "لم يتم العثور على أي تذكرة بهذا الكود أو الرمز السري." },
        { status: 404 }
      );
    }

    return NextResponse.json({ inquiry: found });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "حدث خطأ أثناء الاستعلام عن التذكرة." },
      { status: 500 }
    );
  }
}

// 2. مزامنة جماعية لتذاكر المتصفح المحفوظة محلياً (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: { trackingCode: string; secretToken: string }[] = Array.isArray(body?.items)
      ? body.items
      : [];

    if (items.length === 0) {
      return NextResponse.json({ inquiries: [] });
    }

    const fallbacks = await readFallbackInquiries();
    const fallbackMap = new Map<string, AdminInquiry>();
    for (const fb of fallbacks) {
      fallbackMap.set(fb.trackingCode.toUpperCase(), fb);
    }

    const results: AdminInquiry[] = [];

    // جلب من Supabase
    try {
      const adminClient = getSupabaseAdmin() || supabase;
      const codes = items.map((i) => i.trackingCode.toUpperCase());
      const { data } = await adminClient
        .from("admin_inquiries")
        .select("*")
        .in("tracking_code", codes);

      if (Array.isArray(data)) {
        for (const r of data) {
          const matchItem = items.find(
            (it) =>
              it.trackingCode.toUpperCase() === r.tracking_code.toUpperCase() &&
              (!it.secretToken || it.secretToken === r.secret_token)
          );
          if (matchItem) {
            results.push({
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
            });
          }
        }
      }
    } catch {}

    // دمج النتائج الناقصة من fallback
    const foundCodes = new Set(results.map((r) => r.trackingCode.toUpperCase()));
    for (const it of items) {
      const codeUpper = it.trackingCode.toUpperCase();
      if (!foundCodes.has(codeUpper) && fallbackMap.has(codeUpper)) {
        const fb = fallbackMap.get(codeUpper)!;
        if (!it.secretToken || it.secretToken === fb.secretToken) {
          results.push(fb);
        }
      }
    }

    return NextResponse.json({ inquiries: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
