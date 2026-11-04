"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { UserProfile } from "./types";
import { getPersistedTeacherSession, savePersistedTeacherSession, type TeacherSession } from "./offlineAuth";

// الملف الشخصي للمستخدم المسجل (أستاذ / مفتش / مشرف) من جلسة المتصفح أو الكوكيز
export function useProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    // 1. فحص الجلسة أولاً عبر نقطة نهاية الخادم /api/auth (تعمل مباشرة مع كوكيز المتصفح المشفرة)
    try {
      const res = await fetch("/api/auth");
      if (res.ok) {
        const d = await res.json();
        if (d?.authenticated && d.profile) {
          savePersistedTeacherSession(d.profile as TeacherSession);
          setProfile(d.profile as UserProfile);
          setLoading(false);
          return;
        }
      }
    } catch {
      // متابعة للتحقق الاحتياطي
    }

    // 2. فحص جلسة Supabase في المتصفح
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (data) {
          setProfile({ ...data, email: session.user.email } as UserProfile);
          setLoading(false);
          return;
        }
      }
    } catch {
      // خطأ في الجلب
    }

    // 3. فحص الجلسة المحفوظة في وضع عدم الاتصال (Offline Fallback)
    const persisted = getPersistedTeacherSession();
    if (persisted) {
      setProfile(persisted as unknown as UserProfile);
      setLoading(false);
      return;
    }

    setProfile(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, profile, reload: load };
}
