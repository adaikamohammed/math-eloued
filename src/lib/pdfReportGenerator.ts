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
 * محرك الطباعة والتصدير المعزول عبر iframe للطباعة بدقة A4 Landscape عالية الوضوح Vector
 */
export function printHtmlInLandscapeIframe(
  htmlContent: string,
  docTitle: string,
  frameId: string = "landscape-report-print-frame"
): void {
  if (typeof window === "undefined") return;

  let printIframe = document.getElementById(frameId) as HTMLIFrameElement | null;
  if (printIframe && printIframe.parentNode) {
    try {
      printIframe.parentNode.removeChild(printIframe);
    } catch {}
  }

  printIframe = document.createElement("iframe");
  printIframe.id = frameId;
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
    const win = window.open("", "_blank");
    if (win) {
      win.document.open();
      win.document.write(htmlContent);
      win.document.title = docTitle;
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
    return;
  }

  let originalTopTitle = "";
  try {
    if (window.top && window.top.document) {
      originalTopTitle = window.top.document.title;
      window.top.document.title = docTitle;
    }
  } catch {}

  doc.open();
  doc.write(htmlContent);
  doc.title = docTitle;
  doc.close();

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
        win.document.title = docTitle;
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
 * فتح إطار طباعة منسق بدقة A4 Landscape للدفتر اليومي دون أي تشويه أو لقطات شاشة
 */
export function printLandscapeDiaryReport(options: DiaryReportOptions): void {
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

  printHtmlInLandscapeIframe(htmlContent, calculatedDocTitle, "landscape-diary-print-frame");
}

/**
 * توليد وتنزيل تقرير الـ PDF أو فتح نافذة الحفظ المباشر كـ PDF للدفتر اليومي
 */
export function downloadLandscapeDiaryPDF(options: DiaryReportOptions): void {
  printLandscapeDiaryReport(options);
}

/* =========================================================================
   1. تقرير قائمة وتفويج التلاميذ الرسمي (A4 Landscape)
   ========================================================================= */

export interface StudentReportItem {
  id?: string;
  studentName: string;
  gender?: "ذكر" | "أنثى" | string;
  groupName?: "فوج 1" | "فوج 2" | string;
  isRepeater?: boolean;
  parentPhone?: string;
  notes?: string;
}

export interface StudentsReportOptions {
  teacherName: string;
  schoolName: string;
  inspectorName?: string;
  principalName?: string;
  wilayaName?: string;
  subjectName?: string;
  academicYear?: string;
  className: string;
  students: StudentReportItem[];
  stats?: {
    total: number;
    male: number;
    female: number;
    group1: number;
    group2: number;
    repeaters: number;
    newStudents: number;
  };
  docTitle?: string;
  fileName?: string;
}

export function generateStudentsLandscapeHTML(options: StudentsReportOptions): string {
  const teacher = options.teacherName || "الأستاذ(ة)";
  const school = options.schoolName || "المتوسطة التعليمية";
  const inspector = options.inspectorName || "السيد مفتش التربية الوطنية";
  const principal = options.principalName || "السيد مدير المؤسسة";
  const subject = options.subjectName || "الرياضيات";
  const wilaya = options.wilayaName || "الوادي";
  const academicYear = options.academicYear || "2025 / 2026 م";
  const className = options.className || "جميع الأفواج";

  const total = options.students.length;
  const male = options.stats?.male ?? options.students.filter((s) => s.gender === "ذكر").length;
  const female = options.stats?.female ?? options.students.filter((s) => s.gender === "أنثى").length;
  const group1 = options.stats?.group1 ?? options.students.filter((s) => s.groupName === "فوج 1").length;
  const group2 = options.stats?.group2 ?? options.students.filter((s) => s.groupName === "فوج 2").length;
  const repeaters = options.stats?.repeaters ?? options.students.filter((s) => !!s.isRepeater).length;
  const newStudents = options.stats?.newStudents ?? total - repeaters;

  const rowsHtml = options.students
    .map((student, idx) => {
      const isAlt = idx % 2 === 1;
      const isFemale = student.gender === "أنثى";
      const isG2 = student.groupName === "فوج 2";
      const isRep = !!student.isRepeater;

      return `
        <tr class="${isAlt ? "row-alt" : "row-white"}">
          <td class="col-num">${idx + 1}</td>
          <td class="col-name">${student.studentName}</td>
          <td class="col-gender">
            <span class="badge ${isFemale ? "badge-pink" : "badge-blue"}">
              ${isFemale ? "👧 أنثى" : "👦 ذكر"}
            </span>
          </td>
          <td class="col-group">
            <span class="badge ${isG2 ? "badge-amber" : "badge-purple"}">
              ${isG2 ? "فوج 2" : "فوج 1"}
            </span>
          </td>
          <td class="col-status">
            <span class="badge ${isRep ? "badge-rose" : "badge-emerald"}">
              ${isRep ? "معيد" : "جديد"}
            </span>
          </td>
          <td class="col-phone" dir="ltr">${student.parentPhone || "—"}</td>
          <td class="col-notes">${student.notes || ""}</td>
          <td class="col-eval">
            <div class="dots-line">......................</div>
          </td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${options.docTitle || `قائمة_تلاميذ_فوج_${className}_الأستاذ_${teacher}`}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

    @page {
      size: A4 landscape;
      margin: 8mm 10mm 8mm 10mm;
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
      line-height: 1.35;
      direction: rtl;
      text-align: right;
    }

    .report-container {
      width: 100%;
      max-width: 277mm;
      margin: 0 auto;
    }

    .official-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 5px;
      margin-bottom: 8px;
      text-align: center;
    }

    .republic-text {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      margin: 0 0 1px 0;
    }

    .ministry-text {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      margin: 0 0 3px 0;
    }

    .doc-main-title {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 3px 0;
      letter-spacing: 0.2px;
    }

    .header-details-grid {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #cbd5e1;
      padding-top: 4px;
      margin-top: 4px;
      font-size: 11px;
    }

    .header-col strong {
      color: #0f172a;
      font-weight: 800;
    }

    /* شريط الإحصائيات الملون المعتمد */
    .stats-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 5px 10px;
      margin-bottom: 8px;
      font-size: 10.5px;
    }

    .stat-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 6px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      font-weight: 700;
    }
    .stat-blue { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
    .stat-pink { background: #fdf2f8; border-color: #fbcfe8; color: #9d174d; }
    .stat-purple { background: #faf5ff; border-color: #e9d5ff; color: #6b21a8; }
    .stat-amber { background: #fffbeb; border-color: #fde68a; color: #92400e; }
    .stat-emerald { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
    .stat-rose { background: #fff1f2; border-color: #fecdd3; color: #9f1239; }

    /* جدول التلاميذ */
    .students-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f172a;
      font-size: 11px;
    }

    .students-table thead {
      display: table-header-group;
    }

    .students-table tr {
      page-break-inside: avoid;
    }

    .students-table th {
      background: #1e293b;
      color: #ffffff;
      padding: 6px 5px;
      font-weight: 800;
      text-align: center;
      border: 1px solid #334155;
      font-size: 10.5px;
    }

    .students-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 6px;
      vertical-align: middle;
    }

    .row-alt { background: #f8fafc; }
    .row-white { background: #ffffff; }

    .col-num { width: 34px; text-align: center; font-weight: 800; color: #64748b; }
    .col-name { width: 220px; font-weight: 800; color: #0f172a; }
    .col-gender { width: 65px; text-align: center; }
    .col-group { width: 70px; text-align: center; }
    .col-status { width: 65px; text-align: center; }
    .col-phone { width: 110px; text-align: center; font-family: monospace; font-size: 10.5px; }
    .col-notes { font-size: 10px; color: #475569; }
    .col-eval { width: 105px; text-align: center; color: #94a3b8; font-size: 9px; }

    .badge {
      display: inline-block;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      border: 1px solid transparent;
    }
    .badge-blue { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
    .badge-pink { background: #fce7f3; color: #9d174d; border-color: #fbcfe8; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; border-color: #e9d5ff; }
    .badge-amber { background: #fef3c7; color: #92400e; border-color: #fde68a; }
    .badge-emerald { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
    .badge-rose { background: #ffe4e6; color: #9f1239; border-color: #fecdd3; }

    .dots-line { letter-spacing: 2px; }

    /* التوقيعات الرسمية */
    .signatures-block {
      margin-top: 14px;
      page-break-inside: avoid;
    }

    .signatures-grid {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    .signature-card {
      flex: 1;
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 7px 10px;
      text-align: center;
      min-height: 50px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #fafaf7;
      font-size: 10px;
      font-weight: 700;
      color: #475569;
    }

    .signer-name {
      font-size: 11px;
      font-weight: 900;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <header class="official-header">
      <p class="republic-text">الجمهورية الجزائرية الديمقراطية الشعبية</p>
      <p class="ministry-text">وزارة التربية الوطنية — مديرية التربية لولاية ${wilaya}</p>
      <h1 class="doc-main-title">قائمة وتفويج التلاميذ الرسمية (LISTE OFFICIELLE DES ÉLÈVES)</h1>

      <div class="header-details-grid">
        <div class="header-col"><span>المؤسسة: </span><strong>${school}</strong></div>
        <div class="header-col"><span>الفوج التربوي: </span><strong>فوج ${className}</strong></div>
        <div class="header-col"><span>الأستاذ(ة): </span><strong>${teacher}</strong></div>
        <div class="header-col"><span>المادة: </span><strong>${subject}</strong></div>
        <div class="header-col"><span>الموسم الدراسي: </span><strong>${academicYear}</strong></div>
      </div>
    </header>

    <div class="stats-bar">
      <span class="stat-badge">👥 إجمالي التلاميذ: <strong>${total}</strong></span>
      <span class="stat-badge stat-blue">👦 ذكور: <strong>${male}</strong></span>
      <span class="stat-badge stat-pink">👧 إناث: <strong>${female}</strong></span>
      <span class="stat-badge stat-purple">👥 فوج 1: <strong>${group1}</strong></span>
      <span class="stat-badge stat-amber">👥 فوج 2: <strong>${group2}</strong></span>
      <span class="stat-badge stat-emerald">✨ جدد: <strong>${newStudents}</strong></span>
      <span class="stat-badge stat-rose">🔄 معيدون: <strong>${repeaters}</strong></span>
    </div>

    <main>
      <table class="students-table">
        <thead>
          <tr>
            <th style="width: 34px;">الرقم</th>
            <th style="text-align: right; width: 220px;">اللقب والاسم الكامل</th>
            <th style="width: 65px;">الجنس</th>
            <th style="width: 70px;">التفويج</th>
            <th style="width: 65px;">الصفة</th>
            <th style="width: 110px;">هاتف ولي الأمر</th>
            <th>ملاحظات وتوجيهات الأستاذ</th>
            <th style="width: 105px;">المتابعة والتقييم</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </main>

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

export function downloadStudentsLandscapePDF(options: StudentsReportOptions): void {
  const teacherFamily = (options.teacherName || "الأستاذ").trim().split(" ")[0];
  const calculatedDocTitle =
    options.docTitle ||
    options.fileName ||
    `قائمة_تلاميذ_فوج_${options.className}_الأستاذ_${teacherFamily}`;

  const htmlContent = generateStudentsLandscapeHTML({
    ...options,
    docTitle: calculatedDocTitle,
  });

  printHtmlInLandscapeIframe(htmlContent, calculatedDocTitle, "landscape-students-print-frame");
}

/* =========================================================================
   2. تقرير جدول التوقيت الأسبوعي لـلأستـاذ (A4 Landscape)
   ========================================================================= */

export interface TimetableSlotReportItem {
  day: string;
  startTime: string;
  endTime: string;
  className: string;
  subject?: string;
  room?: string;
  sessionType?: string;
  weekType?: "all" | "week_a" | "week_b";
}

export interface TimetableReportOptions {
  teacherName: string;
  schoolName: string;
  inspectorName?: string;
  principalName?: string;
  wilayaName?: string;
  subjectName?: string;
  academicYear?: string;
  slots: TimetableSlotReportItem[];
  settings: TimetableSettings;
  customClasses: string[];
  classHoursSummary: {
    activeTeachingHours: number;
    receptionCount: number;
    freeCount: number;
    classesSummary: Record<string, { total: number; normal: number; td: number; remedial: number }>;
  };
  classColorsMap?: Record<string, string>;
  docTitle?: string;
  fileName?: string;
}

const DEFAULT_TIMETABLE_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"];

const DEFAULT_FALLBACK_PALETTE: Record<string, string> = {
  emerald: "#10b981",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  teal: "#14b8a6",
  indigo: "#6366f1",
  orange: "#f97316",
  cyan: "#06b6d4",
  fuchsia: "#d946ef",
  lime: "#84cc16",
  slate: "#64748b",
};

export function generateTimetableLandscapeHTML(options: TimetableReportOptions): string {
  const teacher = options.teacherName || "الأستاذ(ة)";
  const school = options.schoolName || "المتوسطة التعليمية";
  const inspector = options.inspectorName || "السيد مفتش التربية الوطنية";
  const principal = options.principalName || "السيد مدير المؤسسة";
  const subject = options.subjectName || "الرياضيات";
  const wilaya = options.wilayaName || "الوادي";
  const academicYear = options.academicYear || "2025 / 2026 م";
  const settings = options.settings;

  // الحصص الصباحية والمسائية
  const morningSlots = [
    { start: "08:00", end: "09:00", label: "08:00 - 09:00" },
    { start: "09:00", end: "10:00", label: "09:00 - 10:00" },
    { start: "10:00", end: "11:00", label: "10:00 - 11:00" },
    { start: "11:00", end: "12:00", label: "11:00 - 12:00" },
  ];
  const afternoonSlots = [
    { start: "13:30", end: "14:30", label: "13:30 - 14:30" },
    { start: "14:30", end: "15:30", label: "14:30 - 15:30" },
    { start: "15:30", end: "16:30", label: "15:30 - 16:30" },
  ];
  const breakStart = settings?.breakStart || "12:00";
  const breakEnd = settings?.breakEnd || "13:30";

  // دالة مطابقة الحصة
  const findSlot = (day: string, startTime: string) => {
    return options.slots.find((s) => {
      if (s.day !== day) return false;
      const sStart = (s.startTime || "").trim().substring(0, 5);
      const target = startTime.trim().substring(0, 5);
      return sStart === target;
    });
  };

  // لوحة ألوان الأفواج
  const getColorHexForClass = (cls: string): string => {
    if (!cls) return "#10b981";
    if (options.classColorsMap && options.classColorsMap[cls]) {
      const colorId = options.classColorsMap[cls];
      if (DEFAULT_FALLBACK_PALETTE[colorId]) return DEFAULT_FALLBACK_PALETTE[colorId];
    }
    const idx = options.customClasses.indexOf(cls);
    const keys = Object.keys(DEFAULT_FALLBACK_PALETTE);
    return DEFAULT_FALLBACK_PALETTE[keys[idx >= 0 ? idx % keys.length : 0]] || "#10b981";
  };

  const rowsHtml = DEFAULT_TIMETABLE_DAYS.map((day, dIdx) => {
    const isTuesday = day === "الثلاثاء";
    const isAlt = dIdx % 2 === 1;

    // خلايا الصباح
    const morningCells = morningSlots
      .map((slot) => {
        const item = findSlot(day, slot.start);
        if (!item) {
          return `<td class="cell-slot cell-empty"><span class="dash">—</span></td>`;
        }
        if (item.className.includes("استقبال") || item.sessionType?.includes("استقبال")) {
          return `
            <td class="cell-slot cell-reception">
              <div class="slot-badge-reception">🤝 استقبال الأولياء</div>
              ${item.room ? `<div class="slot-room">قاعة ${item.room}</div>` : ""}
            </td>
          `;
        }
        const hex = getColorHexForClass(item.className);
        return `
          <td class="cell-slot">
            <div class="class-badge" style="background-color: ${hex};">${item.className}</div>
            ${item.sessionType && item.sessionType !== "عادي" ? `<div class="session-type">${item.sessionType}</div>` : ""}
            ${item.room ? `<div class="slot-room">قاعة ${item.room}</div>` : ""}
          </td>
        `;
      })
      .join("");

    // خلايا المساء
    const afternoonCells = afternoonSlots
      .map((slot) => {
        const item = findSlot(day, slot.start);
        if (!item) {
          if (isTuesday && settings?.tuesdayAfternoonOff) {
            return `<td class="cell-slot cell-tuesday-off"><span class="tuesday-text">أمسية الثلاثاء (راحة)</span></td>`;
          }
          return `<td class="cell-slot cell-empty"><span class="dash">—</span></td>`;
        }
        if (item.className.includes("استقبال") || item.sessionType?.includes("استقبال")) {
          return `
            <td class="cell-slot cell-reception">
              <div class="slot-badge-reception">🤝 استقبال الأولياء</div>
              ${item.room ? `<div class="slot-room">قاعة ${item.room}</div>` : ""}
            </td>
          `;
        }
        const hex = getColorHexForClass(item.className);
        return `
          <td class="cell-slot">
            <div class="class-badge" style="background-color: ${hex};">${item.className}</div>
            ${item.sessionType && item.sessionType !== "عادي" ? `<div class="session-type">${item.sessionType}</div>` : ""}
            ${item.room ? `<div class="slot-room">قاعة ${item.room}</div>` : ""}
          </td>
        `;
      })
      .join("");

    return `
      <tr class="${isAlt ? "row-alt" : "row-white"}">
        <td class="col-day">${day}</td>
        ${morningCells}
        <td class="col-break">
          <span class="break-text">استراحة</span>
        </td>
        ${afternoonCells}
      </tr>
    `;
  }).join("");

  // ملخص ساعات الأفواج
  const classesSummaryCards = options.customClasses
    .map((cls) => {
      const hex = getColorHexForClass(cls);
      const st = options.classHoursSummary.classesSummary[cls] || { total: 0, td: 0 };
      return `
        <div class="class-hour-badge" style="border-right: 3px solid ${hex};">
          <strong style="color: ${hex};">فوج ${cls}:</strong>
          <span>${st.total} سا</span>
          ${st.td > 0 ? `<small>(${st.td} تفويج)</small>` : ""}
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${options.docTitle || `جدول_التوقيت_الأسبوعي_الأستاذ_${teacher}`}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

    @page {
      size: A4 landscape;
      margin: 8mm 10mm 8mm 10mm;
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
      line-height: 1.35;
      direction: rtl;
      text-align: right;
    }

    .report-container {
      width: 100%;
      max-width: 277mm;
      margin: 0 auto;
    }

    .official-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 5px;
      margin-bottom: 8px;
      text-align: center;
    }

    .republic-text {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      margin: 0 0 1px 0;
    }

    .ministry-text {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      margin: 0 0 3px 0;
    }

    .doc-main-title {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 3px 0;
      letter-spacing: 0.2px;
    }

    .header-details-grid {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #cbd5e1;
      padding-top: 4px;
      margin-top: 4px;
      font-size: 11px;
    }

    .header-col strong {
      color: #0f172a;
      font-weight: 800;
    }

    /* جدول التوقيت */
    .timetable-grid {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f172a;
      table-layout: fixed;
      margin-bottom: 8px;
    }

    .timetable-grid th {
      background: #1e293b;
      color: #ffffff;
      padding: 6px 3px;
      font-weight: 800;
      text-align: center;
      border: 1px solid #334155;
      font-size: 10.5px;
    }

    .timetable-grid td {
      border: 1px solid #cbd5e1;
      padding: 6px 4px;
      text-align: center;
      vertical-align: middle;
      height: 48px;
    }

    .th-day { width: 11%; }
    .th-slot { width: 11%; }
    .th-break { width: 6%; background: #475569 !important; font-size: 9.5px; }

    .col-day {
      background: #0f172a;
      color: #ffffff;
      font-weight: 900;
      font-size: 11.5px;
    }

    .col-break {
      background: #f1f5f9;
      color: #64748b;
      font-size: 9px;
      font-weight: 800;
      padding: 2px !important;
    }

    .break-text {
      writing-mode: vertical-rl;
      letter-spacing: 2px;
    }

    .class-badge {
      display: inline-block;
      color: #ffffff;
      font-weight: 900;
      font-size: 11px;
      padding: 2.5px 8px;
      border-radius: 6px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .session-type {
      font-size: 9px;
      font-weight: 700;
      color: #475569;
      margin-top: 2px;
    }

    .slot-room {
      font-size: 8.5px;
      font-weight: 600;
      color: #64748b;
    }

    .cell-reception {
      background: #faf5ff;
    }

    .slot-badge-reception {
      display: inline-block;
      background: #7e22ce;
      color: #ffffff;
      font-weight: 800;
      font-size: 9.5px;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .cell-tuesday-off {
      background: #f8fafc;
      color: #94a3b8;
      font-size: 9.5px;
      font-weight: 700;
    }

    .cell-empty {
      color: #cbd5e1;
      font-size: 14px;
    }

    .dash {
      color: #cbd5e1;
    }

    .row-alt { background: #fafafa; }
    .row-white { background: #ffffff; }

    /* شريط توزيع الساعات أسفل الجدول */
    .hours-summary-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 10.5px;
      margin-bottom: 6px;
    }

    .class-hour-badge {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 3px 8px;
      border-radius: 5px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
    }

    .total-hours-badge {
      background: #0f172a;
      color: #ffffff;
      padding: 3px 10px;
      border-radius: 6px;
      font-weight: 900;
      font-size: 11px;
    }

    /* التوقيعات الرسمية */
    .signatures-block {
      margin-top: 12px;
      page-break-inside: avoid;
    }

    .signatures-grid {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    .signature-card {
      flex: 1;
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 7px 10px;
      text-align: center;
      min-height: 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #fafaf7;
      font-size: 10px;
      font-weight: 700;
      color: #475569;
    }

    .signer-name {
      font-size: 11px;
      font-weight: 900;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <header class="official-header">
      <p class="republic-text">الجمهورية الجزائرية الديمقراطية الشعبية</p>
      <p class="ministry-text">وزارة التربية الوطنية — مديرية التربية لولاية ${wilaya}</p>
      <h1 class="doc-main-title">جدول التوقيت الأسبوعي لـلأستـاذ (EMPLOI DU TEMPS HEBDOMADAIRE)</h1>

      <div class="header-details-grid">
        <div class="header-col"><span>المؤسسة: </span><strong>${school}</strong></div>
        <div class="header-col"><span>الأستاذ(ة): </span><strong>${teacher}</strong></div>
        <div class="header-col"><span>المادة: </span><strong>${subject}</strong></div>
        <div class="header-col"><span>الموسم الدراسي: </span><strong>${academicYear}</strong></div>
        <div class="header-col"><span>ساعة الاستقبال: </span><strong>${options.classHoursSummary.receptionCount > 0 ? "معتمدة بالجدول" : "غير محددة"}</strong></div>
      </div>
    </header>

    <main>
      <table class="timetable-grid">
        <thead>
          <tr>
            <th class="th-day">اليوم / التوقيت</th>
            <th class="th-slot">08:00 - 09:00</th>
            <th class="th-slot">09:00 - 10:00</th>
            <th class="th-slot">10:00 - 11:00</th>
            <th class="th-slot">11:00 - 12:00</th>
            <th class="th-break">استراحة<br>${breakStart} - ${breakEnd}</th>
            <th class="th-slot">13:30 - 14:30</th>
            <th class="th-slot">14:30 - 15:30</th>
            <th class="th-slot">15:30 - 16:30</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="hours-summary-bar">
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span style="font-weight: 800; color: #334155;">توزيع ساعات التدريس:</span>
          ${classesSummaryCards}
        </div>
        <div class="total-hours-badge">
          الحجم الساعي الأسبوعي: ${options.classHoursSummary.activeTeachingHours} ساعة تدريس
        </div>
      </div>
    </main>

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

export function downloadTimetableLandscapePDF(options: TimetableReportOptions): void {
  const teacherFamily = (options.teacherName || "الأستاذ").trim().split(" ")[0];
  const calculatedDocTitle =
    options.docTitle ||
    options.fileName ||
    `جدول_التوقيت_الأسبوعي_الأستاذ_${teacherFamily}`;

  const htmlContent = generateTimetableLandscapeHTML({
    ...options,
    docTitle: calculatedDocTitle,
  });

  printHtmlInLandscapeIframe(htmlContent, calculatedDocTitle, "landscape-timetable-print-frame");
}

/* =========================================================================
   3. تقرير سجل التقويم المستمر والتنقيط الصفي (A4 Landscape)
   ========================================================================= */

export interface ContinuousColumnReportItem {
  id: string;
  title: string;
  maxScore: number;
  category?: string;
}

export interface BonusSessionReportItem {
  id: string;
  title: string;
  date?: string;
}

export interface ContinuousReportOptions {
  teacherName: string;
  schoolName: string;
  inspectorName?: string;
  principalName?: string;
  wilayaName?: string;
  subjectName?: string;
  academicYear?: string;
  className: string;
  trimester: number;
  columns: ContinuousColumnReportItem[];
  bonusSessions?: BonusSessionReportItem[];
  students: {
    id: string;
    studentName: string;
    gender?: string;
    groupName?: string;
    isRepeater?: boolean;
  }[];
  records: Record<
    string,
    {
      customScores?: Record<string, number>;
      bonusPoints?: number;
      continuousScore?: number;
      notes?: string;
    }
  >;
  classStats?: {
    avg: string;
    count: number;
    above10: number;
    missingTotal: number;
  };
  docTitle?: string;
  fileName?: string;
}

export function generateContinuousLandscapeHTML(options: ContinuousReportOptions): string {
  const teacher = options.teacherName || "الأستاذ(ة)";
  const school = options.schoolName || "المتوسطة التعليمية";
  const inspector = options.inspectorName || "السيد مفتش التربية الوطنية";
  const principal = options.principalName || "السيد مدير المؤسسة";
  const subject = options.subjectName || "الرياضيات";
  const wilaya = options.wilayaName || "الوادي";
  const academicYear = options.academicYear || "2025 / 2026 م";
  const className = options.className || "";
  const trimester = options.trimester || 1;
  const bonusSessions = options.bonusSessions || [];

  const count = options.students.length;
  const stats = options.classStats || { avg: "0.00", count, above10: 0, missingTotal: 0 };
  const pct = count > 0 ? Math.round((stats.above10 / count) * 100) : 0;

  const rowsHtml = options.students
    .map((student, idx) => {
      const isAlt = idx % 2 === 1;
      const key = `${className.replace(/\s+/g, "")}_${student.studentName.trim()}_T${trimester}`;
      const rec = options.records[key] || {};
      const customScores = rec.customScores || {};
      const bonus = rec.bonusPoints ?? 0;
      const finalScore = rec.continuousScore ?? 0;

      // درجات أعمدة التقويم
      const colCells = options.columns
        .map((col) => {
          const isMissing = customScores[`missing_${col.id}`] === 1;
          if (isMissing) {
            return `<td class="cell-score cell-missing"><span class="badge-missing">لم يحضر</span></td>`;
          }
          const val = customScores[col.id];
          return `<td class="cell-score">${val !== undefined ? val : "0"}</td>`;
        })
        .join("");

      // درجات حصص النقاط الإضافية
      const bonusCells = bonusSessions
        .map((sess) => {
          const val = customScores[sess.id];
          return `<td class="cell-bonus">${val !== undefined && val > 0 ? `+${val}` : "0"}</td>`;
        })
        .join("");

      return `
        <tr class="${isAlt ? "row-alt" : "row-white"}">
          <td class="col-num">${idx + 1}</td>
          <td class="col-name">${student.studentName}</td>
          ${colCells}
          ${bonusCells}
          <td class="cell-bonus-total">${bonus > 0 ? `+${bonus}` : "0"}</td>
          <td class="cell-final-score ${finalScore >= 10 ? "score-high" : "score-low"}">
            ${finalScore.toFixed(2)}
          </td>
          <td class="col-notes">${rec.notes || ""}</td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${options.docTitle || `سجل_التقويم_المستمر_فوج_${className}_الفصل_${trimester}_الأستاذ_${teacher}`}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

    @page {
      size: A4 landscape;
      margin: 8mm 10mm 8mm 10mm;
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
      line-height: 1.35;
      direction: rtl;
      text-align: right;
    }

    .report-container {
      width: 100%;
      max-width: 277mm;
      margin: 0 auto;
    }

    .official-header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 5px;
      margin-bottom: 8px;
      text-align: center;
    }

    .republic-text {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      margin: 0 0 1px 0;
    }

    .ministry-text {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      margin: 0 0 3px 0;
    }

    .doc-main-title {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 3px 0;
      letter-spacing: 0.2px;
    }

    .header-details-grid {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #cbd5e1;
      padding-top: 4px;
      margin-top: 4px;
      font-size: 11px;
    }

    .header-col strong {
      color: #0f172a;
      font-weight: 800;
    }

    /* شريط الإحصائيات */
    .stats-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 5px 10px;
      margin-bottom: 8px;
      font-size: 10.5px;
    }

    .stat-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 6px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      font-weight: 700;
    }
    .stat-emerald { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
    .stat-blue { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
    .stat-amber { background: #fffbeb; border-color: #fde68a; color: #92400e; }

    /* جدول التقويم */
    .eval-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f172a;
      font-size: 11px;
    }

    .eval-table thead {
      display: table-header-group;
    }

    .eval-table tr {
      page-break-inside: avoid;
    }

    .eval-table th {
      background: #1e293b;
      color: #ffffff;
      padding: 5px 4px;
      font-weight: 800;
      text-align: center;
      border: 1px solid #334155;
      font-size: 10px;
    }

    .eval-table td {
      border: 1px solid #cbd5e1;
      padding: 4px 6px;
      vertical-align: middle;
      text-align: center;
    }

    .th-col-title {
      font-size: 10.5px;
      display: block;
    }

    .th-max {
      font-size: 8.5px;
      color: #93c5fd;
      font-weight: 700;
    }

    .th-sess-date {
      font-size: 8px;
      color: #fde68a;
    }

    .th-final {
      background: #065f46 !important;
      color: #ffffff !important;
      font-size: 11px;
    }

    .col-num { width: 32px; font-weight: 800; color: #64748b; }
    .col-name { width: 190px; text-align: right !important; font-weight: 800; color: #0f172a; }
    .col-notes { font-size: 9.5px; color: #475569; text-align: right !important; }

    .cell-score {
      font-family: monospace;
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }

    .cell-bonus {
      font-family: monospace;
      font-size: 10px;
      color: #d97706;
      font-weight: 700;
      background: #fffbeb;
    }

    .cell-bonus-total {
      font-family: monospace;
      font-size: 11px;
      font-weight: 900;
      color: #b45309;
      background: #fef3c7;
    }

    .cell-final-score {
      font-family: monospace;
      font-size: 12px;
      font-weight: 900;
      background: #ecfdf5;
      width: 75px;
    }

    .score-high { color: #065f46; }
    .score-low { color: #b91c1c; }

    .badge-missing {
      display: inline-block;
      background: #fee2e2;
      color: #991b1b;
      font-size: 8.5px;
      font-weight: 800;
      padding: 1px 4px;
      border-radius: 4px;
      border: 1px solid #fecaca;
    }

    .row-alt { background: #f8fafc; }
    .row-white { background: #ffffff; }

    /* التوقيعات الرسمية */
    .signatures-block {
      margin-top: 14px;
      page-break-inside: avoid;
    }

    .signatures-grid {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    .signature-card {
      flex: 1;
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 7px 10px;
      text-align: center;
      min-height: 50px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #fafaf7;
      font-size: 10px;
      font-weight: 700;
      color: #475569;
    }

    .signer-name {
      font-size: 11px;
      font-weight: 900;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <header class="official-header">
      <p class="republic-text">الجمهورية الجزائرية الديمقراطية الشعبية</p>
      <p class="ministry-text">وزارة التربية الوطنية — مديرية التربية لولاية ${wilaya}</p>
      <h1 class="doc-main-title">سجل التقويم المستمر والتنقيط الصفي (CAHIER D'ÉVALUATION CONTINUE)</h1>

      <div class="header-details-grid">
        <div class="header-col"><span>المؤسسة: </span><strong>${school}</strong></div>
        <div class="header-col"><span>الفوج التربوي: </span><strong>فوج ${className}</strong></div>
        <div class="header-col"><span>الفصل الدراسي: </span><strong>الفصل ${trimester}</strong></div>
        <div class="header-col"><span>الأستاذ(ة): </span><strong>${teacher}</strong></div>
        <div class="header-col"><span>المادة: </span><strong>${subject}</strong></div>
        <div class="header-col"><span>الموسم الدراسي: </span><strong>${academicYear}</strong></div>
      </div>
    </header>

    <div class="stats-bar">
      <span class="stat-badge stat-blue">👥 إجمالي التلاميذ: <strong>${count}</strong></span>
      <span class="stat-badge stat-emerald">📊 معدل الفوج: <strong>${stats.avg} / 20</strong></span>
      <span class="stat-badge stat-emerald">⭐ الحاصلون على 10 فما فوق: <strong>${stats.above10}</strong> (${pct}%)</span>
      <span class="stat-badge stat-amber">⚠️ حالات نقص الكراس/الواجب: <strong>${stats.missingTotal}</strong></span>
    </div>

    <main>
      <table class="eval-table">
        <thead>
          <tr>
            <th class="col-num">الرقم</th>
            <th class="col-name" style="text-align: right;">اللقب والاسم الكامل</th>
            ${options.columns
              .map(
                (c) => `
                <th>
                  <span class="th-col-title">${c.title}</span>
                  <span class="th-max">(من ${c.maxScore})</span>
                </th>
              `
              )
              .join("")}
            ${bonusSessions
              .map(
                (s) => `
                <th style="background: #78350f;">
                  <span class="th-col-title">${s.title}</span>
                  ${s.date ? `<span class="th-sess-date">${s.date}</span>` : ""}
                </th>
              `
              )
              .join("")}
            <th style="background: #92400e;">نقاط إضافية (+)</th>
            <th class="th-final">علامة التقويم (20)</th>
            <th>ملاحظات وتوجيهات بيداغوجية</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </main>

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

export function downloadContinuousLandscapePDF(options: ContinuousReportOptions): void {
  const teacherFamily = (options.teacherName || "الأستاذ").trim().split(" ")[0];
  const calculatedDocTitle =
    options.docTitle ||
    options.fileName ||
    `سجل_التقويم_المستمر_فوج_${options.className}_الفصل_${options.trimester}_الأستاذ_${teacherFamily}`;

  const htmlContent = generateContinuousLandscapeHTML({
    ...options,
    docTitle: calculatedDocTitle,
  });

  printHtmlInLandscapeIframe(htmlContent, calculatedDocTitle, "landscape-continuous-print-frame");
}

