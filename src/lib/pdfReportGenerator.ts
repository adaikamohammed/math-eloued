import { DailyDiaryEntry, SpecialDayRecord, TimetableSettings } from "./types";

export interface DiaryReportDay {
  dateStr: string;
  dayName: string;
  specialDay?: SpecialDayRecord | null;
  entries: DailyDiaryEntry[];
  customTitle?: string;
}

export interface DiaryReportOptions {
  teacherName: string;
  schoolName: string;
  inspectorName?: string;
  principalName?: string;
  wilayaName?: string;
  subjectName?: string;
  days: DiaryReportDay[];
  customClasses?: string[];
  timetableSettings?: TimetableSettings | null;
  classColorsMap?: Record<string, string>;
  filterLabel?: string;
  docTitle?: string;
  fileName?: string;
}

// تنسيق التاريخ بالعربية (مثلاً: 05 أكتوبر 2026)
function formatArabicFullDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const months = [
      "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
      "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    const paddedDay = day < 10 ? `0${day}` : `${day}`;
    return `${paddedDay} ${months[dateObj.getMonth()]} ${year}`;
  } catch {
    return dateStr;
  }
}

// قوالب الأيام الخاصة التوضيحية
const SPECIAL_DAY_DESCRIPTIONS: Record<string, { label: string; icon: string }> = {
  holiday: { label: "عطلة مدرسية رسمية", icon: "🍂" },
  absence: { label: "طلب عطلة رسمية / غياب مبرر قانوناً لدى الإدارة", icon: "📋" },
  seminar: { label: "يوم تكويني بيداغوجي / ندوة تربوية لمقاطعة التفتيش", icon: "★" },
  exams: { label: "أسبوع الفروض أو الاختبارات الرسمية", icon: "📝" },
  custom: { label: "نشاط تربوي استثنائي", icon: "📌" },
};

/**
 * توليد كود HTML متكامل ومستقل للدفتر اليومي بمقاس A4 Landscape (أفقي 297mm × 210mm)
 * مع تصفية كاملة للأيام الفارغة وضمان أعلى دقة وخطوط عربية متصلة Vector
 */
export function generateLandscapeDiaryHTML(options: DiaryReportOptions): string {
  const teacher = options.teacherName || "الأستاذ(ة)";
  const school = options.schoolName || "المؤسسة التعليمية";
  const inspector = options.inspectorName || "السيد مفتش التعليم المتوسط";
  const principal = options.principalName || "السيد مدير المؤسسة";
  const subject = options.subjectName || "الرياضيات";
  const wilaya = options.wilayaName || "الوادي";
  const classColors = options.classColorsMap || {};

  // تصفية صارمة: لا نطبع إلا الأيام التي تحتوي حصصاً مسجلة فعلياً أو أياماً خاصة
  const printableDays = options.days.filter((d) => {
    const hasEntries = Array.isArray(d.entries) && d.entries.length > 0;
    const hasSpecial = !!d.specialDay;
    return hasEntries || hasSpecial;
  });

  const daysHtml = printableDays
    .map((day, dayIndex) => {
      const fullDate = formatArabicFullDate(day.dateStr);

      // في حال كان اليوم خاصاً (عطلة الخريف، غياب مبرر، ندوة)
      if (day.specialDay) {
        const sd = day.specialDay;
        const meta = SPECIAL_DAY_DESCRIPTIONS[sd.type] || SPECIAL_DAY_DESCRIPTIONS.custom;
        const endDateStr = sd.endDate ? ` (إلى غاية: ${formatArabicFullDate(sd.endDate)})` : "";

        return `
          <div class="day-section special-day-page">
            <div class="day-header-banner">
              <span class="day-badge">📌 يوم ${day.dayName}: ${fullDate} م</span>
              <span class="separator">—</span>
              <span class="day-custom-title">${sd.title}${endDateStr}</span>
            </div>

            <div class="special-day-box">
              <div class="special-day-tag">
                <span class="icon">${meta.icon}</span>
                <span>${meta.label}</span>
                <span class="icon">${meta.icon}</span>
              </div>
              <h2 class="special-day-title">${sd.title}</h2>
              ${
                sd.description
                  ? `<div class="special-day-desc">${sd.description.replace(/\n/g, "<br/>")}</div>`
                  : ""
              }
              <div class="special-day-footnote">
                <span>سجل رسمي معتمد وموثق في الدفتر اليومي للأستاذ — مديرية التربية لولاية ${wilaya}</span>
              </div>
            </div>
          </div>
        `;
      }

      // يوم دراسي عادي يحتوي على حصص
      const entriesRows = day.entries
        .map((entry, idx) => {
          const bgHex = classColors[entry.className] || "#107a57";
          const rowBgClass = idx % 2 === 1 ? "row-alt" : "row-white";

          const stagesHtml =
            entry.stages && entry.stages.length > 0
              ? entry.stages
                  .map((stg) => {
                    let badgeClass = "badge-sky";
                    if (stg.label.includes("وسيطي") || stg.label.includes("بناء")) badgeClass = "badge-emerald";
                    else if (stg.label.includes("نهائي") || stg.label.includes("تقويم")) badgeClass = "badge-amber";
                    else if (stg.color === "purple") badgeClass = "badge-purple";

                    return `
                      <div class="stage-item">
                        <span class="stage-badge ${badgeClass}">${stg.label ? `${stg.label}:` : "مرحلة:"}</span>
                        <div class="stage-content">
                          ${stg.content ? stg.content : `<span class="dots">....................................................................................</span>`}
                        </div>
                      </div>
                    `;
                  })
                  .join("")
              : `
                <div class="stage-item"><span class="stage-badge badge-sky">تمهيدي:</span><span class="dots">....................................................................................</span></div>
                <div class="stage-item"><span class="stage-badge badge-emerald">وسيطي:</span><span class="dots">....................................................................................</span></div>
                <div class="stage-item"><span class="stage-badge badge-amber">نهائي:</span><span class="dots">....................................................................................</span></div>
              `;

          const notesHtml = entry.notes
            ? `<div class="notes-content">${entry.notes.replace(/\n/g, "<br/>")}</div>`
            : `<div class="dots-block"><div>................................</div><div>................................</div><div>................................</div></div>`;

          return `
            <tr class="${rowBgClass}">
              <!-- 1. التوقيت والفوج -->
              <td class="col-time-class">
                <div class="period-time">${entry.periodTime || "08:00 - 09:00"}</div>
                <div class="class-badge" style="background-color: ${bgHex};">
                  ${entry.className.includes("متوسط") ? entry.className : `${entry.className} متوسط`}
                </div>
                ${entry.lessonNoteNumber ? `<div class="note-num">${entry.lessonNoteNumber}</div>` : ""}
              </td>

              <!-- 2. الميدان والمورد -->
              <td class="col-field-resource">
                <div class="field-tag">
                  <span>${entry.field || "أنشطة عددية"}</span>
                  <span class="tag-sep">|</span>
                  <span>${entry.sessionType || "درس"}</span>
                </div>
                <div class="lesson-title">${entry.lessonTitle}</div>
                ${entry.concepts ? `<div class="lesson-concepts">${entry.concepts}</div>` : ""}
                ${entry.section ? `<div class="lesson-section">${entry.section}</div>` : ""}
              </td>

              <!-- 3. سيرورة الحصة وسندات الكتاب المدرسي -->
              <td class="col-stages">
                ${stagesHtml}
              </td>

              <!-- 4. الملاحظات -->
              <td class="col-notes">
                ${notesHtml}
              </td>
            </tr>
          `;
        })
        .join("");

      const isLastDay = dayIndex === printableDays.length - 1;

      return `
        <div class="day-section ${isLastDay ? "" : "page-break"}">
          <div class="day-header-banner">
            <div class="day-header-right">
              <span class="day-badge">📌 يوم ${day.dayName}: ${fullDate} م</span>
              <span class="separator">—</span>
              <span class="day-custom-title">${day.customTitle || "متابعة تدرج التعلمات وإنجاز الموارد"}</span>
            </div>
            <div class="day-count-badge">${day.entries.length} حصص مبرمجة</div>
          </div>

          <table class="diary-table">
            <thead>
              <tr>
                <th class="th-time">التوقيت والفوج</th>
                <th class="th-resource">الميدان والمورد (الدرس)</th>
                <th class="th-stages">سيرورة الحصة وسندات الكتاب المدرسي</th>
                <th class="th-notes">الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${entriesRows}
            </tbody>
          </table>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>الدفتر اليومي البيداغوجي للأستاذ — ${teacher}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

    @page {
      size: A4 landscape;
      margin: 8mm 10mm 10mm 10mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111827;
      font-size: 11px;
      line-height: 1.4;
      direction: rtl;
      text-align: right;
    }

    .report-container {
      width: 100%;
      max-width: 277mm;
      margin: 0 auto;
    }

    /* ─── الترويسة الوزارية الرسمية ─── */
    .official-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 12px;
      text-align: center;
    }

    .republic-text {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      margin: 0 0 2px 0;
    }

    .ministry-text {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      margin: 0 0 4px 0;
    }

    .doc-main-title {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 3px 0;
      letter-spacing: 0.2px;
    }

    .doc-sub-info {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      margin: 0;
    }

    .header-details-grid {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #cbd5e1;
      padding-top: 5px;
      margin-top: 5px;
      font-size: 11px;
    }

    .header-col strong {
      color: #0f172a;
    }

    /* ─── الأيام والجداول ─── */
    .day-section {
      margin-bottom: 16px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    .day-header-banner {
      background: #1e293b;
      color: #ffffff;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 800;
    }

    .day-header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .day-custom-title {
      color: #7dd3fc;
    }

    .separator {
      color: #94a3b8;
    }

    .day-count-badge {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10px;
    }

    /* الجدول الأفقي */
    .diary-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
    }

    .diary-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 6px 8px;
      font-weight: 800;
      font-size: 10.5px;
      border-left: 1px solid #334155;
      text-align: right;
    }

    .diary-table th:last-child {
      border-left: none;
      text-align: center;
    }

    .th-time { width: 16%; text-align: center !important; }
    .th-resource { width: 29%; }
    .th-stages { width: 40%; }
    .th-notes { width: 15%; }

    .diary-table td {
      padding: 7px 8px;
      vertical-align: top;
      border-left: 1px solid #e2e8f0;
      border-top: 1px solid #e2e8f0;
    }

    .diary-table td:last-child {
      border-left: none;
    }

    .row-white { background: #ffffff; }
    .row-alt { background: #f8fafc; }

    /* تفاصيل عمود التوقيت والفوج */
    .col-time-class {
      text-align: center;
    }

    .period-time {
      font-family: monospace;
      font-weight: 800;
      font-size: 11px;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .class-badge {
      display: inline-block;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 800;
      font-size: 10px;
      margin-bottom: 4px;
    }

    .note-num {
      font-size: 9.5px;
      font-family: monospace;
      font-weight: 700;
      color: #64748b;
    }

    /* تفاصيل عمود الميدان والمورد */
    .field-tag {
      display: inline-block;
      background: #e6f4ee;
      color: #107a57;
      border: 1px solid rgba(16, 122, 87, 0.25);
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 800;
      margin-bottom: 4px;
    }

    .tag-sep { margin: 0 3px; color: #107a57; }

    .lesson-title {
      font-weight: 800;
      font-size: 11.5px;
      color: #0f172a;
      margin-bottom: 3px;
      line-height: 1.35;
    }

    .lesson-concepts {
      font-size: 10px;
      color: #475569;
      line-height: 1.35;
      margin-bottom: 2px;
    }

    .lesson-section {
      font-size: 9.5px;
      font-weight: 700;
      color: #94a3b8;
    }

    /* تفاصيل سيرورة الحصة */
    .stage-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 4px;
    }

    .stage-item:last-child {
      margin-bottom: 0;
    }

    .stage-badge {
      flex-shrink: 0;
      font-size: 9.5px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid transparent;
    }

    .badge-sky { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
    .badge-emerald { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
    .badge-amber { background: #fef3c7; color: #b45309; border-color: #fde68a; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; border-color: #e9d5ff; }

    .stage-content {
      flex: 1;
      font-size: 10px;
      color: #334155;
      line-height: 1.35;
    }

    .dots {
      color: #cbd5e1;
      font-family: monospace;
      letter-spacing: 1px;
    }

    .dots-block {
      color: #cbd5e1;
      font-family: monospace;
      font-size: 10px;
      letter-spacing: 1px;
      text-align: center;
      line-height: 1.5;
    }

    .notes-content {
      font-size: 10px;
      color: #334155;
      line-height: 1.35;
    }

    /* الأيام الخاصة (العطل والغيابات والندوات) */
    .special-day-box {
      padding: 24px;
      text-align: center;
      background: #fdfcfb;
    }

    .special-day-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fef3c7;
      color: #78350f;
      border: 1px solid #fde68a;
      padding: 3px 12px;
      border-radius: 9999px;
      font-weight: 800;
      font-size: 11px;
      margin-bottom: 8px;
    }

    .special-day-title {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 8px 0;
    }

    .special-day-desc {
      font-size: 11px;
      color: #475569;
      max-width: 600px;
      margin: 0 auto 10px auto;
      line-height: 1.5;
      padding: 6px 0;
      border-top: 1px dashed #cbd5e1;
      border-bottom: 1px dashed #cbd5e1;
    }

    .special-day-footnote {
      font-size: 9.5px;
      color: #94a3b8;
      font-weight: 700;
    }

    /* ─── تأشيرات الإدارة والمفتش في الأسفل ─── */
    .signatures-block {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 2px solid #0f172a;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .signatures-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      text-align: center;
      font-size: 11px;
      font-weight: 800;
    }

    .signature-card {
      border: 1.5px solid #0f172a;
      border-radius: 8px;
      padding: 8px;
      height: 85px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .signer-name {
      font-size: 9.5px;
      color: #334155;
      font-weight: 700;
    }
  </style>
  <title>${
    options.docTitle ||
    options.fileName ||
    (options.days.length === 1
      ? `الدفتر_اليومي_الأستاذ_${(options.teacherName || "الأستاذ").trim().split(" ")[0]}_ليوم_${options.days[0].dateStr}`
      : options.days.length > 1
      ? `الدفتر_اليومي_الأستاذ_${(options.teacherName || "الأستاذ").trim().split(" ")[0]}_من_${options.days[0].dateStr}_إلى_${options.days[options.days.length - 1].dateStr}`
      : `الدفتر_اليومي_البيداغوجي_الأستاذ_${(options.teacherName || "الأستاذ").trim().split(" ")[0]}`)
  }</title>
</head>
<body>
  <div class="report-container">
    <!-- الترويسة الوزارية الرسمية -->
    <header class="official-header">
      <p class="republic-text">الجمهورية الجزائرية الديمقراطية الشعبية</p>
      <p class="ministry-text">وزارة التربية الوطنية — مديرية التربية لولاية ${wilaya}</p>
      <h1 class="doc-main-title">الدفتر اليومي البيداغوجي لـلأستـاذ (CAHIER JOURNAL PÉDAGOGIQUE)</h1>
      <p class="doc-sub-info">مادة: <strong>${subject}</strong> • الموسم الدراسي: 2026 / 2027 م</p>

      <div class="header-details-grid">
        <div class="header-col"><span>المؤسسة: </span><strong>${school}</strong></div>
        <div class="header-col"><span>الأستاذ(ة): </span><strong>${teacher}</strong></div>
      </div>
    </header>

    <!-- محتوى الأيام المسجلة فقط -->
    <main>
      ${daysHtml}
    </main>

    <!-- تأشيرات الإدارة والمفتش -->
    <footer class="signatures-block">
      <div class="signatures-grid">
        <div class="signature-card">
          <span>إمضاء الأستاذ(ة)</span>
          <span class="signer-name">${teacher}</span>
        </div>
        <div class="signature-card">
          <span>تأشيرة السيد مدير المؤسسة</span>
          <span class="signer-name">${principal}</span>
        </div>
        <div class="signature-card">
          <span>تأشيرة السيد مفتش التربية الوطنية</span>
          <span class="signer-name">${inspector}</span>
        </div>
      </div>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * فتح إطار طباعة منسق بدقة A4 Landscape للدفتر اليومي دون أي تشويه أو لقطات شاشة
 */
export function printLandscapeDiaryReport(options: DiaryReportOptions): void {
  if (typeof window === "undefined") return;

  const teacherFamily = (options.teacherName || "الأستاذ").trim().split(" ")[0];
  const calculatedDocTitle =
    options.docTitle ||
    options.fileName ||
    (options.days.length === 1
      ? `الدفتر_اليومي_الأستاذ_${teacherFamily}_ليوم_${options.days[0].dateStr}`
      : options.days.length > 1
      ? `الدفتر_اليومي_الأستاذ_${teacherFamily}_من_${options.days[0].dateStr}_إلى_${options.days[options.days.length - 1].dateStr}`
      : `الدفتر_اليومي_البيداغوجي_الأستاذ_${teacherFamily}`);

  const htmlContent = generateLandscapeDiaryHTML({
    ...options,
    docTitle: calculatedDocTitle,
  });

  // إنشاء iframe خفي لعزل المستند تماماً عن واجهة الويب
  let printIframe = document.getElementById("landscape-diary-print-frame") as HTMLIFrameElement | null;
  if (printIframe) {
    document.body.removeChild(printIframe);
  }

  printIframe = document.createElement("iframe");
  printIframe.id = "landscape-diary-print-frame";
  printIframe.style.position = "fixed";
  printIframe.style.right = "0";
  printIframe.style.bottom = "0";
  printIframe.style.width = "0";
  printIframe.style.height = "0";
  printIframe.style.border = "none";
  printIframe.style.visibility = "hidden";
  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document;
  if (!doc) {
    // حل احتياطي: فتح نافذة جديدة
    const win = window.open("", "_blank");
    if (win) {
      win.document.open();
      win.document.write(htmlContent);
      win.document.title = calculatedDocTitle;
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
    return;
  }

  // حفظ عنوان النافذة الرئيسي وتعيين اسم الملف المقترح للحفظ كـ PDF
  let originalTopTitle = "";
  try {
    if (window.top && window.top.document) {
      originalTopTitle = window.top.document.title;
      window.top.document.title = calculatedDocTitle;
    }
  } catch {}

  doc.open();
  doc.write(htmlContent);
  doc.title = calculatedDocTitle;
  doc.close();

  // إعطاء وقت كافٍ لتحميل خط Cairo وتطبيق القواعد الأفقية
  setTimeout(() => {
    try {
      printIframe?.contentWindow?.focus();
      printIframe?.contentWindow?.print();
    } catch (e) {
      console.error("Print failed in iframe, opening window", e);
      const win = window.open("", "_blank");
      if (win) {
        win.document.open();
        win.document.write(htmlContent);
        win.document.title = calculatedDocTitle;
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 350);
      }
    } finally {
      if (originalTopTitle) {
        setTimeout(() => {
          try {
            if (window.top && window.top.document) {
              window.top.document.title = originalTopTitle;
            }
          } catch {}
        }, 4000);
      }
    }
  }, 400);
}

/**
 * توليد وتنزيل تقرير الـ PDF أو فتح نافذة الحفظ المباشر كـ PDF
 */
export function downloadLandscapeDiaryPDF(options: DiaryReportOptions): void {
  // يطلق محرك الطباعة الأفقي الذي يفتح خيار "Save as PDF" أفقياً بمقاس A4 297x210mm
  printLandscapeDiaryReport(options);
}
