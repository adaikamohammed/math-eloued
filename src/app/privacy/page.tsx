"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Heart,
  Scale,
  ArrowRight,
  CheckCircle2,
  FileText,
  Users,
  EyeOff,
  Database,
  Building,
  AlertTriangle,
  Download,
  Server,
  KeyRound,
  FileCheck,
} from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#fafaf7] py-8 sm:py-12 px-4 font-sans text-right" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* شريط الرجوع والأختام */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-bold transition bg-white px-3.5 py-2 rounded-xl border border-[#e8e8e0] shadow-2xs"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للرئيسية</span>
          </Link>
          <span className="text-[11px] font-bold text-[#107a57] bg-[#e6f4ee] px-3 py-1 rounded-full border border-[#107a57]/20 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            <span>الامتثال للتشريع الجزائري الساري</span>
          </span>
        </div>

        {/* بطاقة العنوان الرسمية */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e8e8e0] shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#e6f4ee] text-[#107a57] flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                سياسة الخصوصية وحماية المعطيات وإخلاء المسؤولية
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                منظومة قِبَاب الجزائر للتربية والتعليم (Qibab El Djazair) — فضاء الأستاذ، الولي، التلميذ، والإدارة التربوية
              </p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium pt-2 border-t border-gray-100">
            تضع منظومة قِبَاب الجزائر للتربية والتعليم (Qibab El Djazair) حماية الحياة الخاصة وصون المعطيات التربوية في صميم أولوياتها التقنية والقانونية، بما يضمن الطمأنينة الكاملة للأساتذة والمؤسسات التعليمية والأولياء والجهات الوصية، وفقاً للأحكام والضوابط القانونية المعمول بها في الجمهورية الجزائرية الديمقراطية الشعبية.
          </p>
        </div>

        {/* 1. الامتثال للقانون الجزائري رقم 18-07 */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e8e8e0] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-gray-900 border-b border-gray-100 pb-3">
            <Database className="w-4 h-4 text-[#107a57]" />
            <span>1. الامتثال لأحكام القانون رقم 18-07 (حماية المعطيات ذات الطابع الشخصي)</span>
          </div>

          <div className="space-y-3 text-xs text-gray-700 leading-relaxed font-medium">
            <p>
              تنفيذاً لمقتضيات القانون رقم 18-07 المؤرخ في 10 يونيو 2018 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي، فإن المنصة تعتمد الضوابط الصارمة الآتية:
            </p>
            <ul className="space-y-2.5 text-gray-600 pr-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#107a57] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">حظر جمع الهويات الإدارية الحساسة:</strong> تلتزم المنصة بمبدأ تقليص البيانات (Data Minimization)، حيث يُحظر نهائياً طلب أو حفظ رقم التعريف الوطني (NIN) أو رقم التعريف المدرسي الموحد (رقم مسار / الرقمنة)، ولا يتم جمع أي بصمات أو بيانات بيومترية أو سجلات طبية أو بيانات بنكية.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#107a57] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">تجريد البيانات وحجب الهوية التلقائي:</strong> في لوحة الشرف والتميز المدرسي، يُحجب لقب التلميذ القاصر آلياً (مثل: <em>يوسف ب.</em>) منعاً لتداول الهويات العائلية الكاملة للقُصَّر على الإنترنت.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#107a57] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">حق سحب وتصدير البيانات محلياً (المادة 12):</strong> يحق لكل أستاذ بنقرة واحدة من لوحة الإعدادات تنزيل كامل بياناته البيداغوجية، دفاتره، ومذكراته في ملف مشفر (JSON) وتخزينه محلياً على حاسوبه الشخصي داخل التراب الوطني.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#107a57] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">الجاهزية للسيادة والتوطين المحلي (100% On-Premise Ready):</strong> لأن بنية المنصة وقاعدة بياناتها مفتوحة المصدر بالكامل (Open-Source)، فإن النظام مهيأ تقنياً للترحيل الفوري في أي وقت إلى خوادم وطنية سيادية (مثل اتصالات الجزائر، إيكوزنت، أو مركز بيانات وزارة التربية الوطنية) بقرار إداري وتنظيمي.
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* 2. الامتثال للقانون الجزائري رقم 15-12 لحماية الطفل */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e8e8e0] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-gray-900 border-b border-gray-100 pb-3">
            <Heart className="w-4 h-4 text-rose-600" />
            <span>2. الامتثال لأحكام القانون رقم 15-12 (حماية الطفل وصون كرامته)</span>
          </div>

          <div className="space-y-3 text-xs text-gray-700 leading-relaxed font-medium">
            <p>
              وفقاً للمادتين 4 و 14 من القانون رقم 15-12 المؤرخ في 15 يوليو 2015 المتعلق بحماية الطفل:
            </p>
            <ul className="space-y-2.5 text-gray-600 pr-1">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">حظر التشهير أو النشر العلني:</strong> يُحظر تماماً نشر أي استدعاءات أولياء، أو ملاحظات سلوكية، أو تقارير غيابات تخص أي تلميذ على صفحات مكشوفة للعامة.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">آلية الرمز السري الشخصي (4-Digit PIN):</strong> استدعاءات الأولياء وتوجيهات الأستاذ لا تفتح إلا بإدخال رمز سري خاص يسلمه الأستاذ للولي في كراس التلميذ لحماية كرامته ومنع أي وصم مدرسي بين أقرانه، مع تفعيل حماية ضد محاولات التخمين الآلية (Rate Limiting).
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">حماية الفضاءات التواصلية:</strong> خضوع صناديق الرسائل لدرع تصفية آلي لمنع أي عبارات غير لائقة، مع خلو المنصة من أي وسائط إعلانية موجهة للأطفال.
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* 3. إخلاء المسؤولية القانونية وحدود الاستخدام */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-amber-200 bg-linear-to-b from-amber-50/20 to-white shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-amber-900 border-b border-amber-100 pb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>3. إخلاء المسؤولية القانونية وحدود استخدام المنصة</span>
          </div>

          <div className="space-y-3 text-xs text-gray-700 leading-relaxed font-medium">
            <p>
              يرجى قراءة بنود إخلاء المسؤولية الآتية بتمعن، حيث يُعد استخدام المنصة إقراراً بالموافقة التامة عليها:
            </p>
            <ul className="space-y-2.5 text-gray-600 pr-1">
              <li className="flex items-start gap-2">
                <FileCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">طبيعة المنصة التطوعية:</strong> هذه المنصة هي مبادرة تربوية وبيداغوجية تطوعية غير ربحية (صدقة جارية ونشر للعلم النافع)، صُممت لتيسير توثيق كراس القسم، السبورات، والتواصل البيداغوجي اليومي للأستاذ.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <FileCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">الاستقلالية عن المنصات الوزارية الرسمية:</strong> المنصة وسيلة دعم مساندة، ولا تحل محل السجلات الإدارية الرسمية أو المنصات الرقمية لوزارة التربية الوطنية (مثل منصة فضاء الأولياء أو النظام المعلوماتي الرسمي للوزارة).
                </div>
              </li>
              <li className="flex items-start gap-2">
                <FileCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">المسؤولية الحصرية للأساتذة والمستخدمين عن حساباتهم:</strong> يتحمل كل أستاذ أو مستخدم المسؤولية الكاملة والمنفردة قانونياً وإدارياً وأخلاقياً عن كافة المحتويات والمذكرات والبيانات التي يقوم برفعها أو مشاركتها عبر حسابه، ويلتزم باحترام أخلاقيات المهنة وتشريعات قطاع التربية الوطنية.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <FileCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-gray-900">عدم مسؤولية إدارة المنصة التقنية:</strong> تُخلي إدارة المنصة ومطوروها مسؤوليتهم القانونية والمدنية والجنائية عن أي سوء استخدام، أو خرق فردي، أو نشر محتوى غير مرخص من قبل أي مستخدم، وتحتفظ الإدارة بحق إيقاف أو حظر أي حساب يخالف المعايير القانونية والأخلاقية فوراً.
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* 4. معايير الأمان التقني والسر المهني */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e8e8e0] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-gray-900 border-b border-gray-100 pb-3">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>4. معايير الأمان التقني والسر المهني</span>
          </div>

          <div className="space-y-2.5 text-xs text-gray-700 leading-relaxed font-medium">
            <p>
              - كافة الاتصالات والبيانات مشفرة ببروتوكولات التشفير الحديثة (HTTPS / TLS 1.3 / AES-256).
            </p>
            <p>
              - حظر تام لكافة صيغ الملفات التنفيذية أو القابلة للحقن البرمجي (مثل ملفات SVG أو البرمجيات النصية)، والاعتماد الحصري على صور السبورة (JPG, PNG, WebP) وملفات PDF البيداغوجية النظيفة.
            </p>
            <p>
              - ميزة مسح الجلسة الفوري وتفريغ الذاكرة المؤقتة للأجهزة المشتركة (Shared Staffroom PCs) لحماية حساب الأستاذ من التداخل في قاعة الأساتذة.
            </p>
          </div>
        </div>

        {/* تذييل التواصل والمراجعة */}
        <div className="bg-[#fafaf7] p-5 rounded-2xl border border-[#e8e8e0] text-center text-xs text-gray-500 space-y-1">
          <p className="font-bold text-gray-700">
            لأي استفسار بيداغوجي أو مراجعة تتعلق بالبيانات:
          </p>
          <p>
            يمكن التواصل عبر القنوات المخصصة في المنصة أو عبر إدارة المؤسسة التربوية المعنية.
          </p>
          <p className="text-[10px] text-gray-400 pt-1">
            صيغة منقحة ومعتمدة • أكتوبر 2026 • الجمهورية الجزائرية الديمقراطية الشعبية
          </p>
        </div>
      </div>
    </div>
  );
}
