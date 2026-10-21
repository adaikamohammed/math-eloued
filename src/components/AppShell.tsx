"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { LayoutProvider } from "@/context/LayoutContext";
import { GlobalNavbar } from "@/components/GlobalNavbar";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { TeacherAccess } from "@/components/TeacherAccess";
import { layoutFor } from "@/lib/layoutMode";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <AppShellContent>{children}</AppShellContent>
    </LayoutProvider>
  );
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const mode = layoutFor(pathname);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans" dir="rtl">
      {/* الهيدر العلوي للمنصة في الحاسوب والهاتف */}
      <GlobalNavbar />

      {/* الحاوية الرئيسية: شريط جانبي يفتح ويغلق على اليمين + المحتوى */}
      <div className="flex-1 flex w-full">
        {/* الشريط الجانبي للحاسوب (قابل للطي والتوسيع) */}
        <DesktopSidebar />

        {/* مساحة المحتوى مع padding سفلي كافٍ للهاتف لمنع حجب العناصر */}
        <div className="flex-1 min-w-0 flex flex-col">
          <main
            className={`flex-1 w-full mx-auto px-2 sm:px-4 md:px-6 py-4 pb-24 md:pb-10 transition-all ${
              mode === "full" ? "max-w-7xl" : mode === "wide" ? "max-w-6xl" : "max-w-2xl"
            }`}
          >
            {children}
          </main>

          <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200/60 hidden md:block">
            منصة رياضيات ولاية الوادي — مديرية التربية للجمهورية الجزائرية الديمقراطية الشعبية
          </footer>
        </div>
      </div>

      {/* زر الوصول السريع للأستاذ */}
      <TeacherAccess />

      {/* شريط التنقل السفلي للهاتف كالتطبيقات الذكية */}
      <MobileBottomNav />
    </div>
  );
}
