"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import {
  Printer,
  Sparkles,
  BookOpen,
  Users,
  Calendar,
  ClipboardList,
  Scale,
  Trophy,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Lock,
  Camera,
  Download,
  Copy,
  Eye,
  Building2,
  GraduationCap,
  FileText,
  Clock,
  Sparkle,
  PenTool,
} from "lucide-react";

export default function TeachersStaffRoomPackPage() {
  const [schoolName, setSchoolName] = useState("متوسطة باهي علي");
  const [wilayaName, setWilayaName] = useState("الوادي");
  const [academicYear, setAcademicYear] = useState("2026 / 2027");
  const [activeTab, setActiveTab] = useState<"all" | "poster" | "guide">("all");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [platformUrl, setPlatformUrl] = useState<string>("https://jusoor-dz.vercel.app");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      const target = origin.includes("localhost") ? "https://jusoor-dz.vercel.app" : origin;
      setPlatformUrl(target);
      QRCode.toDataURL(target, {
        width: 600,
        margin: 1,
        color: {
          dark: "#0a5c40",
          light: "#ffffff",
        },
      })
        .then(setQrCodeUrl)
        .catch(() => {});
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-2 sm:px-4 print:p-0 print:bg-white font-sans text-slate-800" dir="rtl">
      {/* ─── شريط التحكم العلوي (يختفي تماماً أثناء الطباعة) ─── */}
      <header className="max-w-5xl mx-auto mb-6 bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
              <Link href="/admin" className="hover:text-emerald-700 transition flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5" />
                لوحة الأستاذ
              </Link>
              <span>/</span>
              <span className="text-gray-900">مستندات قاعة الأساتذة (A4 Print-Ready)</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600" />
              <span>حزمة ملصقات ودليل قاعة الأساتذة — {schoolName}</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              أوراق A4 ملونة وواضحة جاهزة للطباعة والتعليق في قاعة الأساتذة تتضمن إعلان المنصة الرسمي ودليلاً مصوراً خطوة بخطوة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* اختيار طريقة العرض */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === "all" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                الحزمة كاملة (3 أوراق)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("poster")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === "poster" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                الملصق الإعلاني فقط
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("guide")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === "guide" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                الدليل المصور فقط
              </button>
            </div>

            {/* زر الطباعة الفورية */}
            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستندات الآن A4 🖨️</span>
            </button>
          </div>
        </div>

        {/* شريط تخصيص بيانات المؤسسة قبل الطباعة */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-black text-slate-700">تخصيص البيانات المطبوعة:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">المؤسسة:</span>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-slate-800 text-xs w-44 bg-slate-50"
              placeholder="اسم المتوسطة"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">الولاية:</span>
            <input
              type="text"
              value={wilayaName}
              onChange={(e) => setWilayaName(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-slate-800 text-xs w-28 bg-slate-50"
              placeholder="الولاية"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">الموسم:</span>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-slate-800 text-xs w-28 bg-slate-50"
            />
          </div>
          <span className="text-[11px] text-emerald-700 font-bold mr-auto">
            💡 نصيحة: اختر قياس A4 وفعّل خيار (Background Graphics / رسومات الخلفية) في نافذة الطباعة لأفضل نتيجة ملونة.
          </span>
        </div>
      </header>

      {/* ─── المستندات المطبوعة المنسقة بقياس A4 (Typeset Canvas) ─── */}
      <main className="max-w-[210mm] mx-auto space-y-8 print:space-y-0 print:max-w-none">
        {/* ========================================================================= */}
        {/* الورقة 1: الملصق الإعلاني الرسمي الجذاب لتعليقه في قاعة الأساتذة          */}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "poster") && (
          <section className="a4-sheet bg-white rounded-3xl p-8 sm:p-10 border border-slate-300 print:border-none shadow-xl print:shadow-none print:rounded-none relative overflow-hidden flex flex-col justify-between">
            {/* زخرفة هندسية بصرية راقية بهوية المنصة */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -z-0 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-50 rounded-full blur-3xl -z-0 pointer-events-none" />

            <div className="relative z-10 space-y-6">
              {/* الترويسة الوزارية الرسمية */}
              <div className="text-center space-y-1 border-b-2 border-slate-800 pb-4">
                <p className="text-xs font-bold text-slate-800 tracking-wider">
                  الجمهورية الجزائرية الديمقراطية الشعبية
                </p>
                <p className="text-xs font-extrabold text-slate-900">
                  وزارة التربية الوطنية
                </p>
                <div className="flex items-center justify-between text-xs font-black pt-1 px-2 text-slate-900">
                  <span>مديرية التربية لولاية {wilayaName}</span>
                  <span className="text-emerald-900 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-300">
                    {schoolName}
                  </span>
                  <span>السنة الدراسية: {academicYear}</span>
                </div>
              </div>

              {/* رأس الإعلان وشعار منصة جسور */}
              <div className="text-center space-y-3 pt-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-800 text-emerald-100 text-xs font-black shadow-xs">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>إعلان تربوي وبيداغوجي هام لكافة السيدات والسادة الأساتذة</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-black text-emerald-950 font-serif">منصة جُسُور التعليمية</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-xs font-black text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md font-mono">
                      Jusoor Edu
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                    انطلاق الفضاء الرقمي البيداغوجي الموحد لأساتذة وتلاميذ المؤسسة
                  </h2>
                  <p className="text-xs text-slate-600 max-w-xl mx-auto font-medium leading-relaxed">
                    يسر إدارة {schoolName} أن تضع بين أيديكم المنصة الرقمية المعتمدة لتوثيق السبورات، متابعة الواجبات، تدوين الدفاتر البيداغوجية، ورصد التقويم المستمر بكل استقلالية واحترافية.
                  </p>
                </div>
              </div>

              {/* شبكة مميزات المنصة الأربع الكبرى للأستاذ */}
              <div className="grid grid-cols-2 gap-3.5 pt-2">
                {/* الميزة 1 */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      <Camera className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-black text-emerald-950">
                      كراس الدروس والسبورة الرقمية
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    التقاط صورة السبورة اليومية ونشرها لتلاميذ الفوج والغائبين، مع إرفاق الواجبات المنزلية والحلول النموذجية تلقائياً.
                  </p>
                </div>

                {/* الميزة 2 */}
                <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/90 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-black text-teal-950">
                      الدفتر اليومي ودفتر النصوص
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    تحضير حصص الغد في ثوانٍ مع خاصية <strong>تكرار الدرس للأقسام المتوازية</strong> بنقرة واحدة، وتوليد دفتر النصوص الميداني الرسمي.
                  </p>
                </div>

                {/* الميزة 3 */}
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/90 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-black text-blue-950">
                      دفتر التقويم الصفي السريع
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    رصد علامات القسم (المشاركة، الكراس، الوظائف، الاستجوابات) باللمس السريع في الهاتف، مع حساب آلي لمعدل المادة الفصلي.
                  </p>
                </div>

                {/* الميزة 4 */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/90 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-black text-indigo-950">
                      حماية الخصوصية وتكريم النوابغ
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    التواصل الآمن مع الأولياء بدون مشاركة رقم هاتفك الشخصي، مع لوحة شرف تكريمية تفخر بنوابغ ومجتهدي أقسامك.
                  </p>
                </div>
              </div>

              {/* بطاقة الدخول السريع ومسح رمز QR */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 text-white border border-emerald-800 shadow-md flex items-center justify-between gap-5">
                <div className="space-y-1.5 min-w-0">
                  <span className="text-[10px] font-black tracking-wider text-emerald-300 uppercase block">
                    ⚡ خطوة واحدة للبدء والاستخدام الفوري
                  </span>
                  <h4 className="text-base font-black text-white leading-tight">
                    امسح الرمز المقابل بكاميرا هاتفك للبدء فوراً
                  </h4>
                  <p className="text-xs text-emerald-100/90 font-medium leading-relaxed">
                    افتح الرابط ثم اضغط <strong>«إنشاء حساب أستاذ جديد»</strong> وأدخل اسمك ومادتك لتنطلق في توثيق دروسك وتنظيم أقسامك.
                  </p>
                  <div className="pt-1 flex items-center gap-2 text-xs font-mono font-bold text-emerald-200">
                    <span className="bg-white/10 px-3 py-1 rounded-xl border border-white/10 select-all" dir="ltr">
                      {platformUrl}
                    </span>
                  </div>
                </div>

                {/* رمز QR بدقة عالية جداً للطباعة */}
                <div className="p-2.5 bg-white rounded-2xl border-2 border-emerald-400 shrink-0 text-center shadow-lg">
                  {qrCodeUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrCodeUrl} alt="QR منصة جسور" className="w-28 h-28 object-contain rounded-lg" />
                  ) : (
                    <div className="w-28 h-28 bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                      رمز QR
                    </div>
                  )}
                  <span className="text-[9px] font-black text-slate-800 block pt-1">
                    امسح بكاميرا الهاتف 📲
                  </span>
                </div>
              </div>
            </div>

            {/* صندوق التأشيرات والإمضاءات الرسمية في أسفل الملصق */}
            <div className="relative z-10 pt-6 mt-4 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                <span>حرر بـ {wilayaName} في: {new Date().toLocaleDateString("ar-DZ", { year: "numeric", month: "long", day: "numeric" })}</span>
                <span className="text-emerald-900 font-extrabold">منصة جسور التعليمية — جسر التعاون البيداغوجي الحديث</span>
              </div>

              <div className="grid grid-cols-2 gap-6 text-center text-xs">
                {/* خانة منسق المادة / الأساتذة */}
                <div className="border border-slate-300 rounded-2xl p-3 h-24 flex flex-col justify-between bg-slate-50/50">
                  <span className="font-black text-slate-900 border-b border-slate-200 pb-1">
                    أساتذة التعليم المتوسط — {schoolName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    (الاطلاع والمباشرة في رقمنة السبورات والأفواج)
                  </span>
                </div>

                {/* خانة السيد مدير المتوسطة */}
                <div className="border-2 border-slate-900 rounded-2xl p-3 h-24 flex flex-col justify-between bg-white shadow-2xs">
                  <span className="font-black text-slate-950 border-b border-slate-300 pb-1">
                    تأشيرة وختم السيد مدير المتوسطة
                  </span>
                  <div className="flex items-center justify-center text-[10px] text-slate-400 font-black border border-dashed border-slate-300 rounded-lg py-1 mx-4">
                    (الختم الإداري الرسمي للمؤسسة)
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* فاصل صفحات A4 أثناء الطباعة */}
        <div className="print:page-break" />

        {/* ========================================================================= */}
        {/* الورقة 2: الدليل المصور الشامل للأستاذ (الجزء 1: التسجيل والأفواج والسبورة)*/}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "guide") && (
          <section className="a4-sheet bg-white rounded-3xl p-8 sm:p-10 border border-slate-300 print:border-none shadow-xl print:shadow-none print:rounded-none flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* ترويسة مصغرة للدليل */}
              <div className="flex items-center justify-between border-b-2 border-emerald-900 pb-2 text-xs font-bold text-slate-900">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
                  <span className="font-black text-sm text-emerald-950">دليل الأستاذ المصور خطوة بخطوة (1 / 2)</span>
                </div>
                <span className="text-slate-600">{schoolName} • ولاية {wilayaName}</span>
              </div>

              {/* ─── الخطوة 01: إنشاء الحساب ─── */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-800 text-white text-xs font-black flex items-center justify-center">
                      01
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      إنشاء حساب الأستاذ الجديد وتحديد المادة
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    يستغرق 30 ثانية فقط ⚡
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  افتح الموقع، اضغط على <strong>«إنشاء حساب أستاذ جديد»</strong>، ثم اكتب اسمك الكامل، مادتك التعليمية (رياضيات، لغة عربية، علوم، فيزياء...)، واختر المستويات التي تدرسها في المتوسطة (1م، 2م، 3م، 4م).
                </p>

                {/* سكرين شوت ومحاكاة بصرية لواجهة إنشاء الحساب */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 border-b pb-1">
                    <span>نافذة التسجيل: jusoor-dz.vercel.app/register</span>
                    <span>خطوة 1 من 2</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-700">
                      👤 الاسم الكامل: <span className="text-emerald-800 font-black">أستاذ المادة</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-700">
                      📖 المادة: <span className="text-emerald-800 font-black">الرياضيات (أو مادتك)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                    <span>المستويات المسندة:</span>
                    <span className="px-2 py-0.5 bg-emerald-700 text-white rounded font-mono text-[10px]">1م</span>
                    <span className="px-2 py-0.5 bg-emerald-700 text-white rounded font-mono text-[10px]">2م</span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-mono text-[10px]">3م</span>
                    <span className="px-2 py-0.5 bg-emerald-700 text-white rounded font-mono text-[10px]">4م</span>
                  </div>
                </div>
              </div>

              {/* ─── الخطوة 02: لوحة الأستاذ والحصول على الكود ─── */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-teal-800 text-white text-xs font-black flex items-center justify-center">
                      02
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      لوحة الأستاذ والحصول على كود مادتك المخصص
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-md">
                    هويتك الرقمية أمام التلاميذ
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  بمجرد الدخول، يُنشئ لك النظام تلقائياً <strong>رمزاً سريعاً خاصاً بك (مثال: MTH-101)</strong> ورابطاً مباشراً مع رمز QR. انسخه وشاركه مع التلاميذ في القسم أو في كراس المحاولات ليدخل أولياؤهم مباشرة.
                </p>

                {/* سكرين شوت ومحاكاة بصرية لكود الأستاذ */}
                <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-xl p-3 shadow-2xs flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-emerald-300 font-bold block">كود المادة المعطى للتلاميذ:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-black text-white bg-white/20 px-3 py-0.5 rounded-lg border border-white/20 tracking-wider">
                        MTH-896
                      </span>
                      <span className="text-[11px] text-emerald-200 font-bold">يكتبه الولي في خانة البحث فيفتح فضاءك فوراً</span>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black shrink-0">
                    نسخ الرابط 📋
                  </div>
                </div>
              </div>

              {/* ─── الخطوة 03: إدارة الأفواج والتلاميذ ─── */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-800 text-white text-xs font-black flex items-center justify-center">
                      03
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      إدارة الأفواج وتدوين قوائم التلاميذ
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                    الأقسام المسندة (1م1، 2م3...)
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  من القائمة الجانبية اختر <strong>«إدارة الأفواج والتلاميذ»</strong>، أضف أفواجك التربوية ثم دوّن أسماء التلاميذ أو الصق القائمة دفعة واحدة لتجهيز دفتر التقويم الصفي الفوري.
                </p>

                {/* محاكاة بصرية لإدارة الأفواج */}
                <div className="bg-white rounded-xl border border-slate-200 p-2.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-700 border-b pb-1">
                    <span>قائمة الفوج: <strong className="text-emerald-800">1 متوسط 2 (1م2)</strong></span>
                    <span className="text-[10px] text-slate-400">عدد التلاميذ: 34 تلميذاً</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px] font-medium text-slate-600">
                    <span className="p-1 rounded bg-slate-50 border">1. بلقاسم محمد الأمين</span>
                    <span className="p-1 rounded bg-slate-50 border">2. عدايكة أسامة</span>
                    <span className="p-1 rounded bg-slate-50 border">3. تجاني يحيى</span>
                  </div>
                </div>
              </div>
            </div>

            {/* تذييل الصفحة 1 */}
            <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span>تابع الورقة الموالية: رفع السبورات، دفتر التقويم بالهاتف، ودفتر النصوص ⬅️</span>
              <span>صفحة 1 من 2</span>
            </div>
          </section>
        )}

        {/* فاصل صفحات A4 أثناء الطباعة */}
        <div className="print:page-break" />

        {/* ========================================================================= */}
        {/* الورقة 3: الدليل المصور الشامل للأستاذ (الجزء 2: السبورات، التقويم، والنصوص)*/}
        {/* ========================================================================= */}
        {(activeTab === "all" || activeTab === "guide") && (
          <section className="a4-sheet bg-white rounded-3xl p-8 sm:p-10 border border-slate-300 print:border-none shadow-xl print:shadow-none print:rounded-none flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* ترويسة مصغرة للدليل */}
              <div className="flex items-center justify-between border-b-2 border-emerald-900 pb-2 text-xs font-bold text-slate-900">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
                  <span className="font-black text-sm text-emerald-950">دليل الأستاذ المصور خطوة بخطوة (2 / 2)</span>
                </div>
                <span className="text-slate-600">{schoolName} • ولاية {wilayaName}</span>
              </div>

              {/* ─── الخطوة 04: توثيق صور السبورة والواجبات ─── */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-800 text-white text-xs font-black flex items-center justify-center">
                      04
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      توثيق صور السبورة اليومية وإسناد الواجبات
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    كاميرا الهاتف مباشرة 📸
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  من صفحة <strong>«كراس الدروس والسبورة»</strong>، اختر المستوى (مثلاً 1م)، اضغط <strong>«إضافة درس جديد»</strong>، التقط صورة السبورة بكاميرا هاتفك أو ارفعها، واكتب رقم التمرين أو الواجب المنزلي.
                </p>

                {/* محاكاة بصرية لبطاقة الدرس والسبورة */}
                <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 text-xs shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-900">الدرس 04: العمليات على الأعداد الطبيعية والعشرية</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">منشور للولي ✓</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      📸 صورة السبورة مرفوعة
                    </span>
                    <span className="flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      📝 واجب منزلي: تمرين 14 ص 18
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── الخطوة 05: دفتر التقويم المستمر الصفي بالهاتف ─── */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-teal-800 text-white text-xs font-black flex items-center justify-center">
                      05
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      دفتر التقويم الصفي السريع بالهاتف (Quick Tap)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-md">
                    تنقيط القسم كاملاً في 30 ثانية ⚡
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  ادخل إلى <strong>«دفتر التقويم المستمر الصفي»</strong> من هاتفك داخل القسم، اختر المعيار (مثلاً: الوظيفة 1 من 2ن)، والمس علامة التلميذ مباشرة بأصبعك، مع زر ذهبي <strong>«🌟 وضع 2/2 للجميع»</strong>. تُحسب المعدلات الفصلية آلياً وفق المنشور الوزاري!
                </p>

                {/* محاكاة بصرية لأزرار التنقيط بالأصبع في الهاتف */}
                <div className="bg-white rounded-xl border border-teal-200 p-2.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 border-b pb-1">
                    <span>التلميذ: <strong>بلقاسم محمد الأمين (1م2)</strong></span>
                    <span className="text-emerald-800 font-mono font-black text-sm">العلامة: 2 / 2</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end" dir="ltr">
                    <span className="px-3 py-1 bg-emerald-700 text-white font-black rounded-lg text-xs shadow-xs">[ 2 ]</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">[ 1.5 ]</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">[ 1 ]</span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs">[ 0.5 ]</span>
                  </div>
                </div>
              </div>

              {/* ─── الخطوة 06: الدفتر اليومي، دفتر النصوص، وتكريم النوابغ ─── */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-800 text-white text-xs font-black flex items-center justify-center">
                      06
                    </span>
                    <h3 className="text-sm font-black text-slate-900">
                      الدفاتر البيداغوجية، تكرار الحصص، وتكريم النوابغ
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                    المسودة ودفتر النصوص ولوحة الشرف
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <span className="font-black text-slate-900 block">⚡ تكرار الدرس للأقسام:</span>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      إذا كنت تدرس نفس الدرس لـ (1م1، 1م2، 1م3)، اضغط <strong>«حفظ وتكرار الدرس»</strong> ليتوثق لبقية الأفواج بلمسة واحدة.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <span className="font-black text-slate-900 block">🏆 لوحة الشرف الرسمية:</span>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                      سجّل المتفوقين في لوحة الشرف واطبع شهادات التقدير الرسمية للمؤسسة بضغطة زر واحدة.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* تذييل واعتماد الدليل في أسفل الورقة */}
            <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">
                لأي استفسار أو مرافقة تقنية يرجى التواصل مع منسق المادة بالمؤسسة.
              </span>
              <div className="text-left font-black text-slate-900">
                إدارة {schoolName} — مع تمنياتنا بالتوفيق لكافة الأساتذة 🌹
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ─── تنسيقات الطباعة الدقيقة A4 CSS Print Styles ─── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .a4-sheet {
            page-break-inside: avoid;
            height: 275mm;
            max-height: 280mm;
            box-shadow: none !important;
            border: none !important;
            padding: 8mm !important;
          }
          .print\\:page-break {
            page-break-after: always;
            break-after: page;
            height: 0;
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
