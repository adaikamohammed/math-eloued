"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Heart,
  X,
  ExternalLink,
  Plus,
  Loader2,
  CheckCircle2,
  GraduationCap,
  Building2,
  Sparkles,
  Share2,
  MessageCircle,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { MIDDLE_SCHOOL_SUBJECTS } from "@/lib/types";
import { FamilyWalletShareModal } from "./FamilyWalletShareModal";
import { decodeFamilyWallet } from "@/lib/familyWallet";
import { ParentInquiryModal } from "./ParentInquiryModal";
import { ParentInquiriesListModal } from "./ParentInquiriesListModal";
import { getLocalInquiries } from "@/lib/parentInquiriesStore";
import { parseTeacherInputCode, getTeacherLevelCode } from "@/lib/teacherCodes";
import { findPublicTeacher } from "@/lib/teachers";

export interface SavedTeacher {
  slug: string;
  name: string;
  code: string;
  subject?: string;
  subjectName?: string;
  subjectIcon?: string;
  school?: string;
  levels?: number[];
  levelsLabel?: string;
  savedAt: number;
  childName?: string;
}

const STORAGE_KEY = "math_eloued_wallet";

export function loadWallet(): SavedTeacher[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as SavedTeacher[];
    if (!Array.isArray(list)) return [];

    const seen = new Set<string>();
    const unique: SavedTeacher[] = [];
    for (const item of list) {
      if (!item) continue;
      const key = (item.slug || item.code || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }

    // تنظيف تلقائي لأي تكرارات مخزنة مسبقاً في متصفح المستخدم
    if (unique.length !== list.length) {
      saveWallet(unique);
    }

    return unique;
  } catch {
    return [];
  }
}

function saveWallet(items: SavedTeacher[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/* ─── دالة الحفظ التلقائي لأي أستاذ يُزاره الولي ─── */
export function autoSaveTeacherToWallet(teacher: {
  slug: string;
  name: string;
  code: string;
  subject?: string;
  school?: string;
  levels?: number[];
}): boolean {
  if (typeof window === "undefined") return false;

  const current = loadWallet();
  const cleanCode = (teacher.code || "").trim().toUpperCase();
  const cleanSlug = (teacher.slug || "").trim().toLowerCase();

  // جلب اسم وأيقونة المادة
  const subjObj = MIDDLE_SCHOOL_SUBJECTS.find((s) => s.id === teacher.subject);
  const subjectName = subjObj ? subjObj.name : "المادة التعليمية";
  const subjectIcon = subjObj ? subjObj.icon : "📚";

  // إعداد نص الأقسام/المستويات
  const levelsLabel =
    teacher.levels && teacher.levels.length > 0
      ? teacher.levels.map((l) => `${l}م`).join(" • ")
      : undefined;

  const existingIndex = current.findIndex((t) => {
    const s = (t.slug || "").trim().toLowerCase();
    const c = (t.code || "").trim().toUpperCase();
    return (cleanSlug && s === cleanSlug) || (cleanCode && c === cleanCode);
  });

  const updatedItem: SavedTeacher = {
    slug: teacher.slug,
    name: teacher.name || "أستاذ المادة",
    code: cleanCode,
    subject: teacher.subject,
    subjectName,
    subjectIcon,
    school: teacher.school || "متوسطة ولاية الوادي",
    levels: teacher.levels,
    levelsLabel,
    savedAt: Date.now(),
    childName: existingIndex >= 0 ? current[existingIndex].childName : undefined,
  };

  let newWallet: SavedTeacher[];
  if (existingIndex >= 0) {
    // تحديث البيانات مع الاحتفاظ بموقعها
    newWallet = [...current];
    newWallet[existingIndex] = {
      ...current[existingIndex],
      ...updatedItem,
      savedAt: Date.now(),
    };
  } else {
    // إضافة أستاذ جديد في أعلى القائمة
    newWallet = [updatedItem, ...current];
  }

  saveWallet(newWallet);
  window.dispatchEvent(new CustomEvent("math_wallet_updated"));
  return true;
}

export function isTeacherInWallet(slugOrCode: string): boolean {
  const clean = (slugOrCode || "").trim().toLowerCase();
  return loadWallet().some((t) => {
    const s = (t.slug || "").trim().toLowerCase();
    const c = (t.code || "").trim().toLowerCase();
    return s === clean || c === clean;
  });
}

/* ─── المكوّن الرئيسي: محفظة أساتذة أبنائي ─── */
export default function TeacherWallet() {
  const [wallet, setWallet] = useState<SavedTeacher[]>([]);
  const [mounted, setMounted] = useState(false);

  // حقل إضافة أستاذ إضافي بالكود
  const [newCode, setNewCode] = useState("");
  const [addingLoading, setAddingLoading] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [inquiriesListOpen, setInquiriesListOpen] = useState(false);
  const [inquiryTargetTeacher, setInquiryTargetTeacher] = useState<SavedTeacher | null>(null);
  const [inquiriesCount, setInquiriesCount] = useState(0);

  const refreshInquiriesCount = () => {
    try {
      const list = getLocalInquiries();
      setInquiriesCount(list.length);
    } catch {
      setInquiriesCount(0);
    }
  };

  useEffect(() => {
    setMounted(true);
    refreshInquiriesCount();

    // التحقق من وجود رابط استيراد محفظة عائلية قادم من هاتف آخر (مثل الأم)
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const importData = params.get("import_wallet");
        if (importData) {
          const imported = decodeFamilyWallet(importData);
          if (imported.length > 0) {
            let count = 0;
            imported.forEach((t) => {
              if (autoSaveTeacherToWallet(t)) count++;
            });
            setAddMsg({
              type: "success",
              text: `🎉 تم استيراد محفظة العائلة بنجاح! تم حفظ (${count}) أساتذة على هذا الجهاز تلقائياً.`,
            });
            // تنظيف الرابط بعد نجاح الاستيراد
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        }
      }
    } catch (err) {
      console.error("Family wallet import error:", err);
    }

    setWallet(loadWallet());

    const handleUpdate = () => {
      setWallet(loadWallet());
      refreshInquiriesCount();
    };

    window.addEventListener("math_wallet_updated", handleUpdate);
    window.addEventListener("math_parent_inquiries_updated", handleUpdate);
    return () => {
      window.removeEventListener("math_wallet_updated", handleUpdate);
      window.removeEventListener("math_parent_inquiries_updated", handleUpdate);
    };
  }, []);

  const removeTeacher = (identifier: string) => {
    const target = (identifier || "").trim().toLowerCase();
    const updated = wallet.filter(
      (t) => (t.slug || "").toLowerCase() !== target && (t.code || "").toLowerCase() !== target
    );
    saveWallet(updated);
    setWallet(updated);
  };

  const updateChildName = (identifier: string, childName: string) => {
    const target = (identifier || "").trim().toLowerCase();
    const updated = wallet.map((t) =>
      (t.slug || "").toLowerCase() === target || (t.code || "").toLowerCase() === target
        ? { ...t, childName }
        : t
    );
    saveWallet(updated);
    setWallet(updated);
  };

  const handleAddByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddMsg(null);
    const rawClean = newCode.trim().toUpperCase();
    if (!rawClean) return;

    const parsed = parseTeacherInputCode(rawClean);
    const baseCode = parsed.baseCode;
    const targetLevel = parsed.isLockedToLevel ? parsed.level : null;

    setAddingLoading(true);

    try {
      // البحث عن الأستاذ بالكود بشكل آمن ومطابق لصلاحيات الأمان
      const data = await findPublicTeacher(baseCode);

      if (!data) {
        setAddMsg({
          type: "error",
          text: `لم يتم العثور على أستاذ يحمل الرمز "${rawClean}". يرجى التأكد من كتابة الرمز بشكل صحيح.`,
        });
        setAddingLoading(false);
        return;
      }

      const secureCode = targetLevel
        ? getTeacherLevelCode(data.teacher_code || baseCode, targetLevel)
        : data.teacher_code || baseCode;

      // حفظ الأستاذ فوراً
      autoSaveTeacherToWallet({
        slug: data.slug || data.teacher_code || data.id,
        name: data.full_name || "الأستاذ",
        code: secureCode,
        subject: (data as any).subject,
        school: data.school_custom_name,
        levels: targetLevel ? [targetLevel] : data.levels_taught,
      });

      setAddMsg({
        type: "success",
        text: `تمت إضافة ${data.full_name || "الأستاذ"} بنجاح إلى محفظة أبنائك! 🎉`,
      });
      setNewCode("");
      setTimeout(() => setAddMsg(null), 3500);
    } catch (err: any) {
      console.error("Error adding teacher by code:", err);
      setAddMsg({
        type: "error",
        text: "تعذر التحقق من الكود حالياً، يرجى المحاولة مرة أخرى.",
      });
    } finally {
      setAddingLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="bg-white rounded-3xl border border-[#e8e8e0] shadow-sm p-5 sm:p-6 space-y-5">
      {/* الرأس */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8e8e0] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 flex items-center justify-center font-black shrink-0">
            <Heart className="w-5 h-5 fill-[#107a57]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-gray-900 text-sm sm:text-base">
                محفظة أساتذة أبنائي
              </h3>
              {wallet.length > 0 && (
                <span className="text-[10px] font-black bg-[#e6f4ee] text-[#107a57] px-2 py-0.5 rounded-full border border-[#107a57]/20">
                  {wallet.length} أستاذ محفوظ
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              محفوظة تلقائياً على هاتفك للولوج السريع دون الحاجة لإعادة كتابة الأكواد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setInquiriesListOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-black transition shadow-2xs cursor-pointer active:scale-95"
            title="متابعة استفساراتك وردود الأساتذة عليها"
          >
            <Mail className="w-3.5 h-3.5 text-purple-700" />
            <span>استفساراتي وردود الأساتذة 📨</span>
            {inquiriesCount > 0 && (
              <span className="font-mono text-[10px] bg-purple-700 text-white px-1.5 py-0.2 rounded-full font-bold">
                {inquiriesCount}
              </span>
            )}
          </button>

          {wallet.length > 0 && (
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-[#107a57] border border-emerald-200 text-xs font-black transition shadow-2xs cursor-pointer active:scale-95"
              title="مشاركة ونقل كافة أساتذة المحفظة دفعة واحدة لتجدهم في جهازك الآخر بنقرة واحدة"
            >
              <Share2 className="w-4 h-4 text-[#107a57]" />
              <span>مشاركة مع جهاز آخر 📲</span>
            </button>
          )}
        </div>
      </div>

      {/* رسالة التنبيه إن وجدت */}
      {addMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            addMsg.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {addMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <X className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{addMsg.text}</span>
        </div>
      )}

      {/* بطاقات الأساتذة المحفوظين */}
      {wallet.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {wallet.map((teacher, index) => (
            <TeacherWalletCard
              key={`${teacher.slug || teacher.code || "teacher"}-${index}`}
              teacher={teacher}
              onRemove={() => removeTeacher(teacher.slug || teacher.code)}
              onUpdateChild={(name) => updateChildName(teacher.slug || teacher.code, name)}
              onOpenInquiry={(t) => setInquiryTargetTeacher(t)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 px-4 bg-[#fafaf7] rounded-2xl border border-dashed border-[#e8e8e0] space-y-2">
          <GraduationCap className="w-8 h-8 text-gray-400 mx-auto" />
          <p className="text-xs font-black text-gray-700">
            لا يوجد أساتذة محفوظون في محفظتك حتى الآن
          </p>
          <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
            أدخل كود الأستاذ الذي سلمه لابنك في الكراس أدناه ليُحفظ تلقائياً وتتمكن من متابعة دروسه ونقاطه بنقرة واحدة دائماً.
          </p>
        </div>
      )}

      {/* حقل إضافة أستاذ جديد بالكود */}
      <div className="pt-2">
        <form onSubmit={handleAddByCode} className="space-y-2">
          <label className="block text-xs font-black text-gray-700">
            + إضافة أستاذ جديد إلى قائمتك عبر الكود:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="اكتب كود الأستاذ (مثال: MTH-101 أو ARB-205)..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs font-mono text-gray-900 placeholder:font-sans focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] transition uppercase"
            />
            <button
              type="submit"
              disabled={addingLoading || !newCode.trim()}
              className="btn-primary text-xs py-2.5 px-5 justify-center shrink-0 disabled:opacity-50"
            >
              {addingLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جارٍ التحقق...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة للمحفظة</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="pt-2 text-center text-[10px] text-gray-400 flex items-center justify-center gap-1.5">
        <span>🔒 بياناتك محفوظة محلياً في هاتفك فقط</span>
        <span>•</span>
        <span>لا يلزم أي تسجيل حساب للولي</span>
      </div>

      {/* نافذة المشاركة العائلية الفورية مع الأم أو جهاز آخر */}
      <FamilyWalletShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        wallet={wallet}
      />

      {/* نافذة إرسال استفسار للأستاذ المحدد */}
      {inquiryTargetTeacher && (
        <ParentInquiryModal
          isOpen={Boolean(inquiryTargetTeacher)}
          onClose={() => {
            setInquiryTargetTeacher(null);
            refreshInquiriesCount();
          }}
          teacher={{
            id: inquiryTargetTeacher.slug || inquiryTargetTeacher.code,
            code: inquiryTargetTeacher.code,
            name: inquiryTargetTeacher.name,
            subject: inquiryTargetTeacher.subjectName || inquiryTargetTeacher.subject || "المادة التعليمية",
            school: inquiryTargetTeacher.school,
          }}
          initialStudentName={inquiryTargetTeacher.childName}
          initialStudentGroup={(() => {
            const p = parseTeacherInputCode(inquiryTargetTeacher.code || "");
            return p.isLockedToLevel && p.level ? `${p.level}م` : undefined;
          })()}
        />
      )}

      {/* نافذة قائمة استفسارات الولي وتتبع الردود */}
      <ParentInquiriesListModal
        isOpen={inquiriesListOpen}
        onClose={() => {
          setInquiriesListOpen(false);
          refreshInquiriesCount();
        }}
      />
    </div>
  );
}

/* ─── بطاقة الأستاذ الفردية في المحفظة ─── */
function TeacherWalletCard({
  teacher,
  onRemove,
  onUpdateChild,
  onOpenInquiry,
}: {
  teacher: SavedTeacher;
  onRemove: () => void;
  onUpdateChild: (name: string) => void;
  onOpenInquiry: (teacher: SavedTeacher) => void;
}) {
  const [editingChild, setEditingChild] = useState(false);
  const [childInput, setChildInput] = useState(teacher.childName || "");

  return (
    <div className="flex flex-col justify-between bg-white rounded-2xl p-4 border border-[#e8e8e0] hover:border-[#107a57]/40 shadow-xs hover:shadow-sm transition-all group space-y-3">
      {/* الجزء العلوي: المادة والأستاذ والزر */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 flex items-center justify-center text-lg font-black shrink-0">
            {teacher.subjectIcon || "📚"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black text-[#107a57] bg-[#e6f4ee] px-2 py-0.5 rounded-md">
                {teacher.subjectName || "المادة"}
              </span>
              <span className="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {teacher.code}
              </span>
            </div>
            <h4 className="font-black text-gray-900 text-xs sm:text-sm truncate mt-0.5">
              {teacher.name}
            </h4>
          </div>
        </div>

        {/* زر الحذف */}
        <button
          onClick={onRemove}
          className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition shrink-0"
          title="إزالة هذا الأستاذ من قائمتي"
          aria-label="إزالة"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* تفاصيل المتوسطة والمستويات */}
      <div className="text-[11px] text-gray-500 space-y-0.5 bg-[#fafaf7] p-2.5 rounded-xl border border-[#e8e8e0]/70">
        <div className="flex items-center gap-1.5 truncate">
          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="truncate">{teacher.school || "المتوسطة"}</span>
        </div>
        {teacher.levelsLabel && (
          <div className="text-[10px] text-[#107a57] font-bold pr-5">
            الأقسام المعتمدة: {teacher.levelsLabel}
          </div>
        )}
      </div>

      {/* الجزء السفلي: اسم الابن وزر المراسلة وزر الدخول الفوري */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#e8e8e0]/60">
        <div className="min-w-0 flex-1">
          {editingChild ? (
            <div className="flex gap-1">
              <input
                type="text"
                value={childInput}
                onChange={(e) => setChildInput(e.target.value)}
                placeholder="اسم ابنك/ابنتك..."
                autoFocus
                className="w-24 text-[10px] border border-[#107a57] rounded-md px-1.5 py-0.5 outline-none font-bold"
              />
              <button
                onClick={() => {
                  onUpdateChild(childInput.trim());
                  setEditingChild(false);
                }}
                className="px-1.5 py-0.5 rounded bg-[#107a57] text-white text-[9px] font-bold"
              >
                حفظ
              </button>
              <button
                onClick={() => setEditingChild(false)}
                className="px-1 py-0.5 text-gray-400 text-[9px]"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingChild(true)}
              className="text-[10px] text-gray-500 hover:text-[#107a57] font-bold truncate flex items-center gap-1"
              title="تخصيص اسم الابن المتابع مع هذا الأستاذ"
            >
              <span>{teacher.childName ? `👦 ${teacher.childName}` : "+ اسم الابن"}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenInquiry(teacher)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black transition cursor-pointer active:scale-95"
            title="إرسال سؤال أو ملاحظة خاصة للأستاذ حول ابنك"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
            <span>مراسلة 💬</span>
          </button>

          {(() => {
            const parsed = parseTeacherInputCode(teacher.code || "");
            const hasLockedLevel = parsed.isLockedToLevel && parsed.level;
            const targetUrl = hasLockedLevel
              ? `/t/${teacher.slug}?code=${encodeURIComponent(teacher.code)}`
              : `/t/${teacher.slug}`;
            return (
              <Link
                href={targetUrl}
                className="btn-primary text-xs py-1.5 px-3 font-black shrink-0"
              >
                <span>{hasLockedLevel ? `دخول (${parsed.level}م)` : "دخول فوري"}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
