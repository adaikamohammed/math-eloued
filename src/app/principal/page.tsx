"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Calendar,
  BookOpen,
  CheckCircle2,
  Clock,
  Printer,
  Plus,
  Trash2,
  Eye,
  ShieldCheck,
  Award,
  AlertTriangle,
  Sparkles,
  Search,
  Filter,
  FileText,
  ChevronDown,
  Layers,
  HeartHandshake,
  School,
  ExternalLink,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { LoginRequired } from "@/components/LoginRequired";
import {
  MIDDLE_SCHOOL_SUBJECTS,
  LEVELS,
  SchoolExamItem,
  PrincipalVisaRecord,
  UserProfile,
  Lesson,
} from "@/lib/types";
import { PrintModal } from "@/components/print/PrintModal";
import { ExamSchedulePrintDoc } from "@/components/print/ExamSchedulePrintDoc";
import { ParentReceptionPrintDoc } from "@/components/print/ParentReceptionPrintDoc";

type PrincipalTab = "teachers" | "exams" | "visas" | "reception" | "honors";

export default function PrincipalPortalPage() {
  const { loading: profileLoading, profile } = useProfile();

  const [activeTab, setActiveTab] = useState<PrincipalTab>("teachers");
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [exams, setExams] = useState<SchoolExamItem[]>([]);
  const [visas, setVisas] = useState<PrincipalVisaRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [printDoc, setPrintDoc] = useState<"exams" | "reception" | null>(null);

  // الفلاتر والبحث
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [examLevelFilter, setExamLevelFilter] = useState<number>(0); // 0 = الكل
  const [examSemesterFilter, setExamSemesterFilter] = useState<number>(1);

  // نافذة إضافة فرض رسمي جديد
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [newExam, setNewExam] = useState<Partial<SchoolExamItem>>({
    level: 1,
    semester: 1,
    subjectId: "mathematics",
    subjectName: "الرياضيات",
    examTitle: "الفرض الأول المحروس",
    date: new Date().toISOString().split("T")[0],
    dayName: "الأحد",
    timeSlot: "08:00 - 09:00",
    room: "حسب التوزيع",
    notes: "يمنع استعمال الآلة الحاسبة البيانية، يرجى إحضار الأدوات الهندسية",
    isPublished: true,
  });

  // نافذة وضع التأشيرة الإدارية
  const [showVisaModal, setShowVisaModal] = useState(false);
  const [selectedTeacherForVisa, setSelectedTeacherForVisa] = useState<UserProfile | null>(null);
  const [visaForm, setVisaForm] = useState({
    visaType: "cahier_textes" as "cahier_textes" | "cahier_journalier" | "general",
    feedbackNote: "اطّلع عليه وأُشر. عمل منتظم ومواظبة بيداغوجية مشكورة، نثمن حرصكم على توثيق السبورات والأنشطة.",
    status: "approved" as "approved" | "needs_attention",
  });
  const [submittingVisa, setSubmittingVisa] = useState(false);

  // اسم المتوسطة والمدير
  const schoolName = profile?.school_custom_name || "متوسطة ولاية الوادي";
  const principalName = profile?.full_name || "السيد مدير المتوسطة";

  // جلب بيانات الأساتذة والفروض والتأشيرات
  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      // 1. جلب أساتذة المتوسطة
      const { data: teachersData } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "teacher")
        .order("full_name");

      if (teachersData) {
        // نفلتر بأساتذة هذه المتوسطة إن توفر اسم للمؤسسة، أو نعرض الجميع للنسخة التجريبية
        const currentSchool = profile?.school_custom_name?.trim().toLowerCase();
        let filteredTeachers = teachersData;
        if (currentSchool && !currentSchool.includes("جميع")) {
          const matched = teachersData.filter(
            (t) => (t.school_custom_name || "").trim().toLowerCase() === currentSchool
          );
          if (matched.length > 0) filteredTeachers = matched;
        }
        setTeachers(filteredTeachers);
      }

      // 2. جلب الفروض الرسمية
      const resExams = await fetch(`/api/school-exams?semester=${examSemesterFilter}`);
      if (resExams.ok) {
        const d = await resExams.json();
        setExams(d.exams || []);
      }

      // 3. جلب التأشيرات الإدارية
      const resVisas = await fetch(`/api/principal/visa`);
      if (resVisas.ok) {
        const d = await resVisas.json();
        setVisas(d.visas || []);
      }
    } catch (err) {
      console.error("Error loading principal data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [profile, examSemesterFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // إضافة فرض رسمي جديد
  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExam.date || !newExam.subjectName) return;

    try {
      const res = await fetch("/api/school-exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam: newExam }),
      });
      if (res.ok) {
        setShowAddExamModal(false);
        loadData();
      } else {
        alert("فشل حفظ الفرض، يرجى المحاولة مرة أخرى");
      }
    } catch (err) {
      console.error("Failed to save exam:", err);
    }
  };

  // حذف فرض
  const handleDeleteExam = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الفرض من الجدول الرسمي للمؤسسة؟")) return;
    try {
      const res = await fetch(`/api/school-exams?id=${id}`, { method: "DELETE" });
      if (res.ok) loadData();
    } catch (err) {
      console.error("Failed to delete exam:", err);
    }
  };

  // حفظ التأشيرة الإدارية
  const handleSaveVisa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForVisa) return;
    setSubmittingVisa(true);

    try {
      const res = await fetch("/api/principal/visa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: selectedTeacherForVisa.id,
          teacherName: selectedTeacherForVisa.full_name,
          visaType: visaForm.visaType,
          feedbackNote: visaForm.feedbackNote,
          status: visaForm.status,
        }),
      });

      if (res.ok) {
        setShowVisaModal(false);
        setSelectedTeacherForVisa(null);
        alert("تم تسجيل التأشيرة الإدارية والمصادقة على كراس الأستاذ بنجاح ✅");
        loadData();
      } else {
        alert("فشل تسجيل التأشيرة");
      }
    } catch (err) {
      console.error("Failed to save visa:", err);
    } finally {
      setSubmittingVisa(false);
    }
  };

  // تصفية الأساتذة
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchSubject = subjectFilter === "all" || t.subject === subjectFilter;
      const matchSearch =
        !searchQuery.trim() ||
        (t.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.teacher_code || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchSubject && matchSearch;
    });
  }, [teachers, subjectFilter, searchQuery]);

  // تصفية الفروض
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      const matchLevel = examLevelFilter === 0 || e.level === examLevelFilter;
      return matchLevel;
    });
  }, [exams, examLevelFilter]);

  if (profileLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-sans" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#107a57] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 font-bold">جاري تحميل فضاء إدارة المؤسسة...</p>
        </div>
      </div>
    );
  }

  // إذا لم يكن مسجلاً
  if (!profile) {
    return <LoginRequired next="/principal" title="فضاء إدارة المؤسسة — مدير المتوسطة" />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] text-right font-sans pb-16" dir="rtl">
      {/* ── الرأس الرسمي للمؤسسة التعليمية ── */}
      <div className="bg-white border-b border-[#e8e8e0] px-4 sm:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#e6f4ee] text-[#107a57] flex items-center justify-center shadow-inner shrink-0">
                <School className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-[#107a57]/10 text-[#107a57] px-2.5 py-0.5 rounded-full border border-[#107a57]/20">
                    فضاء الإدارة التربوية للمؤسسة
                  </span>
                  <span className="text-[10px] font-bold text-gray-500">
                    الجمهورية الجزائرية الديمقراطية الشعبية
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                  {schoolName}
                </h1>
                <p className="text-xs text-gray-600 font-medium">
                  لوحة المتابعة الإدارية والبيداغوجية الشاملة • إشراف: {principalName}
                </p>
              </div>
            </div>

            {/* أزرار الإجراءات السريعة */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setPrintDoc("exams")}
                className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-2xs w-full sm:w-auto justify-center"
              >
                <Printer className="w-4 h-4 text-gray-600" />
                <span>طباعة التقرير العام</span>
              </button>
              <button
                onClick={() => setShowAddExamModal(true)}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                <span>برمجة فرض رسمي</span>
              </button>
            </div>
          </div>

          {/* بطاقات الإحصائيات الفورية */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-[#f8f9fa] rounded-2xl p-3.5 border border-[#e8e8e0]">
              <div className="flex items-center gap-2 text-gray-500 text-[11px] font-bold">
                <Users className="w-3.5 h-3.5 text-[#107a57]" />
                <span>أساتذة المؤسسة</span>
              </div>
              <p className="text-lg font-black text-gray-900 mt-1">{teachers.length} أستاذ(ة)</p>
            </div>

            <div className="bg-[#f8f9fa] rounded-2xl p-3.5 border border-[#e8e8e0]">
              <div className="flex items-center gap-2 text-gray-500 text-[11px] font-bold">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>فروض الفصل المعتمدة</span>
              </div>
              <p className="text-lg font-black text-gray-900 mt-1">{exams.length} فرض مبرمج</p>
            </div>

            <div className="bg-[#f8f9fa] rounded-2xl p-3.5 border border-[#e8e8e0]">
              <div className="flex items-center gap-2 text-gray-500 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>التأشيرات الإدارية</span>
              </div>
              <p className="text-lg font-black text-gray-900 mt-1">{visas.length} تأشيرة موثقة</p>
            </div>

            <div className="bg-[#f8f9fa] rounded-2xl p-3.5 border border-[#e8e8e0]">
              <div className="flex items-center gap-2 text-gray-500 text-[11px] font-bold">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>المواد المغطاة</span>
              </div>
              <p className="text-lg font-black text-gray-900 mt-1">
                {new Set(teachers.map((t) => t.subject || "math")).size} مواد تعليمية
              </p>
            </div>
          </div>

          {/* شريط التبويبات الرئيسي */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-gray-100 no-scrollbar">
            <button
              onClick={() => setActiveTab("teachers")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shrink-0 ${
                activeTab === "teachers"
                  ? "bg-[#107a57] text-white shadow-2xs"
                  : "bg-white text-gray-600 hover:text-gray-900 border border-[#e8e8e0]"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>أساتذة المؤسسة والأطقم التربوية ({teachers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("exams")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shrink-0 ${
                activeTab === "exams"
                  ? "bg-[#107a57] text-white shadow-2xs"
                  : "bg-white text-gray-600 hover:text-gray-900 border border-[#e8e8e0]"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>جدول الفروض الرسمي المعتمد ({exams.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("visas")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shrink-0 ${
                activeTab === "visas"
                  ? "bg-[#107a57] text-white shadow-2xs"
                  : "bg-white text-gray-600 hover:text-gray-900 border border-[#e8e8e0]"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>سجل التأشيرات الإدارية والمصادقة ({visas.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("reception")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shrink-0 ${
                activeTab === "reception"
                  ? "bg-[#107a57] text-white shadow-2xs"
                  : "bg-white text-gray-600 hover:text-gray-900 border border-[#e8e8e0]"
              }`}
            >
              <HeartHandshake className="w-4 h-4" />
              <span>دليل استقبال الأولياء الموحد</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── محتوى التبويبات ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* ========================================================= */}
        {/* التبويب 1: أساتذة المؤسسة والأطقم البيداغوجية */}
        {/* ========================================================= */}
        {activeTab === "teachers" && (
          <div className="space-y-4">
            {/* شريط البحث وتصفية المادة */}
            <div className="bg-white rounded-2xl p-4 border border-[#e8e8e0] shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو كود الأستاذ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 text-xs bg-[#f8f9fa] border border-[#e8e8e0] rounded-xl focus:bg-white focus:border-[#107a57] focus:outline-hidden transition"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] font-bold text-gray-500 shrink-0">المادة:</span>
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="text-xs bg-[#f8f9fa] border border-[#e8e8e0] rounded-xl px-3 py-2 font-bold text-gray-700 focus:outline-hidden"
                >
                  <option value="all">كل المواد التعليمية</option>
                  {MIDDLE_SCHOOL_SUBJECTS.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.icon} {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* بطاقات الأساتذة */}
            {filteredTeachers.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#e8e8e0] space-y-3">
                <Users className="w-10 h-10 text-gray-300 mx-auto" />
                <h3 className="text-sm font-black text-gray-800">لا يوجد أساتذة مطابقين للبحث</h3>
                <p className="text-xs text-gray-500">
                  يمكن للأساتذة التسجيل واختيار "{schoolName}" لربط حساباتهم تلقائياً بهذا الفضاء.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeachers.map((t) => {
                  const subjectMeta = MIDDLE_SCHOOL_SUBJECTS.find((s) => s.id === t.subject);
                  const teacherVisas = visas.filter((v) => v.teacherId === t.id);

                  return (
                    <div
                      key={t.id}
                      className="bg-white rounded-3xl p-5 border border-[#e8e8e0] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-[#e6f4ee] text-[#107a57] flex items-center justify-center font-black text-sm shrink-0 border border-[#107a57]/20">
                              {t.full_name?.charAt(0) || "أ"}
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-gray-900 leading-tight">
                                {t.full_name}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1">
                                  <span>{subjectMeta?.icon || "📐"}</span>
                                  <span>{subjectMeta?.name || "الرياضيات"}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {t.teacher_code && (
                            <span className="text-[10px] font-mono font-bold bg-[#f4f4f0] text-gray-700 px-2 py-0.5 rounded-lg border border-[#e0e0d8]">
                              {t.teacher_code}
                            </span>
                          )}
                        </div>

                        {/* معلومات المستويات والاستقبال */}
                        <div className="p-3 rounded-2xl bg-[#fafaf7] border border-[#e8e8e0] space-y-1.5 text-[11px] text-gray-600">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">المستويات المسندة:</span>
                            <span className="font-bold text-gray-800">
                              {t.levels_taught && t.levels_taught.length > 0
                                ? t.levels_taught.map((l) => `${l}م`).join("، ")
                                : "جميع المستويات"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">استقبال الأولياء:</span>
                            <span className="font-bold text-[#107a57]">
                              {t.reception?.officialDay
                                ? `${t.reception.officialDay} (${t.reception.officialTime || "صباحاً"})`
                                : "غير محدد بعد"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                            <span className="text-gray-500">التأشيرات الممنوحة:</span>
                            <span className="font-bold text-gray-800">
                              {teacherVisas.length > 0
                                ? `${teacherVisas.length} تأشيرة مصادق عليها ✅`
                                : "لا توجد تأشيرة بعد"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* أزرار الإجراءات */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <Link
                          href={`/?teacher=${t.id}`}
                          target="_blank"
                          className="flex-1 text-center py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-[#e8e8e0]"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-500" />
                          <span>معاينة الكراس</span>
                        </Link>

                        <button
                          onClick={() => {
                            setSelectedTeacherForVisa(t);
                            setShowVisaModal(true);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#107a57] hover:bg-[#0a5c40] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>وضع التأشيرة</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* التبويب 2: جدول الفروض الرسمي المعتمد */}
        {/* ========================================================= */}
        {activeTab === "exams" && (
          <div className="space-y-5">
            {/* بطاقة التنبيه الإلزامية */}
            <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200/80 flex items-start gap-3.5 text-xs text-amber-900 leading-relaxed font-medium">
              <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-black text-amber-950 text-sm">
                  رزنامة الفروض الرسمية المعتمدة من طرف إدارة المؤسسة
                </h4>
                <p className="mt-0.5 text-amber-800">
                  تحديد جدول الفروض يقع تحت المسؤولية التنظيمية لمدير المتوسطة والناظر، ويلتزم به كافة أساتذة وتلاميذ المؤسسة. تظهر هذه الرزنامة تلقائياً في حسابات الأساتذة وأولياء التلاميذ بحسب مستوياتهم منعاً لتداخل الفروض أو إرهاق التلاميذ.
                </p>
              </div>
            </div>

            {/* أدوات التصفية والطباعة */}
            <div className="bg-white rounded-2xl p-4 border border-[#e8e8e0] shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-bold text-gray-500">المستوى:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setExamLevelFilter(0)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      examLevelFilter === 0
                        ? "bg-[#107a57] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    الكل
                  </button>
                  {[1, 2, 3, 4].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setExamLevelFilter(lvl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        examLevelFilter === lvl
                          ? "bg-[#107a57] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {lvl} متوسط
                    </button>
                  ))}
                </div>

                <span className="text-gray-300 mx-1">|</span>

                <span className="text-xs font-bold text-gray-500">الفصل:</span>
                <select
                  value={examSemesterFilter}
                  onChange={(e) => setExamSemesterFilter(Number(e.target.value))}
                  className="text-xs bg-[#f8f9fa] border border-[#e8e8e0] rounded-lg px-2.5 py-1.5 font-bold text-gray-700"
                >
                  <option value={1}>الفصل الأول</option>
                  <option value={2}>الفصل الثاني</option>
                  <option value={3}>الفصل الثالث</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintDoc("exams")}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة جدول الفروض</span>
                </button>
                <button
                  onClick={() => setShowAddExamModal(true)}
                  className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة فرض للرزنامة</span>
                </button>
              </div>
            </div>

            {/* جدول الفروض المحروسة بتنسيق رسمي راقٍ */}
            {filteredExams.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#e8e8e0] space-y-3">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto" />
                <h3 className="text-sm font-black text-gray-800">
                  لم يتم ضبط جدول الفروض لهذا الفصل بعد
                </h3>
                <p className="text-xs text-gray-500">
                  انقر على "إضافة فرض للرزنامة" لبرمجة أول فرض رسمي للمتوسطة.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#e8e8e0] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-[#f8f9fa] text-gray-600 font-bold border-b border-[#e8e8e0]">
                        <th className="py-3 px-4">المستوى</th>
                        <th className="py-3 px-4">المادة التعليمية</th>
                        <th className="py-3 px-4">عنوان الفرض</th>
                        <th className="py-3 px-4">اليوم والتاريخ</th>
                        <th className="py-3 px-4">التوقيت والقاعة</th>
                        <th className="py-3 px-4">تعليمات وملاحظات الإدارة</th>
                        <th className="py-3 px-4 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredExams.map((exam) => (
                        <tr key={exam.id} className="hover:bg-[#fafaf7] transition">
                          <td className="py-3.5 px-4 font-black text-gray-900 whitespace-nowrap">
                            <span className="bg-[#e6f4ee] text-[#107a57] px-2.5 py-1 rounded-lg border border-[#107a57]/20 font-bold">
                              {exam.level} متوسط
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-gray-800 whitespace-nowrap">
                            {exam.subjectName}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-gray-700">
                            {exam.examTitle}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-gray-800 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-500">{exam.dayName}</span>
                              <span className="font-mono text-gray-900">{exam.date}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <span className="font-mono font-bold text-gray-800">{exam.timeSlot}</span>
                              {exam.room && (
                                <p className="text-[10px] text-gray-500 font-medium">{exam.room}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">
                            {exam.notes || "—"}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteExam(exam.id)}
                              className="w-8 h-8 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition flex items-center justify-center mx-auto"
                              title="حذف من الرزنامة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* التبويب 3: سجل التأشيرات والمصادقات الإدارية */}
        {/* ========================================================= */}
        {activeTab === "visas" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-[#e8e8e0] shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#e6f4ee] text-[#107a57] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    أرشيف التأشيرات الإدارية والمصادقة على الكراريس
                  </h3>
                  <p className="text-xs text-gray-500">
                    سجل التأشيرات الرقمية التي وضعتها إدارة المؤسسة لكافة الأساتذة مع الملاحظات التوجيهية الرسمية
                  </p>
                </div>
              </div>
            </div>

            {visas.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#e8e8e0] space-y-3">
                <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto" />
                <h3 className="text-sm font-black text-gray-800">لا توجد تأشيرات مسجلة بعد</h3>
                <p className="text-xs text-gray-500">
                  انتقل لتبويب الأساتذة وانقر على "وضع التأشيرة" لأي أستاذ لتوثيق المصادقة على كراسه.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visas.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white rounded-2xl p-5 border border-[#e8e8e0] shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <h4 className="font-black text-gray-900 text-sm">
                          تأشيرة الأستاذ: {v.teacherName}
                        </h4>
                        <span className="text-[10px] font-bold bg-[#e6f4ee] text-[#107a57] px-2 py-0.5 rounded-full border border-[#107a57]/20">
                          {v.visaType === "cahier_textes"
                            ? "كراس الدروس والنصوص"
                            : v.visaType === "cahier_journalier"
                            ? "الدفتر اليومي"
                            : "معاينة عامة"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="font-bold text-gray-700">بتاريخ: {v.visaDate}</span>
                        <span>•</span>
                        <span>المؤشر: {v.principalName}</span>
                      </div>
                    </div>

                    {v.feedbackNote && (
                      <div className="p-3.5 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-700 leading-relaxed font-medium">
                        <p className="font-bold text-gray-900 mb-1">ملاحظة وتوجيه السيد المدير:</p>
                        <p>{v.feedbackNote}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* التبويب 4: دليل استقبال الأولياء الموحد للمتوسطة */}
        {/* ========================================================= */}
        {activeTab === "reception" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-[#e8e8e0] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-gray-900">
                  دليل استقبال أولياء التلاميذ الموحد للمتوسطة
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  جدول شامل يجمع مواعيد ويوم استقبال كل أستاذ في المؤسسة، جاهز للطباعة والتعليق عند مدخل المؤسسة
                </p>
              </div>

              <button
                onClick={() => setPrintDoc("reception")}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الدليل للتعليق 🖨️</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-[#e8e8e0] overflow-hidden shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#f8f9fa] text-gray-700 font-bold border-b border-[#e8e8e0]">
                    <th className="py-3 px-4">الأستاذ(ة)</th>
                    <th className="py-3 px-4">المادة</th>
                    <th className="py-3 px-4">اليوم الرسمي</th>
                    <th className="py-3 px-4">التوقيت</th>
                    <th className="py-3 px-4">القاعة / المكان</th>
                    <th className="py-3 px-4">توجيهات لولي الأمر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teachers.map((t) => {
                    const r = t.reception;
                    const subjectMeta = MIDDLE_SCHOOL_SUBJECTS.find((s) => s.id === t.subject);
                    return (
                      <tr key={t.id} className="hover:bg-[#fafaf7] transition">
                        <td className="py-3.5 px-4 font-black text-gray-900">{t.full_name}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-700">
                          {subjectMeta?.name || "الرياضيات"}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#107a57]">
                          {r?.officialDay || "غير محدد"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-800">
                          {r?.officialTime || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">{r?.location || "قاعة الأساتذة"}</td>
                        <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate">
                          {r?.guidance || "يرجى إحضار كراس التلميذ لمناقشة النتائج"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── نافذة (Modal) إضافة فرض رسمي جديد ── */}
      {showAddExamModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#e8e8e0] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#107a57]" />
                <span>برمجة فرض رسمي في الرزنامة</span>
              </h3>
              <button
                onClick={() => setShowAddExamModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">المستوى الدراسي *</label>
                  <select
                    value={newExam.level}
                    onChange={(e) =>
                      setNewExam({ ...newExam, level: Number(e.target.value) as 1 | 2 | 3 | 4 })
                    }
                    className="w-full bg-[#f8f9fa] border border-[#e8e8e0] rounded-xl px-3 py-2 font-bold"
                  >
                    <option value={1}>السنة الأولى متوسط</option>
                    <option value={2}>السنة الثانية متوسط</option>
                    <option value={3}>السنة الثالثة متوسط</option>
                    <option value={4}>السنة الرابعة متوسط</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">المادة التعليمية *</label>
                  <select
                    value={newExam.subjectId}
                    onChange={(e) => {
                      const sel = MIDDLE_SCHOOL_SUBJECTS.find((s) => s.id === e.target.value);
                      setNewExam({
                        ...newExam,
                        subjectId: e.target.value,
                        subjectName: sel?.name || "المادة",
                      });
                    }}
                    className="w-full bg-[#f8f9fa] border border-[#e8e8e0] rounded-xl px-3 py-2 font-bold"
                  >
                    {MIDDLE_SCHOOL_SUBJECTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">عنوان الفرض *</label>
                <input
                  type="text"
                  value={newExam.examTitle}
                  onChange={(e) => setNewExam({ ...newExam, examTitle: e.target.value })}
                  placeholder="مثال: الفرض الأول المحروس للفصل الأول"
                  className="w-full bg-[#f8f9fa] border border-[#e8e8e0] rounded-xl px-3 py-2 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">التاريخ *</label>
                  <input
                    type="date"
                    value={newExam.date}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
                      setNewExam({
                        ...newExam,
                        date: e.target.value,
                        dayName: days[d.getDay()] || "الأحد",
                      });
                    }}
                    className="w-full bg-[#f8f9fa] border border-[#e8e8e0] rounded-xl px-3 py-2 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">التوقيت *</label>
                  <input
                    type="text"
                    value={newExam.timeSlot}
                    onChange={(e) => setNewExam({ ...newExam, timeSlot: e.target.value })}
                    placeholder="08:00 - 09:00"
                    className="w-full bg-[#f8f9fa] border border-[#e8e8e0] rounded-xl px-3 py-2 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">القاعة أو مكان الإجراء</label>
                <input
                  type="text"
                  value={newExam.room}
                  onChange={(e) => setNewExam({ ...newExam, room: e.target.value })}
                  placeholder="مثال: القاعة 01 أو حسب التوزيع"
                  className="w-full bg-[#f8f9fa] border border-[#e8e8e0] rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  تعليمات وتوجيهات الإدارة للأساتذة والتلاميذ
                </label>
                <textarea
                  value={newExam.notes}
                  onChange={(e) => setNewExam({ ...newExam, notes: e.target.value })}
                  rows={2}
                  placeholder="مثال: يمنع استعمال الآلة الحاسبة، إحضار الأدوات الهندسية..."
                  className="w-full bg-[#f8f9fa] border border-[#e8e8e0] rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddExamModal(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  إلغاء
                </button>
                <button type="submit" className="btn-primary text-xs py-2 px-5 shadow-sm">
                  اعتماد ونشر في الرزنامة الرسمية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── نافذة (Modal) وضع التأشيرة الإدارية ── */}
      {showVisaModal && selectedTeacherForVisa && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#e8e8e0] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#107a57]" />
                <span>التأشيرة الإدارية الرسمية للسيد المدير</span>
              </h3>
              <button
                onClick={() => {
                  setShowVisaModal(false);
                  setSelectedTeacherForVisa(null);
                }}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#e6f4ee] border border-[#107a57]/20 text-xs text-gray-800">
              <p className="font-bold text-[#107a57]">الأستاذ المعني بالتأشيرة:</p>
              <p className="font-black text-gray-900 text-sm mt-0.5">
                {selectedTeacherForVisa.full_name}
              </p>
            </div>

            <form onSubmit={handleSaveVisa} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">نوع الوثيقة المؤشر عليها</label>
                <select
                  value={visaForm.visaType}
                  onChange={(e) =>
                    setVisaForm({
                      ...visaForm,
                      visaType: e.target.value as "cahier_textes" | "cahier_journalier" | "general",
                    })
                  }
                  className="w-full bg-[#f8f9fa] border border-[#e8e8e0] rounded-xl px-3 py-2 font-bold"
                >
                  <option value="cahier_textes">كراس الدروس والنصوص الرقمي</option>
                  <option value="cahier_journalier">الدفتر اليومي وسير الحصص</option>
                  <option value="general">معاينة شاملة وتدرج التعلمات</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  الملاحظة والتوجيه الإداري للأستاذ
                </label>
                <textarea
                  value={visaForm.feedbackNote}
                  onChange={(e) => setVisaForm({ ...visaForm, feedbackNote: e.target.value })}
                  rows={4}
                  className="w-full bg-[#f8f9fa] border border-[#e8e8e0] rounded-xl px-3 py-2.5 font-medium leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowVisaModal(false);
                    setSelectedTeacherForVisa(null);
                  }}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingVisa}
                  className="btn-primary text-xs py-2 px-5 shadow-sm"
                >
                  {submittingVisa ? "جاري المصادقة..." : "ختم وتأكيد التأشيرة الإدارية ✅"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── نافذة المعاينة والطباعة الإدارية الرسمية A4 ── */}
      <PrintModal
        isOpen={Boolean(printDoc)}
        onClose={() => setPrintDoc(null)}
        documentTitle={
          printDoc === "exams"
            ? "رزنامة الفروض المحروسة الرسمية للمتوسطة"
            : "دليل استقبال أولياء التلاميذ الموحد"
        }
      >
        {printDoc === "exams" && (
          <ExamSchedulePrintDoc
            schoolName={schoolName}
            semester={examSemesterFilter}
            exams={filteredExams}
            levelFilter={examLevelFilter || undefined}
          />
        )}
        {printDoc === "reception" && (
          <ParentReceptionPrintDoc schoolName={schoolName} teachers={teachers} />
        )}
      </PrintModal>
    </div>
  );
}
