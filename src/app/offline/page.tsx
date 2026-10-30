"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { WifiOff, RotateCcw, Home, ClipboardCheck, Search, BookOpen, CheckCircle2 } from "lucide-react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      window.location.reload();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setChecking(true);
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        setChecking(false);
      }
    }, 600);
  };

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-4 py-12" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl p-6 sm:p-8 text-center space-y-6">
        {/* أيقونة الحالة والشعار */}
        <div className="relative inline-block mx-auto">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner">
            <Image
              src="/icon.svg"
              alt="شعار منصة جسور التعليمية"
              width={52}
              height={52}
              className="drop-shadow-sm"
              priority
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md border-2 border-white">
            <WifiOff className="w-4 h-4" />
          </div>
        </div>

        {/* النصوص التوضيحية */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
            <WifiOff className="w-3.5 h-3.5" />
            <span>وضع العمل بدون إنترنت (أوفلاين)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800">
            منصة جسور التعليمية
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            المنصة مخزنة محلياً في ذاكرة جهازك مع الخط العربي المعتمد. يمكنك الاستمرار في تصفح الصفحات واستخدام أدوات المتابعة والتقويم المحفوظة مسبقاً.
          </p>
        </div>

        {/* مميزات وضع الأوفلاين في منصة جسور */}
        <div className="bg-slate-50/80 rounded-2xl p-3.5 text-right space-y-2 border border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>الخط العربي وصفحات المنصة مثبتة محلياً على جهازك</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تفقد الكراريس وتسجيل الملاحظات يعمل بدون الحاجة لإنترنت</span>
          </div>
        </div>

        {/* روابط الصفحات المحفوظة للأوفلاين */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-bold text-slate-400">الصفحات المتاحة دون اتصال:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
            >
              <Home className="w-4 h-4 text-emerald-700" />
              <span>الرئيسية</span>
            </Link>

            <Link
              href="/eval"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-700" />
              <span>التقويم السريع</span>
            </Link>

            <Link
              href="/t/search"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
            >
              <Search className="w-4 h-4 text-emerald-700" />
              <span>البحث عن أستاذ</span>
            </Link>

            <Link
              href="/assessment"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
            >
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <span>معايير التقويم</span>
            </Link>
          </div>
        </div>

        {/* زر إعادة المحاولة */}
        <div className="pt-2">
          <button
            onClick={handleRetry}
            disabled={checking}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-lg shadow-emerald-700/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-60"
          >
            <RotateCcw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            <span>{checking ? "جاري التحقق من الشبكة..." : "إعادة محاولة الاتصال"}</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          منصة جسور التعليمية — حيث يلتقي الأستاذ، الولي، والتلميذ
        </p>
      </div>
    </main>
  );
}
