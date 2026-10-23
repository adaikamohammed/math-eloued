export type NotebookType = "lessons" | "directed_work" | "worksheets" | "summaries";

export type LessonImage = {
  id: string;
  url: string;
  downloadUrl?: string;
  name: string;
  createdAt: string;
  fileType?: "image" | "pdf";
};

export function isPdfFile(item?: { url?: string; name?: string; fileType?: string } | null): boolean {
  if (!item) return false;
  if (item.fileType === "pdf") return true;
  const name = (item.name || "").toLowerCase();
  const url = (item.url || "").toLowerCase();
  return name.endsWith(".pdf") || url.endsWith(".pdf") || url.includes(".pdf?") || url.includes("/pdf");
}


export type Lesson = {
  id: string;
  teacherId?: string; // معرف الأستاذ صاحب الدرس في المنصة الولائية
  level: 1 | 2 | 3 | 4; // 1 = أولى متوسط ، 2 = ثانية متوسط ، 3 = ثالثة متوسط ، 4 = رابعة متوسط
  type?: NotebookType; // "lessons" (كراس الدروس) | "directed_work" (كراس الأعمال الموجهة) | "worksheets" (سلاسل التمارين) | "summaries" (الملخصات والمطويات)
  field?: string; // الميدان : مثلاً "أنشطة عددية" ، "أنشطة هندسية" ، "تنظيم معطيات"
  section?: string; // المقطع المعرفي : مثلاً "المقطع 1 : الأعداد الطبيعية والأعداد العشرية"
  number: number; // رقم المورد المعرفي أو رقم حصة الأعمال الموجهة أو رقم السلسلة
  title: string; // عنوان المورد / الدرس / الحصة / السلسلة / الملخص
  notes?: string; // ملاحظات وتوجيهات الأستاذ
  createdAt: string;
  images: LessonImage[];
  homeworkImages?: LessonImage[]; // صور الحل النموذجي للواجب المنزلي
  homeworkNotes?: string; // ملاحظات أو رقم تمارين الواجب المنزلي
  homeworkDueAt?: string; // آخر أجل لإنجاز الواجب (ISO)
  solutionPublishAt?: string; // لا يظهر الحل النموذجي للأولياء قبل هذا التاريخ (ISO)
  solutionLocked?: boolean; // يُضاف في الاستجابة العامة عندما يكون الحل محجوباً بعد
};

// حجب الحل النموذجي عن الأولياء والتلاميذ حتى انتهاء مهلة الواجب
export function hideUnpublishedSolution(lesson: Lesson, now = Date.now()): Lesson {
  if (lesson.solutionPublishAt && new Date(lesson.solutionPublishAt).getTime() > now) {
    return { ...lesson, homeworkImages: [], solutionLocked: true };
  }
  return lesson;
}

export type ParentSummons = {
  id: string;
  studentName: string; // اسم التلميذ
  className: string; // الفوج : مثلاً "1م3"
  notes?: string; // ملاحظة وتوجيه الأستاذ لولي الأمر
  isUrgent?: boolean; // توقيت إضافي: الأحد صباحاً
  createdAt: string;
};

export type HonorStudent = {
  id: string;
  studentName: string; // اسم التلميذ
  className: string; // القسم : "1 م 1" ، "1 م 2" ، "1 م 3" ، "2 م 3"
  notes?: string; // ملاحظة غير ضرورية (تميز في الفرض، كراس منظم، مواظبة...)
  badge?: string; // لقب تشجيعي اختياري (مثلاً: نجم الرياضيات ⭐، كراس نموذجي 📖)
  createdAt: string;
};

export const HONOR_CLASSES: readonly string[] = [];
export type HonorClass = string;

export const DEFAULT_CLASSES: readonly string[] = [];

export function getTeacherClasses(data?: LessonsData | null): string[] {
  if (data?.customClasses && Array.isArray(data.customClasses) && data.customClasses.length > 0) {
    return data.customClasses;
  }
  return [];
}

export type Penalty = {
  id: string;
  studentName: string; // اسم التلميذ
  className: string; // القسم : "1 م 1" ، "1 م 2" ، "1 م 3" ، "2 م 3"
  deduction: string; // مقدار الخصم أو العقوبة : مثلاً "ناقص 3 في التقويم المستمر (-3)"
  reason: string; // سبب العقوبة : مثلاً "هروب من الحصة يوم الثلاثاء"
  date?: string; // تاريخ الحادثة أو الخصم
  notes?: string; // ملاحظات أو توجيه إضافي من الأستاذ
  createdAt: string;
};

export type EvaluationRating = "excellent" | "very_good" | "good" | "medium" | "weak";
// التقييم اللفظي والألوان:
// ممتاز (أخضر داكن 🟢) = 18-20
// جيد جداً (أخضر 🟢) = 15-17
// جيد (أزرق/سماوي 🔵) = 12-14
// متوسط (برتقالي 🟡) = 10-11
// ضعيف (أحمر 🔴) = أقل من 10

export type StudentEvaluation = {
  id: string;
  studentName: string; // اسم التلميذ
  className: string; // القسم : "1 م 1" ، "1 م 2" ، "1 م 3" ، "2 م 3"
  groupName: "فوج 1" | "فوج 2" | "القسم كامل"; // الفوج في حصة التفويج (أعمال موجهة)
  // 1. كراس الدروس والأعمال الموجهة (5 نقاط)
  notebookScore: number; // 0 إلى 5
  notebookComplete?: boolean; // كراس كامل دون نقص دروس
  // 2. الواجبات المنزلية (5 نقاط)
  homeworkScore: number; // 0 إلى 5
  homeworkDone?: boolean; // واجب كراس المحاولات منجز
  // 3. السلوك والانضباط وإحضار الأدوات والكتاب (5 نقاط)
  toolsScore: number; // 0 إلى 5
  hasTools?: boolean; // إحضار الأدوات الهندسية والكتاب
  // 4. حل النشاط والمشاركة الفعالة (5 نقاط)
  activityScore: number; // 0 إلى 5
  // المجموع الإجمالي التلقائي من 20
  totalScore: number; // 0 إلى 20
  rating: EvaluationRating; // التقدير اللفظي
  ratingColor: "green" | "emerald" | "amber" | "rose"; // شارة اللون السريعة
  notes?: string; // ملاحظة الأستاذ (مثلاً: استدراك درس سابق، كراس نموذجي...)
  updatedAt: string;
};

export type InspectionRecord = {
  studentName: string;
  lessonsDone: number; // عدد الدروس المكتوبة (مثلاً 8 من 8)
  homeworksDone: number; // عدد الواجبات المنجزة (مثلاً 8 من 8)
  behaviorScore: number; // علامة السلوك والأدوات (من 5)
  activityScore: number; // علامة حل النشاط والمشاركة (من 5)
  score: number; // علامة هذه المراقبة من 20 (تحسب تلقائياً)
  notes?: string; // ملاحظة سريعة للتلميذ
};

export type InspectionSession = {
  id: string;
  sessionNumber: number; // 1, 2, 3...
  title?: string; // مثلاً: المراقبة الأولى (الدروس 1 إلى 8)
  date: string; // اليوم والتاريخ : مثلاً "الأربعاء 09 أكتوبر 2026"
  className: string; // القسم : "1 م 1" ، "1 م 2" ، "1 م 3" ، "2 م 3"
  groupName: "فوج 1" | "فوج 2" | "القسم كامل"; // الفوج المعني
  lessonRange: string; // مجال الدروس: مثلاً "الدروس من 1 إلى 8"
  totalLessons: number; // عدد الدروس المقررة للمراقبة (مثلاً 8)
  totalHomeworks: number; // عدد الواجبات المقررة للمراقبة (مثلاً 8)
  records: Record<string, InspectionRecord>; // سجلات التلاميذ (مفتاحها اسم التلميذ)
  createdAt: string;
  updatedAt: string;
};

export type StudentRosterItem = {
  id: string;
  studentName: string;
  className: string;
  groupName?: "فوج 1" | "فوج 2" | "القسم كامل" | string;
  registrationNumber?: string;
  parentPhone?: string;
  birthDate?: string;
  gender?: "ذكر" | "أنثى";
  notes?: string;
  createdAt?: string;
};

export type DailyDiaryEntry = {
  id: string;
  date: string;               // تاريخ الحصة: YYYY-MM-DD
  day: string;                // يوم الحصة: الأحد، الإثنين...
  periodTime?: string;        // التوقيت: 08:00 - 09:00
  className: string;          // الفوج: 1م3
  subject?: string;           // المادة: رياضيات، فيزياء...
  field?: string;             // الميدان (أنشطة عددية...)
  section?: string;           // المقطع التعلمي
  lessonTitle: string;        // عنوان المورد / الحصة
  objectives?: string;        // مؤشرات الكفاءة والأهداف التعلمية
  activities?: string;        // سير الأنشطة ومراحل الدرس
  homework?: string;          // الواجب المنزلي
  notes?: string;             // ملاحظات التقويم والمعالجة البيداغوجية
  isPublicForParents?: boolean; // هل يظهر عنوان الدرس للولي في صفحته
  createdAt: string;
};

export type AnnouncementCategory = "absence" | "lesson" | "update" | "general" | "urgent";

export type Announcement = {
  id: string;
  title: string; // عنوان الإعلان (مثلاً: تنبيه غياب، رفع حل واجب، ملاحظة...)
  content: string; // نص الإعلان والتفاصيل
  category: AnnouncementCategory; // نوع الإعلان (absence: غياب، lesson: دروس/واجبات، update: تحديث، general: عام، urgent: عاجل)
  date: string; // تاريخ الإعلان أو اليوم المعني
  pinned?: boolean; // هل الإعلان مثبت في الأعلى
  active?: boolean; // هل الإعلان ظاهر للزوار
  createdAt: string;
};

export type MessageCategory = "question" | "suggestion" | "criticism" | "other";

export type AnonymousMessage = {
  id: string;
  category: MessageCategory; // تصنيف الرسالة (سؤال ❓، اقتراح 💡، نقد بنّاء ⚖️، أخرى 💬)
  targetLevel?: string; // اختياري: "1 متوسط" | "2 متوسط" | "ولي أمر" | "غير محدد"
  content: string; // نص الرسالة بسرية تامة
  createdAt: string;
  read?: boolean; // هل تمت قراءتها من الأستاذ
};

export type TeacherFeatureFlags = {
  boardLessons?: boolean;          // كراس القسم وصور السبورة
  homework?: boolean;              // الواجبات والأنشطة المنزلية
  continuousAssessment?: boolean;  // دفتر نقاط وميثاق التقويم المستمر
  honors?: boolean;                // لوحة الشرف والمتفوقين
  reception?: boolean;             // مواعيد واستدعاءات الأولياء
  announcements?: boolean;         // الإعلانات المدرسية
  messages?: boolean;              // صندوق الرسائل المجهولة
  penalties?: boolean;             // سجل الملاحظات والخصومات
  inspectorSync?: boolean;         // الربط مع المفتشية البيداغوجية
  students?: boolean;              // إدارة الأفواج والتلاميذ
  timetable?: boolean;             // التوقيت الأسبوعي
  diary?: boolean;                 // الدفتر اليومي (ماذا سأدرس غداً)
  forum?: boolean;                 // ملتقى الأساتذة البيداغوجي
};

export const DEFAULT_FEATURE_FLAGS: TeacherFeatureFlags = {
  boardLessons: true,
  homework: true,
  continuousAssessment: true,
  honors: true,
  reception: true,
  announcements: true,
  messages: true,
  penalties: true,
  inspectorSync: true,
  students: true,
  timetable: true,
  diary: true,
  forum: true,
};

export const MIDDLE_SCHOOL_SUBJECTS = [
  { id: "mathematics", name: "الرياضيات", icon: "📐", codePrefix: "MTH" },
  { id: "physics", name: "العلوم الفيزيائية والتكنولوجيا", icon: "⚛️", codePrefix: "PHY" },
  { id: "science", name: "علوم الطبيعة والحياة", icon: "🔬", codePrefix: "SCI" },
  { id: "arabic", name: "اللغة العربية وآدابها", icon: "📖", codePrefix: "ARA" },
  { id: "french", name: "اللغة الفرنسية", icon: "🇫🇷", codePrefix: "FRN" },
  { id: "english", name: "اللغة الإنجليزية", icon: "🇬🇧", codePrefix: "ENG" },
  { id: "history_geo", name: "التاريخ والجغرافيا", icon: "🗺️", codePrefix: "HIS" },
  { id: "islamic", name: "التربية الإسلامية", icon: "🕌", codePrefix: "ISL" },
  { id: "civics", name: "التربية المدنية", icon: "⚖️", codePrefix: "CIV" },
  { id: "pe", name: "التربية البدنية والرياضية", icon: "🏃", codePrefix: "EPS" },
] as const;

export type SubjectId = (typeof MIDDLE_SCHOOL_SUBJECTS)[number]["id"];

export type LessonsData = {
  lessons: Lesson[];
  summons?: ParentSummons[];
  honors?: HonorStudent[];
  penalties?: Penalty[];
  evaluations?: StudentEvaluation[];
  inspectionSessions?: InspectionSession[];
  studentRoster?: StudentRosterItem[];
  announcements?: Announcement[];
  anonymousMessages?: AnonymousMessage[];
  featureFlags?: TeacherFeatureFlags;
  subject?: SubjectId | string;
  customClasses?: string[];
  timetable?: TeacherTimetable;
  diaryEntries?: DailyDiaryEntry[];
};

export const LEVELS = {
  1: { label: "السنة الأولى متوسط", short: "1 متوسط" },
  2: { label: "السنة الثانية متوسط", short: "2 متوسط" },
  3: { label: "السنة الثالثة متوسط", short: "3 متوسط" },
  4: { label: "السنة الرابعة متوسط", short: "4 متوسط" },
} as const;

// ==========================================
// نماذج المنصة الرقمية لولاية الوادي (Wilaya Types)
// ==========================================

export interface District {
  id: number;
  number: number; // 1 إلى 5
  name: string; // مثال: المقاطعة التفتيشية الأولى (الوادي 1)
  description?: string;
  inspectorName?: string;
}

export interface MiddleSchool {
  id: string;
  districtId: number;
  name: string;
  commune: string;
}

export type UserRole = "teacher" | "inspector" | "admin";

// بطاقة الاستقبال الرسمية للأستاذ (يعدلها من صفحة الإعدادات)
export interface ReceptionInfo {
  officialDay?: string;
  officialTime?: string;
  extraDay?: string;
  extraTime?: string;
  location?: string;
  guidance?: string;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name?: string;
  fullName?: string;
  district_id?: number;
  districtId?: number;
  middle_school_id?: string;
  middleSchoolId?: string;
  school_custom_name?: string;
  schoolCustomName?: string;
  teacher_code?: string;
  teacherCode?: string;
  slug?: string;
  levels_taught?: (1 | 2 | 3 | 4)[];
  levelsTaught?: (1 | 2 | 3 | 4)[];
  avatar_url?: string;
  avatarUrl?: string;
  bio?: string;
  is_verified?: boolean;
  isVerified?: boolean;
  reception?: ReceptionInfo | null;
  subject?: string;
  feature_flags?: TeacherFeatureFlags;
  terms_accepted_at?: string;
  created_at?: string;
  createdAt?: string;
}

export interface PedagogicalNote {
  id: string;
  teacher_id?: string;
  teacherId?: string;
  district_id?: number;
  districtId?: number;
  level: 1 | 2 | 3 | 4;
  semester: 1 | 2 | 3;
  lesson_title?: string;
  lessonTitle?: string;
  file_path?: string;
  filePath?: string;
  file_name?: string;
  fileName?: string;
  teacher_notes?: string;
  teacherNotes?: string;
  inspector_feedback?: string;
  inspectorFeedback?: string;
  reviewed_at?: string;
  reviewedAt?: string;
  status: "submitted" | "reviewed" | "needs_revision";
  doc_type?: PedagogicalDocType;
  field?: string | null;
  section?: string | null;
  session_number?: number | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

// أنواع وثائق الملف البيداغوجي (بين الأستاذ والمفتش)
export type PedagogicalDocType = "lesson_plan" | "annual_distribution" | "cahier_textes" | "diagnostic" | "other";

export const PEDAGOGICAL_DOC_TYPES: Record<PedagogicalDocType, { label: string; icon: string }> = {
  lesson_plan: { label: "مذكرة حصة", icon: "📝" },
  annual_distribution: { label: "التوزيع السنوي وتدرج التعلمات", icon: "🗓️" },
  cahier_textes: { label: "دفتر النصوص", icon: "📒" },
  diagnostic: { label: "نتائج التقويم التشخيصي", icon: "📊" },
  other: { label: "وثيقة أخرى", icon: "📎" },
};

export const NOTE_STATUS: Record<PedagogicalNote["status"], { label: string; className: string }> = {
  submitted: { label: "قيد المراجعة", className: "bg-amber-50 text-amber-800 border-amber-200" },
  reviewed: { label: "تمت المعاينة ✅", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  needs_revision: { label: "تحتاج تعديلاً", className: "bg-red-50 text-red-700 border-red-200" },
};

// جدول التوقيت الأسبوعي
export const SCHOOL_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"] as const;

export interface TimetableSlot {
  day: (typeof SCHOOL_DAYS)[number];
  start: string; // "08:00"
  end: string; // "09:00"
  className: string; // "2م1"
  room?: string; // "04"
}

export interface TeacherTimetable {
  teacher_id: string;
  slots: TimetableSlot[];
  image_path?: string | null;
  updated_at?: string;
}

export const CIRCULAR_IMPORTANCE: Record<InspectorCircular["importance"], { label: string; className: string }> = {
  urgent: { label: "عاجل", className: "bg-red-50 text-red-700 border-red-200" },
  seminar: { label: "ندوة تكوينية", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  normal: { label: "عادي", className: "bg-slate-50 text-slate-600 border-slate-200" },
};

export interface InspectorCircular {
  id: string;
  inspector_id?: string;
  inspectorId?: string;
  district_id?: number | null; // null = منشور ولائي من المشرف لكل المقاطعات
  districtId?: number;
  target_school_id?: string;
  targetSchoolId?: string;
  target_teacher_id?: string;
  targetTeacherId?: string;
  title: string;
  content: string;
  attachment_path?: string;
  attachmentPath?: string;
  importance: "normal" | "urgent" | "seminar";
  event_date?: string | null; // تاريخ الندوة / الملتقى
  event_place?: string | null; // المتوسطة المستقبلة
  created_at?: string;
  createdAt?: string;
  readCount?: number;
}

export const NOTEBOOKS = {
  lessons: {
    id: "lessons" as NotebookType,
    title: "كراس الدروس",
    subtitle: "192 صفحة • الميادين، المقاطع وحلول الواجبات",
    short: "كراس الدروس",
    icon: "📘",
  },
  directed_work: {
    id: "directed_work" as NotebookType,
    title: "الأعمال الموجهة",
    subtitle: "96 صفحة • حصص التفويج وتطبيقات القسم",
    short: "الأعمال الموجهة",
    icon: "📗",
  },
  worksheets: {
    id: "worksheets" as NotebookType,
    title: "سلاسل التمارين",
    subtitle: "سلاسل التمارين، الواجبات الورقية والحلول",
    short: "سلاسل التمارين",
    icon: "📑",
  },
  summaries: {
    id: "summaries" as NotebookType,
    title: "الملخصات والمطويات",
    subtitle: "ملخصات القواعد، بطاقات القوانين ومراجعة الاختبارات",
    short: "الملخصات",
    icon: "📌",
  },
} as const;

export const COMMON_FIELDS = [
  "أنشطة عددية",
  "أنشطة هندسية",
  "تنظيم معطيات",
] as const;

export const RECEPTION_INFO = {
  officialDay: "",
  officialTime: "",
  extraDay: "",
  extraTime: "",
  extraNote: "",
  location: "",
  motto: "أود استقبالكم لمتابعة مستوى أبنائكم ومعالجة النقائص في الوقت المناسب لصالح التلميذ.",
} as const;
