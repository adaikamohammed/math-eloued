import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { execFileSync } from "child_process";

// ═════════════════════════════════════════════════════════════════
// إعدادات وبيانات المؤسسة
// ═════════════════════════════════════════════════════════════════
const SCHOOL_NAME = "متوسطة باهي علي";
const WILAYA = "ولاية الوادي";
const SCHOOL_YEAR = "2026 / 2027";
const PLATFORM_NAME = "منصة جسور التعليمية";
const PLATFORM_URL = "https://jusoor-dz.vercel.app";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, "public", "screenshots");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "public", "documents");
const TEMP_HTML_DIR = path.join(PROJECT_ROOT, "public", "temp_pdf_html");

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
  console.log("🚀 جاري إعداد وتوليد ملفات PDF بالخط الرسمي وتظليل القوائم الجانبية...");

  // 1. توليد رمز QR عالي الجودة
  const qrDataUrl = await QRCode.toDataURL(PLATFORM_URL, {
    width: 600,
    margin: 1,
    color: { dark: "#064e3b", light: "#ffffff" },
  });

  // 2. قراءة لقطات الشاشة الحقيقية
  const step1Img = getBase64Image("step1_register.png");
  const step2Img = getBase64Image("step2_teacher_space.png");
  const step3Img = getBase64Image("step3_classes_roster.png");
  const step4Img = getBase64Image("step4_board_journal.png");
  const step5Img = getBase64Image("step5_continuous_grading.png");
  const step6Img = getBase64Image("step6_daily_diary.png");

  // ═════════════════════════════════════════════════════════════════
  // خطوط CSS الرسمية (Cairo + Amiri) ومقاييس A4 الدقيقة
  // ═════════════════════════════════════════════════════════════════
  const commonStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@700;900&family=Cairo:wght@500;600;700;800;900&display=swap');
    
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
      font-family: 'Cairo', 'Amiri', 'Traditional Arabic', Tahoma, sans-serif;
      direction: rtl;
      color: #0f172a;
    }
    .page-a4 {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      margin: 0 auto;
      padding: 8mm 11mm;
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
      border-bottom: 2px solid #065f46;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .header-official .country {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .header-official .ministry {
      font-size: 9.8pt;
      font-weight: 700;
      color: #047857;
      margin-top: 1px;
    }
    .header-official .school-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-top: 3px;
      background: #ecfdf5;
      padding: 2.5px 14px;
      border-radius: 999px;
      border: 1px solid #a7f3d0;
      font-size: 9pt;
      font-weight: 800;
      color: #065f46;
    }
    .footer-official {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
      margin-top: 4px;
      font-weight: 600;
    }
  `;

  // ═════════════════════════════════════════════════════════════════
  // 1. الورقة الأولى: الملصق الإعلاني الرسمي (A4 Poster)
  // تم حذف التوجيه الإداري/الأمر وتوسيع خانة التأشيرة والترحيب
  // ═════════════════════════════════════════════════════════════════
  const posterHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8" />
  <title>الملصق الإعلاني لقاعة الأساتذة - ${SCHOOL_NAME}</title>
  <style>
    ${commonStyles}
    .poster-hero {
      background: linear-gradient(135deg, #064e3b 0%, #047857 55%, #0f766e 100%);
      color: #ffffff;
      padding: 14px 18px;
      border-radius: 14px;
      text-align: center;
      box-shadow: 0 4px 14px rgba(6, 78, 59, 0.2);
      border: 1.5px solid #34d399;
      margin-bottom: 11px;
    }
    .poster-hero .pill {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.4);
      padding: 2px 14px;
      border-radius: 20px;
      font-size: 8.8pt;
      font-weight: 800;
      color: #fef08a;
      margin-bottom: 4px;
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
      font-size: 9.8pt;
      color: #d1fae5;
      font-weight: 600;
    }
    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 11px;
    }
    .feature-card {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      padding: 10px 13px;
      border-right: 5px solid #047857;
    }
    .feature-card.gold { border-right-color: #d97706; background: #fffdfa; }
    .feature-card.blue { border-right-color: #0284c7; background: #f0f9ff; }
    .feature-card.purple { border-right-color: #7c3aed; background: #faf5ff; }
    .feature-card .f-title {
      font-size: 10.5pt;
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
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 11px;
    }
    .scan-info h3 {
      margin: 0 0 4px 0;
      font-size: 12.5pt;
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
      padding: 3px 12px;
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
      border: 1.5px solid #047857;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      flex-shrink: 0;
    }
    .qr-box img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .welcome-invitation {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 8px 14px;
      text-align: center;
      font-size: 9.2pt;
      font-weight: 800;
      color: #166534;
      margin-bottom: 9px;
    }
    .director-seal-box {
      border: 2px dashed #475569;
      border-radius: 12px;
      padding: 12px 16px;
      background: #fafafa;
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 95px;
    }
    .seal-text h4 {
      margin: 0 0 3px 0;
      font-size: 11pt;
      font-weight: 900;
      color: #0f172a;
    }
    .seal-text p {
      margin: 0;
      font-size: 8.5pt;
      color: #475569;
      font-weight: 600;
    }
    .seal-stamp-area {
      width: 170px;
      height: 70px;
      border: 1px dashed #94a3b8;
      border-radius: 8px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      color: #94a3b8;
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
        <div class="pill">✨ إعلان رسمي لقاعة الأساتذة</div>
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

      <div class="welcome-invitation">
        🌸 مرحباً بكافة السيدات والسادة أساتذة المؤسسة الكرام للانضمام لفضائهم التعليمي، متمنين للجميع كل التوفيق والتميز.
      </div>

      <div class="director-seal-box">
        <div class="seal-text">
          <h4>تأشيرة وختم السيد مدير المتوسطة</h4>
          <p>${SCHOOL_NAME} — حرر في: ..................................</p>
          <p style="margin-top: 4px; color: #047857; font-weight: 700;">الموسم الدراسي: ${SCHOOL_YEAR}</p>
        </div>
        <div class="seal-stamp-area">
          موضع الختم والتوقيع الرسمي
        </div>
      </div>
    </div>

    <div class="footer-official">
      <div>${PLATFORM_NAME} • دليل قاعة الأساتذة</div>
      <div>${SCHOOL_NAME} — ${WILAYA}</div>
      <div>صفحة 1 من 4 (الملصق الإعلاني)</div>
    </div>
  </div>
</body>
</html>`;

  // ═════════════════════════════════════════════════════════════════
  // أنماط صفحات الدليل المصور (مع تظليل عناصر الشريط الجانبي)
  // ═════════════════════════════════════════════════════════════════
  const guideStyles = `
    .step-box-full {
      margin-bottom: 8px;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .step-top-header {
      background: linear-gradient(90deg, #ecfdf5 0%, #f8fafc 100%);
      padding: 6px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid #cbd5e1;
    }
    .step-badge {
      background: #047857;
      color: #ffffff;
      font-size: 9pt;
      font-weight: 900;
      padding: 2px 10px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    .step-title-text {
      font-size: 10.5pt;
      font-weight: 900;
      color: #0f172a;
    }
    .sidebar-indicator {
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      padding: 5px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 8.2pt;
    }
    .sidebar-indicator .si-label {
      font-weight: 800;
      color: #475569;
      shrink-0;
    }
    .sidebar-indicator .si-target {
      background: #047857;
      color: #ffffff;
      font-weight: 900;
      padding: 2px 10px;
      border-radius: 6px;
      border: 1px solid #065f46;
      box-shadow: 0 1px 3px rgba(4, 120, 87, 0.25);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .sidebar-indicator .si-muted {
      color: #94a3b8;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 4px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .step-body {
      padding: 7px 12px;
    }
    .step-screenshot-wrap {
      width: 100%;
      border: 1px solid #94a3b8;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
      margin-bottom: 6px;
    }
    .browser-bar {
      background: #e2e8f0;
      padding: 3px 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 7pt;
      font-family: monospace;
      color: #475569;
      border-bottom: 1px solid #cbd5e1;
    }
    .browser-dots {
      display: flex;
      gap: 3px;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #94a3b8;
    }
    .step-screenshot-wrap img {
      width: 100%;
      max-height: 75mm;
      object-fit: contain;
      object-position: top;
      display: block;
      background: #ffffff;
    }
    .step-instructions-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      font-size: 8pt;
      line-height: 1.35;
      color: #1e293b;
    }
    .inst-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 4px 7px;
      display: flex;
      align-items: flex-start;
      gap: 5px;
      font-weight: 600;
    }
    .inst-num {
      background: #0f766e;
      color: #ffffff;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7pt;
      font-weight: 900;
      flex-shrink: 0;
      margin-top: 1px;
    }
  `;

  // ═════════════════════════════════════════════════════════════════
  // الصفحة 2: الدليل المصور (1/3) — الخطوة 01 + الخطوة 02
  // ═════════════════════════════════════════════════════════════════
  const guidePage1Html = `
  <div class="page-a4">
    <div>
      <div class="header-official">
        <div class="country">الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التربية الوطنية</div>
        <div class="school-badge">
          <span>📘 دليل الأستاذ العملي المصور (1 / 3)</span>
          <span>•</span>
          <span>🏛️ ${SCHOOL_NAME}</span>
          <span>•</span>
          <span>الموسم: ${SCHOOL_YEAR}</span>
        </div>
      </div>

      <!-- الخطوة 01 -->
      <div class="step-box-full">
        <div class="step-top-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="step-badge">الخطوة 01</span>
            <span class="step-title-text">إنشاء الحساب التعليمي الجديد وتحديد مادة التدريس والمؤسسة</span>
          </div>
          <span style="font-size: 8pt; font-weight: 800; color: #047857; background: #d1fae5; padding: 2px 8px; border-radius: 4px;">يستغرق 30 ثانية ⚡</span>
        </div>

        <div class="sidebar-indicator">
          <span class="si-label">🧭 التنقل المباشر:</span>
          <span class="si-target">👈 افتح الرابط: jusoor-dz.vercel.app/login ◀ ثم انقر تبويب [ إنشاء حساب جديد ]</span>
          <span class="si-muted">تسجيل الدخول</span>
        </div>

        <div class="step-body">
          <div class="step-screenshot-wrap" style="text-align: center; background: #f8fafc;">
            <div class="browser-bar">
              <div class="browser-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
              <span>نافذة إنشاء حساب جديد للأستاذ — منصة جسور</span>
            </div>
            <img src="${step1Img}" alt="إنشاء حساب جديد" style="max-height: 60mm; margin: 0 auto; width: auto;" />
          </div>

          <div class="step-instructions-row">
            <div class="inst-item">
              <span class="inst-num">1</span>
              <div>اكتب <strong>الاسم واللقب الكامل</strong> كما هو مدون في الإدارة التربوية.</div>
            </div>
            <div class="inst-item">
              <span class="inst-num">2</span>
              <div>اختر <strong>مادة التدريس</strong>، وحدد ولاية الوادي، واكتب اسم المؤسسة: <strong>${SCHOOL_NAME}</strong>.</div>
            </div>
            <div class="inst-item">
              <span class="inst-num">3</span>
              <div>أدخل بريدك الإلكتروني وكلمة المرور واضغط زر <strong>«إنشاء الحساب ومتابعة»</strong>.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- الخطوة 02 -->
      <div class="step-box-full">
        <div class="step-top-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="step-badge" style="background: #0d9488;">الخطوة 02</span>
            <span class="step-title-text">فضاء الأستاذ المعتمد، كود المادة، ورابط فضاء التلاميذ والأولياء</span>
          </div>
          <span style="font-size: 8pt; font-weight: 800; color: #0f766e; background: #ccfbf1; padding: 2px 8px; border-radius: 4px;">هويتك الرقمية أمام التلاميذ</span>
        </div>

        <div class="sidebar-indicator">
          <span class="si-label">🧭 من الشريط الجانبي:</span>
          <span class="si-target">👈 تظليل الخيار: [ 👤 فضاء الأستاذ ورابط التلاميذ ]</span>
          <span class="si-muted">لوحة التحكم</span>
          <span class="si-muted">كراس السبورة</span>
          <span class="si-muted">إدارة الأفواج</span>
        </div>

        <div class="step-body">
          <div class="step-screenshot-wrap">
            <div class="browser-bar">
              <div class="browser-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
              <span>فضاء الأستاذ المعتمد — متوسطة باهي علي — كود المادة ورابط الأولياء</span>
            </div>
            <img src="${step2Img}" alt="فضاء الأستاذ" />
          </div>

          <div class="step-instructions-row">
            <div class="inst-item">
              <span class="inst-num">1</span>
              <div>يظهر اسمك ومادتك ومؤسستك (**${SCHOOL_NAME}**) ومستوياتك المعتمدة.</div>
            </div>
            <div class="inst-item">
              <span class="inst-num">2</span>
              <div><strong>كود الأستاذ (مثال: MTH-784):</strong> الرمز الذي يربط الأولياء بمادتك في هواتفهم.</div>
            </div>
            <div class="inst-item">
              <span class="inst-num">3</span>
              <div>شارك رابط فضاء التلاميذ لمتابعة كراس السبورة، الواجبات، وساعة الاستقبال الرسمية.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-official">
      <div>${PLATFORM_NAME} • دليل قاعة الأساتذة</div>
      <div>${SCHOOL_NAME}</div>
      <div>صفحة 2 من 4 (الحساب وفضاء الأستاذ)</div>
    </div>
  </div>`;

  // ═════════════════════════════════════════════════════════════════
  // الصفحة 3: الدليل المصور (2/3) — الخطوة 03 + الخطوة 04
  // ═════════════════════════════════════════════════════════════════
  const guidePage2Html = `
  <div class="page-a4">
    <div>
      <div class="header-official">
        <div class="country">الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التربية الوطنية</div>
        <div class="school-badge">
          <span>📙 دليل الأستاذ العملي المصور (2 / 3)</span>
          <span>•</span>
          <span>🏛️ ${SCHOOL_NAME}</span>
          <span>•</span>
          <span>الموسم: ${SCHOOL_YEAR}</span>
        </div>
      </div>

      <!-- الخطوة 03 -->
      <div class="step-box-full">
        <div class="step-top-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="step-badge" style="background: #0284c7;">الخطوة 03</span>
            <span class="step-title-text">إدارة الأفواج وتوثيق قوائم التلاميذ وتقسيم التفويج</span>
          </div>
          <span style="font-size: 8pt; font-weight: 800; color: #0369a1; background: #e0f2fe; padding: 2px 8px; border-radius: 4px;">الأقسام المسندة (1م1، 1م2، 2م3...)</span>
        </div>

        <div class="sidebar-indicator">
          <span class="si-label">🧭 تظليل الشريط الجانبي:</span>
          <span class="si-muted">لوحة التحكم</span>
          <span class="si-muted">كراس السبورة</span>
          <span class="si-target">👈 تظليل الخيار: [ 👥 إدارة الأفواج والتلاميذ ] ✨</span>
          <span class="si-muted">الدفتر اليومي</span>
          <span class="si-muted">دفتر التقويم</span>
        </div>

        <div class="step-body">
          <div class="step-screenshot-wrap">
            <div class="browser-bar">
              <div class="browser-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
              <span>جدول وتوثيق تلاميذ الفوج 3م2 — الأقسام المسندة والتفويج وقائمة الأسماء كاملة</span>
            </div>
            <img src="${step3Img}" alt="إدارة الأفواج والتلاميذ" />
          </div>

          <div class="step-instructions-row">
            <div class="inst-item">
              <span class="inst-num">1</span>
              <div>أضف أقسامك المسندة (1م1، 1م2، 2م3...) بضغطة زر.</div>
            </div>
            <div class="inst-item">
              <span class="inst-num">2</span>
              <div>استورد قوائم التلاميذ دفعة واحدة مع أرقام التسجيل وحالة الإعادة.</div>
            </div>
            <div class="inst-item">
              <span class="inst-num">3</span>
              <div>حدّد <strong>التفويج (فوج 1 / فوج 2)</strong> لتنظيم الحصص التطبيقية بدقة وموضوعية.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- الخطوة 04 -->
      <div class="step-box-full">
        <div class="step-top-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="step-badge" style="background: #059669;">الخطوة 04</span>
            <span class="step-title-text">توثيق سبورة الحصة ونشر الواجبات وخدمة التلميذ الغائب</span>
          </div>
          <span style="font-size: 8pt; font-weight: 800; color: #047857; background: #d1fae5; padding: 2px 8px; border-radius: 4px;">كاميرا الهاتف بعد الحصة 📸</span>
        </div>

        <div class="sidebar-indicator">
          <span class="si-label">🧭 تظليل الشريط الجانبي:</span>
          <span class="si-muted">لوحة التحكم</span>
          <span class="si-target">👈 تظليل الخيار: [ 📸 كراس الدروس والسبورة الرقمية ] ✨</span>
          <span class="si-muted">إدارة الأفواج</span>
          <span class="si-muted">الدفتر اليومي</span>
        </div>

        <div class="step-body">
          <div class="step-screenshot-wrap">
            <div class="browser-bar">
              <div class="browser-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
              <span>كراس الدروس والسبورة الرقمية — صور السبورة، الملخصات، وتوجيهات الأستاذ</span>
            </div>
            <img src="${step4Img}" alt="كراس السبورة" />
          </div>

          <div class="step-instructions-row">
            <div class="inst-item">
              <span class="inst-num">1</span>
              <div>صوّر سبورة الحصة بعد انتهاء الدرس واضغط <strong>«رفع السبورة»</strong>.</div>
            </div>
            <div class="inst-item">
              <span class="inst-num">2</span>
              <div><strong>خدمة التلميذ الغائب:</strong> يستدرك الغائب الدرس ويكتب عناصره دون استعارة الكراس.</div>
            </div>
            <div class="inst-item">
              <span class="inst-num">3</span>
              <div>أرفق نص الواجب المنزلي وموعده وحله النموذجي لتمكين الأولياء من المتابعة.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-official">
      <div>${PLATFORM_NAME} • دليل قاعة الأساتذة</div>
      <div>${SCHOOL_NAME}</div>
      <div>صفحة 3 من 4 (الأفواج والسبورة اليومية)</div>
    </div>
  </div>`;

  // ═════════════════════════════════════════════════════════════════
  // الصفحة 4: الدليل المصور (3/3) — الخطوة 05 + الخطوة 06
  // ═════════════════════════════════════════════════════════════════
  const guidePage3Html = `
  <div class="page-a4">
    <div>
      <div class="header-official">
        <div class="country">الجمهورية الجزائرية الديمقراطية الشعبية — وزارة التربية الوطنية</div>
        <div class="school-badge">
          <span>📗 دليل الأستاذ العملي المصور (3 / 3)</span>
          <span>•</span>
          <span>🏛️ ${SCHOOL_NAME}</span>
          <span>•</span>
          <span>الموسم: ${SCHOOL_YEAR}</span>
        </div>
      </div>

      <!-- الخطوة 05 -->
      <div class="step-box-full">
        <div class="step-top-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="step-badge" style="background: #10b981;">الخطوة 05</span>
            <span class="step-title-text">التقويم المستمر بالهاتف في القسم والاحتساب الآلي للمعدلات</span>
          </div>
          <span style="font-size: 8pt; font-weight: 800; color: #047857; background: #d1fae5; padding: 2px 8px; border-radius: 4px;">تنقيط صفي يومي بلمسات سريعة ⚡</span>
        </div>

        <div class="sidebar-indicator">
          <span class="si-label">🧭 تظليل الشريط الجانبي:</span>
          <span class="si-muted">لوحة التحكم</span>
          <span class="si-muted">إدارة الأفواج</span>
          <span class="si-target">👈 تظليل الخيار: [ 📱 دفتر التقويم المستمر الصفي ] ✨</span>
          <span class="si-muted">سجل التنقيط</span>
        </div>

        <div class="step-body">
          <div class="step-screenshot-wrap">
            <div class="browser-bar">
              <div class="browser-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
              <span>دفتر التقويم المستمر الصفي — تنقيط يومي، احتساب المجموع من 20 تلقائياً وفق القرارات الوزارية</span>
            </div>
            <img src="${step5Img}" alt="دفتر التقويم المستمر" />
          </div>

          <div class="step-instructions-row">
            <div class="inst-item">
              <span class="inst-num">1</span>
              <div>افتح الدفتر من هاتفك داخل القسم والمَس علامة التلميذ مباشرة.</div>
            </div>
            <div class="inst-item">
              <span class="inst-num">2</span>
              <div>المعايير المعتمدة: مشاركة (4ن)، كراس (2ن)، وظائف (2ن)، استجوابات (4ن).</div>
            </div>
            <div class="inst-item">
              <span class="inst-num">3</span>
              <div><strong>حساب فوري للمعدل:</strong> يُحسب المجموع من 20 تلقائياً وجاهز للتصدير للكشف الرسمي.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- الخطوة 06 -->
      <div class="step-box-full">
        <div class="step-top-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="step-badge" style="background: #6366f1;">الخطوة 06</span>
            <span class="step-title-text">الدفتر اليومي، دفتر النصوص، وتكرار الحصص للأقسام المتوازية</span>
          </div>
          <span style="font-size: 8pt; font-weight: 800; color: #4338ca; background: #e0e7ff; padding: 2px 8px; border-radius: 4px;">المذكرات وسيرورة الحصة 📝</span>
        </div>

        <div class="sidebar-indicator">
          <span class="si-label">🧭 تظليل الشريط الجانبي:</span>
          <span class="si-muted">لوحة التحكم</span>
          <span class="si-muted">كراس السبورة</span>
          <span class="si-target">👈 تظليل الخيار: [ 📝 الدفتر اليومي ودفتر النصوص ] ✨</span>
          <span class="si-muted">لوحة الشرف</span>
        </div>

        <div class="step-body">
          <div class="step-screenshot-wrap">
            <div class="browser-bar">
              <div class="browser-dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
              <span>إضافة وتدوين حصة جديدة في الدفتر — المقطع التعلمي، المورد المعرفي، وسيرورة الحصة</span>
            </div>
            <img src="${step6Img}" alt="الدفتر اليومي" />
          </div>

          <div class="step-instructions-row">
            <div class="inst-item">
              <span class="inst-num">1</span>
              <div>دوّن المقطع، المورد، وسيرورة الحصة (تمهيدي، وسيطي، نهائي) بدقة.</div>
            </div>
            <div class="inst-item">
              <span class="inst-num">2</span>
              <div><strong>تكرار الدرس بنقرة واحدة:</strong> وفّر وقتك وانسخ الحصة للأقسام المتوازية بلمسة واحدة.</div>
            </div>
            <div class="inst-item">
              <span class="inst-num">3</span>
              <div>سجل نصوص رسمي جاهز للمعاينة الإدارية والتفتيش والطباعة الفورية.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer-official">
      <div>${PLATFORM_NAME} • دليل قاعة الأساتذة</div>
      <div>${SCHOOL_NAME}</div>
      <div>صفحة 4 من 4 (التقويم الصفي والدفتر اليومي)</div>
    </div>
  </div>`;

  // ═════════════════════════════════════════════════════════════════
  // تجميع الوثائق: دليل الأستاذ (3 صفحات) والحزمة الشاملة (4 صفحات)
  // ═════════════════════════════════════════════════════════════════
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
  ${guidePage3Html}
</body>
</html>`;

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
      box-shadow: 0 4px 14px rgba(6, 78, 59, 0.2);
      border: 1.5px solid #34d399;
      margin-bottom: 11px;
    }
    .poster-hero .pill {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.4);
      padding: 2px 14px;
      border-radius: 20px;
      font-size: 8.8pt;
      font-weight: 800;
      color: #fef08a;
      margin-bottom: 4px;
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
      font-size: 9.8pt;
      color: #d1fae5;
      font-weight: 600;
    }
    .features-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 11px;
    }
    .feature-card {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      padding: 10px 13px;
      border-right: 5px solid #047857;
    }
    .feature-card.gold { border-right-color: #d97706; background: #fffdfa; }
    .feature-card.blue { border-right-color: #0284c7; background: #f0f9ff; }
    .feature-card.purple { border-right-color: #7c3aed; background: #faf5ff; }
    .feature-card .f-title {
      font-size: 10.5pt;
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
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 11px;
    }
    .scan-info h3 {
      margin: 0 0 4px 0;
      font-size: 12.5pt;
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
      padding: 3px 12px;
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
      border: 1.5px solid #047857;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      flex-shrink: 0;
    }
    .qr-box img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .welcome-invitation {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 8px 14px;
      text-align: center;
      font-size: 9.2pt;
      font-weight: 800;
      color: #166534;
      margin-bottom: 9px;
    }
    .director-seal-box {
      border: 2px dashed #475569;
      border-radius: 12px;
      padding: 12px 16px;
      background: #fafafa;
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 95px;
    }
    .seal-text h4 {
      margin: 0 0 3px 0;
      font-size: 11pt;
      font-weight: 900;
      color: #0f172a;
    }
    .seal-text p {
      margin: 0;
      font-size: 8.5pt;
      color: #475569;
      font-weight: 600;
    }
    .seal-stamp-area {
      width: 170px;
      height: 70px;
      border: 1px dashed #94a3b8;
      border-radius: 8px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      color: #94a3b8;
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
        <div class="pill">✨ إعلان رسمي لقاعة الأساتذة</div>
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

      <div class="welcome-invitation">
        🌸 مرحباً بكافة السيدات والسادة أساتذة المؤسسة الكرام للانضمام لفضائهم التعليمي، متمنين للجميع كل التوفيق والتميز.
      </div>

      <div class="director-seal-box">
        <div class="seal-text">
          <h4>تأشيرة وختم السيد مدير المتوسطة</h4>
          <p>${SCHOOL_NAME} — حرر في: ..................................</p>
          <p style="margin-top: 4px; color: #047857; font-weight: 700;">الموسم الدراسي: ${SCHOOL_YEAR}</p>
        </div>
        <div class="seal-stamp-area">
          موضع الختم والتوقيع الرسمي
        </div>
      </div>
    </div>

    <div class="footer-official">
      <div>${PLATFORM_NAME} • دليل قاعة الأساتذة</div>
      <div>${SCHOOL_NAME} — ${WILAYA}</div>
      <div>صفحة 1 من 4 (الملصق الإعلاني)</div>
    </div>
  </div>

  <!-- الصفحات 2 و 3 و 4: الدليل المصور -->
  ${guidePage1Html}
  ${guidePage2Html}
  ${guidePage3Html}
</body>
</html>`;

  // حفظ ملفات HTML المؤقتة
  const posterHtmlPath = path.join(TEMP_HTML_DIR, "poster.html");
  const guideHtmlPath = path.join(TEMP_HTML_DIR, "guide.html");
  const bundleHtmlPath = path.join(TEMP_HTML_DIR, "bundle.html");

  fs.writeFileSync(posterHtmlPath, posterHtml, "utf-8");
  fs.writeFileSync(guideHtmlPath, guideHtml, "utf-8");
  fs.writeFileSync(bundleHtmlPath, bundleHtml, "utf-8");

  // ═════════════════════════════════════════════════════════════════
  // توليد ملفات PDF عبر Headless Chrome
  // ═════════════════════════════════════════════════════════════════
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const browserExe = fs.existsSync(chromePath) ? chromePath : edgePath;

  const posterPdfPath = path.join(OUTPUT_DIR, "poster-bahey-ali.pdf");
  const guidePdfPath = path.join(OUTPUT_DIR, "guide-bahey-ali.pdf");
  const bundlePdfPath = path.join(OUTPUT_DIR, "full-pack-bahey-ali.pdf");

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

  // نسخ الأسماء العربية أيضاً للملاءمة
  fs.copyFileSync(posterPdfPath, path.join(OUTPUT_DIR, "ملصق_قاعة_الأساتذة_متوسطة_باهي_علي.pdf"));
  fs.copyFileSync(guidePdfPath, path.join(OUTPUT_DIR, "دليل_الأستاذ_المصور_متوسطة_باهي_علي.pdf"));
  fs.copyFileSync(bundlePdfPath, path.join(OUTPUT_DIR, "الحزمة_الشاملة_إعلان_ودليل_متوسطة_باهي_علي.pdf"));

  console.log("\n🎉 اكتمل توليد كافة ملفات PDF بدقة ووضوح تام!");
  console.log("📂 مسارات الملفات الجاهزة للطباعة والتعليق:");
  console.log(`1️⃣ الملصق الإعلاني A4: ${posterPdfPath}`);
  console.log(`2️⃣ الدليل المصور A4: ${guidePdfPath}`);
  console.log(`3️⃣ الحزمة الشاملة A4: ${bundlePdfPath}`);
}

main().catch((err) => {
  console.error("❌ حدث خطأ أثناء توليد ملفات PDF:", err);
  process.exit(1);
});
