import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth";
import { ParentInquiry } from "@/lib/types";

export const dynamic = "force-dynamic";

// استعلام الولي عن حالة استفسار ورد الأستاذ بواسطة كود التتبع
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get("code") || "").trim().toUpperCase();
    const token = (searchParams.get("token") || "").trim();
    const id = (searchParams.get("id") || "").trim();

    if (!code && !id) {
      return NextResponse.json({ error: "كود التتبع أو معرّف الاستفسار مطلوب" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // جلب كافة السجلات العامة من teacher_public_data
    const { data: rows, error } = await supabase
      .from("teacher_public_data")
      .select("teacher_id, data");

    if (error) {
      return NextResponse.json({ error: "تعذر الاستعلام حالياً" }, { status: 500 });
    }

    let foundInquiry: ParentInquiry | null = null;

    if (Array.isArray(rows)) {
      for (const row of rows) {
        const publicInquiries = row.data?.publicInquiries;
        if (Array.isArray(publicInquiries)) {
          const match = publicInquiries.find(
            (item: any) =>
              (code && item.trackingCode?.toUpperCase() === code) ||
              (id && item.id === id)
          );
          if (match) {
            // التحقق من الرمز السري إن وُجد لحماية الخصوصية
            if (!token || token === match.secretToken) {
              foundInquiry = match;
              break;
            }
          }
        }
      }
    }

    if (!foundInquiry) {
      return NextResponse.json(
        { error: "لم يتم العثور على استفسار مطابق، أو لا يزال قيد المعالجة من الأستاذ" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      inquiry: foundInquiry,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// مزامنة دفعة من الاستفسارات المحفوظة في هاتف الولي
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ inquiries: [] });
    }

    const supabase = await createSupabaseServerClient();
    const { data: rows } = await supabase
      .from("teacher_public_data")
      .select("teacher_id, data");

    const matchedInquiries: ParentInquiry[] = [];

    if (Array.isArray(rows)) {
      for (const row of rows) {
        const publicInquiries = row.data?.publicInquiries;
        if (Array.isArray(publicInquiries)) {
          for (const pub of publicInquiries) {
            const reqItem = items.find(
              (it: any) =>
                (it.id && it.id === pub.id) ||
                (it.trackingCode && it.trackingCode.toUpperCase() === pub.trackingCode?.toUpperCase())
            );
            if (reqItem) {
              // التحقق من الرمز السري
              if (!reqItem.secretToken || reqItem.secretToken === pub.secretToken) {
                matchedInquiries.push(pub);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      inquiries: matchedInquiries,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
