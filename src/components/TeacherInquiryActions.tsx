"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Mail, MessageSquare } from "lucide-react";
import { ParentInquiryModal } from "./ParentInquiryModal";
import { ParentInquiriesListModal } from "./ParentInquiriesListModal";
import { getLocalInquiries } from "@/lib/parentInquiriesStore";

interface TeacherInquiryActionsProps {
  teacherId: string;
  teacherCode: string;
  teacherName: string;
  subject: string;
  availableLevels?: number[];
  defaultLevel?: number;
  compact?: boolean;
}

export function TeacherInquiryActions({
  teacherId,
  teacherCode,
  teacherName,
  subject,
  availableLevels,
  defaultLevel,
  compact = false,
}: TeacherInquiryActionsProps) {
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [localCount, setLocalCount] = useState(0);

  const refreshCount = () => {
    try {
      const list = getLocalInquiries();
      setLocalCount(list.length);
    } catch {
      setLocalCount(0);
    }
  };

  useEffect(() => {
    refreshCount();
    const handler = () => refreshCount();
    window.addEventListener("math_parent_inquiries_updated", handler);
    return () => window.removeEventListener("math_parent_inquiries_updated", handler);
  }, []);

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInquiryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-xs cursor-pointer active:scale-95"
            title="إرسال سؤال أو ملاحظة تربوية للأستاذ حول ابنك"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>مراسلة الأستاذ 💬</span>
          </button>

          {localCount > 0 && (
            <button
              type="button"
              onClick={() => setListModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-200 cursor-pointer"
              title="متابعة الردود على استفساراتك"
            >
              <Mail className="w-3 h-3 text-emerald-600" />
              <span className="font-mono text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                {localCount}
              </span>
            </button>
          )}
        </div>

        <ParentInquiryModal
          isOpen={inquiryModalOpen}
          onClose={() => {
            setInquiryModalOpen(false);
            refreshCount();
          }}
          teacher={{
            id: teacherId,
            code: teacherCode,
            name: teacherName,
            subject,
          }}
          initialStudentGroup={defaultLevel ? `${defaultLevel}م` : undefined}
        />

        <ParentInquiriesListModal
          isOpen={listModalOpen}
          onClose={() => {
            setListModalOpen(false);
            refreshCount();
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setInquiryModalOpen(true)}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 transition shadow-sm hover:shadow-md cursor-pointer active:scale-[0.99]"
        >
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200" />
          <span>استفسار تربوي للأستاذ (خاص ومباشر) 💬</span>
        </button>

        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="text-[11px] text-slate-600 font-medium">
            🔒 لا يظهر سؤالك لغير هذا الأستاذ حصراً
          </span>

          <button
            type="button"
            onClick={() => setListModalOpen(true)}
            className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Mail className="w-3 h-3 text-emerald-600" />
            <span>متابعة استفساراتي وردود الأستاذ</span>
            {localCount > 0 && (
              <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
                {localCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <ParentInquiryModal
        isOpen={inquiryModalOpen}
        onClose={() => {
          setInquiryModalOpen(false);
          refreshCount();
        }}
        teacher={{
          id: teacherId,
          code: teacherCode,
          name: teacherName,
          subject,
        }}
        initialStudentGroup={defaultLevel ? `${defaultLevel}م` : undefined}
      />

      <ParentInquiriesListModal
        isOpen={listModalOpen}
        onClose={() => {
          setListModalOpen(false);
          refreshCount();
        }}
      />
    </>
  );
}
