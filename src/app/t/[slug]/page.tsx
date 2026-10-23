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
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherPublicSpace({ params }: TeacherPageProps) {
  const { slug } = await params;

  const profile = await findPublicTeacher(slug);
  if (!profile) {
    notFound();
  }

  // 2. بيانات الأستاذ العامة: الدروس والإعلانات (من فضائه المستقل)
  const publicData = await readPublicTeacherData(supabase, profile.id).catch(() => normalizeData({}));

  const announcements = (publicData.announcements ?? [])
    .filter((a) => a.active !== false)
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
  const teacherLessons = publicData.lessons;

  // إعدادات وتخصيصات الفضاء البيداغوجي للأستاذ
  const flags = publicData.featureFlags || (profile as any).feature_flags || {};
  const showAnnouncements = flags.announcements !== false;
  const showHonors = flags.honors !== false;
  const showContinuousAssessment = flags.continuousAssessment !== false;
  const showReception = flags.reception !== false;
  const showMessages = flags.messages !== false;

  const levelsTaught = profile.levels_taught || [1, 2, 3, 4];
  const codePrefix = (profile.teacher_code || "").split("-")[0]?.toUpperCase() || "MTH";
  const subjectObj =
    MIDDLE_SCHOOL_SUBJECTS.find((s) => s.codePrefix === codePrefix || s.id === (profile as any).subject) ||
    MIDDLE_SCHOOL_SUBJECTS[0];
  const subjectName = subjectObj.name;
  const subjectIcon = subjectObj.icon;

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
              العودة لبوابة ولاية الوادي
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-mono bg-white/15 px-2.5 py-0.5 rounded-md font-bold text-[11px]">
                {profile.teacher_code || "MTH"}
              </span>
              <SaveToWalletButton
                slug={slug}
                name={profile.full_name || ""}
                code={profile.teacher_code || ""}
                school={profile.school_custom_name || ""}
              />
            </div>
          </div>

          <div className="text-center space-y-2 pt-2">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 mx-auto flex items-center justify-center text-2xl font-black shadow-inner">
              {subjectIcon}
            </div>
            <div className="inline-block bg-white/15 px-3 py-0.5 rounded-full text-xs font-bold text-emerald-100 border border-white/20">
              مادة {subjectName}
            </div>
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

        {/* السنوات الدراسية للأستاذ */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-1">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            اختر سنتك الدراسية لمشاهدة الدروس والواجبات:
          </h2>

          <div className="space-y-2.5">
            {levelsTaught.map((lvl: number) => {
              const levelCount = teacherLessons.filter((l) => l.level === lvl).length;
              const levelTitles: Record<number, { title: string; tag: string }> = {
                1: { title: "السنة الأولى متوسط", tag: "1م" },
                2: { title: "السنة الثانية متوسط", tag: "2م" },
                3: { title: "السنة الثالثة متوسط", tag: "3م" },
                4: { title: "السنة الرابعة متوسط (BEM)", tag: "4م" },
              };
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
                  شبكة التقييم: كراس (04) • سلوك (04) • واجبات (04) • استجوابات (08)
                </p>
              </div>
            </div>
            <Link
              href={`/assessment?teacher=${profile.id}`}
              className="text-xs font-bold text-emerald-800 bg-white border border-emerald-200 px-3.5 py-2 rounded-xl hover:bg-emerald-100 active:scale-95 transition shadow-2xs shrink-0"
            >
              اطلاع الولي 🔍
            </Link>
          </div>
        )}

        {/* لوحة الشرف للأستاذ */}
        {showHonors && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">لوحة الشرف والمتفوقين</p>
                <p className="text-[11px] text-slate-400">التلاميذ المتميزون في مادة الرياضيات</p>
              </div>
            </div>
            <Link
              href={`/honor?teacher=${profile.id}`}
              className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition"
            >
              مشاهدة
            </Link>
          </div>
        )}

        {/* خدمات الولي: الاستقبال، الاستدعاءات، الرسائل المجهولة */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {showReception && (
            <Link
              href={`/announcement?teacher=${profile.id}`}
              className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-teal-300 transition flex items-center gap-3"
            >
              <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <CalendarClock className="w-4 h-4" />
              </span>
              <span className="text-xs">
                <strong className="block text-slate-800">ساعة الاستقبال</strong>
                <span className="text-slate-500">
                  {profile.reception?.officialDay ? `كل ${profile.reception.officialDay}` : "التوجيهات والمواعيد"}
                </span>
              </span>
            </Link>
          )}

          {showReception && (
            <Link
              href={`/parents?teacher=${profile.id}`}
              className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-sky-300 transition flex items-center gap-3"
            >
              <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </span>
              <span className="text-xs">
                <strong className="block text-slate-800">أولياء أود استقبالهم</strong>
                <span className="text-slate-500">هل ابنك معني بلقاء؟</span>
              </span>
            </Link>
          )}

          {showMessages && (
            <Link
              href={`/messages?teacher=${profile.id}`}
              className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:border-violet-300 transition flex items-center gap-3"
            >
              <span className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4" />
              </span>
              <span className="text-xs">
                <strong className="block text-slate-800">رسالة سرية للأستاذ</strong>
                <span className="text-slate-500">سؤال أو اقتراح دون ذكر الاسم</span>
              </span>
            </Link>
          )}
        </div>

        <TeacherQR
          path={`/t/${profile.slug || profile.id}`}
          teacherName={profile.full_name || "الأستاذ"}
          code={profile.teacher_code}
          schoolName={profile.school_custom_name || ""}
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
