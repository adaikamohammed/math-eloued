import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { execFileSync } from "child_process";

// ═════════════════════════════════════════════════════════════════
// إعدادات وبيانات المؤسسة
// ═════════════════════════════════════════════════════════════════
const SCHOOL_NAME = "متوسطة باهي علي";
const WILAYA = "ولاية الوادي";
const DISTRICT = "المقاطعة الأولى";
const SCHOOL_YEAR = "2026 / 2027";
const PLATFORM_NAME = "منصة جسور التعليمية";
const PLATFORM_URL = "https://jusoor-dz.vercel.app";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, "public", "screenshots");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "documents");
const TEMP_HTML_DIR = path.join(PROJECT_ROOT, "public", "temp_pdf_html");

// التأكد من وجود المجلدات
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(TEMP_HTML_DIR)) fs.mkdirSync(TEMP_HTML_DIR, { recursive: true });

function getBase64Image(filename: string): string {
  const filePath = path.join(SCREENSHOTS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`الصورة غير موجودة: ${filePath}`);
  }
  const ext = path.extname(filename).replace(".", "");
  const base64 = fs.readFileSync(filePath).toString("base64");
  return `data:image/${ext};base64,${base64}`;
}

async function main() {
  console.log("🚀 جاري إعداد ملفات PDF وطباعة دليل وملصق قاعة الأساتذة...");

  // 1. إنشاء رمز QR عالي الدقة
  const qrDataUrl = await QRCode.toDataURL(PLATFORM_URL, {
    width: 600,
    margin: 1,
    color: { dark: "#0a5c40", light: "#ffffff" },
  });

  // 2. تحميل السكرين شوتات الحقيقية
  const step1Img = getBase64Image("step1_register.png");
  const step2Img = getBase64Image("step2_teacher_space.png");
  const step3Img = getBase64Image("step3_classes_roster.png");
  const step4Img = getBase64Image("step4_board_journal.png");
  const step5Img = getBase64Image("step5_continuous_grading.png");
  const step6Img = getBase64Image("step6_daily_diary.png");

  // ═════════════════════════════════════════════════════════════════
  // أنماط CSS الموحدة للطباعة A4 الاحترافية
  // ═════════════════════════════════════════════════════════════════
  const commonStyles = `
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      font-family: 'Segoe UI', 'Cairo', 'Tajawal', Tahoma, Arial, sans-serif;
      direction: rtl;
      color: #0f172a;
    }
    .page-a4 {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      margin: 0 auto;
      padding: 10mm 12mm;
      background: #ffffff;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      break-after: page;
    }
    .header-official {
      text-align: center;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 7px;
      margin-bottom: 8px;
    }
    .header-official .country {
      font-size: 11.5pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .header-official .ministry {
      font-size: 10pt;
      font-weight: 700;
      color: #065f46;
      margin-top: 2px;
    }
    .header-official .school-badge {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      margin-top: 4px;
      background: #ecfdf5;
      padding: 3px 18px;
      border-radius: 999px;
      border: 1px solid #a7f3d0;
      font-size: 9.5pt;
      font-weight: 800;
      color: #047857;
    }
    .footer-official {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      margin-top: 6px;
    }
  `;

  // ═════════════════════════════════════════════════════════════════
  // 1. محتوى الورقة الأولى: الملصق الإعلاني الجذاب (A4 Poster)
  // ═════════════════════════════════════════════════════════════════
  const posterHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>ملصق قاعة الأساتذة - ${SCHOOL_NAME}</title>
  <style>
    ${commonStyles}
    .poster-hero {
      background: linear-gradient(135deg, #064e3b 0%, #047857 55%, #0f766e 100%);
      color: #ffffff;
      padding: 14px 18px;
      border-radius: 14px;
      text-align: center;
      box-shadow: 0 4px 14px rgba(6, 78, 59, 0.25);
      border: 1.5px solid #34d399;
      position: relative;
    }
    .poster-hero .pill {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.4);
      padding: 2px 14px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 800;
      color: #fef08a;
      margin-bottom: 5px;
    }
    .poster-hero h1 {
      margin: 0;
      font-size: 19pt;
      font-weight: 900;
      line-height: 1.25;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .poster-hero p {
      margin: 5px 0 0 0;
      font-size: 10pt;
      color: #d1fae5;
      font-weight: 600;
    }
    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 11px 0;
    }
    .feature-card {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      padding: 11px 13px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      border-right: 5px solid #059669;
    }
    .feature-card.gold { border-right-color: #d97706; background: #fffdfa; }
    .feature-card.blue { border-right-color: #0284c7; background: #f0f9ff; }
    .feature-card.purple { border-right-color: #7c3aed; background: #faf5ff; }
    .feature-card .f-title {
      font-size: 11pt;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .feature-card .f-desc {
      font-size: 8.8pt;
      color: #334155;
      line-height: 1.45;
      font-weight: 600;
      margin: 0;
    }
    .scan-section {
      background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%);
      border: 2px dashed #059669;
      border-radius: 14px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 10px;
    }
    .scan-info h3 {
      margin: 0 0 4px 0;
      font-size: 13pt;
      font-weight: 900;
      color: #065f46;
    }
    .scan-info p {
      margin: 0 0 6px 0;
      font-size: 9pt;
      color: #1e293b;
      font-weight: 600;
      line-height: 1.4;
    }
    .scan-url {
      display: inline-block;
      background: #047857;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 8px;
      font-size: 9.5pt;
      font-family: monospace;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .qr-box {
      width: 105px;
      height: 105px;
      background: #ffffff;
      padding: 4px;
      border-radius: 10px;
      border: 1.5px solid #059669;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      flex-shrink: 0;
    }
    .qr-box img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .signature-row {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 14px;
      margin-top: 4px;
    }
    .note-box {
      background: #fffbeb;
      border: 1.5px solid #fde68a;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 8.5pt;
      color: #92400e;
      line-height: 1.45;
      font-weight: 700;
    }
    .stamp-box {
      border: 2px dashed #64748b;
      border-radius: 12px;
      padding: 10px;
      text-align: center;
      background: #fafafa;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 95px;
    }
    .stamp-box .stamp-title {
      font-size: 9.5pt;
      font-weight: 900;
      color: #1e293b;
    }
    .stamp-box .stamp-footer {
      font-size: 8pt;
      color: #64748b;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="page-a4">
    <div>
      <div class="header-official">
        <div class="country">الجمهورية الجزائرية الديمقراطية الشعبية</div>
        <div class="ministry">وزارة التربية الوطنية — مديرية التربية لولاية الوادي</div>
        <div class="school-badge">
          <span>🏛️ ${SCHOOL_NAME}</span>
          <span>•</span>
          <span>📍 ${WILAYA}</span>
          <span>•</span>
          <span>🗓️ الموسم الدراسي: ${SCHOOL_YEAR}</span>
        </div>
      </div>

      <div class="poster-hero">
        <div class="pill">📣 إعلان هام لكافة أساتذة المتوسطة</div>
        <h1>انطلاق العمل عبر ${PLATFORM_NAME}</h1>
        <p>فضاء تربوي بيداغوجي متكامل يربط الأستاذ بالولي والتلميذ برؤية رقمية عصرية ومرنة</p>
      </div>

      <div class="features-grid">
        <div class="feature-card">
          <div class="f-title">📸 كراس السبورة والواجبات اليومية</div>
          <p class="f-desc">توثيق سبورة الحصة ونشر الواجبات والحلول النموذجية فورياً ليطلع عليها التلميذ والولي، وتيسير نقل الدرس للتلميذ الغائب دون عناء.</p>
        </div>

        <div class="feature-card gold">
          <div class="f-title">📱 التقويم المستمر بالهاتف في القسم</div>
          <p class="f-desc">رصد صفي يومي سريع بلمسات خفيفة (مشاركة، كراس، انضباط، استجوابات) مع الاحتساب الآلي التلقائي لمعدل 20/20 وفق المناشير الرسمية.</p>
        </div>

        <div class="feature-card blue">
          <div class="f-title">📝 الدفتر اليومي وكراس النصوص البيداغوجي</div>
          <p class="f-desc">تدوين الحصص والمقاطع والمفاهيم بدقة، مع ميزة نسخ وتكرار الدرس للأفواج المتوازية بنقرة واحدة لتوفير وقت وجهد الأستاذ.</p>
        </div>

        <div class="feature-card purple">
          <div class="f-title">🏆 لوحة الشرف وتحفيز التميز الدراسي</div>
          <p class="f-desc">إشادة فورية بجهود التلاميذ المتفوقين والمنضبطين، وتعزيز التنافس الإيجابي والشراكة الشفافة والوثيقة مع أولياء الأمور.</p>
        </div>
      </div>

      <div class="scan-section">
        <div class="scan-info">
          <h3>📲 كيف تبدأ؟ (الخطوة الأولى للأستاذ)</h3>
          <p>امسح رمز الاستجابة السريعة (QR Code) بكاميرا هاتفك أو افتح الرابط أدناه لإنشاء حسابك التعليمي في أقل من دقيقة واحدة:</p>
          <div class="scan-url">${PLATFORM_URL}</div>
        </div>
        <div class="qr-box">
          <img src="${qrDataUrl}" alt="QR Code" />
        </div>
      </div>

      <div class="signature-row">
        <div class="note-box">
          ⚠️ <strong>توجيه إداري بيداغوجي:</strong><br />
          يُرجى من كافة السيدات والسادة أساتذة المؤسسة الكرام المبادرة بإنشاء حساباتهم التعليمية واعتماد كود الأستاذ الخاص لمشاركته مع تلاميذ أفواجهم وأوليائهم وفق الدليل المصور المرفق.
        </div>
        <div class="stamp-box">
          <div class="stamp-title">تأشيرة وختم السيد مدير المتوسطة</div>
          <div class="stamp-footer">${SCHOOL_NAME} — حرر في: ......................</div>
        </div>
      </div>
    </div>

    <div class="footer-official">
      <div>${PLATFORM_NAME} • دليل قاعة الأساتذة الرسمية</div>
      <div>متوسطة باهي علي — ولاية الوادي</div>
      <div>صفحة 1 من 3 (الملصق الإعلاني)</div>
    </div>
  </div>
</body>
</html>`;

  // ═════════════════════════════════════════════════════════════════
  // 2. محتوى الورقة الثانية: دليل الأستاذ المصور (الخطوات 01، 02، 03)
  // ═════════════════════════════════════════════════════════════════
  const guidePage1Html = `
  <div class="page-a4">
    <div>
      <div class="header-official">
        <div class="country">الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التربية الوطنية</div>
        <div class="school-badge">
          <span>📘 دليل الأستاذ العملي المصور (الجزء 1)</span>
          <span>•</span>
          <span>🏛️ ${SCHOOL_NAME}</span>
          <span>•</span>
          <span>الموسم: ${SCHOOL_YEAR}</span>
        </div>
      </div>

      <!-- الخطوة 01 -->
      <div class="step-container">
        <div class="step-header">
          <span class="step-badge">الخطوة 01</span>
          <span class="step-title">إنشاء الحساب التعليمي الجديد للأستاذ</span>
        </div>
        <div class="step-content">
          <div class="step-img-box">
            <img src="${step1Img}" alt="إنشاء الحساب" />
          </div>
          <div class="step-text-box">
            <div class="bullet-item">
              <span class="b-num">1</span>
              <div>ادخل للرابط الرسمي وانقر على زر <strong>«إنشاء حساب جديد»</strong>.</div>
            </div>
            <div class="bullet-item">
              <span class="b-num">2</span>
              <div>اكتب <strong>الاسم واللقب الكامل</strong> كما هو معتمد في الإدارة التربوية.</div>
            </div>
            <div class="bullet-item">
              <span class="b-num">3</span>
              <div>اختر <strong>مادة التدريس</strong> (رياضيات، لغة عربية، علوم، فيزياء...).</div>
            </div>
            <div class="bullet-item">
              <span class="b-num">4</span>
              <div>حدد الولاية (الوادي) واكتب اسم المؤسسة: <strong>${SCHOOL_NAME}</strong>.</div>
            </div>
            <div class="bullet-item">
              <span class="b-num">5</span>
              <div>أدخل بريدك الإلكتروني وكلمة المرور الخاصة بك واضغط <strong>إنشاء الحساب</strong>.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- الخطوة 02 -->
      <div class="step-container">
        <div class="step-header">
          <span class="step-badge">الخطوة 02</span>
          <span class="step-title">فضاء الأستاذ، كود المادة، ورابط فضاء التلاميذ والأولياء</span>
        </div>
        <div class="step-content">
          <div class="step-img-box">
            <img src="${step2Img}" alt="فضاء الأستاذ" />
          </div>
          <div class="step-text-box">
            <div class="bullet-item">
              <span class="b-num">1</span>
              <div>بعد تسجيل الدخول يظهر <strong>فضائك التربوي الرسمي</strong> بهويتك ومادتك.</div>
            </div>
            <div class="bullet-item">
              <span class="b-num">2</span>
              <div><strong>كود الأستاذ الخاص (مثال: MTH-784):</strong> هو الكود التعريفي الذي تعطيه لتلاميذك ليحفظه الأولياء في هواتفهم.</div>
            </div>
            <div class="bullet-item">
              <span class="b-num">3</span>
              <div><strong>رابط فضاء التلميذ المباشر:</strong> يتيح للتلاميذ والأولياء متابعة الواجبات، الكراس اليومي، ومواعيد الاستقبال الرسمية.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- الخطوة 03 -->
      <div class="step-container">
        <div class="step-header">
          <span class="step-badge">الخطوة 03</span>
          <span class="step-title">إدارة الأفواج وقوائم التلاميذ وتقسيم التفويج</span>
        </div>
        <div class="step-content">
          <div class="step-img-box">
            <img src="${step3Img}" alt="إدارة الأفواج" />
          </div>
          <div class="step-text-box">
            <div class="bullet-item">
              <span class="b-num">1</span>
              <div>من القائمة الجانبية ادخل إلى <strong>«إدارة الأفواج والتلاميذ»</strong>.</div>
            </div>
            <div class="bullet-item">
              <span class="b-num">2</span>
              <div>أضف أقسامك المسندة (1م1، 1م2، 2م3...) واستورد قوائم التلاميذ بنقرة واحدة.</div>
            </div>
            <div class="bullet-item">
              <span class="b-num">3</span>
              <div>تحديد وتوزيع <strong>التفويج (فوج 1 / فوج 2)</strong> لتنظيم الحصص التطبيقية والعمل الجماعي داخل القسم.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-official">
      <div>${PLATFORM_NAME} • دليل الأستاذ العملي</div>
      <div>${SCHOOL_NAME}</div>
      <div>صفحة 2 من 3 (الجزء 1: الحساب والأفواج)</div>
    </div>
  </div>`;

  // ═════════════════════════════════════════════════════════════════
  // 3. محتوى الورقة الثالثة: دليل الأستاذ المصور (الخطوات 04، 05، 06)
  // ═════════════════════════════════════════════════════════════════
  const guidePage2Html = `
  <div class="page-a4">
    <div>
      <div class="header-official">
        <div class="country">الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التربية الوطنية</div>
        <div class="school-badge">
          <span>📙 دليل الأستاذ العملي المصور (الجزء 2)</span>
          <span>•</span>
          <span>🏛️ ${SCHOOL_NAME}</span>
          <span>•</span>
          <span>الموسم: ${SCHOOL_YEAR}</span>
        </div>
      </div>

      <!-- الخطوة 04 -->
      <div class="step-container">
        <div class="step-header">
          <span class="step-badge">الخطوة 04</span>
          <span class="step-title">توثيق سبورة الحصة ونشر الواجبات والحلول النموذجية</span>
        </div>
        <div class="step-content">
          <div class="step-img-box">
            <img src="${step4Img}" alt="كراس السبورة" />
          </div>
          <div class="step-text-box">
            <div class="bullet-item">
              <span class="b-num">1</span>
              <div>في نهاية الحصة، التقط صورة بكاميرا الهاتف للسبورة واضغط <strong>«رفع السبورة»</strong>.</div>
            </div>
            <div class="bullet-item">
              <span class="b-num">2</span>
              <div><strong>خدمة التلميذ الغائب:</strong> يستطيع التلميذ المريض أو الغائب فتح الكراس من هاتفه ونقل الدرس كاملاً دون الحاجة لاستعارة كراس زميله.</div>
            </div>
            <div class="bullet-item">
              <span class="b-num">3</span>
              <div>نشر الواجب المنزلي، موعد تسليمه، وحله النموذجي اللاحق لتعزيز المراجعة المنزلية.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- الخطوة 05 -->
      <div class="step-container">
        <div class="step-header">
          <span class="step-badge">الخطوة 05</span>
          <span class="step-title">التقويم المستمر بالهاتف في القسم والاحتساب الآلي</span>
        </div>
        <div class="step-content">
          <div class="step-img-box">
            <img src="${step5Img}" alt="التقويم المستمر" />
          </div>
          <div class="step-text-box">
            <div class="bullet-item">
              <span class="b-num">1</span>
              <div>افتح <strong>«دفتر التقويم المستمر»</strong> من هاتفك داخل حجرة الدرس.</div>
            </div>
            <div class="bullet-item">
              <span class="b-num">2</span>
              <div>رصد فوري وسريع بنقرة واحدة: مشاركة وانضباط (4ن)، كراس (2ن)، وظائف (2ن)، استجوابات (4ن).</div>
            </div>
            <div class="bullet-item">
              <span class="b-num">3</span>
              <div><strong>حساب فوري للمعدل:</strong> تحتسب المنصة المجموع من 20 تلقائياً وفق القرارات الوزارية وجاهز للتصدير لجدول الرصد الفصلي.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- الخطوة 06 -->
      <div class="step-container">
        <div class="step-header">
          <span class="step-badge">الخطوة 06</span>
          <span class="step-title">الدفتر اليومي، كراس النصوص، وتكرار الدروس للأفواج المتوازية</span>
        </div>
        <div class="step-content">
          <div class="step-img-box">
            <img src="${step6Img}" alt="الدفتر اليومي" />
          </div>
          <div class="step-text-box">
            <div class="bullet-item">
              <span class="b-num">1</span>
              <div>تدوين الحصة بذكاء: الميدان، المقطع التعلمي، المورد المعرفي، وسيرورة الحصة (تمهيدي، وسيطي، نهائي).</div>
            </div>
            <div class="bullet-item">
              <span class="b-num">2</span>
              <div><strong>تكرار الدرس بنقرة واحدة:</strong> إذا كان لديك نفس الدرس لقسم موازٍ (مثال: 1م2 بعد 1م1)، انسخ النشاط بضغطة زر دون إعادة الكتابة.</div>
            </div>
            <div class="bullet-item">
              <span class="b-num">3</span>
              <div>سجل نصوص ميداني رسمي جاهز للتفتيش والطباعة بضغطة واحدة.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-official">
      <div>${PLATFORM_NAME} • دليل الأستاذ العملي</div>
      <div>${SCHOOL_NAME}</div>
      <div>صفحة 3 من 3 (الجزء 2: السبورة والتقويم)</div>
    </div>
  </div>`;

  // الأنماط الخاصة بصفحات الدليل المصور
  const guideStyles = `
    .step-container {
      margin-bottom: 9px;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 11px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .step-header {
      background: linear-gradient(90deg, #ecfdf5 0%, #f1f5f9 100%);
      padding: 5px 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1.5px solid #cbd5e1;
    }
    .step-badge {
      background: #047857;
      color: #ffffff;
      font-size: 8.5pt;
      font-weight: 900;
      padding: 2px 9px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    .step-title {
      font-size: 10pt;
      font-weight: 800;
      color: #0f172a;
    }
    .step-content {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 12px;
      padding: 7px 10px;
      align-items: center;
    }
    .step-img-box {
      width: 100%;
      height: 145px;
      background: #f8fafc;
      border: 1px solid #94a3b8;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
    .step-img-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
      display: block;
    }
    .step-text-box {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .bullet-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 8.4pt;
      color: #1e293b;
      line-height: 1.35;
      font-weight: 600;
    }
    .b-num {
      background: #0f766e;
      color: #ffffff;
      width: 17px;
      height: 17px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7.5pt;
      font-weight: 900;
      flex-shrink: 0;
      margin-top: 1px;
    }
  `;

  // تجميع وثيقة الدليل المصور (الصفحتان 2 و 3)
  const guideHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>دليل الأستاذ المصور - ${SCHOOL_NAME}</title>
  <style>
    ${commonStyles}
    ${guideStyles}
  </style>
</head>
<body>
  ${guidePage1Html}
  ${guidePage2Html}
</body>
</html>`;

  // تجميع الوثيقة الشاملة (الأوراق الثلاثة معاً)
  const bundleHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>الحزمة الكاملة - قاعة الأساتذة - ${SCHOOL_NAME}</title>
  <style>
    ${commonStyles}
    ${guideStyles}
    .poster-hero {
      background: linear-gradient(135deg, #064e3b 0%, #047857 55%, #0f766e 100%);
      color: #ffffff;
      padding: 14px 18px;
      border-radius: 14px;
      text-align: center;
      box-shadow: 0 4px 14px rgba(6, 78, 59, 0.25);
      border: 1.5px solid #34d399;
      position: relative;
    }
    .poster-hero .pill {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.4);
      padding: 2px 14px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 800;
      color: #fef08a;
      margin-bottom: 5px;
    }
    .poster-hero h1 {
      margin: 0;
      font-size: 19pt;
      font-weight: 900;
      line-height: 1.25;
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .poster-hero p {
      margin: 5px 0 0 0;
      font-size: 10pt;
      color: #d1fae5;
      font-weight: 600;
    }
    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 11px 0;
    }
    .feature-card {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      padding: 11px 13px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      border-right: 5px solid #059669;
    }
    .feature-card.gold { border-right-color: #d97706; background: #fffdfa; }
    .feature-card.blue { border-right-color: #0284c7; background: #f0f9ff; }
    .feature-card.purple { border-right-color: #7c3aed; background: #faf5ff; }
    .feature-card .f-title {
      font-size: 11pt;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .feature-card .f-desc {
      font-size: 8.8pt;
      color: #334155;
      line-height: 1.45;
      font-weight: 600;
      margin: 0;
    }
    .scan-section {
      background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%);
      border: 2px dashed #059669;
      border-radius: 14px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 10px;
    }
    .scan-info h3 {
      margin: 0 0 4px 0;
      font-size: 13pt;
      font-weight: 900;
      color: #065f46;
    }
    .scan-info p {
      margin: 0 0 6px 0;
      font-size: 9pt;
      color: #1e293b;
      font-weight: 600;
      line-height: 1.4;
    }
    .scan-url {
      display: inline-block;
      background: #047857;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 8px;
      font-size: 9.5pt;
      font-family: monospace;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .qr-box {
      width: 105px;
      height: 105px;
      background: #ffffff;
      padding: 4px;
      border-radius: 10px;
      border: 1.5px solid #059669;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      flex-shrink: 0;
    }
    .qr-box img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .signature-row {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 14px;
      margin-top: 4px;
    }
    .note-box {
      background: #fffbeb;
      border: 1.5px solid #fde68a;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 8.5pt;
      color: #92400e;
      line-height: 1.45;
      font-weight: 700;
    }
    .stamp-box {
      border: 2px dashed #64748b;
      border-radius: 12px;
      padding: 10px;
      text-align: center;
      background: #fafafa;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 95px;
    }
    .stamp-box .stamp-title {
      font-size: 9.5pt;
      font-weight: 900;
      color: #1e293b;
    }
    .stamp-box .stamp-footer {
      font-size: 8pt;
      color: #64748b;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <!-- الصفحة 1: الملصق الإعلاني -->
  <div class="page-a4">
    <div>
      <div class="header-official">
        <div class="country">الجمهورية الجزائرية الديمقراطية الشعبية</div>
        <div class="ministry">وزارة التربية الوطنية — مديرية التربية لولاية الوادي</div>
        <div class="school-badge">
          <span>🏛️ ${SCHOOL_NAME}</span>
          <span>•</span>
          <span>📍 ${WILAYA}</span>
          <span>•</span>
          <span>🗓️ الموسم الدراسي: ${SCHOOL_YEAR}</span>
        </div>
      </div>

      <div class="poster-hero">
        <div class="pill">📣 إعلان هام لكافة أساتذة المتوسطة</div>
        <h1>انطلاق العمل عبر ${PLATFORM_NAME}</h1>
        <p>فضاء تربوي بيداغوجي متكامل يربط الأستاذ بالولي والتلميذ برؤية رقمية عصرية ومرنة</p>
      </div>

      <div class="features-grid">
        <div class="feature-card">
          <div class="f-title">📸 كراس السبورة والواجبات اليومية</div>
          <p class="f-desc">توثيق سبورة الحصة ونشر الواجبات والحلول النموذجية فورياً ليطلع عليها التلميذ والولي، وتيسير نقل الدرس للتلميذ الغائب دون عناء.</p>
        </div>

        <div class="feature-card gold">
          <div class="f-title">📱 التقويم المستمر بالهاتف في القسم</div>
          <p class="f-desc">رصد صفي يومي سريع بلمسات خفيفة (مشاركة، كراس، انضباط، استجوابات) مع الاحتساب الآلي التلقائي لمعدل 20/20 وفق المناشير الرسمية.</p>
        </div>

        <div class="feature-card blue">
          <div class="f-title">📝 الدفتر اليومي وكراس النصوص البيداغوجي</div>
          <p class="f-desc">تدوين الحصص والمقاطع والمفاهيم بدقة، مع ميزة نسخ وتكرار الدرس للأفواج المتوازية بنقرة واحدة لتوفير وقت وجهد الأستاذ.</p>
        </div>

        <div class="feature-card purple">
          <div class="f-title">🏆 لوحة الشرف وتحفيز التميز الدراسي</div>
          <p class="f-desc">إشادة فورية بجهود التلاميذ المتفوقين والمنضبطين، وتعزيز التنافس الإيجابي والشراكة الشفافة والوثيقة مع أولياء الأمور.</p>
        </div>
      </div>

      <div class="scan-section">
        <div class="scan-info">
          <h3>📲 كيف تبدأ؟ (الخطوة الأولى للأستاذ)</h3>
          <p>امسح رمز الاستجابة السريعة (QR Code) بكاميرا هاتفك أو افتح الرابط أدناه لإنشاء حسابك التعليمي في أقل من دقيقة واحدة:</p>
          <div class="scan-url">${PLATFORM_URL}</div>
        </div>
        <div class="qr-box">
          <img src="${qrDataUrl}" alt="QR Code" />
        </div>
      </div>

      <div class="signature-row">
        <div class="note-box">
          ⚠️ <strong>توجيه إداري بيداغوجي:</strong><br />
          يُرجى من كافة السيدات والسادة أساتذة المؤسسة الكرام المبادرة بإنشاء حساباتهم التعليمية واعتماد كود الأستاذ الخاص لمشاركته مع تلاميذ أفواجهم وأوليائهم وفق الدليل المصور المرفق.
        </div>
        <div class="stamp-box">
          <div class="stamp-title">تأشيرة وختم السيد مدير المتوسطة</div>
          <div class="stamp-footer">${SCHOOL_NAME} — حرر في: ......................</div>
        </div>
      </div>
    </div>

    <div class="footer-official">
      <div>${PLATFORM_NAME} • دليل قاعة الأساتذة الرسمية</div>
      <div>متوسطة باهي علي — ولاية الوادي</div>
      <div>صفحة 1 من 3 (الملصق الإعلاني)</div>
    </div>
  </div>

  <!-- الصفحة 2: الخطوات 1-3 -->
  ${guidePage1Html}

  <!-- الصفحة 3: الخطوات 4-6 -->
  ${guidePage2Html}
</body>
</html>`;

  // حفظ ملفات HTML المؤقتة
  const posterHtmlPath = path.join(TEMP_HTML_DIR, "poster.html");
  const guideHtmlPath = path.join(TEMP_HTML_DIR, "guide.html");
  const bundleHtmlPath = path.join(TEMP_HTML_DIR, "bundle.html");

  fs.writeFileSync(posterHtmlPath, posterHtml, "utf-8");
  fs.writeFileSync(guideHtmlPath, guideHtml, "utf-8");
  fs.writeFileSync(bundleHtmlPath, bundleHtml, "utf-8");

  console.log("✅ تم تجهيز وثائق HTML بنجاح مع الصور ورمز QR.");

  // ═════════════════════════════════════════════════════════════════
  // توليد ملفات PDF عبر Chrome Headless
  // ═════════════════════════════════════════════════════════════════
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const browserExe = fs.existsSync(chromePath) ? chromePath : edgePath;

  const posterPdfPath = path.join(OUTPUT_DIR, "ملصق_قاعة_الأساتذة_متوسطة_باهي_علي.pdf");
  const guidePdfPath = path.join(OUTPUT_DIR, "دليل_الأستاذ_المصور_متوسطة_باهي_علي.pdf");
  const bundlePdfPath = path.join(OUTPUT_DIR, "الحزمة_الشاملة_إعلان_ودليل_متوسطة_باهي_علي.pdf");

  function printHtmlToPdf(htmlPath: string, pdfPath: string) {
    const fileUrl = "file:///" + htmlPath.replace(/\\\\/g, "/");
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--user-data-dir=G:\\temp_chrome",
      `--print-to-pdf=${pdfPath}`,
      "--no-pdf-header-footer",
      fileUrl,
    ];
    execFileSync(browserExe, args, { stdio: "ignore" });
    const stats = fs.statSync(pdfPath);
    console.log(`📄 تم توليد PDF: ${path.basename(pdfPath)} (${(stats.size / 1024).toFixed(1)} KB)`);
  }

  printHtmlToPdf(posterHtmlPath, posterPdfPath);
  printHtmlToPdf(guideHtmlPath, guidePdfPath);
  printHtmlToPdf(bundleHtmlPath, bundlePdfPath);

  console.log("\n🎉 اكتمل توليد كافة ملفات PDF بنجاح تام!");
  console.log("📂 مسارات الملفات الجاهزة للطباعة والتعليق:");
  console.log(`1️⃣ الملصق الإعلاني A4: ${posterPdfPath}`);
  console.log(`2️⃣ الدليل المصور A4: ${guidePdfPath}`);
  console.log(`3️⃣ الحزمة الشاملة A4: ${bundlePdfPath}`);
}

main().catch((err) => {
  console.error("❌ حدث خطأ أثناء توليد ملفات PDF:", err);
  process.exit(1);
});
