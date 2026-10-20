"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  Users,
  Compass,
  Heart,
  LogIn,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
  BookOpen,
  ChevronDown,
  User,
  SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type UserRole = "teacher" | "inspector" | "admin" | null;

interface UserSessionInfo {
  id: string;
  fullName: string;
  role: UserRole;
  code?: string;
}

export function GlobalNavbar() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // جلب معلومات الجلسة الحالية
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, role, teacher_code")
          .eq("id", session.user.id)
          .maybeSingle();

        if (isMounted && profile) {
          setUser({
            id: profile.id,
            fullName: profile.full_name || "مستخدم المنصة",
            role: profile.role as UserRole,
            code: profile.teacher_code,
          });
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // إغلاق قائمة الهاتف عند تغيير الصفحة
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  };

  const navLinks = [
    { label: "الرئيسية", href: "/", icon: Sparkles },
    { label: "ملتقى الأساتذة", href: "/forum", icon: Users },
    { label: "فضاء الأولياء", href: "/my-children", icon: Heart },
  ];

  const getWorkspaceUrl = () => {
    if (!user) return "/login";
    if (user.role === "inspector") return "/inspector";
    if (user.role === "admin") return "/super-admin";
    return "/admin";
  };

  const getWorkspaceLabel = () => {
    if (!user) return "دخول الأستاذ";
    if (user.role === "inspector") return "فضاء التفتيش";
    if (user.role === "admin") return "لوحة المشرف العام";
    return "مساحتي التعليمية";
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-md border-b border-emerald-900/40 text-white shadow-lg transition-all" dir="rtl">
      {/* الشريط العلوي الدقيق لوزارة التربية */}
      <div className="bg-emerald-950/80 border-b border-emerald-800/30 text-[11px] text-emerald-200/90 py-1 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide">الجمهورية الجزائرية الديمقراطية الشعبية</span>
            <span className="text-emerald-500">•</span>
            <span className="hidden sm:inline text-emerald-300">مديرية التربية لولاية الوادي</span>
            <span className="hidden md:inline text-emerald-500">•</span>
            <span className="hidden md:inline">مفتشية التعليم المتوسط لمادة الرياضيات</span>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="bg-emerald-800/50 text-emerald-200 px-2 py-0.5 rounded-full font-mono font-bold">
              ولاية الوادي (39)
            </span>
          </div>
        </div>
      </div>

      {/* الشريط الرئيسي للتنقل */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* الشعار والهوية */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-right">
            <span className="font-black text-sm sm:text-base text-white tracking-tight leading-none group-hover:text-emerald-300 transition-colors">
              رياضيات الوادي
            </span>
            <span className="text-[10px] text-emerald-400 font-medium leading-normal mt-0.5">
              المنصة الرقمية الموحدة للتعليم المتوسط
            </span>
          </div>
        </Link>

        {/* روابط التنقل على الشاشات الكبيرة */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isActive
                    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* أزرار حساب المستخدم والدخول */}
        <div className="hidden sm:flex items-center gap-2">
          {loading ? (
            <div className="w-24 h-8 bg-slate-800 animate-pulse rounded-xl" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link
                href={getWorkspaceUrl()}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                <span>{getWorkspaceLabel()}</span>
                {user.code && (
                  <span className="bg-black/25 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded font-mono">
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
                className="py-2 px-3.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>تسجيل دخول الأستاذ</span>
              </Link>
              <Link
                href="/register"
                className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
              >
                <GraduationCap className="w-4 h-4" />
                <span>إنشاء حساب الأستاذ</span>
              </Link>
            </div>
          )}
        </div>

        {/* زر القائمة للهاتف */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60"
          aria-label="القائمة"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* قائمة الهاتف المنسدلة */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900/98 px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold ${
                    isActive
                      ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2 text-xs text-slate-400">
                  <span>مرحباً، {user.fullName}</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/40">
                    {user.role === "inspector" ? "مفتش" : user.role === "admin" ? "مشرف عام" : "أستاذ"}
                  </span>
                </div>
                <Link
                  href={getWorkspaceUrl()}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{getWorkspaceLabel()}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full py-2 px-4 rounded-xl bg-slate-800 text-red-400 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  className="py-2.5 px-3 rounded-xl bg-slate-800 text-center font-bold text-xs text-white"
                >
                  تسجيل دخول الأستاذ
                </Link>
                <Link
                  href="/register"
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 text-center font-bold text-xs text-white"
                >
                  إنشاء حساب الأستاذ
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
