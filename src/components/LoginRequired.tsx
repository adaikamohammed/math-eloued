import Link from "next/link";
import { Lock } from "lucide-react";

// يظهر في فضاءات الأستاذ عند غياب جلسة دخول (حساب الأستاذ على المنصة)
export function LoginRequired({ next, title }: { next: string; title: string }) {
  return (
    <div className="pt-16 max-w-sm mx-auto space-y-4 px-4 text-center fade-up" dir="rtl">
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
        <Lock className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-black text-slate-800">{title}</h1>
      <p className="text-xs text-slate-500">
        هذا الفضاء خاص بالأستاذ. سجّل الدخول بحسابك على منصة ولاية الوادي للمتابعة.
      </p>
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="inline-flex w-full justify-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition"
      >
        تسجيل الدخول
      </Link>
      <p className="block text-[11px] text-slate-400">
        التسجيل متاح للأساتذة عبر رابط الدعوة المعتمد من الإدارة
      </p>
    </div>
  );
}
