"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  Download,
  Clock,
  Phone,
  Mail,
  Building2,
  MapPin,
  Loader2,
  AlertCircle,
  X,
  GraduationCap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/lib/types";

interface PendingTeacher extends UserProfile {
  phone?: string;
  verification_doc_url?: string;
  verification_status?: string;
  rejection_reason?: string;
}

export function ApprovalsTab({ onUpdate }: { onUpdate?: () => void }) {
  const [pendingList, setPendingList] = useState<PendingTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      // جلب الحسابات غير المفعلة
      const { data, error } = await supabase
        .from("profiles")
        .select("*, profile_contacts(phone)")
        .eq("role", "teacher")
        .eq("is_verified", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: PendingTeacher[] = (data || []).map((p: any) => ({
        ...p,
        phone: p.profile_contacts?.[0]?.phone || p.phone,
      }));

      setPendingList(formatted);
    } catch (err: any) {
      console.error("Failed to load pending teachers:", err);
      showToast("error", "فشل جلب طلبات الانضمام");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  // معاينة الوثيقة الإثباتية
  const handlePreviewDoc = async (teacher: PendingTeacher) => {
    if (!teacher.verification_doc_url) {
      showToast("error", "لم يقم هذا الأستاذ برفع وثيقة إثبات");
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from("verification-docs")
        .createSignedUrl(teacher.verification_doc_url, 3600);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "تعذر توليد رابط المعاينة");
      }

      setPreviewTitle(`وثيقة إثبات الأستاذ: ${teacher.full_name || ""}`);
      setPreviewUrl(data.signedUrl);
    } catch (err: any) {
      console.error("Preview error:", err);
      showToast("error", "تعذر فتح الوثيقة، قد تكون حذفت أو انتهت صلاحية الرابط");
    }
  };

  // اعتماد وتفعيل الحساب
  const handleApprove = async (teacher: PendingTeacher) => {
    const teacherName = teacher.full_name || "الأستاذ";
    if (!confirm(`هل أنت متأكد من اعتماد وتفعيل حساب الأستاذ "${teacherName}"؟ سيتمكن من دخول المنصة فوراً.`)) {
      return;
    }

    setActingId(teacher.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_verified: true,
          verification_status: "approved",
          rejection_reason: null,
        })
        .eq("id", teacher.id);

      if (error) throw error;

      // تسجيل في سجل العمليات
      await supabase.from("admin_audit_log").insert({
        action: "teacher_verified",
        target_id: teacher.id,
        details: { teacher_name: teacherName, district: teacher.district_id },
      });

      showToast("success", `تم اعتماد الأستاذ ${teacherName} بنجاح ✅`);
      setPendingList((prev) => prev.filter((p) => p.id !== teacher.id));
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error("Approval error:", err);
      showToast("error", err.message || "فشل اعتماد الحساب");
    } finally {
      setActingId(null);
    }
  };

  // رفض طلب الانضمام
  const handleRejectConfirm = async () => {
    if (!rejectModal) return;

    setActingId(rejectModal.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_verified: false,
          verification_status: "rejected",
          rejection_reason: rejectReason.trim() || "الوثيقة المرفقة غير واضحة أو ناقصة",
        })
        .eq("id", rejectModal.id);

      if (error) throw error;

      await supabase.from("admin_audit_log").insert({
        action: "teacher_rejected",
        target_id: rejectModal.id,
        details: { teacher_name: rejectModal.name, reason: rejectReason.trim() },
      });

      showToast("success", `تم رفض طلب ${rejectModal.name}`);
      setPendingList((prev) => prev.filter((p) => p.id !== rejectModal.id));
      setRejectModal(null);
      setRejectReason("");
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error("Rejection error:", err);
      showToast("error", err.message || "فشل رفض الطلب");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">
      {/* ─── Toast ─── */}
      {toast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* ─── الترويسة والإحصائية ─── */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-800 font-black text-lg">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h2>طلبات الانضمام والتحقق من الهوية المهنية</h2>
          </div>
          <p className="text-xs text-slate-500">
            مراجعة السير الذاتية والوثائق المرفقة لأساتذة الرياضيات الجدد لاعتماد حساباتهم رسمياً
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black">
            {pendingList.length} طلبات بانتظار التدقيق
          </span>
          <button
            onClick={loadPending}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
            title="تحديث القائمة"
          >
            تحديث
          </button>
        </div>
      </div>

      {/* ─── قائمة الطلبات المعلقة ─── */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs text-slate-500 font-bold">جارٍ فحص طلبات الانضمام الجديدة...</p>
        </div>
      ) : pendingList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-black text-slate-800 text-sm">لا توجد طلبات معلقة حالياً</h3>
          <p className="text-xs text-slate-500">
            كافة طلبات الأساتذة تم تدقيقها واعتمادها بنجاح.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingList.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 space-y-4 hover:border-emerald-300 transition"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-base">{teacher.full_name || "أستاذ مسجل"}</span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200/60">
                      قيد التدقيق
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{teacher.teacher_code || "MTH"}</span>
                  </div>
                </div>

                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>

              {/* تفاصيل البيانات البيداغوجية */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">المقاطعة {teacher.district_id || "غير محددة"}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl">
                  <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="truncate">{teacher.school_custom_name || "متوسطة غير محددة"}</span>
                </div>
                {teacher.phone && (
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl font-mono">
                    <Phone className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>{teacher.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    {teacher.created_at
                      ? new Date(teacher.created_at).toLocaleDateString("ar-DZ")
                      : "تاريخ غير مسجل"}
                  </span>
                </div>
              </div>

              {/* زر معاينة الوثيقة الإثباتية */}
              <div className="pt-1">
                {teacher.verification_doc_url ? (
                  <button
                    onClick={() => handlePreviewDoc(teacher)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <span>معاينة الوثيقة الإثباتية / السيرة الذاتية (CV)</span>
                  </button>
                ) : (
                  <div className="p-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold text-center">
                    ⚠️ لم يرفق وثيقة إثبات عند التسجيل
                  </div>
                )}
              </div>

              {/* أزرار الإجراء: اعتماد أو رفض */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  disabled={actingId === teacher.id}
                  onClick={() => handleApprove(teacher)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-700/20 disabled:opacity-50 transition cursor-pointer"
                >
                  {actingId === teacher.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>اعتماد وتفعيل الحساب</span>
                </button>

                <button
                  disabled={actingId === teacher.id}
                  onClick={() => setRejectModal({ id: teacher.id, name: teacher.full_name || "الأستاذ" })}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-200 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>رفض</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── نافذة معاينة الوثيقة (Preview Modal) ─── */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 shadow-2xl space-y-3 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm truncate">{previewTitle}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>فتح برابط خارجي</span>
                </a>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl bg-slate-100 border border-slate-200 min-h-[400px] flex items-center justify-center">
              {previewUrl.toLowerCase().includes(".pdf") ? (
                <iframe src={previewUrl} className="w-full h-[550px] rounded-xl" title="معاينة الوثيقة" />
              ) : (
                <img
                  src={previewUrl}
                  alt="وثيقة الأستاذ"
                  className="max-h-[550px] w-auto mx-auto object-contain rounded-xl shadow-xs"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة تحديد سبب الرفض ─── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">رفض طلب الانضمام</h3>
                <p className="text-xs text-slate-500">للأستاذ: {rejectModal.name}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                سبب الرفض (يظهر للأستاذ عند محاولة الدخول)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="مثال: الوثيقة المرفقة غير واضحة، أو يرجى إرفاق شهادة عمل حديثة..."
                className="w-full min-h-24 p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRejectModal(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleRejectConfirm}
                className="py-2 px-4 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 cursor-pointer"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
