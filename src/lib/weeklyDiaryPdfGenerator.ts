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

// تنسيق التاريخ بالعربية (مثلاً: 08 نوفمبر 2026)
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

// تنظيف وتنسيق عنوان المورد والدرس مع الحفاظ على الأرقام والمصطلحات التعليمية
function cleanResourceTitleForWeekly(title: string): string {
  if (!title) return "";
  return title
    .replace(/^الدرس\s*[:\-]?\s*/i, "")
    .trim();
}

// تنسيق شارة رقم المذكرة مثلما يظهر في المنصة بالضبط (م:مذكرة رقم: 03)
function formatNoteBadge(rawNote?: string): string {
  if (!rawNote) return "";
  const trimmed = rawNote.trim();
  if (trimmed.startsWith("م:") || trimmed.startsWith("م :")) return trimmed;
  if (trimmed.startsWith("مذكرة")) return `م:${trimmed}`;
  return `م:مذكرة رقم: ${trimmed}`;
}

// توليد محتوى خانة الحصة الواحدة وفق الألوان والتنسيقات المعتمدة بالمنصة
function renderSlotContent(
  lesson: DailyDiaryEntry | undefined,
  classColors: Record<string, string>,
  isBlank: boolean
): string {
  if (isBlank) {
    return `
      <div class="blank-slot-box">
        <div class="blank-head">
          <span class="blank-label">فوج: .....</span>
          <span class="blank-label">م: .....</span>
        </div>
        <div class="blank-lines">
          <div class="blank-dotted-line">................................................</div>
          <div class="blank-dotted-line">................................................</div>
        </div>
      </div>
    `;
  }

  if (!lesson) {
    return `<span class="empty-dash">—</span>`;
  }

  const isFree =
    lesson.className === "فراغ" ||
    lesson.sessionType === "حصة شاغرة / فراغ" ||
    lesson.sessionType === "فراغ" ||
    lesson.lessonTitle === "شاغرة";

  const isParents =
    lesson.className === "أولياء التلاميذ" ||
    lesson.sessionType === "استقبال الأولياء" ||
    lesson.sessionType === "أولياء التلاميذ" ||
    (lesson.lessonTitle && lesson.lessonTitle.includes("استقبال أولياء"));

  const rawTitle = lesson.lessonTitle || (lesson as any).resourceTitle || "";
  const displayTitle = cleanResourceTitleForWeekly(rawTitle);

  // حالة استقبال الأولياء
  if (isParents) {
    return `
      <div class="slot-box">
        <div class="slot-head">
          <span class="slot-class-badge badge-teal">أولياء التلاميذ</span>
        </div>
        <div class="slot-lesson-title">${displayTitle || "ساعة استقبال أولياء التلاميذ والاستفسارات التربوية"}</div>
      </div>
    `;
  }

  // حالة حصة شاغرة أو فرض مادة أخرى (فراغ)
  if (isFree) {
    return `
      <div class="slot-box">
        <div class="slot-head">
          <span class="slot-class-badge badge-teal">فراغ</span>
        </div>
        <div class="slot-lesson-title">${displayTitle || "شاغرة"}</div>
      </div>
    `;
  }

  // حصة دراسية عادية
  const bgHex = classColors[lesson.className] || "#0f766e";
  const noteBadgeText = formatNoteBadge(lesson.lessonNoteNumber);

  return `
    <div class="slot-box">
      <div class="slot-head">
        <span class="slot-class-badge" style="background-color: ${bgHex};">${lesson.className}</span>
        ${noteBadgeText ? `<span class="slot-memo-badge">${noteBadgeText}</span>` : ""}
      </div>
      <div class="slot-lesson-title" title="${displayTitle}">${displayTitle}</div>
    </div>
  `;
}

/**
 * توليد كود HTML مستقل فائق الجودة للمخطط الأسبوعي بمقاس A4 Landscape
 * ومطابق بنسبة 100% للشكل الاحترافي للجدول في المنصة مع دعم الأيام كصفوف أو أعمدة
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
      : ["14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00"];
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
      if (e.className && e.className !== "راحة") {
        activeClassesSet.add(e.className);
      }
    });
  });
  const classesList = Array.from(activeClassesSet).sort().join(" ، ");

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
    // ─── الوضع 1: الأيام صفوف، والتوقيتات أعمدة ───
    tableHtml = `
      <table class="weekly-table">
        <thead>
          <tr>
            <th rowspan="2" class="col-main-header" style="width: 14%;">اليوم / التاريخ</th>
            <th colspan="${morningSlots.length}" class="section-divider morning-divider">الفترة الصباحية</th>
            <th colspan="${afternoonSlots.length}" class="section-divider afternoon-divider">الفترة المسائية</th>
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
                  const lesson = isBlank ? undefined : findLesson(dayObj.dateStr, slot);
                  const isCellActive = !isBlank && Boolean(lesson);
                  const cellClass = isBlank
                    ? "blank-slot"
                    : isCellActive
                    ? "active-slot"
                    : "empty-slot";

                  return `
                    <td class="cell-slot ${cellClass}">
                      ${renderSlotContent(lesson, classColors, isBlank)}
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
    // ─── الوضع 2: الأيام أعمدة، والتوقيتات صفوف (مطابق لجدول المنصة media_1794066212273_751289d8) ───
    tableHtml = `
      <table class="weekly-table">
        <thead>
          <tr>
            <th class="col-main-header" style="width: 13%;">الفترة / التوقيت</th>
            ${options.schoolDays.map((d) => `
              <th class="day-col-header">
                ${formatArabicDate(d.dateStr)}
              </th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          <!-- ─── قسم الفترة الصباحية ─── -->
          <tr class="section-divider-row">
            <td colspan="${options.schoolDays.length + 1}" class="section-divider morning-divider">الفترة الصباحية</td>
          </tr>
          ${morningSlots.map((slot, idx) => {
            const rowClass = idx % 2 === 1 ? "row-alt" : "row-white";
            return `
              <tr class="${rowClass}">
                <td class="cell-time-side">${slot}</td>
                ${options.schoolDays.map((d) => {
                  const lesson = isBlank ? undefined : findLesson(d.dateStr, slot);
                  const isCellActive = !isBlank && Boolean(lesson);
                  const cellClass = isBlank
                    ? "blank-slot"
                    : isCellActive
                    ? "active-slot"
                    : "empty-slot";

                  return `
                    <td class="cell-slot ${cellClass}">
                      ${renderSlotContent(lesson, classColors, isBlank)}
                    </td>
                  `;
                }).join("")}
              </tr>
            `;
          }).join("")}

          <!-- ─── قسم الفترة المسائية ─── -->
          <tr class="section-divider-row">
            <td colspan="${options.schoolDays.length + 1}" class="section-divider afternoon-divider">الفترة المسائية</td>
          </tr>
          ${afternoonSlots.map((slot, idx) => {
            const rowClass = idx % 2 === 1 ? "row-alt" : "row-white";
            return `
              <tr class="${rowClass}">
                <td class="cell-time-side">${slot}</td>
                ${options.schoolDays.map((d) => {
                  const lesson = isBlank ? undefined : findLesson(d.dateStr, slot);
                  const isCellActive = !isBlank && Boolean(lesson);
                  const cellClass = isBlank
                    ? "blank-slot"
                    : isCellActive
                    ? "active-slot"
                    : "empty-slot";

                  return `
                    <td class="cell-slot ${cellClass}">
                      ${renderSlotContent(lesson, classColors, isBlank)}
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');

    @page {
      size: A4 landscape;
      margin: 4mm 6mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
    }
    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
      font-size: 10px;
      line-height: 1.25;
      color: #0f172a;
      background: #ffffff;
      direction: rtl;
      text-align: right;
      -webkit-font-smoothing: antialiased;
    }
    .page-container {
      width: 100%;
      max-width: 285mm;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
    }

    /* ─── الترويسة الوزارية الرسمية ─── */
    .official-header {
      border: 1.5px solid #0f2942;
      border-radius: 8px;
      padding: 4px 12px;
      background: #f8fafc !important;
      margin-bottom: 4px;
      page-break-inside: avoid;
    }
    .header-top {
      text-align: center;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2px;
      margin-bottom: 3px;
    }
    .republic-text {
      font-size: 10.5px;
      font-weight: 700;
      color: #334155;
      line-height: 1.2;
    }
    .ministry-text {
      font-size: 9.5px;
      font-weight: 700;
      color: #475569;
      line-height: 1.2;
      margin: 1px 0;
    }
    .doc-main-title {
      font-size: 13px;
      font-weight: 900;
      color: #0f172a;
      margin: 1px 0;
      letter-spacing: 0.2px;
    }
    .doc-subtitle-fr {
      font-size: 8px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .week-range-badge {
      display: inline-block;
      background: #064e3b !important;
      color: #ffffff !important;
      padding: 1.5px 14px;
      border-radius: 9999px;
      font-size: 9.5px;
      font-weight: 800;
      margin-top: 1px;
    }
    .header-info-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1fr 1fr;
      gap: 4px 8px;
      font-size: 9.5px;
      color: #334155;
    }
    .header-info-grid strong {
      color: #0f172a;
      font-weight: 800;
    }

    /* ─── جدول المخطط الأسبوعي المطابق لشكل المنصة ─── */
    .weekly-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #0f2942;
      table-layout: fixed;
      margin-bottom: 3px;
      background: #ffffff;
    }
    .weekly-table th,
    .weekly-table td {
      border: 1px solid #cbd5e1;
      text-align: center;
      vertical-align: middle;
      padding: 2.5px 3px;
    }

    /* ترويسة الجدول العلوية (كحلي ملكي عميق مطابق للمنصة #0f2942) */
    .col-main-header {
      background: #0f2942 !important;
      color: #ffffff !important;
      font-weight: 900;
      font-size: 11px;
      padding: 5px 3px !important;
      letter-spacing: 0.2px;
    }
    .day-col-header {
      background: #0f2942 !important;
      color: #ffffff !important;
      font-weight: 800;
      font-size: 10.5px;
      padding: 5px 3px !important;
      letter-spacing: 0.2px;
      border-left: 1px solid rgba(255, 255, 255, 0.2) !important;
    }

    /* فواصل الفترات (صباحية #143e67 ومسائية #0c4e3e) */
    .section-divider {
      font-weight: 900;
      font-size: 11px;
      color: #ffffff !important;
      padding: 3.5px 0 !important;
      text-align: center;
      letter-spacing: 0.3px;
    }
    .morning-divider {
      background: #143e67 !important;
    }
    .afternoon-divider {
      background: #0c4e3e !important;
    }

    /* التوقيتات وساعات الحصص */
    .time-header {
      font-size: 9px;
      font-weight: 800;
      background: #f8fafc !important;
      color: #0f172a !important;
      padding: 3px 0 !important;
    }
    .morning-time {
      border-bottom: 2px solid #0284c7 !important;
    }
    .afternoon-time {
      border-bottom: 2px solid #0d9488 !important;
    }
    .cell-time-side {
      background: #ffffff !important;
      color: #0f172a !important;
      font-weight: 900;
      font-size: 10px;
      padding: 4px 2px !important;
      white-space: nowrap;
    }
    .cell-day {
      background: #f8fafc !important;
      padding: 3px !important;
    }
    .day-name {
      font-size: 10.5px;
      font-weight: 900;
      color: #0f172a;
    }
    .day-date {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
    }

    /* ─── خانات الحصص (Active / Empty / Blank) ─── */
    .cell-slot {
      height: 48px;
      padding: 2px 3px !important;
      position: relative;
    }
    .active-slot {
      background: #f0fdf9 !important; /* خلفية زمردية ناعمة جداً ومريحة مثل المنصة */
    }
    .empty-slot {
      background: #f8fafc !important;
    }
    .empty-dash {
      color: #94a3b8;
      font-size: 14px;
      font-weight: 800;
    }

    .slot-box {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 1.5px;
      height: 100%;
    }
    .slot-head {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      flex-wrap: wrap;
      margin-bottom: 1px;
    }
    .slot-class-badge {
      display: inline-block;
      color: #ffffff !important;
      font-weight: 900;
      font-size: 8.5px;
      padding: 1.5px 7px;
      border-radius: 6px;
      line-height: 1.2;
      white-space: nowrap;
    }
    .badge-teal {
      background-color: #0f766e !important;
    }
    .slot-memo-badge {
      display: inline-block;
      background: #0f172a !important;
      color: #ffffff !important;
      font-weight: 800;
      font-size: 8px;
      padding: 1.5px 5px;
      border-radius: 4px;
      line-height: 1.2;
      white-space: nowrap;
    }
    .slot-lesson-title {
      font-weight: 800;
      font-size: 9.2px;
      color: #0f172a !important;
      line-height: 1.25;
      text-align: center;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }

    /* خانة النموذج الشاغر للتحضير بالقلم */
    .blank-slot {
      background: #ffffff !important;
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
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 1px;
    }
    .blank-lines {
      display: flex;
      flex-direction: column;
      gap: 3px;
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
      background: #fafafa !important;
    }
    .row-white {
      background: #ffffff !important;
    }

    /* ─── شريط الملخص البيداغوجي المعتمد ─── */
    .summary-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc !important;
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 9.5px;
      margin-bottom: 3px;
    }
    .summary-title {
      font-weight: 800;
      color: #0f172a;
    }
    .summary-title strong {
      color: #0f172a;
      font-weight: 900;
    }
    .summary-badge {
      background: #0f2942 !important;
      color: #ffffff !important;
      padding: 2px 10px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 9px;
      white-space: nowrap;
    }

    /* ─── كتلة التأشيرات الرسمية الثلاثية ─── */
    .signatures-block {
      border: 1.5px solid #0f2942;
      border-radius: 6px;
      padding: 3px 10px;
      background: #f8fafc !important;
      page-break-inside: avoid;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      text-align: center;
    }
    .signature-card {
      border: 1px dashed #94a3b8;
      border-radius: 5px;
      padding: 3px 6px;
      height: 38px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff !important;
    }
    .signature-card .card-role {
      font-size: 8.5px;
      font-weight: 800;
      color: #334155;
    }
    .signature-card .card-signer {
      font-size: 8px;
      font-weight: 700;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- الترويسة الوزارية الرسمية -->
    <header class="official-header">
      <div class="header-top">
        <div class="republic-text">الجمهورية الجزائرية الديمقراطية الشعبية</div>
        <div class="ministry-text">وزارة التربية الوطنية — مديرية التربية لولاية ${wilaya}</div>
        <h1 class="doc-main-title">المخطط الأسبوعي للدفتر اليومي البيداغوجي</h1>
        <div class="doc-subtitle-fr">PLANNING HEBDOMADAIRE DU CAHIER DE TEXTES / JOURNAL</div>
        <div class="week-range-badge">
          نطاق الأسبوع: من الأحد ${formatArabicDate(options.weekStartStr)} إلى الخميس ${formatArabicDate(options.weekEndStr)}
        </div>
      </div>
      <div class="header-info-grid">
        <div><strong>المؤسسة:</strong> ${school}</div>
        <div><strong>الأستاذ(ة):</strong> ${teacher}</div>
        <div><strong>المادة:</strong> ${subject}</div>
        <div><strong>الموسم الدراسي:</strong> ${academicYear}</div>
      </div>
    </header>

    <!-- جدول المخطط الأسبوعي المنظم -->
    <main>
      ${tableHtml}

      <!-- شريط الملخص البيداغوجي -->
      <div class="summary-strip">
        <span class="summary-badge">وثيقة بيداغوجية أسبوعية معتمدة</span>
        <span class="summary-title">
          ${
            isBlank
              ? `✍️ مخطط أسبوعي شاغر مخصص للتخطيط المسبق والتحضير بالقلم قبل إدراجه بالمنصة الرقمية.`
              : `📊 إجمالي الحصص المبرمجة لهذا الأسبوع: <strong>${totalSessionsCount} حصة</strong> ${classesList ? `(الأفواج: ${classesList})` : ""}`
          }
        </span>
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
 * فتح إطار طباعة وحفظ A4 Landscape للمخطط الأسبوعي عبر iframe معزول
 * مع التحقق التام من تحميل خط Cairo لضمان خروج ملف PDF عالي الدقة وجميل
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
      setTimeout(() => win.print(), 500);
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

  const triggerPrint = () => {
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
        setTimeout(() => win.print(), 500);
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
  };

  // التأكد من اكتمال تحميل الخطوط العربية (Cairo) قبل إطلاق نافذة الطباعة / الحفظ
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready
      .then(() => setTimeout(triggerPrint, 250))
      .catch(() => setTimeout(triggerPrint, 600));
  } else {
    setTimeout(triggerPrint, 600);
  }
}

/**
 * تنزيل المخطط الأسبوعي كملف PDF أفقي مطابق تماماً لشكل المنصة
 */
export function downloadWeeklyDiaryPDF(options: WeeklyDiaryPdfOptions): void {
  printWeeklyDiaryReport(options);
}
