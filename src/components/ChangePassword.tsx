"use client";

import { useState, useEffect } from "react";
import { KeyRound, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { validatePasswordStrength } from "@/lib/passwordPolicy";

// تغيير كلمة المرور (للأساتذة والمفتشين مع التحقق من المعايير الأمنية)
export function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validatePasswordStrength(password);
    if (!check.valid) {
      return setMessage({ type: "err", text: check.error || "كلمة المرور غير صالحة" });
    }
    if (password !== confirm) {
      return setMessage({ type: "err", text: "كلمتا المرور غير متطابقتين" });
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setMessage({ type: "err", text: error.message });
    } else {
      setPassword("");
      setConfirm("");
      setMessage({ type: "ok", text: "✓ تم تغيير كلمة المرور بنجاح وبأمان عالٍ" });
    }
  };

  return (
    <form onSubmit={submit} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-emerald-600" /> تغيير كلمة المرور وبيانات الأمان
        </h2>
        {userEmail && (
          <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200" dir="ltr">
            {userEmail}
          </span>
        )}
      </div>

      {userEmail && (
        <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs text-emerald-950 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px]">
              البريد المعتمد لهذا الحساب: <strong className="font-mono text-emerald-900 font-bold" dir="ltr">{userEmail}</strong>
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
            حساب معتمد ومؤكد ✓
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          className="py-2 px-3 rounded-xl border border-slate-200 text-xs"
          placeholder="كلمة المرور الجديدة (أحرف + أرقام)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          className="py-2 px-3 rounded-xl border border-slate-200 text-xs"
          placeholder="تأكيد كلمة المرور"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {message && <p className={`text-xs font-bold ${message.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>}
      <button disabled={busy || !password} className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} تحديث كلمة المرور
      </button>
    </form>
  );
}
