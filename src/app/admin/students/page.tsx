"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Plus,
  Search,
  ArrowUpDown,
  Pencil,
  Trash2,
  Phone,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  ArrowRight,
  Sparkles,
  School,
  GraduationCap,
  Check,
  Save,
  FileSpreadsheet,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { PageExplainer } from "@/components/PageExplainer";
import { StudentRosterItem, LessonsData } from "@/lib/types";

const LOCAL_STORAGE_CLASSES_KEY = "last_active_classes";
const LOCAL_STORAGE_STUDENTS_KEY = "math_teacher_students_cache";

interface GridRow {
  id: string;
  studentName: string;
  gender: "ذكر" | "أنثى";
  registrationNumber: string;
  parentPhone: string;
  notes: string;
}

const createEmptyRow = (customId?: string): GridRow => ({
  id: customId || `new_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  studentName: "",
  gender: "ذكر",
  registrationNumber: "",
  parentPhone: "",
  notes: "",
});

export default function StudentsManagementPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // بيانات الأستاذ والتلاميذ
  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentRosterItem[]>([]);

  // الفلاتر والبحث
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // وضع تحرير الجدول المباشر (مثل جدول التوقيت الأسبوعي)
  const [isGridMode, setIsGridMode] = useState<boolean>(true);
  const [gridRows, setGridRows] = useState<GridRow[]>([]);

  // نوافذ إضافة وتعديل
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRosterItem | null>(null);

  // بيانات استمارة التلميذ الفردي
  const [formName, setFormName] = useState("");
  const [formClass, setFormClass] = useState("");
  const [formRegNum, setFormRegNum] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGender, setFormGender] = useState<"ذكر" | "أنثى">("ذكر");
  const [formNotes, setFormNotes] = useState("");

  // بيانات إضافة فوج جديد
  const [newClassName, setNewClassName] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isFromOnboarding, setIsFromOnboarding] = useState(false);

  // تحميل أولي فوري بدون أي تأخير (0ms) من التخزين المحلي، وجلب متوازٍ في الخلفية
  useEffect(() => {
    setMounted(true);

    let activeParam = "";
    let cachedCls: string[] = [];

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      activeParam = urlParams.get("activeClass") || "";
      setIsFromOnboarding(urlParams.get("from") === "onboarding");

      // قراءة فورية للأفواج المحفوظة
      try {
        const storedClasses = localStorage.getItem(LOCAL_STORAGE_CLASSES_KEY);
        if (storedClasses) {
          const parsed = JSON.parse(storedClasses);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedCls = parsed;
            setCustomClasses(parsed);
          }
        }
      } catch (e) {
        console.warn("Error reading cached classes", e);
      }

      // قراءة فورية لقائمة التلاميذ المحفوظة
      try {
        const storedStudents = localStorage.getItem(LOCAL_STORAGE_STUDENTS_KEY);
        if (storedStudents) {
          const parsedStudents = JSON.parse(storedStudents);
          if (Array.isArray(parsedStudents)) {
            setStudents(parsedStudents);
          }
        }
      } catch (e) {
        console.warn("Error reading cached students", e);
      }

      // تحديد الفوج النشط الافتراضي فوراً (الفوج من الرابط أو أول فوج للأستاذ)
      if (activeParam && (cachedCls.length === 0 || cachedCls.includes(activeParam))) {
        setSelectedClass(activeParam);
      } else if (cachedCls.length > 0) {
        setSelectedClass(cachedCls[0]);
      } else {
        setSelectedClass("all");
      }
    }

    // جلب متوازٍ وسريع للمصادقة وبيانات الأستاذ في نفس اللحظة
    setLoading(true);
    Promise.all([
      fetch("/api/auth")
        .then((res) => res.json())
        .catch(() => ({ authenticated: false })),
      fetch("/api/lessons")
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ])
      .then(([authData, lessonsData]: [any, LessonsData | null]) => {
        setAuthenticated(authData?.authenticated === true);

        if (lessonsData) {
          const teacherClasses =
            Array.isArray(lessonsData.customClasses) && lessonsData.customClasses.length > 0
              ? lessonsData.customClasses
              : cachedCls;

          setCustomClasses(teacherClasses);

          let loadedStudents: StudentRosterItem[] = [];
          if (Array.isArray(lessonsData.studentRoster)) {
            loadedStudents = lessonsData.studentRoster;
          } else if (Array.isArray(lessonsData.evaluations) && lessonsData.evaluations.length > 0) {
            loadedStudents = lessonsData.evaluations.map((ev) => ({
              id: ev.id,
              studentName: ev.studentName,
              className: ev.className,
              groupName: ev.groupName || "القسم كامل",
              createdAt: ev.updatedAt || new Date().toISOString(),
            }));
          }
          setStudents(loadedStudents);

          // تحديث التخزين المحلي للاستجابة الفورية في المرات القادمة
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(loadedStudents));
              if (teacherClasses.length > 0) {
                localStorage.setItem(LOCAL_STORAGE_CLASSES_KEY, JSON.stringify(teacherClasses));
              }
            } catch (e) {
              console.warn("Storage save error", e);
            }
          }

          // ضبط الفوج النشط إذا لم يكن محدداً بشكل ملائم
          setSelectedClass((curr) => {
            if (curr && curr !== "all" && teacherClasses.includes(curr)) return curr;
            if (activeParam && teacherClasses.includes(activeParam)) return activeParam;
            return teacherClasses[0] || "all";
          });
        }
      })
      .catch((err) => {
        console.error("Data fetch error", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // تلاميذ الفوج النشط المحدد
  const activeClassStudents = useMemo(() => {
    if (!selectedClass || selectedClass === "all") return students;
    return students.filter((s) => s.className === selectedClass);
  }, [students, selectedClass]);

  // مزامنة أسطر الجدول المباشر عند تغيير الفوج المحدد أو تغير التلاميذ
  useEffect(() => {
    if (!selectedClass || selectedClass === "all") {
      setIsGridMode(false);
      return;
    }

    const classStudents = students.filter((s) => s.className === selectedClass);
    if (classStudents.length === 0) {
      // إذا كان الفوج جديداً أو فارغاً، فتح وضع الجدول المباشر تلقائياً مع 6 أسطر جاهزة للكتابة فوراً
      setIsGridMode(true);
      setGridRows([
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
      ]);
    } else {
      // الفوج يحتوي على تلاميذ، تعبئة أسطر الجدول ببياناتهم الحالية
      setGridRows(
        classStudents.map((s) => ({
          id: s.id,
          studentName: s.studentName,
          gender: s.gender || "ذكر",
          registrationNumber: s.registrationNumber || "",
          parentPhone: s.parentPhone || "",
          notes: s.notes || "",
        }))
      );
    }
  }, [selectedClass, students]);

  // قفل تمرير الصفحة خلف النوافذ المنبثقة
  const anyModalOpen = isStudentModalOpen || isClassModalOpen;
  useEffect(() => {
    if (anyModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [anyModalOpen]);

  // حفظ البيانات وتحديث التخزين المحلي
  const persistChanges = async (newStudents: StudentRosterItem[], newClasses: string[]) => {
    setSaving(true);
    // تحديث فوري محلياً للسرعة القصوى
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(newStudents));
        localStorage.setItem(LOCAL_STORAGE_CLASSES_KEY, JSON.stringify(newClasses));
      } catch {}
    }

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
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "err", text: err.message || "حدث خطأ أثناء الحفظ" });
    } finally {
      setSaving(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     عمليات الجدول التفاعلي المباشر (Inline Grid Operations)
  ───────────────────────────────────────────────────────────── */

  // إضافة سطر جديد فارغ للجدول
  const handleAddRow = () => {
    setGridRows((prev) => [...prev, createEmptyRow()]);
  };

  // إضافة عدة أسطر دفعة واحدة
  const handleAddMultipleRows = (count: number = 5) => {
    setGridRows((prev) => [
      ...prev,
      ...Array.from({ length: count }, () => createEmptyRow()),
    ]);
  };

  // حذف سطر محدد من الجدول
  const handleRemoveRow = (index: number) => {
    setGridRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // الحفاظ دائماً على سطر واحد على الأقل للكتابة
      return next.length > 0 ? next : [createEmptyRow()];
    });
  };

  // تعديل خلية في سطر محدد
  const handleUpdateRow = (index: number, field: keyof GridRow, value: any) => {
    setGridRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // ترتيب أسطر الجدول أبجدياً
  const handleSortGridRows = () => {
    setGridRows((prev) => {
      const filled = prev.filter((r) => r.studentName.trim().length > 0);
      const empty = prev.filter((r) => r.studentName.trim().length === 0);
      filled.sort((a, b) =>
        a.studentName.localeCompare(b.studentName, "ar", { sensitivity: "base" })
      );
      return [...filled, ...empty];
    });
    setMessage({ type: "ok", text: "تمت إعادة ترتيب الأسطر أبجدياً (أ ← ي) ✨" });
    setTimeout(() => setMessage(null), 2500);
  };

  // حفظ وتثبيت جدول الفوج كاملاً
  const handleSaveGrid = async () => {
    if (!selectedClass || selectedClass === "all") {
      setMessage({ type: "err", text: "يرجى تحديد الفوج التربوي أولاً" });
      return;
    }

    // تصفية الأسطر غير الفارغة
    const validRows = gridRows
      .map((r) => ({
        ...r,
        studentName: r.studentName.trim(),
        registrationNumber: r.registrationNumber.trim(),
        parentPhone: r.parentPhone.trim(),
        notes: r.notes.trim(),
      }))
      .filter((r) => r.studentName.length >= 2);

    if (validRows.length === 0) {
      setMessage({
        type: "err",
        text: "يرجى كتابة اسم تلميذ واحد على الأقل في أسطر الجدول قبل الحفظ",
      });
      return;
    }

    // ترتيب أبجدي آلي لجميع الأسماء المعتمدة
    validRows.sort((a, b) =>
      a.studentName.localeCompare(b.studentName, "ar", { sensitivity: "base" })
    );

    // تحويل الأسطر إلى قائمة تلاميذ الفوج المعتمدة
    const newClassStudents: StudentRosterItem[] = validRows.map((r, idx) => ({
      id: r.id.startsWith("new_")
        ? `st_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`
        : r.id,
      studentName: r.studentName,
      className: selectedClass,
      gender: r.gender,
      registrationNumber: r.registrationNumber || undefined,
      parentPhone: r.parentPhone || undefined,
      notes: r.notes || undefined,
      createdAt: new Date().toISOString(),
    }));

    // الحفاظ على تلاميذ باقي الأفواج واستبدال تلاميذ الفوج النشط فقط
    const otherStudents = students.filter((s) => s.className !== selectedClass);
    const updatedAll = [...otherStudents, ...newClassStudents];

    setStudents(updatedAll);
    setIsGridMode(false);
    await persistChanges(updatedAll, customClasses);

    setMessage({
      type: "ok",
      text: `تم حفظ (${newClassStudents.length}) تلميذ في فوج ${selectedClass} وترتيبهم أبجدياً بنجاح 💾✨`,
    });
  };

  // فتح وضع تعديل الجدول المباشر وإضافة أسطر
  const handleEnterGridMode = () => {
    setIsGridMode(true);
    const classStudents = students.filter((s) => s.className === selectedClass);
    setGridRows([
      ...classStudents.map((s) => ({
        id: s.id,
        studentName: s.studentName,
        gender: s.gender || "ذكر",
        registrationNumber: s.registrationNumber || "",
        parentPhone: s.parentPhone || "",
        notes: s.notes || "",
      })),
      createEmptyRow(),
      createEmptyRow(),
      createEmptyRow(),
    ]);
  };

  /* ─────────────────────────────────────────────────────────────
     عمليات أخرى (إضافة فردية، حذف، إضافة فوج)
  ───────────────────────────────────────────────────────────── */

  // فتح نافذة تلميذ فردي
  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setFormName("");
    setFormClass(selectedClass !== "all" && selectedClass ? selectedClass : customClasses[0] || "");
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

  // حفظ تلميذ فردي
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
    setSelectedClass(cleanClass);
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
    if (selectedClass === clsToDelete) {
      setSelectedClass(updatedClasses[0] || "all");
    }
    await persistChanges(students, updatedClasses);
  };

  // فلترة وترتيب التلاميذ أبجدياً آلياً بدقة عالية في وضع العرض
  const filteredAndSortedStudents = useMemo(() => {
    return students
      .filter((s) => {
        // فلترة الفوج
        if (selectedClass && selectedClass !== "all" && s.className !== selectedClass) return false;
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
        const comparison = a.studentName.localeCompare(b.studentName, "ar", { sensitivity: "base" });
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [students, selectedClass, searchQuery, sortDirection]);

  const maleCount = useMemo(() => {
    return activeClassStudents.filter((s) => s.gender === "ذكر" || !s.gender).length;
  }, [activeClassStudents]);

  const femaleCount = useMemo(() => {
    return activeClassStudents.filter((s) => s.gender === "أنثى").length;
  }, [activeClassStudents]);

  // إذا تم التأكد من عدم تسجيل الدخول، عرض نافذة الدخول
  if (authenticated === false) {
    return <LoginRequired next="/admin/students" title="إدارة الأفواج والتلاميذ" />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] py-5 sm:py-8 px-3 sm:px-6 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* شريط المسار والتنقل والإجراءات السريعة */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <Link href="/admin" className="hover:text-gray-900 transition flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              لوحة الأستاذ
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-black">إدارة وتوثيق الأفواج والتلاميذ</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
              <span>إضافة تلميذ فردي</span>
            </button>
          </div>
        </div>

        {/* دليل الصفحة البيداغوجي */}
        <PageExplainer
          pageId="students"
          title="إدارة الأفواج والتلاميذ"
          teacherRoleExplanation="جدول تفاعلي مباشر أمامك لملء أسماء وبيانات تلاميذ الفوج وإضافة أسطر بضغطة زر مع حفظ وتثبيت القائمة وترتيبها أبجدياً تلقائياً."
          parentRoleExplanation="يضمن خصوصية تامة؛ لا يطلع أي ولي على أسماء أو بيانات التلاميذ الآخرين في الفوج."
          inspectorExplanation="يطلع المفتش البيداغوجي على إسناد الأفواج وتعداد التلاميذ لمطابقة التنظيم التربوي الرسمي."
        />

        {/* شريط التوجيه البيداغوجي المباشر */}
        {(isFromOnboarding || (students.length === 0 && customClasses.length > 0)) && (
          <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-amber-400 text-emerald-950 font-black px-2 py-0.5 rounded-full">
                    الخطوة ② من 6 ✨
                  </span>
                  <span className="text-xs font-bold text-emerald-200">توثيق تلاميذ الأفواج في الجدول</span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  أهلاً بك أستاذنا الفاضل! جدول إدخال التلاميذ جاهز أمامك مباشرة:
                </h3>
                <p className="text-xs text-emerald-100/90 leading-relaxed max-w-2xl">
                  اختر الفوج، واكتب أسماء تلاميذك ومعلوماتهم مباشرة في أسطر الجدول بالأسفل. يمكنك إضافة أسطر جديدة عند الحاجة عبر زر{" "}
                  <strong className="text-white underline">«➕ إضافة سطر»</strong> ثم الضغط على{" "}
                  <strong className="text-amber-300 font-black underline">«💾 حفظ وتثبيت القائمة»</strong> ليتم ترتيبهم أبجدياً وحفظهم فوراً.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={handleAddRow}
                className="w-full md:w-auto px-4 py-2.5 bg-white text-emerald-950 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>➕ إضافة سطر تلميذ جديد</span>
              </button>
            </div>
          </div>
        )}

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

        {/* ─── محدد الأفواج الرئيسي (Class Workspace Selector) ─── */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e8e8e0] shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-[#107a57]" />
              <h2 className="text-xs sm:text-sm font-black text-gray-900">
                اختر الفوج لعرض وتعديل جدول تلاميذه مباشرة:
              </h2>
            </div>
            <button
              onClick={() => setIsClassModalOpen(true)}
              className="text-xs font-bold text-[#107a57] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة فوج جديد (مثل 1م3، 2م5)</span>
            </button>
          </div>

          {/* تبويبات الأفواج التربوية البارزة */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {customClasses.length === 0 ? (
              <div className="w-full text-center py-4 px-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs font-bold space-y-2">
                <p>⚠️ لم يتم تحديد أي فوج بعد في حسابك.</p>
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(true)}
                  className="btn-primary text-xs px-4 py-1.5 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة أول فوج تربوي الآن</span>
                </button>
              </div>
            ) : (
              <>
                {customClasses.map((cls) => {
                  const count = students.filter((s) => s.className === cls).length;
                  const isSelected = selectedClass === cls;
                  return (
                    <button
                      key={cls}
                      onClick={() => {
                        setSelectedClass(cls);
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                        isSelected
                          ? "bg-gradient-to-r from-emerald-800 to-teal-800 text-white ring-2 ring-emerald-500/40 shadow-sm scale-102"
                          : "bg-[#fafaf7] text-gray-700 hover:bg-gray-100 border border-[#e8e8e0] hover:border-gray-300"
                      }`}
                    >
                      <School className={`w-3.5 h-3.5 ${isSelected ? "text-amber-300" : "text-emerald-700"}`} />
                      <span>فوج {cls}</span>
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          isSelected ? "bg-white/20 text-white" : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {count} تلميذ
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-300" />}
                    </button>
                  );
                })}

                <button
                  onClick={() => setSelectedClass("all")}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    selectedClass === "all"
                      ? "bg-gray-900 text-white shadow-xs"
                      : "bg-[#fafaf7] text-gray-600 hover:bg-gray-100 border border-[#e8e8e0]"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>جميع الأقسام ({students.length})</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ─── مساحة عمل الفوج المحدد (Class Header & Actions) ─── */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e8e8e0] shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8e8e0] pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <h3 className="text-sm sm:text-base font-black text-gray-900">
                  {selectedClass === "all" ? (
                    "قائمة جميع التلاميذ في كافة الأفواج"
                  ) : (
                    <span>
                      جدول وتوثيق تلاميذ: <strong className="text-[#107a57]">فوج {selectedClass}</strong>
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 font-bold flex-wrap">
                <span>
                  تعداد الفوج المعتمد: <strong className="text-gray-900 font-mono">{activeClassStudents.length}</strong> تلميذ
                </span>
                <span>•</span>
                <span className="text-emerald-700">👦 {maleCount} ذكور</span>
                <span>•</span>
                <span className="text-rose-600">👧 {femaleCount} إناث</span>
                <span>•</span>
                <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  🔤 الترتيب الأبجدي الآلي (أ ← ي) مفعل تلقائياً
                </span>
              </div>
            </div>

            {/* أزرار التبديل وإجراءات الفوج */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedClass !== "all" && selectedClass && (
                <>
                  {isGridMode ? (
                    <button
                      type="button"
                      onClick={handleSaveGrid}
                      disabled={saving}
                      className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-md font-black cursor-pointer active:scale-95"
                    >
                      {saving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>💾 حفظ وتثبيت القائمة</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEnterGridMode}
                      className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-md font-black cursor-pointer active:scale-95"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>✏️ فتح جدول الإدخال وإضافة أسطر</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* شريط البحث والترتيب في وضع العرض */}
          {!isGridMode && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو اللقب أو رقم التعريف..."
                  className="w-full pl-3 pr-9 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
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

              <div className="flex items-center gap-3 text-xs font-bold text-gray-600">
                <button
                  onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                  className="px-3 py-1.5 rounded-xl border border-[#e8e8e0] bg-white text-xs font-black text-[#107a57] hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{sortDirection === "asc" ? "أبجدياً (أ ← ي)" : "أبجدياً (ي ← أ)"}</span>
                </button>

                <span className="font-mono text-gray-900 bg-[#fafaf7] px-2.5 py-1 rounded-lg border border-[#e8e8e0]">
                  {filteredAndSortedStudents.length} معروض
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ─── 1. وضع جدول الإدخال التفاعلي المباشر (Direct Inline Editable Grid) ─── */}
        {selectedClass !== "all" && isGridMode ? (
          <div className="bg-white rounded-3xl border border-[#e8e8e0] shadow-sm overflow-hidden animate-in fade-in duration-200">
            {/* شريط الإرشادات ورأس الجدول */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border-b border-[#e8e8e0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <span>جدول إدخال تلاميذ: فوج {selectedClass}</span>
                    <span className="text-[11px] font-mono text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                      {gridRows.length} أسطر متاحة
                    </span>
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    اكتب أسماء ومعلومات التلاميذ في أسطر الجدول، وأضف أسطراً جديدة بالأسفل، ثم اضغط «حفظ وتثبيت القائمة».
                  </p>
                </div>
              </div>

              {/* أزرار الحفظ والإلغاء العلوية */}
              <div className="flex items-center gap-2 shrink-0">
                {activeClassStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsGridMode(false)}
                    className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  >
                    عرض القائمة المحفوظة
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveGrid}
                  disabled={saving}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-2 shadow-md font-black cursor-pointer active:scale-95"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>💾 حفظ وتثبيت القائمة ({gridRows.filter((r) => r.studentName.trim()).length})</span>
                </button>
              </div>
            </div>

            {/* شبكة الأسطر التفاعلية */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-[#fafaf7] border-b border-[#e8e8e0] text-[11px] font-black text-gray-700">
                    <th className="py-2.5 px-3 w-12 text-center">الرقم</th>
                    <th className="py-2.5 px-3 min-w-[200px]">
                      الاسم واللقب الكامل <span className="text-red-500">*</span>
                    </th>
                    <th className="py-2.5 px-3 w-32 text-center">الجنس</th>
                    <th className="py-2.5 px-3 w-40">رقم التعريف (اختياري)</th>
                    <th className="py-2.5 px-3 w-40">هاتف الولي (اختياري)</th>
                    <th className="py-2.5 px-3 min-w-[180px]">ملاحظات الأستاذ</th>
                    <th className="py-2.5 px-2 w-14 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e0] text-xs">
                  {gridRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-emerald-50/40 transition">
                      <td className="py-2 px-3 text-center font-mono font-bold text-gray-400 text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.studentName}
                          onChange={(e) => handleUpdateRow(idx, "studentName", e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (idx === gridRows.length - 1) {
                                handleAddRow();
                              }
                            }
                          }}
                          placeholder={`اسم ولقب التلميذ رقم ${idx + 1}...`}
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#107a57]/30 focus:border-[#107a57]"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <select
                          value={row.gender}
                          onChange={(e) =>
                            handleUpdateRow(idx, "gender", e.target.value as "ذكر" | "أنثى")
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#e8e8e0] text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#107a57]/30"
                        >
                          <option value="ذكر">ذكر 👦</option>
                          <option value="أنثى">أنثى 👧</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.registrationNumber}
                          onChange={(e) =>
                            handleUpdateRow(idx, "registrationNumber", e.target.value)
                          }
                          placeholder="مثال: 2026/01"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#e8e8e0] text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#107a57]/30"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="tel"
                          value={row.parentPhone}
                          onChange={(e) => handleUpdateRow(idx, "parentPhone", e.target.value)}
                          placeholder="06 / 05 / 07..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#e8e8e0] text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#107a57]/30"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => handleUpdateRow(idx, "notes", e.target.value)}
                          placeholder="ملاحظات وتوجيهات الأستاذ..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#e8e8e0] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#107a57]/30"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          title="حذف هذا السطر"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* شريط الإجراءات أسفل جدول الإدخال */}
            <div className="p-4 bg-[#fafaf7] border-t border-[#e8e8e0] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-xs font-black text-gray-800 hover:bg-gray-100 transition shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-700" />
                  <span>➕ إضافة سطر (تلميذ إضافي)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddMultipleRows(5)}
                  className="px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-xs font-black text-gray-800 hover:bg-gray-100 transition shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 text-teal-700" />
                  <span>➕ إضافة 5 أسطر دفعة واحدة</span>
                </button>

                <button
                  type="button"
                  onClick={handleSortGridRows}
                  className="px-3 py-2 rounded-xl bg-white border border-[#e8e8e0] text-xs font-bold text-gray-600 hover:bg-gray-100 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                  <span>ترتيب الأسطر أبجدياً (أ ← ي)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveGrid}
                  disabled={saving}
                  className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2 shadow-md font-black cursor-pointer active:scale-95"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>💾 حفظ وتثبيت قائمة فوج ({selectedClass})</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ─── 2. وضع جدول العرض المعتمد والمطبوع (Read-only View with Actions) ─── */
          <div className="bg-white rounded-3xl border border-[#e8e8e0] shadow-sm overflow-hidden">
            {loading && students.length === 0 ? (
              <div className="p-8 space-y-3">
                <div className="h-8 bg-gray-100 rounded-xl animate-pulse" />
                <div className="h-12 bg-gray-50 rounded-xl animate-pulse" />
                <div className="h-12 bg-gray-50 rounded-xl animate-pulse" />
              </div>
            ) : filteredAndSortedStudents.length === 0 ? (
              <div className="py-14 sm:py-16 text-center text-xs text-gray-500 space-y-3 px-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-black text-gray-800">
                  {selectedClass !== "all" && selectedClass
                    ? `فوج ${selectedClass} لا يحتوي على تلاميذ حتى الآن`
                    : "لا يوجد تلاميذ مسجلين حالياً"}
                </h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                  افتح جدول الإدخال الآن لإضافة أسماء التلاميذ مباشرة في أسطر الجدول كما في كراس التنظيم التربوي.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleEnterGridMode}
                    className="btn-primary text-xs px-5 py-2.5 inline-flex items-center gap-2 cursor-pointer shadow-md active:scale-95 font-black"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>فتح جدول إدخال وتوثيق تلاميذ فوج {selectedClass} 📋</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-[#fafaf7] border-b border-[#e8e8e0] text-[11px] font-black text-gray-600">
                      <th className="py-3 px-4 w-12 text-center">الرقم</th>
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
                      <th className="py-3 px-4">هاتف ولي الأمر</th>
                      <th className="py-3 px-4">ملاحظات الأستاذ البيداغوجية</th>
                      <th className="py-3 px-4 w-28 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e8e0] text-xs">
                    {filteredAndSortedStudents.map((st, idx) => (
                      <tr key={st.id} className="hover:bg-gray-50/80 transition group">
                        <td className="py-3 px-4 text-center font-mono font-bold text-gray-500 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-black text-gray-900">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                st.gender === "أنثى" ? "bg-rose-400" : "bg-emerald-500"
                              }`}
                              title={st.gender === "أنثى" ? "أنثى" : "ذكر"}
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
                              title="تعديل بيانات التلميذ"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(st.id, st.studentName)}
                              title="حذف من القائمة"
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
        )}

        {/* ─── Modal إضافة أو تعديل تلميذ فردي ─── */}
        {mounted && isStudentModalOpen && createPortal(
          <div className="fixed inset-0 z-[999999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150" dir="rtl">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#e8e8e0] pb-3 shrink-0">
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {editingStudent ? "تعديل بيانات التلميذ" : `إضافة تلميذ جديد`}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {editingStudent ? "تعديل بيانات التلميذ وتحديث الفوج" : `سيتم الترتيب الأبجدي آلياً (أ ← ي)`}
                  </p>
                </div>
                <button
                  onClick={() => setIsStudentModalOpen(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveStudent} className="space-y-4 overflow-y-auto flex-1 pr-0.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-800">
                    الاسم واللقب الكامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: عبد الرحمن بن علي"
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
                            فوج {c}
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
                    placeholder="ملاحظات حول الانضباط، مستلزمات الدرس، الواجبات، النظارات..."
                    className="w-full px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e8e8e0] shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsStudentModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl border border-[#e8e8e0] text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingStudent ? "حفظ التعديلات" : "إضافة التلميذ"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ─── Modal إدارة الأفواج التربوية ─── */}
        {mounted && isClassModalOpen && createPortal(
          <div className="fixed inset-0 z-[999999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150" dir="rtl">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#e8e8e0] pb-3 shrink-0">
                <div>
                  <h3 className="text-base font-black text-gray-900">إدارة الأفواج التربوية المسندة</h3>
                  <p className="text-[11px] text-gray-500">إضافة أو حذف الأفواج الخاصة بك</p>
                </div>
                <button
                  onClick={() => setIsClassModalOpen(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddClass} className="space-y-2 shrink-0">
                <label className="block text-xs font-black text-gray-800">إضافة فوج جديد:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="مثال: 1م3 أو 2م5 أو 4م1"
                    className="flex-1 px-3 py-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                  />
                  <button type="submit" className="btn-primary text-xs px-4 py-2 shrink-0 cursor-pointer shadow-sm">
                    إضافة
                  </button>
                </div>
              </form>

              <div className="space-y-2 pt-2 border-t border-[#e8e8e0] overflow-y-auto flex-1">
                <label className="block text-xs font-bold text-gray-600">الأفواج الحالية لديك ({customClasses.length}):</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {customClasses.map((cls) => {
                    const count = students.filter((s) => s.className === cls).length;
                    return (
                      <div
                        key={cls}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-bold"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#107a57]">فوج {cls}</span>
                          <span className="text-[10px] text-gray-400 font-mono">({count})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteClass(cls)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded-md cursor-pointer"
                          title="حذف الفوج"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 text-right shrink-0">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="w-full py-2 rounded-xl bg-gray-100 text-xs font-bold text-gray-700 hover:bg-gray-200 cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
