"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Loader2,
  Paperclip,
  Pin,
  Send,
  ThumbsUp,
  Trash2,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Download,
  Award,
  CheckCircle2,
  Clock,
  User,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { LEVELS } from "@/lib/types";
import { FORUM_CATEGORIES, timeAgo, type ForumReply, type ForumTopic } from "../shared";

export function TopicView({ id }: { id: string }) {
  const router = useRouter();
  const { loading, profile } = useProfile();
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const isMember = Boolean(profile && profile.is_verified !== false && ["teacher", "inspector", "admin"].includes(profile.role));

  const load = useCallback(async () => {
    if (!profile) return;
    const [{ data: t }, { data: r }, { data: v }] = await Promise.all([
      supabase.from("forum_topics").select("*").eq("id", id).maybeSingle(),
      supabase.from("forum_replies").select("*").eq("topic_id", id).order("is_official", { ascending: false }).order("votes", { ascending: false }).order("created_at"),
      supabase.from("forum_votes").select("target_type, target_id").eq("voter_id", profile.id),
    ]);
    if (!t) setNotFound(true);
    setTopic((t as ForumTopic) ?? null);
    setReplies((r as ForumReply[]) || []);
    setMyVotes(new Set((v || []).map((x) => `${x.target_type}:${x.target_id}`)));
  }, [id, profile]);

  useEffect(() => {
    if (isMember) load();
  }, [isMember, load]);

  const toggleVote = async (type: "topic" | "reply", targetId: string, authorId: string) => {
    if (!profile || authorId === profile.id) return;
    const key = `${type}:${targetId}`;
    setError("");
    const { error: err } = myVotes.has(key)
      ? await supabase.from("forum_votes").delete().eq("target_type", type).eq("target_id", targetId).eq("voter_id", profile.id)
      : await supabase.from("forum_votes").insert({ target_type: type, target_id: targetId, voter_id: profile.id });
    if (err) setError(err.message);
    await load();
  };

  const reply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || body.trim().length < 2) return;
    setBusy(true);
    const { error: err } = await supabase.from("forum_replies").insert({ topic_id: id, author_id: profile.id, body: body.trim() });
    setBusy(false);
    if (err) setError(err.message);
    else {
      setBody("");
      load();
    }
  };

  const togglePin = async () => {
    if (!topic) return;
    const { error: err } = await supabase.from("forum_topics").update({ is_pinned: !topic.is_pinned }).eq("id", topic.id);
    if (err) setError(err.message);
    else load();
  };

  const removeTopic = async () => {
    if (!topic || !confirm("هل أنت متأكد من حذف هذا الموضوع وجميع الردود التابعة له نهائياً؟")) return;
    const { error: err } = await supabase.from("forum_topics").delete().eq("id", topic.id);
    if (err) return setError(err.message);
    if (topic.attachment_path) await supabase.storage.from("forum-files").remove([topic.attachment_path]);
    router.push("/forum");
  };

  const removeReply = async (r: ForumReply) => {
    if (!confirm("هل أنت متأكد من حذف هذه الإجابة؟")) return;
    const { error: err } = await supabase.from("forum_replies").delete().eq("id", r.id);
    if (err) setError(err.message);
    else load();
  };

  const openAttachment = async () => {
    if (!topic?.attachment_path) return;
    const { data } = await supabase.storage.from("forum-files").createSignedUrl(topic.attachment_path, 900);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs text-slate-500 font-bold">جارٍ تحميل الموضوع...</p>
      </div>
    );
  }

  if (!isMember || !profile) return <LoginRequired next={`/forum/${id}`} title="ملتقى أساتذة الرياضيات" />;

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4" dir="rtl">
        <h2 className="text-lg font-black text-slate-800">الموضوع غير موجود أو تم حذفه</h2>
        <Link href="/forum" className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-emerald-600 text-white font-bold text-xs">
          <ArrowRight className="w-4 h-4" />
          <span>العودة لملتقى الأساتذة</span>
        </Link>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const cat = FORUM_CATEGORIES[topic.category] ?? FORUM_CATEGORIES.other;
  const canModerate = profile.role === "inspector" || profile.role === "admin";
  const topicVoted = myVotes.has(`topic:${topic.id}`);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 font-sans text-slate-900" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* زر العودة العلوي */}
        <div className="flex items-center justify-between">
          <Link
            href="/forum"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-emerald-800 font-bold bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لملتقى أساتذة الرياضيات</span>
          </Link>
          <div className="text-[11px] text-slate-400 font-bold">
            معرف الموضوع: #{topic.id.substring(0, 8)}
          </div>
        </div>

        {/* ─── بطاقة الموضوع الرئيسي الفاخرة ─── */}
        <article
          className={`bg-white rounded-3xl border p-6 sm:p-8 space-y-5 shadow-sm ${
            topic.has_official
              ? "border-amber-300 ring-2 ring-amber-100"
              : topic.is_pinned
              ? "border-emerald-300"
              : "border-slate-200/90"
          }`}
        >
          {/* الشارات والتصنيفات */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {topic.is_pinned && (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-950 border border-emerald-300 flex items-center gap-1 font-black">
                <Pin className="w-3.5 h-3.5" /> مثبت في الملتقى
              </span>
            )}
            {topic.has_official && (
              <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1.5 font-black shadow-xs">
                <BadgeCheck className="w-4 h-4 text-amber-600" /> يحتوي على توجيه رسمي معتمد 🛡️
              </span>
            )}
            <span
              className={`px-2.5 py-1 rounded-xl ${
                topic.kind === "resource"
                  ? "bg-teal-50 text-teal-800 border border-teal-200"
                  : "bg-sky-50 text-sky-800 border border-sky-200"
              }`}
            >
              {topic.kind === "resource" ? "مورد / مذكرة نموذجية" : "سؤال وإشكالية"}
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700">
              {cat.icon} {cat.label}
            </span>
            {topic.level && (
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold font-mono">
                {LEVELS[topic.level as 1 | 2 | 3 | 4]?.label}
              </span>
            )}
          </div>

          {/* عنوان الموضوع */}
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
            {topic.title}
          </h1>

          {/* تفاصيل الكاتب وتاريخ النشر */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 text-xs text-slate-500">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center">
              {topic.author_name.substring(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">{topic.author_name}</span>
                {topic.author_role === "inspector" && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                    🛡️ مفتش التربية الوطنية
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">نُشر {timeAgo(topic.created_at)}</p>
            </div>
          </div>

          {/* متن الموضوع */}
          <div className="text-sm sm:text-base text-slate-800 whitespace-pre-wrap leading-relaxed py-2">
            {topic.body}
          </div>

          {/* زر تحميل المرفق إن وجد */}
          {topic.attachment_path && (
            <div className="pt-2">
              <button
                onClick={openAttachment}
                className="px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>تحميل المرفق المرفق: {topic.attachment_name || "ملف الوثيقة"}</span>
              </button>
            </div>
          )}

          {/* شريط الإجراءات: التصويت، التثبيت، والحذف */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleVote("topic", topic.id, topic.author_id)}
                disabled={topic.author_id === profile.id}
                className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition cursor-pointer ${
                  topicVoted
                    ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                title={topic.author_id === profile.id ? "لا يمكنك التصويت على مشاركتك" : "أؤيد هذه المشاركة"}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>مفيد وتأييد ({topic.votes})</span>
              </button>

              {canModerate && (
                <button
                  onClick={togglePin}
                  className="py-2 px-3.5 rounded-xl text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>{topic.is_pinned ? "إلغاء التثبيت" : "تثبيت في القمة"}</span>
                </button>
              )}
            </div>

            {(topic.author_id === profile.id || profile.role === "admin") && (
              <button
                onClick={removeTopic}
                className="py-2 px-3 rounded-xl text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف الموضوع</span>
              </button>
            )}
          </div>
        </article>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold">
            {error}
          </div>
        )}

        {/* ─── قسم الإجابات والردود ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-700" />
              <span>الإجابات والمساهمات البيداغوجية ({replies.length})</span>
            </h2>
            <span className="text-xs text-slate-400">إجابة المفتش تظهر أولاً كتوجيه رسمي</span>
          </div>

          {replies.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center text-xs text-slate-400 space-y-2">
              <p>لا توجد إجابات بعد على هذا الموضوع.</p>
              <p className="font-bold text-slate-600">كن أول من يشارك زملاءه الحل أو التوجيه المناسب!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {replies.map((r) => {
                const voted = myVotes.has(`reply:${r.id}`);
                const isInspector = r.is_official || r.author_role === "inspector";

                return (
                  <div
                    key={r.id}
                    className={`rounded-3xl border p-5 sm:p-6 space-y-3 transition-all ${
                      isInspector
                        ? "bg-gradient-to-r from-amber-50/90 to-yellow-50/70 border-2 border-amber-300 shadow-md shadow-amber-500/10"
                        : "bg-white border-slate-200/90 shadow-2xs"
                    }`}
                  >
                    {/* الترويسة الخاصة برد المفتش */}
                    {isInspector && (
                      <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
                        <div className="flex items-center gap-2 text-amber-950 font-black text-xs sm:text-sm">
                          <div className="w-7 h-7 rounded-lg bg-amber-400 text-amber-950 flex items-center justify-center font-bold shadow-xs">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <span>توجيه بيداغوجي رسمي معتمد — مفتشية التعليم المتوسط</span>
                        </div>
                        <span className="text-[10px] font-bold bg-amber-200/80 text-amber-950 px-2.5 py-0.5 rounded-full">
                          مرجع رسمي
                        </span>
                      </div>
                    )}

                    {/* متن الإجابة */}
                    <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {r.body}
                    </div>

                    {/* معلومات كاتب الإجابة والتصويت */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-800">{r.author_name}</strong>
                        {isInspector && (
                          <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                            مفتش المادة
                          </span>
                        )}
                        <span>•</span>
                        <span className="text-slate-400 text-[11px]">{timeAgo(r.created_at)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleVote("reply", r.id, r.author_id)}
                          disabled={r.author_id === profile.id}
                          className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition cursor-pointer ${
                            voted
                              ? "bg-emerald-700 text-white border-emerald-700"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>تأييد ({r.votes})</span>
                        </button>

                        {(r.author_id === profile.id || profile.role === "admin") && (
                          <button
                            onClick={() => removeReply(r)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                            title="حذف الإجابة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── نموذج إضافة إجابة جديدة ─── */}
          <form onSubmit={reply} className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <User className="w-4 h-4 text-emerald-600" />
              <span>
                {profile.role === "inspector"
                  ? "كتابة توجيه رسمي للمقاطعة بصفتك مفتشاً:"
                  : "شارك إجابتك أو تجربتك في الميدان:"}
              </span>
            </div>

            <textarea
              className="w-full min-h-24 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
              placeholder={
                profile.role === "inspector"
                  ? "اكتب التوجيه البيداغوجي المعتمد: طريقة المعالجة المقترحة، السند التربوي، والتوصيات للأساتذة..."
                  : "اكتب مقترحك أو توضيحك: كيف تعاملت مع هذه الإشكالية في قسمك؟"
              }
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              minLength={2}
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                {profile.role === "inspector" ? "⭐ ستُعلّم إجابتك تلقائياً كتوجيه معتمد" : "شارك بإيجابية لرفع رصيدك في لوحة التميز"}
              </span>

              <button
                disabled={busy || body.trim().length < 2}
                className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-700/20 disabled:opacity-40 transition cursor-pointer"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>إرسال الإجابة</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
