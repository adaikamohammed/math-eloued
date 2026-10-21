# 🚀 دليل التنفيذ والتطبيق العملي للمنصة المطورة
## خطوات التطوير والتجهيز التقني — خارطة الطريق 2026

---

## المرحلة 1: درع الحماية القانونية والشروط (Legal Shield)

### 1.1 تحديث قاعدة البيانات لحفظ الموافقة
```sql
-- إضافة أعمدة ميثاق الاستخدام والمادة ورتبة مدير المؤسسة
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT 'mathematics',
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_ip TEXT,
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{
    "board_lessons": true,
    "homework": true,
    "continuous_assessment": true,
    "honor_roll": true,
    "reception_schedule": true,
    "announcements": true,
    "inspector_sync": true
  }'::jsonb;
```

### 1.2 إضافة ميثاق التعهد في شاشة التسجيل (`src/app/register/page.tsx`)
* إضافة خانة اختيار المادة (رياضيات، فيزياء، علوم، لغة عربية، لغة فرنسية، إنجليزية، اجتماعيات، تربية إسلامية).
* إضافة مربع التعهد الإلزامي:
```tsx
<label className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl cursor-pointer">
  <input
    type="checkbox"
    required
    checked={agreedToTerms}
    onChange={(e) => setAgreedToTerms(e.target.checked)}
    className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
  />
  <span className="text-xs text-slate-300 leading-relaxed">
    أقر وأتعهد بأن كافة الدروس والصور والبيانات المنشورة عبر هذا الفضاء تقع تحت مسؤوليتي البيداغوجية والقانونية الحصرية كأستاذ ممارس، وأن المنصة وسيط تقني غير مسؤول عن أي محتوى مخالف.
  </span>
</label>
```

### 1.3 مكون شريط إخلاء المسؤولية المعتمد (`src/components/SafeHarborDisclaimer.tsx`)
* مكون يُدرج في تذييل كل صفحة أستاذ عامة:
```tsx
export default function SafeHarborDisclaimer({ teacherName, schoolName, subjectName }: Props) {
  return (
    <footer className="mt-12 py-4 px-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
      <p className="flex items-center justify-center gap-2">
        <span>🛡️</span>
        <span>
          هذا الفضاء التعليمي يدار ذاتياً وبمسؤولية الأستاذ(ة) <strong>{teacherName}</strong> ({subjectName}) — {schoolName}. المنصة توفر وسيطاً تقنياً فقط وتخلي مسؤوليتها عن أي محتوى منشور.
        </span>
      </p>
    </footer>
  );
}
```

---

## المرحلة 2: نظام مفاتيح الميزات للأستاذ (Feature Toggles)

### 2.1 واجهة الإعدادات في لوحة تحكم الأستاذ (`/admin`)
* إضافة تبويب «تخصيص صفحتي ⚙️»:
```tsx
// قائمة المفاتيح
const TOGGLE_ITEMS = [
  { key: 'board_lessons', label: 'كراس القسم والسبورة', desc: 'نشر صور صبورة القسم والدروس اليومية', locked: true },
  { key: 'homework', label: 'الواجبات المنزلية', desc: 'تحديد فروض وأنشطة منزلية بمواعيد تسليم' },
  { key: 'continuous_assessment', label: 'دفتر نقاط التقويم المستمر', desc: 'نشر شبكة التقييم والعلامات بشفافية تامة' },
  { key: 'honor_roll', label: 'لوحة الشرف وتكريم النجباء', desc: 'عرض صور أو أسماء التلاميذ المتميزين' },
  { key: 'reception_schedule', label: 'مواعيد استقبال الأولياء', desc: 'تحديد اليوم والتوقيت وقاعة المقابلة' },
  { key: 'inspector_sync', label: 'الربط مع المفتشية البيداغوجية', desc: 'إرسال المذكرات واستقبال توجيهات المفتش (لأساتذة الرياضيات)' },
];
```

---

## المرحلة 3: بناء دفتر نقاط التقويم المستمر (Continuous Assessment)

### 3.1 بنية بيانات التقويم المستمر
يُخزن في حقل `continuous_assessment` بداخل `teacher_public_data`:
```json
{
  "classes": [
    {
      "className": "4 متوسط 2",
      "trimester": 1,
      "maxScore": 20,
      "criteriaWeights": {
        "notebook": 4,
        "behavior": 4,
        "homework": 4,
        "quizzes": 8
      },
      "students": [
        {
          "number": 1,
          "name": "صهيب عدايكة",
          "notebook": 4,
          "behavior": 4,
          "homework": 4,
          "quizzes": 8,
          "total": 20,
          "note": "ممتاز ومواظب"
        },
        {
          "number": 2,
          "name": "فاطمة الزهراء بن عمارة",
          "notebook": 4,
          "behavior": 4,
          "homework": 3.5,
          "quizzes": 7.5,
          "total": 19,
          "note": "عمل جاد"
        }
      ]
    }
  ]
}
```

### 3.2 واجهة استعراض الولي للنقاط في صفحة الأستاذ (`/t/[slug]`)
* عند فتح تبويب «التقويم المستمر 📊»:
  * إما استعراض جدول الفوج إن اختار الأستاذ النشر العام.
  * أو حقل بحث بسيط: «أدخل رقم التلميذ في القائمة أو اسمه»: تظهر له بطاقة مفصلة:
    - 📓 كراس القسم: `4 / 4`
    - ⭐ السلوك والمشاركة: `4 / 4`
    - 📝 الواجبات: `4 / 4`
    - 🎯 الاستجوابات: `8 / 8`
    - **المجموع النهائي: `20 / 20`** (مع ملاحظة الأستاذ التشجيعية).

---

## المرحلة 4: عزل وتوجيه المفتشية (Inspector Scope)

1. **إخفاء تبويب المفتش لغير أساتذة الرياضيات:**
   - فحص شرط بسيط:
   ```ts
   const showInspectorTab = profile.subject === 'mathematics' && profile.feature_flags?.inspector_sync;
   ```
2. **عزل موضوعات الملتقى:**
   - كل منتدى مرتبط بالمادة: `forum_topics.subject = 'mathematics'`.
   - أساتذة مادة الرياضيات يشاركون مع مفتشهم بحرية، ولا تختلط مواضيعهم بأي مادة أخرى.

---

## المرحلة 5: خطة العرض التجريبي على المدير باهي علي والمفتش

1. **عرض فضاء الأستاذ للمفتش:**
   - الدخول بحساب `prof.kaddouri@eloued-math.dz` (كود `MTH-101`).
   - إظهار المذكرات المعتمدة، التوجيه الذهبي للمفتش في الملتقى، وسبورة كراس القسم.
2. **عرض فضاء الأستاذ للمدير باهي علي:**
   - إظهار خاصية «دفتر نقاط التقويم المستمر» الشفافة التي تقضي على شكاوى الأولياء.
   - إظهار سهولة تفعيل وتعطيل الميزات بحرية حسب رغبة كل أستاذ في المتوسطة.
   - إظهار شريط إخلاء المسؤولية والتعهد القانوني الذي يحمي الجميع.
