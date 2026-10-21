"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Search,
  Scale,
  Users,
  Trophy,
  ShieldCheck,
  GraduationCap,
  Settings,
  Heart,
  PanelRightClose,
  PanelRightOpen,
  LogIn,
  LogOut,
  ChevronRight,
  BookOpen,
  MapPin,
} from "lucide-react";
import { useLayout } from "@/context/LayoutContext";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  roleRequired?: "teacher" | "inspector" | "admin";
}

interface NavCategory {
  title: string;
  items: NavItem[];
}

export function DesktopSidebar() {
  const pathname = usePathname() || "/";
  const { isSidebarCollapsed, toggleSidebar, user } = useLayout();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const categories: NavCategory[] = [
    {
      title: "التنقل العام والمتابعة",
      items: [
        { label: "الرئيسية", href: "/", icon: Sparkles },
        { label: "البحث بكود الأستاذ", href: "/t/search", icon: Search, badge: "جديد" },
        { label: "فضاء الأولياء", href: "/my-children", icon: Heart },
      ],
    },
    {
      title: "الأدوات البيداغوجية والشفافية",
      items: [
        {
          label: "ميثاق التقويم (20/20)",
          href: "/assessment",
          icon: Scale,
          badge: "شفافية ⚖️",
          badgeColor: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
        },
        { label: "لوحة الشرف والمتفوقين", href: "/honor", icon: Trophy },
      ],
    },
    {
      title: "الفضاء المهني والتفتيش",
      items: [
        {
          label: "ملتقى أساتذة الرياضيات",
          href: "/forum",
          icon: Users,
          badge: "💬 تفاعلي",
          badgeColor: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
        },
        {
          label: "فضاء التفتيش والمناشير",
          href: "/inspector",
          icon: ShieldCheck,
          badge: "رسمي",
          badgeColor: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
        },
      ],
    },
    {
      title: "مساحتي الخاصة والإعدادات",
      items: [
        {
          label: user?.role === "inspector" ? "لوحة المفتش" : "لوحة تحكم الأستاذ",
          href: user?.role === "inspector" ? "/inspector" : "/admin",
          icon: GraduationCap,
        },
        { label: "تخصيص الفضاء والميزات", href: "/settings", icon: Settings },
      ],
    },
  ];

  const getWorkspaceUrl = () => {
    if (!user) return "/login";
    if (user.role === "inspector") return "/inspector";
    if (user.role === "admin") return "/super-admin";
    return "/admin";
  };

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 sticky top-16 h-[calc(100vh-4rem)] bg-white/95 backdrop-blur-md border-l border-slate-200/90 text-slate-700 transition-all duration-300 ease-in-out z-20 shadow-xs ${
        isSidebarCollapsed ? "w-[72px]" : "w-64"
      }`}
      aria-label="القائمة الجانبية للمنصة"
    >
      {/* رأس الشريط الجانبي */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between">
        {!isSidebarCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-slate-800 truncate tracking-wide">
              أقسام المنصة
            </span>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition ${
            isSidebarCollapsed ? "mx-auto" : ""
          }`}
          title={isSidebarCollapsed ? "توسيع الشريط الجانبي" : "طي الشريط الجانبي"}
          aria-label="تبديل حجم الشريط الجانبي"
        >
          {isSidebarCollapsed ? (
            <PanelRightOpen className="w-4 h-4 text-emerald-600" />
          ) : (
            <PanelRightClose className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>

      {/* قائمة الروابط المصنفة */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {categories.map((cat, idx) => (
          <div key={idx} className="space-y-1">
            {!isSidebarCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                {cat.title}
              </div>
            )}

            {cat.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    onMouseEnter={() => setHoveredItem(item.href)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? "bg-emerald-50 text-emerald-800 border-r-4 border-emerald-600 shadow-xs font-black"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    } ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isActive ? "text-emerald-700 scale-110" : "text-slate-500 group-hover:scale-105"
                      }`}
                    />

                    {!isSidebarCollapsed && (
                      <div className="flex-1 flex items-center justify-between overflow-hidden">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                              item.badgeColor || "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>

                  {/* تلميح منبثق عند طي الشريط الجانبي */}
                  {isSidebarCollapsed && hoveredItem === item.href && (
                    <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-800 whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none flex items-center gap-1.5">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] text-emerald-300 font-bold">({item.badge})</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* أسفل الشريط الجانبي: بطاقة حساب المستخدم */}
      <div className="p-2.5 border-t border-slate-100 bg-slate-50/80">
        {user ? (
          <Link
            href={getWorkspaceUrl()}
            className={`flex items-center gap-2.5 p-2 rounded-xl bg-white hover:bg-slate-100/90 text-xs transition border border-slate-200/80 group ${
              isSidebarCollapsed ? "justify-center" : ""
            }`}
            title="الانتقال للمساحة التعليمية"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition">
              {user.fullName.charAt(0) || "أ"}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0 text-right">
                <p className="font-bold text-slate-800 text-xs truncate">{user.fullName}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                  <span className="font-mono text-emerald-700 font-bold">{user.code || "حساب معتمد"}</span>
                  {user.districtId && <span>• المقاطعة {user.districtId}</span>}
                </div>
              </div>
            )}
          </Link>
        ) : (
          <Link
            href="/login"
            className={`flex items-center gap-2 p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition ${
              isSidebarCollapsed ? "justify-center" : ""
            }`}
            title="تسجيل دخول الأستاذ"
          >
            <LogIn className="w-4 h-4 shrink-0 text-emerald-600" />
            {!isSidebarCollapsed && <span>دخول الأستاذ</span>}
          </Link>
        )}
      </div>
    </aside>
  );
}
