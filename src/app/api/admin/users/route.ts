import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSessionProfile } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { supabase } from "@/lib/supabase";
import { isSuperAdminEmail, DetailedAdminUser, AccountActivityItem } from "@/lib/types";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const { user, profile } = await getSessionProfile();
  const email = (user?.email || "").toLowerCase().trim();
  const isOwner = isSuperAdminEmail(email);
  if (user && (profile?.role === "admin" || isOwner)) {
    return user;
  }
  return null;
}

async function logAction(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  actorId: string,
  action: string,
  targetId: string,
  details: Record<string, unknown>
) {
  try {
    await admin
      .from("admin_audit_log")
      .insert({ actor_id: actorId, action, target_type: "profile", target_id: targetId, details });
  } catch (err) {
    console.error("admin_audit_log error:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// 1. GET: جلب كافة الحسابات المسجلة مع تفاصيلها الدقيقة والنشاط
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) {
    return NextResponse.json({ error: "غير مصرح لك بالوصول" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();

  try {
    // 1. جلب حسابات auth.users وحسابات profiles
    let authUsers: any[] = [];
    if (admin) {
      const { data: authData, error: authErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (!authErr && authData?.users) {
        authUsers = authData.users;
      }
    }

    // جلب ملفات profiles
    const client = admin || supabase;
    const { data: profiles, error: profErr } = await client
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    const profilesList = profiles || [];
    const authUserMap = new Map<string, any>();
    authUsers.forEach((u) => authUserMap.set(u.id, u));

    // 2. جلب النشاط الميداني لكل حساب (دروس، تقييمات، إعلانات، يوميات، سجل)
    const [lessonsRes, evalsRes, annRes, diaryRes, auditRes] = await Promise.all([
      client
        .from("lessons")
        .select("id, teacher_id, title, number, type, created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      client
        .from("evaluations")
        .select("id, teacher_id, student_name, class_name, created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      client
        .from("announcements")
        .select("id, teacher_id, title, date, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      client
        .from("daily_diary")
        .select("id, teacher_id, lesson_title, date, class_name, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      client
        .from("admin_audit_log")
        .select("id, actor_id, target_id, action, details, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const lessonsByTeacher = new Map<string, any[]>();
    (lessonsRes.data || []).forEach((l: any) => {
      const tid = l.teacher_id;
      if (tid) {
        const arr = lessonsByTeacher.get(tid) || [];
        arr.push(l);
        lessonsByTeacher.set(tid, arr);
      }
    });

    const evalsByTeacher = new Map<string, any[]>();
    (evalsRes.data || []).forEach((e: any) => {
      const tid = e.teacher_id;
      if (tid) {
        const arr = evalsByTeacher.get(tid) || [];
        arr.push(e);
        evalsByTeacher.set(tid, arr);
      }
    });

    const annByTeacher = new Map<string, any[]>();
    (annRes.data || []).forEach((a: any) => {
      const tid = a.teacher_id;
      if (tid) {
        const arr = annByTeacher.get(tid) || [];
        arr.push(a);
        annByTeacher.set(tid, arr);
      }
    });

    const diaryByTeacher = new Map<string, any[]>();
    (diaryRes.data || []).forEach((d: any) => {
      const tid = d.teacher_id;
      if (tid) {
        const arr = diaryByTeacher.get(tid) || [];
        arr.push(d);
        diaryByTeacher.set(tid, arr);
      }
    });

    const auditByTarget = new Map<string, any[]>();
    (auditRes.data || []).forEach((au: any) => {
      const tid = au.target_id || au.actor_id;
      if (tid) {
        const arr = auditByTarget.get(tid) || [];
        arr.push(au);
        auditByTarget.set(tid, arr);
      }
    });

    // 3. دمج بيانات الحسابات وبناء السجل الزمني الدقيق للعمليات
    const mergedUsers: DetailedAdminUser[] = profilesList.map((p: any) => {
      const authUser = authUserMap.get(p.id);
      const userLessons = lessonsByTeacher.get(p.id) || [];
      const userEvals = evalsByTeacher.get(p.id) || [];
      const userAnn = annByTeacher.get(p.id) || [];
      const userDiary = diaryByTeacher.get(p.id) || [];
      const userAudits = auditByTarget.get(p.id) || [];

      // بناء الخط الزمني للأنشطة والعمليات الدقيقة
      const activities: AccountActivityItem[] = [];

      // تسجيل الدخول
      if (authUser?.last_sign_in_at) {
        activities.push({
          id: `login_${p.id}`,
          type: "login",
          actionLabel: "تسجيل الدخول للنظام 🔑",
          title: "جلسة دخول نشطة إلى المنصة",
          timestamp: authUser.last_sign_in_at,
        });
      }

      // الدروس والواجبات
      userLessons.slice(0, 10).forEach((l: any) => {
        activities.push({
          id: `lesson_${l.id}`,
          type: "lesson",
          actionLabel: "إضافة مورد / درس 📚",
          title: l.title || `درس رقم ${l.number || ""}`,
          timestamp: l.created_at,
          details: l.type ? `النوع: ${l.type}` : undefined,
        });
      });

      // تقييمات الحصص
      userEvals.slice(0, 8).forEach((ev: any) => {
        activities.push({
          id: `eval_${ev.id}`,
          type: "evaluation",
          actionLabel: "رصد تقييم صفي 📊",
          title: `تقييم التلميذ: ${ev.student_name || "—"} (${ev.class_name || ""})`,
          timestamp: ev.created_at,
        });
      });

      // الدفتر اليومي
      userDiary.slice(0, 8).forEach((dy: any) => {
        activities.push({
          id: `diary_${dy.id}`,
          type: "diary",
          actionLabel: "تدوين حصة بالدفتر اليومي 🗓️",
          title: dy.lesson_title || `حصة لفوج ${dy.class_name || ""}`,
          timestamp: dy.created_at || dy.date,
          details: dy.date ? `التاريخ: ${dy.date}` : undefined,
        });
      });

      // الإعلانات المدرسية
      userAnn.slice(0, 5).forEach((an: any) => {
        activities.push({
          id: `ann_${an.id}`,
          type: "announcement",
          actionLabel: "نشر إعلان مدرسي 📢",
          title: an.title,
          timestamp: an.created_at || an.date,
        });
      });

      // حركات السجل الإداري
      userAudits.slice(0, 5).forEach((au: any) => {
        activities.push({
          id: `audit_${au.id}`,
          type: "audit",
          actionLabel: "إجراء إداري رسمي 🛡️",
          title: au.action || "تحديث بيانات",
          timestamp: au.created_at,
          details: au.details ? JSON.stringify(au.details) : undefined,
        });
      });

      // إنشاء وتفعيل الحساب
      const createdAt = authUser?.created_at || p.created_at;
      if (createdAt) {
        activities.push({
          id: `create_${p.id}`,
          type: "other",
          actionLabel: "إنشاء الحساب وتفعيله المباشر 🎉",
          title: `انضمام ${p.full_name || "الأستاذ"} إلى منصة جسور`,
          timestamp: createdAt,
        });
      }

      // ترتيب العمليات تنازلياً من الأحدث للأقدم
      activities.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return {
        id: p.id,
        role: p.role || "teacher",
        email: p.email || authUser?.email || authUser?.user_metadata?.email || "",
        full_name: p.full_name || authUser?.user_metadata?.full_name || "أستاذ مسجل",
        subject: p.subject || authUser?.user_metadata?.subject || "mathematics",
        district_id: p.district_id || authUser?.user_metadata?.district_id || 1,
        school_custom_name: p.school_custom_name || authUser?.user_metadata?.school_custom_name || "",
        teacher_code: p.teacher_code || authUser?.user_metadata?.teacher_code || "",
        slug: p.slug || authUser?.user_metadata?.slug || "",
        levels_taught: p.levels_taught || [1, 2, 3, 4],
        is_verified: p.is_verified ?? true,
        initial_password: p.initial_password || authUser?.user_metadata?.initial_password || "",
        created_at: createdAt,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        lessons_count: userLessons.length,
        last_lesson: userLessons[0]
          ? { title: userLessons[0].title, date: userLessons[0].created_at }
          : null,
        evaluations_count: userEvals.length,
        last_evaluation_date: userEvals[0]?.created_at || null,
        announcements_count: userAnn.length,
        last_announcement: userAnn[0]
          ? { title: userAnn[0].title, date: userAnn[0].created_at || userAnn[0].date }
          : null,
        diary_count: userDiary.length,
        last_diary: userDiary[0]
          ? { title: userDiary[0].lesson_title, date: userDiary[0].date }
          : null,
        recent_activities: activities.slice(0, 20),
      };
    });

    return NextResponse.json({ users: mergedUsers });
  } catch (err: any) {
    console.error("GET admin users error:", err);
    return NextResponse.json({ error: err.message || "حدث خطأ أثناء جلب الحسابات" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// 2. PATCH: تعديل الحساب، وتعيين/تغيير كلمة المرور فوراً
// ─────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) {
    return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "").trim();

  if (!userId) {
    return NextResponse.json({ error: "معرّف الحساب مطلوب" }, { status: 400 });
  }

  try {
    const updates: Record<string, any> = {};

    // 1. تغيير أو تعيين كلمة المرور فوراً
    if (body.newPassword) {
      const newPwd = String(body.newPassword).trim();
      if (newPwd.length < 6) {
        return NextResponse.json({ error: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" }, { status: 400 });
      }

      if (admin) {
        const { error: pwdErr } = await admin.auth.admin.updateUserById(userId, {
          password: newPwd,
          user_metadata: { initial_password: newPwd },
        });
        if (pwdErr) {
          throw new Error("فشل تحديث كلمة المرور في المصادقة: " + pwdErr.message);
        }
      }

      updates.initial_password = newPwd;
    }

    // 2. تعديل المادة
    if (body.subject !== undefined) {
      updates.subject = String(body.subject).trim();
      if (admin) {
        await admin.auth.admin.updateUserById(userId, {
          user_metadata: { subject: updates.subject },
        });
      }
    }

    // 3. تعديل الاسم
    if (body.fullName !== undefined) {
      updates.full_name = String(body.fullName).trim();
    }

    // 4. تعديل المؤسسة
    if (body.schoolName !== undefined) {
      updates.school_custom_name = String(body.schoolName).trim();
    }

    // 5. تعديل المقاطعة
    if (body.districtId !== undefined) {
      updates.district_id = Number(body.districtId);
    }

    // 6. تعديل الرتبة
    if (body.role !== undefined) {
      updates.role = String(body.role);
    }

    // 7. تعديل التفعيل
    if (body.isVerified !== undefined) {
      updates.is_verified = Boolean(body.isVerified);
      updates.verification_status = body.isVerified ? "approved" : "suspended";
    }

    // تطبيق التحديثات على جدول profiles
    const client = admin || supabase;
    const { error: updateErr } = await client
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (updateErr) {
      throw new Error(updateErr.message);
    }

    if (admin) {
      await logAction(admin, me.id, "user_updated_by_admin", userId, updates);
    }

    return NextResponse.json({ success: true, updates });
  } catch (err: any) {
    console.error("PATCH admin users error:", err);
    return NextResponse.json({ error: err.message || "فشل تحديث الحساب" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// 3. POST: إنشاء حساب جديد مباشر (أستاذ أو مفتش) بكلمة مرور محددة
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 });
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "إنشاء الحسابات يتطلب ضبط SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const fullName = String(body.fullName || "").trim();
  const role = body.role === "inspector" ? "inspector" : "teacher";
  const subject = String(body.subject || "mathematics").trim();
  const districtId = Number(body.districtId) || 1;
  const schoolName = String(body.schoolName || "متوسطة ولاية الوادي").trim();
  const password = String(body.password || `Prof-${randomBytes(4).toString("hex")}`).trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName) {
    return NextResponse.json({ error: "البريد والاسم مطلوبان" }, { status: 400 });
  }

  const teacherCode = `${subject.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const slug = `prof-${Math.random().toString(36).substring(2, 8)}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      subject,
      district_id: districtId,
      school_custom_name: schoolName,
      teacher_code: teacherCode,
      slug,
      initial_password: password,
      is_verified: true,
      verification_status: "approved",
    },
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || "تعذر إنشاء الحساب" }, { status: 400 });
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .upsert({
      id: data.user.id,
      email,
      role,
      full_name: fullName,
      subject,
      district_id: districtId,
      school_custom_name: schoolName,
      teacher_code: teacherCode,
      slug,
      levels_taught: [1, 2, 3, 4],
      is_verified: true,
      verification_status: "approved",
      initial_password: password,
    });

  if (profileErr) {
    console.error("Profile upsert error:", profileErr);
  }

  await logAction(admin, me.id, `${role}_created_direct`, data.user.id, {
    full_name: fullName,
    email,
    subject,
  });

  return NextResponse.json({
    success: true,
    userId: data.user.id,
    email,
    password,
    teacherCode,
  });
}

// ─────────────────────────────────────────────────────────────
// 4. DELETE: حذف حساب نهائياً
// ─────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "غير مصرح لك" }, { status: 403 });
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "يتطلب مفتاح الخدمة" }, { status: 503 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "معرّف الحساب مطلوب" }, { status: 400 });
  if (id === me.id) return NextResponse.json({ error: "لا يمكنك حذف حسابك الخاص" }, { status: 400 });

  const { data: target } = await admin.from("profiles").select("full_name, role").eq("id", id).maybeSingle();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logAction(admin, me.id, "user_deleted", id, {
    full_name: target?.full_name ?? null,
    role: target?.role ?? null,
  });

  return NextResponse.json({ success: true });
}
