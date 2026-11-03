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
import { TeacherInquiryActions } from "@/components/TeacherInquiryActions";

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
              <TeacherInquiryActions
                teacherId={profile.id}
                teacherCode={profile.teacher_code || "MTH"}
                teacherName={profile.full_name || "الأستاذ"}
                subject={subjectName}
                availableLevels={activeLevels}
                defaultLevel={isValidLevel ? requestedLevel : undefined}
                compact={true}
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

            {/* إحصائيات سريعة للأستاذ تظهر بوضوح في شاشات الحاسوب والهاتف */}
            <div className="flex items-center justify-center gap-2.5 shrink-0 bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/10">
              <div className="px-3 py-1.5 rounded-xl bg-white/10 text-center">
                <span className="block text-xs font-black text-emerald-200">{activeLevels.length}</span>
                <span className="text-[10px] text-emerald-100/80">مستويات مسندة</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/10 text-center">
                <span className="block text-xs font-black text-emerald-200">{teacherLessons.length}</span>
                <span className="text-[10px] text-emerald-100/80">درساً وواجباً</span>
              </div>
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

        {/* ─── 1. شبكة المستويات والمناهج التعليمية المقررة (المستويات المسندة) ─── */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full mb-1 border border-emerald-200/60">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>المستويات والمناهج التعليمية المقررة</span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-slate-900">
                {isValidLevel
                  ? `الدروس والواجبات المقررة للسنة ${requestedLevel} متوسط:`
                  : "اختر السنة الدراسية لمتابعة الدروس والواجبات اليومية:"}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                استعراض فوري لكراس الدروس الرقمي، مذكرات المقطع، وسلاسل التمارين مع حلولها النموذجية
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/60">
              {activeLevels.length} مستويات مسندة
            </span>
          </div>

          {/* شبكة البطاقات الدراسية متناسقة العرض والارتفاع */}
          <div
            className={`grid grid-cols-1 ${
              activeLevels.length === 1
                ? "max-w-xl mx-auto"
                : activeLevels.length === 2
                ? "md:grid-cols-2"
                : activeLevels.length === 3
                ? "md:grid-cols-3"
                : "sm:grid-cols-2 lg:grid-cols-4"
            } gap-5`}
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
                  className="bg-slate-50/70 hover:bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 hover:border-emerald-300 shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between gap-5 group relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r ${item.bg}`} />

                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${item.bg} text-white flex items-center justify-center text-xl font-black shrink-0 shadow-md shadow-emerald-900/10 group-hover:scale-105 transition-transform`}
                        >
                          {item.tag}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                              المنهاج الرسمي
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {levelCount > 0 ? `${levelCount} درس ومنشور` : "بانتظار نشر الدروس"}
                            </span>
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-800 transition mt-1">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/80 rounded-2xl p-3 border border-slate-100 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>كراس الدروس الرقمي وتوثيق السبورة اليومية</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>سلاسل التمارين والواجبات المنزلية المقررة</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>المذكرات وحلول الأنشطة البيداغوجية</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/year/${lvl}?teacher=${profile.id}`}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all shadow-2xs hover:shadow-md"
                  >
                    <span>دخول فضاء دروس وواجبات {item.tag}</span>
                    <ChevronLeft className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── 2. شبكة الخدمات وجسور التواصل المعتمدة مع الأولياء ─── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* بطاقة قنوات التواصل والاستقبال الرسمي */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-2xs shrink-0">
                  <CalendarClock className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">قنوات التواصل والاستقبال الرسمي</h3>
                  <p className="text-[11px] text-slate-500 font-medium">الجسور التربوية المعتمدة مع الأستاذ</p>
                </div>
              </div>

              {/* موعد الاستقبال الأسبوعي الرسمي */}
              {showReception && (
                <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 text-right space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-teal-950">
                    <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                    <span>ساعة استقبال الأولياء الرسمية بالمؤسسة:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-teal-900 font-bold pr-3.5">
                    {profile.reception?.officialDay
                      ? `كل يوم ${profile.reception.officialDay} (${profile.reception.officialTime || "صباحاً"})`
                      : "خلال أوقات الدوام الرسمي المعتمد بالمؤسسة"}
                  </p>
                  <p className="text-[11px] text-teal-700 font-medium pr-3.5">
                    بمقر {profile.school_custom_name || "المتوسطة"}
                  </p>
                </div>
              )}

              {/* توضيح استفسار الولي المباشر */}
              <div className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <strong className="block text-slate-800 font-bold mb-0.5">تواصل واستفسار خاص مع الأستاذ:</strong>
                <span>يمكن للولي توجيه سؤال أو ملاحظة خاصة للأستاذ حول استيعاب ابنه وفوزه التربوي، وتصل للأستاذ حصراً دون سواه للرد عليها بيداغوجياً.</span>
              </div>
            </div>

            {showMessages && (
              <div className="space-y-2">
                <TeacherInquiryActions
                  teacherId={profile.id}
                  teacherCode={profile.teacher_code || "MTH"}
                  teacherName={profile.full_name || "الأستاذ"}
                  subject={subjectName}
                  availableLevels={activeLevels}
                  defaultLevel={isValidLevel ? requestedLevel : undefined}
                />

                <div className="text-center pt-1">
                  <Link
                    href={`/messages/send?teacher=${profile.id}${isValidLevel ? `&lvl=${requestedLevel}` : ""}`}
                    className="text-[11px] text-slate-400 hover:text-slate-600 transition underline"
                  >
                    أو إرسال ملاحظة في صندوق الصراحة المجهول 🔒
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* بطاقة لوحة الشرف وتكريم النوابغ (إذا كانت مفعلة) أو بطاقة التميز */}
          {showHonors ? (
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-yellow-50/60 rounded-3xl p-6 border border-amber-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-5">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm sm:text-base font-black text-amber-950">لوحة الشرف وتكريم النوابغ</h3>
                      <span className="text-[10px] bg-amber-200/80 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
                        تميز 🌟
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 font-medium">المتميزون في مادة {subjectName}</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/80 border border-amber-200/70 space-y-1.5 text-xs text-amber-950">
                  <p className="font-bold">تحفيز مستمر للتلاميذ المتفوقين:</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    تكريم دوري للتلاميذ الحاصلين على المراتب الأولى في الفروض، والمواظبين على إنجاز الواجبات والأنشطة النموذجية داخل القسم لغرس روح المنافسة الشريفة.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold text-amber-800 bg-amber-100/50 p-2.5 rounded-xl border border-amber-200/50">
                  <span>🎖️ شهادات تقدير دورية</span>
                  <span>•</span>
                  <span>⭐ نجوم المادة الأوائل</span>
                </div>
              </div>

              <Link
                href={`/honor?teacher=${profile.id}${isValidLevel ? `&lvl=${requestedLevel}` : ""}`}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center justify-center gap-2 transition shadow-xs hover:shadow-md"
              >
                <span>مشاهدة المتفوقين وشهادات التقدير 🌟</span>
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold shadow-2xs">
                    <Sparkles className="w-5 h-5 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">المتابعة والمواكبة المستمرة</h3>
                    <p className="text-[11px] text-slate-500 font-medium">نصائح وإرشادات النجاح</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  المتابعة الدورية لكراس التلميذ وحل التمارين اليومية هي الركيزة الأساسية للتحصيل الدراسي الممتاز في مادة {subjectName}. احرص على مراجعة ما يقدمه الأستاذ بانتظام.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ─── 3. بطاقة الربط والمشاركة ورمز QR ─── */}
        <section className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs">
          <TeacherQR
            path={`/t/${profile.slug || profile.id}${isValidLevel ? `?lvl=${requestedLevel}` : ""}`}
            teacherName={profile.full_name || "الأستاذ"}
            code={isValidLevel ? `${profile.teacher_code || "MTH"}-${requestedLevel}` : profile.teacher_code}
            schoolName={profile.school_custom_name || ""}
            levelsTaught={isValidLevel ? [requestedLevel] : (profile.levels_taught || [1, 2, 3, 4])}
          />
        </section>

        {/* ─── 4. إعلانات وتنبيهات الأستاذ (إن وجدت) ─── */}
        {showAnnouncements && announcements && announcements.length > 0 && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-800 border-b border-slate-100 pb-3">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-black">إعلانات وتنبيهات الأستاذ الهامة للأولياء والتلاميذ</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs space-y-1.5"
                >
                  <p className="font-black text-slate-900 text-sm">{a.title}</p>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{a.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── 5. درع الحماية والضمانة القانونية ─── */}
        <SafeHarborDisclaimer
          teacherName={profile.full_name}
          schoolName={profile.school_custom_name}
          subjectName={(profile as any).subject || "مادة الرياضيات"}
        />
      </div>
    </div>
  );
}