import React from "react";
import { ParentSummons } from "@/lib/types";

interface Props {
  summons: ParentSummons;
  teacherName?: string;
  subjectName?: string;
  schoolName?: string;
  receptionDay?: string;
  receptionTime?: string;
}

export function ParentSummonsPrintDoc({
  summons,
  teacherName = "أستاذ المادة",
  subjectName = "الرياضيات",
  schoolName = "متوسطة ولاية الوادي",
  receptionDay = "الأحد",
  receptionTime = "10:00 - 11:00",
}: Props) {
  const today = new Date().toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="font-sans text-black leading-relaxed space-y-6" dir="rtl">
      {/* ── الجزء العلوي: استدعاء ولي الأمر الأصلي ── */}
      <div className="border-2 border-black rounded-2xl p-6 bg-white space-y-4">
        {/* الترويسة الرسمية المصغرة */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3 text-xs font-bold">
          <div>
            <p>الجمهورية الجزائرية الديمقراطية الشعبية</p>
            <p>وزارة التربية الوطنية</p>
            <p className="text-[11px] text-gray-700">{schoolName}</p>
          </div>
          <div className="text-left text-[11px]">
            <p>السنة الدراسية: 2026/2027</p>
            <p>التاريخ: {today}</p>
          </div>
        </div>

        {/* عنوان الوثيقة */}
        <div className="text-center py-1">
          <span className="inline-block border-2 border-black px-6 py-1.5 rounded-xl font-black text-sm bg-gray-100">
            إشعار واستدعاء ولي أمر تلميذ
          </span>
        </div>

        {/* صلب الاستدعاء */}
        <div className="text-xs space-y-3 leading-relaxed">
          <p>
            إلى السيد(ة) ولي أمر التلميذ(ة):{" "}
            <span className="font-black text-sm border-b-2 border-black px-2">
              {summons.studentName}
            </span>{" "}
            المسجل بالقسم:{" "}
            <span className="font-black text-sm border-b-2 border-black px-2">
              {summons.className}
            </span>
          </p>

          <p>
            يرجى منكم التفضل بالحضور إلى المؤسسة لمقابلة أستاذ(ة) مادة:{" "}
            <strong>{subjectName}</strong>، وذلك يوم:{" "}
            <strong className="underline underline-offset-4">{receptionDay}</strong> على الساعة:{" "}
            <strong className="underline underline-offset-4 font-mono">{receptionTime}</strong>.
          </p>

          {/* موضوع وتوجيه الاستدعاء */}
          <div className="p-3 bg-gray-50 border border-gray-300 rounded-xl space-y-1">
            <span className="font-black text-gray-900">موضوع الاستدعاء وتوجيه الأستاذ:</span>
            <p className="text-gray-800 text-[11px]">
              {summons.notes || "مناقشة النتائج الدراسية وسير العمل في المادة، وتدارك النقائص المسجلة."}
            </p>
          </div>

          {/* الرمز السري للخصوصية */}
          {summons.accessCode && (
            <div className="p-2.5 bg-[#e6f4ee] border border-[#107a57]/30 rounded-xl flex items-center justify-between text-[11px]">
              <span>الرمز السري للاطلاع على التوجيهات وملاحظات الأستاذ عبر منصة جسور التعليمية:</span>
              <span className="font-mono font-black text-sm bg-white px-3 py-0.5 rounded border border-[#107a57]/40 text-[#107a57]">
                {summons.accessCode}
              </span>
            </div>
          )}

          <p className="text-[11px] text-gray-600">
            * حضوركم ضروري لمصلحة التلميذ(ة) التربوية، وفي حال تعذر الحضور يرجى إشعار الإدارة مسبقاً.
          </p>
        </div>

        {/* التوقيعات */}
        <div className="grid grid-cols-2 gap-4 pt-3 text-center text-xs">
          <div className="border border-gray-400 rounded-xl p-2 h-20 flex flex-col justify-between">
            <span className="font-black">إمضاء الأستاذ(ة): {teacherName}</span>
          </div>
          <div className="border border-gray-400 rounded-xl p-2 h-20 flex flex-col justify-between">
            <span className="font-black">تأشيرة مستشارية التربية / الإدارة</span>
          </div>
        </div>
      </div>

      {/* ── خط الفصل والقطع المقصي ── */}
      <div className="relative flex items-center justify-center my-4">
        <div className="border-t-2 border-dashed border-gray-400 w-full" />
        <span className="bg-white px-3 text-[10px] font-bold text-gray-500 shrink-0">
          ✂️ يقطع هذا الوصل ويُعاد للمؤسسة مع التلميذ بعد توقيع الولي ✂️
        </span>
      </div>

      {/* ── الجزء السفلي: وصل استلام واستجابة الولي ── */}
      <div className="border border-black rounded-xl p-4 bg-gray-50/50 space-y-3 text-xs">
        <div className="flex items-center justify-between font-bold text-[11px]">
          <span>وصل استلام إشعار استدعاء ولي التلميذ</span>
          <span>قسم: {summons.className}</span>
        </div>

        <p className="leading-relaxed">
          أنا الموقع أسفله السيد(ة): ..................................................... ولي أمر التلميذ(ة):{" "}
          <strong>{summons.studentName}</strong>، أشهد أنني استلمت الاستدعاء وسأحضر في الموعد المحدد.
        </p>

        <div className="flex items-center justify-between pt-2">
          <span>التاريخ: ...... / ...... / 2026</span>
          <span className="font-black">إمضاء ولي الأمر: ...............................</span>
        </div>
      </div>
    </div>
  );
}
