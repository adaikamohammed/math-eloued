"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { validatePasswordStrength } from "@/lib/passwordPolicy";
import { MIDDLE_SCHOOL_SUBJECTS } from "@/lib/types";
import {
  Lock,
  Mail,
  User,
  Building2,
  MapPin,
  Loader2,
  AlertCircle,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  BookOpen,
  CheckCircle2,
  LogIn,
  UserPlus,
  Check,
  ChevronDown,
  Search,
  KeyRound,
  RotateCcw,
  UserCheck,
} from "lucide-react";

// قائمة الـ 58 ولاية جزائرية الرسمية
const ALGERIA_WILAYAS = [
  { code: "01", name: "01 - أدرار" },
  { code: "02", name: "02 - الشلف" },
  { code: "03", name: "03 - الأغواط" },
  { code: "04", name: "04 - أم البواقي" },
  { code: "05", name: "05 - باتنة" },
  { code: "06", name: "06 - بجاية" },
  { code: "07", name: "07 - بسكرة" },
  { code: "08", name: "08 - بشار" },
  { code: "09", name: "09 - البليدة" },
  { code: "10", name: "10 - البويرة" },
  { code: "11", name: "11 - تمنراست" },
  { code: "12", name: "12 - تبسة" },
  { code: "13", name: "13 - تلمسان" },
  { code: "14", name: "14 - تيارت" },
  { code: "15", name: "15 - تيزي وزو" },
  { code: "16", name: "16 - الجزائر العاصمة" },
  { code: "17", name: "17 - الجلفة" },
  { code: "18", name: "18 - جيجل" },
  { code: "19", name: "19 - سطيف" },
  { code: "20", name: "20 - سعيدة" },
  { code: "21", name: "21 - سكيكدة" },
  { code: "22", name: "22 - سيدي بلعباس" },
  { code: "23", name: "23 - عنابة" },
  { code: "24", name: "24 - قالمة" },
  { code: "25", name: "25 - قسنطينة" },
  { code: "26", name: "26 - المدية" },
  { code: "27", name: "27 - مستغانم" },
  { code: "28", name: "28 - المسيلة" },
  { code: "29", name: "29 - معسكر" },
  { code: "30", name: "30 - ورقلة" },
  { code: "31", name: "31 - وهران" },
  { code: "32", name: "32 - البيض" },
  { code: "33", name: "33 - إليزي" },
  { code: "34", name: "34 - برج بوعريريج" },
  { code: "35", name: "35 - بومرداس" },
  { code: "36", name: "36 - الطارف" },
  { code: "37", name: "37 - تندوف" },
  { code: "38", name: "38 - تيسمسيلت" },
  { code: "39", name: "39 - الوادي" },
  { code: "40", name: "40 - خنشلة" },
  { code: "41", name: "41 - سوق أهراس" },
  { code: "42", name: "42 - تيبازة" },
  { code: "43", name: "43 - ميلة" },
  { code: "44", name: "44 - عين الدفلى" },
  { code: "45", name: "45 - النعامة" },
  { code: "46", name: "46 - عين تموشنت" },
  { code: "47", name: "47 - غرداية" },
  { code: "48", name: "48 - غليزان" },
  { code: "49", name: "49 - تيميمون" },
  { code: "50", name: "50 - برج باجي مختار" },
  { code: "51", name: "51 - أولاد جلال" },
  { code: "52", name: "52 - بني عباس" },
  { code: "53", name: "53 - عين صالح" },
  { code: "54", name: "54 - عين قزام" },
  { code: "55", name: "55 - تقرت" },
  { code: "56", name: "56 - جانت" },
  { code: "57", name: "57 - المغير" },
  { code: "58", name: "58 - المنيعة" },
];

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // التبويب الافتراضي هو "إنشاء حساب" (register) أو "تسجيل الدخول" أو "استرجاع الحساب"
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam === "login" ? "login" : tabParam === "recover" ? "recover" : "register";
  const [activeTab, setActiveTab] = useState<"register" | "login" | "recover">(initialTab);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "login") setActiveTab("login");
    else if (tab === "register") setActiveTab("register");
    else if (tab === "recover") setActiveTab("recover");
  }, [searchParams]);

  // حقول تسجيل الدخول
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSharedDevice, setIsSharedDevice] = useState(false);
  const [recognizedTeacher, setRecognizedTeacher] = useState<{
    id: string;
    full_name: string;
    teacher_code: string;
    school_custom_name: string;
    slug?: string;
    subject?: string;
    email_hint?: string;
    email_exact?: string;
  } | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);

  // التعرف التلقائي والحي على الأستاذ عند كتابة الكود (مثل MTH-704) أو الاسم أو البريد
  useEffect(() => {
    const query = loginEmail.trim();
    if (!query || query.length < 3) {
      setRecognizedTeacher(null);
      setIsRecognizing(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsRecognizing(true);
      try {
        const { data, error } = await supabase.rpc("smart_find_teacher_account", {
          p_query: query,
        });

        if (!error && data && data.found) {
          setRecognizedTeacher(data);
        } else {
          // فحص احتياطي عبر profiles
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, teacher_code, school_custom_name, slug, subject")
            .or(`teacher_code.ilike.%${query}%,full_name.ilike.%${query}%,slug.ilike.%${query}%`)
            .limit(1);

          if (profs && profs.length > 0) {
            const p = profs[0];
            setRecognizedTeacher({
              id: p.id,
              full_name: p.full_name,
              teacher_code: p.teacher_code,
              school_custom_name: p.school_custom_name || "متوسطة",
              slug: p.slug,
              subject: p.subject || "mathematics",
              email_hint: query.includes("@") ? query : "حساب مسجل",
              email_exact: query.includes("@") ? query : "",
            });
          } else {
            setRecognizedTeacher(null);
          }
        }
      } catch {
        setRecognizedTeacher(null);
      } finally {
        setIsRecognizing(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [loginEmail]);

  // حقول إنشاء حساب جديد
  const [fullName, setFullName] = useState("");
  const [subject, setSubject] = useState("mathematics");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  
  // حقول استرجاع الحساب الذكي
  const [recoverQuery, setRecoverQuery] = useState("");
  const [recoveredTeacher, setRecoveredTeacher] = useState<{
    id: string;
    full_name: string;
    teacher_code: string;
    school_custom_name: string;
    slug?: string;
    subject?: string;
    email_hint?: string;
    email_exact?: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [recoverSuccess, setRecoverSuccess] = useState("");

  // الولاية والمقاطعة (اختياريتان تماماً)
  const [wilayaInput, setWilayaInput] = useState("");
  const [districtNum, setDistrictNum] = useState(""); // رقم المقاطعة فقط: 1, 2, 3...
  const [middleSchoolName, setMiddleSchoolName] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [registeredCode, setRegisteredCode] = useState<string | null>(null);

  // فحص شروط كلمة المرور (الكود السري) لحظياً
  const passwordCriteria = useMemo(() => {
    const minLength = regPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(regPassword);
    const hasLower = /[a-z]/.test(regPassword) || /[\u0621-\u064A]/.test(regPassword);
    const hasNumber = /\d/.test(regPassword);
    return { minLength, hasUpper, hasLower, hasNumber };
  }, [regPassword]);

  // التحقق الدقيق من صحة البريد الإلكتروني
  const isEmailValid = (emailStr: string) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailStr.trim());
  };

  // ── 1. معالجة إنشاء الحساب فورياً ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim()) {
      setErrorMsg("يرجى كتابة الاسم واللقب الكامل للأستاذ");
      return;
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    if (!cleanEmail || !isEmailValid(cleanEmail)) {
      setErrorMsg("يرجى إدخال بريد إلكتروني صحيح ومكتمل (مثال: name@gmail.com)");
      return;
    }

    if (
      !passwordCriteria.minLength ||
      !passwordCriteria.hasUpper ||
      !passwordCriteria.hasNumber
    ) {
      setErrorMsg("كلمة المرور يجب أن تتضمن 8 أحرف على الأقل، حرفاً لاتينياً كبيراً (A-Z)، وحرفاً صغيراً، ورقماً (0-9).");
      return;
    }

    const pwdCheck = validatePasswordStrength(regPassword);
    if (!pwdCheck.valid) {
      setErrorMsg(pwdCheck.error || "يرجى اختيار كلمة مرور قوية");
      return;
    }

    setLoading(true);

    try {
      const subjectObj = MIDDLE_SCHOOL_SUBJECTS.find((s) => s.id === subject);
      const prefix = subjectObj?.codePrefix || "MTH";
      const randomCode = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
      const cleanSlug = `prof-${Math.random().toString(36).substring(2, 8)}`;

      // تجهيز اسم المؤسسة والولاية
      const finalSchoolInfo = [
        middleSchoolName.trim() || "متوسطة",
        wilayaInput.trim() ? `ولاية ${wilayaInput.trim()}` : "",
        districtNum ? `المقاطعة ${districtNum}` : "",
      ]
        .filter(Boolean)
        .join(" — ");

      const finalDistrictId = districtNum ? Number(districtNum) : 1;

      // محاولة التسجيل عبر دالة النظام المباشرة
      let registeredSuccessfully = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("register_teacher_instant", {
          p_email: cleanEmail,
          p_password: regPassword,
          p_full_name: fullName.trim(),
          p_subject: subject,
          p_district_id: finalDistrictId,
          p_school_custom_name: finalSchoolInfo,
          p_teacher_code: randomCode,
          p_slug: cleanSlug,
        });

        if (!rpcErr && rpcRes && rpcRes.success !== false) {
          registeredSuccessfully = true;
        }
      } catch {
        registeredSuccessfully = false;
      }

      // في حال عدم توفر الـ RPC يتم التسجيل المباشر عبر Supabase Auth
      if (!registeredSuccessfully) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: regPassword,
          options: {
            data: {
              full_name: fullName.trim(),
              role: "teacher",
              subject: subject,
              district_id: districtNum ? Number(districtNum) : null,
              school_custom_name: finalSchoolInfo,
              teacher_code: randomCode,
              slug: cleanSlug,
            },
          },
        });

        if (signUpErr) {
          throw signUpErr;
        }
      }

      // تسجيل الدخول التلقائي بعد إنشاء الحساب
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: regPassword,
      });

      if (loginErr) {
        console.warn("Auto login warning:", loginErr);
      }

      setRegisteredCode(randomCode);

      setTimeout(() => {
        window.location.href = "/admin?welcome=1";
      }, 1200);
    } catch (err: any) {
      console.error("Register error:", err);
      const raw = String(err?.message || "");

      if (raw.includes("already registered") || raw.includes("User already registered") || raw.includes("مسجل مسبقاً")) {
        setErrorMsg("هذا البريد الإلكتروني مسجل مسبقاً في المنصة. يمكنك التبديل إلى تبويب 'تسجيل الدخول' أعلاه.");
      } else if (raw.includes("rate limit") || raw.includes("over_email_send_rate_limit")) {
        setErrorMsg("تم تجاوز الحد المسموح به حالياً. يرجى المحاولة بعد لحظات.");
      } else if (raw.includes("Failed to fetch") || raw.includes("NetworkError")) {
        setErrorMsg("تعذر الاتصال بالخادم السحابي حالياً. يرجى إعادة المحاولة أو تحديث الصفحة.");
      } else {
        setErrorMsg(raw || "حدث خطأ أثناء إنشاء الحساب، يرجى التحقق من البيانات والمحاولة مجدداً");
      }
      setLoading(false);
    }
  };

  // ── 2. معالجة تسجيل الدخول ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const rawInput = loginEmail.trim();
    let targetEmail = "";

    // 1. إذا تم التعرف على الأستاذ مسبقاً وتوفر بريده المسجل
    if (recognizedTeacher?.email_exact) {
      targetEmail = recognizedTeacher.email_exact;
    } else if (rawInput.includes("@")) {
      targetEmail = rawInput;
    } else {
      // 2. بحث فوري في حال الضغط السريع على Enter أو زر الدخول
      try {
        const { data: matchData } = await supabase.rpc("smart_find_teacher_account", {
          p_query: rawInput,
        });
        if (matchData && matchData.found && matchData.email_exact) {
          targetEmail = matchData.email_exact;
          setRecognizedTeacher(matchData);
        } else {
          // فحص احتياطي عبر جدول profiles
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, teacher_code, school_custom_name, slug, subject")
            .or(`teacher_code.ilike.%${rawInput}%,full_name.ilike.%${rawInput}%,slug.ilike.%${rawInput}%`)
            .limit(1);

          if (profs && profs.length > 0) {
            const p = profs[0];
            setRecognizedTeacher({
              id: p.id,
              full_name: p.full_name,
              teacher_code: p.teacher_code,
              school_custom_name: p.school_custom_name || "متوسطة",
              slug: p.slug,
              subject: p.subject || "mathematics",
              email_hint: "حساب مسجل",
            });
            setErrorMsg(
              `تم العثور على الأستاذ (${p.full_name})، يرجى التوجه لتبويب "استرجاع الحساب" بالأسفل لإعادة تعيين كلمة المرور أو استخدام البريد الإلكتروني مباشرة.`
            );
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Direct lookup warning:", err);
      }
    }

    if (!targetEmail) {
      setErrorMsg(
        `لم يتم العثور على أستاذ مسجل بالبيانات المدخلة: "${rawInput}". يرجى كتابة كود الأستاذ (مثل MTH-704) أو الاسم أو البريد الإلكتروني بشكل صحيح.`
      );
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail.toLowerCase(),
        password: loginPassword,
      });

      if (error) {
        const rawMsg = String(error.message || "");
        if (
          rawMsg === "Invalid login credentials" ||
          rawMsg.includes("Invalid login") ||
          error.status === 400
        ) {
          setErrorMsg(
            `كلمة المرور غير صحيحة لحساب ${recognizedTeacher ? `الأستاذ ${recognizedTeacher.full_name}` : "الأستاذ"}. هل نسيتها؟ يمكنك الضغط على "استرجاع الحساب" بالأسفل لتعيين كلمة مرور جديدة بكود الأستاذ فوراً.`
          );
        } else if (rawMsg.includes("Email not confirmed")) {
          setErrorMsg("هذا الحساب لم يتم تأكيد بريده الإلكتروني بعد.");
        } else {
          setErrorMsg(rawMsg || "حدث خطأ أثناء تسجيل الدخول");
        }
        setLoading(false);
        return;
      }

      if (!data.user) {
        setErrorMsg("لم يتم العثور على بيانات المستخدم");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, district_id, is_verified")
        .eq("id", data.user.id)
        .single();

      if (!profile) {
        router.push("/admin");
        router.refresh();
        return;
      }

      try {
        if (isSharedDevice) {
          sessionStorage.setItem("jusoor_shared_device", "true");
        } else {
          sessionStorage.removeItem("jusoor_shared_device");
        }
      } catch {}

      const next = searchParams.get("next");
      let safeNext: string | null = null;
      if (next && next.startsWith("/") && !/[\\\s]/.test(next)) {
        try {
          const target = new URL(next, window.location.origin);
          if (target.origin === window.location.origin) safeNext = target.pathname + target.search + target.hash;
        } catch {
          safeNext = null;
        }
      }

      const targetDestination =
        profile.role === "admin"
          ? "/super-admin"
          : profile.role === "inspector"
            ? "/inspector"
            : (safeNext || "/admin");

      window.location.href = targetDestination;
    } catch (err: any) {
      const rawMsg = String(err?.message || "");
      if (rawMsg.includes("Invalid login")) {
        setErrorMsg("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      } else {
        console.warn("Notice during login:", rawMsg);
        setErrorMsg(rawMsg || "حدث خطأ أثناء تسجيل الدخول");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── 3. البحث الذكي عن حساب الأستاذ ──
  const handleFindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setRecoverSuccess("");
    const q = recoverQuery.trim();
    if (!q) {
      setErrorMsg("يرجى إدخال كود الأستاذ (مثال: MTH-704) أو البريد الإلكتروني أو اسمك");
      return;
    }
    setLoading(true);
    try {
      // 1. محاولة استدعاء الدالة الذكية
      const { data, error } = await supabase.rpc("smart_find_teacher_account", {
        p_query: q,
      });

      if (!error && data && data.found) {
        setRecoveredTeacher(data);
        return;
      }

      // 2. خطة بديلة: البحث المباشر في جدول profiles بالصلاحيات المتاحة
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, teacher_code, school_custom_name, slug, subject")
        .or(`teacher_code.ilike.%${q}%,full_name.ilike.%${q}%,slug.ilike.%${q}%`)
        .limit(1);

      if (profs && profs.length > 0) {
        const p = profs[0];
        setRecoveredTeacher({
          id: p.id,
          full_name: p.full_name,
          teacher_code: p.teacher_code,
          school_custom_name: p.school_custom_name || "متوسطة",
          slug: p.slug,
          subject: p.subject || "mathematics",
          email_hint: q.includes("@") ? q : "حساب مسجل بالمنصة",
          email_exact: q.includes("@") ? q : "",
        });
      } else {
        setErrorMsg("لم يتم العثور على أي حساب مسجل بهذه البيانات. يرجى التأكد من كود الأستاذ أو البريد أو الاسم.");
      }
    } catch {
      setErrorMsg("تعذر إتمام البحث، يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  // ── 4. تعيين كلمة المرور الجديدة والدخول الفوري ──
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveredTeacher) return;
    setErrorMsg("");
    setRecoverSuccess("");

    if (newPassword.length < 6) {
      setErrorMsg("يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    try {
      const identifier = recoveredTeacher.email_exact || recoveredTeacher.teacher_code;
      const { data, error } = await supabase.rpc("smart_reset_teacher_password", {
        p_identifier: identifier,
        p_new_password: newPassword,
      });

      if (!error && data && data.success) {
        setRecoverSuccess("تم تحديث كلمة المرور بنجاح! جاري تسجيل الدخول...");
        const targetEmail = data.email || recoveredTeacher.email_exact;
        if (targetEmail) {
          const { error: loginErr } = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password: newPassword,
          });
          if (!loginErr) {
            router.push("/admin");
            router.refresh();
            return;
          }
        }
        setTimeout(() => {
          setActiveTab("login");
          if (targetEmail) setLoginEmail(targetEmail);
          setLoginPassword(newPassword);
        }, 1500);
      } else {
        if (recoveredTeacher.email_exact) {
          await supabase.auth.resetPasswordForEmail(recoveredTeacher.email_exact);
          setRecoverSuccess(`تم إرسال رابط تأكيد وتعيين كلمة المرور إلى بريدك: ${recoveredTeacher.email_hint}`);
        } else {
          setErrorMsg(
            "لتفعيل التعيين التلقائي الفوري، يرجى تشغيل كود supabase/smart_teacher_recovery.sql في لوحة Supabase."
          );
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "حدث خطأ أثناء تعيين كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  // ── شاشة النجاح الفوري ──
  if (registeredCode) {
    return (
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            تم إنشاء وتفعيل الحساب بنجاح 🎉
          </span>
          <h1 className="text-2xl font-black text-slate-900">
            مرحباً بك أستاذنا الفاضل!
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            تم فتح فضاءك التعليمي باعتماد كود الأستاذ الخاص بك:
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 text-white font-mono text-xl font-black tracking-widest shadow-inner">
          {registeredCode}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          <span>جاري نقلك فوراً إلى لوحة التحكم...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-lg">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 mb-5 transition"
      >
        <ArrowRight className="w-4 h-4" />
        <span>العودة للرئيسية</span>
      </Link>

      {/* بطاقة الواجهة الرئيسية */}
      <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/90 sm:px-10 space-y-6">
        {/* رأس البطاقة */}
        <div className="text-center space-y-2 pb-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            منصة جسور التعليمية
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {activeTab === "recover"
              ? "استرجاع حساب الأستاذ الذكي وتعيين كلمة المرور"
              : activeTab === "register"
              ? "إنشاء حساب أستاذ جديد وتفعيل الفضاء البيداغوجي فوراً"
              : "تسجيل دخول الأساتذة والمفتشين"}
          </p>
        </div>

        {/* أزرار التبديل (إنشاء حساب أولاً وافتراضياً) */}
        <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100 rounded-2xl text-xs font-black">
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setErrorMsg("");
            }}
            className={`py-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "register"
                ? "bg-white text-emerald-800 shadow-sm font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>إنشاء حساب جديد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setErrorMsg("");
            }}
            className={`py-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "login"
                ? "bg-white text-emerald-800 shadow-sm font-black"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LogIn className="w-4 h-4 text-slate-500" />
            <span>تسجيل الدخول</span>
          </button>
        </div>

        {/* رسالة الخطأ إن وجدت */}
        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            نموذج 1: إنشاء حساب أستاذ جديد
            ════════════════════════════════════════════════════════ */}
        {activeTab === "register" && (
          <form className="space-y-4 text-xs" onSubmit={handleRegister}>
            {/* 1. الاسم واللقب */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                الاسم واللقب الكامل للأستاذ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: أستاذ عبد القادر بن عمارة"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            {/* 2. مادة التدريس (جميع مواد التعليم المتوسط) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                مادة التدريس (التعليم المتوسط) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-medium appearance-none cursor-pointer"
                >
                  {MIDDLE_SCHOOL_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.name} ({s.codePrefix})
                    </option>
                  ))}
                </select>
                <BookOpen className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* 3. اختيار أو كتابة الولاية (اختياري) + رقم المقاطعة (اختياري) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* الولاية: يكتب أو يختار من القائمة المنسدلة */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  الولاية <span className="text-slate-400 font-normal">(اختياري)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="algeria-wilayas-list"
                    placeholder="اختر أو اكتب الولاية..."
                    value={wilayaInput}
                    onChange={(e) => setWilayaInput(e.target.value)}
                    className="w-full py-2.5 pl-8 pr-9 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50"
                  />
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                  <datalist id="algeria-wilayas-list">
                    {ALGERIA_WILAYAS.map((w) => (
                      <option key={w.code} value={w.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* رقم المقاطعة: رقم فقط بدون أسماء واختياري */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  رقم المقاطعة <span className="text-slate-400 font-normal">(اختياري)</span>
                </label>
                <div className="relative">
                  <select
                    value={districtNum}
                    onChange={(e) => setDistrictNum(e.target.value)}
                    className="w-full py-2.5 pl-8 pr-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-medium appearance-none cursor-pointer"
                  >
                    <option value="">بدون تحديد مقاطعة</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20].map((n) => (
                      <option key={n} value={n}>
                        المقاطعة {n}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 4. اسم المتوسطة / المؤسسة (اختياري) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                اسم المؤسسة التربوية / المتوسطة <span className="text-slate-400 font-normal">(اختياري)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="مثال: متوسطة الشهيد العربي بن مهيدي..."
                  value={middleSchoolName}
                  onChange={(e) => setMiddleSchoolName(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-9 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50"
                />
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>

            {/* 5. البريد الإلكتروني (تدقيق دقيق للصحة) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  البريد الإلكتروني <span className="text-red-500">*</span>
                </label>
                {regEmail && (
                  <span
                    className={`text-[10px] font-bold ${
                      isEmailValid(regEmail) ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {isEmailValid(regEmail) ? "✓ بريد صحيح" : "تنسيق غير مكتمل"}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className={`w-full py-2.5 pl-3 pr-10 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 transition bg-slate-50/50 font-mono text-left ${
                    regEmail && !isEmailValid(regEmail)
                      ? "border-amber-300 focus:border-amber-500 focus:ring-amber-500/20"
                      : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-500/20"
                  }`}
                  dir="ltr"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            {/* 6. كلمة المرور (الكود السري) مع توضيح شروط كتابتها */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                كلمة المرور (الكود السري للحساب) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-mono text-left"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>

              {/* شريط توضيح شروط الكود السري (تحديث حي للمؤشرات) */}
              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-[11px]">
                <p className="font-bold text-slate-600 text-[10px]">
                  شروط كلمة المرور (الكود): اكتب كلمة مرور تحتوي على:
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <div
                    className={`flex items-center gap-1.5 transition ${
                      passwordCriteria.minLength ? "text-emerald-700 font-bold" : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                        passwordCriteria.minLength ? "bg-emerald-100 text-emerald-800" : "bg-slate-200"
                      }`}
                    >
                      ✓
                    </span>
                    <span>8 أحرف على الأقل</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 transition ${
                      passwordCriteria.hasUpper ? "text-emerald-700 font-bold" : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                        passwordCriteria.hasUpper ? "bg-emerald-100 text-emerald-800" : "bg-slate-200"
                      }`}
                    >
                      ✓
                    </span>
                    <span>حرف لاتيني كبير (A-Z)</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 transition ${
                      passwordCriteria.hasLower ? "text-emerald-700 font-bold" : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                        passwordCriteria.hasLower ? "bg-emerald-100 text-emerald-800" : "bg-slate-200"
                      }`}
                    >
                      ✓
                    </span>
                    <span>حرف صغير (a-z)</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 transition ${
                      passwordCriteria.hasNumber ? "text-emerald-700 font-bold" : "text-slate-400"
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                        passwordCriteria.hasNumber ? "bg-emerald-100 text-emerald-800" : "bg-slate-200"
                      }`}
                    >
                      ✓
                    </span>
                    <span>رقم (0-9)</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 pt-0.5">
                  مثال: <code className="font-mono font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">Prof2026!</code>
                </p>
              </div>
            </div>

            {/* زر إنشاء الحساب الفوري */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-800/20 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ إنشاء الحساب وتفعيل الفضاء...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>إنشاء وتفعيل حساب الأستاذ فوراً</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center text-[11px] text-slate-500 font-medium">
              <span>لديك حساب مسبق في المنصة؟ </span>
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                تسجيل الدخول هنا
              </button>
            </div>
          </form>
        )}

        {/* ════════════════════════════════════════════════════════
            نموذج 2: تسجيل الدخول
            ════════════════════════════════════════════════════════ */}
        {activeTab === "login" && (
          <form className="space-y-4 text-xs" onSubmit={handleLogin}>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-slate-700">
                  كود الأستاذ، الاسم، أو البريد الإلكتروني <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>⚡</span>
                  <span>تعرّف تلقائي وذكي</span>
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: MTH-704 أو محمد عدايكة أو بريدك..."
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className={`w-full py-2.5 pl-9 pr-10 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 transition ${
                    recognizedTeacher
                      ? "border-emerald-500 bg-emerald-50/40 text-emerald-950 font-bold ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-slate-50/50 focus:ring-emerald-500/20 focus:border-emerald-600"
                  }`}
                />
                <UserCheck
                  className={`w-4 h-4 absolute right-3.5 top-3 transition ${
                    recognizedTeacher ? "text-emerald-600" : "text-slate-400"
                  }`}
                />
                {isRecognizing && (
                  <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin absolute left-3 top-3.5" />
                )}
              </div>

              {/* بطاقة التعرّف الفوري والمباشر على هوية الأستاذ */}
              {recognizedTeacher && (
                <div className="mt-2.5 p-2.5 bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-300 rounded-xl flex items-center justify-between text-xs shadow-sm animate-fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                      ✓
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-emerald-950 text-xs">
                          الأستاذ {recognizedTeacher.full_name}
                        </span>
                        <span className="font-mono bg-emerald-200/80 text-emerald-900 text-[10px] px-1.5 py-0.5 rounded font-bold">
                          {recognizedTeacher.teacher_code}
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-700 truncate mt-0.5">
                        {recognizedTeacher.school_custom_name || "مؤسسة تعليمية"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300 shrink-0">
                    تم التعرف عليك ✓
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-mono text-left"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("recover");
                    setErrorMsg("");
                    setRecoverSuccess("");
                    if (recognizedTeacher) {
                      setRecoverQuery(recognizedTeacher.teacher_code || recognizedTeacher.full_name);
                      setRecoveredTeacher(recognizedTeacher);
                    }
                  }}
                  className="text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  نسيت كلمة المرور أو البريد الإلكتروني؟ (استرجاع الحساب) 🔑
                </button>
              </div>
            </div>

            {/* خيار حماية الجلسة في الحواسيب المشتركة بقاعة الأساتذة */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={isSharedDevice}
                  onChange={(e) => setIsSharedDevice(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer accent-emerald-600"
                />
                <div className="text-right">
                  <span className="text-xs font-black text-slate-800 block">
                    حاسوب قاعة الأساتذة أو جهاز مشترك 🖥️
                  </span>
                  <span className="text-[10px] text-slate-500 leading-snug block mt-0.5">
                    حماية الجلسة: مسح الذاكرة المؤقتة تلقائياً عند إغلاق التبويب.
                  </span>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-800/20 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>دخول إلى المنصة</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center text-[11px] text-slate-500 font-medium">
              <span>أستاذ جديد وليس لديك حساب بعد؟ </span>
              <button
                type="button"
                onClick={() => setActiveTab("register")}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                أنشئ حسابك فوراً الآن
              </button>
            </div>
          </form>
        )}

        {/* ════════════════════════════════════════════════════════
            نموذج 3: استرجاع حساب الأستاذ الذكي
            ════════════════════════════════════════════════════════ */}
        {activeTab === "recover" && (
          <div className="space-y-4 text-xs">
            {recoverSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <p className="leading-relaxed">{recoverSuccess}</p>
              </div>
            )}

            {!recoveredTeacher ? (
              <form className="space-y-4" onSubmit={handleFindAccount}>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    أدخل كود الأستاذ أو البريد أو اسمك الكامل
                  </label>
                  <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                    يمكنك استعادة حسابك حتى لو نسيت البريد، فقط اكتب <strong>كود الأستاذ</strong> (مثال: <code className="text-emerald-700 font-mono font-bold">MTH-704</code>) أو اسمك الكامل.
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="مثال: MTH-704 أو البريد أو الاسم..."
                      value={recoverQuery}
                      onChange={(e) => setRecoverQuery(e.target.value)}
                      className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-800/20 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ البحث عن حسابك في النظام...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>البحث عن الحساب وتأكيد الهوية</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleResetPassword}>
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-emerald-700" />
                      تم العثور على حسابك بنجاح!
                    </span>
                    <span className="text-[10px] font-mono font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                      {recoveredTeacher.teacher_code}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 space-y-1 pt-1 border-t border-emerald-200/60">
                    <p><strong>الأستاذ:</strong> {recoveredTeacher.full_name}</p>
                    <p><strong>المؤسسة:</strong> {recoveredTeacher.school_custom_name}</p>
                    {recoveredTeacher.email_hint && (
                      <p><strong>البريد المسجل:</strong> <span className="font-mono text-emerald-800 font-bold" dir="ltr">{recoveredTeacher.email_hint}</span></p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    اكتب كلمة المرور الجديدة لحسابك <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition bg-slate-50/50 font-mono text-left"
                      dir="ltr"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    اختر كلمة مرور تتذكرها بسهولة (6 خانات على الأقل).
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-800/20 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جارٍ تعيين كلمة المرور...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>تعيين كلمة المرور والدخول</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecoveredTeacher(null);
                      setNewPassword("");
                    }}
                    className="px-3.5 py-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition font-bold cursor-pointer"
                    title="بحث عن حساب آخر"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            <div className="pt-2 text-center text-[11px] text-slate-500 font-medium">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setErrorMsg("");
                  setRecoverSuccess("");
                }}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                ← العودة إلى تسجيل الدخول
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <Suspense
        fallback={
          <div className="max-w-md mx-auto text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>جاري تحميل الواجهة...</span>
          </div>
        }
      >
        <AuthForm />
      </Suspense>
    </div>
  );
}
