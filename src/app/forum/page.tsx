"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileUp,
  Loader2,
  MessageSquare,
  Pin,
  Plus,
  Search,
  ThumbsUp,
  Trophy,
  Upload,
  Users,
  Sparkles,
  Layers,
  Filter,
  CheckCircle2,
  Paperclip,
  BookOpen,
  Award,
  HelpCircle,
  FolderOpen,
  ChevronDown,
  X,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { safeStorageName, validateUpload, compressIfImage } from "@/lib/compress";
import { LEVELS } from "@/lib/types";
import { FORUM_CATEGORIES, badgeFor, timeAgo, type ForumCategory, type ForumTopic } from "./shared";

type Leader = { author_id: string; author_name: string; author_role: string; points: number; posts: number };

export default function ForumPage() {
  const { loading, profile } = useProfile();
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [kind, setKind] = useState<"all" | "question" | "resource">("all");
  const [category, setCategory] = useState<"all" | ForumCategory>("all");
  const [level, setLevel] = useState<"all" | number>("all");
  const [query, setQuery] = useState("");
  const [showFormModal, setShowFormModal] = useState(false);

  const isMember = Boolean(profile && profile.is_verified !== false && ["teacher", "inspector", "admin"].includes(profile.role));

  const load = useCallback(async () => {
    setLoadingTopics(true);
    const [{ data }, { data: lb }] = await Promise.all([
      supabase.from("forum_topics").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(200),
      supabase.rpc("forum_leaderboard", { p_limit: 8 }),
    ]);
    setTopics((data as ForumTopic[]) || []);
    setLeaders((lb as Leader[]) || []);
    setLoadingTopics(false);
  }, []);

  useEffect(() => {
    if (isMember) load();
  }, [isMember, load]);

  const pointsOf = useMemo(() => Object.fromEntries(leaders.map((l) => [l.author_id, Number(l.points)])), [leaders]);

  const filtered = topics.filter((t) => {
    const q = query.trim();
    return (
      (kind === "all" || t.kind === kind) &&
      (category === "all" || t.category === category) &&
      (level === "all" || t.level === level) &&
      (!q || t.title.includes(q) || t.body.includes(q))
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-emerald-600" />
        <p className="text-xs font-bold text-slate-500">جارٍ تحميل الملتقى البيداغوجي...</p>
      </div>
    );
  }

  if (!isMember || !profile) return <LoginRequired next="/forum" title="ملتقى أساتذة الرياضيات" />;

  const back = profile.role === "inspector" ? "/inspector" : profile.role === "admin" ? "/super-admin" : "/admin";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20" dir="rtl">
      {/* ─── ترويسة الملتقى الرسمية الفخمة ─── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 text-white pt-8 pb-14 px-4 sm:px-6 rounded-b-[2rem] sm:rounded-b-[2.5rem] shadow-xl border-b border-emerald-900/40">
        <div className="max-w-6xl mx-auto space-y-4 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={back}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full backdrop-blur-md transition"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة إلى لوحتي ({profile.role === "inspector" ? "المفتش" : profile.role === "admin" ? "المشرف" : "الأستاذ"})</span>
            </Link>

            <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/20 px-3 py-1 rounded-full text-[11px] text-emerald-300 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>فضاء بيداغوجي مهني مغلق • محمي ومخصص للأساتذة والمفتشين</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl font-black flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
                  <Users className="w-6 h-6" />
                </div>
                <span>ملتقى أساتذة الرياضيات — ولاية الوادي</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                مساحة حوار مهنية رفيعة لتبادل المذكرات، الوضعيات الانطلاقية، ومعالجة صعوبات التعلم. إجابات المفتشين تُميّز تلقائياً بختم <strong>«توجيه رسمي معتمد»</strong> وتثبّت في قمة النقاش.
              </p>
            </div>

            <button
              onClick={() => setShowFormModal(true)}
              className="py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-700/30 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>مشاركة موضوع أو وضعية جديدة</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── المحتوى والشبكة الرئيسية ─── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-6 relative z-20">
        <div className="space-y-4">
          {/* ─── شريط التصفية والبحث العصري ─── */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-4 space-y-3.5">
            {/* التبويب الرئيسي للنوع */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["all", "الكل", Layers],
                  ["question", "❓ أسئلة وإشكاليات بيداغوجية", HelpCircle],
                  ["resource", "📚 بنك المذكرات والوضعيات", FolderOpen],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    kind === k
                      ? "bg-emerald-700 text-white shadow-sm shadow-emerald-700/20"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* أدوات البحث والتصفية حسب المستوى والتصنيف */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="relative">
                <input
                  type="text"
                  className="w-full py-2.5 pl-3 pr-9 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                  placeholder="ابحث في العناوين والشروحات..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>

              {/* اختيار السنة / المستوى */}
              <select
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                value={level}
                onChange={(e) => setLevel(e.target.value === "all" ? "all" : Number(e.target.value))}
              >
                <option value="all">كل المستويات الدراسية</option>
                {([1, 2, 3, 4] as const).map((l) => (
                  <option key={l} value={l}>
                    {LEVELS[l].label}
                  </option>
                ))}
              </select>

              {/* اختيار التصنيف البيداغوجي */}
              <select
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
              >
                <option value="all">كل التصنيفات والمجالات</option>
                {(Object.keys(FORUM_CATEGORIES) as ForumCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {FORUM_CATEGORIES[c].icon} {FORUM_CATEGORIES[c].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ─── قائمة المواضيع ─── */}
          {loadingTopics ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs text-slate-500 font-bold">جارٍ جلب مواضيع الملتقى...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto font-bold">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-800 text-sm">لا توجد مواضيع مطابقة للبحث</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                كن المبادر واطرح أول إشكالية أو شارك مذكرة ووضعية نموذجية يستفيد منها زملاؤك في الولاية!
              </p>
              <button
                onClick={() => setShowFormModal(true)}
                className="mt-2 py-2 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs"
              >
                إضافة موضوع جديد
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => {
                const cat = FORUM_CATEGORIES[t.category] ?? FORUM_CATEGORIES.other;
                const badge = badgeFor(pointsOf[t.author_id] || 0, t.author_role);
                const isInspectorTopic = t.author_role === "inspector";

                return (
                  <Link
                    key={t.id}
                    href={`/forum/${t.id}`}
                    className={`block bg-white rounded-3xl border p-5 transition-all group ${
                      t.has_official
                        ? "border-amber-300 shadow-md shadow-amber-500/5 hover:border-amber-400"
                        : t.is_pinned
                        ? "border-emerald-300 shadow-sm hover:border-emerald-400"
                        : "border-slate-200/90 hover:border-emerald-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* صندوق التصويت والأصوات */}
                      <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-emerald-50/50 group-hover:border-emerald-200 text-slate-500 shrink-0 w-12 text-center transition">
                        <ThumbsUp className="w-4 h-4 text-emerald-700" />
                        <span className="text-sm font-black text-slate-800 mt-0.5">{t.votes}</span>
                        <span className="text-[9px] text-slate-400">تأييد</span>
                      </div>

                      {/* المحتوى الرئيسي للبطاقة */}
                      <div className="min-w-0 flex-1 space-y-2">
                        {/* الشارات العلوية */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                          {t.is_pinned && (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300/60 flex items-center gap-1 font-black">
                              <Pin className="w-3 h-3" /> مثبت في الملتقى
                            </span>
                          )}
                          {t.has_official && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1 font-black shadow-xs">
                              <BadgeCheck className="w-3.5 h-3.5 text-amber-600" /> توجيه رسمي معتمد 🛡️
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-lg ${
                              t.kind === "resource"
                                ? "bg-teal-50 text-teal-800 border border-teal-200/60"
                                : "bg-sky-50 text-sky-800 border border-sky-200/60"
                            }`}
                          >
                            {t.kind === "resource" ? "مورد / مذكرة" : "سؤال وإشكالية"}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                            {cat.icon} {cat.label}
                          </span>
                          {t.level && (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold">
                              {t.level} متوسط
                            </span>
                          )}
                        </div>

                        {/* عنوان الموضوع */}
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition leading-snug">
                          {t.title}
                        </h2>

                        {/* مقتطف من نص الموضوع */}
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {t.body}
                        </p>

                        {/* شريط معلومات الكاتب والتفاعل أسفل البطاقة */}
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-700">{t.author_name}</span>
                            {isInspectorTopic ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]">
                                🛡️ مفتش التربية الوطنية
                              </span>
                            ) : badge ? (
                              <span className={`px-1.5 py-0.5 rounded border text-[10px] ${badge.className}`}>
                                {badge.label}
                              </span>
                            ) : null}
                            <span>•</span>
                            <span>{timeAgo(t.created_at)}</span>
                          </div>

                          <div className="flex items-center gap-3 text-slate-500 font-bold">
                            {t.attachment_path && (
                              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg text-[10px]">
                                <Paperclip className="w-3 h-3" />
                                <span>مرفق</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                              <span>{t.replies_count} رد</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── الشريط الجانبي: لوحة الصدارة والتكريم ─── */}
        <aside className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-md p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">لوحة التميز البيداغوجي</h3>
                <p className="text-[10px] text-slate-400">الأساتذة الأكثر تفاعلاً وإفادة في الولاية</p>
              </div>
            </div>

            {leaders.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">لا توجد مشاركات مسجلة بعد.</p>
            ) : (
              <ol className="space-y-2.5">
                {leaders.map((l, i) => {
                  const badge = badgeFor(Number(l.points), l.author_role);
                  return (
                    <li
                      key={l.author_id}
                      className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 transition border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                            i === 0
                              ? "bg-amber-400 text-amber-950 shadow-sm"
                              : i === 1
                              ? "bg-slate-300 text-slate-800"
                              : i === 2
                              ? "bg-amber-700 text-amber-50"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{l.author_name}</p>
                          {badge && <span className="text-[10px] text-slate-500 block truncate">{badge.label}</span>}
                        </div>
                      </div>
                      <span className="font-black text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-lg text-xs shrink-0 font-mono">
                        {l.points} ن
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
              <p className="font-bold text-slate-700">كيف تُحسب نقاط التميز؟</p>
              <ul className="space-y-1 text-[10px] text-slate-500">
                <li>• <strong>10 نقاط:</strong> لكل تصويت تأييد من الزملاء</li>
                <li>• <strong>5 نقاط:</strong> لكل مورد أو وضعية نموذجية منشورة</li>
                <li>• <strong>2 نقطتان:</strong> لكل إجابة ومساهمة حل</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {/* ─── نافذة منبثقة أنيقة لكتابة موضوع جديد (Modal Composer) ─── */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-black text-slate-900 text-base">مشاركة موضوع جديد في الملتقى</h3>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <NewTopicForm
              authorId={profile.id}
              onCreated={() => {
                setShowFormModal(false);
                load();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function NewTopicForm({ authorId, onCreated }: { authorId: string; onCreated: () => void }) {
  const [kind, setKind] = useState<"question" | "resource">("question");
  const [category, setCategory] = useState<ForumCategory>("situations");
  const [level, setLevel] = useState<string>("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    let attachmentPath: string | null = null;
    try {
      if (file) {
        const invalid = validateUpload(file);
        if (invalid) throw new Error(invalid);
        const prepared = await compressIfImage(file);
        attachmentPath = `${authorId}/${safeStorageName(prepared.name)}`;
        const { error: upErr } = await supabase.storage.from("forum-files").upload(attachmentPath, prepared, { contentType: prepared.type });
        if (upErr) throw new Error(upErr.message);
      }
      const { error: insErr } = await supabase.from("forum_topics").insert({
        author_id: authorId,
        kind,
        category,
        level: level ? Number(level) : null,
        title: title.trim(),
        body: body.trim(),
        attachment_path: attachmentPath,
        attachment_name: file?.name ?? null,
      });
      if (insErr) {
        if (attachmentPath) await supabase.storage.from("forum-files").remove([attachmentPath]);
        throw new Error(insErr.message);
      }
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full py-2.5 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition";

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* اختيار نوع المنشور */}
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["question", "❓ أطرح سؤالاً / إشكالية بيداغوجية"],
            ["resource", "📚 أشارك مورداً / وضعية / مذكرة"],
          ] as const
        ).map(([k, label]) => (
          <button
            type="button"
            key={k}
            onClick={() => setKind(k)}
            className={`p-2.5 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              kind === k
                ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">المجال / التصنيف</label>
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as ForumCategory)}>
            {(Object.keys(FORUM_CATEGORIES) as ForumCategory[]).map((c) => (
              <option key={c} value={c}>
                {FORUM_CATEGORIES[c].icon} {FORUM_CATEGORIES[c].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">المستوى الدراسي المستهدف</label>
          <select className={inputCls} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">كل المستويات (عام)</option>
            {([1, 2, 3, 4] as const).map((l) => (
              <option key={l} value={l}>
                {LEVELS[l].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان الموضوع</label>
        <input
          className={inputCls}
          placeholder="مثال: إشكالية تقديم مفهوم النسبة المئوية في السنة الثانية متوسط"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={200}
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">الشرح والتفاصيل البيداغوجية</label>
        <textarea
          className={`${inputCls} min-h-28`}
          placeholder={
            kind === "question"
              ? "اشرح الإشكالية بدقة: ما هي الصعوبة التي لاحظتها لدى التلاميذ؟ ما النشاط الذي طبقته؟ وما هو استفسارك لزملائك والمفتش؟"
              : "قدّم المورد التعليمي: الكفاءة المستهدفة، التوجيهات الخاصة بتطبيقه، وهل هو مقترح لاختبار أو نشاط تعلمي..."
          }
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={3}
        />
      </div>

      {/* رفع المرفق */}
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">إرفاق ملف أو صورة (اختياري)</label>
        <label className="flex items-center justify-between p-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/30 text-xs text-slate-600 cursor-pointer transition">
          <div className="flex items-center gap-2 truncate">
            <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">{file ? file.name : "اضغط لاختيار صورة سبورة أو وثيقة PDF"}</span>
          </div>
          {file && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {error && <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">{error}</p>}

      <button
        disabled={busy}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 disabled:opacity-50 transition cursor-pointer"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
        <span>نشر الموضوع في الملتقى الولائي</span>
      </button>
    </form>
  );
}
