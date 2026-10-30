"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  Search,
  LogIn,
  LogOut,
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  User,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLayout } from "@/context/LayoutContext";
import { clearInspectionCache } from "@/app/inspector/shared";

// ─── خريطة عناوين الصفحات المستوحاة من منصة فرسان القرآن ─────────
const PAGE_INFO: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "منصة جسور التعليمية",
    subtitle: "حيث يلتقي الأستاذ، الولي، والتلميذ",
  },
  "/t/search": {
    title: "دليل الأساتذة",
    subtitle: "البحث بالرمز التعريفي للأستاذ والولوج للمساحات التعليمية",
  },
  "/my-children": {
    title: "فضاء الأولياء",
    subtitle: "متابعة وتقويم الأبناء والتواصل التربوي المستمر",
  },
  "/parents": {
    title: "فضاء الأولياء والمتابعة",
    subtitle: "دفتر المتابعة والنقاط وملاحظات الأساتذة",
  },
  "/honor": {
    title: "لوحة الشرف وتكريم النوابغ",
    subtitle: "نخبة التلاميذ والتحفيز المستمر على التميز",
  },
  "/forum": {
    title: "ملتقى الأساتذة البيداغوجي",
    subtitle: "فضاء التبادل والتطوير المهني وتبادل المذكرات",
  },
  "/inspector": {
    title: "فضاء التفتيش والمناشير",
    subtitle: "المقاطعات التربوية والتعليمات والمذكرات الرسمية",
  },
  "/admin": {
    title: "لوحة تحكم الأستاذ",
    subtitle: "إدارة الأفواج والدروس وتدوين علامات التقويم",
  },
  "/admin/students": {
    title: "إدارة الأفواج والتلاميذ",
    subtitle: "إدراج قوائم التلاميذ والترتيب الأبجدي الآلي وطباعة القوائم",
  },
  "/admin/timetable": {
    title: "جدول التوقيت وساعة الاستقبال",
    subtitle: "تنظيم النصاب الساعي وتوزيع الحصص وموعد الاستقبال الرسمي",
  },
  "/admin/diary": {
    title: "الدفتر اليومي ودفتر النصوص",
    subtitle: "توثيق الحصص اليومية ومؤشرات الكفاءة والواجبات المنزلية",
  },
  "/admin/board": {
    title: "كراس الدروس والسبورة الرقمية",
    subtitle: "رفع صور السبورة اليومية والملخصات لخدمة التلميذ الغائب",
  },
  "/super-admin": {
    title: "لوحة المشرف العام",
    subtitle: "إدارة المقاطعات والأساتذة وإحصائيات الولاية",
  },
  "/settings": {
    title: "تخصيص الفضاء والميزات",
    subtitle: "تخصيص هوية الأستاذ والأقسام المعروضة للأولياء",
  },
  "/login": {
    title: "تسجيل الدخول",
    subtitle: "الولوج إلى الحساب التربوي المعتمد",
  },
  "/register": {
    title: "إنشاء حساب أستاذ",
    subtitle: "الانضمام إلى الأسرة التربوية في منصة جسور",
  },
  "/announcement": {
    title: "الإعلانات والمستجدات",
    subtitle: "آخر التنبيهات والبلاغات المدرسية والتربوية",
  },
  "/pedagogy": {
    title: "الموارد البيداغوجية",
    subtitle: "المذكرات النموذجية والتوزيعات السنوية المعتمدة",
  },
  "/penalties": {
    title: "سجل الانضباط والملاحظات",
    subtitle: "متابعة السلوك والمواظبة داخل المؤسسة",
  },
  "/messages": {
    title: "الرسائل والتواصل",
    subtitle: "قنوات التواصل المباشر بين الأساتذة والأولياء",
  },
  "/privacy": {
    title: "سياسة الخصوصية وحماية المعطيات",
    subtitle: "الامتثال للقانون الجزائري 18-07 وحماية بيانات الأطفال 15-12",
  },
};

function getPageInfo(pathname: string): { title: string; subtitle: string } {
  if (PAGE_INFO[pathname]) return PAGE_INFO[pathname];

  // صفحات فرعية لملفات الأستاذ /t/[slug]
  if (pathname.startsWith("/t/")) {
    return {
      title: "الفضاء التربوي للأستاذ",
      subtitle: "المستندات والدروس ونقاط التقويم المستمر للأفواج",
    };
  }

  // البحث في المسارات الجزئية
  for (const [key, val] of Object.entries(PAGE_INFO)) {
    if (key !== "/" && pathname.startsWith(key)) return val;
  }

  return {
    title: "منصة جسور التعليمية",
    subtitle: "حيث يلتقي الأستاذ، الولي، والتلميذ",
  };
}

export function GlobalNavbar() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const {
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    user,
    loadingUser,
  } = useLayout();

  const [searchCode, setSearchCode] = useState("");
  const [isSharedSession, setIsSharedSession] = useState(false);
  const pageInfo = getPageInfo(pathname);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSharedSession(sessionStorage.getItem("jusoor_shared_device") === "true");
    }
  }, [user]);

  const handleSearchCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchCode.trim().toUpperCase();
    if (!clean) return;
    router.push(`/t/search?code=${encodeURIComponent(clean)}`);
    setSearchCode("");
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("teacher_feature_flags_cache");
      clearInspectionCache();
      sessionStorage.clear();
    } catch {}
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const getWorkspaceUrl = () => {
    if (!user) return "/login";
    if (user.role === "inspector") return "/inspector";
    if (user.role === "principal") return "/principal";
    if (user.role === "admin") return "/super-admin";
    return "/admin";
  };

  const getWorkspaceLabel = () => {
    if (!user) return "دخول الأستاذ";
    if (user.role === "inspector") return "فضاء التفتيش";
    if (user.role === "principal") return "فضاء إدارة المؤسسة";
    if (user.role === "admin") return "المشرف العام";
    return "لوحة الأستاذ";
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#e8e8e0] px-4 sm:px-6 transition-colors duration-200 shrink-0">
      <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
        {/* الجانب الأيمن: زر القائمة للهاتف + عنوان الصفحة الديناميكي */}
        <div className="flex items-center gap-3 min-w-0">
          {/* زر فتح القائمة الجانبية في الهاتف والأجهزة اللوحية */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors shrink-0"
            aria-label="القائمة الجانبية"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* عنوان الصفحة ووصفها الدقيق بنمط منصة فرسان القرآن */}
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black text-gray-900 leading-tight truncate">
              {pageInfo.title}
            </h1>
            <p className="text-[11px] text-gray-500 font-medium hidden sm:block truncate mt-0.5">
              {pageInfo.subtitle}
            </p>
          </div>
        </div>

        {/* المنتصف واليسار: البحث بكود الأستاذ + أزرار المستخدم */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* البحث السريع بكود الأستاذ */}
          <form onSubmit={handleSearchCode} className="relative hidden md:block">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="ابحث بكود الأستاذ..."
              className="w-40 lg:w-56 py-1.5 pl-7 pr-8 rounded-xl bg-[#fafaf7] border border-[#e8e8e0] text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#107a57]/20 focus:border-[#107a57] font-mono transition"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
            {searchCode && (
              <button
                type="submit"
                className="absolute left-1 top-1 px-1.5 py-0.5 rounded-lg bg-[#107a57] text-white text-[10px] font-bold hover:bg-[#0a5c40] transition"
              >
                بحث
              </button>
            )}
          </form>

          {/* حساب المستخدم وأزرار الدخول */}
          {loadingUser ? (
            <div className="w-24 h-9 bg-gray-100 animate-pulse rounded-xl" />
          ) : user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isSharedSession && (
                <span
                  className="hidden md:inline-flex items-center gap-1 text-[10px] font-black text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-1 rounded-xl shadow-2xs"
                  title="جلسة مؤقتة على حاسوب مشترك — سيتم مسح الأثر عند تسجيل الخروج"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>حاسوب مشترك</span>
                </span>
              )}
              <Link
                href={getWorkspaceUrl()}
                className="flex items-center gap-2 py-1.5 px-3 rounded-xl bg-[#e6f4ee] hover:bg-[#d5eee2] text-[#107a57] border border-[#107a57]/20 text-xs font-bold transition shadow-2xs group"
                title="الانتقال للمساحة التعليمية"
              >
                <div className="w-6 h-6 rounded-lg bg-[#107a57] text-white flex items-center justify-center text-[11px] font-black shrink-0">
                  {user.fullName.charAt(0) || "أ"}
                </div>
                <span className="hidden sm:inline font-black truncate max-w-[120px]">
                  {getWorkspaceLabel()}
                </span>
                {user.code && (
                  <span className="hidden md:inline bg-white/80 text-[#107a57] text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border border-[#107a57]/20">
                    {user.code}
                  </span>
                )}
              </Link>

              <button
                onClick={handleLogout}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 border border-transparent hover:border-red-200 flex items-center justify-center transition-colors"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/login"
                className="btn-primary text-xs py-1.5 px-3.5"
                title="تسجيل دخول الأستاذ أو المفتش"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول الأستاذ</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
