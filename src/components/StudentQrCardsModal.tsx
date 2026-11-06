"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import QRCode from "qrcode";
import {
  Printer,
  X,
  QrCode,
  Download,
  Share2,
  Filter,
  Users,
  Building2,
  GraduationCap,
  Sparkles,
  Scissors,
  CheckCircle2,
  Copy,
  FileDown,
} from "lucide-react";
import { StudentRosterItem } from "@/lib/types";

interface StudentQrCardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentRosterItem[];
  classes: string[];
  activeClass?: string;
  teacherName?: string;
  teacherCode?: string;
  teacherSlug?: string;
  schoolName?: string;
  subjectName?: string;
}

export function StudentQrCardsModal({
  isOpen,
  onClose,
  students,
  classes,
  activeClass = "all",
  teacherName = "الأستاذ(ة)",
  teacherCode = "MTH-101",
  teacherSlug = "",
  schoolName = "المؤسسة التعليمية",
  subjectName = "الرياضيات",
}: StudentQrCardsModalProps) {
  const [selectedClass, setSelectedClass] = useState<string>(activeClass);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [qrCodeMap, setQrCodeMap] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // تحديث القسم الافتراضي عند فتح النافذة
  useEffect(() => {
    if (activeClass && activeClass !== "all") {
      setSelectedClass(activeClass);
    }
  }, [activeClass]);

  // تصفية التلاميذ حسب القسم والفوج الفرعي
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedClass !== "all" && s.className !== selectedClass) return false;
      if (selectedGroup !== "all" && (s.groupName || "فوج 1") !== selectedGroup) return false;
      return true;
    });
  }, [students, selectedClass, selectedGroup]);

  // توليد رموز QR لكافة التلاميذ المصفين بدقة وسرعة
  useEffect(() => {
    if (!isOpen || filteredStudents.length === 0) return;

    let isMounted = true;
    setGenerating(true);

    const origin = typeof window !== "undefined" ? window.location.origin : "https://jusoor-dz.vercel.app";
    const baseSlug = teacherSlug || teacherCode || "math";

    const generateAll = async () => {
      const newMap: Record<string, string> = {};

      for (const student of filteredStudents) {
        // الرابط الذكي: يفتح فضاء الأستاذ مع تمرير القسم واسم التلميذ
        const targetUrl = `${origin}/t/${encodeURIComponent(baseSlug)}?class=${encodeURIComponent(
          student.className
        )}&student=${encodeURIComponent(student.studentName)}`;

        try {
          const dataUrl = await QRCode.toDataURL(targetUrl, {
            width: 320,
            margin: 1,
            color: {
              dark: "#064e3b", // أخضر زمردي عميق وواضح في الطباعة
              light: "#ffffff",
            },
            errorCorrectionLevel: "M",
          });
          newMap[student.id] = dataUrl;
        } catch (e) {
          console.warn("Failed generating QR for student", student.studentName, e);
        }
      }

      if (isMounted) {
        setQrCodeMap((prev) => ({ ...prev, ...newMap }));
        setGenerating(false);
      }
    };

    generateAll();

    return () => {
      isMounted = false;
    };
  }, [isOpen, filteredStudents, teacherSlug, teacherCode]);

  // زر الطباعة / حفظ PDF بتسمية رسمية تلقائية
  const handlePrint = () => {
    const originalTitle = document.title;
    const classLabel = selectedClass === "all" ? "كافة_الأفواج" : `فوج_${selectedClass}`;
    const cleanTeacher = teacherName.replace(/\s+/g, "_");
    document.title = `بطاقات_QR_تلاميذ_${classLabel}_الأستاذ_${cleanTeacher}_منصة_جسور.pdf`;

    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  const copyStudentLink = async (student: StudentRosterItem) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://jusoor-dz.vercel.app";
    const baseSlug = teacherSlug || teacherCode || "math";
    const targetUrl = `${origin}/t/${encodeURIComponent(baseSlug)}?class=${encodeURIComponent(
      student.className
    )}&student=${encodeURIComponent(student.studentName)}`;

    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedId(student.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  if (!isOpen) return null;

  const totalPages = Math.ceil(filteredStudents.length / 8);

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible"
    >
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* ─── الهيدر وأدوات التحكم (مخفي أثناء الطباعة) ─── */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center shadow-sm">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>بطاقات الرمز السريع (QR Cards) للتلاميذ</span>
                <span className="text-[11px] bg-emerald-600 text-white font-bold px-2.5 py-0.5 rounded-full">
                  8 بطاقات في ورقة A4
                </span>
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                جاهزة للطباعة والقص ✂️ ولصقها في كراريس التلاميذ لتمكين الولي من مسح الرمز ومتابعة
                الدروس فوراً.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={generating || filteredStudents.length === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black transition flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>حفظ PDF أو طباعة A4 🖨️</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── شريط الفلترة والإحصائيات (مخفي في الطباعة) ─── */}
        <div className="px-4 sm:px-5 py-3 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0 text-xs font-bold text-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-700" />
              <span>تصفية حسب الفوج:</span>
            </div>

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">كافة الأفواج والأقسام</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  قسم {cls}
                </option>
              ))}
            </select>

            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">كافة الأفواج الفرعية</option>
              <option value="فوج 1">فوج 1 فقط</option>
              <option value="فوج 2">فوج 2 فقط</option>
            </select>
          </div>

          <div className="flex items-center gap-3 text-slate-600">
            <span>
              إجمالي البطاقات: <strong className="text-emerald-800">{filteredStudents.length}</strong> تلميذ
            </span>
            <span>•</span>
            <span>
              عدد أوراق A4 التقريبي: <strong className="text-emerald-800">{totalPages}</strong> ورقة
            </span>
          </div>
        </div>

        {/* ─── مساحة المعاينة والطباعة ─── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/50 print:bg-white print:p-0 print:overflow-visible">
          {generating ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-700">
                جاري توليد بطاقات الـ QR فائقة الدقة للتلاميذ...
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">لا يوجد تلاميذ مسجلون في هذا الفوج.</p>
              <p className="text-xs text-slate-500">
                يرجى إضافة التلاميذ أولاً من جدول الأفواج لتوليد بطاقاتهم.
              </p>
            </div>
          ) : (
            <div className="student-qr-print-sheet grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-[210mm] mx-auto print:max-w-none print:w-full print:gap-2.5 print:grid-cols-2">
              {filteredStudents.map((student, idx) => {
                const qrUrl = qrCodeMap[student.id];

                return (
                  <div
                    key={student.id}
                    className="student-qr-card-item relative bg-white border-2 border-dashed border-emerald-600/70 hover:border-emerald-700 rounded-2xl p-3 sm:p-3.5 shadow-2xs hover:shadow-md transition flex flex-col justify-between break-inside-avoid print:break-inside-avoid print:shadow-none print:border-emerald-800"
                    style={{ minHeight: "64mm" }}
                  >
                    {/* علامة المقص وزوايا القص */}
                    <div className="absolute -top-2.5 right-4 bg-white px-1 text-slate-400 text-[10px] flex items-center gap-0.5 print:text-slate-600 font-mono">
                      <Scissors className="w-3 h-3 text-emerald-700" />
                      <span>قص ✂️</span>
                    </div>

                    {/* زر سريع لنسخ رابط التلميذ (يظهر في الشاشة فقط) */}
                    <div className="absolute top-2 left-2 print:hidden">
                      <button
                        onClick={() => copyStudentLink(student)}
                        title="نسخ رابط متابعة التلميذ لإرساله للولي"
                        className="p-1 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 transition cursor-pointer"
                      >
                        {copiedId === student.id ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* ─── 1. ترويسة البطاقة الرسمية ─── */}
                    <div className="border-b border-emerald-100 pb-1.5 mb-2 text-center space-y-0.5">
                      <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-bold text-slate-500">
                        <span>الجمهورية الجزائرية الديمقراطية الشعبية</span>
                        <span>الموسم: 2026 / 2027</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black text-emerald-900">
                        <span>منصة جسور التعليمية</span>
                        <span className="truncate max-w-[140px]">{schoolName}</span>
                      </div>
                    </div>

                    {/* ─── 2. جسم البطاقة (بيانات التلميذ + رمز QR) ─── */}
                    <div className="flex items-center justify-between gap-2.5">
                      {/* بيانات التلميذ */}
                      <div className="flex-1 min-w-0 space-y-1 text-right">
                        <div>
                          <span className="text-[9px] font-bold text-emerald-800 block">
                            التلميذ(ة):
                          </span>
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                            {student.studentName}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold text-slate-700">
                          <span className="bg-emerald-50 text-emerald-900 px-1.5 py-0.5 rounded-md border border-emerald-200">
                            القسم: {student.className}
                          </span>
                          {student.groupName && (
                            <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded-md border border-slate-200">
                              {student.groupName}
                            </span>
                          )}
                        </div>

                        <div className="text-[9px] text-slate-600 font-bold space-y-0.5">
                          <p className="truncate">
                            الأستاذ(ة): <strong className="text-slate-900">{teacherName}</strong>
                          </p>
                          <p className="truncate">
                            المادة: <strong className="text-emerald-800">{subjectName}</strong>
                          </p>
                          {student.registrationNumber && (
                            <p className="font-mono text-[8px] text-slate-500">
                              رقم: {student.registrationNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* رمز الـ QR المربع */}
                      <div className="shrink-0 flex flex-col items-center justify-center p-1 bg-emerald-50/50 rounded-xl border border-emerald-200/80">
                        {qrUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={qrUrl}
                            alt={`QR ${student.studentName}`}
                            className="w-20 h-20 sm:w-22 sm:h-22 rounded-lg bg-white"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center">
                            <QrCode className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <span className="text-[8px] font-mono font-bold text-emerald-950 mt-0.5">
                          {teacherCode}
                        </span>
                      </div>
                    </div>

                    {/* ─── 3. التوجيه السفلي للولي ─── */}
                    <div className="mt-2 pt-1 border-t border-dashed border-emerald-100 text-[8px] text-slate-500 text-center font-medium leading-tight">
                      امسح الرمز بكاميرا الهاتف لمتابعة كراس الدروس والواجبات اليومية وملاحظات الأستاذ
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── فوتر النافذة (مخفي أثناء الطباعة) ─── */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 print:hidden shrink-0">
          <p className="text-[11px] text-slate-500 font-medium">
            💡 <strong>توجيه بيداغوجي:</strong> بعد الطباعة، يُفضل قص البطاقات وتوزيعها على
            التلاميذ للصقها بالصمغ في الصفحة الأولى من كراس المادة أو تسليمها مباشرة للولي.
          </p>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
}
