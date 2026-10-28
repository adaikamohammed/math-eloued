"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle,
  FileCheck2,
  FileText,
  GraduationCap,
  Info,
  PenSquare,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Users,
} from "lucide-react";
import {
  deleteLocalVisit,
  formatDate,
  saveLocalVisit,
  VISIT_TYPES,
  type DistrictData,
  type InspectionVisitRecord,
} from "./shared";
import type { UserProfile } from "@/lib/types";

const inputCls =
  "w-full py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500";

export function VisitsTab({
  data,
  districtId,
  inspector,
  onChanged,
}: {
  data: DistrictData;
  districtId: number;
  inspector: UserProfile;
  onChanged: () => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // بيانات استمارة تسجيل زيارة جديدة
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [visitType, setVisitType] = useState<InspectionVisitRecord["visitType"]>("followup");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [schoolName, setSchoolName] = useState("");
  const [className, setClassName] = useState("4م1");
  const [lessonTopic, setLessonTopic] = useState("");
  const [strengths, setStrengths] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [score, setScore] = useState<string>("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // تحديث المدرسة تلقائياً عند اختيار الأستاذ
  const handleTeacherChange = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    const teacher = data.teachers.find((t) => t.profile.id === teacherId);
    if (teacher) {
      setSchoolName(teacher.profile.school_custom_name || "");
    }
  };

  const handleSaveVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !lessonTopic.trim() || !strengths.trim() || !recommendations.trim()) {
      setMessage({ type: "err", text: "يرجى ملء جميع الحقول الإلزامية لتسجيل بطاقة الزيارة" });
      return;
    }

    const teacher = data.teachers.find((t) => t.profile.id === selectedTeacherId);
    const newVisit: InspectionVisitRecord = {
      id: `visit-${Date.now()}`,
      teacherId: selectedTeacherId,
      teacherName: teacher?.profile.full_name || "الأستاذ",
      districtId,
      inspectorId: inspector.id,
      inspectorName: inspector.full_name || "مفتش التعليم المتوسط",
      visitType,
      visitDate,
      schoolName: schoolName.trim() || "متوسطة بالولاية",
      className: className.trim(),
      lessonTopic: lessonTopic.trim(),
      strengths: strengths.trim(),
      recommendations: recommendations.trim(),
      pedagogicalScore: score ? Number(score) : null,
      status: "completed",
      createdAt: new Date().toISOString(),
    };

    saveLocalVisit(newVisit);
    setMessage({ type: "ok", text: "✓ تم حفظ وتدوين بطاقة الزيارة والتفتيش بنجاح، وستظهر مباشرة في فضاء الأستاذ." });
    setShowAddForm(false);
    setLessonTopic("");
    setStrengths("");
    setRecommendations("");
    setScore("");
    onChanged();
  };

  const handleDelete = (v: InspectionVisitRecord) => {
    if (!confirm(`هل أنت متأكد من حذف بطاقة زيارة الأستاذ "${v.teacherName}"؟`)) return;
    deleteLocalVisit(v.id, districtId);
    onChanged();
  };

  const filteredVisits = useMemo(() => {
    return data.visits.filter((v) => {
      if (filterType !== "all" && v.visitType !== filterType) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          v.teacherName?.toLowerCase().includes(q) ||
          v.schoolName.toLowerCase().includes(q) ||
          v.lessonTopic.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data.visits, filterType, query]);

  return (
    <div className="space-y-4">
      {/* تنبيه السر المهني وأمن السجلات التفتيشية */}
      <div className="bg-indigo-50/60 border border-indigo-100 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs text-indigo-950">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-bold">
            السر المهني محفوظ: تقارير التفتيش والنقاط التربوية محمية طبقاً للقانون 18-07 والمادة 26 من القانون الأساسي لقطاع التربية الوطنية.
          </span>
        </div>
      </div>

      {/* الشريط العلوي وأزرار التحكم */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث باسم الأستاذ، المتوسطة، أو الدرس..."
              className="w-full pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs"
          >
            <option value="all">كل أنواع الزيارات</option>
            {(Object.keys(VISIT_TYPES) as InspectionVisitRecord["visitType"][]).map((k) => (
              <option key={k} value={k}>
                {VISIT_TYPES[k].label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>تدوين بطاقة زيارة وتفتيش جديدة</span>
        </button>
      </div>

      {message && (
        <p
          className={`p-3 rounded-xl text-xs font-bold ${
            message.type === "ok"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* استمارة تدوين زيارة جديدة */}
      {showAddForm && (
        <form
          onSubmit={handleSaveVisit}
          className="bg-white rounded-3xl border border-indigo-200 p-5 sm:p-6 shadow-sm space-y-4 fade-up"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <PenSquare className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                بطاقة زيارة وتفتيش بيداغوجي لأستاذ في المقاطعة
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              إلغاء ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">الأستاذ المزار *</label>
              <select
                required
                value={selectedTeacherId}
                onChange={(e) => handleTeacherChange(e.target.value)}
                className={inputCls}
              >
                <option value="">اختر الأستاذ...</option>
                {data.teachers.map((t) => (
                  <option key={t.profile.id} value={t.profile.id}>
                    {t.profile.full_name} ({t.profile.school_custom_name || "متوسطة"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع الزيارة *</label>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as InspectionVisitRecord["visitType"])}
                className={inputCls}
              >
                {(Object.keys(VISIT_TYPES) as InspectionVisitRecord["visitType"][]).map((k) => (
                  <option key={k} value={k}>
                    {VISIT_TYPES[k].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الزيارة *</label>
              <input
                type="date"
                required
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">المؤسسة / المتوسطة</label>
              <input
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="متوسطة..."
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">القسم والفوج المزار</label>
              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="مثلاً: 4م1"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                النقطة التربوية /20 (اختياري للترقية والتفتيش)
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="20"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="مثلاً: 16.5"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              موضوع الدرس / المورد المعرفي المعالج أثناء الزيارة *
            </label>
            <input
              required
              value={lessonTopic}
              onChange={(e) => setLessonTopic(e.target.value)}
              placeholder="مثلاً: خاصية طاليس وحساب الأطوال والبرهان الهندسي"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                🌟 نقاط القوة والإشادة البيداغوجية *
              </label>
              <textarea
                required
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="مثلاً: إتقان المادة العلمية، التزام الأستاذ بالتدرج السنوي، حسن تنظيم السبورة، إشراك المتعلمين..."
                className={`${inputCls} min-h-24`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-amber-800 mb-1">
                📌 التوصيات والتوجيهات البيداغوجية الواجب استثمارها *
              </label>
              <textarea
                required
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="مثلاً: إعطاء وقت كافٍ للمحاولة الفردية على كراس المحاولات، تنويع الأسئلة لمراعاة الفروق الفردية..."
                className={`${inputCls} min-h-24`}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle className="w-4 h-4" />
              حفظ بطاقة الزيارة وإشعار الأستاذ
            </button>
          </div>
        </form>
      )}

      {/* سجل الزيارات */}
      {filteredVisits.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700 text-sm">لا توجد زيارات مسجلة</p>
          <p className="text-xs text-slate-400">
            انقر على زر "تدوين بطاقة زيارة وتفتيش جديدة" أعلاه لتدوين تقرير زيارة ميدانية.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVisits.map((v) => {
            const visitTypeInfo = VISIT_TYPES[v.visitType] || VISIT_TYPES.followup;
            return (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                      {v.teacherName?.charAt(0) || "أ"}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${visitTypeInfo.badge}`}>
                          {visitTypeInfo.label}
                        </span>
                        <span className="text-[11px] text-slate-500">{formatDate(v.visitDate)}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {v.className}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                        الأستاذ(ة): {v.teacherName} — {v.schoolName}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {v.pedagogicalScore != null && (
                      <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {v.pedagogicalScore} / 20
                      </span>
                    )}
                    <button
                      onClick={() => window.print()}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                      title="طباعة بطاقة الزيارة"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="حذف السجل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs font-bold text-slate-800">
                  مورد التعلم المعالج: <span className="font-medium text-slate-600">{v.lessonTopic}</span>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 space-y-1">
                    <p className="font-bold text-emerald-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> نقاط القوة والإشادة:
                    </p>
                    <p className="text-emerald-950 font-medium leading-relaxed">{v.strengths}</p>
                  </div>

                  <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100 space-y-1">
                    <p className="font-bold text-amber-900 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-amber-600" /> التوجيهات والتوصيات:
                    </p>
                    <p className="text-amber-950 font-medium leading-relaxed">{v.recommendations}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
