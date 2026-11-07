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
 * توليد كود HTML مستقل فائق الجودة للمخطط الأسبوعي بمقاس A4 Landscape
 * ومطابق تماماً لنماذج وزارة التربية الوطنية مع ضمان ملاءمة الصفحة الفردية
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

  const morningSlots =
    options.morningSlots.length > 0
      ? options.morningSlots
      : ["08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00"];
  const afternoonSlots =
    options.afternoonSlots.length > 0
      ? options.afternoonSlots
      : ["13:30 - 14:30", "14:30 - 15:30", "15:30 - 16:30"];
  const allTimeSlots = [...morningSlots, ...afternoonSlots];

  const parseSlotMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const match = timeStr.trim().replace(/h/i, ":").match(/(\d{1,2}):(\d{2})/);
    if (match) return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    const hourOnly = timeStr.trim().match(/^(\d{1,2})/);
    if (hourOnly) return parseInt(hourOnly[1], 10) * 60;
    return null;
  };

  // إحصائيات الحصص في الأسبوع
  let totalSessionsCount = 0;
  const activeClassesSet = new Set<string>();
  Object.values(options.dayLessonsMap || {}).forEach((list) => {
    list.forEach((e) => {
      totalSessionsCount++;
      if (e.className && e.className !== "فراغ" && e.className !== "راحة") {
        activeClassesSet.add(e.className);
      }
    });
  });
  const classesList = Array.from(activeClassesSet).sort().join(" • ");

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
    // الأيام صفوف، والتوقيتات أعمدة (النمط القياسي المعتمد في التفتيش الجزائري)
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
                      <td class="cell-slot blank-slot">
                        <div class="blank-slot-box">
                          <div class="blank-head">
                            <span class="blank-label">فوج: .....</span>
                            <span class="blank-label">م: .....</span>
                          </div>
                          <div class="blank-lines">
                            <div class="blank-dotted-line">.....................................</div>
                            <div class="blank-dotted-line">.....................................</div>
                          </div>
                        </div>
                      </td>
                    `;
                  }
                  const lesson = findLesson(dayObj.dateStr, slot);
                  if (!lesson) {
                    return `<td class="cell-slot empty-slot"><span class="empty-dash">—</span></td>`;
                  }
                  const bgHex = classColors[lesson.className] || "#0f766e";
                  const cleanTitle = cleanResourceTitleForWeekly(
                    lesson.lessonTitle || (lesson as any).resourceTitle || ""
                  );
                  const noteNum = lesson.lessonNoteNumber ? `م:${lesson.lessonNoteNumber}` : "";
                  const sessionType =
                    lesson.sessionType &&
                    lesson.sessionType !== "درس ومورد" &&
                    lesson.sessionType !== "درس"
                      ? lesson.sessionType
                      : "";

                  return `
                    <td class="cell-slot active-slot">
                      <div class="slot-box">
                        <div class="slot-head">
                          <span class="slot-class-badge" style="background-color: ${bgHex};">${lesson.className}</span>
                          ${noteNum ? `<span class="slot-memo-badge">${noteNum}</span>` : ""}
                        </div>
                        <div class="slot-lesson-title" title="${cleanTitle}">${cleanTitle}</div>
                        ${sessionType ? `<div class="slot-session-type">${sessionType}</div>` : ""}
                      </div>
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
            <th class="col-day-header" style="width: 14%;">الفترة / التوقيت</th>
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
                      <td class="cell-slot blank-slot">
                        <div class="blank-slot-box">
                          <div class="blank-head">
                            <span class="blank-label">فوج: .....</span>
                            <span class="blank-label">م: .....</span>
                          </div>
                          <div class="blank-lines">
                            <div class="blank-dotted-line">.....................................</div>
                            <div class="blank-dotted-line">.....................................</div>
                          </div>
                        </div>
                      </td>
                    `;
                  }
                  const lesson = findLesson(d.dateStr, slot);
                  if (!lesson) {
                    return `<td class="cell-slot empty-slot"><span class="empty-dash">—</span></td>`;
                  }
                  const bgHex = classColors[lesson.className] || "#0f766e";
                  const cleanTitle = cleanResourceTitleForWeekly(
                    lesson.lessonTitle || (lesson as any).resourceTitle || ""
                  );
                  const noteNum = lesson.lessonNoteNumber ? `م:${lesson.lessonNoteNumber}` : "";

                  return `
                    <td class="cell-slot active-slot">
                      <div class="slot-box">
                        <div class="slot-head">
                          <span class="slot-class-badge" style="background-color: ${bgHex};">${lesson.className}</span>
                          ${noteNum ? `<span class="slot-memo-badge">${noteNum}</span>` : ""}
                        </div>
                        <div class="slot-lesson-title">${cleanTitle}</div>
                      </div>
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
                      <td class="cell-slot blank-slot">
                        <div class="blank-slot-box">
                          <div class="blank-head">
                            <span class="blank-label">فوج: .....</span>
                            <span class="blank-label">م: .....</span>
                          </div>
                          <div class="blank-lines">
                            <div class="blank-dotted-line">.....................................</div>
                            <div class="blank-dotted-line">.....................................</div>
                          </div>
                        </div>
                      </td>
                    `;
                  }
                  const lesson = findLesson(d.dateStr, slot);
                  if (!lesson) {
                    return `<td class="cell-slot empty-slot"><span class="empty-dash">—</span></td>`;
                  }
                  const bgHex = classColors[lesson.className] || "#0f766e";
                  const cleanTitle = cleanResourceTitleForWeekly(
                    lesson.lessonTitle || (lesson as any).resourceTitle || ""
                  );
                  const noteNum = lesson.lessonNoteNumber ? `م:${lesson.lessonNoteNumber}` : "";

                  return `
                    <td class="cell-slot active-slot">
                      <div class="slot-box">
                        <div class="slot-head">
                          <span class="slot-class-badge" style="background-color: ${bgHex};">${lesson.className}</span>
                          ${noteNum ? `<span class="slot-memo-badge">${noteNum}</span>` : ""}
                        </div>
                        <div class="slot-lesson-title">${cleanTitle}</div>
                      </div>
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

  const teacherFamily = teacher.trim().split(" ")[0] || "الأستاذ";
  const defaultTitle = isBlank
    ? `المخطط_الأسبوعي_نموذج_فارغ_من_${options.weekStartStr}_إلى_${options.weekEndStr}_الأستاذ_${teacherFamily}`
    : `المخطط_الأسبوعي_الدفتر_اليومي_من_${options.weekStartStr}_إلى_${options.weekEndStr}_الأستاذ_${teacherFamily}`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${options.docTitle || defaultTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

    @page {
      size: A4 landscape;
      margin: 6mm 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 10.5px;
      line-height: 1.3;
      color: #0f172a;
      background: #ffffff;
      direction: rtl;
      text-align: right;
    }
    .page-container {
      width: 100%;
      max-width: 281mm;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      min-height: 194mm;
      max-height: 196mm;
      justify-content: space-between;
      page-break-inside: avoid;
    }

    /* ─── الترويسة الوزارية الرسمية ─── */
    .official-header {
      border: 1.5px solid #0f172a;
      border-radius: 8px;
      padding: 5px 12px;
      background: #f8fafc;
      margin-bottom: 5px;
    }
    .header-top {
      text-align: center;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 3px;
      margin-bottom: 4px;
    }
    .republic-text {
      font-size: 11px;
      font-weight: 700;
      color: #334155;
      line-height: 1.2;
    }
    .ministry-text {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      line-height: 1.2;
      margin: 1px 0;
    }
    .doc-main-title {
      font-size: 13.5px;
      font-weight: 900;
      color: #0f172a;
      margin: 2px 0 1px 0;
      letter-spacing: 0.2px;
    }
    .doc-subtitle-fr {
      font-size: 8.5px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .week-range-badge {
      display: inline-block;
      background: #064e3b;
      color: #ffffff;
      padding: 1.5px 12px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 800;
      margin-top: 1px;
    }
    .header-info-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1fr 1fr;
      gap: 6px;
      font-size: 10px;
      color: #334155;
    }
    .header-info-grid strong {
      color: #0f172a;
      font-weight: 800;
    }

    /* ─── جدول المخطط الأسبوعي ─── */
    .weekly-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f172a;
      table-layout: fixed;
      margin-bottom: 4px;
    }
    .weekly-table th,
    .weekly-table td {
      border: 1px solid #94a3b8;
      text-align: center;
      vertical-align: middle;
      padding: 2.5px 3px;
    }
    .col-day-header {
      background: #0f172a;
      color: #ffffff;
      font-weight: 900;
      font-size: 10.5px;
      width: 12.5%;
    }
    .day-col-header {
      background: #0f172a;
      color: #ffffff;
      font-weight: 900;
      font-size: 10.5px;
    }
    .period-group {
      color: #ffffff;
      font-weight: 900;
      font-size: 10px;
      padding: 2.5px 0 !important;
      letter-spacing: 0.3px;
    }
    .morning-group {
      background: #1e3a5f;
    }
    .afternoon-group {
      background: #134e4a;
    }
    .time-header {
      font-size: 9px;
      font-weight: 800;
      background: #f1f5f9;
      color: #1e293b;
      padding: 2.5px 0 !important;
    }
    .morning-time {
      border-bottom: 2px solid #0284c7;
    }
    .afternoon-time {
      border-bottom: 2px solid #0d9488;
    }
    .cell-day {
      background: #f8fafc;
      padding: 3px !important;
    }
    .day-name {
      font-size: 11px;
      font-weight: 900;
      color: #0f172a;
    }
    .day-date {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
    }
    .cell-time-side {
      font-weight: 800;
      font-size: 9.5px;
      background: #f8fafc;
      padding: 2px !important;
    }
    .section-divider {
      font-weight: 900;
      font-size: 10px;
      color: #ffffff;
      padding: 2.5px !important;
    }
    .morning-divider {
      background: #1e3a5f;
    }
    .afternoon-divider {
      background: #134e4a;
    }

    /* ─── خانة الحصة العادية والمملوءة ─── */
    .cell-slot {
      height: 44px;
      padding: 2px 3px !important;
      position: relative;
    }
    .active-slot {
      background: #f0fdf4;
    }
    .slot-box {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 1px;
      height: 100%;
    }
    .slot-head {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin-bottom: 1px;
    }
    .slot-class-badge {
      display: inline-block;
      color: #ffffff;
      font-weight: 900;
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 4px;
      line-height: 1.2;
    }
    .slot-memo-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-weight: 800;
      font-size: 8px;
      padding: 1px 4px;
      border-radius: 3px;
      line-height: 1.2;
    }
    .slot-lesson-title {
      font-weight: 800;
      font-size: 9px;
      color: #0f172a;
      line-height: 1.2;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .slot-session-type {
      font-size: 7.5px;
      font-weight: 700;
      color: #6b21a8;
      background: #f3e8ff;
      border: 1px solid #d8b4fe;
      padding: 0 3px;
      border-radius: 3px;
      margin-top: 1px;
    }
    .empty-slot {
      background: #ffffff;
    }
    .empty-dash {
      color: #cbd5e1;
      font-size: 13px;
      font-weight: 700;
    }

    /* ─── خانة النموذج الفارغ للتدوين اليدوي ─── */
    .blank-slot {
      background: #ffffff;
    }
    .blank-slot-box {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      padding: 1px 0;
    }
    .blank-head {
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      font-weight: 800;
      color: #475569;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 1px;
    }
    .blank-lines {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 2px;
    }
    .blank-dotted-line {
      color: #cbd5e1;
      font-size: 8px;
      letter-spacing: 0.8px;
      line-height: 1;
      overflow: hidden;
      white-space: nowrap;
    }

    .row-alt {
      background: #fafaf9;
    }
    .row-white {
      background: #ffffff;
    }

    /* ─── شريط الملخص البيداغوجي ─── */
    .summary-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 9.5px;
      margin-bottom: 4px;
    }
    .summary-title {
      font-weight: 800;
      color: #334155;
    }
    .summary-badge {
      background: #0f172a;
      color: #ffffff;
      padding: 1.5px 8px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 9px;
    }

    /* ─── كتلة التأشيرات والتوقيعات ─── */
    .signatures-block {
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      padding: 4px 10px;
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
      border-radius: 5px;
      padding: 4px 8px;
      height: 42px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
    }
    .signature-card .card-role {
      font-size: 9px;
      font-weight: 800;
      color: #334155;
    }
    .signature-card .card-signer {
      font-size: 8.5px;
      font-weight: 800;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- الترويسة الوزارية الرسمية -->
    <header class="official-header">
      <div class="header-top">
        <p class="republic-text">الجمهورية الجزائرية الديمقراطية الشعبية</p>
        <p class="ministry-text">وزارة التربية الوطنية — مديرية التربية لولاية ${wilaya}</p>
        <h1 class="doc-main-title">
          ${
            isBlank
              ? "المخطط الأسبوعي للدفتر اليومي — استمارة فارغة للتحضير والتخطيط اليدوي"
              : "المخطط الأسبوعي للدفتر اليومي البيداغوجي"
          }
        </h1>
        <p class="doc-subtitle-fr">
          ${
            isBlank
              ? "PLANNING HEBDOMADAIRE DU CAHIER JOURNAL (MODÈLE VIERGE)"
              : "PLANNING HEBDOMADAIRE DU CAHIER JOURNAL PÉDAGOGIQUE"
          }
        </p>
        <div class="week-range-badge">
          الأسبوع من: ${formatArabicDate(options.weekStartStr)} إلى: ${formatArabicDate(options.weekEndStr)} • الموسم الدراسي: ${academicYear}
        </div>
      </div>
      <div class="header-info-grid">
        <div><span>المؤسسة: </span><strong>${school}</strong></div>
        <div><span>الأستاذ(ة): </span><strong>${teacher}</strong></div>
        <div><span>المادة: </span><strong>${subject}</strong></div>
        <div><span>المقاطعة: </span><strong>مديرية التربية لولاية ${wilaya}</strong></div>
      </div>
    </header>

    <!-- جدول المخطط الأسبوعي -->
    <main>
      ${tableHtml}

      <!-- شريط الملخص البيداغوجي -->
      <div class="summary-strip">
        ${
          isBlank
            ? `
              <span class="summary-title">✍️ مخطط أسبوعي شاغر مخصص للتخطيط المكتبي المسبق والتحضير بالقلم قبل إدراجه بالمنصة الرقمية.</span>
              <span class="summary-badge">الحجم الساعي الأسبوعي: ....... سا</span>
            `
            : `
              <span class="summary-title">📊 إجمالي الحصص المبرمجة لهذا الأسبوع: <strong>${totalSessionsCount} حصة</strong> ${classesList ? `(الأفواج: ${classesList})` : ""}</span>
              <span class="summary-badge">وثيقة بيداغوجية أسبوعية معتمدة</span>
            `
        }
      </div>
    </main>

    <!-- كتلة التأشيرات الرسمية الثلاثية -->
    <footer class="signatures-block">
      <div class="signatures-grid">
        <div class="signature-card">
          <span class="card-role">إمضاء وختم الأستاذ(ة)</span>
          <span class="card-signer">${teacher}</span>
        </div>
        <div class="signature-card">
          <span class="card-role">تأشيرة السيد مدير المؤسسة</span>
          <span class="card-signer">${principal}</span>
        </div>
        <div class="signature-card">
          <span class="card-role">تأشيرة السيد مفتش التربية الوطنية</span>
          <span class="card-signer">${inspector}</span>
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
