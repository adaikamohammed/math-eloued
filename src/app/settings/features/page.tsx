"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Sliders,
  Sparkles,
  BookOpen,
  Users,
  Calendar,
  ClipboardList,
  Scale,
  Trophy,
  Megaphone,
  MessageSquare,
  FileWarning,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  Save,
  Check,
  RotateCcw,
  Sparkle,
  Zap,
  Info,
  GraduationCap,
} from "lucide-react";
import { LoginRequired } from "@/components/LoginRequired";
import {
  TeacherFeatureFlags,
  DEFAULT_FEATURE_FLAGS,
  LessonsData,
} from "@/lib/types";

interface FeatureCardDef {
  key: keyof TeacherFeatureFlags;
  label: string;
  description: string;
  icon: React.ElementType;
  group: "pedagogy" | "followup" | "inspection";
  forParentsToo: boolean;
  parentsDescription?: string;
  badge?: string;
}

const FEATURE_DEFINITIONS: FeatureCardDef[] = [
  // الميدان التربوي والبيداغوجي
  {
    key: "boardLessons",
    label: "كراس القسم وصور السبورة",
    description: "توثيق صور السبورة اليومية، كراس الدروس، الأعمال الموجهة، والملخصات للتلاميذ.",
    icon: BookOpen,
    group: "pedagogy",
    forParentsToo: true,
    parentsDescription: "يسمح للولي والغياب بمشاهدة ما كُتب على السبورة في كل حصة.",
  },
  {
    key: "students",
    label: "إدارة الأفواج والتلاميذ",
    description: "إدارة أفواجك المسندة (1م1، 2م3...) وتدوين قوائم التلاميذ واستدعاءات الاستدراك.",
    icon: Users,
    group: "pedagogy",
    forParentsToo: false,
  },
  {
    key: "timetable",
    label: "التوقيت الأسبوعي والحصص",
    description: "جدول الحصص والتفويج الأسبوعي ومشاركة التوقيت المعتمد مع المفتشية والأولياء.",
    icon: Calendar,
    group: "pedagogy",
    forParentsToo: true,
    parentsDescription: "يساعد الولي على معرفة توقيت حصص المادة وساعات استقبال الأولياء.",
  },
  {
    key: "diary",
    label: "الدفتر اليومي (ماذا سأدرس غداً)",
    description: "التحضير البيداغوجي المسبق لدروس الغد ومؤشرات الكفاءة وسجل دفتر النصوص.",
    icon: ClipboardList,
    group: "pedagogy",
    forParentsToo: true,
    parentsDescription: "يطلع الولي على عنوان الدرس القادم لتحفيز ابنه على التحضير المسبق.",
  },
  {
    key: "homework",
    label: "الواجبات المنزلية والحلول",
    description: "إسناد التمارين المنزلية مع تحديد مهلة الحل وبرمجة نشر الحل النموذجي تلقائياً.",
    icon: BookOpen,
    group: "pedagogy",
    forParentsToo: true,
    parentsDescription: "تمكين الأولياء من متابعة حل الواجبات قبل انتهاء الأجل المحدد.",
  },

  // الشفافية والمتابعة والتحفيز
  {
    key: "continuousAssessment",
    label: "ميثاق التقويم المستمر (20/20)",
    description: "معايير التقويم الصفي الشفاف (كراس المحاولات، الأدوات، السلوك، والمشاركة الفعالة).",
    icon: Scale,
    group: "followup",
    forParentsToo: true,
    parentsDescription: "يعرف الولي بالضبط كيف تُحتسب علامة ابنه الصفيّة بكل أمانة ووضوح.",
  },
  {
    key: "honors",
    label: "لوحة الشرف وتكريم النوابغ",
    description: "تكريم التلاميذ المتفوقين وطباعة شهادات التقدير الرسمية والتحفيز المستمر.",
    icon: Trophy,
    group: "followup",
    forParentsToo: true,
    parentsDescription: "لوحة فخر عامة تظهر للتلميذ والولي لتشجيع التنافس الإيجابي الشريف.",
  },
  {
    key: "announcements",
    label: "شريط الإعلانات والتنبيهات",
    description: "نشر التنبيهات المدرسية العاجلة ومواعيد الفروض والأنشطة الخاصة بالمؤسسة.",
    icon: Megaphone,
    group: "followup",
    forParentsToo: true,
    parentsDescription: "إشعارات فورية تظهر في أعلى فضاء الأستاذ للتلاميذ والأولياء.",
  },
  {
    key: "messages",
    label: "صندوق الرسائل والمقترحات",
    description: "استقبال استفسارات ورسائل الأولياء والتلاميذ المشفرة مع الحفاظ على الخصوصية.",
    icon: MessageSquare,
    group: "followup",
    forParentsToo: true,
    parentsDescription: "قناة تواصل راقية ومباشرة مع الأستاذ دون إحراج أو إزعاج هاتفي.",
  },
  {
    key: "reception",
    label: "بطاقة استقبال الأولياء",
    description: "تحديد اليوم والساعة الرسمية الأسبوعية لاستقبال أولياء التلاميذ بالمؤسسة.",
    icon: Users,
    group: "followup",
    forParentsToo: true,
    parentsDescription: "تنبيه الولي بموعد ومكان الاستقبال الرسمي المعتمد داخل المتوسطة.",
  },
  {
    key: "penalties",
    label: "سجل الخصومات والملاحظات",
    description: "توثيق التنبيهات الموجهة والملاحظات السلوكية مع بيان التاريخ والتفاصيل.",
    icon: FileWarning,
    group: "followup",
    forParentsToo: false,
  },

  // فضاء التفتيش والملتقى
  {
    key: "forum",
    label: "ملتقى الأساتذة البيداغوجي",
    description: "فضاء التبادل المعرفي والمذكرات والاستشارات بين أساتذة المادة في ولاية الوادي.",
    icon: Sparkles,
    group: "inspection",
    forParentsToo: false,
  },
  {
    key: "inspectorSync",
    label: "فضاء التفتيش والمناشير الرسمية",
    description: "استقبال مناشير المفتشية، الندوات التكوينية، إيداع المذكرات، وسجل التوصيات.",
    icon: ShieldCheck,
    group: "inspection",
    forParentsToo: false,
  },
];

const LOCAL_STORAGE_FLAGS_KEY = "teacher_feature_flags_cache";

export default function FeaturesCustomizationPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flags, setFlags] = useState<TeacherFeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // التحقق من الجلسة
  useEffect(() => {
    fetch("/api/auth")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setAuthenticated(data?.authenticated === true);
      })
      .catch(() => setAuthenticated(false));
  }, []);

  // تحميل الإعدادات الحالية من الكاش المحلي أولاً (0ms) ثم من السيرفر
  const loadFlags = useCallback(async () => {
    // 1. القراءة من التخزين المحلي الفوري
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_FLAGS_KEY);
      if (cached) {
        setFlags({ ...DEFAULT_FEATURE_FLAGS, ...JSON.parse(cached) });
        setLoading(false);
      }
    } catch {}

    // 2. المزامنة من السيرفر
    try {
      const res = await fetch("/api/lessons");
      if (res.ok) {
        const data: LessonsData = await res.json();
        if (data.featureFlags) {
          const merged = { ...DEFAULT_FEATURE_FLAGS, ...data.featureFlags };
          setFlags(merged);
          try {
            localStorage.setItem(LOCAL_STORAGE_FLAGS_KEY, JSON.stringify(merged));
          } catch {}
        }
      }
    } catch (err: any) {
      console.error("loadFlags error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadFlags();
    }
  }, [authenticated, loadFlags]);

  // حفظ التعديلات بشكل لحظي ودون أي تعليق
  const handleSave = async (updatedFlags: TeacherFeatureFlags) => {
    setSaving(true);
    setFlags(updatedFlags);

    // 1. تحديث الكاش المحلي وبث حدث التحديث الفوري لكافة مكونات التطبيق (0ms)
    try {
      localStorage.setItem(LOCAL_STORAGE_FLAGS_KEY, JSON.stringify(updatedFlags));
      window.dispatchEvent(new CustomEvent("featureFlagsUpdated", { detail: updatedFlags }));
    } catch {}

    // 2. الحفظ على خادم وقاعدة البيانات
    try {
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureFlags: updatedFlags }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || "فشل حفظ التعديلات في الخادم");
      }

      setMessage({
        type: "ok",
        text: "تم تحديث التفضيلات بنجاح ✨ تظهر الصفحات المفعلة وتختفي الملغاة فوراً في شريطك الجانبي وفضاء الولي.",
      });
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "err", text: err.message || "حدث خطأ أثناء الحفظ" });
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (key: keyof TeacherFeatureFlags) => {
    const updated = {
      ...flags,
      [key]: !flags[key],
    };
    handleSave(updated);
  };

  const applyPreset = (preset: "all" | "minimal" | "no_inspector" | "honors_focus") => {
    let updated: TeacherFeatureFlags;
    if (preset === "all") {
      updated = { ...DEFAULT_FEATURE_FLAGS };
    } else if (preset === "minimal") {
      updated = {
        boardLessons: true,
        students: true,
        timetable: true,
        diary: true,
        homework: true,
        continuousAssessment: false,
        honors: false,
        reception: true,
        announcements: false,
        messages: false,
        penalties: false,
        forum: false,
        inspectorSync: false,
      };
    } else if (preset === "no_inspector") {
      updated = {
        ...flags,
        inspectorSync: false,
        forum: false,
      };
    } else {
      // نمط التكريم والتقويم
      updated = {
        ...flags,
        boardLessons: true,
        continuousAssessment: true,
        honors: true,
        announcements: true,
        reception: true,
      };
    }
    handleSave(updated);
  };

  if (authenticated === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (authenticated === false) {
    return <LoginRequired next="/settings/features" title="تخصيص الواجهة والصفحات" />;
  }

  // حساب عدد الميزات المفعلة
  const enabledCount = Object.values(flags).filter((v) => v !== false).length;

  return (
    <div className="space-y-6 fade-up font-sans" dir="rtl">
      {/* شريط المسار والتنقل */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <Link href="/admin" className="hover:text-gray-900 transition flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5" />
            لوحة الأستاذ
          </Link>
          <span>/</span>
          <Link href="/settings" className="hover:text-gray-900 transition">
            الإعدادات
          </Link>
          <span>/</span>
          <span className="text-gray-900">تخصيص الواجهة والصفحات</span>
        </div>

        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl flex items-center gap-1.5 border border-emerald-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              جاري الحفظ...
            </span>
          )}
          <Link
            href="/settings"
            className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5"
          >
            <span>إعدادات الحساب</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>
      </div>

      {/* تنبيهات النجاح أو الخطأ */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border shadow-2xs animate-in fade-in duration-200 ${
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === "ok" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">
            ✕
          </button>
        </div>
      )}

      {/* ترويسة الصفحة والتحكم بالأنماط الجاهزة */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-3 py-0.5 rounded-full text-xs font-bold">
              <Sliders className="w-3.5 h-3.5" />
              <span>تحكم كامل ومخصص بحرية تامة</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              تخصيص صفحات المنصة وما يظهر للأولياء
            </h1>
            <p className="text-xs text-emerald-100/90 font-medium max-w-2xl leading-relaxed">
              اختر بحرية الصفحات التي تود تفعيلها في شريطك الجانبي، وأي ميزات ترغب بمشاركتها مع أولياء التلاميذ.
              عند إلغاء تفعيل أي ميزة، تختفي فوراً من شريطك وقائمتك دون أي أخطاء.
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs text-emerald-200">
              <span className="font-bold">الحالة الحالية:</span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 font-bold">
                {enabledCount} ميزة مفعلة من أصل {FEATURE_DEFINITIONS.length}
              </span>
            </div>
          </div>

          {/* أوضاع جاهزة سريعة بنقرة واحدة */}
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 space-y-2 shrink-0">
            <span className="text-[11px] font-black text-emerald-200 block">⚡ أنماط جاهزة سريعة:</span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => applyPreset("all")}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition text-right flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>تفعيل الكل</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("minimal")}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition text-right flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-300" />
                <span>النمط المبسط</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("no_inspector")}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition text-right flex items-center gap-1.5 col-span-2"
              >
                <EyeOff className="w-3.5 h-3.5 text-blue-300" />
                <span>استقلالية تامة (بدون فضاء التفتيش)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── شبكة الميزات المنظمة ─── */}
      <div className="space-y-6">
        {/* قسم 1: الميدان التربوي والتعليمي */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>الميدان التربوي والتعليمي اليومي</span>
            </div>
            <span className="text-[11px] text-gray-400 font-bold">
              {FEATURE_DEFINITIONS.filter((f) => f.group === "pedagogy" && flags[f.key] !== false).length} مفعلة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {FEATURE_DEFINITIONS.filter((f) => f.group === "pedagogy").map((feat) => (
              <FeatureCard
                key={feat.key}
                feat={feat}
                isEnabled={flags[feat.key] !== false}
                onToggle={() => toggleFeature(feat.key)}
              />
            ))}
          </div>
        </div>

        {/* قسم 2: الشفافية والمتابعة وتواصل الأولياء */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900">
              <Scale className="w-4 h-4 text-indigo-600" />
              <span>الشفافية، التقويم والمتابعة مع الأولياء</span>
            </div>
            <span className="text-[11px] text-gray-400 font-bold">
              {FEATURE_DEFINITIONS.filter((f) => f.group === "followup" && flags[f.key] !== false).length} مفعلة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {FEATURE_DEFINITIONS.filter((f) => f.group === "followup").map((feat) => (
              <FeatureCard
                key={feat.key}
                feat={feat}
                isEnabled={flags[feat.key] !== false}
                onToggle={() => toggleFeature(feat.key)}
              />
            ))}
          </div>
        </div>

        {/* قسم 3: فضاء التفتيش والملتقى */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>فضاء المفتشية والملتقى التكويني</span>
            </div>
            <span className="text-[11px] text-gray-400 font-bold">
              {FEATURE_DEFINITIONS.filter((f) => f.group === "inspection" && flags[f.key] !== false).length} مفعلة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {FEATURE_DEFINITIONS.filter((f) => f.group === "inspection").map((feat) => (
              <FeatureCard
                key={feat.key}
                feat={feat}
                isEnabled={flags[feat.key] !== false}
                onToggle={() => toggleFeature(feat.key)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ─── معاينة حية لشكل القائمة الجانبية الحالية ─── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              معاينة حية: ما سيظهر في شريطك الجانبي الآن وفق اختياراتك
            </h3>
          </div>
          <span className="text-[11px] text-gray-400 font-bold">تحديث لحظي تلقائي (0ms)</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" /> لوحة التحكم
          </span>

          {flags.boardLessons !== false && (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> كراس الدروس والسبورة
            </span>
          )}

          {flags.students !== false && (
            <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" /> إدارة الأفواج
            </span>
          )}

          {flags.timetable !== false && (
            <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-600" /> التوقيت الأسبوعي
            </span>
          )}

          {flags.diary !== false && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-amber-600" /> الدفتر اليومي
            </span>
          )}

          {flags.continuousAssessment !== false && (
            <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-teal-600" /> ميثاق التقويم
            </span>
          )}

          {flags.honors !== false && (
            <span className="px-3 py-1.5 rounded-xl bg-yellow-50 text-yellow-800 border border-yellow-200 text-xs font-bold flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-yellow-600" /> لوحة الشرف
            </span>
          )}

          {flags.penalties !== false && (
            <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1.5">
              <FileWarning className="w-3.5 h-3.5 text-rose-600" /> سجل الخصومات
            </span>
          )}

          {flags.announcements !== false && (
            <span className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-800 border border-orange-200 text-xs font-bold flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-orange-600" /> شريط الإعلانات
            </span>
          )}

          {flags.messages !== false && (
            <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" /> صندوق الرسائل
            </span>
          )}

          {flags.reception !== false && (
            <span className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-600" /> استقبال الأولياء
            </span>
          )}

          {flags.forum !== false && (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> الملتقى البيداغوجي
            </span>
          )}

          {flags.inspectorSync !== false && (
            <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> فضاء التفتيش
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── بطاقة الميزة التفاعلية ───
function FeatureCard({
  feat,
  isEnabled,
  onToggle,
}: {
  feat: FeatureCardDef;
  isEnabled: boolean;
  onToggle: () => void;
}) {
  const Icon = feat.icon;

  return (
    <div
      onClick={onToggle}
      className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start justify-between gap-3 select-none ${
        isEnabled
          ? "bg-white border-emerald-300 ring-2 ring-emerald-500/10 shadow-xs hover:border-emerald-400"
          : "bg-gray-50/70 border-gray-200 opacity-60 hover:opacity-100 hover:bg-white"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
            isEnabled
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs"
              : "bg-gray-100 text-gray-400 border-gray-200"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="space-y-1 text-right min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`text-xs font-black ${isEnabled ? "text-gray-900" : "text-gray-500"}`}>
              {feat.label}
            </h4>
            {feat.forParentsToo && (
              <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-md">
                يظهر للولي
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
            {feat.description}
          </p>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
        <span
          className={`text-[10px] font-black px-2 py-0.5 rounded-full border transition-colors ${
            isEnabled
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : "bg-gray-200 text-gray-500 border-gray-300"
          }`}
        >
          {isEnabled ? "مفعلة ✓" : "مخفية ✕"}
        </span>

        {/* سويتش التبديل المرئي */}
        <div
          className={`w-10 h-5.5 rounded-full transition-colors relative flex items-center p-0.5 ${
            isEnabled ? "bg-emerald-600" : "bg-gray-300"
          }`}
        >
          <div
            className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transform transition-transform ${
              isEnabled ? "translate-x-0" : "-translate-x-4.5"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
