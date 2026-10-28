import React from "react";
import { SchoolExamItem } from "@/lib/types";
import { PrintOfficialHeader } from "./PrintOfficialHeader";
import { OfficialSignatures } from "./OfficialSignatures";

interface Props {
  schoolName: string;
  semester: number;
  exams: SchoolExamItem[];
  levelFilter?: number;
}

export function ExamSchedulePrintDoc({
  schoolName,
  semester,
  exams,
  levelFilter,
}: Props) {
  const semesterLabels = {
    1: "الفصل الأول",
    2: "الفصل الثاني",
    3: "الفصل الثالث",
  };

  const currentSemesterLabel = semesterLabels[semester as 1 | 2 | 3] || "الفصل الأول";
  const subtitle = levelFilter
    ? `رزنامة الفروض المحروسة الرسمية لـ ${levelFilter} متوسط — ${currentSemesterLabel}`
    : `رزنامة الفروض المحروسة الرسمية لكافة المستويات — ${currentSemesterLabel}`;

  // ترتيب الفروض حسب التاريخ والتوقيت
  const sortedExams = [...exams].sort((a, b) =>
    (a.date || "").localeCompare(b.date || "") || (a.timeSlot || "").localeCompare(b.timeSlot || "")
  );

  return (
    <div className="font-sans text-black leading-relaxed" dir="rtl">
      <PrintOfficialHeader
        title="جدول الفروض المحروسة الرسمي المعتمد"
        subtitle={subtitle}
        schoolName={schoolName}
      />

      {/* تعليمات وتوجيهات الإدارة العامة للأساتذة والتلاميذ */}
      <div className="border border-gray-400 rounded-xl p-3 bg-gray-50/80 mb-4 text-[11px] leading-normal">
        <p className="font-black text-gray-900 mb-1">تعليمات تنظيمية هامة ملزمة للجميع:</p>
        <ul className="list-disc list-inside space-y-0.5 text-gray-800 pr-1">
          <li>يلتزم السادة الأساتذة بالحضور 15 دقيقة قبل انطلاق الحصة وإحضار مواضيع الفروض بنسخ واضحة وكافية.</li>
          <li>يمنع منعاً باتاً خروج أي تلميذ قبل انقضاء نصف المدة المخصصة للفرض.</li>
          <li>يمنع استعمال الآلات الحاسبة القابلة للبرمجة أو الهواتف الذكية داخل قاعات الامتحان.</li>
        </ul>
      </div>

      {/* جدول الفروض الرسمي */}
      <table className="print-table w-full text-right text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100 text-black font-black">
            <th className="border border-black py-2 px-2.5 text-center w-12">الرقم</th>
            <th className="border border-black py-2 px-3 text-center">المستوى</th>
            <th className="border border-black py-2 px-3">المادة التعليمية</th>
            <th className="border border-black py-2 px-3">اليوم والتاريخ</th>
            <th className="border border-black py-2 px-3 text-center">التوقيت</th>
            <th className="border border-black py-2 px-3 text-center">القاعة</th>
            <th className="border border-black py-2 px-3">ملاحظات وتعليمات خاصة</th>
          </tr>
        </thead>
        <tbody>
          {sortedExams.length === 0 ? (
            <tr>
              <td colSpan={7} className="border border-black py-6 text-center text-gray-500 font-bold">
                لا توجد فروض مسجلة في هذه الرزنامة بعد.
              </td>
            </tr>
          ) : (
            sortedExams.map((ex, idx) => (
              <tr key={ex.id} className="border-b border-black">
                <td className="border border-black py-2 px-2 text-center font-mono font-bold">
                  {idx + 1}
                </td>
                <td className="border border-black py-2 px-3 text-center font-bold">
                  {ex.level} متوسط
                </td>
                <td className="border border-black py-2 px-3 font-bold">
                  {ex.subjectName}
                </td>
                <td className="border border-black py-2 px-3 font-bold whitespace-nowrap">
                  {ex.dayName} {ex.date}
                </td>
                <td className="border border-black py-2 px-3 text-center font-mono font-bold whitespace-nowrap">
                  {ex.timeSlot}
                </td>
                <td className="border border-black py-2 px-3 text-center font-bold">
                  {ex.room || "حسب التوزيع"}
                </td>
                <td className="border border-black py-2 px-3 text-[11px] text-gray-800">
                  {ex.notes || "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* التوقيعات الإدارية الرسمية */}
      <OfficialSignatures
        teacherTitle="إمضاء السيد ناظر المؤسسة"
        principalTitle="تأشيرة وختم السيد مدير المتوسطة"
        showTeacher={true}
        showPrincipal={true}
        showInspector={false}
      />
    </div>
  );
}
