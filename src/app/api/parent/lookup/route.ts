import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth";
import {
  matchesStudentName,
  ParentStudentReport,
} from "@/lib/parentLookupHelper";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (
      searchParams.get("code") ||
      searchParams.get("birthDate") ||
      searchParams.get("birth") ||
      ""
    ).trim();
    const nameQuery = (
      searchParams.get("name") ||
      searchParams.get("studentName") ||
      ""
    ).trim();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال تاريخ ميلاد التلميذ (مثال: 2013-07-10)" },
        { status: 400 }
      );
    }

    const normalizedCode = code.replace(/\//g, "-").trim();
    const supabase = await createSupabaseServerClient();

    // 1. جلب قائمة حسابات الأساتذة
    const { data: teachers, error: tErr } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "teacher");

    if (tErr || !Array.isArray(teachers) || teachers.length === 0) {
      return NextResponse.json(
        { success: false, error: "خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً" },
        { status: 500 }
      );
    }

    let matchingReports: ParentStudentReport[] = [];

    // 2. البحث في البيانات العامة لكل أستاذ عبر دالة get_teacher_public_data المتاحة للعامة
    for (const teacher of teachers) {
      try {
        const { data: pubData, error: rpcErr } = await supabase.rpc(
          "get_teacher_public_data",
          { p_teacher_id: teacher.id }
        );

        if (rpcErr || !pubData) continue;

        if (
          pubData.parentGradebookLookup &&
          typeof pubData.parentGradebookLookup === "object"
        ) {
          const found = pubData.parentGradebookLookup[normalizedCode];
          if (Array.isArray(found) && found.length > 0) {
            const enriched = found.map((rep: any) => ({
              ...rep,
              teacherName:
                rep.teacherName && rep.teacherName !== "الأستاذ"
                  ? rep.teacherName
                  : teacher.full_name || "الأستاذ",
            }));
            matchingReports.push(...enriched);
          }
        }
      } catch (err) {
        console.warn("Error looking up teacher public data:", teacher.id, err);
      }
    }

    if (matchingReports.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `لم يتم العثور على أي نتائج مسجلة بتاريخ الميلاد (${normalizedCode}). يرجى التأكد من كتابة التاريخ بالشكل الصحيح أو التواصل مع الأستاذ.`,
        },
        { status: 404 }
      );
    }

    // 3. مطابقة الاسم إن وُجد (اختياري)
    if (nameQuery) {
      const filtered = matchingReports.filter((rep) =>
        matchesStudentName(rep.studentName, nameQuery)
      );

      if (filtered.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: `لم يتم العثور على تلميذ باسم أو لقب "${nameQuery}" يحمل تاريخ الميلاد (${normalizedCode}). يرجى التأكد من الاسم وتاريخ الميلاد.`,
          },
          { status: 404 }
        );
      }
      matchingReports = filtered;
    } else if (matchingReports.length > 1) {
      // فقط في حال تشابه التواريخ (توأم) ولم يكتب الولي الاسم
      return NextResponse.json(
        {
          success: false,
          requireName: true,
          error: "يوجد أكثر من تلميذ بنفس تاريخ الميلاد (توأم أو تشابه تواريخ). يرجى كتابة اسم أو لقب التلميذ أيضاً لفتح كشفه فقط.",
        },
        { status: 400 }
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
    const name = (body.name || body.studentName || "").trim();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال تاريخ ميلاد التلميذ" },
        { status: 400 }
      );
    }

    const url = new URL(`/api/parent/lookup`, req.url);
    url.searchParams.set("code", code);
    if (name) url.searchParams.set("name", name);

    const fakeReq = new NextRequest(url);
    return GET(fakeReq);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
