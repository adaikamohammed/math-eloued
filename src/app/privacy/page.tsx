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
} from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#fafaf7] py-8 sm:py-12 px-4 font-sans text-right" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* شريط الرجوع */}
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
            <span>الامتثال للتشريع الجزائري</span>
          </span>
        </div>

        {/* بطاقة العنوان الرسمية */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#e8e8e0] shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#e6f4ee] text-[#107a57] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                سياسة الخصوصية وحماية المعطيات الشخصية
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                منصة جسور التعليمية — فضاء الأساتذة والتلاميذ والأولياء
              </p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed font-medium pt-2 border-t border-gray-100">
            تلتزم منصة جسور التعليمية بالاحترام الكامل لخصوصية مستخدميها (أساتذة، أولياء، وتلاميذ)، وتخضع معالجة البيانات فيها للضوابط والأحكام الواردة في التشريعات والقوانين الجزائرية السارية.
          </p>
        </div>

        {/* 1. الامتثال للقانون الجزائري رقم 18-07 */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e8e8e0] shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-black text-gray-900 border-b border-gray-100 pb-3">
            <Database className="w-4 h-4 text-[#107a57]" />
            <span>1. الامتثال لأحكام القانون رقم 18-07 (حماية المعطيات ذات الطابع الشخصي)</span>
          </div>

          <div className="space-y-2.5 text-xs text-gray-700 leading-relaxed font-medium">
            <p>
              تنفيذاً لمقتضيات القانون رقم 18-07 المؤرخ في 10 يونيو 2018 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي:
            </p>
            <ul className="space-y-2 list-disc list-inside text-gray-600 pr-1">
              <li>
                <strong className="text-gray-900">مشروعية الغرض:</strong> معالجة البيانات تقتصر حصرياً على الأهداف التربوية والبيداغوجية لتنظيم وتوثيق كراس القسم، السبورات اليومية، والتواصل التربوي البناء بين الأستاذ والولي.
              </li>
              <li>
                <strong className="text-gray-900">سرية البيانات وعزلها:</strong> علامات التقويم، الملاحظات الخاصة، وسجلات التلاميذ تبقى محصورة في الفضاء الشخصي المشفر للأستاذ، ولا يُسمح لأي طرف ثالث بالاطلاع عليها.
              </li>
              <li>
                <strong className="text-gray-900">حق النفاذ والتصحيح:</strong> يحق لكل ولي أمر أو أستاذ طلب مراجعة أو تصحيح أو حذف أي معطيات خاصة به وبأبنائه في أي وقت بمراسلة إدارة المنصة.
              </li>
            </ul>
          </div>
        </div>

        {/* 2. الامتثال للقانون الجزائري رقم 15-12 لحماية الطفل */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e8e8e0] shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-black text-gray-900 border-b border-gray-100 pb-3">
            <Heart className="w-4 h-4 text-rose-600" />
            <span>2. الامتثال لأحكام القانون رقم 15-12 (حماية الطفل وصون كرامته)</span>
          </div>

          <div className="space-y-2.5 text-xs text-gray-700 leading-relaxed font-medium">
            <p>
              وفقاً للمادتين 4 و 14 من القانون رقم 15-12 المؤرخ في 15 يوليو 2015 المتعلق بحماية الطفل:
            </p>
            <ul className="space-y-2 list-disc list-inside text-gray-600 pr-1">
              <li>
                <strong className="text-gray-900">حظر التشهير أو النشر العلني:</strong> يُحظر تماماً نشر أي استدعاءات، أو ملاحظات سلوكية، أو خصومات تخص أي تلميذ على صفحات مكشوفة للعامة.
              </li>
              <li>
                <strong className="text-gray-900">آلية الرمز السري الخاص (PIN):</strong> استدعاءات الأولياء وتوجيهات الأستاذ لا تفتح إلا بإدخال رمز سري خاص يسلمه الأستاذ للولي في كراس التلميذ لحماية كرامته ومنع أي وصم مدرسي بين أقرانه.
              </li>
              <li>
                <strong className="text-gray-900">لوحة الشرف التحفيزية:</strong> تُخصص لوحة الشرف حصرياً لتكريم الاجتهاد وتحفيز التميز المدرسي بموافقة وإشراف الأستاذ.
              </li>
            </ul>
          </div>
        </div>

        {/* 3. طبيعة المنصة والأمان التقني */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#e8e8e0] shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-black text-gray-900 border-b border-gray-100 pb-3">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>3. معايير الأمان التقني والسر المهني</span>
          </div>

          <div className="space-y-2 text-xs text-gray-700 leading-relaxed font-medium">
            <p>
              - المنصة غير تجارية، ومتاحة لأساتذة وأولياء وتلاميذ التعليم المتوسط (صدقة جارية ونشر للعلم النافع).
            </p>
            <p>
              - تُشفر كافة الاتصالات عبر بروتوكولات الحماية المعتمدة عالمياً (HTTPS / SSL/TLS).
            </p>
            <p>
              - تُحظر صيغ الملفات التنفيذية أو القابلة للحقن (مثل SVG)، ويُسمح فقط بصور الدروس (JPG, PNG, WebP) ومستندات PDF التربوية.
            </p>
          </div>
        </div>

        {/* تذييل التواصل */}
        <div className="bg-[#fafaf7] p-5 rounded-2xl border border-[#e8e8e0] text-center text-xs text-gray-500 space-y-1">
          <p className="font-bold text-gray-700">
            لأي استفسار أو طلب يتعلق بالبيانات الشخصية:
          </p>
          <p>
            يمكنكم التواصل عبر صندوق الرسائل في المنصة أو عبر إدارة المؤسسة التربوية المعنية.
          </p>
          <p className="text-[10px] text-gray-400 pt-1">
            آخر تحديث: أكتوبر 2026 • ولاية الوادي، الجزائر
          </p>
        </div>
      </div>
    </div>
  );
}
