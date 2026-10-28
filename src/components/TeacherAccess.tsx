"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Sparkles, ExternalLink, X, ClipboardCheck, Settings, CheckCircle2 } from "lucide-react";

export function TeacherAccess() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [role, setRole] = useState<string | null>(null);

  // حالة جلسة الأستاذ (حساب المنصة) عند فتح النافذة
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/auth", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setIsAuthenticated(Boolean(data.authenticated));
        setRole(data.role ?? null);
        setTeacherName(data.profile?.full_name || "");
      })
      .catch(() => setIsAuthenticated(false));
  }, [isOpen]);

  return (
    <>
      {/* زر سري أنيق وغير مزعج في أسفل الصفحة */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 lg:bottom-4 left-3 lg:left-4 z-30 p-2.5 rounded-full bg-white/95 hover:bg-[#e6f4ee] text-gray-500 hover:text-[#107a57] border border-[#e8e8e0] shadow-sm backdrop-blur-md transition group"
        title="دخول خاص بالأستاذ"
        aria-label="دخول الأستاذ"
      >
        <Lock className="w-4 h-4 group-hover:scale-110 transition-transform" />
      </button>

      {/* النافذة المنبثقة لمنطقة الأستاذ */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 fade-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">{teacherName ? `فضاء ${teacherName}` : "فضاء الأستاذ"}</h3>
                  <p className="text-[10px] text-slate-400">لوحة الإدارة والتقييم الميداني</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isAuthenticated ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {role === "inspector" || role === "principal" || role === "admin"
                    ? "أنت مسجل بحساب إشرافي. انتقل إلى لوحتك:"
                    : "سجّل الدخول بحسابك على المنصة للوصول إلى أدوات الأستاذ:"}
                </p>
                <Link
                  href={role === "inspector" ? "/inspector" : role === "principal" ? "/principal" : role === "admin" ? "/super-admin" : "/login"}
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-sm"
                >
                  {role === "inspector" ? "لوحة المفتش" : role === "principal" ? "فضاء إدارة المؤسسة" : role === "admin" ? "لوحة المشرف العام" : "تسجيل الدخول"}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>تم تسجيل الدخول بنجاح! اختر وجهتك:</span>
                </div>

                {/* خيار 1: دفتر التقييم الميداني السريع للهاتف */}
                <Link
                  href="/eval"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white hover:opacity-95 transition shadow-sm group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg font-black shrink-0">
                    ⚡
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black flex items-center gap-1.5">
                      <span>دفتر التقييم الميداني السريع</span>
                      <span className="bg-amber-400 text-slate-900 px-1.5 py-0.2 rounded text-[9px] font-black">
                        للهاتف 📱
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-100 mt-0.5 line-clamp-1">
                      تفقد الكراريس والواجبات والمعدلات التلقائية
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-emerald-200 group-hover:text-white transition" />
                </Link>

                {/* خيار 2: لوحة التحكم الكاملة */}
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Settings className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black">لوحة التحكم الكاملة</div>
                    <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-1">
                      رفع الدروس وصور السبورة وحلول الواجبات والخصومات
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white transition" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
