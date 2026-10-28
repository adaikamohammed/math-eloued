import React from "react";

interface Props {
  communeName?: string;
  showInspector?: boolean;
  showTeacher?: boolean;
  showPrincipal?: boolean;
  teacherTitle?: string;
  principalTitle?: string;
  inspectorTitle?: string;
}

export function OfficialSignatures({
  communeName = "الوادي",
  showInspector = false,
  showTeacher = true,
  showPrincipal = true,
  teacherTitle = "إمضاء الأستاذ(ة)",
  principalTitle = "تأشيرة وختم السيد مدير المتوسطة",
  inspectorTitle = "تأشيرة وختم مفتش التعليم المتوسط",
}: Props) {
  const today = new Date().toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="w-full mt-8 pt-4 font-sans text-black" dir="rtl">
      {/* سطر مكان وتاريخ التحرير */}
      <div className="text-left text-xs font-bold mb-6 pl-4 text-gray-900">
        حرر بـ {communeName} في: {today}
      </div>

      {/* صناديق التأشيرات والإمضاءات الرسمية */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center text-xs">
        {showTeacher && (
          <div className="border border-gray-400 rounded-xl p-3 h-28 flex flex-col justify-between bg-white">
            <span className="font-black text-gray-900 border-b border-gray-300 pb-1">
              {teacherTitle}
            </span>
            <div className="h-14" />
          </div>
        )}

        {showPrincipal && (
          <div className="border border-gray-400 rounded-xl p-3 h-28 flex flex-col justify-between bg-white">
            <span className="font-black text-gray-900 border-b border-gray-300 pb-1">
              {principalTitle}
            </span>
            <div className="h-14 flex items-center justify-center text-[10px] text-gray-400 font-bold border border-dashed border-gray-300 rounded-lg mx-2">
              (الختم الدائري للمؤسسة)
            </div>
          </div>
        )}

        {showInspector && (
          <div className="border border-gray-400 rounded-xl p-3 h-28 flex flex-col justify-between bg-white">
            <span className="font-black text-gray-900 border-b border-gray-300 pb-1">
              {inspectorTitle}
            </span>
            <div className="h-14 flex items-center justify-center text-[10px] text-gray-400 font-bold border border-dashed border-gray-300 rounded-lg mx-2">
              (تأشيرة المفتشية)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
