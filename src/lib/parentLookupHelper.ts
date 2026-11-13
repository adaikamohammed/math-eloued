import {
  StudentRosterItem,
  OfficialGradeRecord,
  ContinuousEvalConfig,
} from "@/lib/types";

export interface StudentTrimesterGradeSummary {
  trimester: 1 | 2 | 3;
  // علامات الامتحانات
  test1Score?: number;
  test2Score?: number;
  examScore?: number;
  continuousScore?: number;
  termAverage?: number;
  monitoringAverage?: number;
  // الترتيب
  rank: number;
  totalStudents: number;
  classAvg: number;
  highestAvg: number;
  lowestAvg: number;
  appreciation: string;
  // تفاصيل التقويم المستمر
  behaviorScore?: number;
  notebook1Score?: number;
  notebook2Score?: number;
  homework1Score?: number;
  homework2Score?: number;
  quiz1Score?: number;
  quiz2Score?: number;
  bonusPoints?: number;
  notes?: string;
  customScores?: Record<string, number>;
}

export interface ParentStudentReport {
  id: string;
  studentName: string;
  className: string;
  groupName?: string;
  birthDate: string; // YYYY-MM-DD
  gender?: "ذكر" | "أنثى";
  registrationNumber?: string;
  parentPhone?: string;
  teacherName?: string;
  subjectName?: string;
  schoolName?: string;
  trimesters: Record<number, StudentTrimesterGradeSummary>;
  activeTrimester: 1 | 2 | 3;
  updatedAt?: string;
}

export function computeAppreciation(avg?: number): string {
  if (avg === undefined || avg === null || isNaN(avg)) return "قيد الرصد والتقييم";
  if (avg >= 18) return "ممتاز جداً مع لوحة الشرف 🌟";
  if (avg >= 15) return "ممتاز، تهانينا ومزيداً من التألق 👏";
  if (avg >= 14) return "جيد جداً، واصل اجتهادك 🟢";
  if (avg >= 12) return "حسن، نتائج مشرفة 💪";
  if (avg >= 10) return "مقبول، عليك مضاعفة الجهد 📝";
  if (avg >= 8) return "قريب من المعدل، يحتاج إلى دعم ومراجعة ⚠️";
  return "ضعيف، يحتاج لمعالجة بيداغوجية عاجلة ومتابعة من الولي ❌";
}

/**
 * بناء فهرس تقارير الأولياء المفهرس بتاريخ الميلاد
 */
export function buildParentGradebookLookup(
  roster: StudentRosterItem[],
  records: OfficialGradeRecord[] | Record<string, OfficialGradeRecord>,
  options?: {
    teacherName?: string;
    subjectName?: string;
    schoolName?: string;
    continuousConfigs?: Record<string, ContinuousEvalConfig>;
  }
): Record<string, ParentStudentReport[]> {
  const recordsList: OfficialGradeRecord[] = Array.isArray(records)
    ? records
    : Object.values(records || {});

  // تحويل السجلات إلى قاموس لتسهيل الاسترجاع
  const recordsMap: Record<string, OfficialGradeRecord> = {};
  recordsList.forEach((r) => {
    recordsMap[`${r.className}_${r.studentName}_T${r.trimester}`] = r;
  });

  // تجميع التلاميذ حسب القسم
  const classStudentsMap: Record<string, StudentRosterItem[]> = {};
  roster.forEach((s) => {
    if (!classStudentsMap[s.className]) classStudentsMap[s.className] = [];
    classStudentsMap[s.className].push(s);
  });

  // حساب الترتيب والمعدل لكل قسم في كل فصل
  const classStatsMap: Record<
    string,
    Record<
      number,
      {
        studentRankMap: Record<string, number>;
        studentAvgMap: Record<string, number | undefined>;
        classAvg: number;
        highestAvg: number;
        lowestAvg: number;
        totalGraded: number;
      }
    >
  > = {};

  Object.entries(classStudentsMap).forEach(([className, studentsInClass]) => {
    classStatsMap[className] = {};

    [1, 2, 3].forEach((trim) => {
      const studentAvgs: { name: string; avg: number; hasValidScore: boolean }[] = [];

      studentsInClass.forEach((st) => {
        const key = `${className}_${st.studentName}_T${trim}`;
        const rec = recordsMap[key];
        let avg: number | undefined;

        if (rec) {
          const continuous = rec.continuousScore ?? 20;
          const test = rec.test1Score;
          const exam = rec.examScore;

          if (test !== undefined && exam !== undefined) {
            const monitoring = (continuous + test) / 2;
            avg = Math.round(((monitoring + 2 * exam) / 3) * 100) / 100;
          } else if (test !== undefined) {
            avg = Math.round(((continuous + test) / 2) * 100) / 100;
          } else if (rec.continuousScore !== undefined) {
            avg = rec.continuousScore;
          }
        }

        studentAvgs.push({
          name: st.studentName,
          avg: avg !== undefined ? avg : -1,
          hasValidScore: avg !== undefined,
        });
      });

      // ترتيب التلاميذ تنازلياً
      studentAvgs.sort((a, b) => b.avg - a.avg);

      const rankMap: Record<string, number> = {};
      const avgMap: Record<string, number | undefined> = {};
      let validSum = 0;
      let validCount = 0;
      let highest = -1;
      let lowest = 21;

      studentAvgs.forEach((item, index) => {
        rankMap[item.name] = index + 1;
        avgMap[item.name] = item.hasValidScore ? item.avg : undefined;
        if (item.hasValidScore) {
          validSum += item.avg;
          validCount++;
          if (item.avg > highest) highest = item.avg;
          if (item.avg < lowest) lowest = item.avg;
        }
      });

      classStatsMap[className][trim] = {
        studentRankMap: rankMap,
        studentAvgMap: avgMap,
        classAvg: validCount > 0 ? Math.round((validSum / validCount) * 100) / 100 : 0,
        highestAvg: highest >= 0 ? highest : 0,
        lowestAvg: lowest <= 20 ? lowest : 0,
        totalGraded: validCount,
      };
    });
  });

  // بناء القاموس المفهرس بتاريخ الميلاد (مثلاً: "2013-07-10")
  const lookup: Record<string, ParentStudentReport[]> = {};

  roster.forEach((st) => {
    const rawBirth = (st.birthDate || "").trim();
    if (!rawBirth) return;

    // تنظيف صيغة التاريخ للتأكد من مطابقة YYYY-MM-DD
    const normalizedBirth = rawBirth.replace(/\//g, "-").trim();

    const trimesters: Record<number, StudentTrimesterGradeSummary> = {};
    let latestActiveTrim: 1 | 2 | 3 = 1;

    [1, 2, 3].forEach((t) => {
      const trim = t as 1 | 2 | 3;
      const key = `${st.className}_${st.studentName}_T${trim}`;
      const rec = recordsMap[key];
      const stats = classStatsMap[st.className]?.[trim];

      const rank = stats?.studentRankMap?.[st.studentName] || 1;
      const totalStudents = classStudentsMap[st.className]?.length || 1;
      const studentAvg = stats?.studentAvgMap?.[st.studentName];

      let monitoringAvg: number | undefined;
      let termAvg: number | undefined;

      if (rec) {
        const cont = rec.continuousScore ?? 20;
        const t1 = rec.test1Score;
        const ex = rec.examScore;

        if (t1 !== undefined) {
          monitoringAvg = Math.round(((cont + t1) / 2) * 100) / 100;
        }
        if (t1 !== undefined && ex !== undefined) {
          termAvg = Math.round(((((cont + t1) / 2) + 2 * ex) / 3) * 100) / 100;
          latestActiveTrim = trim;
        } else if (t1 !== undefined) {
          latestActiveTrim = trim;
        }
      }

      trimesters[trim] = {
        trimester: trim,
        test1Score: rec?.test1Score,
        test2Score: rec?.test2Score,
        examScore: rec?.examScore,
        continuousScore: rec?.continuousScore,
        termAverage: termAvg,
        monitoringAverage: monitoringAvg,
        rank,
        totalStudents,
        classAvg: stats?.classAvg || 0,
        highestAvg: stats?.highestAvg || 0,
        lowestAvg: stats?.lowestAvg || 0,
        appreciation: computeAppreciation(termAvg ?? studentAvg),
        behaviorScore: rec?.behaviorScore,
        notebook1Score: rec?.notebook1Score,
        notebook2Score: rec?.notebook2Score,
        homework1Score: rec?.homework1Score,
        homework2Score: rec?.homework2Score,
        quiz1Score: rec?.quiz1Score,
        quiz2Score: rec?.quiz2Score,
        bonusPoints: rec?.bonusPoints,
        notes: rec?.notes,
        customScores: rec?.customScores,
      };
    });

    const report: ParentStudentReport = {
      id: st.id,
      studentName: st.studentName,
      className: st.className,
      groupName: st.groupName,
      birthDate: normalizedBirth,
      gender: st.gender,
      registrationNumber: st.registrationNumber,
      parentPhone: st.parentPhone,
      teacherName: options?.teacherName || "الأستاذ",
      subjectName: options?.subjectName || "الرياضيات",
      schoolName: options?.schoolName || "المتوسطة",
      trimesters,
      activeTrimester: latestActiveTrim,
      updatedAt: new Date().toISOString(),
    };

    if (!lookup[normalizedBirth]) {
      lookup[normalizedBirth] = [];
    }
    lookup[normalizedBirth].push(report);
  });

  return lookup;
}
