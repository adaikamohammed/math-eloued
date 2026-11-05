"use client";

import React, { useState } from "react";
import { Bell, BellRing, BellOff, CheckCircle2, AlertCircle, Sparkles, Send } from "lucide-react";
import { useWebNotifications } from "@/lib/useWebNotifications";

export function NotificationSettingsCard() {
  const { permission, isSupported, requestPermission, sendNotification } = useWebNotifications();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleEnable = async () => {
    const res = await requestPermission();
    if (res === "granted") {
      setTestResult("تم تفعيل الإشعارات بنجاح! يمكنك الآن تجربة إرسال إشعار ✨");
    } else if (res === "denied") {
      setTestResult("تم حظر الإشعارات. يرجى تفعيلها من إعدادات المتصفح/الهاتف.");
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    setTestResult(null);

    const ok = await sendNotification(
      "منصة جسور التعليمية 🔔",
      "تم تفعيل الإشعارات الذكية بنجاح! ستصلك تنبيهات الواجبات والرسائل لحظياً ✨",
      "/admin"
    );

    if (ok) {
      setTestResult("تم إرسال الإشعار بنجاح! تفقد أعلى شاشتك أو مركز الإشعارات 📲");
    } else {
      setTestResult("تعذر إظهار الإشعار. يرجى التأكد من منح الإذن للمتصفح.");
    }
    setTesting(false);
  };

  return (
    <div
      dir="rtl"
      className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              permission === "granted"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {permission === "granted" ? (
              <BellRing className="w-5 h-5 text-emerald-700 animate-bounce" />
            ) : (
              <Bell className="w-5 h-5 text-amber-700" />
            )}
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <span>إشعارات الويب الذكية (Web Push)</span>
              {permission === "granted" && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  مفعلة 🔔
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              تلقي تنبيهات فورية بالواجبات، رسائل الأولياء، واستفسارات الإدارة حتى عند إغلاق التطبيق.
            </p>
          </div>
        </div>
      </div>

      {!isSupported ? (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <span>المتصفح الحالي لا يدعم إشعارات الويب أو أنك تتصفح في الوضع الخفي.</span>
        </div>
      ) : permission === "granted" ? (
        <div className="space-y-3">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>جهازك جاهز لاستقبال كافة التنبيهات التربوية الذكية في الوقت الفعلي.</span>
            </div>
          </div>

          <button
            onClick={handleTestNotification}
            disabled={testing}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{testing ? "جاري الإرسال..." : "إرسال إشعار تجريبي فوري 🔔"}</span>
          </button>
        </div>
      ) : permission === "denied" ? (
        <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <BellOff className="w-4 h-4 text-rose-600 shrink-0" />
            <span>الإشعارات محظورة في هذا المتصفح</span>
          </div>
          <p className="text-[11px] text-rose-700">
            لتفعيلها: اضغط على أيقونة القفل أو الإعدادات بجانب شريط الرابط أعلى المتصفح، ثم اختر
            السماح بالإشعارات (Allow Notifications).
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-700 font-medium">
            لم يتم تفعيل الإشعارات بعد على هذا الجهاز.
          </span>
          <button
            onClick={handleEnable}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>تفعيل الإشعارات الآن 🔔</span>
          </button>
        </div>
      )}

      {testResult && (
        <p className="text-xs font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 animate-in fade-in">
          {testResult}
        </p>
      )}
    </div>
  );
}
