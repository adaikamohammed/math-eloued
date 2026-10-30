"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, LogIn, ShieldCheck, GraduationCap } from "lucide-react";
import { useLayout } from "@/context/LayoutContext";

export function LandingHeader() {
  const { user } = useLayout();

  const getWorkspaceUrl = () => {
    if (!user) return "/login";
    if (user.role === "inspector") return "/inspector";
    if (user.role === "principal") return "/principal";
    if (user.role === "admin") return "/super-admin";
    return "/admin";
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e8e8e0] px-4 sm:px-8 transition-colors shrink-0">
      <div className="max-w-6xl mx-auto h-16 flex items-center justify-between gap-4">
        {/* الشعار والهوية الرسمية */}
        <Link href="/" className="flex items-center gap-3 group min-w-0">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-600/20 bg-white shadow-md shadow-[#107a57]/20 group-hover:scale-105 transition-transform shrink-0">
            <img src="/icon.svg" alt="منصة جسور التعليمية" className="w-full h-full object-contain" />
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-sm sm:text-base font-black text-gray-900 truncate">
              منصة جسور التعليمية
            </p>
            <p className="text-[10px] sm:text-[11px] text-[#107a57] font-bold truncate">
              حيث يلتقي الأستاذ، الولي، والتلميذ
            </p>
          </div>
        </Link>

        {/* زر الدخول للأستاذ */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <Link
              href={getWorkspaceUrl()}
              className="btn-primary text-xs py-2 px-3.5 sm:px-4 shadow-sm"
              title="الانتقال إلى لوحة تحكم الأستاذ"
            >
              <GraduationCap className="w-4 h-4" />
              <span>لوحة التحكم</span>
              {user.code && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-mono">
                  {user.code}
                </span>
              )}
            </Link>
          ) : (
            <Link
              href="/login"
              className="btn-primary text-xs py-2 px-3.5 sm:px-4 shadow-sm"
              title="دخول الأساتذة والمفتشين"
            >
              <LogIn className="w-4 h-4" />
              <span>دخول الأستاذ</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
