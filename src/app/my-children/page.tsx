"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarClock, Megaphone, Trophy, UserRound, AlertTriangle } from "lucide-react";
import { BackHeader, Loading } from "@/components/ui";
import { loadWallet } from "@/components/TeacherWallet";
import { supabase } from "@/lib/supabase";
import { findPublicTeacher } from "@/lib/teachers";
import { groupByChild, teacherFeedItems, type ChildGroup, type FeedKind } from "@/lib/parentFeed";

const SEEN_KEY = "math_eloued_feed_seen";
const PAGE = 15;

const KINDS: Record<FeedKind, { label: string; icon: typeof BookOpen; cls: string }> = {
  announcement: { label: "إعلان", icon: Megaphone, cls: "bg-sky-50 text-sky-700 border-sky-100" },
  summons: { label: "استدعاء", icon: CalendarClock, cls: "bg-rose-50 text-rose-700 border-rose-100" },
  lesson: { label: "درس / واجب", icon: BookOpen, cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  honor: { label: "لوحة الشرف", icon: Trophy, cls: "bg-amber-50 text-amber-700 border-amber-100" },
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("ar-DZ", { day: "numeric", month: "long" });
};

export default function MyChildrenPage() {
  const [groups, setGroups] = useState<ChildGroup[] | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [seenAt, setSeenAt] = useState("");
  const [shown, setShown] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      setSeenAt(localStorage.getItem(SEEN_KEY) || "");
    } catch {}

    (async () => {
      const wallet = loadWallet();
      const missing: string[] = [];
      const entries = await Promise.all(
        wallet.map(async (w) => {
          try {
            const profile = await findPublicTeacher(w.slug);
            if (!profile) throw new Error("not found");
            const { data, error } = await supabase.rpc("get_teacher_public_data", { p_teacher_id: profile.id });
            if (error) throw error;
            const teacher = { id: profile.id, name: profile.full_name || w.name, childName: w.childName };
            return { teacher, items: teacherFeedItems(teacher, data) };
          } catch {
            missing.push(w.name);
            return null;
          }
        })
      );
      setFailed(missing);
      setGroups(groupByChild(entries.filter((e) => e !== null)));
      // تُحسب الزيارة بعد عرض الجديد بالنسبة لآخر زيارة
      try {
        localStorage.setItem(SEEN_KEY, new Date().toISOString());
      } catch {}
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 space-y-5 font-sans" dir="rtl">
      <BackHeader href="/" title="مستجدات أبنائي" subtitle="كل إعلانات ودروس واستدعاءات أساتذتهم في صفحة واحدة" />

      {!groups && <Loading />}

      {groups && groups.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">لم تحفظ أي أستاذ بعد</p>
          <p className="text-xs text-slate-500">افتح فضاء أستاذ ابنك واضغط زر الحفظ، ثم أضف اسم ابنك في المحفظة لتجميع المستجدات حسب كل ابن.</p>
          <Link href="/t/search" className="inline-block mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">
            البحث عن أستاذ
          </Link>
        </div>
      )}

      {failed.length > 0 && (
        <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
          تعذر تحميل مستجدات: {failed.join("، ")}
        </p>
      )}

      {groups?.map((g) => {
        const limit = shown[g.childName] ?? PAGE;
        const fresh = seenAt ? g.items.filter((i) => i.createdAt > seenAt).length : 0;
        return (
          <section key={g.childName} className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <UserRound className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-black text-slate-900">
                  {g.childName}
                  {fresh > 0 && (
                    <span className="mr-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">{fresh} جديد</span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-500 truncate">{g.teachers.map((t) => t.name).join(" • ")}</p>
              </div>
            </div>

            {g.items.length === 0 && <p className="text-xs text-slate-400 text-center py-3">لا توجد مستجدات بعد</p>}

            <ul className="space-y-2">
              {g.items.slice(0, limit).map((item) => {
                const k = KINDS[item.kind];
                const Icon = k.icon;
                const isNew = seenAt !== "" && item.createdAt > seenAt;
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className={`block rounded-xl border p-3 hover:shadow-sm transition ${
                        item.mentionsChild ? "border-rose-300 bg-rose-50/40" : "border-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold ${k.cls}`}>
                          <Icon className="w-3 h-3" /> {k.label}
                        </span>
                        {item.urgent && (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                            <AlertTriangle className="w-3 h-3" /> عاجل
                          </span>
                        )}
                        {item.mentionsChild && <span className="text-rose-700 font-black">يخص ابنك</span>}
                        {isNew && <span className="w-2 h-2 rounded-full bg-rose-500" aria-label="جديد" />}
                        <span className="mr-auto text-slate-400">{fmt(item.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 text-xs font-bold text-slate-800">{item.title}</p>
                      {item.body && <p className="mt-0.5 text-[11px] text-slate-600 line-clamp-2 whitespace-pre-wrap">{item.body}</p>}
                      <p className="mt-1 text-[10px] text-slate-400">{item.teacherName}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {g.items.length > limit && (
              <button
                onClick={() => setShown((s) => ({ ...s, [g.childName]: limit + PAGE }))}
                className="w-full py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                عرض المزيد ({g.items.length - limit})
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
