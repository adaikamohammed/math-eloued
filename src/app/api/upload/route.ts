import { NextRequest, NextResponse } from "next/server";
import { getLessonsData, updateLessonsData, uploadImageFile } from "@/lib/storage";
import { requireTeacher } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 20;
import { LessonImage } from "@/lib/types";

export async function POST(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const lessonId = formData.get("lessonId") as string;
    const singleFile = formData.get("file") as File | null;
    const multipleFiles = formData.getAll("files") as File[];
    const allFiles = multipleFiles.length > 0 ? multipleFiles : (singleFile ? [singleFile] : []);

    if (!lessonId || allFiles.length === 0) {
      return NextResponse.json({ error: "بيانات ناقصة: لم يتم إرسال أي ملف" }, { status: 400 });
    }

    const limited = rateLimit(`upload:${ctx.teacherId}`, 120, 10 * 60_000);
    if (limited) return limited;

    if (allFiles.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json({ error: `الحد الأقصى ${MAX_FILES_PER_REQUEST} ملفاً في المرة الواحدة` }, { status: 400 });
    }
    for (const f of allFiles) {
      const pdfByName = f.name?.toLowerCase().endsWith(".pdf");
      const name = (f.name || "").toLowerCase();
      const isImg = f.type?.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|gif|bmp|jfif)$/i.test(name);
      if (!isImg && !ALLOWED_TYPES.includes(f.type) && !(pdfByName && (!f.type || f.type === "application/octet-stream"))) {
        return NextResponse.json({ error: `نوع الملف غير مسموح: ${f.name} (صور JPG/PNG/WebP أو PDF فقط)` }, { status: 415 });
      }
      if (f.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: `الملف ${f.name} يتجاوز 10 ميغابايت` }, { status: 413 });
      }
    }

    const data = await getLessonsData(ctx);
    const lesson = data.lessons.find((l) => l.id === lessonId);
    if (!lesson) {
      return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
    }

    const isHomework = formData.get("isHomework") === "true" || formData.get("type") === "homework";

    const newImages: LessonImage[] = [];

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const isPdf =
        file.type === "application/pdf" ||
        (file.name && file.name.toLowerCase().endsWith(".pdf"));

      const fallbackFileName = isPdf
        ? (isHomework ? `homework-solution-${i + 1}.pdf` : `lesson-file-${i + 1}.pdf`)
        : (isHomework ? `homework-solution-${i + 1}.jpg` : `lesson-image-${i + 1}.jpg`);

      const { url, downloadUrl } = await uploadImageFile(
        ctx,
        file,
        file.name || fallbackFileName,
        lessonId,
        lesson.level
      );

      const defaultName = isHomework
        ? (lesson.type === "worksheets"
            ? (isPdf ? "ملف حل السلسلة (PDF)" : `حل السلسلة ${i + 1}`)
            : (isPdf ? "ملف حل الواجب (PDF)" : `حل الواجب المنزلي ${i + 1}`))
        : (lesson.type === "worksheets"
            ? (isPdf ? "ملف السلسلة (PDF)" : `صورة السلسلة ${i + 1}`)
            : lesson.type === "summaries"
            ? (isPdf ? "ملف الملخص (PDF)" : `صورة الملخص ${i + 1}`)
            : (isPdf ? "ملف الدرس (PDF)" : `صورة الدرس ${i + 1}`));

      newImages.push({
        id: `img_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        url,
        downloadUrl,
        name: file.name || defaultName,
        createdAt: new Date().toISOString(),
        fileType: isPdf ? "pdf" : "image",
      });
    }

    // الرفع يستغرق ثواني: نعيد قراءة البيانات الآن ونحفظ مع إعادة المحاولة كي لا نمحو تعديلاً حدث أثناءه
    const savedLesson = await updateLessonsData(ctx, (fresh) => {
      const target = fresh.lessons.find((l) => l.id === lessonId);
      if (!target) throw new Error("الدرس غير موجود");
      if (isHomework) {
        if (!Array.isArray(target.homeworkImages)) target.homeworkImages = [];
        target.homeworkImages.push(...newImages);
      } else {
        if (!Array.isArray(target.images)) target.images = [];
        target.images.push(...newImages);
      }
      return target;
    });

    return NextResponse.json({
      images: newImages,
      image: newImages[0],
      lesson: savedLesson,
      isHomework,
      count: newImages.length,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "فشل رفع الملفات" }, { status: 500 });
  }
}
