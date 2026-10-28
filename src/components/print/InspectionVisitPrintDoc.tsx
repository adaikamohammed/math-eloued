import React from "react";
import { InspectionVisitRecord } from "@/app/inspector/shared";
import { PrintOfficialHeader } from "./PrintOfficialHeader";
import { OfficialSignatures } from "./OfficialSignatures";

interface Props {
  visit: InspectionVisitRecord;
  districtName?: string;
  inspectorName?: string;
}

export function InspectionVisitPrintDoc({
  visit,
  districtName = "المقاطعة التفتيشية الثالثة — قمار",
  inspectorName = "السيد مفتش التعليم المتوسط",
}: Props) {
  const visitLabels = {
    orientation: "زيارة إعلام وتوجيه ومرافقة",
    followup: "زيارة متابعة وتقويم بيداغوجي",
    confirmation: "زيارة تثبيت وترسيم في الرتبة",
    promotion: "زيارة تفتيش وترقية دورية",
  };

  return (
    <div className="font-sans text-black leading-relaxed space-y-4" dir="rtl">
      <PrintOfficialHeader
        title="تقرير زيارة التفتيش والتوجيه البيداغوجي"
        subtitle={`${visitLabels[visit.visitType]} — مادة الرياضيات`}
        schoolName={visit.schoolName}
        wilayaName="الوادي"
      />

      {/* 1. معلومات الهوية والزيارة */}
      <div className="border border-black rounded-xl p-3.5 bg-gray-50 text-xs space-y-2">
        <h4 className="font-black text-black border-b border-gray-300 pb-1">
          1. بيانات الأستاذ(ة) والإطار الزماني والمكاني للزيارة:
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <p><strong>اسم ولقب الأستاذ(ة):</strong> {visit.teacherName || "—"}</p>
          <p><strong>المؤسسة التربوية:</strong> {visit.schoolName}</p>
          <p><strong>الفوج المعاين:</strong> {visit.className}</p>
          <p><strong>تاريخ الزيارة:</strong> {visit.visitDate}</p>
          <p><strong>موضوع الدرس المعاين:</strong> {visit.lessonTopic || "مورد معرفي مقرر"}</p>
          <p><strong>طبيعة الزيارة:</strong> {visitLabels[visit.visitType]}</p>
        </div>
      </div>

      {/* 2. فحص السجلات والوثائق البيداغوجية */}
      <div className="border border-black rounded-xl p-3.5 text-xs space-y-2">
        <h4 className="font-black text-black border-b border-gray-300 pb-1">
          2. معاينة الوثائق والسجلات الرسمية للأستاذ:
        </h4>
        <div className="grid grid-cols-3 gap-2 text-[10px] text-center font-bold">
          <div className="border border-gray-300 p-2 rounded-lg bg-gray-50">
            كراس القسم والسبورات: <span className="text-emerald-700">مستوفى وموثق ✅</span>
          </div>
          <div className="border border-gray-300 p-2 rounded-lg bg-gray-50">
            الدفتر اليومي وسير المناهج: <span className="text-emerald-700">متابع بانتظام ✅</span>
          </div>
          <div className="border border-gray-300 p-2 rounded-lg bg-gray-50">
            سجل التقويم المستمر: <span className="text-emerald-700">مفعل 20/20 ✅</span>
          </div>
        </div>
      </div>

      {/* 3. النقاط الإيجابية ونقاط القوة */}
      <div className="border border-black rounded-xl p-3.5 text-xs space-y-1.5">
        <h4 className="font-black text-black border-b border-gray-300 pb-1">
          3. الملاحظات الإيجابية ونقاط القوة المرصودة:
        </h4>
        <p className="text-[11px] text-gray-800 leading-relaxed pr-1">
          {visit.strengths || "تحكم جيد في المادة العلمية، وضوح التدرج البيداغوجي على السبورة، تفاعل ملحوظ للتلاميذ وتشجيع المبادرة الفردية."}
        </p>
      </div>

      {/* 4. التوجيهات والتوصيات البيداغوجية */}
      <div className="border border-black rounded-xl p-3.5 text-xs space-y-1.5">
        <h4 className="font-black text-black border-b border-gray-300 pb-1">
          4. التوجيهات والتوصيات الواجب تنفيذها:
        </h4>
        <p className="text-[11px] text-gray-800 leading-relaxed pr-1">
          {visit.recommendations || "مواصلة تنويع وضعيات التعلم وإعطاء الأولوية للحل الفردي في كراس المحاولات قبل التصحيح الجماعي، مع تفعيل حصص المعالجة البيداغوجية للأفواج ذات التعثرات الملاحظة."}
        </p>
      </div>

      {/* 5. النقطة التربوية المعتمدة إن وجدت */}
      {visit.pedagogicalScore !== undefined && visit.pedagogicalScore !== null && (
        <div className="border-2 border-black rounded-xl p-3 bg-gray-100 flex items-center justify-between text-xs font-black">
          <span>النقطة البيداغوجية التربوية المقترحة:</span>
          <span className="font-mono text-sm bg-white px-4 py-1 rounded border border-black">
            {visit.pedagogicalScore} / 20
          </span>
        </div>
      )}

      {/* التوقيعات الرسمية */}
      <OfficialSignatures
        teacherTitle="إمضاء الأستاذ(ة) بعد الاطلاع"
        principalTitle="تأشيرة السيد مدير المؤسسة"
        inspectorTitle="ختم وتوقيع مفتش التعليم المتوسط"
        showTeacher={true}
        showPrincipal={true}
        showInspector={true}
      />
    </div>
  );
}
