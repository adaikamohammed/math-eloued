"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Loader2,
  Save,
  UserCog,
  Sliders,
  Scale,
  BookOpen,
  Trophy,
  CalendarClock,
  Megaphone,
  MessageSquare,
  ShieldAlert,
  Plus,
  Trash2,
  FileText,
  Image as ImageIcon,
  Video,
  Eye,
  Layers,
  GraduationCap,
  Users,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { TeacherQR } from "@/components/TeacherQR";
import { ChangePassword } from "@/components/ChangePassword";
import { BackupDataCard } from "@/components/BackupDataCard";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import {
  LEVELS,
  SCHOOL_DAYS,
  MIDDLE_SCHOOL_SUBJECTS,
  DEFAULT_FEATURE_FLAGS,
  type ReceptionInfo,
  type TeacherFeatureFlags,
} from "@/lib/types";

const inputCls =
  "w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500";

export default function TeacherSettingsPage() {
  const { loading, profile, reload } = useProfile();
  const [schools, setSchools] = useState<{ id: string; name: string; commune: string }[]>([]);
  const [fullName, setFullName] = useState("");
  const [subject, setSubject] = useState("mathematics");
  const [featureFlags, setFeatureFlags] = useState<TeacherFeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [levels, setLevels] = useState<number[]>([]);
  const [reception, setReception] = useState<ReceptionInfo>({});
  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [newClassInput, setNewClassInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
    setSubject((profile as any).subject || "mathematics");
    setFeatureFlags((profile as any).feature_flags || DEFAULT_FEATURE_FLAGS);
    // رقم الهاتف في جدول خاص لا يراه إلا صاحبه ومفتش مقاطعته والمشرف
    supabase
      .from("profile_contacts")
      .select("phone")
      .eq("id", profile.id)
      .maybeSingle()
      .then(({ data }) => setPhone(data?.phone || ""));
    setBio(profile.bio || "");
    setSchoolId(profile.middle_school_id || "");
    setSchoolName(profile.school_custom_name || "");
    setLevels(Array.isArray(profile.levels_taught) ? (profile.levels_taught as number[]) : []);
    setReception(profile.reception || {});
    if (profile.district_id) {
      supabase
        .from("middle_schools")
        .select("id, name, commune")
        .eq("district_id", profile.district_id)
        .order("name")
        .then(({ data }) => setSchools(data || []));
    }

    // جلب الأقسام المخصصة للأستاذ من فضاء البيانات العامة
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }
  if (!profile) return <LoginRequired next="/settings" title="إعدادات الحساب" />;

  // المفتش والمشرف: تغيير كلمة المرور فقط
  if (profile.role !== "teacher") {
    return (
      <div className="pb-16 pt-3 space-y-4 fade-up">
        <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
          <Link
            href={profile.role === "admin" ? "/super-admin" : "/inspector"}
            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center"
            aria-label="رجوع"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-extrabold text-slate-800">إعدادات الحساب — {profile.full_name}</h1>
        </div>
        <ChangePassword />
      </div>
    );
  }

  const setR = (patch: Partial<ReceptionInfo>) => setReception((r) => ({ ...r, ...patch }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || levels.length === 0) {
      setMessage({ type: "err", text: "الاسم ومستوى دراسي واحد على الأقل مطلوبان" });
      return;
    }
    setSaving(true);
    setMessage(null);
    const chosenSchool = schools.find((s) => s.id === schoolId);
    const cleanReception = Object.fromEntries(
      Object.entries(reception).map(([k, v]) => [k, (v || "").trim()]).filter(([, v]) => v)
    );
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        subject: subject,
        feature_flags: featureFlags,
        bio: bio.trim() || null,
        middle_school_id: chosenSchool ? chosenSchool.id : null,
        school_custom_name: chosenSchool ? chosenSchool.name : schoolName.trim() || null,
        levels_taught: [...levels].sort(),
        reception: Object.keys(cleanReception).length ? cleanReception : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    const { error: contactError } = await supabase
      .from("profile_contacts")
      .upsert({ id: profile.id, phone: phone.trim() || null, updated_at: new Date().toISOString() });

    // حفظ الأقسام المخصصة للأستاذ
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

    setSaving(false);
    if (error || contactError) setMessage({ type: "err", text: (error || contactError)!.message });
    else {
      setMessage({ type: "ok", text: "✓ تم حفظ الإعدادات بنجاح؛ تظهر التغييرات للأولياء فوراً" });
      reload();
    }
  };

  return (
    <div className="pb-16 pt-3 space-y-4 fade-up">
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
        <Link href="/admin" className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center" aria-label="رجوع">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-emerald-600" /> إعدادات فضائي
          </h1>
          <p className="text-[11px] text-slate-500">
            الكود: <span className="font-mono">{profile.teacher_code}</span> • المقاطعة {profile.district_id ?? "—"}
          </p>
        </div>
      </div>

      {/* روابط سريعة للوحدات المتقدمة وتخصيص الواجهة */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <Link
          href="/settings/features"
          className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 hover:border-emerald-300 transition shadow-2xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-[#107a57] border border-emerald-200 flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="block text-xs font-black text-gray-900 group-hover:text-[#107a57]">تخصيص الواجهة</span>
              <span className="text-[10px] text-gray-500 font-medium">إظهار وإخفاء الصفحات</span>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#107a57] rotate-180" />
        </Link>

        <Link
          href="/admin/students"
          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition shadow-2xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#fafaf7] text-gray-700 border border-slate-200 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="block text-xs font-black text-gray-900 group-hover:text-[#107a57]">إدارة الأفواج والتلاميذ</span>
              <span className="text-[10px] text-gray-500 font-medium">ترتيب أبجدي + 1م3، 2م5</span>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#107a57] rotate-180" />
        </Link>

        <Link
          href="/admin/timetable"
          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition shadow-2xs flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#fafaf7] text-gray-700 border border-slate-200 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="block text-xs font-black text-gray-900 group-hover:text-[#107a57]">التوقيت الأسبوعي</span>
              <span className="text-[10px] text-gray-500 font-medium">جدول الحصص والطباعة</span>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#107a57] rotate-180" />
        </Link>
      </div>

      <TeacherQR path={`/t/${profile.slug || profile.id}`} teacherName={profile.full_name || "الأستاذ"} code={profile.teacher_code} schoolName={profile.school_custom_name || ""} />

      <form onSubmit={save} className="space-y-4">
        {message && (
          <p
            className={`p-3 rounded-xl text-xs font-bold border ${
              message.type === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </p>
        )}

        <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-3">
          <h2 className="text-sm font-extrabold text-slate-800">المعلومات الشخصية</h2>
          <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="الاسم واللقب" required />

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600">المادة التعليمية</span>
            <select className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)}>
              {MIDDLE_SCHOOL_SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name} ({s.codePrefix})
                </option>
              ))}
            </select>
          </div>

          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (يراه المفتش فقط)" dir="ltr" />
          <textarea className={`${inputCls} min-h-20`} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="نبذة قصيرة تظهر للأولياء (اختياري)" />

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600">المتوسطة</span>
            {schools.length > 0 && (
              <select className={inputCls} value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                <option value="">— متوسطتي غير موجودة في القائمة —</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.commune}
                  </option>
                ))}
              </select>
            )}
            {!schoolId && (
              <input className={inputCls} value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="اسم المتوسطة" />
            )}
            <p className="text-[10px] text-slate-400">تغيير المقاطعة التفتيشية يتم عبر المشرف العام فقط.</p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-600">المستويات التي أدرسها هذا العام</span>
            <div className="grid grid-cols-4 gap-1.5">
              {([1, 2, 3, 4] as const).map((lv) => (
                <button
                  type="button"
                  key={lv}
                  onClick={() => setLevels((prev) => (prev.includes(lv) ? prev.filter((l) => l !== lv) : [...prev, lv]))}
                  className={`py-2 rounded-xl border text-xs font-bold ${
                    levels.includes(lv) ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  {LEVELS[lv].short}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* قسم إدارة وتحديد الأقسام المعتمدة للأستاذ */}
        <section className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                أقسامي المعتمدة (يحددها الأستاذ بحرية)
              </h2>
              <p className="text-[11px] text-slate-500">
                حدد أقسامك بدقة (مثلاً: 1م1، 4م2، فوج 1...)؛ ستظهر تلقائياً في لوحة الشرف، كراس الدروس، وجداول التقويم.
              </p>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
              {customClasses.length} أقسام
            </span>
          </div>

          {/* قائمة الأقسام الحالية مع زر الحذف */}
          <div className="flex flex-wrap gap-2 pt-1">
            {customClasses.map((cls) => (
              <span
                key={cls}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-black text-slate-800"
              >
                <span>{cls}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveClass(cls)}
                  className="text-slate-400 hover:text-red-600 transition"
                  title={`حذف القسم ${cls}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
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
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => handleAddClass()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
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
              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
            >
              أقسام 1 متوسط (1م1 - 1م4)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(["4 م 1", "4 م 2", "4 م 3"])}
              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
            >
              أقسام 4 متوسط BEM
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(["1 م 1", "2 م 2", "3 م 1", "4 م 2"])}
              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
            >
              مستويات متنوعة (1م1، 2م2، 3م1، 4م2)
            </button>
          </div>
        </section>

        {/* قسم تخصيص الفضاء ومفاتيح الميزات المعيارية (Feature Toggles) */}
        <section className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                تخصيص الفضاء ومفاتيح الميزات المعيارية
              </h2>
              <p className="text-[11px] text-slate-500">
                لك الحرية الكاملة في تفعيل أو تعطيل أي ميزة تظهر للأولياء والتلاميذ حسب طريقتك.
              </p>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-200">
              حرية الأستاذ ⚙️
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* 1. كراس القسم والسبورة */}
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">كراس القسم وصور السبورة</p>
                  <p className="text-[10px] text-slate-500">توثيق الدروس للمراجعة والغائبين</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded shrink-0">
                مفعل أساسي
              </span>
            </div>

            {/* 2. دفتر وميثاق التقويم المستمر */}
            <label className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white flex items-center justify-between cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">ميثاق ونقاط التقويم المستمر (20 / 20)</p>
                  <p className="text-[10px] text-slate-500">شفافية الكراس والسلوك والواجبات</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={featureFlags.continuousAssessment !== false}
                onChange={(e) => setFeatureFlags((f) => ({ ...f, continuousAssessment: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
              />
            </label>

            {/* 3. الواجبات المنزلية */}
            <label className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white flex items-center justify-between cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">الواجبات والأنشطة المنزلية</p>
                  <p className="text-[10px] text-slate-500">نشر نصوص الفروض والحلول بمواعيد</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={featureFlags.homework !== false}
                onChange={(e) => setFeatureFlags((f) => ({ ...f, homework: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
              />
            </label>

            {/* 4. لوحة الشرف */}
            <label className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white flex items-center justify-between cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">لوحة الشرف وتكريم النجباء</p>
                  <p className="text-[10px] text-slate-500">تحفيز المتفوقين في المادة</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={featureFlags.honors !== false}
                onChange={(e) => setFeatureFlags((f) => ({ ...f, honors: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
              />
            </label>

            {/* 5. بطاقة استقبال واستدعاءات الأولياء */}
            <label className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white flex items-center justify-between cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">ساعة واستدعاءات استقبال الأولياء</p>
                  <p className="text-[10px] text-slate-500">عرض مواعيد المقابلة البيداغوجية</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={featureFlags.reception !== false}
                onChange={(e) => setFeatureFlags((f) => ({ ...f, reception: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
              />
            </label>

            {/* 6. شريط التنبيهات والإعلانات */}
            <label className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white flex items-center justify-between cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">شريط الإعلانات والتنبيهات</p>
                  <p className="text-[10px] text-slate-500">تنبيهات الفروض ومواعيد الاختبارات</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={featureFlags.announcements !== false}
                onChange={(e) => setFeatureFlags((f) => ({ ...f, announcements: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
              />
            </label>

            {/* 7. صندوق الرسائل السرية */}
            <label className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white flex items-center justify-between cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">صندوق الرسائل السرية</p>
                  <p className="text-[10px] text-slate-500">تلقي أسئلة واقتراحات الأولياء بسرية</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={featureFlags.messages !== false}
                onChange={(e) => setFeatureFlags((f) => ({ ...f, messages: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
              />
            </label>

            {/* 8. الربط مع المفتشية البيداغوجية */}
            <label className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white flex items-center justify-between cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">الربط مع المفتشية البيداغوجية</p>
                  <p className="text-[10px] text-slate-500">إرسال المذكرات واستقبال توجيهات المفتش</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={featureFlags.inspectorSync !== false}
                onChange={(e) => setFeatureFlags((f) => ({ ...f, inspectorSync: e.target.checked }))}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
              />
            </label>
          </div>
        </section>

        {/* قسم دليل ما يظهر لولي الأمر وأنواع الملفات التي يرفعها الأستاذ */}
        <section className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                دليل ما يظهر للولي والتلميذ وأنواع ملفات الأستاذ
              </h2>
              <p className="text-[11px] text-slate-500">
                تفصيل شامل لأنواع المحتويات والملفات المدعومة التي يمكن للأستاذ نشرها في فضائه المستقل.
              </p>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md border border-slate-200">
              دليل المحتوى 📁
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* 1. صور السبورة والكراس */}
            <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-emerald-950">1. صور السبورة وكراس القسم اليومي</h3>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                يلتقط الأستاذ صور السبورة أو كراس التلميذ المتميز ويرفعها (صيغ JPG, PNG, WebP)؛ تظهر للولي ليطمئن على نقل ابنه للدروس وتدارك الغيابات فوراً.
              </p>
            </div>

            {/* 2. وثائق ومستندات PDF */}
            <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-blue-950">2. مستندات وسلاسل بصيغة PDF</h3>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                رفع سلاسل التمارين، ملخصات المقاطع المعرفية، مطويات القوانين، ونماذج الفروض والشهادات السابقة بصيغة PDF قابلة للتحميل والطباعة.
              </p>
            </div>

            {/* 3. شروحات الفيديو واليوتيوب */}
            <div className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-rose-950">3. روابط فيديوهات الشرح (YouTube)</h3>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                تضمين روابط الشروحات المصورة من قناة الأستاذ أو المنصات التعليمية المعتمدة لتظهر كمشغل فيديو مدمج يشاهده التلميذ في المنزل.
              </p>
            </div>

            {/* 4. الواجبات مع ميزة حظر الحل النموذجي */}
            <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-black text-amber-950">4. واجبات مع حظر الحل النموذجي</h3>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                يحدد الأستاذ نص الواجب وتاريخ الاستلام؛ ويمكنه جدولة الحل النموذجي ليظل محجوباً تماماً عن الأولياء والتلاميذ حتى انقضاء مهلة التسليم.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white p-4 rounded-2xl border border-teal-100 shadow-2xs space-y-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">بطاقة استقبال الأولياء</h2>
            <p className="text-[11px] text-slate-500">تظهر للأولياء في صفحة الإعلانات والتوجيهات الخاصة بك.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className={inputCls} value={reception.officialDay || ""} onChange={(e) => setR({ officialDay: e.target.value })}>
              <option value="">يوم الاستقبال الرسمي</option>
              {SCHOOL_DAYS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <input className={inputCls} value={reception.officialTime || ""} onChange={(e) => setR({ officialTime: e.target.value })} placeholder="الساعة (10:00 - 11:00)" />
            <select className={inputCls} value={reception.extraDay || ""} onChange={(e) => setR({ extraDay: e.target.value })}>
              <option value="">موعد إضافي (اختياري)</option>
              {SCHOOL_DAYS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <input className={inputCls} value={reception.extraTime || ""} onChange={(e) => setR({ extraTime: e.target.value })} placeholder="ساعة الموعد الإضافي" />
          </div>
          <input className={inputCls} value={reception.location || ""} onChange={(e) => setR({ location: e.target.value })} placeholder="مكان الاستقبال (قاعة الأساتذة...)" />
          <textarea
            className={`${inputCls} min-h-20`}
            value={reception.guidance || ""}
            onChange={(e) => setR({ guidance: e.target.value })}
            placeholder="توجيهاتك للأولياء حول المراجعة مع التلميذ في المنزل..."
          />
        </section>

        <button
          disabled={saving}
          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-black flex items-center justify-center gap-2 cursor-pointer transition shadow-lg shadow-emerald-700/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ الإعدادات والميزات
        </button>
      </form>

      <BackupDataCard />

      <ChangePassword />
    </div>
  );
}
