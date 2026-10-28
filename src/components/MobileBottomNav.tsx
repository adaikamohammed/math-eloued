"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Search,
  Scale,
  Users,
  GraduationCap,
  Trophy,
  ShieldCheck,
  User,
  BookOpen,
  Calendar,
  ClipboardList,
  Sliders,
  Heart,
  Building2,
} from "lucide-react";
import { useLayout } from "@/context/LayoutContext";
import { TeacherFeatureFlags } from "@/lib/types";

export function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const { user } = useLayout();
  const [featureFlags, setFeatureFlags] = useState<TeacherFeatureFlags | null>(null);

  useEffect(() => {
    // 1. قراءة فورية من الكاش
    try {
      const cached = localStorage.getItem("teacher_feature_flags_cache");
      if (cached) setFeatureFlags(JSON.parse(cached));
    } catch {}

    // 2. الاستماع لتحديث التخصيصات
    const handler = (e: any) => {
      if (e?.detail) setFeatureFlags(e.detail);
    };
    window.addEventListener("featureFlagsUpdated", handler);

    // 3. المزامنة مع الخادم
    if (user && user.role === "teacher") {
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

    return () => window.removeEventListener("featureFlagsUpdated", handler);
  }, [user]);

  let items = [
    { label: "الرئيسية", href: "/", icon: Sparkles },
    { label: "بحث بكود", href: "/t/search", icon: Search },
    { label: "محفظتي", href: "/my-children", icon: Heart },
    { label: "لوحة الشرف", href: "/honor", icon: Trophy },
    { label: "دخول الأستاذ", href: "/login", icon: GraduationCap },
  ];

  if (user && user.role === "teacher") {
    const flags = featureFlags || {};
    const teacherNav: { label: string; href: string; icon: any }[] = [
      { label: "لوحتي", href: "/admin", icon: GraduationCap },
    ];

    if (flags.students !== false) {
      teacherNav.push({ label: "التلاميذ", href: "/admin/students", icon: Users });
    }
    if (flags.boardLessons !== false) {
      teacherNav.push({ label: "السبورة", href: "/admin/board", icon: BookOpen });
    }
    if (flags.timetable !== false) {
      teacherNav.push({ label: "التوقيت", href: "/admin/timetable", icon: Calendar });
    }
    if (flags.diary !== false) {
      teacherNav.push({ label: "الدفتر", href: "/admin/diary", icon: ClipboardList });
    }
    if (flags.honors !== false && teacherNav.length < 5) {
      teacherNav.push({ label: "الشرف", href: "/honor", icon: Trophy });
    }
    if (flags.inspectorSync !== false && teacherNav.length < 5) {
      teacherNav.push({ label: "التفتيش", href: "/inspector", icon: ShieldCheck });
    }
    if (teacherNav.length < 5) {
      teacherNav.push({ label: "التخصيص", href: "/settings/features", icon: Sliders });
    }

    items = teacherNav.slice(0, 5);
  } else if (user && user.role === "inspector") {
    items = [
      { label: "التفتيش", href: "/inspector", icon: ShieldCheck },
      { label: "الندوات", href: "/inspector", icon: Calendar },
      { label: "الملتقى", href: "/forum", icon: Users },
      { label: "لوحة الشرف", href: "/honor", icon: Trophy },
      { label: "الإعدادات", href: "/settings", icon: Sliders },
    ];
  } else if (user && user.role === "principal") {
    items = [
      { label: "المتوسطة", href: "/principal", icon: Building2 },
      { label: "الفروض", href: "/principal?tab=exams", icon: Calendar },
      { label: "التأشيرات", href: "/principal?tab=visas", icon: ShieldCheck },
      { label: "الاستقبال", href: "/principal?tab=reception", icon: Users },
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
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href ||
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
