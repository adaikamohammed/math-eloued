import React from "react";
import { StudentEvaluation } from "@/lib/types";
import { PrintOfficialHeader } from "./PrintOfficialHeader";
import { OfficialSignatures } from "./OfficialSignatures";

interface Props {
  className: string;
  groupName?: string;
  evaluations: StudentEvaluation[];
  teacherName?: string;
  subjectName?: string;
  schoolName?: string;
}

export function EvaluationRosterPrintDoc({
  className,
  groupName,
  evaluations,
  teacherName = "أستاذ المادة",
  subjectName = "الرياضيات",
  schoolName = "متوسطة ولاية الوادي",
}: Props) {
  const subtitle = `كشف تفريغ ومتابعة علامات التقويم المستمر (20/20) — قسم: ${className} ${groupName ? `(${groupName})` : ""}`;

  return (
    <div className="font-sans text-black leading-relaxed" dir="rtl">
      <PrintOfficialHeader
        title="بطاقة تنقيط التقويم البيداغوجي المستمر"
        subtitle={subtitle}
        schoolName={schoolName}
        subjectName={subjectName}
      />

      {/* معايير التنقيط المعتمدة في الميثاق التربوي */}
      <div className="border border-gray-400 rounded-xl p-2.5 bg-gray-50/80 mb-3 text-[10px] grid grid-cols-4 gap-2 text-center">
        <div className="border-l border-gray-300 pl-1">
          <p className="font-bold">1. كراس الدروس (05 ن)</p>
          <p className="text-gray-600">نظام، اكتمال، ونظافة</p>
        </div>
        <div className="border-l border-gray-300 pl-1">
          <p className="font-bold">2. الواجبات المنزلية (05 ن)</p>
          <p className="text-gray-600">كراس المحاولات والمواظبة</p>
        </div>
        <div className="border-l border-gray-300 pl-1">
          <p className="font-bold">3. السلوك والأدوات (05 ن)</p>
          <p className="text-gray-600">الكتاب، الأدوات، والانضباط</p>
        </div>
        <div>
          <p className="font-bold">4. المشاركة وحل النشاط (05 ن)</p>
          <p className="text-gray-600">المبادرة والتفاعل الإيجابي</p>
        </div>
      </div>

      {/* جدول كشف النقاط */}
      <table className="print-table w-full text-right text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100 text-black font-black text-center">
            <th className="border border-black py-1.5 px-2 w-10">الرقم</th>
            <th className="border border-black py-1.5 px-3 text-right">اسم ولقب التلميذ(ة)</th>
            <th className="border border-black py-1.5 px-2 w-20">كراس الدروس (5)</th>
            <th className="border border-black py-1.5 px-2 w-20">الواجبات (5)</th>
            <th className="border border-black py-1.5 px-2 w-20">السلوك والأدوات (5)</th>
            <th className="border border-black py-1.5 px-2 w-20">المشاركة (5)</th>
            <th className="border border-black py-1.5 px-2 w-20 bg-gray-200">المجموع (20)</th>
            <th className="border border-black py-1.5 px-2.5">الملاحظة والتقدير</th>
          </tr>
        </thead>
        <tbody>
          {evaluations.length === 0 ? (
            <tr>
              <td colSpan={8} className="border border-black py-6 text-center text-gray-500 font-bold">
                لا توجد تقييمات مسجلة لهذا القسم بعد.
              </td>
            </tr>
          ) : (
            evaluations.map((ev, idx) => (
              <tr key={ev.id || idx} className="border-b border-black text-center">
                <td className="border border-black py-1.5 px-2 font-mono font-bold">
                  {idx + 1}
                </td>
                <td className="border border-black py-1.5 px-3 text-right font-black text-gray-900">
                  {ev.studentName}
                </td>
                <td className="border border-black py-1.5 px-2 font-mono">
                  {ev.notebookScore}
                </td>
                <td className="border border-black py-1.5 px-2 font-mono">
                  {ev.homeworkScore}
                </td>
                <td className="border border-black py-1.5 px-2 font-mono">
                  {ev.toolsScore}
                </td>
                <td className="border border-black py-1.5 px-2 font-mono">
                  {ev.activityScore}
                </td>
                <td className="border border-black py-1.5 px-2 font-mono font-black text-sm bg-gray-100">
                  {ev.totalScore}
                </td>
                <td className="border border-black py-1.5 px-2 text-right text-[10px] text-gray-800">
                  {ev.notes || (ev.totalScore >= 16 ? "ممتاز ومواظب" : ev.totalScore >= 12 ? "عمل حسن" : "يحتاج مضاعفة الجهد")}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* التوقيعات */}
      <OfficialSignatures
        teacherTitle={`إمضاء الأستاذ(ة): ${teacherName}`}
        principalTitle="تأشيرة ومصادقة السيد مدير المتوسطة"
        showTeacher={true}
        showPrincipal={true}
      />
    </div>
  );
}
