import { NextRequest, NextResponse } from "next/server";
import { getLessonsData, removeStudent, saveLessonsData } from "@/lib/storage";
import { requireTeacher } from "@/lib/auth";
import { StudentEvaluation, EvaluationRating } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// دالة مساعدة لحساب التقدير اللفظي واللون من المجموع
function calculateRating(totalScore: number): {
  rating: EvaluationRating;
  ratingColor: "green" | "emerald" | "amber" | "rose";
} {
  if (totalScore >= 18) return { rating: "excellent", ratingColor: "emerald" }; // ممتاز 🟢
  if (totalScore >= 15) return { rating: "very_good", ratingColor: "green" }; // جيد جداً 🟢
  if (totalScore >= 12) return { rating: "good", ratingColor: "emerald" }; // جيد 🔵
  if (totalScore >= 10) return { rating: "medium", ratingColor: "amber" }; // متوسط 🟡
  return { rating: "weak", ratingColor: "rose" }; // ضعيف 🔴
}

// 1. جلب التقييمات
export async function GET(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const className = searchParams.get("class");
  const groupName = searchParams.get("group");

  const data = await getLessonsData(ctx);
  let evaluations = data.evaluations || [];

  if (className && className !== "all") {
    evaluations = evaluations.filter(
      (e) => (e.className || "").replace(/\s+/g, "") === className.replace(/\s+/g, "")
    );
  }

  if (groupName && groupName !== "all") {
    evaluations = evaluations.filter((e) => e.groupName === groupName);
  }

  return NextResponse.json(
    { evaluations },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}

// 2. تسجيل تقييم أو مجموعة تقييمات
export async function POST(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = await getLessonsData(ctx);
    if (!data.evaluations) data.evaluations = [];

    // دعم استيراد قائمة تلاميذ دفعة واحدة
    if (Array.isArray(body.students) && body.className) {
      const cls = String(body.className).trim();
      const grp = (body.groupName || "فوج 1") as "فوج 1" | "فوج 2" | "القسم كامل";
      const createdItems: StudentEvaluation[] = [];

      for (const rawName of body.students) {
        const name = String(rawName).trim();
        if (!name) continue;

        // التحقق من عدم التكرار لنفس التلميذ في نفس القسم
        const existing = data.evaluations.find(
          (e) =>
            e.studentName.trim().toLowerCase() === name.toLowerCase() &&
            e.className.replace(/\s+/g, "") === cls.replace(/\s+/g, "")
        );

        if (existing) {
          existing.groupName = grp;
          existing.updatedAt = new Date().toISOString();
          createdItems.push(existing);
          continue;
        }

        const nbScore = body.notebookScore !== undefined ? Number(body.notebookScore) : 5;
        const hwScore = body.homeworkScore !== undefined ? Number(body.homeworkScore) : 5;
        const tlScore = body.toolsScore !== undefined ? Number(body.toolsScore) : 5;
        const actScore = body.activityScore !== undefined ? Number(body.activityScore) : 5;
        const total = Math.min(20, Math.max(0, nbScore + hwScore + tlScore + actScore));
        const { rating, ratingColor } = calculateRating(total);

        const newEval: StudentEvaluation = {
          id: `eval_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          studentName: name,
          className: cls,
          groupName: grp,
          notebookScore: nbScore,
          notebookComplete: nbScore >= 4,
          homeworkScore: hwScore,
          homeworkDone: hwScore >= 4,
          toolsScore: tlScore,
          hasTools: tlScore >= 4,
          activityScore: actScore,
          totalScore: total,
          rating,
          ratingColor,
          notes: body.notes ? String(body.notes).trim() : undefined,
          updatedAt: new Date().toISOString(),
        };

        data.evaluations.push(newEval);
        createdItems.push(newEval);
      }

      if (!data.studentRoster) data.studentRoster = [];
      for (const item of createdItems) {
        const iName = item.studentName.trim().toLowerCase();
        const iCls = item.className.replace(/\s+/g, "");
        const existingRoster = data.studentRoster.find(
          (r) =>
            (r.studentName || "").trim().toLowerCase() === iName &&
            (r.className || "").replace(/\s+/g, "") === iCls
        );
        if (!existingRoster) {
          data.studentRoster.push({
            id: item.id || `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            studentName: item.studentName,
            className: item.className,
            groupName: item.groupName || "فوج 1",
            createdAt: item.updatedAt || new Date().toISOString(),
          });
        } else if (item.groupName) {
          existingRoster.groupName = item.groupName;
        }
      }

      await saveLessonsData(ctx, data);
      return NextResponse.json({ success: true, count: createdItems.length, evaluations: createdItems });
    }

    // إضافة أو تحديث تقييم تلميذ فردي
    const {
      studentName,
      className,
      groupName,
      notebookScore = 5,
      homeworkScore = 5,
      toolsScore = 5,
      activityScore = 5,
      notes,
    } = body;

    if (!studentName || !className) {
      return NextResponse.json({ error: "اسم التلميذ والقسم مطلوبان" }, { status: 400 });
    }

    const nb = Number(notebookScore);
    const hw = Number(homeworkScore);
    const tl = Number(toolsScore);
    const act = Number(activityScore);
    const total = Math.min(20, Math.max(0, nb + hw + tl + act));
    const { rating, ratingColor } = calculateRating(total);

    const newEval: StudentEvaluation = {
      id: `eval_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studentName: String(studentName).trim(),
      className: String(className).trim(),
      groupName: (groupName || "فوج 1") as any,
      notebookScore: nb,
      notebookComplete: nb >= 4,
      homeworkScore: hw,
      homeworkDone: hw >= 4,
      toolsScore: tl,
      hasTools: tl >= 4,
      activityScore: act,
      totalScore: total,
      rating,
      ratingColor,
      notes: notes ? String(notes).trim() : undefined,
      updatedAt: new Date().toISOString(),
    };

    data.evaluations.push(newEval);

    if (!data.studentRoster) data.studentRoster = [];
    const sName = newEval.studentName.trim().toLowerCase();
    const sCls = newEval.className.replace(/\s+/g, "");
    const existingRoster = data.studentRoster.find(
      (r) =>
        (r.studentName || "").trim().toLowerCase() === sName &&
        (r.className || "").replace(/\s+/g, "") === sCls
    );
    if (!existingRoster) {
      data.studentRoster.push({
        id: newEval.id || `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        studentName: newEval.studentName,
        className: newEval.className,
        groupName: newEval.groupName || "فوج 1",
        createdAt: newEval.updatedAt || new Date().toISOString(),
      });
    } else if (newEval.groupName) {
      existingRoster.groupName = newEval.groupName;
    }

    await saveLessonsData(ctx, data);

    return NextResponse.json({ success: true, evaluation: newEval });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "فشل تسجيل التقييم" }, { status: 500 });
  }
}

// 3. تحديث تقييم تلميذ (نقرة زر سريعة في الحصة)
export async function PUT(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "معرف التقييم مطلوب" }, { status: 400 });

    const data = await getLessonsData(ctx);
    if (!data.evaluations) data.evaluations = [];

    const item = data.evaluations.find((e) => e.id === id);
    if (!item) return NextResponse.json({ error: "التلميذ غير موجود في القائمة" }, { status: 404 });

    const oldName = item.studentName;
    const oldCls = item.className;

    if (body.studentName !== undefined) item.studentName = String(body.studentName).trim();
    if (body.className !== undefined) item.className = String(body.className).trim();
    if (body.groupName !== undefined) item.groupName = body.groupName;

    if (data.studentRoster) {
      const rosterItem = data.studentRoster.find(
        (r) =>
          r.id === item.id ||
          ((r.studentName || "").trim().toLowerCase() === oldName.trim().toLowerCase() &&
           (r.className || "").replace(/\s+/g, "") === oldCls.replace(/\s+/g, ""))
      );
      if (rosterItem) {
        if (body.studentName !== undefined) rosterItem.studentName = item.studentName;
        if (body.className !== undefined) rosterItem.className = item.className;
        if (body.groupName !== undefined) rosterItem.groupName = item.groupName;
      }
    }

    // تحديث الدرجات الجزئية
    if (body.notebookScore !== undefined) {
      item.notebookScore = Number(body.notebookScore);
      item.notebookComplete = item.notebookScore >= 4;
    }
    if (body.homeworkScore !== undefined) {
      item.homeworkScore = Number(body.homeworkScore);
      item.homeworkDone = item.homeworkScore >= 4;
    }
    if (body.toolsScore !== undefined) {
      item.toolsScore = Number(body.toolsScore);
      item.hasTools = item.toolsScore >= 4;
    }
    if (body.activityScore !== undefined) {
      item.activityScore = Number(body.activityScore);
    }
    if (body.notes !== undefined) {
      item.notes = body.notes ? String(body.notes).trim() : undefined;
    }

    // إعادة حساب المجموع والتقدير
    item.totalScore = Math.min(
      20,
      Math.max(0, item.notebookScore + item.homeworkScore + item.toolsScore + item.activityScore)
    );
    const { rating, ratingColor } = calculateRating(item.totalScore);
    item.rating = rating;
    item.ratingColor = ratingColor;
    item.updatedAt = new Date().toISOString();

    await saveLessonsData(ctx, data);
    return NextResponse.json({ success: true, evaluation: item });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "فشل تحديث التقييم" }, { status: 500 });
  }
}

// 4. حذف تقييم أو مسح قسم
export async function DELETE(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const clearClass = searchParams.get("class");
  const clearAll = searchParams.get("all") === "true";

  const data = await getLessonsData(ctx);
  if (!data.evaluations) data.evaluations = [];

  if (clearAll) {
    data.evaluations = [];
    data.studentRoster = [];
    await saveLessonsData(ctx, data);
    return NextResponse.json({ success: true, message: "تم مسح كافة التقييمات وقائمة التلاميذ" });
  }

  if (clearClass) {
    const cls = clearClass.replace(/\s+/g, "");
    data.evaluations = data.evaluations.filter(
      (e) => (e.className || "").replace(/\s+/g, "") !== cls
    );
    if (data.studentRoster) {
      data.studentRoster = data.studentRoster.filter(
        (s) => (s.className || "").replace(/\s+/g, "") !== cls
      );
    }
    await saveLessonsData(ctx, data);
    return NextResponse.json({ success: true, message: `تم مسح تقييمات وتلاميذ قسم ${clearClass}` });
  }

  if (id) {
    const target = data.evaluations.find((e) => e.id === id);
    if (target) {
      // حذف التلميذ من التقويم وقائمة القسم معاً، وإلا أعادته المزامنة بتقييم افتراضي
      removeStudent(data, target.studentName, target.className);
      await saveLessonsData(ctx, data);
      return NextResponse.json({ success: true, deletedId: id });
    }
  }

  return NextResponse.json({ error: "معرف التقييم مطلوب" }, { status: 400 });
}
