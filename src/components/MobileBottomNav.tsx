"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Search, Scale, Users, User, GraduationCap, ShieldCheck } from "lucide-react";
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

  const AccountIcon = user ? (user.role === "inspector" ? ShieldCheck : GraduationCap) : User;

  const items = [
    { label: "الرئيسية", href: "/", icon: Sparkles },
    { label: "بحث بكود", href: "/t/search", icon: Search },
    { label: "التقويم 20/20", href: "/assessment", icon: Scale },
    { label: "الملتقى", href: "/forum", icon: Users },
    { label: getAccountLabel(), href: getAccountHref(), icon: AccountIcon },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-lg pb-safe"
      aria-label="شريط التنقل السفلي للهاتف"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-transform active:scale-90 ${
                isActive ? "text-emerald-700 font-black" : "text-slate-500 hover:text-slate-800 font-medium"
              }`}
            >
              <div
                className={`w-9 h-7 rounded-xl flex items-center justify-center transition-colors ${
                  isActive ? "bg-emerald-50 text-emerald-700" : ""
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "scale-110" : ""}`} />
              </div>

              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px] text-center">
                {item.label}
              </span>

              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 -mt-0.5 shadow-xs shadow-emerald-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
