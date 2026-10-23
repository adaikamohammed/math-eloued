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
} from "lucide-react";
import { useLayout } from "@/context/LayoutContext";

export function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const { user } = useLayout();

  const getAccountHref = () => {
    if (!user) return "/login";
    if (user.role === "inspector") return "/inspector";
    if (user.role === "admin") return "/super-admin";
    return "/admin";
  };

  const getAccountLabel = () => {
    if (!user) return "دخولي";
    if (user.role === "inspector") return "التفتيش";
    return "مساحتي";
  };

  const AccountIcon = user
    ? user.role === "inspector"
      ? ShieldCheck
      : GraduationCap
    : User;

  const items = [
    { label: "الرئيسية", href: "/", icon: Sparkles },
    { label: "بحث بكود", href: "/t/search", icon: Search },
    { label: "التقويم (20)", href: "/assessment", icon: Scale },
    { label: "الملتقى", href: "/forum", icon: Users },
    { label: getAccountLabel(), href: getAccountHref(), icon: AccountIcon },
  ];

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
