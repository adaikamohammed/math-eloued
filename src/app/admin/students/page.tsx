"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Pencil,
  Trash2,
  Phone,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  ArrowRight,
  Sparkles,
  School,
  GraduationCap,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { PageExplainer } from "@/components/PageExplainer";
import { StudentRosterItem, LessonsData } from "@/lib/types";

export default function StudentsManagementPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // بيانات الأستاذ والتلاميذ
  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentRosterItem[]>([]);

  // الفلاتر والبحث
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // نوافذ إضافة وتعديل
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRosterItem | null>(null);

  // بيانات استمارة التلميذ
  const [formName, setFormName] = useState("");
  const [formClass, setFormClass] = useState("");
  const [formRegNum, setFormRegNum] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGender, setFormGender] = useState<"ذكر" | "أنثى">("ذكر");
  const [formNotes, setFormNotes] = useState("");

  // بيانات إضافة فوج جديد
  const [newClassName, setNewClassName] = useState("");

  // التحقق من الجلسة
  useEffect(() => {
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => {
        setAuthenticated(data.authenticated === true);
      })
      .catch(() => setAuthenticated(false));
  }, []);

  // تحميل البيانات
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/lessons");
      if (!res.ok) throw new Error("تعذر تحميل البيانات");
      const data: LessonsData = await res.json();
      
      const teacherClasses = Array.isArray(data.customClasses) && data.customClasses.length > 0
        ? data.customClasses
        : [];
      setCustomClasses(teacherClasses);

      if (Array.isArray(data.studentRoster)) {
        setStudents(data.studentRoster);
      } else if (Array.isArray(data.evaluations) && data.evaluations.length > 0) {
        // إذا لم تكن هناك قائمة roster، استخراجها من evaluations
        const initialRoster: StudentRosterItem[] = data.evaluations.map((ev) => ({
          id: ev.id,
          studentName: ev.studentName,
          className: ev.className,
          groupName: ev.groupName || "القسم كامل",
          createdAt: ev.updatedAt || new Date().toISOString(),
        }));
        setStudents(initialRoster);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "err", text: err.message || "حدث خطأ أثناء تحميل التلاميذ" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadData();
    }
  }, [authenticated, loadData]);

  // حفظ البيانات
  const persistChanges = async (newStudents: StudentRosterItem[], newClasses: string[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentRoster: newStudents,
          customClasses: newClasses,
        }),
      });
      if (!res.ok) throw new Error("فشل حفظ التعديلات");
      setMessage({ type: "ok", text: "تم حفظ التعديلات بنجاح ✨" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "err", text: err.message || "حدث خطأ أثناء الحفظ" });
    } finally {
      setSaving(false);
    }
  };

  // فتح نافذة تلميذ جديد
  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setFormName("");
    setFormClass(selectedClass !== "all" ? selectedClass : customClasses[0] || "");
    setFormRegNum("");
    setFormPhone("");
    setFormGender("ذكر");
    setFormNotes("");
    setIsStudentModalOpen(true);
  };

  // فتح نافذة تعديل تلميذ
  const handleOpenEditStudent = (st: StudentRosterItem) => {
    setEditingStudent(st);
    setFormName(st.studentName);
    setFormClass(st.className);
    setFormRegNum(st.registrationNumber || "");
    setFormPhone(st.parentPhone || "");
    setFormGender(st.gender || "ذكر");
    setFormNotes(st.notes || "");
    setIsStudentModalOpen(true);
  };

  // حفظ تلميذ (إضافة أو تعديل)
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName || !formClass) {
      setMessage({ type: "err", text: "يرجى إدخال اسم التلميذ وتحديد الفوج" });
      return;
    }

    let updated: StudentRosterItem[];
    if (editingStudent) {
      updated = students.map((s) =>
        s.id === editingStudent.id
          ? {
              ...s,
              studentName: cleanName,
              className: formClass,
              registrationNumber: formRegNum.trim() || undefined,
              parentPhone: formPhone.trim() || undefined,
              gender: formGender,
              notes: formNotes.trim() || undefined,
            }
          : s
      );
    } else {
      const newSt: StudentRosterItem = {
        id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        studentName: cleanName,
        className: formClass,
        registrationNumber: formRegNum.trim() || undefined,
        parentPhone: formPhone.trim() || undefined,
        gender: formGender,
        notes: formNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      updated = [...students, newSt];
    }

    setStudents(updated);
    setIsStudentModalOpen(false);
    await persistChanges(updated, customClasses);
  };

  // حذف تلميذ
  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف التلميذ "${name}" من القائمة؟`)) return;
    const updated = students.filter((s) => s.id !== id);
    setStudents(updated);
    await persistChanges(updated, customClasses);
  };

  // إضافة فوج جديد
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanClass = newClassName.trim().replace(/\s+/g, "");
    if (!cleanClass) return;
    if (customClasses.includes(cleanClass)) {
      setMessage({ type: "err", text: "هذا الفوج مضاف مسبقاً" });
      return;
    }
    const updatedClasses = [...customClasses, cleanClass];
    setCustomClasses(updatedClasses);
    setNewClassName("");
    setIsClassModalOpen(false);
    await persistChanges(students, updatedClasses);
  };

  // حذف فوج
  const handleDeleteClass = async (clsToDelete: string) => {
    const studentCountInClass = students.filter((s) => s.className === clsToDelete).length;
    if (
      !confirm(
        `هل تريد حذف الفوج "${clsToDelete}"؟ ${
          studentCountInClass > 0 ? `(يوجد ${studentCountInClass} تلميذ مسجل في هذا الفوج)` : ""
        }`
      )
    )
      return;

    const updatedClasses = customClasses.filter((c) => c !== clsToDelete);
    setCustomClasses(updatedClasses);
    if (selectedClass === clsToDelete) setSelectedClass("all");
    await persistChanges(students, updatedClasses);
  };

  // فلترة وترتيب التلاميذ أبجدياً
  const filteredAndSortedStudents = useMemo(() => {
    return students
      .filter((s) => {
        // فلترة الفوج
        if (selectedClass !== "all" && s.className !== selectedClass) return false;
        // فلترة البحث
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchName = s.studentName.toLowerCase().includes(q);
          const matchReg = (s.registrationNumber || "").toLowerCase().includes(q);
          const matchClass = s.className.toLowerCase().includes(q);
          return matchName || matchReg || matchClass;
        }
        return true;
      })
      .sort((a, b) => {
        // ترتيب أبجدي عربي سليم
        const comparison = a.studentName.localeCompare(b.studentName, "ar");
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [students, selectedClass, searchQuery, sortDirection]);

  if (authenticated === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#107a57]" />
      </div>
    );
  }

  if (authenticated === false) {
    return <LoginRequired next="/admin/students" title="إدارة الأفواج والتلاميذ" />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] py-6 sm:py-8 px-4 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* شريط المسار والتنقل */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <Link href="/admin" className="hover:text-gray-900 transition flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              لوحة الأستاذ
            </Link>
            <span>/</span>
            <span className="text-gray-900">إدارة الأفواج والتلاميذ</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl border border-[#e8e8e0] bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" />
              <span>طباعة القائمة</span>
            </button>
            <button
              onClick={() => setIsClassModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-[#e8e8e0] bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-[#107a57]" />
              <span>إدارة الأفواج</span>
            </button>
            <button
              onClick={handleOpenAddStudent}
              className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>إضافة تلميذ</span>
            </button>
          </div>
        </div>

        {/* دليل الصفحة البيداغوجي */}
        <PageExplainer
          pageId="students"
          title="إدارة الأفواج والتلاميذ"
          teacherRoleExplanation="هنا تضيف أقسامك التربوية الفعلية (مثل 1م3، 2م5) وتدون أسماء تلاميذك مع الترتيب الأبجدي الآلي وطباعة القوائم بضغطة زر واحدة."
          parentRoleExplanation="يضمن خصوصية تامة؛ لا يطلع أي ولي على أسماء أو بيانات التلاميذ الآخرين في الفوج."
          inspectorExplanation="يطلع المفتش البيداغوجي على إسناد الأفواج وتعداد التلاميذ لمطابقة التنظيم التربوي الرسمي."
        />

        {/* تنبيهات النجاح أو الخطأ */}
        {message && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in duration-200 ${
              message.type === "ok"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {message.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* بطاقات الإحصائيات السريعة */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-[#e8e8e0] shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-gray-500">إجمالي التلاميذ</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-gray-900 font-mono">{students.length}</span>
              <Users className="w-4 h-4 text-[#107a57]" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#e8e8e0] shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-gray-500">الأفواج المسندة</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-gray-900 font-mono">{customClasses.length}</span>
              <School className="w-4 h-4 text-emerald-600" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#e8e8e0] shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-gray-500">الفوج المحدد</span>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-black text-gray-800">
                {selectedClass === "all" ? "جميع الأفواج" : selectedClass}
              </span>
              <span className="text-xs font-mono font-bold text-[#107a57] bg-[#e6f4ee] px-2 py-0.5 rounded-md">
                {filteredAndSortedStudents.length} تلميذ
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#e8e8e0] shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-gray-500">ترتيب الأسماء</span>
            <div className="flex items-baseline justify-between">
              <button
                onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="text-xs font-black text-[#107a57] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{sortDirection === "asc" ? "أبجدياً (أ ← ي)" : "أبجدياً (ي ← أ)"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* شريط الأفواج التربوية (Custom Classes Filter) */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#e8e8e0] shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-gray-500 ml-1">تصفية حسب الفوج:</span>
            <button
              onClick={() => setSelectedClass("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedClass === "all"
                  ? "bg-[#107a57] text-white shadow-xs"
                  : "bg-[#fafaf7] text-gray-600 hover:bg-gray-100 border border-[#e8e8e0]"
              }`}
            >
              الكل ({students.length})
            </button>
            {customClasses.map((cls) => {
              const count = students.filter((s) => s.className === cls).length;
              return (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    selectedClass === cls
                      ? "bg-[#107a57] text-white shadow-xs"
                      : "bg-[#fafaf7] text-gray-600 hover:bg-gray-100 border border-[#e8e8e0]"
                  }`}
                >
                  <span>{cls}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      selectedClass === cls ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* إضافة فوج سريع */}
          <button
            onClick={() => setIsClassModalOpen(true)}
            className="text-xs font-bold text-[#107a57] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة فوج جديد (مثل 1م3، 2م5)</span>
          </button>
        </div>

        {/* شريط البحث والفرز */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو اللقب أو رقم التعريف..."
              className="w-full pl-3 pr-9 py-2 rounded-xl bg-white border border-[#e8e8e0] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <span>عدد النتائج:</span>
            <span className="font-mono text-gray-900 bg-white px-2 py-1 rounded-lg border border-[#e8e8e0]">
              {filteredAndSortedStudents.length} تلميذ
            </span>
          </div>
        </div>

        {/* جدول التلاميذ */}
        <div className="bg-white rounded-3xl border border-[#e8e8e0] shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-xs text-gray-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#107a57]" />
              <p>جارٍ تحميل قائمة التلاميذ...</p>
            </div>
          ) : filteredAndSortedStudents.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <p className="font-bold text-gray-700">لا يوجد تلاميذ مسجلين حالياً في هذا العرض</p>
              <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                يمكنك البدء بإضافة تلميذ جديد أو استيراد قائمة تلاميذ الفوج.
              </p>
              <button
                onClick={handleOpenAddStudent}
                className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>إضافة أول تلميذ</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-[#fafaf7] border-b border-[#e8e8e0] text-[11px] font-black text-gray-600">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">
                      <button
                        onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                        className="inline-flex items-center gap-1 hover:text-gray-900 cursor-pointer"
                      >
                        <span>الاسم واللقب (أبجدياً)</span>
                        <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      </button>
                    </th>
                    <th className="py-3 px-4">الفوج التربوي</th>
                    <th className="py-3 px-4">رقم التعريف</th>
                    <th className="py-3 px-4">هاتف الولي</th>
                    <th className="py-3 px-4">ملاحظات وتوجيهات الأستاذ</th>
                    <th className="py-3 px-4 w-28 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e0] text-xs">
                  {filteredAndSortedStudents.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-gray-50/80 transition group">
                      <td className="py-3 px-4 text-center font-mono font-bold text-gray-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-black text-gray-900">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              st.gender === "أنثى" ? "bg-rose-400" : "bg-emerald-500"
                            }`}
                          />
                          <span>{st.studentName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#107a57] bg-[#e6f4ee] px-2.5 py-0.5 rounded-lg border border-[#107a57]/20 text-[11px]">
                          {st.className}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-500 text-[11px]">
                        {st.registrationNumber || "—"}
                      </td>
                      <td className="py-3 px-4">
                        {st.parentPhone ? (
                          <a
                            href={`tel:${st.parentPhone}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-600 hover:underline"
                          >
                            <Phone className="w-3 h-3 text-blue-500" />
                            <span dir="ltr">{st.parentPhone}</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-[11px] max-w-xs truncate">
                        {st.notes || <span className="text-gray-300">لا توجد ملاحظات</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 opacity-90 group-hover:opacity-100">
                          <button
                            onClick={() => handleOpenEditStudent(st)}
                            title="تعديل"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(st.id, st.studentName)}
                            title="حذف"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Modal إضافة أو تعديل تلميذ ─── */}
        {isStudentModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#e8e8e0] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-[#e8e8e0] pb-3">
                <h3 className="text-base font-black text-gray-900">
                  {editingStudent ? "تعديل بيانات التلميذ" : "إضافة تلميذ جديد"}
                </h3>
                <button
                  onClick={() => setIsStudentModalOpen(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveStudent} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">
                    الاسم واللقب الكامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: أحمد عبد الله أو مريم قدوري"
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-800">
                      الفوج التربوي <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formClass}
                      onChange={(e) => setFormClass(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                    >
                      {customClasses.length === 0 ? (
                        <option value="">-- يرجى إضافة فوج أولاً --</option>
                      ) : (
                        customClasses.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-800">الجنس</label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value as "ذكر" | "أنثى")}
                      className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                    >
                      <option value="ذكر">ذكر 👦</option>
                      <option value="أنثى">أنثى 👧</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-800">رقم التسجيل / التعريف</label>
                    <input
                      type="text"
                      value={formRegNum}
                      onChange={(e) => setFormRegNum(e.target.value)}
                      placeholder="مثال: 2026/045"
                      className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-mono text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-gray-800">هاتف ولي الأمر</label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="06 / 05 / 07..."
                      className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-mono text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">ملاحظات الأستاذ البيداغوجية</label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="ملاحظات حول الانضباط، مستلزمات الدرس، الواجبات..."
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e8e8e0]">
                  <button
                    type="button"
                    onClick={() => setIsStudentModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl border border-[#e8e8e0] text-xs font-bold text-gray-600 hover:bg-gray-100"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingStudent ? "حفظ التعديلات" : "إضافة التلميذ"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── Modal إدارة الأفواج التربوية ─── */}
        {isClassModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#e8e8e0] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-[#e8e8e0] pb-3">
                <h3 className="text-base font-black text-gray-900">إدارة الأفواج التربوية المسندة</h3>
                <button
                  onClick={() => setIsClassModalOpen(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddClass} className="space-y-2">
                <label className="block text-xs font-black text-gray-800">إضافة فوج جديد:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="مثال: 1م3 أو 2م5 أو 4م1"
                    className="flex-1 px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                  <button type="submit" className="btn-primary text-xs px-4 py-2 shrink-0">
                    إضافة
                  </button>
                </div>
              </form>

              <div className="space-y-2 pt-2 border-t border-[#e8e8e0]">
                <label className="block text-xs font-bold text-gray-600">الأفواج الحالية لديك:</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {customClasses.map((cls) => {
                    const count = students.filter((s) => s.className === cls).length;
                    return (
                      <div
                        key={cls}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#107a57]">{cls}</span>
                          <span className="text-[10px] text-gray-400 font-mono">({count})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteClass(cls)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded-md"
                          title="حذف الفوج"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="w-full py-2 rounded-xl bg-gray-100 text-xs font-bold text-gray-700 hover:bg-gray-200"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
