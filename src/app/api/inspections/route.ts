import { NextRequest, NextResponse } from "next/server";
import { getLessonsData, removeStudent, saveLessonsData } from "@/lib/storage";
import { requireTeacher } from "@/lib/auth";
import { InspectionSession, InspectionRecord, StudentRosterItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// دالة مساعدة لحساب علامة المراقبة من 20 بدقة
function calculateInspectionScore(
  lessonsDone: number,
  totalLessons: number,
  homeworksDone: number,
  totalHomeworks: number,
  behaviorScore: number,
  activityScore: number
): number {
  const totL = totalLessons > 0 ? totalLessons : 1;
  const totH = totalHomeworks > 0 ? totalHomeworks : 1;

  const nbPoints = Math.min(5, Math.max(0, (lessonsDone / totL) * 5));
  const hwPoints = Math.min(5, Math.max(0, (homeworksDone / totH) * 5));
  const behPoints = Math.min(5, Math.max(0, Number(behaviorScore) || 0));
  const actPoints = Math.min(5, Math.max(0, Number(activityScore) || 0));

  const total = nbPoints + hwPoints + behPoints + actPoints;
  return Math.min(20, Math.max(0, Math.round(total * 10) / 10));
}

// 1. جلب جلسات المراقبة وقائمة التلاميذ
export async function GET(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const className = searchParams.get("class");
  const groupName = searchParams.get("group");

  const data = await getLessonsData(ctx);
  let sessions = data.inspectionSessions || [];
  let roster = data.studentRoster || [];

  // إذا كانت قائمة التلاميذ فارغة، نقوم باستخراج الأسماء تلقائياً من evaluations السابقة لتسهيل الأمر
  if (roster.length === 0 && data.evaluations && data.evaluations.length > 0) {
    roster = data.evaluations.map((e) => ({
      id: `rst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studentName: e.studentName,
      className: e.className,
      groupName: e.groupName,
    }));
    data.studentRoster = roster;
    await saveLessonsData(ctx, data);
  }

  if (className && className !== "all") {
    sessions = sessions.filter(
      (s) => (s.className || "").replace(/\s+/g, "") === className.replace(/\s+/g, "")
    );
    roster = roster.filter(
      (r) => (r.className || "").replace(/\s+/g, "") === className.replace(/\s+/g, "")
    );
  }

  // جلسات المراقبة تخص القسم ككل وتبقى متاحة للمتابعة والتفقد
  // سواء كان الأستاذ في حصة فوج 1، أو فوج 2، أو حصة القسم كاملاً

  // ترتيب الجلسات حسب تاريخ الإنشاء أو رقم الجلسة
  sessions.sort((a, b) => a.sessionNumber - b.sessionNumber);

  return NextResponse.json(
    { sessions, roster, evaluationSettings: data.evaluationSettings || {} },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}

// 2. إنشاء جلسة مراقبة جديدة أو استيراد قائمة تلاميذ
export async function POST(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = await getLessonsData(ctx);
    if (!data.inspectionSessions) data.inspectionSessions = [];
    if (!data.studentRoster) data.studentRoster = [];

    // أ) مزامنة بيانات الأوفلاين كاملة من العميل عند عودة الاتصال
    if (body.type === "syncOfflineData") {
      if (Array.isArray(body.sessions)) {
        // دمج الجلسات حسب المعرف لتفادي التكرار
        const existingSessionIds = new Set(data.inspectionSessions.map((s) => s.id));
        for (const s of body.sessions) {
          const idx = data.inspectionSessions.findIndex((cur) => cur.id === s.id);
          if (idx >= 0) {
            data.inspectionSessions[idx] = s;
          } else {
            data.inspectionSessions.push(s);
          }
        }
      }

      if (Array.isArray(body.roster)) {
        for (const r of body.roster) {
          const idx = data.studentRoster.findIndex(
            (cur) =>
              cur.studentName === r.studentName &&
              cur.className.replace(/\s+/g, "") === r.className.replace(/\s+/g, "")
          );
          if (idx >= 0) {
            data.studentRoster[idx] = r;
          } else {
            data.studentRoster.push(r);
          }
        }
      }

      await saveLessonsData(ctx, data);
      return NextResponse.json({
        success: true,
        sessions: data.inspectionSessions,
        roster: data.studentRoster,
      });
    }

    // حفظ تخصيص إعدادات التقويم والمعامل ونظام الفروض
    if (body.type === "saveEvaluationSettings") {
      if (!data.evaluationSettings) data.evaluationSettings = {};
      const { className, settings, applyToAll } = body;
      if (applyToAll && Array.isArray(data.customClasses) && data.customClasses.length > 0) {
        for (const cls of data.customClasses) {
          data.evaluationSettings[cls] = settings;
        }
      } else if (className) {
        data.evaluationSettings[className] = settings;
      }
      await saveLessonsData(ctx, data);
      return NextResponse.json({ success: true, evaluationSettings: data.evaluationSettings });
    }

    // ب) تغيير فوج تلميذ محدد (بين فوج 1 وفوج 2)
    if (body.type === "switchGroup" || body.type === "updateStudentGroup") {
      const { studentName, className, newGroup } = body;
      const target = data.studentRoster.find(
        (r) =>
          r.studentName === studentName &&
          r.className.replace(/\s+/g, "") === String(className || "").replace(/\s+/g, "")
      );
      if (target) {
        target.groupName = newGroup;
        await saveLessonsData(ctx, data);
        return NextResponse.json({ success: true, item: target, roster: data.studentRoster });
      }
      return NextResponse.json({ error: "التلميذ غير موجود" }, { status: 404 });
    }

    // ج) تعيين جماعي للأفواج (مثلاً تقسيم تلقائي 50/50 أو نقل مجموعة)
    if (body.type === "batchAssignGroups" && Array.isArray(body.assignments)) {
      const cls = String(body.className || "").replace(/\s+/g, "");
      for (const item of body.assignments) {
        const found = data.studentRoster.find(
          (r) =>
            r.studentName === item.studentName &&
            (!cls || r.className.replace(/\s+/g, "") === cls)
        );
        if (found) {
          found.groupName = item.groupName;
        }
      }
      await saveLessonsData(ctx, data);
      return NextResponse.json({ success: true, roster: data.studentRoster });
    }

    // د) استيراد قائمة تلاميذ للقسم والفوج
    if (body.type === "roster" || Array.isArray(body.students)) {
      const cls = String(body.className || "1 م 1").trim();
      const grp = (body.groupName || "فوج 1") as "فوج 1" | "فوج 2" | "القسم كامل";
      const studentsList = Array.isArray(body.students) ? body.students : [];
      let addedCount = 0;

      for (const rawName of studentsList) {
        const name = String(rawName).trim();
        if (!name) continue;

        const exists = data.studentRoster.some(
          (r) =>
            r.studentName.toLowerCase() === name.toLowerCase() &&
            r.className.replace(/\s+/g, "") === cls.replace(/\s+/g, "")
        );

        if (!exists) {
          data.studentRoster.push({
            id: `rst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            studentName: name,
            className: cls,
            groupName: grp,
          });
          addedCount++;
        }
      }

      await saveLessonsData(ctx, data);
      return NextResponse.json({ success: true, addedCount, roster: data.studentRoster });
    }

    // هـ) إنشاء جلسة مراقبة جديدة (مثلاً: المراقبة 1 من الدرس 1 إلى 8)
    const {
      className,
      groupName = "فوج 1",
      date,
      lessonRange = "من 1 إلى 8",
      totalLessons = 8,
      totalHomeworks = 8,
      title,
    } = body;

    if (!className) {
      return NextResponse.json({ error: "القسم مطلوب" }, { status: 400 });
    }

    const cls = String(className).trim();
    const grp = groupName as "فوج 1" | "فوج 2" | "القسم كامل";
    const tL = Math.max(1, Number(totalLessons) || 8);
    const tH = Math.max(1, Number(totalHomeworks) || 8);

    // حساب رقم الجلسة التالية لهذا القسم
    const existingForClass = data.inspectionSessions.filter(
      (s) => s.className.replace(/\s+/g, "") === cls.replace(/\s+/g, "")
    );
    const nextSessionNum = existingForClass.length + 1;

    // استخراج كافة تلاميذ القسم لتهيئة سجلاتهم تلقائياً
    const targetStudents = data.studentRoster.filter(
      (r) => r.className.replace(/\s+/g, "") === cls.replace(/\s+/g, "")
    );

    const initialRecords: Record<string, InspectionRecord> = {};
    for (const st of targetStudents) {
      // علامة كاملة افتراضية لسرعة الإنجاز بنقرة واحدة (التلميذ منضبط حتى يثبت العكس)
      initialRecords[st.studentName] = {
        studentName: st.studentName,
        lessonsDone: tL,
        homeworksDone: tH,
        behaviorScore: 5,
        activityScore: 5,
        score: 20,
      };
    }

    const nowFormatted =
      date?.trim() ||
      new Date().toLocaleDateString("ar-DZ", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    const newSession: InspectionSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionNumber: nextSessionNum,
      title: title?.trim() || `المراقبة ${nextSessionNum} (${lessonRange})`,
      date: nowFormatted,
      className: cls,
      groupName: grp,
      lessonRange: String(lessonRange).trim(),
      totalLessons: tL,
      totalHomeworks: tH,
      records: initialRecords,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.inspectionSessions.push(newSession);
    await saveLessonsData(ctx, data);

    return NextResponse.json({ success: true, session: newSession });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "فشل تسجيل جلسة المراقبة" }, { status: 500 });
  }
}

// 3. تحديث سجل تلميذ داخل جلسة مراقبة بنقرة واحدة في الحصة
export async function PUT(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sessionId, studentName } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "معرف الجلسة مطلوب" }, { status: 400 });
    }

    const data = await getLessonsData(ctx);
    if (!data.inspectionSessions) data.inspectionSessions = [];

    const session = data.inspectionSessions.find((s) => s.id === sessionId);
    if (!session) {
      return NextResponse.json({ error: "جلسة المراقبة غير موجودة" }, { status: 404 });
    }

    // تحديث بيانات الجلسة نفسها إن طُلب ذلك
    if (body.updateSessionMeta) {
      if (body.title !== undefined) session.title = String(body.title).trim();
      if (body.date !== undefined) session.date = String(body.date).trim();
      if (body.lessonRange !== undefined) session.lessonRange = String(body.lessonRange).trim();
      if (body.totalLessons !== undefined) session.totalLessons = Number(body.totalLessons);
      if (body.totalHomeworks !== undefined) session.totalHomeworks = Number(body.totalHomeworks);
      session.updatedAt = new Date().toISOString();
      await saveLessonsData(ctx, data);
      return NextResponse.json({ success: true, session });
    }

    if (!studentName) {
      return NextResponse.json({ error: "اسم التلميذ مطلوب" }, { status: 400 });
    }

    if (!session.records) session.records = {};

    const existingRec = session.records[studentName] || {
      studentName,
      lessonsDone: session.totalLessons,
      homeworksDone: session.totalHomeworks,
      behaviorScore: 5,
      activityScore: 5,
      score: 20,
    };

    if (body.lessonsDone !== undefined) {
      existingRec.lessonsDone = Math.max(0, Math.min(session.totalLessons, Number(body.lessonsDone)));
    }
    if (body.homeworksDone !== undefined) {
      existingRec.homeworksDone = Math.max(
        0,
        Math.min(session.totalHomeworks, Number(body.homeworksDone))
      );
    }
    if (body.behaviorScore !== undefined) {
      existingRec.behaviorScore = Math.max(0, Math.min(5, Number(body.behaviorScore)));
    }
    if (body.activityScore !== undefined) {
      existingRec.activityScore = Math.max(0, Math.min(5, Number(body.activityScore)));
    }
    if (body.notes !== undefined) {
      existingRec.notes = body.notes ? String(body.notes).trim() : undefined;
    }

    if (body.test1Score !== undefined) {
      existingRec.test1Score = body.test1Score === null || body.test1Score === "" ? undefined : Math.max(0, Math.min(20, Number(body.test1Score)));
    }
    if (body.test2Score !== undefined) {
      existingRec.test2Score = body.test2Score === null || body.test2Score === "" ? undefined : Math.max(0, Math.min(20, Number(body.test2Score)));
    }
    if (body.examScore !== undefined) {
      existingRec.examScore = body.examScore === null || body.examScore === "" ? undefined : Math.max(0, Math.min(20, Number(body.examScore)));
    }
    if (body.customScores !== undefined) {
      existingRec.customScores = body.customScores;
    }

    if (body.score !== undefined) {
      existingRec.score = Math.max(0, Math.min(20, Number(body.score)));
    } else {
      // إعادة حساب علامة هذه المراقبة من 20 تلقائياً
      existingRec.score = calculateInspectionScore(
        existingRec.lessonsDone,
        session.totalLessons,
        existingRec.homeworksDone,
        session.totalHomeworks,
        existingRec.behaviorScore,
        existingRec.activityScore
      );
    }

    session.records[studentName] = existingRec;
    session.updatedAt = new Date().toISOString();

    await saveLessonsData(ctx, data);
    return NextResponse.json({ success: true, session, record: existingRec });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "فشل تحديث التقييم" }, { status: 500 });
  }
}

// 4. حذف جلسة أو حذف تلميذ من الفوج
export async function DELETE(req: NextRequest) {
  const ctx = await requireTeacher();
  if (!ctx) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const studentName = searchParams.get("studentName");
  const className = searchParams.get("class");

  const data = await getLessonsData(ctx);
  if (!data.inspectionSessions) data.inspectionSessions = [];
  if (!data.studentRoster) data.studentRoster = [];

  // حذف جلسة مراقبة كاملة
  if (sessionId) {
    data.inspectionSessions = data.inspectionSessions.filter((s) => s.id !== sessionId);
    await saveLessonsData(ctx, data);
    return NextResponse.json({ success: true, message: "تم حذف جلسة المراقبة" });
  }

  // حذف تلميذ من القائمة
  if (studentName && className) {
    // حذفه من القائمة والتقويم وكافة جلسات ذلك القسم
    removeStudent(data, studentName, className);
    await saveLessonsData(ctx, data);
    return NextResponse.json({ success: true, message: `تم حذف التلميذ ${studentName}` });
  }

  return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
}
