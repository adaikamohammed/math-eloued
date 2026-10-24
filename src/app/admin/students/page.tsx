"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Users,
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
  School,
  GraduationCap,
  Check,
  Save,
  CheckSquare,
  Square,
  Filter,
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
  groupName: "فوج 1" | "فوج 2";
  isRepeater: boolean;
  parentPhone: string;
  notes: string;
}

const createEmptyRow = (customId?: string, defaultGroup: "فوج 1" | "فوج 2" = "فوج 1"): GridRow => ({
  id: customId || `new_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  studentName: "",
  gender: "ذكر",
  groupName: defaultGroup,
  isRepeater: false,
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

  // فلاتر التفويج والجنس والإعادة
  const [genderFilter, setGenderFilter] = useState<"all" | "ذكر" | "أنثى">("all");
  const [subgroupFilter, setSubgroupFilter] = useState<"all" | "فوج 1" | "فوج 2">("all");
  const [repeaterFilter, setRepeaterFilter] = useState<"all" | "repeater" | "new">("all");

  // وضع تحرير الجدول المباشر
  const [isGridMode, setIsGridMode] = useState<boolean>(true);
  const [gridRows, setGridRows] = useState<GridRow[]>([]);

  // التحديد المتعدد والعمليات الجماعية
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // نوافذ إضافة وتعديل
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [mounted, setMounted] = useState(false);

  // تحميل أولي فوري بدون أي تأخير (0ms) من التخزين المحلي، وجلب متوازٍ في الخلفية
  useEffect(() => {
    setMounted(true);

    let activeParam = "";
    let cachedCls: string[] = [];

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      activeParam = urlParams.get("activeClass") || "";

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

      // تحديد الفوج النشط الافتراضي فوراً
      if (activeParam && (cachedCls.length === 0 || cachedCls.includes(activeParam))) {
        setSelectedClass(activeParam);
      } else if (cachedCls.length > 0) {
        setSelectedClass(cachedCls[0]);
      } else {
        setSelectedClass("all");
      }
    }

    // جلب متوازٍ وسريع للمصادقة وبيانات الأستاذ
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
              groupName: ev.groupName || "فوج 1",
              createdAt: ev.updatedAt || new Date().toISOString(),
            }));
          }
          setStudents(loadedStudents);

          // تحديث التخزين المحلي للاستجابة الفورية
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

          // ضبط الفوج النشط
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
    setSelectedIds(new Set());
    if (!selectedClass || selectedClass === "all") {
      setIsGridMode(false);
      return;
    }

    const classStudents = students.filter((s) => s.className === selectedClass);
    if (classStudents.length === 0) {
      // الفوج جديد أو فارغ: فتح جدول الإدخال فوراً مع أسطر جاهزة للكتابة
      setIsGridMode(true);
      setGridRows([
        createEmptyRow(undefined, "فوج 1"),
        createEmptyRow(undefined, "فوج 1"),
        createEmptyRow(undefined, "فوج 1"),
        createEmptyRow(undefined, "فوج 2"),
        createEmptyRow(undefined, "فوج 2"),
        createEmptyRow(undefined, "فوج 2"),
      ]);
    } else {
      // الفوج يحتوي على تلاميذ: تعبئة أسطر الجدول ببياناتهم الحالية
      setGridRows(
        classStudents.map((s) => ({
          id: s.id,
          studentName: s.studentName,
          gender: s.gender || "ذكر",
          groupName: (s.groupName === "فوج 2" ? "فوج 2" : "فوج 1") as "فوج 1" | "فوج 2",
          isRepeater: Boolean(s.isRepeater),
          parentPhone: s.parentPhone || "",
          notes: s.notes || "",
        }))
      );
    }
  }, [selectedClass, students]);

  // قفل تمرير الصفحة خلف النوافذ المنبثقة
  useEffect(() => {
    if (isClassModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isClassModalOpen]);

  // حفظ البيانات وتحديث التخزين المحلي
  const persistChanges = async (newStudents: StudentRosterItem[], newClasses: string[]) => {
    setSaving(true);
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
  const handleAddRow = (groupPreference?: "فوج 1" | "فوج 2") => {
    setGridRows((prev) => [...prev, createEmptyRow(undefined, groupPreference || "فوج 1")]);
  };

  // إضافة 5 أسطر دفعة واحدة
  const handleAddMultipleRows = (count: number = 5) => {
    setGridRows((prev) => [
      ...prev,
      ...Array.from({ length: count }, () => createEmptyRow()),
    ]);
  };

  // حذف سطر محدد من أسطر الجدول
  const handleRemoveRow = (index: number) => {
    setGridRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
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

  // الزر الوحيد المعتمد لحفظ وتثبيت قائمة الفوج كاملاً
  const handleSaveGrid = async () => {
    if (!selectedClass || selectedClass === "all") {
      setMessage({ type: "err", text: "يرجى تحديد الفوج التربوي أولاً" });
      return;
    }

    const validRows = gridRows
      .map((r) => ({
        ...r,
        studentName: r.studentName.trim(),
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
      groupName: r.groupName,
      isRepeater: r.isRepeater,
      parentPhone: r.parentPhone || undefined,
      notes: r.notes || undefined,
      createdAt: new Date().toISOString(),
    }));

    const otherStudents = students.filter((s) => s.className !== selectedClass);
    const updatedAll = [...otherStudents, ...newClassStudents];

    setStudents(updatedAll);
    setIsGridMode(false);
    setSelectedIds(new Set());
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
        groupName: (s.groupName === "فوج 2" ? "فوج 2" : "فوج 1") as "فوج 1" | "فوج 2",
        isRepeater: Boolean(s.isRepeater),
        parentPhone: s.parentPhone || "",
        notes: s.notes || "",
      })),
      createEmptyRow(undefined, "فوج 1"),
      createEmptyRow(undefined, "فوج 2"),
    ]);
  };

  /* ─────────────────────────────────────────────────────────────
     عمليات التحديد المتعدد والإجراءات الجماعية (Bulk Actions)
  ───────────────────────────────────────────────────────────── */

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = (visibleIds: string[]) => {
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف (${selectedIds.size}) تلميذ محدد من القائمة؟`)) return;

    if (isGridMode) {
      setGridRows((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setMessage({ type: "ok", text: `تم حذف الأسطر المحددة من الجدول` });
    } else {
      const updated = students.filter((s) => !selectedIds.has(s.id));
      setStudents(updated);
      setSelectedIds(new Set());
      await persistChanges(updated, customClasses);
      setMessage({ type: "ok", text: `تم حذف التلاميذ المحددين بنجاح 🗑️` });
    }
  };

  const handleBulkSetGroup = async (targetGroup: "فوج 1" | "فوج 2") => {
    if (selectedIds.size === 0) return;

    if (isGridMode) {
      setGridRows((prev) =>
        prev.map((r) => (selectedIds.has(r.id) ? { ...r, groupName: targetGroup } : r))
      );
      setMessage({
        type: "ok",
        text: `تم تحويل (${selectedIds.size}) تلميذ إلى ${targetGroup} في الجدول`,
      });
    } else {
      const updated = students.map((s) =>
        selectedIds.has(s.id) ? { ...s, groupName: targetGroup } : s
      );
      setStudents(updated);
      await persistChanges(updated, customClasses);
      setMessage({
        type: "ok",
        text: `تم تحويل (${selectedIds.size}) تلميذ إلى ${targetGroup} بنجاح ✨`,
      });
    }
  };

  const handleBulkSetRepeater = async (isRep: boolean) => {
    if (selectedIds.size === 0) return;

    if (isGridMode) {
      setGridRows((prev) =>
        prev.map((r) => (selectedIds.has(r.id) ? { ...r, isRepeater: isRep } : r))
      );
      setMessage({
        type: "ok",
        text: `تم تعيين (${selectedIds.size}) تلميذ كـ ${isRep ? "معيد 🔁" : "غير معيد"} في الجدول`,
      });
    } else {
      const updated = students.map((s) =>
        selectedIds.has(s.id) ? { ...s, isRepeater: isRep } : s
      );
      setStudents(updated);
      await persistChanges(updated, customClasses);
      setMessage({
        type: "ok",
        text: `تم تعيين (${selectedIds.size}) تلميذ كـ ${isRep ? "معيد للسنة 🔁" : "غير معيد"} بنجاح ✨`,
      });
    }
  };

  // حذف تلميذ فردي في وضع العرض
  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف التلميذ "${name}" من القائمة؟`)) return;
    const updated = students.filter((s) => s.id !== id);
    setStudents(updated);
    await persistChanges(updated, customClasses);
  };

  // إضافة وحذف الأفواج
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

  /* ─────────────────────────────────────────────────────────────
     الفلترة المتقدمة (ذكور/بنات، فوج 1/فوج 2، معيد/جديد)
  ───────────────────────────────────────────────────────────── */

  const filteredAndSortedStudents = useMemo(() => {
    return students
      .filter((s) => {
        if (selectedClass && selectedClass !== "all" && s.className !== selectedClass) return false;
        if (genderFilter !== "all" && (s.gender || "ذكر") !== genderFilter) return false;
        if (subgroupFilter !== "all" && (s.groupName || "فوج 1") !== subgroupFilter) return false;
        if (repeaterFilter === "repeater" && !s.isRepeater) return false;
        if (repeaterFilter === "new" && s.isRepeater) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchName = s.studentName.toLowerCase().includes(q);
          const matchClass = s.className.toLowerCase().includes(q);
          return matchName || matchClass;
        }
        return true;
      })
      .sort((a, b) => {
        const comparison = a.studentName.localeCompare(b.studentName, "ar", { sensitivity: "base" });
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [students, selectedClass, genderFilter, subgroupFilter, repeaterFilter, searchQuery, sortDirection]);

  const filteredGridRows = useMemo(() => {
    return gridRows.filter((r) => {
      if (genderFilter !== "all" && r.gender !== genderFilter) return false;
      if (subgroupFilter !== "all" && r.groupName !== subgroupFilter) return false;
      if (repeaterFilter === "repeater" && !r.isRepeater) return false;
      if (repeaterFilter === "new" && r.isRepeater) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return r.studentName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [gridRows, genderFilter, subgroupFilter, repeaterFilter, searchQuery]);

  // إحصائيات الفوج النشط المحدد
  const maleCount = useMemo(() => {
    return activeClassStudents.filter((s) => s.gender === "ذكر" || !s.gender).length;
  }, [activeClassStudents]);

  const femaleCount = useMemo(() => {
    return activeClassStudents.filter((s) => s.gender === "أنثى").length;
  }, [activeClassStudents]);

  const group1Count = useMemo(() => {
    return activeClassStudents.filter((s) => s.groupName !== "فوج 2").length;
  }, [activeClassStudents]);

  const group2Count = useMemo(() => {
    return activeClassStudents.filter((s) => s.groupName === "فوج 2").length;
  }, [activeClassStudents]);

  const repeaterCount = useMemo(() => {
    return activeClassStudents.filter((s) => Boolean(s.isRepeater)).length;
  }, [activeClassStudents]);

  const newStudentsCount = activeClassStudents.length - repeaterCount;

  if (authenticated === false) {
    return <LoginRequired next="/admin/students" title="إدارة الأفواج والتلاميذ" />;
  }

  const currentVisibleIds = isGridMode
    ? filteredGridRows.map((r) => r.id)
    : filteredAndSortedStudents.map((s) => s.id);

  const isAllCurrentSelected =
    currentVisibleIds.length > 0 && currentVisibleIds.every((id) => selectedIds.has(id));

  return (
    <div className="min-h-screen bg-[#fafaf7] py-5 sm:py-8 px-3 sm:px-6 font-sans" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* شريط المسار والتنقل */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
            <Link href="/admin" className="hover:text-gray-900 transition flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              لوحة الأستاذ
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-black">إدارة وتوثيق الأفواج والتلاميذ</span>
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
          </div>
        </div>

        {/* دليل الصفحة البيداغوجي */}
        <PageExplainer
          pageId="students"
          title="إدارة وتفويج التلاميذ"
          teacherRoleExplanation="جدول تفاعلي مباشر لتوثيق تلاميذ الفوج بالألوان المعتمدة (ذكر: أزرق، بنت: وردي، معيد: أحمر، جديد: أخضر، وتفويج 1 و 2) مع حفظ فوري بزر واحد دون تشتت."
          parentRoleExplanation="يضمن خصوصية تامة؛ لا يطلع أي ولي على أسماء أو تفاصيل التلاميذ الآخرين في الفوج."
          inspectorExplanation="يطلع المفتش البيداغوجي على تفويج الأقسام وتعداد المعيدين لمطابقة التنظيم التربوي الرسمي."
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

        {/* ─── محدد الأفواج الرئيسي (Class Selector Bar) ─── */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e8e8e0] shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-[#107a57]" />
              <h2 className="text-xs sm:text-sm font-black text-gray-900">
                اختر الفوج لعرض وتعديل جدول تلاميذه وتفويجهم:
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

        {/* ─── حاوية الجدول الموحدة مع الرأس والإحصائيات والزر الوحيد للحفظ ─── */}
        <div className="bg-white rounded-3xl border border-[#e8e8e0] shadow-sm overflow-hidden">
          {/* رأس الجدول الموحد (يحتوي على الزر الوحيد للحفظ والإحصائيات الملونة) */}
          <div className="p-4 sm:p-5 border-b border-[#e8e8e0] bg-[#fafaf7]/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <h3 className="text-sm sm:text-base font-black text-gray-900">
                  {selectedClass === "all" ? (
                    "قائمة جميع التلاميذ في كافة الأفواج"
                  ) : (
                    <span>
                      جدول وتوثيق تلاميذ: <strong className="text-emerald-800 font-black">فوج {selectedClass}</strong>
                    </span>
                  )}
                </h3>
              </div>

              {/* شارات الإحصائيات الملونة بدقة حسب طلب الأستاذ */}
              <div className="flex items-center gap-2 text-xs font-bold flex-wrap pt-0.5">
                <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg border border-gray-200">
                  الإجمالي: <strong className="text-gray-900 font-mono">{activeClassStudents.length}</strong>
                </span>
                {/* ذكر: أزرق */}
                <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg">
                  👦 ذكور: <strong>{maleCount}</strong>
                </span>
                {/* بنت: وردي */}
                <span className="bg-pink-50 text-pink-800 border border-pink-200 px-2.5 py-1 rounded-lg">
                  👧 بنات: <strong>{femaleCount}</strong>
                </span>
                {/* فوج 1: بنفسجي */}
                <span className="bg-purple-50 text-purple-900 border border-purple-200 px-2.5 py-1 rounded-lg">
                  👥 فوج 1: <strong>{group1Count}</strong>
                </span>
                {/* فوج 2: عنبري / برتقالي */}
                <span className="bg-amber-50 text-amber-950 border border-amber-200 px-2.5 py-1 rounded-lg">
                  👥 فوج 2: <strong>{group2Count}</strong>
                </span>
                {/* غير معيد: أخضر */}
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  جدد: <strong>{newStudentsCount}</strong>
                </span>
                {/* معيد: أحمر */}
                {repeaterCount > 0 && (
                  <span className="bg-red-50 text-red-700 border border-red-300 px-2.5 py-1 rounded-lg font-black">
                    🔁 معيدون: <strong>{repeaterCount}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* الزر الوحيد المعتمد للحفظ أو التبديل للتحرير */}
            <div className="flex items-center gap-2 shrink-0">
              {selectedClass !== "all" && selectedClass && (
                <>
                  {isGridMode ? (
                    <div className="flex items-center gap-2">
                      {activeClassStudents.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsGridMode(false)}
                          className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                        >
                          إلغاء التعديل
                        </button>
                      )}
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
                        <span>💾 حفظ وتثبيت القائمة</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEnterGridMode}
                      className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-md font-black cursor-pointer active:scale-95"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>✏️ تعديل الجدول وإضافة أسطر</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ─── أشرطة الفلترة والتصفية السريعة بألوان التمييز ─── */}
          <div className="p-3.5 border-b border-[#e8e8e0] bg-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="text-gray-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span>تصفية:</span>
              </span>

              {/* تصفية الجنس: أزرق للذكور، وردي للبنات */}
              <div className="inline-flex rounded-xl p-0.5 bg-[#f4f4f0] border border-[#e8e8e0]">
                <button
                  type="button"
                  onClick={() => setGenderFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    genderFilter === "all" ? "bg-white text-gray-900 font-black shadow-2xs" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  الجنس: الكل
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter("ذكر")}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                    genderFilter === "ذكر" ? "bg-blue-100 text-blue-900 font-black shadow-2xs" : "text-gray-600 hover:text-blue-900"
                  }`}
                >
                  <span>👦 ذكور ({maleCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter("أنثى")}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                    genderFilter === "أنثى" ? "bg-pink-100 text-pink-900 font-black shadow-2xs" : "text-gray-600 hover:text-pink-900"
                  }`}
                >
                  <span>👧 بنات ({femaleCount})</span>
                </button>
              </div>

              {/* تصفية التفويج: بنفسجي لفوج 1، عنبري لفوج 2 */}
              <div className="inline-flex rounded-xl p-0.5 bg-[#f4f4f0] border border-[#e8e8e0]">
                <button
                  type="button"
                  onClick={() => setSubgroupFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    subgroupFilter === "all" ? "bg-white text-gray-900 font-black shadow-2xs" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  التفويج: الكل
                </button>
                <button
                  type="button"
                  onClick={() => setSubgroupFilter("فوج 1")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    subgroupFilter === "فوج 1" ? "bg-purple-100 text-purple-950 font-black shadow-2xs" : "text-gray-600 hover:text-purple-950"
                  }`}
                >
                  👥 فوج 1 ({group1Count})
                </button>
                <button
                  type="button"
                  onClick={() => setSubgroupFilter("فوج 2")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    subgroupFilter === "فوج 2" ? "bg-amber-100 text-amber-950 font-black shadow-2xs" : "text-gray-600 hover:text-amber-950"
                  }`}
                >
                  👥 فوج 2 ({group2Count})
                </button>
              </div>

              {/* تصفية الإعادة: أخضر للجدد، أحمر للمعيدين */}
              <div className="inline-flex rounded-xl p-0.5 bg-[#f4f4f0] border border-[#e8e8e0]">
                <button
                  type="button"
                  onClick={() => setRepeaterFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    repeaterFilter === "all" ? "bg-white text-gray-900 font-black shadow-2xs" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  الإعادة: الكل
                </button>
                <button
                  type="button"
                  onClick={() => setRepeaterFilter("new")}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    repeaterFilter === "new" ? "bg-emerald-100 text-emerald-950 font-black shadow-2xs" : "text-gray-600 hover:text-emerald-950"
                  }`}
                >
                  جدد ({newStudentsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setRepeaterFilter("repeater")}
                  className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                    repeaterFilter === "repeater" ? "bg-red-100 text-red-800 font-black shadow-2xs" : "text-gray-600 hover:text-red-800"
                  }`}
                >
                  <span>معيدون 🔁 ({repeaterCount})</span>
                </button>
              </div>
            </div>

            {/* شريط البحث والفرز */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
              <div className="relative w-full sm:w-56">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم واللقب..."
                  className="w-full pl-3 pr-8 py-1.5 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57]"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute left-2 top-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {!isGridMode && (
                <button
                  onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                  className="px-2.5 py-1.5 rounded-xl border border-[#e8e8e0] bg-white text-xs font-black text-[#107a57] hover:bg-gray-50 flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{sortDirection === "asc" ? "أ ← ي" : "ي ← أ"}</span>
                </button>
              )}
            </div>
          </div>

          {/* ─── شريط العمليات الجماعية العائم (يظهر فقط عند التحديد) ─── */}
          {selectedIds.size > 0 && (
            <div className="p-3 bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 text-white flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs font-black bg-white/20 px-2.5 py-1 rounded-lg">
                  تم تحديد ({selectedIds.size}) تلميذ
                </span>
                <span className="text-xs text-gray-300 hidden sm:inline">| تطبيق تعديل جماعي:</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* نقل إلى فوج 1 بنفسجي */}
                <button
                  type="button"
                  onClick={() => handleBulkSetGroup("فوج 1")}
                  className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                >
                  <span>👥 تعيين كـ (فوج 1)</span>
                </button>

                {/* نقل إلى فوج 2 عنبري */}
                <button
                  type="button"
                  onClick={() => handleBulkSetGroup("فوج 2")}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                >
                  <span>👥 تعيين كـ (فوج 2)</span>
                </button>

                {/* تعيين كمعيد أحمر */}
                <button
                  type="button"
                  onClick={() => handleBulkSetRepeater(true)}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                >
                  <span>🔁 تعيين كـ معيد</span>
                </button>

                {/* تعيين كجديد أخضر */}
                <button
                  type="button"
                  onClick={() => handleBulkSetRepeater(false)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                >
                  <span>تعيين كـ جديد</span>
                </button>

                {/* حذف جماعي */}
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف ({selectedIds.size})</span>
                </button>

                {/* إلغاء التحديد */}
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
                  title="إلغاء التحديد"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── 1. وضع جدول الإدخال التفاعلي المباشر (Inline Editable Grid) ─── */}
          {selectedClass !== "all" && isGridMode ? (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[780px]">
                  <thead>
                    <tr className="bg-[#fafaf7] border-b border-[#e8e8e0] text-[11px] font-black text-gray-700">
                      <th className="py-2.5 px-3 w-10 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAll(currentVisibleIds)}
                          className="p-1 rounded text-gray-500 hover:text-gray-900 cursor-pointer"
                          title={isAllCurrentSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
                        >
                          {isAllCurrentSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-2.5 px-2 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 min-w-[200px]">
                        الاسم واللقب الكامل <span className="text-red-500">*</span>
                      </th>
                      <th className="py-2.5 px-2 w-28 min-w-[110px] text-center">الجنس</th>
                      <th className="py-2.5 px-2 w-32 min-w-[125px] text-center">الفوج</th>
                      <th className="py-2.5 px-2 w-32 min-w-[125px] text-center">معيد؟</th>
                      <th className="py-2.5 px-3 w-36">هاتف الولي (اختياري)</th>
                      <th className="py-2.5 px-3 min-w-[160px]">ملاحظات الأستاذ</th>
                      <th className="py-2.5 px-2 w-12 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8e8e0] text-xs">
                    {filteredGridRows.map((row, idx) => {
                      const isSelected = selectedIds.has(row.id);
                      return (
                        <tr
                          key={row.id}
                          className={`transition ${
                            isSelected ? "bg-emerald-50/70" : "hover:bg-gray-50/60"
                          }`}
                        >
                          {/* مربع التحديد */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(row.id)}
                              className="w-4 h-4 text-[#107a57] rounded border-gray-300 focus:ring-[#107a57] cursor-pointer"
                            />
                          </td>

                          {/* الترقيم */}
                          <td className="py-2 px-2 text-center font-mono font-bold text-gray-400 text-xs">
                            {idx + 1}
                          </td>

                          {/* الاسم واللقب الكامل */}
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

                          {/* الجنس: أزرق للذكر، وردي للبنت */}
                          <td className="py-2 px-2 text-center">
                            <select
                              value={row.gender}
                              onChange={(e) =>
                                handleUpdateRow(idx, "gender", e.target.value as "ذكر" | "أنثى")
                              }
                              className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold cursor-pointer text-center focus:outline-none focus:ring-2 ${
                                row.gender === "أنثى"
                                  ? "bg-pink-50 text-pink-800 border-pink-300 focus:ring-pink-300"
                                  : "bg-blue-50 text-blue-800 border-blue-300 focus:ring-blue-300"
                              }`}
                            >
                              <option value="ذكر">👦 ذكر</option>
                              <option value="أنثى">👧 بنت</option>
                            </select>
                          </td>

                          {/* الفوج: بنفسجي لفوج 1، عنبري لفوج 2 */}
                          <td className="py-2 px-2 text-center">
                            <select
                              value={row.groupName}
                              onChange={(e) =>
                                handleUpdateRow(idx, "groupName", e.target.value as "فوج 1" | "فوج 2")
                              }
                              className={`w-full px-2 py-1.5 rounded-lg border text-xs font-black cursor-pointer text-center focus:outline-none focus:ring-2 ${
                                row.groupName === "فوج 2"
                                  ? "bg-amber-50 text-amber-950 border-amber-300 focus:ring-amber-300"
                                  : "bg-purple-50 text-purple-900 border-purple-300 focus:ring-purple-300"
                              }`}
                            >
                              <option value="فوج 1">👥 فوج 1</option>
                              <option value="فوج 2">👥 فوج 2</option>
                            </select>
                          </td>

                          {/* معيد: أحمر للمعيد، أخضر للجديد */}
                          <td className="py-2 px-2 text-center">
                            <select
                              value={row.isRepeater ? "yes" : "no"}
                              onChange={(e) =>
                                handleUpdateRow(idx, "isRepeater", e.target.value === "yes")
                              }
                              className={`w-full px-2 py-1.5 rounded-lg border text-xs font-black cursor-pointer text-center focus:outline-none focus:ring-2 ${
                                row.isRepeater
                                  ? "bg-red-50 text-red-700 border-red-300 focus:ring-red-300"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-300"
                              }`}
                            >
                              <option value="no">لا (جديد)</option>
                              <option value="yes">نعم (معيد)</option>
                            </select>
                          </td>

                          {/* هاتف الولي */}
                          <td className="py-2 px-3">
                            <input
                              type="tel"
                              value={row.parentPhone}
                              onChange={(e) => handleUpdateRow(idx, "parentPhone", e.target.value)}
                              placeholder="06 / 05 / 07..."
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#e8e8e0] text-xs font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#107a57]/30"
                            />
                          </td>

                          {/* ملاحظات الأستاذ */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.notes}
                              onChange={(e) => handleUpdateRow(idx, "notes", e.target.value)}
                              placeholder="ملاحظات وتوجيهات..."
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#e8e8e0] text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#107a57]/30"
                            />
                          </td>

                          {/* حذف السطر */}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* شريط إضافة الأسطر أسفل الجدول (الزر الوحيد لإضافة أسطر دون تكرار) */}
              <div className="p-3.5 bg-[#fafaf7] border-t border-[#e8e8e0] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAddRow("فوج 1")}
                    className="px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-xs font-black text-gray-800 hover:bg-gray-100 transition shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>➕ إضافة سطر تلميذ جديد</span>
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
              </div>
            </div>
          ) : (
            /* ─── 2. وضع جدول العرض المعتمد والمطبوع (Read-only View) ─── */
            <div>
              {loading && students.length === 0 ? (
                <div className="p-8 space-y-3">
                  <div className="h-8 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="h-12 bg-gray-50 rounded-xl animate-pulse" />
                </div>
              ) : filteredAndSortedStudents.length === 0 ? (
                <div className="py-14 sm:py-16 text-center text-xs text-gray-500 space-y-3 px-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-black text-gray-800">
                    {selectedClass !== "all" && selectedClass
                      ? `لا توجد نتائج مطابقة في فوج ${selectedClass}`
                      : "لا يوجد تلاميذ مسجلين حالياً"}
                  </h4>
                  <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                    افتح جدول الإدخال الآن لإضافة أسماء ومعلومات التلاميذ وتفويجهم بالألوان المعتمدة.
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
                  <table className="w-full text-right border-collapse min-w-[780px]">
                    <thead>
                      <tr className="bg-[#fafaf7] border-b border-[#e8e8e0] text-[11px] font-black text-gray-600">
                        <th className="py-3 px-3 w-10 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectAll(currentVisibleIds)}
                            className="p-1 rounded text-gray-500 hover:text-gray-900 cursor-pointer"
                            title={isAllCurrentSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
                          >
                            {isAllCurrentSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>
                        <th className="py-3 px-2 w-10 text-center">#</th>
                        <th className="py-3 px-4">
                          <button
                            onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
                            className="inline-flex items-center gap-1 hover:text-gray-900 cursor-pointer"
                          >
                            <span>الاسم واللقب (أبجدياً)</span>
                            <ArrowUpDown className="w-3 h-3 text-gray-400" />
                          </button>
                        </th>
                        <th className="py-3 px-3">القسم</th>
                        <th className="py-3 px-3 text-center">الجنس</th>
                        <th className="py-3 px-3 text-center">الفوج الفرعي</th>
                        <th className="py-3 px-3 text-center">معيد للسنة</th>
                        <th className="py-3 px-4">هاتف ولي الأمر</th>
                        <th className="py-3 px-4">ملاحظات الأستاذ</th>
                        <th className="py-3 px-3 w-20 text-center">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8e8e0] text-xs">
                      {filteredAndSortedStudents.map((st, idx) => {
                        const isSelected = selectedIds.has(st.id);
                        return (
                          <tr
                            key={st.id}
                            className={`transition group ${
                              isSelected ? "bg-emerald-50/70" : "hover:bg-gray-50/80"
                            }`}
                          >
                            {/* مربع التحديد */}
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(st.id)}
                                className="w-4 h-4 text-[#107a57] rounded border-gray-300 focus:ring-[#107a57] cursor-pointer"
                              />
                            </td>

                            {/* الترقيم */}
                            <td className="py-3 px-2 text-center font-mono font-bold text-gray-500 text-[11px]">
                              {idx + 1}
                            </td>

                            {/* الاسم */}
                            <td className="py-3 px-4 font-black text-gray-900">
                              <span>{st.studentName}</span>
                            </td>

                            {/* القسم */}
                            <td className="py-3 px-3">
                              <span className="font-bold text-[#107a57] bg-[#e6f4ee] px-2 py-0.5 rounded-lg border border-[#107a57]/20 text-[11px]">
                                {st.className}
                              </span>
                            </td>

                            {/* الجنس: أزرق للذكر، وردي للبنت */}
                            <td className="py-3 px-3 text-center">
                              {st.gender === "أنثى" ? (
                                <span className="bg-pink-50 text-pink-800 border border-pink-200 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                                  👧 بنت
                                </span>
                              ) : (
                                <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-lg font-bold text-[11px]">
                                  👦 ذكر
                                </span>
                              )}
                            </td>

                            {/* الفوج الفرعي: بنفسجي لفوج 1، عنبري لفوج 2 */}
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`font-black px-2 py-0.5 rounded-lg border text-[11px] ${
                                  st.groupName === "فوج 2"
                                    ? "bg-amber-50 text-amber-950 border-amber-300"
                                    : "bg-purple-50 text-purple-900 border-purple-300"
                                }`}
                              >
                                {st.groupName === "فوج 2" ? "👥 فوج 2" : "👥 فوج 1"}
                              </span>
                            </td>

                            {/* معيد: أحمر للمعيد، أخضر للجديد */}
                            <td className="py-3 px-3 text-center">
                              {st.isRepeater ? (
                                <span className="font-black bg-red-50 text-red-700 px-2 py-0.5 rounded-lg border border-red-300 text-[11px]">
                                  🔁 معيد
                                </span>
                              ) : (
                                <span className="font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-300 text-[11px]">
                                  جديد
                                </span>
                              )}
                            </td>

                            {/* هاتف الولي */}
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

                            {/* الملاحظات */}
                            <td className="py-3 px-4 text-gray-600 text-[11px] max-w-xs truncate">
                              {st.notes || <span className="text-gray-300">لا توجد ملاحظات</span>}
                            </td>

                            {/* حذف فردي */}
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleDeleteStudent(st.id, st.studentName)}
                                title="حذف من القائمة"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

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
