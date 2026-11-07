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

// تفكيك التاريخ إلى رقم اليوم واسم الشهر بالعربية (مثلاً: 8 نوفمبر)
function parseDateParts(dateStr: string): { dayNum: number; monthName: string; fullArabic: string } {
  if (!dateStr) return { dayNum: 1, monthName: "نوفمبر", fullArabic: "" };
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const months = [
      "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
      "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    const mName = months[month - 1] || "نوفمبر";
    const paddedDay = day < 10 ? `0${day}` : `${day}`;
    return {
      dayNum: day,
      monthName: mName,
      fullArabic: `${paddedDay} ${mName} ${year}`,
    };
  } catch {
    return { dayNum: 1, monthName: "نوفمبر", fullArabic: dateStr };
  }
}

// منظومة الألوان المشرقة والمتناسقة للأفواج (نفس كلاسات Tailwind في صفحة المنصة)
interface ClassTheme {
  bg: string;
  border: string;
  badge: string;
  text: string;
}

const CLASS_THEMES: Record<string, ClassTheme> = {
  emerald: { bg: "#ecfdf5", border: "#a7f3d0", badge: "#059669", text: "#065f46" },
  purple: { bg: "#faf5ff", border: "#e9d5ff", badge: "#9333ea", text: "#6b21a8" },
  sky: { bg: "#f0f9ff", border: "#bae6fd", badge: "#0284c7", text: "#0369a1" },
  green: { bg: "#f0fdf4", border: "#bbf7d0", badge: "#16a34a", text: "#15803d" },
  amber: { bg: "#fffbeb", border: "#fde68a", badge: "#d97706", text: "#b45309" },
  rose: { bg: "#fff1f2", border: "#fecdd3", badge: "#e11d48", text: "#be123c" },
  indigo: { bg: "#eef2ff", border: "#c7d2fe", badge: "#4f46e5", text: "#4338ca" },
  teal: { bg: "#f0fdfa", border: "#99f6e4", badge: "#0d9488", text: "#0f766e" },
};

function getClassTheme(className: string): ClassTheme {
  if (!className) return CLASS_THEMES.emerald;
  const c = className.trim();
  if (c.includes("3م2")) return CLASS_THEMES.purple;
  if (c.includes("3م1")) return CLASS_THEMES.sky;
  if (c.includes("2م1")) return CLASS_THEMES.green;
  if (c.includes("1م1")) return CLASS_THEMES.emerald;
  if (c.includes("4م") || c.includes("رابعة")) return CLASS_THEMES.amber;

  // تجزئة لبقية الأفواج لتثبيت اللون
  const keys = Object.keys(CLASS_THEMES);
  let hash = 0;
  for (let i = 0; i < c.length; i++) hash = (hash << 5) - hash + c.charCodeAt(i);
  const key = keys[Math.abs(hash) % keys.length];
  return CLASS_THEMES[key] || CLASS_THEMES.emerald;
}

// توليد بطاقة الحصة طبق الأصل من المعروضة بالمنصة
function renderSessionCard(
  lesson: DailyDiaryEntry | undefined,
  isBlank: boolean
): string {
  if (isBlank) {
    return `
      <div class="blank-slot-card">
        <div class="blank-head">
          <span class="blank-label">فوج: .....</span>
          <span class="blank-label">مذكرة: .....</span>
        </div>
        <div class="blank-lines">
          <div class="blank-dotted-line">................................................</div>
          <div class="blank-dotted-line">................................................</div>
        </div>
      </div>
    `;
  }

  if (!lesson) {
    return `
      <div class="empty-slot-card">
        <span class="empty-dash">— فارغة —</span>
      </div>
    `;
  }

  const isFree =
    lesson.className === "فراغ" ||
    lesson.sessionType === "حصة شاغرة / فراغ" ||
    lesson.sessionType === "فراغ" ||
    lesson.lessonTitle === "شاغرة" ||
    (lesson.lessonTitle && lesson.lessonTitle.includes("شاغر"));

  const isParents =
    lesson.className === "أولياء التلاميذ" ||
    lesson.sessionType === "استقبال الأولياء" ||
    lesson.sessionType === "أولياء التلاميذ" ||
    (lesson.lessonTitle && lesson.lessonTitle.includes("استقبال"));

  const rawTitle = (lesson.lessonTitle || (lesson as any).resourceTitle || "").trim();
  const sectionText = lesson.section ? lesson.section.trim() : "";
  const homeworkText = lesson.homework ? lesson.homework.trim() : "";

  // 1. استقبال الأولياء
  if (isParents) {
    return `
      <div class="slot-card card-parents">
        <div class="slot-card-top">
          <span class="slot-badge badge-parents">🤝 استقبال</span>
        </div>
        <div class="slot-card-body">
          <h4 class="slot-title">${rawTitle || "ساعة استقبال أولياء التلاميذ والاستفسارات التربوية"}</h4>
          ${sectionText ? `<p class="slot-section">${sectionText}</p>` : ""}
        </div>
      </div>
    `;
  }

  // 2. حصة شاغرة أو فرض مادة أخرى
  if (isFree) {
    return `
      <div class="slot-card card-free">
        <div class="slot-card-top">
          <span class="slot-badge badge-free">☕ شاغرة</span>
        </div>
        <div class="slot-card-body">
          <h4 class="slot-title title-free">${rawTitle || "حصة شاغرة"}</h4>
          ${sectionText ? `<p class="slot-section">${sectionText}</p>` : ""}
        </div>
      </div>
    `;
  }

  // 3. حصة دراسية عادية
  const theme = getClassTheme(lesson.className);

  let memoHtml = "";
  if (lesson.lessonNoteNumber) {
    const raw = lesson.lessonNoteNumber.trim();
    const cleanNum = raw.replace(/^مذكرة\s*رقم:\s*/i, "").replace(/^م:\s*/i, "");
    memoHtml = `<span class="memo-pill">مذكرة رقم: ${cleanNum}</span>`;
  }

  return `
    <div class="slot-card" style="background-color: ${theme.bg}; border-color: ${theme.border};">
      <div class="slot-card-top">
        <span class="slot-badge" style="background-color: ${theme.badge}; color: #ffffff;">
          ${lesson.className}
        </span>
        ${memoHtml}
      </div>
      <div class="slot-card-body">
        <h4 class="slot-title">${rawTitle}</h4>
        ${sectionText ? `<p class="slot-section">${sectionText}</p>` : ""}
      </div>
      ${
        homeworkText
          ? `<div class="slot-homework"><span class="hw-bold">واجب:</span> ${homeworkText}</div>`
          : ""
      }
    </div>
  `;
}

/**
 * توليد كود HTML مستقل فائق الجودة للمخطط الأسبوعي بمقاس A4 Landscape
 * ومطابق بنسبة 100% للتصميم المشرق والأنيق الموجود على المنصة دون أي ألوان سوداء معتمة
 */
export function generateWeeklyDiaryHTML(options: WeeklyDiaryPdfOptions): string {
  const teacher = options.teacherName || "الأستاذ(ة)";
  const school = options.schoolName || "المؤسسة التعليمية";
  const inspector = options.inspectorName || "السيد مفتش التربية الوطنية";
  const principal = options.principalName || "السيد مدير المؤسسة";
  const subject = options.subjectName || "الرياضيات";
  const wilaya = options.wilayaName || "الوادي";
  const academicYear = options.academicYear || getCurrentAcademicYear();
  const orientation = options.orientation || "days-as-cols";
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

    const exact = list.find((e) => norm(e.periodTime || "") === targetNorm);
    if (exact) return exact;

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

  if (orientation === "days-as-cols") {
    // ─── الوضع المعتمد: الأيام أعمدة، والساعات صفوف (طبق الأصل من المنصة) ───
    tableHtml = `
      <table class="weekly-table">
        <thead>
          <tr class="header-row">
            <th class="col-main-header">التوقيت / اليوم</th>
            ${options.schoolDays.map((d) => {
              const { dayNum, monthName } = parseDateParts(d.dateStr);
              return `
                <th class="day-col-header">
                  <div class="day-col-name">${d.name}</div>
                  <div class="day-col-date">${dayNum} ${monthName}</div>
                </th>
              `;
            }).join("")}
          </tr>
        </thead>
        <tbody>
          <!-- الحصص الصباحية -->
          ${morningSlots.map((slot) => `
            <tr>
              <td class="cell-time-side">
                <div class="time-label">${slot}</div>
                <div class="period-sub-morning">الفترة الصباحية</div>
              </td>
              ${options.schoolDays.map((d) => {
                const lesson = isBlank ? undefined : findLesson(d.dateStr, slot);
                return `
                  <td class="cell-slot">
                    ${renderSessionCard(lesson, isBlank)}
                  </td>
                `;
              }).join("")}
            </tr>
          `).join("")}

          <!-- فاصل ناعم وخفيف بين الفترتين -->
          <tr class="mid-divider-row">
            <td colspan="${options.schoolDays.length + 1}" class="mid-divider-cell">
              <span>استراحة منتصف النهار (12:00 — 14:00)</span>
            </td>
          </tr>

          <!-- الحصص المسائية -->
          ${afternoonSlots.map((slot) => `
            <tr>
              <td class="cell-time-side">
                <div class="time-label">${slot}</div>
                <div class="period-sub-afternoon">الفترة المسائية</div>
              </td>
              ${options.schoolDays.map((d) => {
                const lesson = isBlank ? undefined : findLesson(d.dateStr, slot);
                return `
                  <td class="cell-slot">
                    ${renderSessionCard(lesson, isBlank)}
                  </td>
                `;
              }).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } else {
    // ─── الوضع الأفقي: الأيام صفوف، والساعات أعمدة ───
    tableHtml = `
      <table class="weekly-table">
        <thead>
          <tr class="header-row">
            <th rowspan="2" class="col-main-header">اليوم والتاريخ</th>
            <th colspan="${morningSlots.length}" class="group-header morning-group-header">الفترة الصباحية (08:00 — 12:00)</th>
            <th colspan="${afternoonSlots.length}" class="group-header afternoon-group-header">الفترة المسائية (14:00 — 17:00)</th>
          </tr>
          <tr class="header-sub-row">
            ${morningSlots.map((s) => `<th class="time-sub-header">${s}</th>`).join("")}
            ${afternoonSlots.map((s) => `<th class="time-sub-header">${s}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${options.schoolDays.map((dayObj) => {
            const { dayNum, monthName } = parseDateParts(dayObj.dateStr);
            return `
              <tr>
                <td class="cell-day-side">
                  <div class="day-col-name">${dayObj.name}</div>
                  <div class="day-col-date">${dayNum} ${monthName}</div>
                </td>
                ${allTimeSlots.map((slot) => {
                  const lesson = isBlank ? undefined : findLesson(dayObj.dateStr, slot);
                  return `
                    <td class="cell-slot">
                      ${renderSessionCard(lesson, isBlank)}
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
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800;900&display=swap');

    @page {
      size: A4 landscape;
      margin: 4mm 5mm;
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
      line-height: 1.3;
      color: #0f172a;
      background: #ffffff;
      direction: rtl;
      text-align: right;
      -webkit-font-smoothing: antialiased;
    }
    .page-container {
      width: 100%;
      max-width: 288mm;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
    }

    /* ─── الترويسة الوزارية الرسمية الأنيقة ─── */
    .official-header {
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 5px 14px;
      background: #ffffff !important;
      margin-bottom: 5px;
      page-break-inside: avoid;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }
    .header-top {
      text-align: center;
      border-bottom: 1px solid #e2e8f0;
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
      font-size: 9.5px;
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
      font-size: 8px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .week-range-badge {
      display: inline-block;
      background: #059669 !important;
      color: #ffffff !important;
      padding: 2px 14px;
      border-radius: 9999px;
      font-size: 9.5px;
      font-weight: 800;
      margin-top: 1px;
    }
    .header-info-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1fr 1fr;
      gap: 4px 10px;
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
      border-collapse: separate;
      border-spacing: 0;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      overflow: hidden;
      table-layout: fixed;
      background: #ffffff;
      margin-bottom: 4px;
    }
    .weekly-table th,
    .weekly-table td {
      border-left: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .weekly-table th:last-child,
    .weekly-table td:last-child {
      border-left: none;
    }
    .weekly-table tr:last-child td {
      border-bottom: none;
    }

    /* سطر ترويسة الجدول العلوية (رمادي فاتح وناصع مثل المنصة) */
    .header-row {
      background: #f8fafc !important;
    }
    .col-main-header {
      background: #f1f5f9 !important;
      color: #1e293b !important;
      font-weight: 900;
      font-size: 11px;
      padding: 6px 4px !important;
      text-align: center;
      width: 12.5%;
      border-bottom: 1.5px solid #cbd5e1 !important;
    }
    .day-col-header {
      background: #f8fafc !important;
      padding: 6px 4px !important;
      text-align: center;
      border-bottom: 1.5px solid #cbd5e1 !important;
    }
    .day-col-name {
      font-size: 12px;
      font-weight: 900;
      color: #1e293b !important;
      line-height: 1.2;
    }
    .day-col-date {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b !important;
      margin-top: 1px;
    }

    /* عمود التوقيتات الأيمن */
    .cell-time-side {
      background: #f8fafc !important;
      text-align: center;
      padding: 4px 3px !important;
      width: 12.5%;
    }
    .cell-day-side {
      background: #f8fafc !important;
      text-align: center;
      padding: 4px 3px !important;
      width: 12.5%;
    }
    .time-label {
      font-size: 10.5px;
      font-weight: 900;
      color: #1e293b !important;
      line-height: 1.2;
      font-family: 'Cairo', monospace !important;
    }
    .period-sub-morning {
      font-size: 9px;
      font-weight: 800;
      color: #0284c7 !important;
      margin-top: 2px;
    }
    .period-sub-afternoon {
      font-size: 9px;
      font-weight: 800;
      color: #b45309 !important;
      margin-top: 2px;
    }

    /* فاصل منتصف النهار الخفيف */
    .mid-divider-row {
      background: #f8fafc !important;
    }
    .mid-divider-cell {
      text-align: center;
      padding: 3px 0 !important;
      font-size: 8.5px;
      font-weight: 800;
      color: #64748b !important;
      background: #f1f5f9 !important;
      border-top: 1px dashed #cbd5e1 !important;
      border-bottom: 1px dashed #cbd5e1 !important;
    }

    /* ترويسات الفترات في النمط الأفقي */
    .group-header {
      padding: 5px !important;
      text-align: center;
      font-size: 10px;
      font-weight: 900;
    }
    .morning-group-header {
      background: #f0f9ff !important;
      color: #0369a1 !important;
      border-bottom: 1px solid #bae6fd !important;
    }
    .afternoon-group-header {
      background: #fffbeb !important;
      color: #92400e !important;
      border-bottom: 1px solid #fde68a !important;
    }
    .time-sub-header {
      background: #ffffff !important;
      font-size: 9px;
      font-weight: 800;
      color: #1e293b !important;
      padding: 3px 0 !important;
      text-align: center;
      border-bottom: 1.5px solid #cbd5e1 !important;
    }

    /* خانة الخلية الحاضنة للبطاقة */
    .cell-slot {
      padding: 3px !important;
      height: 58px;
      vertical-align: stretch;
      background: #ffffff !important;
    }

    /* ─── بطاقة الحصة العائمة (نفس كروت المنصة) ─── */
    .slot-card {
      border-radius: 11px;
      border-width: 1px;
      border-style: solid;
      padding: 4px 6px;
      height: 100%;
      min-height: 52px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      text-align: right;
    }
    .slot-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      margin-bottom: 1px;
    }
    .slot-badge {
      display: inline-flex;
      align-items: center;
      font-weight: 900;
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 5px;
      line-height: 1.2;
      white-space: nowrap;
    }
    .memo-pill {
      display: inline-block;
      background: #ffffff !important;
      border: 1px solid #cbd5e1;
      color: #374151 !important;
      font-weight: 700;
      font-size: 8px;
      padding: 1px 5px;
      border-radius: 4px;
      line-height: 1.2;
      white-space: nowrap;
    }
    .slot-card-body {
      flex: 1;
    }
    .slot-title {
      font-weight: 900;
      font-size: 9.5px;
      color: #0f172a !important;
      line-height: 1.25;
      margin: 1px 0;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .slot-section {
      font-size: 8px;
      font-weight: 600;
      color: #64748b !important;
      line-height: 1.2;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      margin-top: 1px;
    }
    .slot-homework {
      border-top: 1px dashed #cbd5e1;
      margin-top: 2px;
      padding-top: 1px;
      font-size: 7.8px;
      color: #475569 !important;
      line-height: 1.2;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .hw-bold {
      font-weight: 800;
      color: #0f172a !important;
    }

    /* كارت استقبال الأولياء */
    .card-parents {
      background-color: #faf5ff !important;
      border-color: #e9d5ff !important;
    }
    .badge-parents {
      background-color: #9333ea !important;
      color: #ffffff !important;
    }

    /* كارت حصة شاغرة */
    .card-free {
      background-color: #f8fafc !important;
      border-color: #cbd5e1 !important;
      border-style: dashed !important;
    }
    .badge-free {
      background-color: #475569 !important;
      color: #ffffff !important;
    }
    .title-free {
      color: #334155 !important;
      font-weight: 800 !important;
    }

    /* كارت الخانة الفارغة غير المبرمجة */
    .empty-slot-card {
      border: 1px dashed #e2e8f0;
      background-color: #fafbfc !important;
      border-radius: 11px;
      height: 100%;
      min-height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: #94a3b8 !important;
      font-size: 8.5px;
      font-weight: 700;
    }
    .empty-dash {
      color: #94a3b8 !important;
    }

    /* كارت النموذج الشاغر للتحضير بالقلم */
    .blank-slot-card {
      border: 1px dashed #cbd5e1;
      background-color: #ffffff !important;
      border-radius: 11px;
      height: 100%;
      min-height: 52px;
      padding: 3px 5px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
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

    /* ─── شريط الملخص البيداغوجي المعتمد ─── */
    .summary-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 3.5px 12px;
      font-size: 9.5px;
      margin-top: 3px;
      margin-bottom: 4px;
    }
    .summary-title {
      font-weight: 800;
      color: #1e293b;
    }
    .summary-title strong {
      color: #0f172a;
      font-weight: 900;
    }
    .summary-badge {
      background: #0f766e !important;
      color: #ffffff !important;
      padding: 2px 10px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 9px;
      white-space: nowrap;
    }

    /* ─── كتلة التأشيرات الرسمية الثلاثية ─── */
    .signatures-block {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 4px 10px;
      background: #ffffff !important;
      page-break-inside: avoid;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      text-align: center;
    }
    .signature-card {
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 3px 6px;
      height: 38px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #f8fafc !important;
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
    <!-- الترويسة الوزارية الرسمية الأنيقة والمشرقة -->
    <header class="official-header">
      <div class="header-top">
        <div class="republic-text">الجمهورية الجزائرية الديمقراطية الشعبية</div>
        <div class="ministry-text">وزارة التربية الوطنية — مديرية التربية لولاية ${wilaya}</div>
        <h1 class="doc-main-title">المخطط الأسبوعي للدفتر اليومي البيداغوجي</h1>
        <div class="doc-subtitle-fr">PLANNING HEBDOMADAIRE DU CAHIER DE TEXTES / JOURNAL</div>
        <div class="week-range-badge">
          نطاق الأسبوع: من الأحد ${parseDateParts(options.weekStartStr).fullArabic} إلى الخميس ${parseDateParts(options.weekEndStr).fullArabic}
        </div>
      </div>
      <div class="header-info-grid">
        <div><strong>المؤسسة:</strong> ${school}</div>
        <div><strong>الأستاذ(ة):</strong> ${teacher}</div>
        <div><strong>المادة:</strong> ${subject}</div>
        <div><strong>الموسم الدراسي:</strong> ${academicYear}</div>
      </div>
    </header>

    <!-- جدول المخطط الأسبوعي (طبق الأصل من المنصة) -->
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
