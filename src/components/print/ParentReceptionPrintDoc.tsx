import React from "react";
import { UserProfile, MIDDLE_SCHOOL_SUBJECTS } from "@/lib/types";
import { PrintOfficialHeader } from "./PrintOfficialHeader";
import { OfficialSignatures } from "./OfficialSignatures";

interface Props {
  schoolName: string;
  teachers: UserProfile[];
}

export function ParentReceptionPrintDoc({ schoolName, teachers }: Props) {
  return (
    <div className="font-sans text-black leading-relaxed" dir="rtl">
      <PrintOfficialHeader
        title="دليل استقبال أولياء التلاميذ بالمؤسسة"
        subtitle="رزنامة المقابلات البيداغوجية الدورية للأساتذة — الموسم الدراسي 2026/2027"
        schoolName={schoolName}
      />

      {/* توجيهات للأولياء */}
      <div className="border border-gray-400 rounded-xl p-3 bg-gray-50/80 mb-4 text-[11px] leading-normal">
        <p className="font-black text-gray-900 mb-1">إلى السادة أولياء التلاميذ الأفاضل:</p>
        <p className="text-gray-800">
          حرصاً على المتابعة التربوية المستمرة لأبنائكم وتجسيداً للتواصل الفعال بين الأسرة والمدرسة، تضع إدارة المتوسطة تحت تصرفكم جدول المقابلات الأسبوعية مع السادة الأساتذة. يرجى احترام المواعيد المحددة وإحضار كراس التلميذ لتسهيل مناقشة النتائج.
        </p>
      </div>

      {/* جدول مواعيد الاستقبال الموحد */}
      <table className="print-table w-full text-right text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100 text-black font-black">
            <th className="border border-black py-2 px-2 text-center w-10">الرقم</th>
            <th className="border border-black py-2 px-3">اسم الأستاذ(ة)</th>
            <th className="border border-black py-2 px-3">المادة التعليمية</th>
            <th className="border border-black py-2 px-3 text-center">اليوم المخصص</th>
            <th className="border border-black py-2 px-3 text-center">التوقيت</th>
            <th className="border border-black py-2 px-3 text-center">المكان / القاعة</th>
            <th className="border border-black py-2 px-3">توجيهات لولي الأمر</th>
          </tr>
        </thead>
        <tbody>
          {teachers.length === 0 ? (
            <tr>
              <td colSpan={7} className="border border-black py-6 text-center text-gray-500 font-bold">
                لا توجد بيانات مسجلة بعد.
              </td>
            </tr>
          ) : (
            teachers.map((t, idx) => {
              const r = t.reception;
              const sub = MIDDLE_SCHOOL_SUBJECTS.find((s) => s.id === t.subject);
              return (
                <tr key={t.id} className="border-b border-black">
                  <td className="border border-black py-2 px-2 text-center font-mono font-bold">
                    {idx + 1}
                  </td>
                  <td className="border border-black py-2 px-3 font-black whitespace-nowrap">
                    {t.full_name}
                  </td>
                  <td className="border border-black py-2 px-3 font-bold whitespace-nowrap">
                    {sub?.name || "الرياضيات"}
                  </td>
                  <td className="border border-black py-2 px-3 text-center font-black text-gray-900 whitespace-nowrap">
                    {r?.officialDay || "حسب الموعد"}
                  </td>
                  <td className="border border-black py-2 px-3 text-center font-mono font-bold whitespace-nowrap">
                    {r?.officialTime || "—"}
                  </td>
                  <td className="border border-black py-2 px-3 text-center font-bold">
                    {r?.location || "قاعة الأساتذة"}
                  </td>
                  <td className="border border-black py-2 px-3 text-[11px] text-gray-800">
                    {r?.guidance || "إحضار كراس التلميذ"}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* التوقيعات */}
      <OfficialSignatures
        teacherTitle="رئيس جمعية أولياء التلاميذ"
        principalTitle="تأشيرة وختم السيد مدير المتوسطة"
        showTeacher={true}
        showPrincipal={true}
      />
    </div>
  );
}
