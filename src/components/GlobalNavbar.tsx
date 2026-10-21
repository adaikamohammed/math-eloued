"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  Users,
  Heart,
  LogIn,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
  Search,
  PanelRightClose,
  PanelRightOpen,
  Scale,
  Settings,
  Trophy,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLayout } from "@/context/LayoutContext";

export function GlobalNavbar() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { isSidebarCollapsed, toggleSidebar, isMobileMenuOpen, setIsMobileMenuOpen, user, loadingUser } =
    useLayout();

  const [searchCode, setSearchCode] = useState("");

  const handleSearchCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchCode.trim().toUpperCase();
    if (!clean) return;
    router.push(`/t/search?code=${encodeURIComponent(clean)}`);
    setSearchCode("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const getWorkspaceUrl = () => {
    if (!user) return "/login";
    if (user.role === "inspector") return "/inspector";
    if (user.role === "admin") return "/super-admin";
    return "/admin";
  };

  const getWorkspaceLabel = () => {
    if (!user) return "دخول الأستاذ";
    if (user.role === "inspector") return "فضاء التفتيش";
    if (user.role === "admin") return "لوحة المشرف";
    return "مساحتي التعليمية";
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-900/95 backdrop-blur-md border-b border-emerald-900/40 text-white shadow-md transition-all" dir="rtl">
      {/* الشريط العلوي الدقيق لمديرية التربية */}
      <div className="bg-emerald-950/80 border-b border-emerald-800/30 text-[11px] text-emerald-200/90 py-1 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide">الجمهورية الجزائرية الديمقراطية الشعبية</span>
            <span className="text-emerald-500">•</span>
            <span className="hidden sm:inline text-emerald-300">مديرية التربية لولاية الوادي</span>
            <span className="hidden md:inline text-emerald-500">•</span>
            <span className="hidden md:inline">تنسيقية مادة الرياضيات (التعليم المتوسط)</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="bg-emerald-800/50 text-emerald-200 px-2 py-0.5 rounded-full font-mono font-bold">
              ولاية الوادي (39)
            </span>
          </div>
        </div>
      </div>

      {/* الشريط الرئيسي للتنقل */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* زر طي/توسيع الشريط الجانبي + الشعار */}
        <div className="flex items-center gap-2.5">
          {/* زر تبديل الشريط الجانبي للحاسوب */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition"
            title={isSidebarCollapsed ? "فتح الشريط الجانبي" : "إغلاق الشريط الجانبي"}
            aria-label="تبديل الشريط الجانبي"
          >
            {isSidebarCollapsed ? (
              <PanelRightOpen className="w-4 h-4 text-emerald-400" />
            ) : (
              <PanelRightClose className="w-4 h-4" />
            )}
          </button>

          {/* الشعار والهوية */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-right">
              <span className="font-black text-sm sm:text-base text-white tracking-tight leading-none group-hover:text-emerald-300 transition-colors">
                رياضيات الوادي
              </span>
              <span className="text-[10px] text-emerald-400 font-medium leading-normal mt-0.5 hidden xs:inline">
                المنصة الرقمية للتعليم المتوسط
              </span>
            </div>
          </Link>
        </div>

        {/* حقل البحث السريع بكود الأستاذ في الحاسوب */}
        <div className="hidden lg:flex items-center flex-1 max-w-sm mx-4">
          <form onSubmit={handleSearchCode} className="relative w-full">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="ابحث بكود الأستاذ (مثلاً: MTH-101)..."
              className="w-full py-1.5 pl-8 pr-9 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition font-mono"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            {searchCode && (
              <button
                type="submit"
                className="absolute left-1.5 top-1 px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-500 transition"
              >
                بحث
              </button>
            )}
          </form>
        </div>

        {/* أزرار حساب المستخدم والدخول */}
        <div className="flex items-center gap-2">
          {loadingUser ? (
            <div className="w-24 h-8 bg-slate-800 animate-pulse rounded-xl" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                href={getWorkspaceUrl()}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                <span className="hidden sm:inline">{getWorkspaceLabel()}</span>
                {user.code && (
                  <span className="bg-black/25 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                    {user.code}
                  </span>
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-700/60 transition"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="py-2 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">تسجيل الدخول</span>
              </Link>
              <Link
                href="/register"
                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
              >
                <GraduationCap className="w-4 h-4" />
                <span>حساب الأستاذ</span>
              </Link>
            </div>
          )}

          {/* زر القائمة للهاتف (روابط ثانوية) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60"
            aria-label="القائمة الجانبية"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* قائمة الهاتف الإضافية المنسدلة */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900/98 px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* حقل البحث بكود الأستاذ في الهاتف */}
          <form onSubmit={handleSearchCode} className="relative">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="ابحث بكود الأستاذ (مثال: MTH-101)..."
              className="w-full py-2.5 pl-8 pr-9 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 font-mono"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          </form>

          <div className="space-y-1 pt-1">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>الرئيسية</span>
            </Link>
            <Link
              href="/assessment"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800"
            >
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>ميثاق التقويم المستمر (20/20) ⚖️</span>
            </Link>
            <Link
              href="/forum"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>ملتقى أساتذة الرياضيات 💬</span>
            </Link>
            <Link
              href="/my-children"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800"
            >
              <Heart className="w-4 h-4 text-rose-400" />
              <span>فضاء ومحفظة الأولياء 👨‍👩‍👧‍👦</span>
            </Link>
            <Link
              href="/honor"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>لوحة الشرف والمتفوقين 🏆</span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800"
            >
              <Settings className="w-4 h-4 text-teal-400" />
              <span>تخصيص الفضاء والميزات ⚙️</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
