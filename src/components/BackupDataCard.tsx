"use client";

import { useState } from "react";
import { Download, Database, CheckCircle2, ShieldCheck, Loader2, AlertCircle, FileArchive } from "lucide-react";

export function BackupDataCard() {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDownloadBackup = async () => {
    setDownloading(true);
    setErrorMsg("");
    setDownloadSuccess(false);

    try {
      const res = await fetch("/api/backup");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "فشل تصدير النسخة الاحتياطية");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().split("T")[0];
      a.download = `jusoor-backup-${today}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-4" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              النسخ الاحتياطي وحفظ البيانات
              <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                حماية شاملة 🛡️
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تنزيل أرشيف رقمي كامل لجميع أعمالك التربوية في ملف واحد لحفظه في حاسوبك الشخصي.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>كامل مذكرات ودروس الحصص</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>دفتر النصوص اليومي وأنشطته</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>التوقيت الأسبوعي وقوائم الأقسام</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
        <button
          onClick={handleDownloadBackup}
          disabled={downloading}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
        >
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري تجميع البيانات...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>تنزيل نسختي الاحتياطية (ملف JSON)</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>حق نقل وحفظ البيانات مكفول وفق المادة 12 من القانون الجزائري 18-07.</span>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>تم تنزيل النسخة الاحتياطية بنجاح! احتفظ بالملف في مكان آمن. ✨</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
