import React from "react";
import { StudentEvaluation } from "@/lib/types";
import { PrintOfficialHeader } from "./PrintOfficialHeader";
import { OfficialSignatures } from "./OfficialSignatures";

export interface ExtendedStudentEvaluation extends StudentEvaluation {
  test1Score?: number;
  test2Score?: number;
  testAvg?: number;
  continuousMonitoringAvg?: number;
  examScore?: number;
  subjectAverage?: number;
  weightedTotal?: number;
}

interface Props {
  className: string;
  groupName?: string;
  evaluations: (StudentEvaluation | ExtendedStudentEvaluation)[];
  teacherName?: string;
  subjectName?: string;
  schoolName?: string;
  testsCount?: 1 | 2;
  coefficient?: number;
  printMode?: "criteria" | "comprehensive";
}

export function EvaluationRosterPrintDoc({
  className,
  groupName,
  evaluations,
  teacherName = "أستاذ المادة",
  subjectName = "الرياضيات",
  schoolName = "المؤسسة التعليمية",
  testsCount = 1,
  coefficient = 2,
  printMode = "comprehensive",
}: Props) {
  const isComprehensive = printMode === "comprehensive";
  const title = isComprehensive
    ? "كشف تفريغ علامات ومعدلات المادة الفصلية"
    : "بطاقة تنقيط التقويم البيداغوجي المستمر";

  const subtitle = isComprehensive
    ? `قسم: ${className} ${groupName && groupName !== "القسم كامل" ? `(${groupName})` : ""} — مادة: ${subjectName} (معامل: ${coefficient}) — نظام الفروض: (${testsCount === 2 ? "فرضين" : "فرض واحد"})`
    : `كشف تفريغ ومتابعة علامات التقويم المستمر (20/20) — قسم: ${className} ${groupName ? `(${groupName})` : ""}`;

  return (
    <div className="font-sans text-black leading-relaxed" dir="rtl">
      <PrintOfficialHeader
        title={title}
        subtitle={subtitle}
        schoolName={schoolName}
        subjectName={subjectName}
      />

      {isComprehensive ? (
        /* ملخص المعادلة الرسمية لوزارة التربية الوطنية */
        <div className="border border-gray-400 rounded-xl p-2 bg-gray-50 mb-3 text-[10px] flex items-center justify-between text-gray-700">
          <span>
            <strong>معادلة المنشور الوزاري:</strong> معدل المراقبة = (تقويم مستمر + معدل الفروض) ÷ 2
          </span>
          <span>
            <strong>معدل المادة الفصلي:</strong> [معدل المراقبة + (الاختبار × 2)] ÷ 3
          </span>
          <span>
            <strong>المعامل المعتمد:</strong> {coefficient}
          </span>
        </div>
      ) : (
        /* معايير التنقيط المعتمدة في الميثاق التربوي */
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
      )}

      {/* جدول كشف النقاط */}
      <table className="print-table w-full text-right text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100 text-black font-black text-center">
            <th className="border border-black py-1.5 px-1.5 w-8">#</th>
            <th className="border border-black py-1.5 px-3 text-right">اسم ولقب التلميذ(ة)</th>
            
            {isComprehensive ? (
              <>
                <th className="border border-black py-1 px-1.5 w-16">التقويم (20)</th>
                <th className="border border-black py-1 px-1.5 w-16">الفرض 1</th>
                {testsCount === 2 && (
                  <th className="border border-black py-1 px-1.5 w-16">الفرض 2</th>
                )}
                <th className="border border-black py-1 px-1.5 w-16 bg-gray-50">م. الفروض</th>
                <th className="border border-black py-1 px-1.5 w-16 bg-gray-50">م. المراقبة</th>
                <th className="border border-black py-1 px-1.5 w-16">الاختبار (20)</th>
                <th className="border border-black py-1 px-2 w-20 bg-gray-200 text-sm">معدل المادة</th>
                <th className="border border-black py-1 px-2 w-20 bg-gray-100">المعدل × {coefficient}</th>
                <th className="border border-black py-1 px-2">التقدير</th>
              </>
            ) : (
              <>
                <th className="border border-black py-1.5 px-2 w-20">كراس الدروس (5)</th>
                <th className="border border-black py-1.5 px-2 w-20">الواجبات (5)</th>
                <th className="border border-black py-1.5 px-2 w-20">السلوك والأدوات (5)</th>
                <th className="border border-black py-1.5 px-2 w-20">المشاركة (5)</th>
                <th className="border border-black py-1.5 px-2 w-20 bg-gray-200">المجموع (20)</th>
                <th className="border border-black py-1.5 px-2.5">الملاحظة والتقدير</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {evaluations.length === 0 ? (
            <tr>
              <td colSpan={isComprehensive ? (testsCount === 2 ? 11 : 10) : 8} className="border border-black py-6 text-center text-gray-500 font-bold">
                لا توجد تقييمات مسجلة لهذا القسم بعد.
              </td>
            </tr>
          ) : (
            evaluations.map((ev: any, idx) => {
              if (isComprehensive) {
                const cont = ev.totalScore ?? 20;
                const t1 = ev.test1Score ?? cont;
                const t2 = ev.test2Score ?? t1;
                const tAvg = testsCount === 2 ? Math.round(((t1 + t2) / 2) * 10) / 10 : t1;
                const monAvg = Math.round(((cont + tAvg) / 2) * 10) / 10;
                const exam = ev.examScore ?? tAvg;
                const subjAvg = Math.round(((monAvg + (exam * 2)) / 3) * 100) / 100;
                const weighted = Math.round((subjAvg * coefficient) * 100) / 100;

                const ratingText =
                  subjAvg >= 18 ? "ممتاز 🌟" :
                  subjAvg >= 15 ? "جيد جداً" :
                  subjAvg >= 12 ? "جيد" :
                  subjAvg >= 10 ? "متوسط" : "دون المتوسط";

                return (
                  <tr key={ev.id || idx} className="border-b border-black text-center">
                    <td className="border border-black py-1 px-1 font-mono font-bold">{idx + 1}</td>
                    <td className="border border-black py-1 px-2.5 text-right font-black text-gray-900">{ev.studentName}</td>
                    <td className="border border-black py-1 px-1 font-mono">{cont}</td>
                    <td className="border border-black py-1 px-1 font-mono">{t1}</td>
                    {testsCount === 2 && (
                      <td className="border border-black py-1 px-1 font-mono">{t2}</td>
                    )}
                    <td className="border border-black py-1 px-1 font-mono bg-gray-50 font-bold">{tAvg}</td>
                    <td className="border border-black py-1 px-1 font-mono bg-gray-50 font-bold">{monAvg}</td>
                    <td className="border border-black py-1 px-1 font-mono">{exam}</td>
                    <td className="border border-black py-1 px-1.5 font-mono font-black text-sm bg-gray-200">{subjAvg}</td>
                    <td className="border border-black py-1 px-1.5 font-mono font-bold bg-gray-100">{weighted}</td>
                    <td className="border border-black py-1 px-2 text-right text-[10px] text-gray-800">{ratingText}</td>
                  </tr>
                );
              }

              return (
                <tr key={ev.id || idx} className="border-b border-black text-center">
                  <td className="border border-black py-1.5 px-2 font-mono font-bold">{idx + 1}</td>
                  <td className="border border-black py-1.5 px-3 text-right font-black text-gray-900">{ev.studentName}</td>
                  <td className="border border-black py-1.5 px-2 font-mono">{ev.notebookScore}</td>
                  <td className="border border-black py-1.5 px-2 font-mono">{ev.homeworkScore}</td>
                  <td className="border border-black py-1.5 px-2 font-mono">{ev.toolsScore}</td>
                  <td className="border border-black py-1.5 px-2 font-mono">{ev.activityScore}</td>
                  <td className="border border-black py-1.5 px-2 font-mono font-black text-sm bg-gray-100">{ev.totalScore}</td>
                  <td className="border border-black py-1.5 px-2 text-right text-[10px] text-gray-800">
                    {ev.notes || (ev.totalScore >= 16 ? "ممتاز ومواظب" : ev.totalScore >= 12 ? "عمل حسن" : "يحتاج مضاعفة الجهد")}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* التوقيعات الرسمية */}
      <OfficialSignatures
        teacherTitle={`إمضاء الأستاذ(ة): ${teacherName}`}
        principalTitle="تأشيرة ومصادقة السيد مدير المتوسطة"
        showTeacher={true}
        showPrincipal={true}
      />
    </div>
  );
}
