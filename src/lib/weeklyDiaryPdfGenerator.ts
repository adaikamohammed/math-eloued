import { DailyDiaryEntry, TimetableSettings } from "./types";
import { getCurrentAcademicYear } from "./academicYear";

export interface WeeklyPdfDayInfo {
  name: string;
  dateStr: string;
}

export interface WeeklyDiaryPdfOptions {
  teacherName: string;
  schoolName: string;
  inspectorName?: string;
  principalName?: string;
  wilayaName?: string;
  subjectName?: string;
  academicYear?: string;
  isBlankTemplate?: boolean;
  weekStartStr: string; // e.g. "2026-10-04"
  weekEndStr: string;   // e.g. "2026-10-08"
  orientation?: "days-as-rows" | "days-as-cols";
  morningSlots: string[];
  afternoonSlots: string[];
  schoolDays: WeeklyPdfDayInfo[];
  dayLessonsMap: Record<string, DailyDiaryEntry[]>;
  customClasses?: string[];
  classColorsMap?: Record<string, string>;
  docTitle?: string;
  fileName?: string;
}

// تنسيق التاريخ بالعربية (مثلاً: 05 أكتوبر 2026)
function formatArabicDate(dateStr: string): string {
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

// تنظيف عنوان المورد لحذف العناوين الداخلية والزوائد
function cleanResourceTitleForWeekly(title: string): string {
  if (!title) return "";
  return title
    .replace(/^الدرس\s*[:\-]?\s*/i, "")
    .replace(/^المورد\s*\d*\s*[:\-]?\s*/i, "")
    .replace(/^مذكرة\s*\d*\s*[:\-]?\s*/i, "")
    .replace(/^حصة\s*\d*\s*[:\-]?\s*/i, "")
    .replace(/^تمهيدي\s*[:\-]?\s*/i, "")
    .replace(/^وسيطي\s*[:\-]?\s*/i, "")
    .replace(/^نهائي\s*[:\-]?\s*/i, "")
    .trim();
}

/**
 * توليد كود HTML مستقل للمخطط الأسبوعي بمقاس A4 Landscape
 */
export function generateWeeklyDiaryHTML(options: WeeklyDiaryPdfOptions): string {
  const teacher = options.teacherName || "الأستاذ(ة)";
  const school = options.schoolName || "المؤسسة التعليمية";
  const inspector = options.inspectorName || "السيد مفتش التربية الوطنية";
  const principal = options.principalName || "السيد مدير المؤسسة";
  const subject = options.subjectName || "الرياضيات";
  const wilaya = options.wilayaName || "الوادي";
  const academicYear = options.academicYear || getCurrentAcademicYear();
  const classColors = options.classColorsMap || {};
  const orientation = options.orientation || "days-as-rows";
  const isBlank = Boolean(options.isBlankTemplate);

  const morningSlots = options.morningSlots.length > 0 ? options.morningSlots : ["08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00"];
  const afternoonSlots = options.afternoonSlots.length > 0 ? options.afternoonSlots : ["13:30 - 14:30", "14:30 - 15:30", "15:30 - 16:30"];
  const allTimeSlots = [...morningSlots, ...afternoonSlots];

  const parseSlotMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const match = timeStr.trim().replace(/h/i, ":").match(/(\d{1,2}):(\d{2})/);
    if (match) return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    const hourOnly = timeStr.trim().match(/^(\d{1,2})/);
    if (hourOnly) return parseInt(hourOnly[1], 10) * 60;
    return null;
  };

  // Helper لإيجاد الحصة المطابقة ليوم وتوقيت محدد دون تكرار
  const findLesson = (dateStr: string, slotTime: string): DailyDiaryEntry | undefined => {
    const list = options.dayLessonsMap[dateStr] || [];
    const norm = (s: string) => s.replace(/\s+/g, "").replace(/[-–—]/g, "-");
    const targetNorm = norm(slotTime);
    const [targetStart] = targetNorm.split("-");

    // 1. مطابقة دقيقة أولاً
    const exact = list.find((e) => norm(e.periodTime || "") === targetNorm);
    if (exact) return exact;

    // 2. مطابقة دقيقة بوقت بداية الحصة بالدقائق لتفادي تداخل خانات الساعات
    const slotStartMin = parseSlotMinutes(targetStart);
    if (slotStartMin !== null) {
      return list.find((e) => {
        const entryParts = (e.periodTime || "").split(/[-–—]/);
        const entryStartMin = parseSlotMinutes(entryParts[0]);
        if (entryStartMin === null) return false;
        return Math.abs(entryStartMin - slotStartMin) < 15;
      });
    }

    return undefined;
  };

  let tableHtml = "";

  if (orientation === "days-as-rows") {
    // الأيام صفوف، والتوقيتات أعمدة
    tableHtml = `
      <table class="weekly-table">
        <thead>
          <tr>
            <th rowspan="2" class="col-day-header">اليوم / التاريخ</th>
            <th colspan="${morningSlots.length}" class="period-group morning-group">الفترة الصباحية</th>
            <th colspan="${afternoonSlots.length}" class="period-group afternoon-group">الفترة المسائية</th>
          </tr>
          <tr>
            ${morningSlots.map((s) => `<th class="time-header morning-time">${s}</th>`).join("")}
            ${afternoonSlots.map((s) => `<th class="time-header afternoon-time">${s}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${options.schoolDays.map((dayObj, idx) => {
            const rowClass = idx % 2 === 1 ? "row-alt" : "row-white";
            const fullDate = formatArabicDate(dayObj.dateStr);

            return `
              <tr class="${rowClass}">
                <td class="cell-day">
                  <div class="day-name">${dayObj.name}</div>
                  <div class="day-date">${fullDate}</div>
                </td>
                ${allTimeSlots.map((slot) => {
                  if (isBlank) {
                    return `
                      <td class="cell-slot empty-slot">
                        <div style="color: #cbd5e1; font-size: 10px; margin-bottom: 3px;">...................</div>
                        <div style="color: #e2e8f0; font-size: 9px;">...................</div>
                      </td>
                    `;
                  }
                  const lesson = findLesson(dayObj.dateStr, slot);
                  if (!lesson) {
                    return `<td class="cell-slot empty-slot"><span class="empty-mark">—</span></td>`;
                  }
                  const bgHex = classColors[lesson.className] || "#107a57";
                  const cleanTitle = cleanResourceTitleForWeekly(lesson.lessonTitle || (lesson as any).resourceTitle || "");

                  return `
                    <td class="cell-slot active-slot">
                      <div class="slot-badge" style="background-color: ${bgHex};">
                        ${lesson.className}
                      </div>
                      <div class="slot-title">${cleanTitle}</div>
                      ${lesson.sessionType && lesson.sessionType !== "درس ومورد" ? `<div class="slot-type">${lesson.sessionType}</div>` : ""}
                    </td>
                  `;
                }).join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  } else {
    // الأيام أعمدة، والتوقيتات صفوف
    tableHtml = `
      <table class="weekly-table">
        <thead>
          <tr>
            <th class="col-day-header">الفترة / التوقيت</th>
            ${options.schoolDays.map((d) => `
              <th class="day-col-header">
                <div class="day-name">${d.name}</div>
                <div class="day-date">${formatArabicDate(d.dateStr)}</div>
              </th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          <!-- الفترة الصباحية -->
          <tr class="section-divider-row">
            <td colspan="${options.schoolDays.length + 1}" class="section-divider morning-divider">الفترة الصباحية</td>
          </tr>
          ${morningSlots.map((slot, idx) => {
            const rowClass = idx % 2 === 1 ? "row-alt" : "row-white";
            return `
              <tr class="${rowClass}">
                <td class="cell-time-side morning-time">${slot}</td>
                ${options.schoolDays.map((d) => {
                  if (isBlank) {
                    return `
                      <td class="cell-slot empty-slot">
                        <div style="color: #cbd5e1; font-size: 10px; margin-bottom: 3px;">...................</div>
                        <div style="color: #e2e8f0; font-size: 9px;">...................</div>
                      </td>
                    `;
                  }
                  const lesson = findLesson(d.dateStr, slot);
                  if (!lesson) {
                    return `<td class="cell-slot empty-slot"><span class="empty-mark">—</span></td>`;
                  }
                  const bgHex = classColors[lesson.className] || "#107a57";
                  const cleanTitle = cleanResourceTitleForWeekly(lesson.lessonTitle || (lesson as any).resourceTitle || "");

                  return `
                    <td class="cell-slot active-slot">
                      <div class="slot-badge" style="background-color: ${bgHex};">${lesson.className}</div>
                      <div class="slot-title">${cleanTitle}</div>
                    </td>
                  `;
                }).join("")}
              </tr>
            `;
          }).join("")}

          <!-- الفترة المسائية -->
          <tr class="section-divider-row">
            <td colspan="${options.schoolDays.length + 1}" class="section-divider afternoon-divider">الفترة المسائية</td>
          </tr>
          ${afternoonSlots.map((slot, idx) => {
            const rowClass = idx % 2 === 1 ? "row-alt" : "row-white";
            return `
              <tr class="${rowClass}">
                <td class="cell-time-side afternoon-time">${slot}</td>
                ${options.schoolDays.map((d) => {
                  if (isBlank) {
                    return `
                      <td class="cell-slot empty-slot">
                        <div style="color: #cbd5e1; font-size: 10px; margin-bottom: 3px;">...................</div>
                        <div style="color: #e2e8f0; font-size: 9px;">...................</div>
                      </td>
                    `;
                  }
                  const lesson = findLesson(d.dateStr, slot);
                  if (!lesson) {
                    return `<td class="cell-slot empty-slot"><span class="empty-mark">—</span></td>`;
                  }
                  const bgHex = classColors[lesson.className] || "#107a57";
                  const cleanTitle = cleanResourceTitleForWeekly(lesson.lessonTitle || (lesson as any).resourceTitle || "");

                  return `
                    <td class="cell-slot active-slot">
                      <div class="slot-badge" style="background-color: ${bgHex};">${lesson.className}</div>
                      <div class="slot-title">${cleanTitle}</div>
                    </td>
                  `;
                }).join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>المخطط الأسبوعي للدفتر اليومي — ${teacher}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      color: #0f172a;
      background: #ffffff;
      direction: rtl;
    }
    .page-container {
      width: 100%;
      max-width: 277mm;
      margin: 0 auto;
      padding: 0;
      display: flex;
      flex-direction: column;
      min-height: 190mm;
      justify-content: space-between;
    }
    .official-header {
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      padding: 6px 12px;
      margin-bottom: 8px;
      background: #f8fafc;
    }
    .header-top {
      text-align: center;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .republic {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
    }
    .ministry {
      font-size: 10.5px;
      font-weight: 700;
      color: #475569;
    }
    .main-title {
      font-size: 14px;
      font-weight: 900;
      color: #0f172a;
      margin: 2px 0;
    }
    .week-range {
      font-size: 11px;
      font-weight: 800;
      color: #107a57;
    }
    .header-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1fr 1fr;
      gap: 6px;
      font-size: 10px;
    }
    .header-col strong {
      color: #0f172a;
      font-weight: 800;
    }
    .weekly-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f172a;
      margin-bottom: 8px;
    }
    .weekly-table th,
    .weekly-table td {
      border: 1px solid #94a3b8;
      padding: 4px 6px;
      text-align: center;
      vertical-align: middle;
    }
    .col-day-header {
      background: #1e293b;
      color: #ffffff;
      font-weight: 800;
      font-size: 10.5px;
      width: 13%;
    }
    .day-col-header {
      background: #1e293b;
      color: #ffffff;
      font-weight: 800;
      font-size: 10.5px;
    }
    .period-group {
      font-weight: 900;
      font-size: 10.5px;
      color: #ffffff;
      padding: 3px !important;
    }
    .morning-group {
      background: #0369a1;
    }
    .afternoon-group {
      background: #7c2d12;
    }
    .time-header {
      font-size: 9.5px;
      font-weight: 800;
      background: #f1f5f9;
      color: #0f172a;
      padding: 3px !important;
    }
    .cell-day {
      background: #f8fafc;
      font-weight: 800;
    }
    .day-name {
      font-size: 11.5px;
      font-weight: 900;
      color: #0f172a;
    }
    .day-date {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
    }
    .cell-time-side {
      font-weight: 800;
      font-size: 10px;
      background: #f8fafc;
    }
    .morning-time {
      border-bottom: 2px solid #0284c7;
    }
    .afternoon-time {
      border-bottom: 2px solid #b45309;
    }
    .section-divider {
      font-weight: 900;
      font-size: 10.5px;
      color: #ffffff;
      padding: 3px !important;
    }
    .morning-divider {
      background: #0284c7;
    }
    .afternoon-divider {
      background: #b45309;
    }
    .cell-slot {
      height: 48px;
      font-size: 10px;
      padding: 3px 4px !important;
    }
    .empty-slot {
      background: #ffffff;
      color: #cbd5e1;
    }
    .empty-mark {
      color: #cbd5e1;
      font-size: 14px;
    }
    .active-slot {
      background: #f0fdf4;
    }
    .slot-badge {
      display: inline-block;
      color: #ffffff;
      font-weight: 900;
      font-size: 9.5px;
      padding: 1px 6px;
      border-radius: 4px;
      margin-bottom: 2px;
    }
    .slot-title {
      font-weight: 800;
      font-size: 10px;
      color: #0f172a;
      line-height: 1.25;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .slot-type {
      font-size: 8.5px;
      font-weight: 700;
      color: #6b21a8;
      margin-top: 1px;
    }
    .row-alt {
      background: #fafaf9;
    }
    .row-white {
      background: #ffffff;
    }
    .signatures-block {
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      padding: 6px 12px;
      background: #f8fafc;
      page-break-inside: avoid;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      text-align: center;
    }
    .signature-card {
      border: 1px dashed #94a3b8;
      border-radius: 4px;
      padding: 6px;
      height: 45px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
    }
    .signature-card span {
      font-size: 9.5px;
      font-weight: 800;
      color: #334155;
    }
    .signature-card .signer-name {
      font-size: 9px;
      font-weight: 700;
      color: #0f172a;
    }
  </style>
  <title>${options.docTitle || `المخطط_الأسبوعي_الدفتر_اليومي_من_${options.weekStartStr}_إلى_${options.weekEndStr}_الأستاذ_${(options.teacherName || "الأستاذ").trim().split(" ")[0]}`}</title>
</head>
<body>
  <div class="page-container">
    <header class="official-header">
      <div class="header-top">
        <div class="republic">الجمهورية الجزائرية الديمقراطية الشعبية</div>
        <div class="ministry">وزارة التربية الوطنية — مديرية التربية لولاية ${wilaya}</div>
        <h1 class="main-title">${isBlank ? "المخطط الأسبوعي للدفتر اليومي — استمارة فارغة للتحضير والتخطيط اليدوي" : "المخطط الأسبوعي للدفتر اليومي البيداغوجي"}</h1>
        <div class="week-range">الأسبوع: من ${formatArabicDate(options.weekStartStr)} إلى ${formatArabicDate(options.weekEndStr)}</div>
      </div>
      <div class="header-grid">
        <div class="header-col"><span>المؤسسة: </span><strong>${school}</strong></div>
        <div class="header-col"><span>الأستاذ(ة): </span><strong>${teacher}</strong></div>
        <div class="header-col"><span>المادة: </span><strong>${subject}</strong></div>
        <div class="header-col"><span>الموسم: </span><strong>${academicYear}</strong></div>
      </div>
    </header>

    <main>
      ${tableHtml}
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

/**
 * فتح إطار طباعة A4 Landscape للمخطط الأسبوعي عبر iframe معزول
 */
export function printWeeklyDiaryReport(options: WeeklyDiaryPdfOptions): void {
  if (typeof window === "undefined") return;

  const teacherFamily = (options.teacherName || "الأستاذ").trim().split(" ")[0];
  const calculatedTitle =
    options.docTitle ||
    options.fileName ||
    (options.isBlankTemplate
      ? `المخطط_الأسبوعي_نموذج_فارغ_من_${options.weekStartStr}_إلى_${options.weekEndStr}_الأستاذ_${teacherFamily}`
      : `المخطط_الأسبوعي_الدفتر_اليومي_من_${options.weekStartStr}_إلى_${options.weekEndStr}_الأستاذ_${teacherFamily}`);

  const htmlContent = generateWeeklyDiaryHTML({
    ...options,
    docTitle: calculatedTitle,
  });

  let printIframe = document.getElementById("weekly-diary-print-frame") as HTMLIFrameElement | null;
  if (printIframe) {
    document.body.removeChild(printIframe);
  }

  printIframe = document.createElement("iframe");
  printIframe.id = "weekly-diary-print-frame";
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
      win.document.title = calculatedTitle;
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
    return;
  }

  // حفظ عنوان النافذة الأصلي وتعيين اسم المستند ليقترحه المتصفح عند حفظ PDF
  let originalTopTitle = "";
  try {
    if (window.top && window.top.document) {
      originalTopTitle = window.top.document.title;
      window.top.document.title = calculatedTitle;
    }
  } catch {}

  doc.open();
  doc.write(htmlContent);
  doc.title = calculatedTitle;
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
        win.document.title = calculatedTitle;
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
 * تنزيل المخطط الأسبوعي كملف PDF أفقي
 */
export function downloadWeeklyDiaryPDF(options: WeeklyDiaryPdfOptions): void {
  printWeeklyDiaryReport(options);
}
