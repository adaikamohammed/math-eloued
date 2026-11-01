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
  Layers,
  FileText,
  Quote,
  CheckCircle2,
  Lock,
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

  // التحقق من تعيين ساعة الاستقبال ولوحة الشرف
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

  const levelTitles: Record<number, { title: string; tag: string; color: string; bg: string }> = {
    1: { title: "السنة الأولى متوسط", tag: "1م", color: "text-emerald-700", bg: "from-emerald-600 to-teal-700" },
    2: { title: "السنة الثانية متوسط", tag: "2م", color: "text-blue-700", bg: "from-blue-600 to-indigo-700" },
    3: { title: "السنة الثالثة متوسط", tag: "3م", color: "text-amber-700", bg: "from-amber-600 to-orange-700" },
    4: { title: "السنة الرابعة متوسط (BEM)", tag: "4م", color: "text-purple-700", bg: "from-purple-600 to-indigo-800" },
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 font-sans pb-20" dir="rtl">
      {/* الحفظ التلقائي في محفظة الولي بمجرد فتح الصفحة */}
      <AutoSaveTeacherWallet
        profile={{
          ...profile,
          subject: subjectObj.id,
        }}
      />

      {/* رأس الصفحة والهوية البصرية للأستاذ بشاشة عريضة للحاسوب والهاتف */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-900 text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-14 sm:pb-16 relative z-10 space-y-6">
          {/* شريط الإجراءات العلوي */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 hover:text-white transition bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full backdrop-blur-md text-emerald-100 border border-white/10 font-bold"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة لبوابة منصة جسور</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="font-mono bg-white/15 backdrop-blur-md px-3 py-1 rounded-xl font-black text-xs text-emerald-100 border border-white/20">
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

          {/* بطاقة تعريف الأستاذ الرئيسية */}
          <div className="flex flex-col lg:flex-row items-center lg:items-center justify-between gap-6 pt-2">
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-right gap-4 sm:gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-4xl sm:text-5xl font-black shadow-xl shrink-0">
                {subjectIcon}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-md px-3 py-0.5 rounded-full text-xs font-bold text-emerald-100 border border-white/20">
                    مادة {subjectName}
                  </span>

                  {isValidLevel && (
                    <span className="inline-flex items-center gap-1 bg-amber-400/25 px-3 py-0.5 rounded-full text-xs font-black text-amber-200 border border-amber-300/40">
                      ⭐ فضاء {levelTitles[requestedLevel]?.title || `السنة ${requestedLevel}م`}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                  {profile.full_name}
                </h1>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs sm:text-sm text-emerald-100/90 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-300" />
                    <span>{profile.school_custom_name || "متوسطة التعليم المتوسط"}</span>
                  </span>
                  {profile.district_id && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                        <span>المقاطعة {profile.district_id}</span>
                      </span>
                    </>
                  )}
                </div>

                {profile.bio && (
                  <p className="text-xs text-emerald-100/90 font-medium leading-relaxed max-w-2xl pt-1 bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10 text-right">
                    « {profile.bio} »
                  </p>
                )}
              </div>
            </div>

            {/* إحصائيات سريعة للأستاذ تظهر بوضوح في شاشات الحاسوب */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="px-3 py-1.5 rounded-xl bg-white/10 text-center">
                <span className="block text-xs font-black text-emerald-200">{activeLevels.length}</span>
                <span className="text-[10px] text-emerald-100/80">مستويات مسندة</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/10 text-center">
                <span className="block text-xs font-black text-emerald-200">{teacherLessons.length}</span>
                <span className="text-[10px] text-emerald-100/80">درساً وواجباً</span>
              </div>
              {flags.boardLessons !== false && (
                <Link
                  href={isValidLevel ? `/t/${slug}/board?lvl=${requestedLevel}` : `/t/${slug}/board`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/40 text-center transition border border-emerald-400/30 flex items-center gap-1.5 text-xs font-bold text-white"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-300" />
                  <span>السبورة الرقمية 📸</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── الحاوية الرئيسية للشاشات الكبيرة والمحمولة ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 space-y-6 relative z-20">
        {/* تنبيه المستوى المخصص إذا دخل الولي برمز مستوى */}
        {isValidLevel && (
          <div className="bg-white rounded-3xl p-4 border border-emerald-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-emerald-900 font-bold">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span>
                أنت تتصفح حالياً المحتوى المخصص لـ <strong>{levelTitles[requestedLevel]?.title}</strong> (الرمز:{" "}
                <code className="font-mono font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                  {profile.teacher_code}-{requestedLevel}
                </code>
                )
              </span>
            </div>
            {teacherDeclaredLevels.length > 1 && (
              <Link
                href={`/t/${slug}`}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-black underline shrink-0 flex items-center gap-1"
              >
                <span>عرض جميع المستويات المسندة للأستاذ</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </Link>
            )}
          </div>
        )}

        {/* تخطيط شاشة الحاسوب: عمود رئيسي للدروس + عمود جانبي للمعلومات والتواصل */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* ═════════ العمود الرئيسي (8 من 12 في الحاسوب) ═════════ */}
          <main className="lg:col-span-8 space-y-6">
            {/* 1. شبكة المستويات والمناهج الدراسية للأستاذ */}
            <section className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    <span>
                      {isValidLevel
                        ? `الدروس والمذكرات المقررة للسنة ${requestedLevel} متوسط:`
                        : "اختر السنة الدراسية لمشاهدة الدروس والواجبات:"}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    انقر على أي سنة دراسية لاستعراض المذكرات، الملخصات، وسلاسل التمارين مع حلولها
                  </p>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl">
                  {activeLevels.length} مستويات
                </span>
              </div>

              {/* بطاقات المستويات في شبكة متجاوبة كاملة في الحاسوب */}
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 ${
                  activeLevels.length >= 3 ? "xl:grid-cols-3" : ""
                } gap-4 pt-1`}
              >
                {activeLevels.map((lvl: number) => {
                  const levelCount = teacherLessons.filter((l) => l.level === lvl).length;
                  const item = levelTitles[lvl] || {
                    title: `السنة ${lvl} متوسط`,
                    tag: `${lvl}م`,
                    color: "text-emerald-700",
                    bg: "from-emerald-600 to-teal-700",
                  };

                  return (
                    <div
                      key={lvl}
                      className="bg-slate-50/70 hover:bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-emerald-300 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${item.bg} text-white flex items-center justify-center text-lg font-black shrink-0 shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform`}
                        >
                          {item.tag}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-800 transition">
                            {item.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5 font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            <span>{levelCount > 0 ? `${levelCount} درس ومنشور` : "بانتظار نشر الدروس"}</span>
                          </p>
                        </div>
                      </div>

                      {/* أزرار الإجراء السريع لكل سنة دراسية */}
                      <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-slate-200/60">
                        <Link
                          href={`/year/${lvl}?teacher=${profile.id}`}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center justify-center gap-1.5 transition shadow-2xs"
                        >
                          <span>عرض الدروس والواجبات</span>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Link>

                        {flags.boardLessons !== false && (
                          <Link
                            href={`/t/${slug}/board?lvl=${lvl}`}
                            className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs"
                          >
                            <Camera className="w-3.5 h-3.5 text-emerald-600" />
                            <span>كراس السبورة {item.tag} 📸</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 2. كراس الدروس وصور السبورة الرقمية اليومية */}
            {flags.boardLessons !== false && (
              <section className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner shrink-0">
                      <Camera className="w-6 h-6 text-emerald-200" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black text-white">
                          كراس الدروس والسبورة الرقمية اليومية
                        </h2>
                        <span className="text-[10px] bg-white/20 text-white px-2.5 py-0.5 rounded-full font-bold">
                          {isValidLevel ? `${requestedLevel}م 📸` : "جديد 📸"}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-100 font-medium mt-0.5">
                        {isValidLevel
                          ? `توثيق السبورة اليومية والملخصات لجميع حصص السنة ${requestedLevel} متوسط`
                          : "توثيق صور السبورة اليومية، كراس القسم، والواجبات المنزلية بدقة"}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={isValidLevel ? `/t/${slug}/board?lvl=${requestedLevel}` : `/t/${slug}/board`}
                    className="bg-white text-emerald-950 hover:bg-emerald-50 px-4 py-2.5 rounded-2xl text-xs font-black transition shadow-sm shrink-0 flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span>تصفح كراس السبورة الشامل</span>
                    <ChevronLeft className="w-4 h-4" />
                  </Link>
                </div>

                <div className="text-xs text-emerald-100/90 leading-relaxed bg-black/15 p-3.5 rounded-2xl border border-white/10 flex items-start gap-2.5">
                  <span className="text-base shrink-0">💡</span>
                  <div>
                    <strong className="text-white block font-black">خدمة التلميذ الغائب وحفظ الحق البيداغوجي:</strong>
                    <span>
                      إذا غاب ابنك عن الحصة، يستطيع فتح كراس السبورة اليومي ونقل عناصر الدرس والأنشطة والواجبات بدقة دون
                      الحاجة لاستعارة كراس زميله أو الوقوع في أخطاء النقل.
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* 3. شريط إعلانات وتنبيهات الأستاذ */}
            {showAnnouncements && announcements && announcements.length > 0 && (
              <section className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-800 border-b border-slate-100 pb-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>إعلانات وتنبيهات الأستاذ الهامة للأولياء</span>
                </div>
                <div className="space-y-2.5">
                  {announcements.map((a) => (
                    <div
                      key={a.id}
                      className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs space-y-1"
                    >
                      <p className="font-black text-slate-900">{a.title}</p>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{a.content}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 4. ميثاق ونقاط التقويم المستمر (20 / 20) */}
            {showContinuousAssessment && (
              <section className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-3xl p-5 sm:p-6 border border-emerald-200/90 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                      <Scale className="w-5 h-5 text-emerald-100" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-black text-slate-900">
                          ميثاق ونقاط التقويم المستمر الشفاف (20 / 20)
                        </h3>
                        <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-md font-bold">
                          شفافية ⚖️
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        معايير المتابعة الدقيقة لاحتساب علامة التقويم الصفيّة لكل تلميذ بكل وضوح وعدالة:
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2.5 rounded-2xl bg-white border border-emerald-200/70 text-center shadow-2xs">
                    <span className="block text-xs font-black text-emerald-800">كراس القسم (5ن)</span>
                    <span className="text-[10px] text-slate-500 font-medium">النظافة واكتمال الدروس</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white border border-emerald-200/70 text-center shadow-2xs">
                    <span className="block text-xs font-black text-emerald-800">الانضباط (5ن)</span>
                    <span className="text-[10px] text-slate-500 font-medium">السلوك والمشاركة الإيجابية</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white border border-emerald-200/70 text-center shadow-2xs">
                    <span className="block text-xs font-black text-emerald-800">الواجبات (5ن)</span>
                    <span className="text-[10px] text-slate-500 font-medium">حل التمارين المنزلية</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-white border border-emerald-200/70 text-center shadow-2xs">
                    <span className="block text-xs font-black text-emerald-800">الاستجوابات (5ن)</span>
                    <span className="text-[10px] text-slate-500 font-medium">الفروض والتقويمات الفجائية</span>
                  </div>
                </div>
              </section>
            )}
          </main>

          {/* ═════════ العمود الجانبي (4 من 12 في الحاسوب) ═════════ */}
          <aside className="lg:col-span-4 space-y-5">
            {/* بطاقة قنوات التواصل الخاصة بالولي: ساعة الاستقبال والرسالة السرية */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>قنوات التواصل الرسمية مع الأستاذ</span>
              </h3>

              <div className="space-y-2.5">
                {showMessages && (
                  <Link
                    href={`/messages/send?teacher=${profile.id}${isValidLevel ? `&lvl=${requestedLevel}` : ""}`}
                    className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 transition flex items-start gap-3 group shadow-2xs"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <strong className="block text-xs font-black text-slate-900 group-hover:text-emerald-800">
                        رسالة سرية ومباشرة للأستاذ 🔒
                      </strong>
                      <span className="text-[11px] text-slate-500 leading-relaxed font-medium block mt-0.5">
                        استفسار أو تنبيه حول استيعاب ابنك بسرية تامة دون أي حرج
                      </span>
                    </div>
                  </Link>
                )}

                {showReception && (
                  <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 flex items-start gap-3 text-right">
                    <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                      <CalendarClock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <strong className="block text-xs font-black text-teal-950">
                        ساعة استقبال الأولياء الرسمية
                      </strong>
                      <span className="text-[11px] text-teal-800 font-bold block mt-0.5">
                        {profile.reception?.officialDay
                          ? `كل يوم ${profile.reception.officialDay} (${profile.reception.officialTime || "صباحاً"})`
                          : "خلال أوقات الدوام الرسمي المعتمد بالمؤسسة"}
                      </span>
                      <span className="text-[10px] text-teal-600 font-medium block mt-0.5">
                        بمقر {profile.school_custom_name || "المتوسطة"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* لوحة الشرف وتكريم النوابغ */}
            {showHonors && (
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-yellow-50 rounded-3xl p-5 border border-amber-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-amber-950">لوحة الشرف وتكريم النوابغ</h3>
                      <p className="text-[10px] text-amber-700 font-medium">المتميزون في مادة {subjectName}</p>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  تكريم دوري للتلاميذ المتفوقين في التقييمات الصفيّة والمواظبة على إنجاز الواجبات والأنشطة النموذجية.
                </p>

                <Link
                  href={`/honor?teacher=${profile.id}${isValidLevel ? `&lvl=${requestedLevel}` : ""}`}
                  className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition shadow-2xs"
                >
                  <span>مشاهدة المتفوقين وشهادات التقدير</span>
                  <span>🌟</span>
                </Link>
              </div>
            )}

            {/* بطاقة رمز الاستجابة السريع لمشاركة الفضاء */}
            <div className="bg-white rounded-3xl p-2 border border-slate-200/90 shadow-2xs">
              <TeacherQR
                path={`/t/${profile.slug || profile.id}${isValidLevel ? `?lvl=${requestedLevel}` : ""}`}
                teacherName={profile.full_name || "الأستاذ"}
                code={isValidLevel ? `${profile.teacher_code || "MTH"}-${requestedLevel}` : profile.teacher_code}
                schoolName={profile.school_custom_name || ""}
                levelsTaught={isValidLevel ? [requestedLevel] : (profile.levels_taught || [1, 2, 3, 4])}
              />
            </div>

            {/* درع الحماية وإخلاء المسؤولية القانونية */}
            <SafeHarborDisclaimer
              teacherName={profile.full_name}
              schoolName={profile.school_custom_name}
              subjectName={(profile as any).subject || "مادة الرياضيات"}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}