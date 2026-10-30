import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  GraduationCap,
  Building2,
  BookOpen,
  ChevronLeft,
  Calendar,
  Sparkles,
  ArrowRight,
  MapPin,
  Trophy,
  CalendarClock,
  Users,
  MessageCircle,
  Scale,
  Camera,
  Check,
  Eye,
} from "lucide-react";
import { UserProfile, LEVELS, MIDDLE_SCHOOL_SUBJECTS } from "@/lib/types";
import SaveToWalletButton from "@/components/SaveToWalletButton";
import { AutoSaveTeacherWallet } from "@/components/AutoSaveTeacherWallet";
import { normalizeData, readPublicTeacherData } from "@/lib/storage";
import { findPublicTeacher } from "@/lib/teachers";
import { TeacherQR } from "@/components/TeacherQR";
import { SafeHarborDisclaimer } from "@/components/SafeHarborDisclaimer";

interface TeacherPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherPublicSpace({ params, searchParams }: TeacherPageProps) {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const requestedLvlStr = typeof sParams.lvl === "string" ? sParams.lvl : undefined;
  const requestedLevel = requestedLvlStr ? parseInt(requestedLvlStr, 10) : null;
  const isValidLevel = requestedLevel !== null && requestedLevel >= 1 && requestedLevel <= 4;

  const profile = await findPublicTeacher(slug);
  if (!profile) {
    notFound();
  }

  // بيانات الأستاذ العامة: الدروس والإعلانات ولوحة الشرف
  const publicData = await readPublicTeacherData(supabase, profile.id).catch(() => normalizeData({}));

  const announcements = (publicData.announcements ?? [])
    .filter((a) => a.active !== false)
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
  const teacherLessons = publicData.lessons || [];

  // إعدادات وتخصيصات الفضاء البيداغوجي للأستاذ
  const flags = publicData.featureFlags || (profile as any).feature_flags || {};
  const showAnnouncements = flags.announcements !== false;
  const showContinuousAssessment = flags.continuousAssessment !== false;
  const showMessages = flags.messages !== false;

  // التحقق من تعيين ساعة الاستقبال ولوحة الشرف: إذا لم يحددهما الأستاذ فلا يتم إظهارهما
  const hasConfiguredReception = Boolean(profile.reception?.officialDay || profile.reception?.guidance);
  const showReception = flags.reception !== false && hasConfiguredReception;

  const hasConfiguredHonors = Array.isArray(publicData.honors) && publicData.honors.length > 0;
  const showHonors = flags.honors !== false && hasConfiguredHonors;

  // المستويات التي يدرسها الأستاذ فعلياً
  const teacherDeclaredLevels: number[] = Array.isArray(profile.levels_taught) && profile.levels_taught.length > 0
    ? profile.levels_taught
    : [1, 2, 3, 4];

  // إذا حدد الولي رمز مستوى معين (مثلاً ?lvl=1)، نظهر له حصراً هذا المستوى ونخفي الباقي
  const activeLevels = isValidLevel ? [requestedLevel] : teacherDeclaredLevels;

  const codePrefix = (profile.teacher_code || "").split("-")[0]?.toUpperCase() || "MTH";
  const subjectObj =
    MIDDLE_SCHOOL_SUBJECTS.find((s) => s.codePrefix === codePrefix || s.id === (profile as any).subject) ||
    MIDDLE_SCHOOL_SUBJECTS[0];
  const subjectName = subjectObj.name;
  const subjectIcon = subjectObj.icon;

  const levelTitles: Record<number, { title: string; tag: string }> = {
    1: { title: "السنة الأولى متوسط", tag: "1م" },
    2: { title: "السنة الثانية متوسط", tag: "2م" },
    3: { title: "السنة الثالثة متوسط", tag: "3م" },
    4: { title: "السنة الرابعة متوسط (BEM)", tag: "4م" },
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16" dir="rtl">
      {/* الحفظ التلقائي في محفظة الولي بمجرد فتح الصفحة */}
      <AutoSaveTeacherWallet
        profile={{
          ...profile,
          subject: subjectObj.id,
        }}
      />

      {/* رأس الصفحة والهوية البصرية للأستاذ */}
      <div className="bg-gradient-to-b from-emerald-800 via-emerald-700 to-teal-800 text-white px-4 pt-8 pb-12 rounded-b-3xl shadow-lg">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-emerald-200">
            <Link
              href="/"
              className="inline-flex items-center gap-1 hover:text-white transition bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              العودة لبوابة منصة جسور
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-white/15 px-2.5 py-0.5 rounded-md font-bold text-[11px]">
                {isValidLevel ? `${profile.teacher_code || "MTH"}-${requestedLevel}` : profile.teacher_code || "MTH"}
              </span>
              <SaveToWalletButton
                slug={slug}
                name={profile.full_name || ""}
                code={isValidLevel ? `${profile.teacher_code || ""}-${requestedLevel}` : profile.teacher_code || ""}
                school={profile.school_custom_name || ""}
              />
            </div>
          </div>

          <div className="text-center space-y-2 pt-2">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 mx-auto flex items-center justify-center text-2xl font-black shadow-inner">
              {subjectIcon}
            </div>

            {isValidLevel ? (
              <div className="inline-flex items-center gap-1.5 bg-amber-400/25 px-3 py-1 rounded-full text-xs font-black text-amber-200 border border-amber-300/40 shadow-xs">
                <span>⭐</span>
                <span>فضاء أولياء وتلاميذ {levelTitles[requestedLevel]?.title || `السنة ${requestedLevel}م`}</span>
              </div>
            ) : (
              <div className="inline-block bg-white/15 px-3 py-0.5 rounded-full text-xs font-bold text-emerald-100 border border-white/20">
                مادة {subjectName}
              </div>
            )}

            <h1 className="text-xl sm:text-2xl font-black tracking-tight">{profile.full_name}</h1>
            <p className="text-xs sm:text-sm text-emerald-100 flex items-center justify-center gap-1.5 font-medium">
              <Building2 className="w-4 h-4 text-emerald-300" />
              {profile.school_custom_name || "متوسطة التعليم المتوسط"}
            </p>
            {profile.district_id && (
              <p className="text-[11px] text-emerald-200/90 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-300" />
                المقاطعة {profile.district_id}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-6 space-y-5">
        {/* تنبيه المستوى المخصص إذا دخل الولي برمز مستوى */}
        {isValidLevel && (
          <div className="bg-white rounded-2xl p-3.5 border border-emerald-200 shadow-sm flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span>
                أنت تتصفح حصراً محتوى <strong>{levelTitles[requestedLevel]?.title}</strong> (الرمز:{" "}
                <code className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                  {profile.teacher_code}-{requestedLevel}
                </code>
                )
              </span>
            </div>
            {teacherDeclaredLevels.length > 1 && (
              <Link
                href={`/t/${slug}`}
                className="text-[11px] text-slate-500 hover:text-emerald-700 underline font-medium shrink-0"
              >
                عرض باقي المستويات
              </Link>
            )}
          </div>
        )}

        {/* شريط الإعلانات للأستاذ */}
        {showAnnouncements && announcements && announcements.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-md space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <Sparkles className="w-4 h-4" />
              إعلانات وتنبيهات الأستاذ
            </div>
            {announcements.map((a) => (
              <div key={a.id} className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/60 text-xs">
                <p className="font-bold text-slate-800">{a.title}</p>
                <p className="text-slate-600 mt-1 whitespace-pre-wrap">{a.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* كراس الدروس وصور السبورة الرقمية */}
        {flags.boardLessons !== false && (
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white rounded-3xl p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-inner">
                  <Camera className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-black">
                      كراس الدروس والسبورة الرقمية
                    </h2>
                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
                      {isValidLevel ? `${requestedLevel}م 📸` : "جديد 📸"}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-100 font-medium mt-0.5">
                    {isValidLevel
                      ? `صور السبورة اليومية والواجبات الخاصة بالسنة ${requestedLevel} متوسط`
                      : "صور السبورة اليومية، الملخصات، وتوجيهات الأستاذ"}
                  </p>
                </div>
              </div>
              <Link
                href={isValidLevel ? `/t/${slug}/board?lvl=${requestedLevel}` : `/t/${slug}/board`}
                className="bg-white text-emerald-900 hover:bg-emerald-50 px-3.5 py-2 rounded-xl text-xs font-black transition shadow-sm shrink-0 flex items-center gap-1 active:scale-95"
              >
                <span>تصفح السبورة</span>
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-[11px] text-emerald-100/90 leading-relaxed bg-black/10 p-2.5 rounded-xl border border-white/10">
              💡 <strong>خدمة التلميذ الغائب:</strong> إذا غاب ابنك عن الحصة، يستطيع فتح كراس السبورة ونقل عناصر الدرس والأنشطة والواجبات بدقة دون الحاجة لاستعارة كراس زميله.
            </p>
          </div>
        )}

        {/* السنوات الدراسية للأستاذ: تعرض فقط المستويات المحددة */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-1">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            {isValidLevel
              ? `الدروس والمذكرات المقررة للسنة ${requestedLevel} متوسط:`
              : "اختر السنة الدراسية لمشاهدة الدروس والواجبات:"}
          </h2>

          <div className="space-y-2.5">
            {activeLevels.map((lvl: number) => {
              const levelCount = teacherLessons.filter((l) => l.level === lvl).length;
              const item = levelTitles[lvl] || { title: `السنة ${lvl} متوسط`, tag: `${lvl}م` };

              return (
                <Link
                  key={lvl}
                  href={`/year/${lvl}?teacher=${profile.id}`}
                  className="flex items-center gap-3.5 bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs hover:border-emerald-300 hover:shadow-sm active:scale-[0.98] transition group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center text-lg font-black shrink-0 shadow-sm shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                    {item.tag}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-slate-900">{item.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      {levelCount > 0 ? `${levelCount} درس منشور` : "لا توجد دروس منشورة حالياً"}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-emerald-700 group-hover:bg-emerald-50 transition shrink-0">
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ميثاق ونقاط التقويم المستمر الشفاف (خاصية الأستاذ المتقدمة) */}
        {showContinuousAssessment && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl p-4 border border-emerald-200/90 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs">
                <Scale className="w-5 h-5 text-emerald-100" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-black text-slate-900">ميثاق ونقاط التقويم المستمر (20 / 20)</p>
                  <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">
                    شفافية ⚖️
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                  شبكة التقييم: كراس • سلوك وانضباط • واجبات • استجوابات
                </p>
              </div>
            </div>
            <Link
              href={`/parents?teacher=${profile.id}${isValidLevel ? `&lvl=${requestedLevel}` : ""}`}
              className="text-xs font-bold text-emerald-800 bg-white border border-emerald-200 px-3.5 py-2 rounded-xl hover:bg-emerald-100 active:scale-95 transition shadow-2xs shrink-0"
            >
              متابعة الولي 🔍
            </Link>
          </div>
        )}

        {/* لوحة الشرف للأستاذ: تظهر فقط إذا أضاف الأستاذ تلاميذ متميزين */}
        {showHonors && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">لوحة الشرف وتكريم النوابغ</p>
                <p className="text-[11px] text-slate-400">التلاميذ المتميزون في مادة {subjectName}</p>
              </div>
            </div>
            <Link
              href={`/honor?teacher=${profile.id}${isValidLevel ? `&lvl=${requestedLevel}` : ""}`}
              className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition"
            >
              مشاهدة 🌟
            </Link>
          </div>
        )}

        {/* قنوات التواصل الخاصة بالولي: ساعة الاستقبال المعتمدة والرسالة السرية */}
        <div className={`grid grid-cols-1 ${showReception && showMessages ? "sm:grid-cols-2" : ""} gap-2.5`}>
          {showReception && (
            <Link
              href={`/parents?teacher=${profile.id}${isValidLevel ? `&lvl=${requestedLevel}` : ""}`}
              className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-teal-300 transition flex items-center gap-3"
            >
              <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <CalendarClock className="w-4 h-4" />
              </span>
              <span className="text-xs">
                <strong className="block text-slate-800">ساعة استقبال الأولياء</strong>
                <span className="text-slate-500">
                  {profile.reception?.officialDay ? `كل ${profile.reception.officialDay}` : "المواعيد والتوجيهات"}
                </span>
              </span>
            </Link>
          )}

          {showMessages && (
            <Link
              href={`/messages?teacher=${profile.id}${isValidLevel ? `&lvl=${requestedLevel}` : ""}`}
              className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-300 transition flex items-center gap-3"
            >
              <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4" />
              </span>
              <span className="text-xs">
                <strong className="block text-slate-800">رسالة سرية للأستاذ</strong>
                <span className="text-slate-500">ملاحظة أو استفسار سري ومجهول الهوية 🔒</span>
              </span>
            </Link>
          )}
        </div>

        <TeacherQR
          path={`/t/${profile.slug || profile.id}${isValidLevel ? `?lvl=${requestedLevel}` : ""}`}
          teacherName={profile.full_name || "الأستاذ"}
          code={isValidLevel ? `${profile.teacher_code || "MTH"}-${requestedLevel}` : profile.teacher_code}
          schoolName={profile.school_custom_name || ""}
          levelsTaught={isValidLevel ? [requestedLevel] : (profile.levels_taught || [1, 2, 3, 4])}
        />

        {/* شريط درع الحماية القانونية وإخلاء المسؤولية */}
        <SafeHarborDisclaimer
          teacherName={profile.full_name}
          schoolName={profile.school_custom_name}
          subjectName={(profile as any).subject || "مادة الرياضيات"}
        />
      </div>
    </div>
  );
}