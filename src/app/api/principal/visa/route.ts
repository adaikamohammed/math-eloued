import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSessionProfile } from "@/lib/auth";
import { PrincipalVisaRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

const VISAS_FILE = path.join(process.cwd(), "data", "principal_visas.json");

async function readVisasFile(): Promise<PrincipalVisaRecord[]> {
  try {
    const raw = await fs.readFile(VISAS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeVisasFile(visas: PrincipalVisaRecord[]): Promise<void> {
  const dir = path.dirname(VISAS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(VISAS_FILE, JSON.stringify(visas, null, 2), "utf-8");
}

// GET /api/principal/visa: جلب تأشيرات الأستاذ أو تأشيرات المؤسسة
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId");
  const schoolId = searchParams.get("schoolId");

  let visas = await readVisasFile();

  if (teacherId) {
    visas = visas.filter((v) => v.teacherId === teacherId);
  } else if (schoolId) {
    visas = visas.filter((v) => v.middleSchoolId === schoolId);
  }

  // ترتيب من الأحدث إلى الأقدم
  visas.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  return NextResponse.json({ visas });
}

// POST /api/principal/visa: تسجيل تأشيرة إدارية رسمية جديدة من المدير/الناظر
export async function POST(req: NextRequest) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  if (profile.role !== "principal" && profile.role !== "admin") {
    return NextResponse.json(
      { error: "عذراً، وضع التأشيرة الإدارية من صلاحيات مدير المؤسسة أو الناظر حصرياً" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { teacherId, teacherName, visaType, feedbackNote, status } = body;

  if (!teacherId) {
    return NextResponse.json({ error: "يرجى تحديد الأستاذ المعني" }, { status: 400 });
  }

  const visas = await readVisasFile();

  const newVisa: PrincipalVisaRecord = {
    id: `visa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    teacherId,
    teacherName: teacherName || "أستاذ المادة",
    principalId: user.id,
    principalName: profile.full_name || "السيد مدير المؤسسة",
    middleSchoolId: profile.middle_school_id || profile.school_custom_name || undefined,
    visaDate: new Date().toISOString().split("T")[0],
    visaType: visaType || "cahier_textes",
    feedbackNote: feedbackNote || "",
    status: status || "approved",
    createdAt: new Date().toISOString(),
  };

  visas.unshift(newVisa);
  await writeVisasFile(visas);

  return NextResponse.json({ success: true, visa: newVisa });
}
