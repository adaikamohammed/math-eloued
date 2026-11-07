import { CahierTextesEntry, TimetableSettings, TimetableSlot } from "./types";
import { getCurrentAcademicYear } from "./academicYear";

export interface CahierTextesPdfOptions {
  teacherName: string;
  qualification?: string;
  rank?: string;
  schoolName: string;
  inspectorName?: string;
  districtName?: string;
  principalName?: string;
  wilayaName?: string;
  subjectName?: string;
  className: string;
  weeklyHours?: string;
  timetableSlots?: TimetableSlot[];
  entries: CahierTextesEntry[];
  periodLabel?: string;
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

// حساب المستوى الدراسي من اسم الفوج (مثلاً 2م3 -> السنة الثانية متوسط)
function getLevelLabelFromClass(className: string): string {
  if (className.includes("1") || className.includes("أولى")) return "السنة الأولى متوسط";
  if (className.includes("2") || className.includes("ثانية")) return "السنة الثانية متوسط";
  if (className.includes("3") || className.includes("ثالثة")) return "السنة الثالثة متوسط";
  if (className.includes("4") || className.includes("رابعة")) return "السنة الرابعة متوسط";
  return "التعليم المتوسط";
}

/**
 * توليد كود HTML متكامل ومستقل لدفتر النصوص الميداني بمقاس A4 Landscape (أفقي 297mm × 210mm)
 * مطابق تماماً لسجل التدوين الميداني في دفتر النصوص للأستاذ محمد عدايكة
 */
export function generateCahierTextesHTML(options: CahierTextesPdfOptions): string {
  const teacher = options.teacherName || "الأستاذ(ة)";
  const qualification = options.qualification || "أستاذ التعليم المتوسط";
  const rank = options.rank || "أستاذ التعليم المتوسط";
  const school = options.schoolName || "المؤسسة التعليمية";
  const inspector = options.inspectorName || "السيد مفتش التعليم المتوسط";
  const district = options.districtName || "المقاطعة التفتيشية";
  const principal = options.principalName || "السيد مدير المؤسسة";
  const subject = options.subjectName || "الرياضيات";
  const wilaya = options.wilayaName || "الوادي";
  const cls = options.className || "2م3";
  const levelLabel = getLevelLabelFromClass(cls);
  const weeklyHours = options.weeklyHours || "5 حصص أسبوعياً";

  // فصل الحصص العادية عن حصص ملحق الأعمال الموجهة TD والاستدراك
  const standardEntries = options.entries.filter((e) => !e.isTdOrRemediation);
  const tdEntries = options.entries.filter((e) => e.isTdOrRemediation);

  // جدول التوقيت الخاص بهذا القسم
  const classTimetableSlots = (options.timetableSlots || []).filter(
    (s) => s.className === cls || (s.className && s.className.replace(/\s+/g, "") === cls.replace(/\s+/g, ""))
  );

  const timetableSummaryHtml =
    classTimetableSlots.length > 0
      ? classTimetableSlots
          .map((s, idx) => {
            const typeStr = s.sessionType === "td" ? " (أعمال موجهة TD)" : s.sessionType === "remedial" ? " (استدراك)" : ` (حصة ${idx + 1})`;
            return `<span>• <strong>${s.day}</strong>: ${s.start} - ${s.end}${typeStr}</span>`;
          })
          .join(" ")
      : `<span>• الأحد: 09:00 - 10:00 • الإثنين: 11:00 - 12:00 و 15:00 - 16:00 • الأربعاء: 08:00 - 09:00 • أعمال موجهة: الأربعاء 09:00 - 10:00</span>`;

  // تجميع الحصص العادية حسب الأسابيع والمقاطع
  const standardRowsHtml = standardEntries
    .map((item, idx) => {
      const fullDate = formatArabicFullDate(item.date);
      const rowBgClass = idx % 2 === 1 ? "row-alt" : "row-white";

      // بناء نقاط السيرورة الميدانية
      const points: string[] = [];
      if (item.warmup) {
        points.push(`<div>• <strong>تهيئة:</strong> ${item.warmup}</div>`);
      }
      if (item.proposedSituation) {
        points.push(`<div>• <strong>وضعية مقترحة:</strong> ${item.proposedSituation}</div>`);
      }
      if (item.summary) {
        points.push(`<div>• <strong>الحوصلة:</strong> ${item.summary}</div>`);
      }
      if (item.reinvestment) {
        points.push(`<div>• <strong>إعادة الاستثمار:</strong> ${item.reinvestment}</div>`);
      }
      if (item.homework) {
        points.push(`<div class="homework-line">• <strong>الواجب المنزلي:</strong> ${item.homework}</div>`);
      }
      if (item.notes) {
        points.push(`<div class="notes-line">• <strong>ملاحظة:</strong> ${item.notes}</div>`);
      }

      // في حال لم تكن النقاط مفصلة، نضع قالباً افتراضياً
      const pointsHtml =
        points.length > 0
          ? points.join("")
          : `
            <div>• <strong>تهيئة:</strong> تذكير بالمكتسبات القبلية والتهيئة الحافزة.</div>
            <div>• <strong>وضعية مقترحة:</strong> نشاط بناء التعلم واستنتاج الخاصية.</div>
            <div>• <strong>الحوصلة:</strong> صياغة وتثبيت المورد المعرفي بالدفتر.</div>
            <div>• <strong>إعادة الاستثمار:</strong> حل تطبيق صفي وتثبيت المكتسبات.</div>
          `;

      // شريط أسبوعي إن وجد
      const weekBanner = item.weekLabel
        ? `
          <tr class="week-banner-row">
            <td colspan="4" class="week-banner-cell">
              <span>🗓️ ${item.weekLabel}</span>
              ${item.section ? `<span class="sec-tag">— ${item.section}</span>` : ""}
            </td>
          </tr>
        `
        : "";

      return `
        ${weekBanner}
        <tr class="${rowBgClass}">
          <!-- 1. التاريخ -->
          <td class="col-date">
            <div class="day-name">${item.dayName}</div>
            <div class="full-date">${fullDate}</div>
          </td>

          <!-- 2. التوقيت -->
          <td class="col-time">
            <div class="time-text">${item.periodTime || "08:00 - 09:00"}</div>
            ${item.field ? `<div class="field-sub">${item.field}</div>` : ""}
          </td>

          <!-- 3. سير الحصة والعمل المنجز وسيرورة التعلم -->
          <td class="col-content">
            <div class="resource-title-row">
              <span class="session-type-badge">${item.sessionType || "درس ومورد"}</span>
              <span class="resource-title">${item.resourceTitle}</span>
            </div>
            <div class="points-container">
              ${pointsHtml}
            </div>
          </td>

          <!-- 4. الإمضاء -->
          <td class="col-signature">
            <div class="sig-name">${item.signature || teacher.split(" ")[0] || "الأستاذ(ة)"}</div>
            <div class="sig-hand">✍</div>
          </td>
        </tr>
      `;
    })
    .join("");

  // ملحق الأعمال الموجهة TD والاستدراك
  const tdRowsHtml = tdEntries
    .map((item, idx) => {
      const fullDate = formatArabicFullDate(item.date);
      const rowBgClass = idx % 2 === 1 ? "row-alt" : "row-white";

      return `
        <tr class="${rowBgClass}">
          <td class="col-date">
            <div class="day-name">${item.dayName}</div>
            <div class="full-date">${fullDate}</div>
            <div class="time-text">${item.periodTime || "09:00 - 10:00"}</div>
          </td>
          <td class="col-subgroup">
            <span class="subgroup-badge">${item.subgroup || "القسم كامل"}</span>
          </td>
          <td class="col-content">
            <div class="resource-title-row">
              <span class="session-type-badge">أعمال موجهة</span>
              <span class="resource-title">${item.resourceTitle}</span>
            </div>
            <div class="points-container">
              ${item.proposedSituation ? `<div>• <strong>موضوع الحصة:</strong> ${item.proposedSituation}</div>` : ""}
              ${item.summary ? `<div>• <strong>المعالجة والمتابعة:</strong> ${item.summary}</div>` : ""}
              ${item.homework ? `<div>• <strong>الواجب والمرافقة:</strong> ${item.homework}</div>` : ""}
            </div>
          </td>
          <td class="col-signature">
            <div class="sig-name">${item.signature || teacher.split(" ")[0] || "الأستاذ(ة)"}</div>
            <div class="sig-hand">✍</div>
          </td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>سجل التدوين الميداني في دفتر النصوص — ${cls} — ${teacher}</title>
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
      color: #0f172a;
      font-size: 11px;
      line-height: 1.45;
      direction: rtl;
      text-align: right;
    }

    .report-container {
      width: 100%;
      max-width: 277mm;
      margin: 0 auto;
    }

    /* ─── الترويسة وبطاقة الفوج الرسمية ─── */
    .official-header {
      border: 2px solid #0f172a;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      background: #f8fafc;
      page-break-inside: avoid;
    }

    .header-top {
      text-align: center;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 8px;
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
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 2px 0;
      letter-spacing: 0.3px;
    }

    .doc-french-subtitle {
      font-size: 10px;
      font-family: sans-serif;
      font-weight: 700;
      color: #64748b;
      margin: 0 0 4px 0;
      letter-spacing: 0.5px;
    }

    .subject-level-banner {
      font-size: 12px;
      font-weight: 800;
      color: #047857;
      margin: 0;
    }

    .header-info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px 16px;
      font-size: 10.5px;
      color: #334155;
    }

    .header-info-item strong {
      color: #0f172a;
    }

    .timetable-box {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dashed #cbd5e1;
      font-size: 10px;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .timetable-title {
      font-weight: 800;
      color: #0f172a;
    }

    /* ─── جدول دفتر النصوص ─── */
    .cahier-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
      margin-bottom: 16px;
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      overflow: hidden;
    }

    .cahier-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 7px 8px;
      font-weight: 800;
      font-size: 11px;
      border-left: 1px solid #334155;
      text-align: right;
    }

    .cahier-table th:last-child {
      border-left: none;
      text-align: center;
    }

    .th-date { width: 13%; text-align: center !important; }
    .th-time { width: 11%; text-align: center !important; }
    .th-content { width: 66%; }
    .th-sig { width: 10%; text-align: center !important; }

    .cahier-table td {
      padding: 7px 9px;
      vertical-align: top;
      border-left: 1px solid #cbd5e1;
      border-top: 1px solid #cbd5e1;
    }

    .cahier-table td:last-child {
      border-left: none;
    }

    .row-white { background: #ffffff; }
    .row-alt { background: #f8fafc; }

    /* عمود التاريخ */
    .col-date {
      text-align: center;
    }

    .day-name {
      font-weight: 800;
      font-size: 11.5px;
      color: #0f172a;
    }

    .full-date {
      font-size: 10px;
      color: #475569;
      font-weight: 600;
      margin-top: 2px;
    }

    /* عمود التوقيت */
    .col-time {
      text-align: center;
    }

    .time-text {
      font-family: monospace;
      font-weight: 800;
      font-size: 11px;
      color: #0f172a;
    }

    .field-sub {
      font-size: 9.5px;
      font-weight: 700;
      color: #047857;
      margin-top: 3px;
    }

    /* عمود المحتوى وسيرورة التعلم */
    .resource-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }

    .session-type-badge {
      display: inline-block;
      background: #e6f4ee;
      color: #047857;
      border: 1px solid rgba(4, 120, 87, 0.3);
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .resource-title {
      font-weight: 800;
      font-size: 12px;
      color: #0f172a;
      line-height: 1.35;
    }

    .points-container {
      font-size: 10.5px;
      color: #334155;
      line-height: 1.45;
    }

    .points-container div {
      margin-bottom: 3px;
    }

    .points-container strong {
      color: #0f172a;
    }

    .homework-line {
      color: #b45309;
      font-weight: 700;
      margin-top: 4px;
      padding-top: 3px;
      border-top: 1px dashed #e2e8f0;
    }

    .notes-line {
      color: #64748b;
      font-style: italic;
    }

    /* عمود الإمضاء */
    .col-signature {
      text-align: center;
      vertical-align: middle !important;
    }

    .sig-name {
      font-weight: 800;
      font-size: 11px;
      color: #0f172a;
    }

    .sig-hand {
      font-size: 16px;
      margin-top: 2px;
    }

    /* شريط الأسبوع والمقطع */
    .week-banner-row {
      page-break-after: avoid;
      break-after: avoid;
    }

    .week-banner-cell {
      background: #1e293b;
      color: #ffffff;
      padding: 6px 12px;
      font-weight: 800;
      font-size: 11px;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
    }

    .sec-tag {
      color: #7dd3fc;
      margin-right: 8px;
    }

    /* ملحق الأعمال الموجهة */
    .annex-section {
      page-break-before: always;
      break-before: page;
      margin-top: 18px;
    }

    .annex-title-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 8px 14px;
      border-radius: 6px 6px 0 0;
      font-size: 12px;
      font-weight: 800;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .col-subgroup {
      text-align: center;
      vertical-align: middle !important;
      width: 14%;
    }

    .subgroup-badge {
      display: inline-block;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 2px 8px;
      border-radius: 9999px;
      font-weight: 800;
      font-size: 10px;
      color: #334155;
    }

    /* ─── تأشيرات الإدارة والمفتش في الأسفل ─── */
    .signatures-block {
      margin-top: 20px;
      padding-top: 10px;
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
    `دفتر_نصوص_فوج_${cls}_الأستاذ_${(teacher || "الأستاذ").trim().split(" ")[0]}_${(options.periodLabel || "كامل_الموسم").replace(/\s+/g, "_")}`
  }</title>
</head>
<body>
  <div class="report-container">
    <!-- الترويسة وبطاقة القسم -->
    <header class="official-header">
      <div class="header-top">
        <p class="republic-text">الجمهورية الجزائرية الديمقراطية الشعبية</p>
        <p class="ministry-text">وزارة التربية الوطنية — مديرية التربية لولاية ${wilaya}</p>
        <h1 class="doc-main-title">سجل التدوين الميداني في دفتر النصوص</h1>
        <p class="doc-french-subtitle">GUIDE DE RÉDACTION DU CAHIER DE TEXTES DE LA CLASSE</p>
        <p class="subject-level-banner">مـادة: ${subject} — ${levelLabel}</p>
      </div>

      <div class="header-info-grid">
        <div class="header-info-item"><span>المؤسسة: </span><strong>${school}</strong></div>
        <div class="header-info-item"><span>الفوج التربوي المعتمد: </span><strong>فوج ${cls} (${weeklyHours})</strong></div>
        <div class="header-info-item"><span>الأستاذ(ة): </span><strong>${teacher}</strong></div>
        <div class="header-info-item"><span>الفترة المحددة بالسجل: </span><strong style="color: #0369a1;">${options.periodLabel || `كامل الموسم الدراسي ${getCurrentAcademicYear()}`}</strong></div>
        <div class="header-info-item"><span>المقاطعة التفتيشية: </span><strong>${district}</strong></div>
        <div class="header-info-item"><span>السيد مفتش التربية الوطنية: </span><strong>${inspector}</strong></div>
      </div>

      <div class="timetable-box">
        <span class="timetable-title">🗓️ جدول التوقيت المعتمد لقسم (${cls}):</span>
        ${timetableSummaryHtml}
      </div>
    </header>

    <!-- جدول الحصص الميدانية العادية -->
    <main>
      <table class="cahier-table">
        <thead>
          <tr>
            <th class="th-date">التاريخ</th>
            <th class="th-time">التوقيت</th>
            <th class="th-content">سير الحصة والعمل المنجز (سيرورة التعلم)</th>
            <th class="th-sig">الإمضاء</th>
          </tr>
        </thead>
        <tbody>
          ${
            standardRowsHtml ||
            `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">لا توجد حصص مسجلة لهذا القسم بعد. يمكنك استيرادها بنقرة واحدة من الدفتر اليومي.</td></tr>`
          }
        </tbody>
      </table>

      <!-- ملحق الأعمال الموجهة TD والاستدراك (إن وجد) -->
      ${
        tdEntries.length > 0
          ? `
            <div class="annex-section">
              <div class="annex-title-bar">
                <span>الملحق الخاص: سجل حصص الأعمال الموجهة (TD) وسجل الاستدراك والمعالجة</span>
                <span>فوج ${cls}</span>
              </div>
              <table class="cahier-table" style="border-radius: 0 0 6px 6px;">
                <thead>
                  <tr>
                    <th class="th-date">التاريخ والتوقيت</th>
                    <th style="width: 14%; text-align: center;">الفوج المستهدف</th>
                    <th class="th-content">العمل المنجز في الفوج صفياً والمتابعة</th>
                    <th class="th-sig">الإمضاء</th>
                  </tr>
                </thead>
                <tbody>
                  ${tdRowsHtml}
                </tbody>
              </table>
            </div>
          `
          : ""
      }
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
 * فتح إطار طباعة منسق بدقة A4 Landscape لدفتر نصوص القسم
 */
export function printCahierTextesReport(options: CahierTextesPdfOptions): void {
  if (typeof window === "undefined") return;

  const teacherFamily = (options.teacherName || "الأستاذ").trim().split(" ")[0];
  const cls = options.className || "2م3";
  const periodSafe = (options.periodLabel || "كامل_الموسم").replace(/\s+/g, "_");
  const calculatedDocTitle =
    options.docTitle ||
    options.fileName ||
    `دفتر_نصوص_فوج_${cls}_الأستاذ_${teacherFamily}_${periodSafe}`;

  const htmlContent = generateCahierTextesHTML({
    ...options,
    docTitle: calculatedDocTitle,
  });

  let printIframe = document.getElementById("cahier-textes-print-frame") as HTMLIFrameElement | null;
  if (printIframe) {
    document.body.removeChild(printIframe);
  }

  printIframe = document.createElement("iframe");
  printIframe.id = "cahier-textes-print-frame";
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
      win.document.title = calculatedDocTitle;
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
      window.top.document.title = calculatedDocTitle;
    }
  } catch {}

  doc.open();
  doc.write(htmlContent);
  doc.title = calculatedDocTitle;
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
 * تنزيل دفتر نصوص القسم كملف PDF أفقي
 */
export function downloadCahierTextesPDF(options: CahierTextesPdfOptions): void {
  printCahierTextesReport(options);
}
