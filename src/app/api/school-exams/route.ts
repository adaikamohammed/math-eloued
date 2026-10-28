import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSessionProfile } from "@/lib/auth";
import { SchoolExamItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const EXAMS_FILE = path.join(process.cwd(), "data", "school_exams.json");

async function readExamsFile(): Promise<SchoolExamItem[]> {
  try {
    const raw = await fs.readFile(EXAMS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeExamsFile(exams: SchoolExamItem[]): Promise<void> {
  const dir = path.dirname(EXAMS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(EXAMS_FILE, JSON.stringify(exams, null, 2), "utf-8");
}

// GET /api/school-exams: جلب جدول الفروض الرسمي
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("schoolId");
  const schoolName = searchParams.get("schoolName");
  const levelParam = searchParams.get("level");
  const semesterParam = searchParams.get("semester");

  let exams = await readExamsFile();

  if (schoolId) {
    exams = exams.filter((e) => e.middleSchoolId === schoolId);
  }

  if (levelParam) {
    const lvl = Number(levelParam) as 1 | 2 | 3 | 4;
    exams = exams.filter((e) => e.level === lvl);
  }

  if (semesterParam) {
    const sem = Number(semesterParam) as 1 | 2 | 3;
    exams = exams.filter((e) => e.semester === sem);
  }

  // ترتيب حسب التاريخ ثم التوقيت
  exams.sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.timeSlot || "").localeCompare(b.timeSlot || ""));

  return NextResponse.json({ exams });
}

// POST /api/school-exams: إضافة أو تحديث فرض رسمي (خاص بالمدير والناظر والمشرف)
export async function POST(req: NextRequest) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile) {
    return NextResponse.json({ error: "غير مصرح، يرجى تسجيل الدخول" }, { status: 401 });
  }

  // التحقق من الصلاحيات: مدير المؤسسة أو المشرف العام
  if (profile.role !== "principal" && profile.role !== "admin") {
    return NextResponse.json(
      { error: "عذراً، تحديد جدول الفروض الرسمي من صلاحيات مدير المتوسطة أو الناظر فقط" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { exam } = body as { exam: SchoolExamItem };

  if (!exam || !exam.subjectName || !exam.date || !exam.level) {
    return NextResponse.json({ error: "يرجى استكمال البيانات الإلزامية للفرض" }, { status: 400 });
  }

  const exams = await readExamsFile();
  const schoolId = profile.middle_school_id || profile.school_custom_name || "default_school";

  const newExam: SchoolExamItem = {
    ...exam,
    id: exam.id || `exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    middleSchoolId: exam.middleSchoolId || schoolId,
    isPublished: exam.isPublished ?? true,
    updatedAt: new Date().toISOString(),
    createdAt: exam.createdAt || new Date().toISOString(),
  };

  const existingIdx = exams.findIndex((e) => e.id === newExam.id);
  if (existingIdx >= 0) {
    exams[existingIdx] = newExam;
  } else {
    exams.push(newExam);
  }

  await writeExamsFile(exams);

  return NextResponse.json({ success: true, exam: newExam });
}

// DELETE /api/school-exams: حذف فرض رسمي
export async function DELETE(req: NextRequest) {
  const { user, profile } = await getSessionProfile();
  if (!user || !profile || (profile.role !== "principal" && profile.role !== "admin")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const examId = searchParams.get("id");
  if (!examId) {
    return NextResponse.json({ error: "يرجى تحديد معرف الفرض" }, { status: 400 });
  }

  let exams = await readExamsFile();
  exams = exams.filter((e) => e.id !== examId);
  await writeExamsFile(exams);

  return NextResponse.json({ success: true });
}
