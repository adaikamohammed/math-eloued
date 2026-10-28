import React from "react";

interface Props {
  title: string;
  subtitle?: string;
  schoolName?: string;
  wilayaName?: string;
  academicYear?: string;
  subjectName?: string;
}

export function PrintOfficialHeader({
  title,
  subtitle,
  schoolName = "متوسطة ولاية الوادي",
  wilayaName = "الوادي",
  academicYear = "2026 / 2027",
  subjectName,
}: Props) {
  return (
    <div className="w-full text-center space-y-2 mb-6 font-sans text-black" dir="rtl">
      {/* الترويسة الدستورية الرسمية */}
      <div className="space-y-0.5">
        <p className="text-sm font-black tracking-wide text-gray-900">
          الجمهورية الجزائرية الديمقراطية الشعبية
        </p>
        <p className="text-xs font-bold text-gray-800">
          وزارة التربية الوطنية
        </p>
      </div>

      {/* بيانات المديرية والمؤسسة في سطرين متوازنين */}
      <div className="flex items-center justify-between text-[11px] font-bold border-b border-gray-800 pb-2 pt-1 text-gray-900 px-2">
        <div className="text-right space-y-0.5">
          <p>مديرية التربية لولاية {wilayaName}</p>
          <p>{schoolName}</p>
        </div>

        <div className="text-left space-y-0.5">
          <p>السنة الدراسية: {academicYear}</p>
          {subjectName && <p>مادة: {subjectName}</p>}
        </div>
      </div>

      {/* عنوان الوثيقة الإدارية داخل إطار رسمي مزخرف */}
      <div className="py-2.5">
        <div className="inline-block border-2 border-black px-6 py-2 rounded-xl bg-gray-50 shadow-2xs">
          <h2 className="text-base sm:text-lg font-black text-black">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] font-bold text-gray-700 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
