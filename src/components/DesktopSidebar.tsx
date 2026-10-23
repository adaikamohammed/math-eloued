"use client";

import React, { useState, useEffect } from "react";
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
  BookOpen,
  Calendar,
  ClipboardList,
  Sliders,
  X,
  UserPlus,
} from "lucide-react";
import { useLayout } from "@/context/LayoutContext";
import { TeacherFeatureFlags } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface NavCategory {
  title: string;
  items: NavItem[];
}

export function DesktopSidebar() {
  const pathname = usePathname() || "/";
  const { isSidebarCollapsed, toggleSidebar, isMobileMenuOpen, setIsMobileMenuOpen, user } = useLayout();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [featureFlags, setFeatureFlags] = useState<TeacherFeatureFlags | null>(null);

  // جلب تفضيلات الأستاذ لإظهار وإخفاء الصفحات ديناميكياً
  useEffect(() => {
    if (user && user.role !== "inspector") {
      fetch("/api/lessons")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.featureFlags) {
            setFeatureFlags(data.featureFlags);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // بناء القوائم وفق رتبة المستخدم وإعداداته
  const categories: NavCategory[] = React.useMemo(() => {
    // ─── 1. إذا كان المستخدم أستاذاً مسجلاً ───
    if (user && user.role === "teacher") {
      const flags = featureFlags || {};

      const pedagogyItems: NavItem[] = [
        {
          label: "لوحة التحكم والمتابعة",
          href: "/admin",
          icon: GraduationCap,
          badge: "رئيسية",
          badgeColor: "bg-emerald-600 text-white",
        },
        {
          label: "كراس الدروس والسبورة",
          href: "/admin/board",
          icon: BookOpen,
          badge: "سبورة",
          badgeColor: "bg-emerald-50 text-emerald-800 border border-emerald-200/80",
        },
      ];

      if (flags.students !== false) {
        pedagogyItems.push({
          label: "إدارة الأفواج والتلاميذ",
          href: "/admin/students",
          icon: Users,
          badge: "أبجدي",
          badgeColor: "bg-emerald-50 text-emerald-800 border border-emerald-200/80",
        });
      }

      if (flags.timetable !== false) {
        pedagogyItems.push({
          label: "التوقيت الأسبوعي",
          href: "/admin/timetable",
          icon: Calendar,
          badge: "جدول",
          badgeColor: "bg-blue-50 text-blue-800 border border-blue-200/80",
        });
      }

      if (flags.diary !== false) {
        pedagogyItems.push({
          label: "الدفتر اليومي (ماذا سأدرس غداً)",
          href: "/admin/diary",
          icon: ClipboardList,
          badge: "يومي",
          badgeColor: "bg-amber-50 text-amber-800 border border-amber-200/80",
        });
      }

      const followupItems: NavItem[] = [];
      if (flags.continuousAssessment !== false) {
        followupItems.push({
          label: "ميثاق التقويم (20/20)",
          href: "/assessment",
          icon: Scale,
          badge: "شفافية ⚖️",
          badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
        });
      }
      if (flags.honors !== false) {
        followupItems.push({
          label: "لوحة الشرف وتكريم النوابغ",
          href: "/honor",
          icon: Trophy,
        });
      }

      const inspectionItems: NavItem[] = [];
      if (flags.forum !== false) {
        inspectionItems.push({
          label: "ملتقى الأساتذة البيداغوجي",
          href: "/forum",
          icon: Sparkles,
          badge: "💬 تفاعلي",
          badgeColor: "bg-indigo-50 text-indigo-700 border border-indigo-200/80",
        });
      }
      if (flags.inspectorSync !== false) {
        inspectionItems.push({
          label: "فضاء التفتيش والمناشير",
          href: "/inspector",
          icon: ShieldCheck,
          badge: "رسمي",
          badgeColor: "bg-amber-50 text-amber-700 border border-amber-200/80",
        });
      }

      const cats: NavCategory[] = [
        { title: "الميدان التربوي", items: pedagogyItems },
      ];

      if (followupItems.length > 0) {
        cats.push({ title: "الشفافية والتقويم", items: followupItems });
      }

      if (inspectionItems.length > 0) {
        cats.push({ title: "الملتقى والتفتيش", items: inspectionItems });
      }

      cats.push({
        title: "إدارة الفضاء والتخصيص",
        items: [
          {
            label: "تخصيص الواجهة والصفحات",
            href: "/settings/features",
            icon: Sliders,
            badge: "تحكم ⚙️",
            badgeColor: "bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20",
          },
          { label: "إعدادات الحساب وكلمة المرور", href: "/settings", icon: Settings },
        ],
      });

      return cats;
    }

    // ─── 2. إذا كان المستخدم مفتشاً ───
    if (user && user.role === "inspector") {
      return [
        {
          title: "فضاء التفتيش",
          items: [
            { label: "لوحة المفتشية والمناشير", href: "/inspector", icon: ShieldCheck, badge: "رسمي" },
            { label: "الملتقى البيداغوجي", href: "/forum", icon: Users, badge: "نقاش" },
            { label: "ميثاق التقويم (20/20)", href: "/assessment", icon: Scale },
          ],
        },
        {
          title: "إدارة الحساب",
          items: [{ label: "الإعدادات", href: "/settings", icon: Settings }],
        },
      ];
    }

    // ─── 3. الوضع العام للزوار والأولياء ───
    return [
      {
        title: "فضاء التلميذ والولي",
        items: [
          { label: "الرئيسية", href: "/", icon: Sparkles },
          { label: "البحث بكود الأستاذ أو المستوى", href: "/t/search", icon: Search, badge: "كود" },
          { label: "مستجدات أبنائي (المحفظة)", href: "/my-children", icon: Heart },
        ],
      },
      {
        title: "الشفافية والتحفيز",
        items: [
          {
            label: "ميثاق التقويم (20/20)",
            href: "/assessment",
            icon: Scale,
            badge: "شفافية ⚖️",
            badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
          },
          { label: "لوحة الشرف وتكريم النوابغ", href: "/honor", icon: Trophy },
        ],
      },
      {
        title: "فضاء الطاقم التربوي",
        items: [
          {
            label: "تسجيل دخول الأستاذ",
            href: "/login",
            icon: GraduationCap,
            badge: "للأساتذة 🔒",
            badgeColor: "bg-slate-100 text-slate-700 border border-slate-200",
          },
          {
            label: "انضمام أستاذ جديد",
            href: "/join",
            icon: UserPlus,
            badge: "فوري ✨",
            badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200",
          },
        ],
      },
    ];
  }, [user, featureFlags]);

  const getWorkspaceUrl = () => {
    if (!user) return "/login";
    if (user.role === "inspector") return "/inspector";
    if (user.role === "admin") return "/super-admin";
    return "/admin";
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/admin") return pathname === "/admin";
    if (href === "/inspector") return pathname === "/inspector";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar الرئيسية بنمط منصة فرسان القرآن */}
      <aside
        id="app-sidebar"
        className={`
          fixed top-0 right-0 h-full z-50 lg:z-40 flex flex-col shrink-0
          bg-white text-gray-800
          border-l border-[#e8e8e0]
          transition-all duration-300 ease-in-out
          lg:static lg:h-screen
          ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
          ${isSidebarCollapsed ? "w-[4.5rem]" : "w-72"}
        `}
        aria-label="القائمة الجانبية للمنصة"
      >
        {/* ── الرأس: الشعار وعنوان المنصة (h-16 متطابق مع الهيدر) ── */}
        <div
          className={`flex items-center border-b border-[#e8e8e0] shrink-0 h-16
            ${isSidebarCollapsed ? "justify-center p-3" : "justify-between px-4"}`}
        >
          {!isSidebarCollapsed && (
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 group min-w-0"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#107a57] to-[#0a5c40] flex items-center justify-center text-white shadow-md shadow-[#107a57]/20 group-hover:scale-105 transition-transform shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight min-w-0">
                <p className="text-sm font-black text-gray-900 truncate">
                  منصة جسور التعليمية
                </p>
                <p className="text-[10px] text-[#107a57] font-bold opacity-90 truncate">
                  التعليم المتوسط • ولاية الوادي
                </p>
              </div>
            </Link>
          )}

          {isSidebarCollapsed && (
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#107a57] to-[#0a5c40] flex items-center justify-center text-white shadow-md shrink-0"
              title="منصة جسور التعليمية"
            >
              <BookOpen className="w-5 h-5 text-white" />
            </Link>
          )}

          {/* زر التوسيع/الطي للشاشات الكبيرة */}
          {!isSidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              title="طي الشريط الجانبي"
              aria-label="طي الشريط الجانبي"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          )}

          {/* زر إغلاق القائمة في الهاتف */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* زر الفتح عند الوضع المطوي */}
        {isSidebarCollapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-[#e8e8e0]/60">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-xl text-gray-400 hover:text-[#107a57] hover:bg-emerald-50 transition"
              title="توسيع الشريط الجانبي"
              aria-label="توسيع الشريط الجانبي"
            >
              <PanelRightOpen className="w-4 h-4 text-[#107a57]" />
            </button>
          </div>
        )}

        {/* ── شريط التنقل وروابط الأقسام ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {categories.map((cat, idx) => (
            <div key={idx} className="space-y-1">
              {!isSidebarCollapsed && (
                <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {cat.title}
                </div>
              )}

              {cat.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <div key={item.href} className="relative group">
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      onMouseEnter={() => setHoveredItem(item.href)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                        active
                          ? "bg-[#107a57] text-white shadow-sm shadow-[#107a57]/25 font-black"
                          : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
                      } ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-gray-500 group-hover:text-gray-800"}`} />

                      {!isSidebarCollapsed && (
                        <div className="flex-1 flex items-center justify-between overflow-hidden">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                                active
                                  ? "bg-white/20 text-white"
                                  : item.badgeColor || "bg-gray-100 text-gray-600 border border-gray-200"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>

                    {/* Tooltip flyout on collapsed */}
                    {isSidebarCollapsed && hoveredItem === item.href && (
                      <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 z-50 bg-[#1a1a2e] text-white text-xs px-2.5 py-1.5 rounded-xl shadow-xl border border-gray-700 whitespace-nowrap pointer-events-none flex items-center gap-1.5">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="text-[9px] text-amber-300 font-bold">({item.badge})</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── أسفل الشريط: بطاقة حساب المستخدم ── */}
        <div className="p-3 border-t border-[#e8e8e0] bg-[#fafaf7]">
          {user ? (
            <Link
              href={getWorkspaceUrl()}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 p-2 rounded-xl bg-white hover:bg-gray-50 border border-[#e8e8e0] text-xs transition shadow-2xs group ${
                isSidebarCollapsed ? "justify-center p-1.5" : ""
              }`}
              title="الانتقال للمساحة التعليمية"
            >
              <div className="w-8 h-8 rounded-lg bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 flex items-center justify-center font-black shrink-0">
                {user.fullName.charAt(0) || "أ"}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0 text-right">
                  <p className="font-black text-gray-900 text-xs truncate">{user.fullName}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                    <span className="font-mono text-[#107a57] font-bold">{user.code || "حساب معتمد"}</span>
                    {user.districtId && <span>• المقاطعة {user.districtId}</span>}
                  </div>
                </div>
              )}
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 p-2.5 rounded-xl bg-[#e6f4ee] hover:bg-[#d5eee2] text-[#107a57] border border-[#107a57]/20 text-xs font-bold transition ${
                isSidebarCollapsed ? "justify-center px-0" : ""
              }`}
              title="تسجيل دخول الأستاذ"
            >
              <LogIn className="w-4 h-4 shrink-0 text-[#107a57]" />
              {!isSidebarCollapsed && <span>دخول الأستاذ</span>}
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
