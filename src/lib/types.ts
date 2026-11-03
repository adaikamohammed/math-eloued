export type NotebookType = "lessons" | "directed_work" | "worksheets" | "summaries" | string;

export type CustomNotebook = {
  id: string;
  label: string;
  icon?: string;
  canDelete?: boolean;
};

export type BoardNomenclature = {
  fieldLabel: string;   // تسمية الميدان / المجال / المحور
  sectionLabel: string; // تسمية المقطع / الوحدة / المركبة
  lessonLabel: string;  // تسمية عنوان الدرس / المورد
};

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
  accessCode?: string; // الرمز السري الخاص بالولي/التلميذ للاطلاع الشخصي (4 أرقام لمنع التشهير)
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

/**
 * دالة فرز وترتيب ذكية للأفواج التربوية حسب المستوى الدراسي ثم رقم الفوج:
 * 1م1، 1م2، 1م3، 2م1، 2م2، 2م3، 3م1...
 */
export function sortClasses(classes: string[]): string[] {
  if (!Array.isArray(classes)) return [];
  return [...classes].sort((a, b) => {
    const normalize = (str: string) => (str || "").trim().replace(/\s+/g, "");
    const cleanA = normalize(a);
    const cleanB = normalize(b);

    // مطابقة نمط: رقم ثم حروف ثم رقم (مثل 1م3 أو 1 م 3 أو 2AS1 أو 1ع2)
    const matchA = cleanA.match(/^(\d+)(.*?)(\d+)?$/);
    const matchB = cleanB.match(/^(\d+)(.*?)(\d+)?$/);

    if (matchA && matchB) {
      const levelA = parseInt(matchA[1], 10);
      const levelB = parseInt(matchB[1], 10);
      if (levelA !== levelB) {
        return levelA - levelB;
      }
      const midA = matchA[2] || "";
      const midB = matchB[2] || "";
      if (midA !== midB) {
        return midA.localeCompare(midB, "ar");
      }
      const numA = matchA[3] ? parseInt(matchA[3], 10) : 0;
      const numB = matchB[3] ? parseInt(matchB[3], 10) : 0;
      if (numA !== numB) {
        return numA - numB;
      }
    }

    return cleanA.localeCompare(cleanB, "ar", { numeric: true, sensitivity: "base" });
  });
}

export function getTeacherClasses(data?: LessonsData | null): string[] {
  if (data?.customClasses && Array.isArray(data.customClasses) && data.customClasses.length > 0) {
    return sortClasses(data.customClasses);
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
  // حقول الفروض والاختبار والتقويم المخصص
  test1Score?: number;
  test2Score?: number;
  examScore?: number;
  customScores?: Record<string, number>;
};

export interface EvaluationCriterion {
  id: string;
  name: string;
  maxScore: number;
  description?: string;
}

export interface ClassEvaluationSettings {
  testsCount: 1 | 2;
  coefficient: number;
  criteria: EvaluationCriterion[];
}


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
  isRepeater?: boolean; // معيد للسنة (نعم أو لا)
  notes?: string;
  createdAt?: string;
};

export type DiaryStage = {
  id?: string;
  label: string; // مثل "تمهيدي" أو "وسيطي" أو "نهائي" أو أي عنوان يكتبه الأستاذ
  content: string; // نص المحتوى وسيرورة الحصة
  color?: "sky" | "emerald" | "amber" | "purple" | "rose" | "indigo" | "gray"; // لون الشارة
};

export type SpecialDayType = "holiday" | "absence" | "seminar" | "exams" | "custom";

export type SpecialDayRecord = {
  id: string;
  date: string;               // YYYY-MM-DD
  endDate?: string;           // تاريخ نهاية العطلة إن كانت تمتد لعدة أيام (مثل عطلة الخريف)
  dayName: string;            // الأحد، الإثنين...
  type: SpecialDayType;       // holiday, absence, seminar, exams...
  title: string;              // مثل: "عطلة الخريف 2026", "غياب مبرر قانوناً لدى إدارة المؤسسة", "ندوة بيداغوجية لمقاطعة التفتيش"
  description?: string;       // تفاصيل وبيان العطلة أو محاور الندوة
  isOfficial?: boolean;       // عطلة رسمية عامة
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
  lessonNoteNumber?: string;  // رقم المذكرة أو الوثيقة (مثال: مذكرة رقم: 03، 01 تفويج، بطاقة دخول...)
  sessionType?: string;       // نوع الحصة: درس، أعمال موجهة، تقويم، إدماج، معالجة، استدراك، استقبال أولياء...
  concepts?: string;          // المحتوى والمفاهيم الأساسية المستهدفة
  stages?: DiaryStage[];      // سيرورة ومراحل الحصة (تمهيدي، وسيطي، نهائي، أو عناوين مخصصة)
  objectives?: string;        // مؤشرات الكفاءة والأهداف التعلمية
  activities?: string;        // سير الأنشطة ومراحل الدرس
  homework?: string;          // الواجب المنزلي
  notes?: string;             // ملاحظات التقويم والمعالجة البيداغوجية
  isPublicForParents?: boolean; // هل يظهر عنوان الدرس للولي في صفحته
  createdAt: string;
};

// تدوين دفتر النصوص الميداني الرسمي للقسم (Cahier de Textes de la classe)
export type CahierTextesEntry = {
  id: string;
  diaryEntryId?: string;      // معرف الحصة في الدفتر اليومي إن كانت مستوردة منه
  className: string;          // الفوج: 2م3
  date: string;               // YYYY-MM-DD
  dayName: string;            // الأحد، الإثنين...
  periodTime?: string;        // 11:00 - 12:00
  sessionType?: string;       // درس ومورد، أعمال موجهة، تقويم، إدماج...
  field?: string;             // الأنشطة العددية، الأنشطة الهندسية...
  section?: string;           // المقطع 01: الأعداد الطبيعية والأعداد العشرية...
  weekLabel?: string;         // الأسبوع 01: الدخول المدرسي وانطلاق المقطع 01 (21 - 25 سبتمبر 2026)
  resourceTitle: string;      // المورد 01: إجراء سلسلة عمليات دون أقواس
  warmup?: string;            // تهيئة (تذكير بقواعد الحساب، وضعية انطلاق...)
  proposedSituation?: string; // وضعية مقترحة (نشاط بناء التعلم...)
  summary?: string;           // الحوصلة (القاعدة أو القانون أو النتيجة...)
  reinvestment?: string;      // إعادة الاستثمار (تمرين صفي...)
  homework?: string;          // الواجب المنزلي (تمرين 02 و 04 ص 14)
  signature?: string;         // عدايكة ✍
  notes?: string;             // ملاحظات
  isTdOrRemediation?: boolean;// هل هي مخصصة لملحق الأعمال الموجهة TD أو الاستدراك
  subgroup?: string;          // القسم كامل، فوج 1، فوج 2...
  createdAt?: string;
  updatedAt?: string;
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

// أصناف استفسارات وتواصل الأولياء مع الأساتذة
export type InquiryCategory =
  | "grade"       // استفسار عن علامة / تقويم مستمر
  | "lesson"      // سؤال حول درس / تمرين / واجب منزلي
  | "behavior"    // سلوك وانضباط ومواظبة
  | "absence"     // تبرير غياب أو استفسار عنه
  | "appointment" // طلب موعد في الاستقبال الأسبوعي
  | "general";    // استفسار عام

// نموذج استفسار الولي المنظم
export type ParentInquiry = {
  id: string;              // معرّف فريد: inq_1730000000_abcd
  trackingCode: string;    // كود تتبع قصير أنيق للولي: مثلاً JSR-MTH-942
  secretToken: string;     // رمز حماية سري لضمان خصوصية الاستفسار ورد الأستاذ
  teacherId: string;       // معرّف الأستاذ المستهدف (UUID)
  teacherCode?: string;    // كود الأستاذ (مثل MTH-784)
  teacherName?: string;    // اسم الأستاذ
  subject?: string;        // مادة التدريس (رياضيات، لغة عربية...)
  parentName: string;      // اسم الولي (الأب / الأم / الولي)
  studentName: string;     // اسم التلميذ (الابن)
  studentGroup: string;    // الفوج / القسم (1م1، 1م2، 2م3...)
  parentPhone?: string;    // رقم هاتف الولي للتواصل أو إرسال الرد عبر واتساب (اختياري)
  category: InquiryCategory;
  content: string;         // نص السؤال أو الملاحظة
  createdAt: string;
  status: "pending" | "answered" | "closed";
  readByTeacher: boolean;
  reply?: {
    content: string;       // نص رد الأستاذ البيداغوجي
    repliedAt: string;
    teacherName?: string;
  };
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
  cahierTextes?: boolean;          // دفتر النصوص الميداني للقسم
  forum?: boolean;                 // ملتقى الأساتذة البيداغوجي
};

export const DEFAULT_FEATURE_FLAGS: TeacherFeatureFlags = {
  boardLessons: true,
  homework: true,
  continuousAssessment: true,
  honors: true,
  messages: true,
  inspectorSync: false, // معطل افتراضياً لمنع تشتيت الأستاذ والولي، ويمكن تفعيله بلمسة واحدة من الإعدادات
  students: true,
  timetable: true,
  diary: true,
  cahierTextes: true,
  forum: false, // معطل افتراضياً لمنع التشتيت
};

export const SUPER_ADMIN_EMAILS: readonly string[] = [
  "mohammedadaika104@gmail.com",
  "mohammed.adaika@univ-bba.dz",
  "adaikamohammed@gmail.com",
];

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (SUPER_ADMIN_EMAILS.includes(clean)) return true;
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPER_ADMIN_EMAILS) {
    const list = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS.toLowerCase().split(",").map((s) => s.trim());
    if (list.includes(clean)) return true;
  }
  return false;
}

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
  { id: "computer", name: "الإعلام الآلي والتكنولوجيا", icon: "💻", codePrefix: "INF" },
  { id: "art", name: "التربية التشكيلية / الموسيقية", icon: "🎨", codePrefix: "ART" },
  { id: "pe", name: "التربية البدنية والرياضية", icon: "🏃", codePrefix: "EPS" },
  { id: "amazigh", name: "اللغة الأمازيغية", icon: "ⵣ", codePrefix: "AMZ" },
] as const;

export type SubjectId = (typeof MIDDLE_SCHOOL_SUBJECTS)[number]["id"];

// معاملات المواد في مرحلة التعليم المتوسط الجزائرية المعتمدة رسمياً (1م، 2م، 3م، 4م)
export const OFFICIAL_SUBJECT_COEFFICIENTS: Record<string, Record<number, number>> = {
  mathematics: { 1: 2, 2: 3, 3: 3, 4: 4 },
  arabic: { 1: 2, 2: 3, 3: 3, 4: 5 },
  english: { 1: 1, 2: 3, 3: 3, 4: 3 },
  french: { 1: 1, 2: 2, 3: 2, 4: 3 },
  history_geo: { 1: 2, 2: 2, 3: 2, 4: 3 },
  science: { 1: 1, 2: 2, 3: 2, 4: 2 },
  physics: { 1: 1, 2: 2, 3: 2, 4: 2 },
  islamic: { 1: 1, 2: 1, 3: 1, 4: 2 },
  civics: { 1: 1, 2: 1, 3: 1, 4: 1 },
  computer: { 1: 1, 2: 1, 3: 1, 4: 1 },
  art: { 1: 1, 2: 1, 3: 1, 4: 1 },
  pe: { 1: 1, 2: 1, 3: 1, 4: 1 },
  amazigh: { 1: 2, 2: 2, 3: 2, 4: 2 },
};

// دالة ذكية لحساب معامل المادة حسب المستوى (مقاومة للقيم غير النصية والكائنات)
export function getOfficialSubjectCoefficient(subjectNameOrId: any, levelNum: number = 1): number {
  let str = "";
  if (typeof subjectNameOrId === "string") {
    str = subjectNameOrId;
  } else if (typeof subjectNameOrId === "object" && subjectNameOrId !== null) {
    str = subjectNameOrId.name || subjectNameOrId.id || subjectNameOrId.title || "";
  } else if (subjectNameOrId != null) {
    str = String(subjectNameOrId);
  }

  const norm = str.trim().toLowerCase();
  const found = MIDDLE_SCHOOL_SUBJECTS.find(
    (s) => s.id === norm || s.name.includes(norm) || (norm.length > 0 && norm.includes(s.name))
  );
  const subjId = found?.id || "mathematics";
  const map = OFFICIAL_SUBJECT_COEFFICIENTS[subjId];
  if (!map) return 2;
  const lvl = typeof levelNum === "number" && !isNaN(levelNum) ? levelNum : 1;
  return map[lvl] || map[1] || 2;
}

// استخراج رقم المستوى من اسم القسم (مثلاً: "1م1" -> 1، "2م3" -> 2)
export function getLevelFromClassName(className: any): number {
  if (!className) return 1;
  const str = typeof className === "string" ? className : String(className || "");
  const match = str.match(/([1-4])/);
  if (match) return parseInt(match[1], 10);
  return 1;
}

// معايير التقويم المستمر
export type ContinuousCriterion = {
  id: string;
  name: string;
  maxScore: number;
  icon?: string;
  description?: string;
};

export type ContinuousEvalRubricType = "official_ministerial" | "equal_four" | "custom";

export type ContinuousEvalConfig = {
  rubricType: ContinuousEvalRubricType;
  totalMax: number; // 20
  criteria: ContinuousCriterion[];
  allowBonusPoints: boolean;
};

// المعايير الوزارية الرسمية المعتمدة
export const OFFICIAL_MINISTERIAL_CRITERIA: ContinuousCriterion[] = [
  { id: "c_beh", name: "الانضباط والسلوك والمشاركة الصفية", maxScore: 4, icon: "🙋‍♂️", description: "الحضور المنتظم، إحضار الأدوات والكتاب، والمشاركة الإيجابية في بناء الدرس." },
  { id: "c_nb1", name: "كراس التلميذ: المقطع 1", maxScore: 2, icon: "📖", description: "نظافة الكراس واكتمال الدروس وتدوين الأنشطة." },
  { id: "c_nb2", name: "كراس التلميذ: المقطع 2", maxScore: 2, icon: "📖", description: "اكتمال الدروس وخلوه من البياض والاعتناء بالأشكال الهندسية." },
  { id: "c_hw1", name: "الوظائف المنزلية: وظيفة 1", maxScore: 2, icon: "📝", description: "تسليم الوظيفة في موعدها والجدية في المحاولات الفردية." },
  { id: "c_hw2", name: "الوظائف المنزلية: وظيفة 2", maxScore: 2, icon: "📝", description: "تسليم الوظيفة الثانية ومحاولات كراس المحاولات." },
  { id: "c_qz1", name: "الاستجواب الكتابي 1", maxScore: 4, icon: "✍️", description: "الاستجواب الكتابي السريع الأول خلال الفصل." },
  { id: "c_qz2", name: "الاستجواب الكتابي 2", maxScore: 4, icon: "✍️", description: "الاستجواب الكتابي السريع الثاني خلال الفصل." },
];

// معايير الأرباع المتساوية (4 × 5 = 20ن)
export const EQUAL_FOUR_CRITERIA: ContinuousCriterion[] = [
  { id: "c_beh", name: "السلوك والمواظبة والأدوات", maxScore: 5, icon: "📐", description: "الانضباط الصفي وإحضار الأدوات الهندسية والكتاب المدرسي." },
  { id: "c_nb", name: "كراس الدروس والمحاولات", maxScore: 5, icon: "📖", description: "اكتمال عناصر الدرس وخلوه من البياض ونظافة الخط وتصحيح التمارين." },
  { id: "c_hw", name: "الواجبات والأنشطة المنزلية", maxScore: 5, icon: "📝", description: "إنجاز الواجبات المنزلية والجدية في المحاولات الفردية وتجنب النقل." },
  { id: "c_act", name: "المشاركة والاستجوابات", maxScore: 5, icon: "🙋‍♂️", description: "المشاركة الفعالة في بناء الدرس على السبورة والاستجوابات الدورية." },
];

// سجل الرصد والتنقيط الفصلي الرسمي
export type OfficialGradeRecord = {
  id?: string;
  studentName: string;
  className: string;
  groupName?: string;
  trimester: 1 | 2 | 3;
  // علامة التقويم المستمر الإجمالية (من 20)
  continuousScore: number;
  // التفصيل البيداغوجي لعناصر التقويم (اختياري مرن):
  behaviorScore?: number;    // المشاركة والسلوك (من 4 أو 5)
  notebook1Score?: number;   // كراس التلميذ: مقطع 1 (من 2)
  notebook2Score?: number;   // كراس التلميذ: مقطع 2 (من 2)
  homework1Score?: number;   // وظيفة 1 (من 2)
  homework2Score?: number;   // وظيفة 2 (من 2)
  quiz1Score?: number;       // استجواب 1 (من 4)
  quiz2Score?: number;       // استجواب 2 (من 4)
  // رصيد الزيادة والنقصان الصفي أثناء الحصص (+ / -)
  bonusPoints?: number;
  // حالة الكراس والواجبات الميدانية
  notebookStatus?: "complete" | "incomplete" | "blank" | "missing";
  homeworkStatus?: "complete" | "partial" | "missing";
  // علامات المعايير المخصصة للأستاذ
  customScores?: Record<string, number>;
  // الفروض
  test1Score?: number;       // الفرض الأول (من 20)
  test2Score?: number;       // الفرض الثاني (اختياري، من 20)
  // الاختبار الفصلي
  examScore?: number;        // الاختبار الفصلي (من 20)
  // ملاحظات وتوجيهات الأستاذ
  notes?: string;
  updatedAt?: string;
};

export type LessonsData = {
  lessons: Lesson[];
  summons?: ParentSummons[];
  honors?: HonorStudent[];
  penalties?: Penalty[];
  evaluations?: StudentEvaluation[];
  gradebookRecords?: OfficialGradeRecord[]; // سجل التنقيط والتقويم المستمر الفصلي
  inspectionSessions?: InspectionSession[];
  studentRoster?: StudentRosterItem[];
  announcements?: Announcement[];
  anonymousMessages?: AnonymousMessage[];
  parentInquiries?: ParentInquiry[]; // استفسارات ومراسلات الأولياء المنظمة
  publicInquiries?: ParentInquiry[]; // الردود العامة الموجهة للأولياء للاطلاع بالكود السري
  featureFlags?: TeacherFeatureFlags;
  subject?: SubjectId | string;
  customClasses?: string[];
  timetable?: TeacherTimetable;
  diaryEntries?: DailyDiaryEntry[];
  cahierTextesEntries?: CahierTextesEntry[]; // تدوينات دفتر النصوص الميداني للقسم
  specialDays?: SpecialDayRecord[]; // أيام العطل والغيابات والندوات الرسمية
  diaryDayTitles?: Record<string, string>; // عنوان اليوم العام: تاريخ YYYY-MM-DD -> عنوان اليوم
  customNotebooks?: CustomNotebook[];
  boardNomenclature?: BoardNomenclature;
  evaluationSettings?: Record<string, ClassEvaluationSettings>;
  continuousEvalConfig?: Record<string, ContinuousEvalConfig>;
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

export type UserRole = "teacher" | "inspector" | "admin" | "principal";

// بطاقة الفرض الرسمي المعتمد من طرف إدارة المتوسطة (يلتزم به الأساتذة)
export interface SchoolExamItem {
  id: string;
  middleSchoolId?: string;
  level: 1 | 2 | 3 | 4; // 1م، 2م، 3م، 4م
  semester: 1 | 2 | 3;
  subjectId: string;
  subjectName: string;
  examTitle: string; // مثال: الفرض الأول المحروس
  date: string; // YYYY-MM-DD
  dayName: string; // الأحد، الإثنين...
  timeSlot: string; // 08:00 - 09:00
  room?: string; // قاعة 01
  notes?: string; // تعليمات الإدارة للأساتذة والتلاميذ
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// التأشيرة الإدارية للسيد مدير المتوسطة / الناظر على كراس القسم أو الدفتر اليومي
export interface PrincipalVisaRecord {
  id: string;
  teacherId: string;
  teacherName?: string;
  principalId?: string;
  principalName?: string;
  middleSchoolId?: string;
  visaDate: string; // YYYY-MM-DD
  visaType: "cahier_textes" | "cahier_journalier" | "general";
  feedbackNote?: string; // ملاحظات وتوجيهات السيد المدير/الناظر
  status: "approved" | "needs_attention";
  createdAt: string;
}

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
  email?: string;
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
  className: string; // "1م1" أو "استقبال الأولياء" أو "استدراك" أو "فراغ"
  subgroup?: "فوج 1" | "فوج 2" | "كامل القسم" | "القسم كامل" | string;
  sessionType?: "lesson" | "td" | "remedial" | "reception" | "free";
  weekRotation?: "all" | "week_a" | "week_b"; // دورية الأسبوع (كل أسبوع، أسبوع أ، أسبوع ب)
  room?: string; // "قاعة 04" (اختياري)
  remedialClasses?: string[]; // الأفواج المعنية بالاستدراك
  remedialStudents?: string[]; // أسماء التلاميذ المحددين للاستدراك
  notes?: string;
}

export interface TimetableSettings {
  orientation?: "days-as-rows" | "days-as-cols";
  morningStart?: string; // "08:00"
  morningSlotsCount?: number; // 4
  breakStart?: string; // "12:00"
  breakEnd?: string; // "13:00" أو "13:30"
  afternoonStart?: string; // "13:00" أو "13:30"
  afternoonSlotsCount?: number; // 3 أو 4
  tuesdayAfternoonOff?: boolean; // مساء الثلاثاء راحة رسمية
  colorMode?: "distinct" | "unified"; // نمط الألوان: مميز لكل فوج أو موحد
  schoolName?: string; // اسم المتوسطة للطباعة
  teacherName?: string; // اسم الأستاذ(ة) للطباعة
  inspectorName?: string; // اسم السيد المفتش
  principalName?: string; // اسم السيد المدير
  wilayaName?: string; // اسم الولاية (مثل: الوادي)
  subjectName?: string; // المادة (مثل: الرياضيات)
  classColors?: Record<string, string>; // ألوان مخصصة لكل فوج (معرف اللون من CLASS_PALETTE أو كود سداسي)
}

export interface TeacherTimetable {
  teacher_id: string;
  slots: TimetableSlot[];
  image_path?: string | null;
  settings?: TimetableSettings;
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
