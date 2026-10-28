import type { InspectorCircular, Lesson, PedagogicalNote, TimetableSlot, UserProfile } from "@/lib/types";

export const DISTRICTS_INFO: Record<number, string> = {
  1: "المقاطعة الأولى — الوادي 1",
  2: "المقاطعة الثانية — الوادي 2",
  3: "المقاطعة الثالثة — قمار",
  4: "المقاطعة الرابعة — الرقيبة",
  5: "المقاطعة الخامسة — الدبيلة والمقرن",
};

export interface TeacherStat {
  profile: UserProfile;
  lessonsCount: number;
  imagesCount: number;
  lastLessonAt: string | null;
  lastActivityAt: string | null;
  notesCount: number;
  pendingNotes: number;
  timetable: { slots: TimetableSlot[]; image_path?: string | null; updated_at?: string } | null;
}

export interface InspectionVisitRecord {
  id: string;
  teacherId: string;
  teacherName?: string;
  districtId: number;
  inspectorId?: string;
  inspectorName?: string;
  visitType: "orientation" | "followup" | "confirmation" | "promotion";
  visitDate: string; // YYYY-MM-DD
  schoolName: string;
  className: string;
  lessonTopic: string;
  strengths: string;
  recommendations: string;
  pedagogicalScore?: number | null;
  status: "completed" | "scheduled";
  createdAt: string;
}

export const VISIT_TYPES: Record<
  InspectionVisitRecord["visitType"],
  { label: string; badge: string; desc: string }
> = {
  orientation: {
    label: "زيارة إعلام وتوجيه",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    desc: "مرافقة الأستاذ في انطلاق الموسم الدراسي وتوجيهه منهجياً وتنظيمياً",
  },
  followup: {
    label: "زيارة متابعة ومرافقة",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "متابعة تنفيذ التوصيات السابقة وتدرجات التعلمات ومعالجة النقائص",
  },
  confirmation: {
    label: "زيارة تثبيت وترسيم",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    desc: "ترسيم الأستاذ المتربص في رتبة أستاذ التعليم المتوسط وتثبيته رسمياً",
  },
  promotion: {
    label: "زيارة تفتيش وترقية",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "تقييم الأداء البيداغوجي الدوري ومنح النقطة التربوية المعتمدة للترقية",
  },
};

export interface DistrictData {
  teachers: TeacherStat[];
  notes: PedagogicalNote[];
  circulars: InspectorCircular[];
  reads: { circular_id: string; teacher_id: string; read_at: string }[];
  schools: { id: string; name: string; commune: string }[];
  visits: InspectionVisitRecord[];
}

export function normalizeLessons(value: unknown): Lesson[] {
  return Array.isArray(value) ? (value as Lesson[]) : [];
}

export function formatDate(iso?: string | null, withTime = false) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-DZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

// عدد الأيام منذ آخر نشاط (لتمييز الأساتذة غير المنتظمين في النشر)
export function daysSince(iso?: string | null) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

const VISITS_STORAGE_KEY = "inspector_visits_records_v2";

// اختيار مساحة التخزين الآمنة (إذا كان حاسوباً مشتركاً، تُحفظ في الذاكرة المؤقتة للجلسة فقط لحماية السر المهني)
function getSecureStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    if (sessionStorage.getItem("jusoor_shared_device") === "true") {
      return sessionStorage;
    }
    return localStorage;
  } catch {
    return null;
  }
}

export function clearInspectionCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(VISITS_STORAGE_KEY);
    sessionStorage.removeItem(VISITS_STORAGE_KEY);
  } catch {}
}

export const SEED_VISITS: InspectionVisitRecord[] = [
  {
    id: "seed-visit-1",
    teacherId: "teacher-default",
    teacherName: "الأستاذ(ة) الموقر(ة)",
    districtId: 1,
    inspectorName: "مفتش التعليم المتوسط لمادة الرياضيات",
    visitType: "followup",
    visitDate: "2026-10-18",
    schoolName: "متوسطة الشيخ إبراهيم بن عامر",
    className: "4م1",
    lessonTopic: "خاصية طاليس: حساب الأطوال والبرهان الهندسي",
    strengths:
      "تمكن معرفي متميز من المادة العلمية؛ حسن إدارة زمن الحصة والسبورة؛ التفاعل الإيجابي مع التلاميذ وتشجيع المحاولات الفردية.",
    recommendations:
      "الحرص على استثمار كراس المحاولات بشكل أوسع قبل الشروع في التصحيح الجماعي؛ تنويع وضعيات التعلم لدعم التلاميذ المتعثرين؛ تدوين التاريخ الهجري والميلادي بانتظام.",
    pedagogicalScore: 16.5,
    status: "completed",
    createdAt: "2026-10-18T10:30:00.000Z",
  },
  {
    id: "seed-visit-2",
    teacherId: "teacher-default",
    teacherName: "الأستاذ(ة) الموقر(ة)",
    districtId: 1,
    inspectorName: "مفتش التعليم المتوسط لمادة الرياضيات",
    visitType: "orientation",
    visitDate: "2026-09-28",
    schoolName: "متوسطة الشيخ إبراهيم بن عامر",
    className: "1م2",
    lessonTopic: "أنشطة عددية: الأعداد العشرية والمستقيم المدرج",
    strengths:
      "مستوى تحضير بيداغوجي جاد، التزام كامل بالتدرج السنوي الصادر عن المفتشية، حسن تنظيم وثائق الأستاذ.",
    recommendations:
      "التركيز على مرحلة الانطلاق والوضعية المشكلة الحافزة للتعلم؛ تفعيل التقويم التكويني السريع في نهاية كل حصة.",
    pedagogicalScore: null,
    status: "completed",
    createdAt: "2026-09-28T09:15:00.000Z",
  },
];

export function getLocalVisits(districtId: number): InspectionVisitRecord[] {
  const store = getSecureStorage();
  if (!store) return SEED_VISITS;
  try {
    const raw = store.getItem(VISITS_STORAGE_KEY);
    if (!raw) {
      store.setItem(VISITS_STORAGE_KEY, JSON.stringify(SEED_VISITS));
      return SEED_VISITS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return SEED_VISITS;
  } catch {
    return SEED_VISITS;
  }
}

export function saveLocalVisit(visit: InspectionVisitRecord): void {
  const store = getSecureStorage();
  if (!store) return;
  try {
    const list = getLocalVisits(visit.districtId);
    const existingIndex = list.findIndex((v) => v.id === visit.id);
    let nextList: InspectionVisitRecord[];
    if (existingIndex >= 0) {
      nextList = [...list];
      nextList[existingIndex] = visit;
    } else {
      nextList = [visit, ...list];
    }
    store.setItem(VISITS_STORAGE_KEY, JSON.stringify(nextList));
  } catch (e) {
    console.error("Error saving visit", e);
  }
}

export function deleteLocalVisit(visitId: string, districtId: number): void {
  const store = getSecureStorage();
  if (!store) return;
  try {
    const list = getLocalVisits(districtId);
    const nextList = list.filter((v) => v.id !== visitId);
    store.setItem(VISITS_STORAGE_KEY, JSON.stringify(nextList));
  } catch (e) {
    console.error("Error deleting visit", e);
  }
}
