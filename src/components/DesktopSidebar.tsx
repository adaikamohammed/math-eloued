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
  FileWarning,
  Megaphone,
  MessageSquare,
  Building2,
} from "lucide-react";
import { useLayout } from "@/context/LayoutContext";
import { supabase } from "@/lib/supabase";
import { clearInspectionCache } from "@/app/inspector/shared";
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
  const [isSharedSession, setIsSharedSession] = useState(false);

  // جلب تفضيلات الأستاذ لإظهار وإخفاء الصفحات ديناميكياً ولحظياً
  useEffect(() => {
    // 0. التحقق من وضع الحاسوب المشترك
    try {
      setIsSharedSession(sessionStorage.getItem("jusoor_shared_device") === "true");
    } catch {}

    // 1. القراءة الفورية من الكاش المحلي 0ms
    try {
      const cached = localStorage.getItem("teacher_feature_flags_cache");
      if (cached) {
        setFeatureFlags(JSON.parse(cached));
      }
    } catch {}

    // 2. الاستماع لأي تغيير يُجريه الأستاذ فوراً دون الحاجة لتحديث الصفحة
    const onFlagsUpdated = (e: any) => {
      if (e?.detail) {
        setFeatureFlags(e.detail);
      }
    };
    window.addEventListener("featureFlagsUpdated", onFlagsUpdated);

    // 3. المزامنة مع الخادم
    if (user && user.role !== "inspector") {
      fetch("/api/lessons")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.featureFlags) {
            setFeatureFlags(data.featureFlags);
            try {
              localStorage.setItem("teacher_feature_flags_cache", JSON.stringify(data.featureFlags));
            } catch {}
          }
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("featureFlagsUpdated", onFlagsUpdated);
    };
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
        },
      ];

      if (flags.boardLessons !== false) {
        pedagogyItems.push({
          label: "كراس الدروس والسبورة",
          href: "/admin/board",
          icon: BookOpen,
        });
      }

      if (flags.students !== false) {
        pedagogyItems.push({
          label: "إدارة الأفواج والتلاميذ",
          href: "/admin/students",
          icon: Users,
        });
      }

      if (flags.timetable !== false) {
        pedagogyItems.push({
          label: "التوقيت الأسبوعي",
          href: "/admin/timetable",
          icon: Calendar,
        });
      }

      if (flags.diary !== false) {
        pedagogyItems.push({
          label: "الدفتر اليومي (ماذا سأدرس غداً)",
          href: "/admin/diary",
          icon: ClipboardList,
        });
      }

      const followupItems: NavItem[] = [];

      if (flags.continuousAssessment !== false) {
        followupItems.push({
          label: "ميثاق التقويم (20/20)",
          href: "/eval",
          icon: Scale,
        });
      }

      if (flags.honors !== false) {
        followupItems.push({
          label: "لوحة الشرف وتكريم النوابغ",
          href: "/honor",
          icon: Trophy,
        });
      }

      if (flags.penalties !== false) {
        followupItems.push({
          label: "سجل الخصومات والملاحظات",
          href: "/penalties",
          icon: FileWarning,
        });
      }

      if (flags.announcements !== false) {
        followupItems.push({
          label: "شريط الإعلانات والتنبيهات",
          href: "/announcement",
          icon: Megaphone,
        });
      }

      if (flags.messages !== false) {
        followupItems.push({
          label: "صندوق الرسائل والمقترحات",
          href: "/messages",
          icon: MessageSquare,
        });
      }

      if (flags.reception !== false) {
        followupItems.push({
          label: "استقبال الأولياء",
          href: "/parents",
          icon: Users,
        });
      }

      const inspectionItems: NavItem[] = [];

      if (flags.forum !== false) {
        inspectionItems.push({
          label: "ملتقى الأساتذة البيداغوجي",
          href: "/forum",
          icon: Sparkles,
        });
      }

      if (flags.inspectorSync !== false) {
        inspectionItems.push({
          label: "فضاء التفتيش والمناشير",
          href: "/inspector",
          icon: ShieldCheck,
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
          ],
        },
        {
          title: "إدارة الحساب",
          items: [{ label: "الإعدادات", href: "/settings", icon: Settings }],
        },
      ];
    }

    // ─── 2.5 إذا كان المستخدم مدير متوسطة / ناظر ───
    if (user && user.role === "principal") {
      return [
        {
          title: "إدارة المؤسسة التعليمية",
          items: [
            { label: "لوحة قيادة المتوسطة", href: "/principal", icon: Building2, badge: "إدارة" },
            { label: "جدول الفروض الرسمي", href: "/principal?tab=exams", icon: Calendar, badge: "رسمي" },
            { label: "سجل التأشيرات الإدارية", href: "/principal?tab=visas", icon: ShieldCheck },
            { label: "دليل الاستقبال الموحد", href: "/principal?tab=reception", icon: Users },
            { label: "الملتقى البيداغوجي", href: "/forum", icon: Sparkles },
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
          { label: "بحث عن أستاذ بكود", href: "/t/search", icon: Search },
          { label: "أبنائي ومحفظتي", href: "/my-children", icon: Heart },
          { label: "لوحة الشرف وتكريم النوابغ", href: "/honor", icon: Trophy },
        ],
      },
      {
        title: "فضاء المربين والأساتذة",
        items: [
          {
            label: "تسجيل الدخول",
            href: "/login",
            icon: LogIn,
            badge: "للأساتذة",
            badgeColor: "bg-[#107a57] text-white",
          },
          {
            label: "إنشاء حساب أستاذ جديد",
            href: "/register",
            icon: UserPlus,
          },
        ],
      },
    ];
  }, [user, featureFlags]);

  // إغلاق قائمة الهاتف عند النقر على رابط
  const handleItemClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* ── طبقة التعتيم للهواتف (Backdrop) ── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-2xs transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── حاوية الشريط الجانبي (ثابتة في سطح المكتب، منزلقة في الهاتف) ── */}
      <aside
        className={`
          fixed lg:static top-0 right-0 z-50 h-screen
          bg-white border-l border-[#e8e8e0]
          flex flex-col transition-all duration-300 ease-in-out shadow-xs
          ${isSidebarCollapsed ? "lg:w-20" : "lg:w-64"}
          w-72 max-w-[85vw]
          ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
        aria-label="الشريط الجانبي للتنقل"
        dir="rtl"
      >
        {/* ── رأس الشريط الجانبي (مطابق لارتفاع الهيدر h-16 تماماً) ── */}
        <div className="h-16 border-b border-[#e8e8e0] flex items-center justify-between px-4 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 min-w-0 group"
            onClick={handleItemClick}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#107a57] to-[#159a6e] flex items-center justify-center text-white shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>

            {!isSidebarCollapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <span className="font-black text-sm text-gray-900 tracking-tight block truncate">
                  قِبَاب الجزائر
                </span>
                <span className="text-[10px] text-emerald-700 font-bold block truncate">
                  المنظومة الوطنية للتربية والتعليم
                </span>
              </div>
            )}
          </Link>

          {/* زر طي / فتح الشريط للحواسيب */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title={isSidebarCollapsed ? "توسيع الشريط" : "طي الشريط"}
            aria-label={isSidebarCollapsed ? "توسيع الشريط" : "طي الشريط"}
          >
            {isSidebarCollapsed ? (
              <PanelRightOpen className="w-5 h-5" />
            ) : (
              <PanelRightClose className="w-5 h-5" />
            )}
          </button>

          {/* زر إغلاق في الهاتف */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── بطاقة سريعة للمستخدم المسجل ── */}
        {user && !isSidebarCollapsed && (
          <div className="p-3 mx-3 mt-3 rounded-2xl bg-gradient-to-br from-[#f2f8f5] to-[#e6f4ee] border border-[#d2ebe0] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#107a57] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                {user.fullName?.charAt(0) || "أ"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-gray-900 truncate">
                  {user.fullName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-[#107a57] font-bold">
                    {user.role === "inspector"
                      ? "مفتش مقاطعة"
                      : user.role === "principal"
                      ? "مدير المتوسطة"
                      : user.role === "admin"
                      ? "المشرف العام"
                      : "أستاذ المادة"}
                  </span>
                  {user.code && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 bg-white/80 rounded border border-[#c3e4d5] text-gray-600">
                      {user.code}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── قائمة الروابط القابلة للتمرير ── */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {categories.map((cat, idx) => (
            <div key={idx} className="space-y-1.5">
              {/* عنوان الفئة (يختفي عند الطي) */}
              {!isSidebarCollapsed && (
                <h3 className="px-3 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  {cat.title}
                </h3>
              )}

              {/* عناصر الفئة */}
              <div className="space-y-1">
                {cat.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleItemClick}
                      onMouseEnter={() => setHoveredItem(item.href)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={`
                        group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all
                        ${isSidebarCollapsed ? "justify-center" : ""}
                        ${
                          isActive
                            ? "bg-[#e6f4ee] text-[#107a57] shadow-2xs font-black"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        }
                      `}
                    >
                      {/* خط جانبي خفيف للعنصر النشط */}
                      {isActive && (
                        <span className="absolute right-0 top-2 bottom-2 w-1 bg-[#107a57] rounded-l-full" />
                      )}

                      {/* أيقونة العنصر */}
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-colors ${
                          isActive
                            ? "text-[#107a57]"
                            : "text-gray-400 group-hover:text-gray-600"
                        }`}
                      />

                      {/* نص الرابط والشارة */}
                      {!isSidebarCollapsed && (
                        <div className="flex items-center justify-between min-w-0 flex-1">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                                item.badgeColor ||
                                "bg-gray-100 text-gray-600 border border-gray-200"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Tooltip عائم يظهر عند طي الشريط الجانبي في الحاسوب */}
                      {isSidebarCollapsed && hoveredItem === item.href && (
                        <div
                          className="hidden lg:block absolute left-full mr-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg whitespace-nowrap shadow-lg z-50 pointer-events-none"
                          style={{ marginRight: "12px" }}
                        >
                          {item.label}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ── تذييل الشريط الجانبي (نسخة المنصة وحالة النظام) ── */}
        <div className="p-3 border-t border-[#e8e8e0] shrink-0 text-center space-y-1.5">
          {!isSidebarCollapsed && user && isSharedSession && (
            <button
              type="button"
              onClick={async () => {
                try {
                  localStorage.removeItem("teacher_feature_flags_cache");
                  clearInspectionCache();
                  sessionStorage.clear();
                } catch {}
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
              className="w-full py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-red-50 text-amber-900 hover:text-red-700 border border-amber-200 hover:border-red-200 text-[10px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              title="تسجيل خروج فوري ومسح أي أثر محلي على هذا الحاسوب المشترك"
            >
              <LogOut className="w-3.5 h-3.5 text-red-600" />
              <span>خروج من الحاسوب المشترك</span>
            </button>
          )}

          {!isSidebarCollapsed ? (
            <>
              <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                <span>قِبَاب الجزائر v2.5</span>
                <span className="inline-flex items-center gap-1 text-[#107a57] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#107a57] animate-pulse" />
                  متصل
                </span>
              </div>
              <div className="text-[10px] text-gray-400 text-center pt-0.5">
                <Link href="/privacy" className="hover:text-gray-600 transition underline">
                  الخصوصية والتشريع الجزائري
                </Link>
              </div>
            </>
          ) : (
            <div className="flex justify-center" title="النظام متصل">
              <span className="w-2 h-2 rounded-full bg-[#107a57]" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
