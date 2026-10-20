"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Upload,
  FileText,
  Clock,
  ShieldCheck,
  X,
  FileCheck,
} from "lucide-react";
import { safeStorageName, validateUpload, compressIfImage } from "@/lib/compress";

const DISTRICTS = [
  { id: 1, name: "المقاطعة الأولى — الوادي 1" },
  { id: 2, name: "المقاطعة الثانية — الوادي 2" },
  { id: 3, name: "المقاطعة الثالثة — قمار" },
  { id: 4, name: "المقاطعة الرابعة — الرقيبة" },
  { id: 5, name: "المقاطعة الخامسة — الدبيلة والمقرن" },
];

export default function RegisterTeacherPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [districtId, setDistrictId] = useState("1");
  const [middleSchoolName, setMiddleSchoolName] = useState("");
  const [middleSchoolId, setMiddleSchoolId] = useState("");
  const [schools, setSchools] = useState<{ id: string; name: string; commune: string }[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([1, 2]);

  // ملف الإثبات / السيرة الذاتية
  const [docFile, setDocFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  // المقاطعة المختارة من بطاقة الصفحة الرئيسية (?district=)
  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("district");
    if (d && ["1", "2", "3", "4", "5"].includes(d)) setDistrictId(d);
  }, []);

  // متوسطات المقاطعة المعتمدة
  useEffect(() => {
    setMiddleSchoolId("");
    supabase
      .from("middle_schools")
      .select("id, name, commune")
      .eq("district_id", Number(districtId))
      .order("name")
      .then(({ data }) => setSchools(data || []));
  }, [districtId]);

  const toggleLevel = (lvl: number) => {
    setSelectedLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl].sort()
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg("يرجى ملء جميع الحقول الإلزامية");
      return;
    }

    if (selectedLevels.length === 0) {
      setErrorMsg("يرجى تحديد مستوى دراسي واحد على الأقل تدرسه هذا العام");
      return;
    }

    if (!docFile) {
      setErrorMsg("يرجى إرفاق الوثيقة الإثباتية أو السيرة الذاتية (CV / شهادة عمل / مقرر تعيين / بطاقة مهنية)");
      return;
    }

    const invalid = validateUpload(docFile);
    if (invalid) {
      setErrorMsg(invalid);
      return;
    }

    setLoading(true);

    try {
      // توليد كود ورابط فريد للأستاذ
      const randomCode = "MTH-" + Math.floor(1000 + Math.random() * 9000);
      const cleanSlug = "prof-" + Math.random().toString(36).substring(2, 8);

      // تجهيز ملف الوثيقة (ضغط إذا كان صورة)
      const preparedFile = await compressIfImage(docFile);

      // 1. إنشاء حساب المستخدم
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            role: "teacher",
            full_name: fullName.trim(),
            phone: phone.trim(),
            district_id: Number(districtId),
            middle_school_id: middleSchoolId || "",
            school_custom_name: middleSchoolId
              ? schools.find((s) => s.id === middleSchoolId)?.name || middleSchoolName.trim()
              : middleSchoolName.trim(),
            teacher_code: randomCode,
            slug: cleanSlug,
            levels_taught: selectedLevels,
            verification_status: "pending",
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("تعذر إنشاء الحساب");

      // 2. رفع وثيقة الإثبات إلى مخزن verification-docs
      const docPath = `${data.user.id}/${Date.now()}_${safeStorageName(preparedFile.name)}`;
      const { error: upErr } = await supabase.storage
        .from("verification-docs")
        .upload(docPath, preparedFile, { contentType: preparedFile.type });

      if (!upErr) {
        // تحديث رابط الوثيقة في جدول profiles
        await supabase
          .from("profiles")
          .update({
            verification_doc_url: docPath,
            verification_status: "pending",
            is_verified: false,
          })
          .eq("id", data.user.id);
      }

      // 3. إنهاء الجلسة التلقائية لحماية المنصة حتى يعتمد الحساب المشرف
      await supabase.auth.signOut();

      // عرض شاشة انتظار الاعتماد
      setSubmittedSuccess(true);
    } catch (err: any) {
      console.error("Registration error:", err);
      setErrorMsg(err.message || "فشل إرسال طلب الانضمام، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  // ─── شاشة تأكيد استلام الطلب والانتظار ───
  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
        <div className="max-w-lg mx-auto w-full bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-md">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/60">
              طلب انضمام قيد التدقيق الإداري
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              تم استلام ملفك بنجاح، أستاذنا الفاضل
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              حرصاً على خصوصية ونزاهة فضاء مادة الرياضيات بولاية الوادي، يتم التحقق من وثيقة إثبات الهوية المرفقة ومراجعتها من قبل إدارة المنصة والمفتشية.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-700 text-right space-y-2 border border-slate-100">
            <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
              <span className="text-slate-400">الاسم واللقب:</span>
              <span className="font-bold">{fullName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
              <span className="text-slate-400">البريد الإلكتروني:</span>
              <span className="font-mono font-bold">{email}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
              <span className="text-slate-400">المقاطعة التفتيشية:</span>
              <span className="font-bold">المقاطعة {districtId}</span>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span className="text-slate-400">الوثيقة المرفقة:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <FileCheck className="w-4 h-4" />
                {docFile?.name}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200/60 text-xs text-emerald-900 leading-relaxed text-right space-y-1">
            <p className="font-bold">ماذا يحدث الآن؟</p>
            <p className="text-[11px] text-emerald-800">
              • تتم مراجعة الملف وتفعيل حسابك خلال <strong>24 إلى 48 ساعة</strong>.
            </p>
            <p className="text-[11px] text-emerald-800">
              • فور الاعتماد، ستتمكن من تسجيل الدخول والوصول لمساحتك البيداغوجية والملتقى.
            </p>
          </div>

          <Link
            href="/"
            className="w-full py-3 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <span>العودة إلى الصفحة الرئيسية</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20 mb-2">
          <GraduationCap className="w-7 h-7" />
        </div>
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-full text-[11px] text-emerald-800 font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>انضمام معتمد لأساتذة مادة الرياضيات — ولاية الوادي</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          إنشاء حساب أستاذ جديد
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          يرجى إدخال بياناتك البيداغوجية وإرفاق السيرة الذاتية أو شهادة العمل لاعتماد حسابك
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-200/80">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-bold animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleRegister}>
            {/* 1. الاسم واللقب */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الاسم واللقب الكامل <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد بن عمارة"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            {/* 2. البريد الإلكتروني وكلمة المرور */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  البريد الإلكتروني <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-mono"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  كلمة المرور <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="6 أحرف على الأقل"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-mono"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
              </div>
            </div>

            {/* 3. رقم الهاتف */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم الهاتف (للتواصل الميداني مع المفتش) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="06XXXXXXXX / 07XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-mono"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                🔒 محمي بسرية تامة: لا يظهر للأولياء، ومخصص فقط للمفتش والمشرف العام.
              </p>
            </div>

            {/* 4. المقاطعة والمتوسطة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المقاطعة التفتيشية <span className="text-red-500">*</span>
                </label>
                <select
                  value={districtId}
                  onChange={(e) => setDistrictId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 cursor-pointer"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المتوسطة التابع لها <span className="text-red-500">*</span>
                </label>
                {schools.length > 0 ? (
                  <select
                    value={middleSchoolId}
                    onChange={(e) => setMiddleSchoolId(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 cursor-pointer"
                  >
                    <option value="">اختر المتوسطة من القائمة...</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.commune})
                      </option>
                    ))}
                    <option value="other">متوسطة أخرى (كتابة يدوية)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="اسم المتوسطة..."
                    value={middleSchoolName}
                    onChange={(e) => setMiddleSchoolName(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50"
                  />
                )}
              </div>
            </div>

            {middleSchoolId === "other" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المتوسطة يدوياً
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: متوسطة الشهيد أحمد بن عامر"
                  value={middleSchoolName}
                  onChange={(e) => setMiddleSchoolName(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/50"
                />
              </div>
            )}

            {/* 5. المستويات التي يدرسها */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                المستويات الدراسية التي تدرسها هذا العام <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((lvl) => {
                  const active = selectedLevels.includes(lvl);
                  return (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => toggleLevel(lvl)}
                      className={`py-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                        active
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {lvl} متوسط
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── 6. منطقة رفع الوثيقة الإثباتية / السيرة الذاتية (CV) ─── */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                وثيقة إثبات الهوية المهنية أو السيرة الذاتية <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-slate-500">
                ارفع السيرة الذاتية (CV)، شهادة عمل (ATS)، مقرر التعيين، أو صورة البطاقة المهنية (PDF أو صورة JPG/PNG حتى 10 ميغابايت).
              </p>

              <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 cursor-pointer transition text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  {docFile ? (
                    <div className="flex items-center gap-2 font-bold text-emerald-800">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>{docFile.name} ({(docFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  ) : (
                    <div>
                      <span className="font-bold text-emerald-800">اضغط هنا لاختيار الملف</span>
                      <span className="text-slate-400 block text-[10px] mt-0.5">PDF, PNG, JPG (الحد الأقصى: 10MB)</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  required
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {docFile && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 rounded-xl text-[11px] text-slate-600">
                  <span>تم تجهيز الوثيقة للرفع</span>
                  <button
                    type="button"
                    onClick={() => setDocFile(null)}
                    className="text-red-500 hover:text-red-700 font-bold"
                  >
                    إلغاء الملف
                  </button>
                </div>
              )}
            </div>

            {/* زر الإرسال */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-700/20 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ إنشاء الحساب ورفع الوثيقة...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>إرسال طلب الانضمام للتدقيق الإداري</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500">
            لديك حساب معتمد مسبقاً؟{" "}
            <Link href="/login" className="text-emerald-700 font-bold hover:underline">
              تسجيل الدخول هنا
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
