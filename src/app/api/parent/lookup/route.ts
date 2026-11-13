import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth";
import { buildParentGradebookLookup, ParentStudentReport } from "@/lib/parentLookupHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get("code") || searchParams.get("birthDate") || searchParams.get("birth") || "").trim();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال تاريخ ميلاد التلميذ (مثال: 2013-07-10)" },
        { status: 400 }
      );
    }

    const normalizedCode = code.replace(/\//g, "-").trim();
    const supabase = await createSupabaseServerClient();

    // البحث في البيانات العامة لجميع الأساتذة
    const { data: rows, error } = await supabase
      .from("teacher_public_data")
      .select("teacher_id, data");

    if (error) {
      return NextResponse.json({ success: false, error: "خطأ في الاتصال بالخادم" }, { status: 500 });
    }

    let matchingReports: ParentStudentReport[] = [];

    if (Array.isArray(rows)) {
      for (const row of rows) {
        const d = row.data as any;
        if (!d) continue;

        // 1. الفحص في الفهرس الجاهز
        if (d.parentGradebookLookup && typeof d.parentGradebookLookup === "object") {
          const found = d.parentGradebookLookup[normalizedCode];
          if (Array.isArray(found) && found.length > 0) {
            matchingReports.push(...found);
            continue;
          }
        }

        // 2. الفحص في مسرد التلاميذ كاحتياط
        const roster = Array.isArray(d.studentRoster) ? d.studentRoster : [];
        const hasMatchingStudent = roster.some((s: any) => {
          const b = (s.birthDate || "").replace(/\//g, "-").trim();
          return b === normalizedCode;
        });

        if (hasMatchingStudent) {
          const generatedLookup = buildParentGradebookLookup(roster, d.gradebookRecords || [], {
            subjectName: typeof d.subject === "string" ? d.subject : d.subject?.name || "الرياضيات",
          });
          const found = generatedLookup[normalizedCode];
          if (Array.isArray(found)) {
            matchingReports.push(...found);
          }
        }
      }
    }

    if (matchingReports.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "لم يتم العثور على أي نتائج مسجلة بهذا التاريخ. يرجى التأكد من كتابة تاريخ الميلاد بالشكل الصحيح (مثال: 2013-07-10) أو التواصل مع الأستاذ.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      reports: matchingReports,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = (body.code || body.birthDate || "").trim();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال تاريخ ميلاد التلميذ" },
        { status: 400 }
      );
    }

    const fakeReq = new NextRequest(new URL(`/api/parent/lookup?code=${encodeURIComponent(code)}`, req.url));
    return GET(fakeReq);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
