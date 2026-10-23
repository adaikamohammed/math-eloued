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
  HelpCircle,
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
}

const FEATURE_DEFINITIONS: FeatureCardDef[] = [
  // الميدان التربوي والبيداغوجي
  {
    key: "boardLessons",
    label: "كراس القسم وصور السبورة",
    description: "رفع وتوثيق صور السبورة اليومية، كراس الدروس، الأعمال الموجهة والملخصات.",
    icon: BookOpen,
    group: "pedagogy",
    forParentsToo: true,
    parentsDescription: "يسمح للولي بتصفح كراس القسم وصور السبورة لمساعدة ابنه.",
  },
  {
    key: "students",
    label: "إدارة الأفواج والتلاميذ",
    description: "إضافة الأفواج المخصصة (مثل 1م3، 2م5) وقائمة التلاميذ والترتيب الأبجدي.",
    icon: Users,
    group: "pedagogy",
    forParentsToo: false,
  },
  {
    key: "timetable",
    label: "التوقيت الأسبوعي",
    description: "جدول الحصص الأسبوعي، القاعات، وساعات استقبال الأولياء المعتمدة.",
    icon: Calendar,
    group: "pedagogy",
    forParentsToo: true,
    parentsDescription: "يظهر للولي جدول الأستاذ لمعرفة أوقات الحصص ومواعيد الاستقبال.",
  },
  {
    key: "diary",
    label: "الدفتر اليومي (ماذا سأدرس غداً)",
    description: "توثيق الحصص اليومية، التحضير لمحتوى الغد، مؤشرات الكفاءة وطباعة دفتر النصوص.",
    icon: ClipboardList,
    group: "pedagogy",
    forParentsToo: true,
    parentsDescription: "يسمح للولي بمعرفة المورد المعرفي المحضر لغد ومتابعته.",
  },
  {
    key: "homework",
    label: "الواجبات المنزلية والحلول",
    description: "إسناد التمارين والواجبات مع إمكانية جدولة نشر الحل النموذجي بعد انتهاء المهلة.",
    icon: FileTextIcon,
    group: "pedagogy",
    forParentsToo: true,
    parentsDescription: "يمكن الولي من معرفة الواجبات المطلوبة وموعد تسليمها.",
  },

  // الشفافية والمتابعة والتحفيز
  {
    key: "continuousAssessment",
    label: "ميثاق التقويم المستمر (20/20)",
    description: "نظام الشفافية التامة لتقويم كراس التلميذ، الواجبات، المستلزمات والمشاركة.",
    icon: Scale,
    group: "followup",
    forParentsToo: true,
    parentsDescription: "يظهر للولي معايير تقويم ابنه للحصول على 20/20 بشفافية تامة.",
  },
  {
    key: "honors",
    label: "لوحة الشرف وتكريم النوابغ",
    description: "تكريم التلاميذ المتميزين في الفروض، المواظبة، أو الكراس الأنيق النموذجي.",
    icon: Trophy,
    group: "followup",
    forParentsToo: true,
    parentsDescription: "تشجيع معنوي عام يراه أولياء التلاميذ المتفوقين لتحفيزهم.",
  },
  {
    key: "announcements",
    label: "شريط الإعلانات والتنبيهات",
    description: "نشر التنبيهات المدرسية، مواعيد الفروض، أو أي إعلان عاجل.",
    icon: Megaphone,
    group: "followup",
    forParentsToo: true,
    parentsDescription: "تنبيهات فورية تظهر في أعلى فضاء الأستاذ للأولياء.",
  },
  {
    key: "messages",
    label: "صندوق الرسائل والمقترحات",
    description: "استقبال أسئلة وملاحظات الأولياء والتلاميذ مع الحفاظ على الخصوصية.",
    icon: MessageSquare,
    group: "followup",
    forParentsToo: true,
    parentsDescription: "يمنح الولي وسيلة مراسلة مباشرة مع الأستاذ دون الحاجة للاتصال الهاتفي.",
  },
  {
    key: "reception",
    label: "بطاقة الاستقبال الرسمية",
    description: "تحديد اليوم والساعة الرسمية لاستقبال أولياء التلاميذ داخل المؤسسة.",
    icon: Users,
    group: "followup",
    forParentsToo: true,
    parentsDescription: "توضح للولي بدقة متى يمكنه الحضور لمقابلة الأستاذ في المتوسطة.",
  },
  {
    key: "penalties",
    label: "سجل الخصومات والملاحظات",
    description: "توثيق التنبيهات السلوكية أو خصم نقاط الإهمال مع بيان السبب والتاريخ.",
    icon: FileWarning,
    group: "followup",
    forParentsToo: false,
  },

  // الملتقى والتفتيش (اختياري بحسب رغبة الأستاذ)
  {
    key: "forum",
    label: "ملتقى الأساتذة البيداغوجي",
    description: "فضاء نقاش وتبادل المذكرات والخبرات بين أساتذة المادة في ولاية الوادي.",
    icon: Sparkles,
    group: "inspection",
    forParentsToo: false,
  },
  {
    key: "inspectorSync",
    label: "فضاء التفتيش والمناشير الرسمية",
    description: "الربط مع مفتش المقاطعة لتلقي المراسلات، الندوات، ومراجعة المذكرات البيداغوجية.",
    icon: ShieldCheck,
    group: "inspection",
    forParentsToo: false,
  },
];

function FileTextIcon(props: { className?: string }) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
}

export default function FeaturesCustomizationPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flags, setFlags] = useState<TeacherFeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // التحقق من الجلسة
  useEffect(() => {
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => {
        setAuthenticated(data.authenticated === true);
      })
      .catch(() => setAuthenticated(false));
  }, []);

  // تحميل الإعدادات الحالية
  const loadFlags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/lessons");
      if (!res.ok) throw new Error("تعذر تحميل الإعدادات");
      const data: LessonsData = await res.json();
      if (data.featureFlags) {
        setFlags({ ...DEFAULT_FEATURE_FLAGS, ...data.featureFlags });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "err", text: err.message || "حدث خطأ أثناء تحميل التفضيلات" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadFlags();
    }
  }, [authenticated, loadFlags]);

  // حفظ التعديلات
  const handleSave = async (updatedFlags: TeacherFeatureFlags) => {
    setSaving(true);
    setFlags(updatedFlags);
    try {
      const res = await fetch("/api/lessons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureFlags: updatedFlags }),
      });
      if (!res.ok) throw new Error("فشل حفظ التعديلات");
      setMessage({ type: "ok", text: "تم تحديث تفضيلات الواجهة بنجاح ✨" });
      setTimeout(() => setMessage(null), 3000);
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

  const applyPreset = (preset: "all" | "minimal" | "no_inspector") => {
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
        continuousAssessment: true,
        honors: false,
        reception: true,
        announcements: false,
        messages: false,
        penalties: false,
        forum: false,
        inspectorSync: false,
      };
    } else {
      // وضع بدون متابعة تفتيش أو منتديات
      updated = {
        ...flags,
        inspectorSync: false,
        forum: false,
      };
    }
    handleSave(updated);
  };

  if (authenticated === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-[#107a57]" />
      </div>
    );
  }

  if (authenticated === false) {
    return <LoginRequired next="/settings/features" title="تخصيص الواجهة والصفحات" />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf7] py-6 sm:py-8 px-4 font-sans" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
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

          <Link
            href="/settings"
            className="px-3.5 py-1.5 rounded-xl border border-[#e8e8e0] bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs flex items-center gap-1.5"
          >
            <span>إعدادات الحساب وكلمة المرور</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>

        {/* تنبيهات النجاح أو الخطأ */}
        {message && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in duration-200 ${
              message.type === "ok"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {message.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* ترويسة الصفحة */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e8e8e0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 bg-[#e6f4ee] text-[#107a57] border border-[#107a57]/20 px-3 py-0.5 rounded-full text-xs font-bold">
              <Sliders className="w-3.5 h-3.5" />
              <span>تحكم كامل ومخصص لكل أستاذ</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              تخصيص صفحات المنصة وما يظهر للولي
            </h1>
            <p className="text-xs text-gray-600 font-medium max-w-2xl">
              أنت صاحب الفضاء: يمكنك إخفاء أي صفحة لا تحتاجها من شريطك الجانبي (مثل التفتيش أو المنتديات)، وتحديد ما إذا كانت كل ميزة متاحة لولي الأمر في فضاء الأستاذ الخاص بك.
            </p>
          </div>

          {/* أوضاع جاهزة سريعة */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <button
              onClick={() => applyPreset("all")}
              className="px-3 py-1.5 rounded-xl border border-[#e8e8e0] bg-[#fafaf7] hover:bg-white text-xs font-bold text-gray-800 transition text-right shadow-2xs cursor-pointer"
            >
              ⭐ تفعيل جميع الميزات
            </button>
            <button
              onClick={() => applyPreset("no_inspector")}
              className="px-3 py-1.5 rounded-xl border border-[#e8e8e0] bg-[#fafaf7] hover:bg-white text-xs font-bold text-gray-800 transition text-right shadow-2xs cursor-pointer"
            >
              🔒 إخفاء التفتيش والملتقى
            </button>
            <button
              onClick={() => applyPreset("minimal")}
              className="px-3 py-1.5 rounded-xl border border-[#e8e8e0] bg-[#fafaf7] hover:bg-white text-xs font-bold text-gray-800 transition text-right shadow-2xs cursor-pointer"
            >
              🎯 الوضع المركز (الدروس والتلاميذ فقط)
            </button>
          </div>
        </div>

        {/* ─── شبكة الميزات ─── */}
        <div className="space-y-6">
          {/* قسم 1: الميدان التربوي والبيداغوجي */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900 border-b border-[#e8e8e0] pb-2">
              <BookOpen className="w-4 h-4 text-[#107a57]" />
              <span>الميدان التربوي والتعليمي اليومي</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {FEATURE_DEFINITIONS.filter((f) => f.group === "pedagogy").map((feat) => {
                const Icon = feat.icon;
                const isEnabled = flags[feat.key] !== false;
                return (
                  <div
                    key={feat.key}
                    onClick={() => toggleFeature(feat.key)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                      isEnabled
                        ? "bg-white border-[#107a57]/40 ring-1 ring-[#107a57]/20 shadow-xs"
                        : "bg-[#fafaf7] border-[#e8e8e0] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isEnabled
                            ? "bg-[#e6f4ee] text-[#107a57] border-[#107a57]/20"
                            : "bg-gray-100 text-gray-400 border-gray-200"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1 text-right">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-gray-900">{feat.label}</h4>
                          {feat.forParentsToo && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-md">
                              يظهر للولي
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                          {feat.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pt-1">
                      <div
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
                          isEnabled ? "bg-[#107a57]" : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                            isEnabled ? "-translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* قسم 2: الشفافية والمتابعة وتواصل الأولياء */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900 border-b border-[#e8e8e0] pb-2">
              <Scale className="w-4 h-4 text-emerald-600" />
              <span>الشفافية، التقويم والمتابعة مع الأولياء</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {FEATURE_DEFINITIONS.filter((f) => f.group === "followup").map((feat) => {
                const Icon = feat.icon;
                const isEnabled = flags[feat.key] !== false;
                return (
                  <div
                    key={feat.key}
                    onClick={() => toggleFeature(feat.key)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                      isEnabled
                        ? "bg-white border-[#107a57]/40 ring-1 ring-[#107a57]/20 shadow-xs"
                        : "bg-[#fafaf7] border-[#e8e8e0] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isEnabled
                            ? "bg-[#e6f4ee] text-[#107a57] border-[#107a57]/20"
                            : "bg-gray-100 text-gray-400 border-gray-200"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1 text-right">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-gray-900">{feat.label}</h4>
                          {feat.forParentsToo && (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded-md">
                              يظهر للولي
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                          {feat.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pt-1">
                      <div
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
                          isEnabled ? "bg-[#107a57]" : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                            isEnabled ? "-translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* قسم 3: التفتيش والملتقى البيداغوجي */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-gray-900 border-b border-[#e8e8e0] pb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>فضاء المفتشية والملتقى الولائي (اختياري حسب رغبة الأستاذ)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {FEATURE_DEFINITIONS.filter((f) => f.group === "inspection").map((feat) => {
                const Icon = feat.icon;
                const isEnabled = flags[feat.key] !== false;
                return (
                  <div
                    key={feat.key}
                    onClick={() => toggleFeature(feat.key)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                      isEnabled
                        ? "bg-white border-[#107a57]/40 ring-1 ring-[#107a57]/20 shadow-xs"
                        : "bg-[#fafaf7] border-[#e8e8e0] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isEnabled
                            ? "bg-[#e6f4ee] text-[#107a57] border-[#107a57]/20"
                            : "bg-gray-100 text-gray-400 border-gray-200"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1 text-right">
                        <h4 className="text-xs font-black text-gray-900">{feat.label}</h4>
                        <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                          {feat.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pt-1">
                      <div
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
                          isEnabled ? "bg-[#107a57]" : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                            isEnabled ? "-translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
