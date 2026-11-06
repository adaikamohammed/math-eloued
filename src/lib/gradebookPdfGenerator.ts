import { OfficialGradeRecord, StudentRosterItem, getLevelFromClassName, getOfficialSubjectCoefficient } from "./types";

export interface GradebookPdfOptions {
  teacherName: string;
  schoolName: string;
  inspectorName?: string;
  principalName?: string;
  wilayaName?: string;
  subjectName?: string;
  className: string;
  coefficient?: number;
  trimester: 1 | 2 | 3;
  academicYear?: string;
  students: StudentRosterItem[];
  records: Record<string, OfficialGradeRecord>;
  includeCriteriaBreakdown?: boolean;
}

// حساب اسم الفصل بالعربية
function getTrimesterLabel(trimester: 1 | 2 | 3): string {
  if (trimester === 1) return "الفصل الأول";
  if (trimester === 2) return "الفصل الثاني";
  return "الفصل الثالث";
}

// حساب المستوى الدراسي من اسم الفوج (مثلاً: 1م1 -> السنة الأولى متوسط)
function getLevelLabel(className: string): string {
  const lvl = getLevelFromClassName(className);
  const labels: Record<number, string> = {
    1: "السنة الأولى متوسط",
    2: "السنة الثانية متوسط",
    3: "السنة الثالثة متوسط",
    4: "السنة الرابعة متوسط",
  };
  return labels[lvl] || "التعليم المتوسط";
}

/**
 * توليد كود HTML متكامل ومستقل لكراس التنقيط والتقويم المستمر الرسمي بمقاس A4 Landscape (أفقي 297mm × 210mm)
 * مطابق تماماً لسجل التنقيط والمتابعة البيداغوجية المعتمد رسمياً في رتبة أستاذ التعليم المتوسط للأستاذ محمد عدايكة
 */
export function generateGradebookHTML(options: GradebookPdfOptions): string {
  const teacher = options.teacherName || "الأستاذ(ة)";
  const school = options.schoolName || "المؤسسة التعليمية";
  const inspector = options.inspectorName || "السيد مفتش التعليم المتوسط";
  const principal = options.principalName || "السيد مدير المؤسسة";
  const wilaya = options.wilayaName || "الوادي";
  const subject = options.subjectName || "الرياضيات";
  const cls = options.className || "1م1";
  const levelLabel = getLevelLabel(cls);
  const trimesterNum = options.trimester || 1;
  const trimesterLabel = getTrimesterLabel(trimesterNum);
  const academicYear = options.academicYear || "2026 / 2027";
  const levelNum = getLevelFromClassName(cls);
  const coef = options.coefficient ?? getOfficialSubjectCoefficient(subject, levelNum);
  const includeBreakdown = Boolean(options.includeCriteriaBreakdown);

  // إعداد قائمة التلاميذ وسجلاتهم
  const sortedStudents = [...options.students].sort((a, b) =>
    a.studentName.localeCompare(b.studentName, "ar")
  );

  // حساب معدلات كل تلميذ
  interface ComputedRow {
    index: number;
    name: string;
    group: string;
    rec: OfficialGradeRecord;
    continuous: number;
    bScore: number;
    nb1: number;
    nb2: number;
    hw1: number;
    hw2: number;
    q1: number;
    q2: number;
    test1?: number;
    test2?: number;
    testAvg?: number;
    monitoringAvg?: number;
    exam?: number;
    subjectAvg?: number;
    weightedTotal?: number;
    notes: string;
  }

  const computedRows: ComputedRow[] = sortedStudents.map((st, idx) => {
    const rec = options.records[st.studentName] || {
      studentName: st.studentName,
      className: cls,
      trimester: trimesterNum,
      continuousScore: 20,
    };

    // عناصر التقويم المستمر
    const bScore = rec.behaviorScore ?? 4;
    const nb1 = rec.notebook1Score ?? 2;
    const nb2 = rec.notebook2Score ?? 2;
    const hw1 = rec.homework1Score ?? 2;
    const hw2 = rec.homework2Score ?? 2;
    const q1 = rec.quiz1Score ?? 4;
    const q2 = rec.quiz2Score ?? 4;
    const continuous = rec.continuousScore ?? (bScore + nb1 + nb2 + hw1 + hw2 + q1 + q2);

    // الفرض
    const test1 = rec.test1Score;
    const test2 = rec.test2Score;
    let testAvg: number | undefined = undefined;
    if (test1 !== undefined && test2 !== undefined) {
      testAvg = (test1 + test2) / 2;
    } else if (test1 !== undefined) {
      testAvg = test1;
    }

    // معدل المراقبة المستمرة = (التقويم + الفرض) ÷ 2
    let monitoringAvg: number | undefined = undefined;
    if (testAvg !== undefined) {
      monitoringAvg = (continuous + testAvg) / 2;
    }

    // الاختبار والمعدل الفصلي للمادة
    const exam = rec.examScore;
    let subjectAvg: number | undefined = undefined;
    let weightedTotal: number | undefined = undefined;
    if (monitoringAvg !== undefined && exam !== undefined) {
      subjectAvg = (monitoringAvg + 2 * exam) / 3;
      weightedTotal = subjectAvg * coef;
    }

    return {
      index: idx + 1,
      name: st.studentName,
      group: st.groupName || "فوج 1",
      rec,
      continuous,
      bScore,
      nb1,
      nb2,
      hw1,
      hw2,
      q1,
      q2,
      test1,
      test2,
      testAvg,
      monitoringAvg,
      exam,
      subjectAvg,
      weightedTotal,
      notes: rec.notes || "",
    };
  });

  // حساب الإحصائيات العامة للفوج
  const gradedRows = computedRows.filter((r) => r.subjectAvg !== undefined);
  const classAvg =
    gradedRows.length > 0
      ? gradedRows.reduce((acc, cur) => acc + (cur.subjectAvg || 0), 0) / gradedRows.length
      : undefined;
  const passCount = gradedRows.filter((r) => (r.subjectAvg || 0) >= 10).length;
  const passRate =
    gradedRows.length > 0 ? Math.round((passCount / gradedRows.length) * 100) : 0;

  // تقسيم التلاميذ لصفحات (23 تلميذاً في الصفحة الواحدة تماماً كما في الوثيقة الرسمية)
  const CHUNK_SIZE = 23;
  const pages: ComputedRow[][] = [];
  if (computedRows.length === 0) {
    pages.push([]);
  } else {
    for (let i = 0; i < computedRows.length; i += CHUNK_SIZE) {
      pages.push(computedRows.slice(i, i + CHUNK_SIZE));
    }
  }

  // بناء كود HTML لكل صفحة A4 Landscape
  const pagesHtml = pages
    .map((pageRows, pageIdx) => {
      const pageNum = pageIdx + 1;
      const totalPages = pages.length;
      const startNum = pageIdx * CHUNK_SIZE + 1;
      const endNum = Math.min((pageIdx + 1) * CHUNK_SIZE, computedRows.length);
      const isLastPage = pageNum === totalPages;

      // صفوف الجدول
      const tableRowsHtml = pageRows
        .map((row) => {
          const formattedContinuous = Number(row.continuous.toFixed(2));
          const formattedTest = row.test1 !== undefined ? row.test1.toFixed(2) : "-";
          const formattedMonitoring =
            row.monitoringAvg !== undefined ? row.monitoringAvg.toFixed(2) : "-";
          const formattedExam = row.exam !== undefined ? row.exam.toFixed(2) : "-";
          const formattedAvg =
            row.subjectAvg !== undefined ? row.subjectAvg.toFixed(2) : "-";
          const avgHighlightClass =
            row.subjectAvg !== undefined
              ? row.subjectAvg >= 10
                ? "font-black text-emerald-800"
                : "font-black text-rose-700"
              : "";

          return `
            <tr>
              <td class="col-num">${row.index < 10 ? "0" + row.index : row.index}</td>
              <td class="col-name">${row.name}</td>
              ${
                includeBreakdown
                  ? `
                <td class="col-metric">${row.bScore}</td>
                <td class="col-metric">${row.nb1}</td>
                <td class="col-metric">${row.nb2}</td>
                <td class="col-metric">${row.hw1}</td>
                <td class="col-metric">${row.hw2}</td>
                <td class="col-metric">${row.q1}</td>
                <td class="col-metric">${row.q2}</td>
              `
                  : ""
              }
              <td class="col-score font-bold">${formattedContinuous}</td>
              <td class="col-score">${formattedTest}</td>
              <td class="col-score bg-monitoring font-bold">${formattedMonitoring}</td>
              <td class="col-score">${formattedExam}</td>
              <td class="col-score bg-avg ${avgHighlightClass}">${formattedAvg}</td>
              <td class="col-notes">${row.notes || "&nbsp;"}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <div class="a4-page">
          <!-- ── الترويسة الرسمية ── -->
          <div class="official-header">
            <div class="republic-title">الجمهورية الجزائرية الديمقراطية الشعبية</div>
            <div class="ministry-title">
              وزارة التربية الوطنية • مديرية التربية لولاية ${wilaya} • ${school}
            </div>
            <div class="doc-main-title">
              سجل التنقيط والمتابعة البيداغوجية المستمرة
            </div>
            <div class="doc-subtitle">
              ${levelLabel} — الفوج التربوي: <strong>${cls}</strong> — ${trimesterLabel} (الموسم: ${academicYear}م)
            </div>
          </div>

          <!-- ── شريط المعلومات والسلم الوزاري ── -->
          <div class="scale-banner">
            <div class="scale-item">
              <span>أستاذ(ة) المادة:</span> <strong>${teacher}</strong>
            </div>
            <div class="scale-item">
              <span>مادة التدريس:</span> <strong>${subject}</strong>
            </div>
            <div class="scale-item">
              <span>المعامل:</span> <strong>×${coef}</strong>
            </div>
            <div class="scale-item">
              <span>حساب المعدل الفصلي:</span>
              <span class="formula">[ (التقويم + الفرض) ÷ 2 + (الاختبار × 2) ] ÷ 3</span>
            </div>
          </div>

          <!-- ── جدول التنقيط الرسمي ── -->
          <table class="gradebook-table">
            <thead>
              <tr>
                <th rowspan="${includeBreakdown ? "2" : "1"}" class="th-num">#</th>
                <th rowspan="${includeBreakdown ? "2" : "1"}" class="th-name">اللقب والاسم الكامل للتلميذ(ة)</th>
                ${
                  includeBreakdown
                    ? `
                  <th colspan="7" class="th-group-eval">المعايير البيداغوجية للتقويم المستمر (20ن)</th>
                `
                    : ""
                }
                <th rowspan="${includeBreakdown ? "2" : "1"}" class="th-eval">التقويم<br><small>(20ن)</small></th>
                <th rowspan="${includeBreakdown ? "2" : "1"}" class="th-test">الفرض<br><small>(20ن)</small></th>
                <th rowspan="${includeBreakdown ? "2" : "1"}" class="th-monitoring">م. المراقبة<br><small>(20ن)</small></th>
                <th rowspan="${includeBreakdown ? "2" : "1"}" class="th-exam">الاختبار<br><small>(20ن)</small></th>
                <th rowspan="${includeBreakdown ? "2" : "1"}" class="th-avg">المعدل الفصلي<br><small>(20 / 20)</small></th>
                <th rowspan="${includeBreakdown ? "2" : "1"}" class="th-notes">ملاحظات وتوجيهات الأستاذ</th>
              </tr>
              ${
                includeBreakdown
                  ? `
                <tr>
                  <th class="th-sub">سلوك<br><small>(4ن)</small></th>
                  <th class="th-sub">كراس1<br><small>(2ن)</small></th>
                  <th class="th-sub">كراس2<br><small>(2ن)</small></th>
                  <th class="th-sub">وظيفة1<br><small>(2ن)</small></th>
                  <th class="th-sub">وظيفة2<br><small>(2ن)</small></th>
                  <th class="th-sub">استجواب1<br><small>(4ن)</small></th>
                  <th class="th-sub">استجواب2<br><small>(4ن)</small></th>
                </tr>
              `
                  : ""
              }
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <!-- ── تذييل الصفحة والإحصائيات والتوقيعات ── -->
          <div class="page-footer">
            <div class="footer-stats">
              <span>الفوج: <strong>${cls}</strong></span>
              <span>• الطلبة: <strong>(${startNum} إلى ${endNum})</strong></span>
              <span>• صفحة <strong>${pageNum} من ${totalPages}</strong></span>
              ${
                isLastPage && classAvg !== undefined
                  ? `<span>• معدل الفوج العام: <strong class="badge-avg">${classAvg.toFixed(2)} / 20</strong></span>
                     <span>• نسبة الحاصلين على المعدل: <strong>${passRate}%</strong> (${passCount} / ${gradedRows.length})</span>`
                  : ""
              }
            </div>

            ${
              isLastPage
                ? `
              <div class="signatures-grid">
                <div class="sig-box">
                  <div class="sig-title">أستاذ(ة) المادة</div>
                  <div class="sig-name">${teacher}</div>
                  <div class="sig-stamp">الإمضاء والختم:</div>
                </div>
                <div class="sig-box">
                  <div class="sig-title">السيد مدير المتوسطة</div>
                  <div class="sig-name">${principal}</div>
                  <div class="sig-stamp">التأشيرة والتاريخ:</div>
                </div>
                <div class="sig-box">
                  <div class="sig-title">السيد مفتش المادة</div>
                  <div class="sig-name">${inspector}</div>
                  <div class="sig-stamp">الملاحظة والاعتماد:</div>
                </div>
              </div>
            `
                : `
              <div class="next-page-note">
                ← بقية الفوج التربوي في الصفحة الموالية (تأشيرات الإدارة والتفتيش في نهاية السجل)
              </div>
            `
            }
          </div>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>سجل التنقيط والتقويم المستمر الرسمي — ${cls} — ${subject}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 landscape;
      margin: 6mm 8mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Cairo', 'Tajawal', Tahoma, sans-serif;
      direction: rtl;
      text-align: right;
      color: #111827;
      background: #f3f4f6;
      font-size: 11px;
    }

    .a4-page {
      width: 283mm;
      min-height: 196mm;
      max-height: 196mm;
      margin: 0 auto 10mm auto;
      padding: 6mm 8mm;
      background: #ffffff;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      overflow: hidden;
    }

    @media print {
      body {
        background: transparent;
      }
      .a4-page {
        margin: 0;
        box-shadow: none;
        width: 100%;
        min-height: 100vh;
        max-height: none;
        padding: 4mm 6mm;
      }
    }

    /* ── الترويسة ── */
    .official-header {
      text-align: center;
      border-bottom: 1.5px solid #1f2937;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .republic-title {
      font-size: 11px;
      font-weight: 700;
      color: #374151;
      letter-spacing: 0.5px;
    }
    .ministry-title {
      font-size: 10.5px;
      font-weight: 600;
      color: #4b5563;
      margin-top: 1px;
    }
    .doc-main-title {
      font-size: 15px;
      font-weight: 900;
      color: #111827;
      margin: 2px 0 1px 0;
      letter-spacing: 0.3px;
    }
    .doc-subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #107a57;
    }

    /* ── شريط السلم الوزاري ── */
    .scale-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f9fafb;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 4px 10px;
      margin-bottom: 4px;
      font-size: 10px;
    }
    .scale-item span {
      color: #4b5563;
    }
    .scale-item strong {
      color: #111827;
    }
    .formula {
      background: #e6f4ee;
      color: #107a57;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 800;
      font-family: monospace;
      font-size: 10.5px;
    }

    /* ── جدول التنقيط ── */
    .gradebook-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: auto;
    }
    .gradebook-table th {
      background: #f3f4f6;
      color: #111827;
      border: 1px solid #9ca3af;
      padding: 3px 2px;
      text-align: center;
      font-weight: 800;
      vertical-align: middle;
      line-height: 1.1;
    }
    .gradebook-table th small {
      font-weight: normal;
      color: #4b5563;
      font-size: 8.5px;
    }
    .th-num { width: 24px; }
    .th-name { text-align: right !important; padding-right: 6px !important; width: 180px; }
    .th-sub { font-size: 8.5px; padding: 2px !important; width: 28px; }
    .th-eval { width: 38px; background: #e6f4ee !important; }
    .th-test { width: 38px; }
    .th-monitoring { width: 44px; background: #f0fdfa !important; }
    .th-exam { width: 38px; background: #fef3c7 !important; }
    .th-avg { width: 52px; background: #dcfce7 !important; font-weight: 900; }
    .th-notes { width: 140px; text-align: right !important; padding-right: 6px !important; }

    .gradebook-table td {
      border: 1px solid #d1d5db;
      padding: 2.5px 3px;
      height: 20px;
      vertical-align: middle;
      font-size: 9.5px;
    }
    .col-num {
      text-align: center;
      font-family: monospace;
      font-weight: 700;
      color: #6b7280;
    }
    .col-name {
      font-weight: 700;
      color: #111827;
      padding-right: 5px;
    }
    .col-metric {
      text-align: center;
      font-family: monospace;
      font-size: 9px;
      color: #374151;
    }
    .col-score {
      text-align: center;
      font-family: monospace;
      font-size: 10px;
      color: #111827;
    }
    .bg-monitoring {
      background: #f0fdfa;
    }
    .bg-avg {
      background: #f0fdf4;
      font-size: 10.5px;
    }
    .col-notes {
      font-size: 9px;
      color: #4b5563;
      padding-right: 5px;
    }

    /* ── التذييل والإمضاءات ── */
    .page-footer {
      margin-top: 4px;
      border-top: 1px solid #e5e7eb;
      padding-top: 3px;
    }
    .footer-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5px;
      color: #4b5563;
      margin-bottom: 4px;
    }
    .footer-stats strong {
      color: #111827;
    }
    .badge-avg {
      color: #107a57 !important;
      font-size: 11px !important;
      font-weight: 900;
    }

    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-top: 2px;
    }
    .sig-box {
      border: 1px dashed #9ca3af;
      border-radius: 6px;
      padding: 4px 8px;
      background: #fafafa;
      text-align: center;
      height: 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .sig-title {
      font-weight: 800;
      font-size: 10px;
      color: #1f2937;
    }
    .sig-name {
      font-size: 9px;
      color: #4b5563;
      font-weight: 600;
    }
    .sig-stamp {
      font-size: 8px;
      color: #9ca3af;
      text-align: left;
    }

    .next-page-note {
      text-align: center;
      font-size: 9.5px;
      color: #6b7280;
      font-style: italic;
      padding: 4px;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>
`;
}

/**
 * طباعة كراس التنقيط الرسمي أفقياً عبر نافذة iframe معزولة لضمان عدم تأثر المتصفح
 */
export function printGradebookReport(options: GradebookPdfOptions): void {
  const htmlContent = generateGradebookHTML(options);

  let printIframe = document.getElementById("landscape-gradebook-print-frame") as HTMLIFrameElement | null;
  if (!printIframe) {
    printIframe = document.createElement("iframe");
    printIframe.id = "landscape-gradebook-print-frame";
    printIframe.style.position = "fixed";
    printIframe.style.right = "0";
    printIframe.style.bottom = "0";
    printIframe.style.width = "0";
    printIframe.style.height = "0";
    printIframe.style.border = "none";
    document.body.appendChild(printIframe);
  }

  const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
  if (!iframeDoc) return;

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  setTimeout(() => {
    try {
      printIframe?.contentWindow?.focus();
      printIframe?.contentWindow?.print();
    } catch {
      window.print();
    }
  }, 400);
}

/**
 * تنزيل أو حفظ كراس التنقيط كملف PDF أفقي
 */
export function downloadGradebookPDF(options: GradebookPdfOptions): void {
  printGradebookReport(options);
}
