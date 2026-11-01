"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// الأستاذ الذي يتصفح الولي فضاءه: يُمرَّر في الروابط بالشكل ?teacher=<id>
export function currentTeacherId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("teacher");
}

export function withTeacher(url: string, teacherId: string | null = currentTeacherId()): string {
  if (!teacherId) return url;
  return `${url}${url.includes("?") ? "&" : "?"}teacher=${encodeURIComponent(teacherId)}`;
}

export function useTeacherId(): string | null {
  const [teacherId, setTeacherId] = useState<string | null>(null);
  useEffect(() => {
    setTeacherId(currentTeacherId());
  }, []);
  return teacherId;
}

// العودة لصفحة الأستاذ العامة إن وُجد، وإلا للبوابة الرئيسية
export function teacherHomeHref(teacherId: string | null): string {
  return teacherId ? `/t/${teacherId}` : "/";
}

// اسم الأستاذ ومتوسطته لعرضهما في رأس صفحات الولي (من الملف العام)
export function useTeacherInfo(teacherId: string | null) {
  const [info, setInfo] = useState<{
    id?: string;
    slug?: string;
    full_name: string;
    school_custom_name: string | null;
    subject?: string;
    teacher_code?: string;
  } | null>(null);

  useEffect(() => {
    if (!teacherId) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teacherId);
    const query = supabase.from("profiles").select("id, slug, full_name, school_custom_name, subject, teacher_code");
    (isUuid ? query.eq("id", teacherId) : query.eq("slug", teacherId))
      .maybeSingle()
      .then(({ data }) => setInfo(data ?? null));
  }, [teacherId]);

  return info;
}

export function teacherLabel(info: { full_name: string; school_custom_name: string | null } | null) {
  if (!info) return "مادة الرياضيات — التعليم المتوسط";
  return info.school_custom_name ? `${info.full_name} — ${info.school_custom_name}` : info.full_name;
}
