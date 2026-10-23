"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Search,
  Scale,
  Users,
  GraduationCap,
  ShieldCheck,
  User,
  BookOpen,
  Calendar,
  ClipboardList,
  Sliders,
  Heart,
} from "lucide-react";
import { useLayout } from "@/context/LayoutContext";

export function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const { user } = useLayout();

  let items = [
    { label: "الرئيسية", href: "/", icon: Sparkles },
    { label: "بحث بكود", href: "/t/search", icon: Search },
    { label: "محفظتي", href: "/my-children", icon: Heart },
    { label: "التقويم (20)", href: "/assessment", icon: Scale },
    { label: "دخول الأستاذ", href: "/login", icon: GraduationCap },
  ];

  if (user && user.role === "teacher") {
    items = [
      { label: "كراس القسم", href: "/admin", icon: BookOpen },
      { label: "التلاميذ", href: "/admin/students", icon: Users },
      { label: "التوقيت", href: "/admin/timetable", icon: Calendar },
      { label: "الدفتر اليومي", href: "/admin/diary", icon: ClipboardList },
      { label: "تخصيص", href: "/settings/features", icon: Sliders },
    ];
  } else if (user && user.role === "inspector") {
    items = [
      { label: "التفتيش", href: "/inspector", icon: ShieldCheck },
      { label: "الندوات", href: "/inspector/circulars", icon: Calendar },
      { label: "الملتقى", href: "/forum", icon: Users },
      { label: "التقويم", href: "/assessment", icon: Scale },
      { label: "الإعدادات", href: "/settings", icon: Sliders },
    ];
  }

  return (
    <nav
      className="mobile-bottom-nav lg:hidden"
      aria-label="شريط التنقل السفلي للهاتف"
      dir="rtl"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-bottom-nav-item ${isActive ? "active" : ""}`}
          >
            <div
              className={`w-8 h-7 rounded-lg flex items-center justify-center transition-colors ${
                isActive ? "bg-[#e6f4ee] text-[#107a57]" : "text-gray-500"
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>

            <span className="text-[10px] tracking-tight truncate max-w-[64px] text-center font-bold">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
