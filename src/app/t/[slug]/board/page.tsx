import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { findPublicTeacher } from "@/lib/teachers";
import { readPublicTeacherData, normalizeData } from "@/lib/storage";
import { MIDDLE_SCHOOL_SUBJECTS } from "@/lib/types";
import { AutoSaveTeacherWallet } from "@/components/AutoSaveTeacherWallet";
import { SafeHarborDisclaimer } from "@/components/SafeHarborDisclaimer";
import { ParentBoardViewer } from "./ParentBoardViewer";
import { ArrowRight, BookOpen, Building2 } from "lucide-react";

interface BoardPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeacherBoardPage({ params }: BoardPageProps) {
  const { slug } = await params;
  const profile = await findPublicTeacher(slug);
  if (!profile) notFound();

  const publicData = await readPublicTeacherData(supabase, profile.id).catch(() => normalizeData({}));
  const lessons = publicData.lessons || [];

  const codePrefix = (profile.teacher_code || "").split("-")[0]?.toUpperCase() || "MTH";
  const subjectObj =
    MIDDLE_SCHOOL_SUBJECTS.find((s) => s.codePrefix === codePrefix || s.id === (profile as any).subject) ||
    MIDDLE_SCHOOL_SUBJECTS[0];

  return (
    <div className="min-h-screen bg-[#fafaf7] text-gray-900 pb-20 font-sans" dir="rtl">
      <AutoSaveTeacherWallet
        profile={{
          ...profile,
          subject: subjectObj.id,
        }}
      />

      {/* رأس الفضاء */}
      <div className="bg-white border-b border-[#e8e8e0] px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href={`/t/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#107a57] font-bold transition bg-[#fafaf7] px-3 py-1.5 rounded-xl border border-[#e8e8e0]"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لصفحة الأستاذ</span>
          </Link>

          <div className="text-right flex items-center gap-2">
            <span className="font-mono text-xs font-black bg-[#e6f4ee] text-[#107a57] px-2.5 py-1 rounded-md border border-[#107a57]/20">
              {profile.teacher_code || "MTH"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* بطاقة معلومات الأستاذ */}
        <div className="bg-white rounded-3xl border border-[#e8e8e0] p-6 shadow-xs flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
          <div className="w-16 h-16 rounded-2xl bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 flex items-center justify-center text-3xl font-black shrink-0">
            {subjectObj.icon}
          </div>
          <div className="flex-1 space-y-1">
            <div className="inline-block text-[11px] font-black text-[#107a57] bg-[#e6f4ee] px-2.5 py-0.5 rounded-full">
              مادة {subjectObj.name}
            </div>
            <h1 className="text-lg sm:text-xl font-black text-gray-900">
              كراس الدروس وصور السبورة — {profile.full_name}
            </h1>
            <p className="text-xs text-gray-500 flex items-center justify-center sm:justify-start gap-1">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <span>{profile.school_custom_name || "متوسطة ولاية الوادي"}</span>
            </p>
          </div>
        </div>

        {/* المكون التفاعلي للولي لعرض صور السبورة */}
        <ParentBoardViewer
          lessons={lessons}
          teacherName={profile.full_name || "الأستاذ"}
          subjectName={subjectObj.name}
        />

        <SafeHarborDisclaimer
          teacherName={profile.full_name}
          schoolName={profile.school_custom_name}
          subjectName={subjectObj.name}
        />
      </div>
    </div>
  );
}
