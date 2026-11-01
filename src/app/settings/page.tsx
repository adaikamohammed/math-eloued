"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  Save,
  UserCog,
  Sliders,
  Plus,
  Trash2,
  GraduationCap,
  Users,
  Mail,
  Building2,
  ShieldCheck,
  CalendarClock,
  Sparkles,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { TeacherQR } from "@/components/TeacherQR";
import { ChangePassword } from "@/components/ChangePassword";
import { BackupDataCard } from "@/components/BackupDataCard";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import {
  LEVELS,
  MIDDLE_SCHOOL_SUBJECTS,
  DEFAULT_FEATURE_FLAGS,
  type TeacherFeatureFlags,
} from "@/lib/types";

const inputCls =
  "w-full py-2.5 px-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition";

export default function TeacherSettingsPage() {
  const { loading, profile, reload } = useProfile();

  // المعلومات الأساسية
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [subject, setSubject] = useState("mathematics");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [levels, setLevels] = useState<number[]>([]);
  const [featureFlags, setFeatureFlags] = useState<TeacherFeatureFlags>(DEFAULT_FEATURE_FLAGS);

  // إدارة الأقسام
  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [newClassInput, setNewClassInput] = useState("");

  // حالات الحفظ والرسائل
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // جلب البريد من مصادقة Supabase
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setEmail(data.user.email);
        setInitialEmail(data.user.email);
      }
    });
  }, []);

  // جلب بيانات ملف الأستاذ
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    if ((profile as any).email && !email) {
      setEmail((profile as any).email);
      setInitialEmail((profile as any).email);
    }
    setSubject((profile as any).subject || "mathematics");
    setFeatureFlags((profile as any).feature_flags || DEFAULT_FEATURE_FLAGS);
    setBio(profile.bio || "");
    setSchoolName(profile.school_custom_name || "");
    setLevels(Array.isArray(profile.levels_taught) ? (profile.levels_taught as number[]) : []);

    // جلب رقم الهاتف الخاص من جدول الاتصال
    supabase
      .from("profile_contacts")
      .select("phone")
      .eq("id", profile.id)
      .maybeSingle()
      .then(({ data }) => setPhone(data?.phone || ""));

    // جلب الأقسام المخصصة للأستاذ
    supabase
      .from("teacher_public_data")
      .select("data")
      .eq("teacher_id", profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.data?.customClasses && Array.isArray(data.data.customClasses) && data.data.customClasses.length > 0) {
          setCustomClasses(data.data.customClasses);
        } else if (typeof window !== "undefined") {
          const saved = localStorage.getItem(`custom_classes_${profile.id}`);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) setCustomClasses(parsed);
            } catch (_) {}
          }
        }
      });
  }, [profile]);

  const handleAddClass = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newClassInput.trim();
    if (!clean) return;
    if (customClasses.includes(clean)) {
      setMessage({ type: "err", text: "هذا القسم موجود بالفعل في قائمتك" });
      return;
    }
    setCustomClasses((prev) => [...prev, clean]);
    setNewClassInput("");
  };

  const handleRemoveClass = (clsToRemove: string) => {
    setCustomClasses((prev) => prev.filter((c) => c !== clsToRemove));
  };

  const handleApplyPreset = (preset: string[]) => {
    setCustomClasses(preset);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!profile) return <LoginRequired next="/settings" title="إعدادات الحساب" />;

  // المفتش والمشرف: تغيير كلمة المرور فقط
  if (profile.role !== "teacher") {
    return (
      <div className="pb-16 pt-3 space-y-4 fade-up" dir="rtl">
        <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
          <Link
            href={profile.role === "admin" ? "/super-admin" : "/inspector"}
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center"
            aria-label="رجوع"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-black text-slate-800">
            إعدادات الحساب — {profile.full_name}
          </h1>
        </div>
        <ChangePassword />
      </div>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || levels.length === 0) {
      setMessage({ type: "err", text: "الاسم ومستوى دراسي واحد على الأقل مطلوبان" });
      return;
    }
    setSaving(true);
    setMessage(null);

    // 1. تحديث الملف الشخصي للأستاذ
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        subject: subject,
        bio: bio.trim() || null,
        school_custom_name: schoolName.trim() || null,
        levels_taught: [...levels].sort(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    // 2. تحديث رقم الهاتف
    const { error: contactError } = await supabase
      .from("profile_contacts")
      .upsert({ id: profile.id, phone: phone.trim() || null, updated_at: new Date().toISOString() });

    // 3. حفظ الأقسام المعتمدة
    if (typeof window !== "undefined") {
      localStorage.setItem(`custom_classes_${profile.id}`, JSON.stringify(customClasses));
    }
    const { data: pubData } = await supabase
      .from("teacher_public_data")
      .select("data")
      .eq("teacher_id", profile.id)
      .maybeSingle();

    if (pubData) {
      const merged = { ...(pubData.data || {}), customClasses, featureFlags, subject };
      await supabase
        .from("teacher_public_data")
        .update({ data: merged, updated_at: new Date().toISOString() })
        .eq("teacher_id", profile.id);
    }

    // 4. تحديث البريد الإلكتروني في حال تغييره
    let emailNotice = "";
    if (email.trim() && initialEmail && email.trim().toLowerCase() !== initialEmail.toLowerCase()) {
      const cleanNewEmail = email.trim().toLowerCase();
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("smart_update_teacher_email", {
          p_new_email: cleanNewEmail,
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
          setInitialEmail(cleanNewEmail);
          emailNotice = " (تم تحديث البريد الإلكتروني بنجاح)";
        } else {
          const { error: authErr } = await supabase.auth.updateUser({ email: cleanNewEmail });
          if (!authErr) {
            setInitialEmail(cleanNewEmail);
            emailNotice = " (تم تحديث البريد الإلكتروني بنجاح)";
          }
        }
      } catch (e) {
        console.warn("Email update err:", e);
      }
    }

    setSaving(false);
    if (error || contactError) {
      setMessage({ type: "err", text: (error || contactError)!.message });
    } else {
      setMessage({ type: "ok", text: `✓ تم حفظ الإعدادات بنجاح${emailNotice}؛ تظهر التحديثات في فضائك فوراً` });
      reload();
    }
  };

  return (
    <div className="pb-16 pt-2 space-y-4 fade-up max-w-4xl mx-auto font-sans" dir="rtl">
      {/* ─── ترويسة الصفحة والمعلومات السريعة ─── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 transition"
            aria-label="الرجوع للوحة التحكم"
            title="الرجوع للوحة الأستاذ"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base font-black text-slate-900 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-emerald-600" />
              <span>إعدادات الحساب والفضاء الشخصي</span>
            </h1>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap pt-0.5 font-bold">
              <span className="flex items-center gap-1">
                <span>رمز الأستاذ:</span>
                <strong className="font-mono text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {profile.teacher_code}
                </strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <strong className="font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200" dir="ltr">
                  {email || (profile as any).email || "جاري جلب البريد..."}
                </strong>
              </span>
              <span>•</span>
              <span>المقاطعة {profile.district_id ?? "1"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── بطاقات الوصول السريع ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <Link
          href="/settings/features"
          className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 hover:border-emerald-300 transition shadow-2xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="block text-xs font-black text-slate-900 group-hover:text-emerald-800">
                تخصيص الواجهة والصفحات
              </span>
              <span className="text-[10px] text-slate-500 font-medium">إظهار وإخفاء صفحات الشريط</span>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 rotate-180 transition" />
        </Link>

        <Link
          href="/admin/students"
          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition shadow-2xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="block text-xs font-black text-slate-900 group-hover:text-emerald-800">
                إدارة الأفواج والتلاميذ
              </span>
              <span className="text-[10px] text-slate-500 font-medium">القوائم والترتيب الأبجدي</span>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 rotate-180 transition" />
        </Link>

        <Link
          href="/admin/timetable"
          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition shadow-2xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="block text-xs font-black text-slate-900 group-hover:text-emerald-800">
                التوقيت الأسبوعي
              </span>
              <span className="text-[10px] text-slate-500 font-medium">جدول الحصص الأسبوعي</span>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 rotate-180 transition" />
        </Link>
      </div>

      {/* ─── استمارة الإعدادات الرئيسية ─── */}
      <form onSubmit={save} className="space-y-4">
        {message && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold border flex items-center gap-2 ${
              message.type === "ok"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            <span>{message.text}</span>
          </div>
        )}

        {/* 1. المعلومات الشخصية والمهنية */}
        <section className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <UserCog className="w-4 h-4 text-emerald-600" />
              <span>المعلومات الشخصية والمهنية</span>
            </h2>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-900 font-black px-2 py-0.5 rounded-md border border-emerald-200">
              {profile.teacher_code}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* الاسم واللقب */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">
                الاسم واللقب الكامل للأستاذ: <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="الاسم واللقب"
                required
              />
            </div>

            {/* المادة التعليمية */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">
                المادة التعليمية: <span className="text-red-500">*</span>
              </label>
              <select
                className={inputCls}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {MIDDLE_SCHOOL_SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name} ({s.codePrefix})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* البريد الإلكتروني الرسمي المعتمد للحساب */}
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>البريد الإلكتروني المعتمد للحساب</span>
              </label>
              <span className="text-[10px] text-emerald-800 bg-emerald-100/70 font-black px-2 py-0.5 rounded-full border border-emerald-300">
                ✓ معتمد للدخول واسترجاع الحساب
              </span>
            </div>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mohammedadaika104@gmail.com"
                className="w-full py-2 px-3 pl-9 rounded-xl border border-slate-200 bg-white text-xs font-mono text-left focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-800"
                dir="ltr"
                required
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              البريد الرسمي المسجل في قاعدة البيانات؛ يمكنك تحديثه هنا عند الحاجة لحفظ بياناتك واسترجاع كلمة المرور بسهولة.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* المؤسسة التعليمية (المتوسطة) - اسم مباشر وبسيط دون قوائم معقدة */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>المؤسسة التعليمية (المتوسطة):</span>
              </label>
              <input
                className={inputCls}
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="اكتب اسم المتوسطة (مثلاً: متوسطة باهي علي)"
              />
              <p className="text-[10px] text-slate-400 font-medium">
                يظهر اسم المتوسطة في ترويسة الدروس، لوحة الشرف، والوثائق الرسمية.
              </p>
            </div>

            {/* رقم الهاتف الخاص */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">
                رقم الهاتف (سري - يراه المفتش والإدارة فقط):
              </label>
              <input
                className={inputCls}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06XXXXXXXX"
                dir="ltr"
              />
            </div>
          </div>

          {/* المستويات التي أدرسها هذا العام */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 block">
              المستويات التي أدرسها هذا العام: <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([1, 2, 3, 4] as const).map((lv) => {
                const active = levels.includes(lv);
                return (
                  <button
                    type="button"
                    key={lv}
                    onClick={() =>
                      setLevels((prev) =>
                        prev.includes(lv) ? prev.filter((l) => l !== lv) : [...prev, lv]
                      )
                    }
                    className={`py-2.5 rounded-2xl border text-xs font-black transition cursor-pointer ${
                      active
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {LEVELS[lv].short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* نبذة قصيرة */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">
              نبذة قصيرة تظهر في فضاء الأستاذ العام (اختياري):
            </label>
            <textarea
              className={`${inputCls} min-h-18 leading-relaxed`}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="اكتب كلمة ترحيبية أو توجيهاً مختصراً لتلاميذك وأوليائهم..."
            />
          </div>
        </section>

        {/* 2. أقسامي المعتمدة */}
        <section className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>أقسامي المعتمدة (يحددها الأستاذ بحرية)</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                حدد أقسامك (مثلاً: 1م1، 4م2، فوج 1...)؛ ستظهر تلقائياً في كراس الدروس، وجداول التقويم، ولوحة الشرف.
              </p>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-lg border border-emerald-200">
              {customClasses.length} أقسام
            </span>
          </div>

          {/* قائمة الأقسام الحالية مع زر الحذف */}
          <div className="flex flex-wrap gap-2 pt-1">
            {customClasses.length === 0 ? (
              <span className="text-xs text-slate-400 italic">لا توجد أقسام مسجلة حالياً، أضف أقسامك بالأسفل</span>
            ) : (
              customClasses.map((cls) => (
                <span
                  key={cls}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-black text-slate-800 shadow-2xs"
                >
                  <span>{cls}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveClass(cls)}
                    className="text-slate-400 hover:text-red-600 transition cursor-pointer"
                    title={`حذف القسم ${cls}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* حقل إضافة قسم جديد */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newClassInput}
              onChange={(e) => setNewClassInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddClass();
                }
              }}
              placeholder="اكتب اسم القسم (مثلاً: 4 م 3 أو 1 م 1)..."
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => handleAddClass()}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة قسم</span>
            </button>
          </div>

          {/* نماذج سريعة جاهزة */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <span className="font-bold">نماذج سريعة:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset(["1 م 1", "1 م 2", "1 م 3", "1 م 4"])}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer border border-slate-200"
            >
              أقسام 1 متوسط (1م1 - 1م4)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(["4 م 1", "4 م 2", "4 م 3"])}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer border border-slate-200"
            >
              أقسام 4 متوسط BEM
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(["1 م 1", "2 م 2", "3 م 1", "4 م 2"])}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer border border-slate-200"
            >
              مستويات متنوعة (1م1، 2م2، 3م1، 4م2)
            </button>
          </div>
        </section>

        {/* 3. بطاقة تخصيص الواجهة والصفحات المباشرة */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 rounded-3xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-700">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-black text-white">
                تخصيص صفحات المنصة ومفاتيح الميزات
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              يمكنك إظهار أو إخفاء أي صفحة من شريطك الجانبي (كراس الدروس، لوحة الشرف، دفتر النصوص، فضاء التفتيش...) بنقرة واحدة بحرية تامة.
            </p>
          </div>

          <Link
            href="/settings/features"
            className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-2 shrink-0 shadow-sm"
          >
            <span>فتح لوحة تخصيص الميزات</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>

        {/* زر الحفظ الأساسي */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-black flex items-center justify-center gap-2 cursor-pointer transition shadow-md shadow-emerald-700/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>حفظ التعديلات والمعلومات الشخصية</span>
        </button>
      </form>

      {/* ─── رمز الاستجابة السريع لمشاركة الفضاء ─── */}
      <TeacherQR
        path={`/t/${profile.slug || profile.id}`}
        teacherName={profile.full_name || "الأستاذ"}
        code={profile.teacher_code}
        schoolName={schoolName || profile.school_custom_name || ""}
      />

      {/* ─── النسخ الاحتياطي وتغيير كلمة المرور ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BackupDataCard />
        <ChangePassword />
      </div>
    </div>
  );
}
