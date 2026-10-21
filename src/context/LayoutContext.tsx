"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type UserRole = "teacher" | "inspector" | "admin" | null;

export interface UserSessionInfo {
  id: string;
  fullName: string;
  role: UserRole;
  code?: string;
  slug?: string;
  districtId?: number;
  schoolName?: string;
}

interface LayoutContextValue {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (v: boolean) => void;
  user: UserSessionInfo | null;
  loadingUser: boolean;
  refreshUser: () => Promise<void>;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  // الشريط الجانبي في الحاسوب (محفوظ في localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<UserSessionInfo | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  // استرجاع تفضيل المستخدم للشريط الجانبي
  useEffect(() => {
    try {
      const saved = localStorage.getItem("math_sidebar_collapsed");
      if (saved !== null) {
        setIsSidebarCollapsed(saved === "true");
      }
    } catch {
      // تجاهل أخطاء التخزين المحلي
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("math_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  }, []);

  const setSidebarCollapsed = useCallback((v: boolean) => {
    setIsSidebarCollapsed(v);
    try {
      localStorage.setItem("math_sidebar_collapsed", String(v));
    } catch {}
  }, []);

  // جلب معلومات الجلسة والمستخدم
  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setUser(null);
        setLoadingUser(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, teacher_code, slug, district_id, school_custom_name")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile) {
        setUser({
          id: profile.id,
          fullName: profile.full_name || "مستخدم المنصة",
          role: (profile.role as UserRole) || "teacher",
          code: profile.teacher_code || undefined,
          slug: profile.slug || undefined,
          districtId: profile.district_id || undefined,
          schoolName: profile.school_custom_name || undefined,
        });
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("LayoutContext user load error:", err);
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refreshUser]);

  return (
    <LayoutContext.Provider
      value={{
        isSidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        user,
        loadingUser,
        refreshUser,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
