"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Save, UserCog } from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import { TeacherQR } from "@/components/TeacherQR";
import { ChangePassword } from "@/components/ChangePassword";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { LEVELS, SCHOOL_DAYS, type ReceptionInfo } from "@/lib/types";

const inputCls = "w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500";

export default function TeacherSettingsPage() {
  const { loading, profile, reload } = useProfile();
  const [schools, setSchools] = useState<{ id: string; name: string; commune: string }[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [levels, setLevels] = useState<number[]>([]);
  const [reception, setReception] = useState<ReceptionInfo>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name || "");
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
    setLevels((profile.levels_taught as number[]) || [1, 2, 3, 4]);
    setReception(profile.reception || {});
    if (profile.district_id) {
      supabase
        .from("middle_schools")
        .select("id, name, commune")
        .eq("district_id", profile.district_id)
        .order("name")
        .then(({ data }) => setSchools(data || []));
    }
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
    setSaving(false);
    if (error || contactError) setMessage({ type: "err", text: (error || contactError)!.message });
    else {
      setMessage({ type: "ok", text: "✓ تم حفظ الإعدادات؛ تظهر التغييرات للأولياء فوراً" });
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
          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-black flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ الإعدادات
        </button>
      </form>

      <ChangePassword />
    </div>
  );
}
