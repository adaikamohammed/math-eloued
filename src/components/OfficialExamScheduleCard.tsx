"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Printer,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SchoolExamItem, PrincipalVisaRecord } from "@/lib/types";
import { PrintModal } from "@/components/print/PrintModal";
import { ExamSchedulePrintDoc } from "@/components/print/ExamSchedulePrintDoc";

interface Props {
  schoolName?: string | null;
  teacherId?: string | null;
  subjectId?: string | null;
}

export function OfficialExamScheduleCard({ schoolName, teacherId, subjectId }: Props) {
  const [exams, setExams] = useState<SchoolExamItem[]>([]);
  const [visas, setVisas] = useState<PrincipalVisaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [resExams, resVisas] = await Promise.all([
          fetch("/api/school-exams"),
          teacherId ? fetch(`/api/principal/visa?teacherId=${teacherId}`) : Promise.resolve(null),
        ]);

        if (resExams.ok) {
          const d = await resExams.json();
          setExams(d.exams || []);
        }

        if (resVisas && resVisas.ok) {
          const v = await resVisas.json();
          setVisas(v.visas || []);
        }
      } catch (err) {
        console.error("Failed to fetch official school exams/visas:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [schoolName, teacherId]);

  const latestVisa = visas.length > 0 ? visas[0] : null;

  return (
    <div className="space-y-3 font-sans text-right" dir="rtl">
      {/* ── 1. بطاقة التأشيرة الإدارية الرسمية إن وجدت ── */}
      {latestVisa && (
        <div className="bg-gradient-to-r from-emerald-50 via-[#e6f4ee] to-teal-50 rounded-2xl p-4 border border-[#107a57]/30 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#107a57] text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-black text-gray-900">
                  تأشيرة ومصادقة إدارة المؤسسة ({latestVisa.principalName || "السيد المدير"})
                </h4>
                <p className="text-[10px] text-gray-500 font-bold">
                  تاريخ التأشيرة الرسمية: {latestVisa.visaDate} • الحالة: مصادق عليه رسمياً ✅
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-white text-[#107a57] px-2.5 py-1 rounded-full border border-[#107a57]/20 shadow-2xs">
              تأشيرة معتمدة
            </span>
          </div>

          {latestVisa.feedbackNote && (
            <div className="bg-white/80 p-2.5 rounded-xl border border-[#d2ebe0] text-xs text-gray-700 leading-relaxed font-medium">
              <p className="font-bold text-gray-900 text-[11px] mb-0.5">توجيه وملاحظة الإدارة:</p>
              <p>{latestVisa.feedbackNote}</p>
            </div>
          )}
        </div>
      )}

      {/* ── 2. بطاقة جدول الفروض الرسمي المعتمد من الإدارة ── */}
      <div className="bg-white rounded-2xl border border-[#e8e8e0] shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-50/50 via-white to-amber-50/30 border-b border-[#e8e8e0] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-black text-gray-900">
                  جدول الفروض الرسمي المعتمد من إدارة المؤسسة
                </h3>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  إلزامي
                </span>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                تحدد إدارة المتوسطة الرزنامة الرسمية للفروض المحروسة ويلتزم بها الأساتذة لتفادي تداخل الواجبات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl transition shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" />
              <span>طباعة الرزنامة</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
              aria-label="طي أو توسيع"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-3.5 sm:p-4">
            {loading ? (
              <p className="text-xs text-gray-500 text-center py-4">جاري جلب رزنامة الفروض...</p>
            ) : exams.length === 0 ? (
              <div className="text-center py-6 space-y-1.5">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs font-bold text-gray-700">لم تنشر إدارة المؤسسة رزنامة الفروض بعد</p>
                <p className="text-[11px] text-gray-500">
                  ستظهر المواعيد المعتمدة هنا فور صدورها من طرف السيد الناظر ومدير المتوسطة.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                      <th className="py-2.5 px-3">المستوى</th>
                      <th className="py-2.5 px-3">المادة</th>
                      <th className="py-2.5 px-3">عنوان الفرض</th>
                      <th className="py-2.5 px-3">اليوم والتاريخ</th>
                      <th className="py-2.5 px-3">التوقيت والقاعة</th>
                      <th className="py-2.5 px-3">تعليمات الإدارة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {exams.map((ex) => (
                      <tr key={ex.id} className="hover:bg-[#fafaf7] transition">
                        <td className="py-2.5 px-3 font-black text-gray-900 whitespace-nowrap">
                          <span className="bg-[#e6f4ee] text-[#107a57] px-2 py-0.5 rounded-lg border border-[#107a57]/20 font-bold text-[11px]">
                            {ex.level} متوسط
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-gray-800 whitespace-nowrap">
                          {ex.subjectName}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-700">{ex.examTitle}</td>
                        <td className="py-2.5 px-3 font-bold text-gray-800 whitespace-nowrap">
                          {ex.dayName} {ex.date}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-mono text-gray-700 font-bold">{ex.timeSlot}</span>
                          {ex.room && (
                            <span className="text-[10px] text-gray-500 mr-1.5">({ex.room})</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 max-w-xs truncate text-[11px]">
                          {ex.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── نافذة المعاينة والطباعة الرسمية A4 ── */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        documentTitle="رزنامة الفروض المحروسة الرسمية للمؤسسة"
      >
        <ExamSchedulePrintDoc
          schoolName={schoolName || "متوسطة ولاية الوادي"}
          semester={1}
          exams={exams}
        />
      </PrintModal>
    </div>
  );
}
