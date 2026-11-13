import { OfficialGradeRecord, StudentRosterItem } from "@/lib/types";

export type EvaluationType = "test1" | "test2" | "exam" | "continuous" | "termAverage";

export const EVALUATION_LABELS: Record<EvaluationType, string> = {
  test1: "الفرض الأول",
  test2: "الفرض الثاني",
  exam: "الاختبار الفصلي",
  continuous: "التقويم المستمر",
  termAverage: "المعدل الفصلي",
};

export interface ScoredStudent {
  name: string;
  score: number;
  gender: "ذكر" | "أنثى";
  className: string;
  groupName?: string;
}

export interface EvaluationStats {
  className: string;
  evalType: EvaluationType;
  trimester: 1 | 2 | 3;
  totalStudents: number;
  gradedCount: number;
  average: number;
  passRate: number; // >= 10
  failRate: number; // < 10
  highestScore?: number;
  lowestScore?: number;

  // الشرائح الأربعة
  above15: ScoredStudent[]; // >= 15
  between10and15: ScoredStudent[]; // >= 10 && < 15
  between5and10: ScoredStudent[]; // >= 5 && < 10
  under5: ScoredStudent[]; // < 5

  above15Pct: number;
  between10and15Pct: number;
  between5and10Pct: number;
  under5Pct: number;
  under10Pct: number;
  above10Pct: number;

  // إحصائيات الجنس
  maleCount: number;
  femaleCount: number;
  maleAvg: number;
  femaleAvg: number;
  malePassRate: number;
  femalePassRate: number;
  males: ScoredStudent[];
  females: ScoredStudent[];

  // كل التلاميذ المرصودين مرتبين تنازلياً
  allScored: ScoredStudent[];
}

// قائمة الأسماء المؤنثة الشائعة في الجزائر
const FEMALE_NAMES = new Set([
  "فاطمة", "مريم", "خديجة", "عائشة", "إكرام", "آية", "أسماء", "أمينة", "إيناس", "هاجر",
  "دعاء", "شيماء", "بشرى", "منى", "نهى", "هدى", "ريان", "رانيا", "ريتاج", "سارة",
  "سندس", "وفاء", "وسام", "نادية", "نوال", "كريمة", "حسيبة", "لينة", "لينا", "جيهان",
  "سلسبيل", "تسنيم", "مرام", "مرجانة", "ياسمين", "بثينة", "صابرين", "إيمان", "نور", "أنفال",
  "منال", "إلهام", "أميرة", "سليمة", "فتيحة", "جميلة", "حنان", "سميرة", "لطيفة", "زهراء",
  "صفاء", "مروة", "جهينة", "روان", "سيرين", "إسراء", "أروى", "رحاب", "رحمة", "كوثر",
  "شهد", "خلود", "سلوى", "نجاة", "يمينة", "وردة", "راضية", "مليكة", "حكيمة", "فتيحة"
]);

export function detectStudentGender(name: string, explicitGender?: "ذكر" | "أنثى" | string): "ذكر" | "أنثى" {
  if (explicitGender === "ذكر" || explicitGender === "أنثى") {
    return explicitGender;
  }
  const clean = name.trim();
  const parts = clean.split(/\s+/);
  // فحص الاسم الأول أو الاسم الأخير
  for (const part of parts) {
    if (FEMALE_NAMES.has(part)) return "أنثى";
  }
  const firstName = parts[0] || clean;
  if (
    firstName.endsWith("ة") ||
    firstName.endsWith("اء") ||
    firstName.endsWith("ى") ||
    firstName.endsWith("ية")
  ) {
    // استثناءات مثل: حمزة، طلحة، أسامة، عنترة، زكرياء، مصطفى، عيسى، موسى، يحيى
    const maleExceptions = ["حمزة", "طلحة", "أسامة", "عنترة", "زكرياء", "زكريا", "مصطفى", "عيسى", "موسى", "يحيى", "رضا", "علا"];
    if (maleExceptions.includes(firstName)) return "ذكر";
    return "أنثى";
  }
  return "ذكر";
}

export function computeTermAverage(rec: OfficialGradeRecord): number | undefined {
  const continuous = rec.continuousScore ?? 20;
  const test = rec.test1Score;
  const exam = rec.examScore;

  if (test !== undefined && exam !== undefined) {
    const monitoring = (continuous + test) / 2;
    return Math.round(((monitoring + 2 * exam) / 3) * 100) / 100;
  }
  // إذا لم يُرصد الاختبار لكن رُصد الفرض
  if (test !== undefined && exam === undefined) {
    return Math.round(((continuous + test) / 2) * 100) / 100;
  }
  return undefined;
}

export function getStudentScore(rec: OfficialGradeRecord, evalType: EvaluationType): number | undefined {
  switch (evalType) {
    case "test1":
      return rec.test1Score;
    case "test2":
      return rec.test2Score;
    case "exam":
      return rec.examScore;
    case "continuous":
      return rec.continuousScore;
    case "termAverage":
      return computeTermAverage(rec);
    default:
      return undefined;
  }
}

export function calculateClassStats(
  className: string,
  evalType: EvaluationType,
  trimester: 1 | 2 | 3,
  records: Record<string, OfficialGradeRecord>,
  roster: StudentRosterItem[]
): EvaluationStats {
  // تصفية تلاميذ هذا القسم
  const classStudents = roster.filter((s) => s.className === className);

  const scored: ScoredStudent[] = [];

  classStudents.forEach((st) => {
    const key = `${className}_${st.studentName}_T${trimester}`;
    const rec = records[key];
    if (!rec) return;

    const score = getStudentScore(rec, evalType);
    if (score !== undefined && score !== null && !isNaN(score)) {
      scored.push({
        name: st.studentName,
        score,
        gender: detectStudentGender(st.studentName, st.gender),
        className,
        groupName: st.groupName,
      });
    }
  });

  // ترتيب تنازلي حسب العلامة
  scored.sort((a, b) => b.score - a.score);

  const gradedCount = scored.length;
  const totalStudents = classStudents.length || gradedCount;

  if (gradedCount === 0) {
    return {
      className,
      evalType,
      trimester,
      totalStudents,
      gradedCount: 0,
      average: 0,
      passRate: 0,
      failRate: 0,
      above15: [],
      between10and15: [],
      between5and10: [],
      under5: [],
      above15Pct: 0,
      between10and15Pct: 0,
      between5and10Pct: 0,
      under5Pct: 0,
      under10Pct: 0,
      above10Pct: 0,
      maleCount: 0,
      femaleCount: 0,
      maleAvg: 0,
      femaleAvg: 0,
      malePassRate: 0,
      femalePassRate: 0,
      males: [],
      females: [],
      allScored: [],
    };
  }

  const sum = scored.reduce((acc, s) => acc + s.score, 0);
  const average = Math.round((sum / gradedCount) * 100) / 100;
  const highestScore = scored[0].score;
  const lowestScore = scored[scored.length - 1].score;

  const above15 = scored.filter((s) => s.score >= 15);
  const between10and15 = scored.filter((s) => s.score >= 10 && s.score < 15);
  const between5and10 = scored.filter((s) => s.score >= 5 && s.score < 10);
  const under5 = scored.filter((s) => s.score < 5);

  const above15Pct = Math.round((above15.length / gradedCount) * 100);
  const between10and15Pct = Math.round((between10and15.length / gradedCount) * 100);
  const between5and10Pct = Math.round((between5and10.length / gradedCount) * 100);
  const under5Pct = Math.round((under5.length / gradedCount) * 100);

  const passCount = scored.filter((s) => s.score >= 10).length;
  const passRate = Math.round((passCount / gradedCount) * 100);
  const failRate = 100 - passRate;

  // إحصائيات الجنسين
  const males = scored.filter((s) => s.gender === "ذكر");
  const females = scored.filter((s) => s.gender === "أنثى");

  const maleSum = males.reduce((acc, s) => acc + s.score, 0);
  const maleAvg = males.length > 0 ? Math.round((maleSum / males.length) * 100) / 100 : 0;
  const malePassCount = males.filter((s) => s.score >= 10).length;
  const malePassRate = males.length > 0 ? Math.round((malePassCount / males.length) * 100) : 0;

  const femaleSum = females.reduce((acc, s) => acc + s.score, 0);
  const femaleAvg = females.length > 0 ? Math.round((femaleSum / females.length) * 100) / 100 : 0;
  const femalePassCount = females.filter((s) => s.score >= 10).length;
  const femalePassRate = females.length > 0 ? Math.round((femalePassCount / females.length) * 100) : 0;

  return {
    className,
    evalType,
    trimester,
    totalStudents,
    gradedCount,
    average,
    passRate,
    failRate,
    highestScore,
    lowestScore,
    above15,
    between10and15,
    between5and10,
    under5,
    above15Pct,
    between10and15Pct,
    between5and10Pct,
    under5Pct,
    under10Pct: between5and10Pct + under5Pct,
    above10Pct: above15Pct + between10and15Pct,
    maleCount: males.length,
    femaleCount: females.length,
    maleAvg,
    femaleAvg,
    malePassRate,
    femalePassRate,
    males,
    females,
    allScored: scored,
  };
}
