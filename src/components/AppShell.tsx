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
    <div
      className="flex h-screen bg-[#fafaf7] text-[#1a1a2e] overflow-hidden"
      dir="rtl"
    >
      {/* ── الشريط الجانبي (على اليمين، بكامل الارتفاع h-screen) ── */}
      <DesktopSidebar />

      {/* ── العمود الرئيسي للمحتوى (على اليسار) ── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* الهيدر بارتفاع h-16 مطابق لرأس الشريط الجانبي تماماً دون أي انقطاع */}
        <GlobalNavbar />

        {/* مساحة المحتوى القابلة للتمرير مع الحفاظ على الهيدر والشريط ثابتين */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-24 lg:pb-8 app-main-content">
          <div
            className={`w-full mx-auto transition-all ${
              mode === "full" ? "max-w-7xl" : mode === "wide" ? "max-w-6xl" : "max-w-5xl"
            }`}
          >
            {children}
          </div>

          <footer className="mt-12 text-center text-xs text-gray-400 py-4 border-t border-[#e8e8e0] hidden md:block">
            منصة جسور التعليمية — المنصة الرقمية الموحدة للتعليم المتوسط • مديرية التربية لولاية الوادي
          </footer>
        </main>
      </div>

      {/* زر الوصول السريع للأستاذ */}
      <TeacherAccess />

      {/* شريط التنقل السفلي للهاتف كالتطبيقات الذكية */}
      <MobileBottomNav />
    </div>
  );
}
