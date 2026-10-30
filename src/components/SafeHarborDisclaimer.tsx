import React from "react";
import { ShieldCheck, Scale } from "lucide-react";

interface SafeHarborDisclaimerProps {
  teacherName?: string | null;
  schoolName?: string | null;
  subjectName?: string | null;
}

export function SafeHarborDisclaimer({
  teacherName = "الأستاذ",
  schoolName = "المؤسسة التعليمية",
  subjectName = "مادة الرياضيات",
}: SafeHarborDisclaimerProps) {
  return (
    <footer className="mt-10 pt-6 pb-4 border-t border-slate-200/80 text-center space-y-2">
      <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[11px] font-bold border border-slate-200 shadow-2xs">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>فضاء تعليمي مستقل بيداغوجياً وقانونياً</span>
      </div>

      <p className="text-[11px] text-slate-500 max-w-xl mx-auto leading-relaxed px-4">
        هذا الفضاء يُدار شخصياً وبشكل مستقل من قِبل{" "}
        <strong className="text-slate-700">{teacherName}</strong> ({subjectName}) بمؤسسة{" "}
        <span className="text-slate-700">{schoolName}</span>. المحتوى المنشور (كراس القسم، الدروس، الواجبات، والتقويم)
        يقع تحت مسؤوليته التربوية الحصرية. المنصة مجرد وسيط تقني غير ناشر وتخلي مسؤوليتها عن أي محتوى غير معتمد.
      </p>

      <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
        <Scale className="w-3 h-3 text-slate-400" />
        <span>نظام الفضاءات البيداغوجية المستقلة — منصة جسور 2026</span>
      </div>
    </footer>
  );
}

export default SafeHarborDisclaimer;
