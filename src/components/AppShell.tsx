"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutProvider, useLayout } from "@/context/LayoutContext";
import { GlobalNavbar } from "@/components/GlobalNavbar";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { layoutFor } from "@/lib/layoutMode";

// ─── المسارات الداخلية الخاصة بلوحات تحكم الأساتذة والمفتشين والإدارة ───
// هذه المسارات فقط هي التي يظهر فيها الشريط الجانبي (DesktopSidebar) والهيدر الداخلي
const DASHBOARD_ROUTES = [
  "/admin",
  "/super-admin",
  "/inspector",
  "/principal",
  "/settings",
  "/forum",
  "/pedagogy",
  "/eval",
  "/messages",
  "/honor",
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <React.Suspense
        fallback={
          <div
            className="min-h-screen bg-[#fafaf7] text-[#1a1a2e] font-sans antialiased"
            dir="rtl"
            suppressHydrationWarning
          >
            {children}
          </div>
        }
      >
        <AppShellContent>{children}</AppShellContent>
      </React.Suspense>
    </LayoutProvider>
  );
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const routerPathname = usePathname();
  const searchParams = useSearchParams();
  const pathname =
    routerPathname ||
    (typeof window !== "undefined" ? window.location.pathname : "/");
  const { user } = useLayout();

  // فحص ما إذا كان الرابط مخصصاً للولي أو الزائر العام (بدون شريط جانبي ولا هيدر إدارة):
  // 1. /messages/send (إرسال رسالة سرية مخصصة للأولياء والتلاميذ)
  // 2. /honor عند تصفح رابط أستاذ معين (?teacher=) أو عندما لا يكون الزائر مسجلاً بحساب أستاذ
  const hasTeacherParam = Boolean(
    searchParams?.get("teacher") ||
      (typeof window !== "undefined" && window.location.search.includes("teacher="))
  );

  const isParentHonorView =
    pathname.startsWith("/honor") && (hasTeacherParam || !user);

  // فحص ما إذا كان المسار الحالي لوحة تحكم داخلية للأستاذ/المفتش
  const isDashboardRoute =
    pathname !== "/messages/send" &&
    !isParentHonorView &&
    DASHBOARD_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    );

  // ─── 1. الصفحات العامة للأولياء، صفحة الهبوط، فضاء الأستاذ، التسجيل، والدخول ───
  // لا يظهر فيها الشريط الجانبي ولا أدوات الإدارة؛ فقط محتوى الصفحة المستقل
  if (!isDashboardRoute) {
    return (
      <div
        className="min-h-screen bg-[#fafaf7] text-[#1a1a2e] font-sans antialiased"
        dir="rtl"
        suppressHydrationWarning
      >
        {children}
      </div>
    );
  }

  // ─── 2. لوحة تحكم الأستاذ والمفتش (Dashboard Shell بكامل الارتفاع والشريط الجانبي) ───
  const mode = layoutFor(pathname);

  return (
    <div
      className="flex h-screen bg-[#fafaf7] text-[#1a1a2e] overflow-hidden"
      dir="rtl"
      suppressHydrationWarning
    >
      {/* ── الشريط الجانبي (على اليمين، بكامل الارتفاع h-screen) ── */}
      <DesktopSidebar />

      {/* ── العمود الرئيسي لمحتوى لوحة التحكم (على اليسار) ── */}
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
            منصة جسور التعليمية — حيث يلتقي الأستاذ، الولي، والتلميذ
          </footer>
        </main>
      </div>

      {/* شريط التنقل السفلي للهاتف داخل لوحة التحكم */}
      <MobileBottomNav />
    </div>
  );
}
