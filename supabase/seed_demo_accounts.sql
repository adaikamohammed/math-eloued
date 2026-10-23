-- ====================================================================
-- حسابات العرض التجريبي والبيانات النموذجية لمقاطعة الوادي 1
-- منصة رياضيات ولاية الوادي — مديرية التربية
-- ====================================================================
-- يتضمن هذا الملف:
-- 1) متوسطات المقاطعة 1 المعتمدة (متوسطة حمة الأخضر، بن باديس، مالك بن نبي، الهاشمي الشريف)
-- 2) إنشاء 3 حسابات أساتذة حقيقية لمقاطعة 1 مع كود الأستاذ والرابط
-- 3) إنشاء حساب مفتش المقاطعة 1 بصلاحيات كاملة
-- 4) ملء فضاء الأستاذ بالدروس الحقيقية، صور السبورة، الواجبات، ولوحة الشرف
-- 5) مشاركات نموذجية في الملتقى مع "توجيه رسمي معتمد" مكلل بالشارة الذهبية للمفتش
-- 6) منشور رسمي لمفتش المقاطعة 1
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- --------------------------------------------------------------------
-- 1. إضافة متوسطات المقاطعة 1 (الوادي 1)
-- --------------------------------------------------------------------
INSERT INTO public.middle_schools (id, district_id, name, commune)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 1, 'متوسطة الشهيد حمة الأخضر — الوادي', 'الوادي'),
  ('b1000000-0000-0000-0000-000000000002', 1, 'متوسطة عبد الحميد بن باديس — الوادي', 'الوادي'),
  ('b1000000-0000-0000-0000-000000000003', 1, 'متوسطة مالك بن نبي — الوادي', 'الوادي'),
  ('b1000000-0000-0000-0000-000000000004', 1, 'متوسطة الشيخ الهاشمي الشريف — الوادي', 'الوادي')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  commune = EXCLUDED.commune,
  district_id = EXCLUDED.district_id;

-- --------------------------------------------------------------------
-- 2. إنشاء المستخدمين في جدول المصادقة auth.users
-- --------------------------------------------------------------------

-- أ) الأستاذ 1: بلقاسم قدوري (MTH-101)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token
)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'prof.kaddouri@eloued-math.dz',
  extensions.crypt('ProfKaddouri2026!', extensions.gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"الأستاذ بلقاسم قدوري","role":"teacher","district_id":1,"teacher_code":"MTH-101","slug":"prof-kaddouri"}'::jsonb,
  'authenticated',
  'authenticated',
  NOW(),
  NOW(),
  '', '', '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = extensions.crypt('ProfKaddouri2026!', extensions.gen_salt('bf')),
  email = EXCLUDED.email,
  email_confirmed_at = NOW(),
  confirmation_token = '',
  recovery_token = '',
  email_change = '';

-- ب) الأستاذة 2: مريم عدايكة (MTH-102)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token
)
VALUES (
  'a2222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'prof.adaika@eloued-math.dz',
  extensions.crypt('ProfAdaika2026!', extensions.gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"الأستاذة مريم عدايكة","role":"teacher","district_id":1,"teacher_code":"MTH-102","slug":"prof-adaika"}'::jsonb,
  'authenticated',
  'authenticated',
  NOW(),
  NOW(),
  '', '', '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = extensions.crypt('ProfAdaika2026!', extensions.gen_salt('bf')),
  email = EXCLUDED.email,
  email_confirmed_at = NOW(),
  confirmation_token = '',
  recovery_token = '',
  email_change = '';

-- ج) الأستاذ 3: إبراهيم التجاني (MTH-103)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token
)
VALUES (
  'a3333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'prof.tidjani@eloued-math.dz',
  extensions.crypt('ProfTidjani2026!', extensions.gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"الأستاذ إبراهيم التجاني","role":"teacher","district_id":1,"teacher_code":"MTH-103","slug":"prof-tidjani"}'::jsonb,
  'authenticated',
  'authenticated',
  NOW(),
  NOW(),
  '', '', '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = extensions.crypt('ProfTidjani2026!', extensions.gen_salt('bf')),
  email = EXCLUDED.email,
  email_confirmed_at = NOW(),
  confirmation_token = '',
  recovery_token = '',
  email_change = '';

-- د) المفتش: عبد القادر لعموري (مفتش المقاطعة 1)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token
)
VALUES (
  'b1111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'inspecteur.laamouri@eloued-math.dz',
  extensions.crypt('Inspecteur2026!', extensions.gen_salt('bf')),
  NOW(),
  '{"full_name":"الأستاذ عبد القادر لعموري","role":"inspector","district_id":1}'::jsonb,
  '{"full_name":"الأستاذ عبد القادر لعموري","role":"inspector","district_id":1}'::jsonb,
  'authenticated',
  'authenticated',
  NOW(),
  NOW(),
  '', '', '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = extensions.crypt('Inspecteur2026!', extensions.gen_salt('bf')),
  email = EXCLUDED.email,
  email_confirmed_at = NOW(),
  confirmation_token = '',
  recovery_token = '',
  email_change = '';

-- --------------------------------------------------------------------
-- 3. تحديث وضبط الملفات الشخصية profiles (معتمدة وموثقة فوراً)
-- --------------------------------------------------------------------

-- الأستاذ 1: بلقاسم قدوري
INSERT INTO public.profiles (
  id, role, full_name, district_id, middle_school_id, school_custom_name,
  teacher_code, slug, levels_taught, is_verified, verification_status, bio, reception
)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'teacher',
  'الأستاذ بلقاسم قدوري',
  1,
  'b1000000-0000-0000-0000-000000000001',
  'متوسطة الشهيد حمة الأخضر — الوادي',
  'MTH-101',
  'prof-kaddouri',
  ARRAY[1, 4]::SMALLINT[],
  true,
  'approved',
  'أستاذ التعليم المتوسط لمادة الرياضيات، أدرس أقسام الأولى والرابعة متوسط (شهادة التعليم المتوسط BEM). مرحباً بجميع الأولياء والتلاميذ لمتابعة كراس القسم والسبورة.',
  '{"day":"الثلاثاء","hours":"10:00 - 11:00","room":"قاعة الأساتذة رقم 2"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  role = 'teacher',
  full_name = EXCLUDED.full_name,
  district_id = 1,
  middle_school_id = EXCLUDED.middle_school_id,
  school_custom_name = EXCLUDED.school_custom_name,
  teacher_code = 'MTH-101',
  slug = 'prof-kaddouri',
  levels_taught = ARRAY[1, 4]::SMALLINT[],
  is_verified = true,
  verification_status = 'approved',
  bio = EXCLUDED.bio,
  reception = EXCLUDED.reception;

-- الأستاذة 2: مريم عدايكة
INSERT INTO public.profiles (
  id, role, full_name, district_id, middle_school_id, school_custom_name,
  teacher_code, slug, levels_taught, is_verified, verification_status, bio, reception
)
VALUES (
  'a2222222-2222-2222-2222-222222222222',
  'teacher',
  'الأستاذة مريم عدايكة',
  1,
  'b1000000-0000-0000-0000-000000000002',
  'متوسطة عبد الحميد بن باديس — الوادي',
  'MTH-102',
  'prof-adaika',
  ARRAY[2, 3]::SMALLINT[],
  true,
  'approved',
  'أستاذة مادة الرياضيات للسنوات الثانية والثالثة متوسط. نهدف لتبسيط المفاهيم الرياضية وتنمية مهارات التفكير المنطقي.',
  '{"day":"الخميس","hours":"09:00 - 10:00","room":"مكتب الاستقبال البيداغوجي"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  role = 'teacher',
  full_name = EXCLUDED.full_name,
  district_id = 1,
  middle_school_id = EXCLUDED.middle_school_id,
  school_custom_name = EXCLUDED.school_custom_name,
  teacher_code = 'MTH-102',
  slug = 'prof-adaika',
  levels_taught = ARRAY[2, 3]::SMALLINT[],
  is_verified = true,
  verification_status = 'approved',
  bio = EXCLUDED.bio,
  reception = EXCLUDED.reception;

-- الأستاذ 3: إبراهيم التجاني
INSERT INTO public.profiles (
  id, role, full_name, district_id, middle_school_id, school_custom_name,
  teacher_code, slug, levels_taught, is_verified, verification_status, bio, reception
)
VALUES (
  'a3333333-3333-3333-3333-333333333333',
  'teacher',
  'الأستاذ إبراهيم التجاني',
  1,
  'b1000000-0000-0000-0000-000000000003',
  'متوسطة مالك بن نبي — الوادي',
  'MTH-103',
  'prof-tidjani',
  ARRAY[3, 4]::SMALLINT[],
  true,
  'approved',
  'أستاذ مادة الرياضيات — تخصص تحضير تلاميذ الرابعة متوسط لشهادة BEM وتمكين تلاميذ الثالثة متوسط من الأسس الهندسية.',
  '{"day":"الاثنين","hours":"11:00 - 12:00","room":"قاعة الرياضيات"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  role = 'teacher',
  full_name = EXCLUDED.full_name,
  district_id = 1,
  middle_school_id = EXCLUDED.middle_school_id,
  school_custom_name = EXCLUDED.school_custom_name,
  teacher_code = 'MTH-103',
  slug = 'prof-tidjani',
  levels_taught = ARRAY[3, 4]::SMALLINT[],
  is_verified = true,
  verification_status = 'approved',
  bio = EXCLUDED.bio,
  reception = EXCLUDED.reception;

-- المفتش: عبد القادر لعموري
INSERT INTO public.profiles (
  id, role, full_name, district_id, school_custom_name,
  is_verified, verification_status, bio
)
VALUES (
  'b1111111-1111-1111-1111-111111111111',
  'inspector',
  'الأستاذ عبد القادر لعموري',
  1,
  'مفتشية التعليم المتوسط لمادة الرياضيات — المقاطعة 1',
  true,
  'approved',
  'مفتش التعليم المتوسط لمادة الرياضيات — المقاطعة التفتيشية الأولى (ولاية الوادي 1). الإشراف والمرافقة البيداغوجية لأساتذة المقاطعة.'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'inspector',
  full_name = EXCLUDED.full_name,
  district_id = 1,
  school_custom_name = EXCLUDED.school_custom_name,
  is_verified = true,
  verification_status = 'approved',
  bio = EXCLUDED.bio;

-- أرقام الهواتف في جدول جهات الاتصال الخاصة profile_contacts
INSERT INTO public.profile_contacts (id, phone)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '0661123456'),
  ('a2222222-2222-2222-2222-222222222222', '0662234567'),
  ('a3333333-3333-3333-3333-333333333333', '0663345678'),
  ('b1111111-1111-1111-1111-111111111111', '0660000001')
ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone;

-- --------------------------------------------------------------------
-- 4. فضاء الأستاذ 1 بلقاسم قدوري (MTH-101): دروس حقيقية وصور سبورة وإعلانات
-- --------------------------------------------------------------------
INSERT INTO public.teacher_public_data (teacher_id, data, updated_at)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  '{
    "lessons": [
      {
        "id": "lesson_kaddouri_1",
        "level": 1,
        "type": "lessons",
        "field": "أنشطة عددية",
        "section": "المقطع 1 : الأعداد الطبيعية والأعداد العشرية",
        "number": 1,
        "title": "قراءة وكتابة وتفكيك عدد طبيعي",
        "createdAt": "2026-10-10T08:30:00Z",
        "images": [
          {
            "id": "img_k1",
            "url": "https://zcvevxcbfufx3f96.public.blob.vercel-storage.com/lessons/1/lesson_1791305813257_740bz/1791323587041-IMG20261006212742.jpg",
            "name": "لوحة الدرس - سبورة كراس القسم.jpg"
          }
        ]
      },
      {
        "id": "lesson_kaddouri_2",
        "level": 1,
        "type": "lessons",
        "field": "أنشطة عددية",
        "section": "المقطع 1 : الأعداد الطبيعية والأعداد العشرية",
        "number": 2,
        "title": "جمع وطرح وضرب أعداد طبيعية وعشرية",
        "createdAt": "2026-10-12T08:30:00Z",
        "images": [
          {
            "id": "img_k2",
            "url": "https://zcvevxcbfufx3f96.public.blob.vercel-storage.com/lessons/1/lesson_1791307057219_mathd/1791323625811-IMG20261006212752.jpg",
            "name": "سبورة العمليات الحسابية.jpg"
          }
        ]
      },
      {
        "id": "lesson_kaddouri_3",
        "level": 4,
        "type": "lessons",
        "field": "أنشطة عددية",
        "section": "المقطع 1 : الأعداد الطبيعية والأعداد الناطقة",
        "number": 1,
        "title": "القاسم المشترك الأكبر PGCD وطرق حسابه (الفروق المتتالية وخوارزمية إقليدس)",
        "createdAt": "2026-10-14T10:00:00Z",
        "images": [
          {
            "id": "img_k3",
            "url": "https://zcvevxcbfufx3f96.public.blob.vercel-storage.com/lessons/1/lesson_1791305813257_740bz/1791323583335-IMG20261006212733.jpg",
            "name": "خوارزمية إقليدس PGCD.jpg"
          }
        ]
      },
      {
        "id": "lesson_kaddouri_4",
        "level": 4,
        "type": "homework",
        "field": "أنشطة عددية",
        "section": "المقطع 1 : الأعداد الطبيعية والأعداد الناطقة",
        "number": 1,
        "title": "واجب منزلي رقم 01 : تطبيقات في حساب PGCD وكتابة كسور غير قابلة للاختزال",
        "createdAt": "2026-10-16T12:00:00Z",
        "homeworkDue": "2026-10-23",
        "solutionPublishDate": "2026-10-24T00:00:00Z",
        "images": [
          {
            "id": "img_hw1",
            "url": "https://zcvevxcbfufx3f96.public.blob.vercel-storage.com/lessons/1/lesson_1791307057219_mathd/1791323628229-IMG20261006212805.jpg",
            "name": "نص الواجب المنزلي.jpg"
          }
        ]
      }
    ],
    "announcements": [
      {
        "id": "ann_k1",
        "title": "مواعيد الفرض المحروس الأول لمادة الرياضيات",
        "content": "نعلم أولياء وتلاميذ أقسام 1م1 و 4م2 أن الفرض المحروس الأول سيجرى بحول الله الأسبوع القادم، ويشمل الدروس المدونة في السبورة هنا في المنصة. يرجى المراجعة المكثفة.",
        "pinned": true,
        "active": true,
        "createdAt": "2026-10-18T10:00:00Z"
      },
      {
        "id": "ann_k2",
        "title": "حصص المعالجة البيداغوجية الأسبوعية",
        "content": "تنظم حصة الدعم والمعالجة كل يوم ثلاثاء مساءً من 14:00 إلى 15:00 للتلاميذ الذين سجلت لديهم صعوبات في العمليات الحسابية.",
        "pinned": false,
        "active": true,
        "createdAt": "2026-10-15T09:00:00Z"
      }
    ],
    "honors": [
      {
        "id": "hon_k1",
        "studentName": "صهيب عدايكة",
        "className": "4 متوسط 2",
        "score": "20 / 20",
        "note": "العلامة الكاملة في التقويم التشخيصي والنشاط الصفي المتميز",
        "star": true
      },
      {
        "id": "hon_k2",
        "studentName": "فاطمة الزهراء بن عمارة",
        "className": "1 متوسط 1",
        "score": "19.5 / 20",
        "note": "تنظيم مثالي لكراس الرياضيات والمشاركة الفعالة",
        "star": true
      },
      {
        "id": "hon_k3",
        "studentName": "محمد الأمين بلقاسم",
        "className": "4 متوسط 2",
        "score": "19 / 20",
        "note": "تميز في حل مسألة خوارزمية إقليدس",
        "star": false
      }
    ]
  }'::jsonb,
  NOW()
)
ON CONFLICT (teacher_id) DO UPDATE SET
  data = EXCLUDED.data,
  updated_at = NOW();

-- --------------------------------------------------------------------
-- 5. فضاء الأستاذة 2 مريم عدايكة (MTH-102)
-- --------------------------------------------------------------------
INSERT INTO public.teacher_public_data (teacher_id, data, updated_at)
VALUES (
  'a2222222-2222-2222-2222-222222222222',
  '{
    "lessons": [
      {
        "id": "lesson_adaika_1",
        "level": 2,
        "type": "lessons",
        "field": "أنشطة عددية",
        "section": "المقطع 1 : العمليات على الأعداد الطبيعية والعشرية",
        "number": 1,
        "title": "إجراء سلسلة عمليات بدون أقواس وبوجود أقواس",
        "createdAt": "2026-10-11T09:00:00Z",
        "images": [
          {
            "id": "img_a1",
            "url": "https://zcvevxcbfufx3f96.public.blob.vercel-storage.com/lessons/1/lesson_1791307057219_mathd/1791323630755-IMG20261006212813.jpg",
            "name": "أولوية العمليات الحسابية.jpg"
          }
        ]
      },
      {
        "id": "lesson_adaika_2",
        "level": 3,
        "type": "lessons",
        "field": "أنشطة هندسية",
        "section": "المقطع 1 : المثلثات وخاصية مستقيم المنتصفين",
        "number": 1,
        "title": "خاصية مستقيم المنتصفين في مثلث وتطبيقاتها في البرهان",
        "createdAt": "2026-10-13T11:00:00Z",
        "images": [
          {
            "id": "img_a2",
            "url": "https://zcvevxcbfufx3f96.public.blob.vercel-storage.com/lessons/1/lesson_1791305813257_740bz/1791323587041-IMG20261006212742.jpg",
            "name": "البرهان الهندسي - مستقيم المنتصفين.jpg"
          }
        ]
      }
    ],
    "announcements": [
      {
        "id": "ann_a1",
        "title": "إحضار الأدوات الهندسية (المسطرة والمدور والكوس)",
        "content": "نلفت انتباه التلاميذ وأوليائهم الكرام إلى ضرورة مرافقة التلميذ بأدواته الهندسية كاملة في كل حصة مخصصة للهندسة لتطبيق الأنشطة على الكراس.",
        "pinned": true,
        "active": true,
        "createdAt": "2026-10-14T08:00:00Z"
      }
    ],
    "honors": [
      {
        "id": "hon_a1",
        "studentName": "ريان حامد",
        "className": "2 متوسط 3",
        "score": "20 / 20",
        "note": "دقة متناهية في رسم الأشكال الهندسية والبرهان",
        "star": true
      }
    ]
  }'::jsonb,
  NOW()
)
ON CONFLICT (teacher_id) DO UPDATE SET
  data = EXCLUDED.data,
  updated_at = NOW();

-- --------------------------------------------------------------------
-- 6. ملتقى الأساتذة: نقاشات ومشاركات نموذجية مع التوجيه الرسمي للمفتش
-- --------------------------------------------------------------------

-- موضوع 1: إشكالية الانتقال من الحساب العددي إلى الحساب الحرفي (الأستاذ بلقاسم قدوري)
INSERT INTO public.forum_topics (
  id, author_id, author_name, author_role, kind, category, level,
  title, body, votes, replies_count, has_official, is_pinned, created_at, updated_at
)
VALUES (
  'f1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  'الأستاذ بلقاسم قدوري',
  'teacher',
  'question',
  'difficulties',
  1,
  'إشكالية بيداغوجية: معالجة تعثر الانتقال من الحساب العددي إلى الحساب الحرفي لتلاميذ 1 متوسط',
  'السلام عليكم زميلاتي وزملائي أساتذة مادة الرياضيات بمقاطعات ولاية الوادي، ومفتش المقاطعة المحترم.

نلاحظ دائماً عند الشروع في المقطع المخصص للحساب الحرفي والمعادلات لتلاميذ السنة الأولى متوسط صعوبة بالغة في تقبل "الحرف" كمجهول أو متغير، حيث يميل أغلب التلاميذ للإجابة بالحدس العددي أو يخلطون بين رمز الضرب وعلامة x.

ما هي المقاربات والوضعيات المحسوسة الأنجع التي تعتمدونها في كراس القسم لتيسير هذا الانتقال المفاهيمي الهام؟',
  5,
  2,
  true,
  true,
  NOW() - INTERVAL '2 days',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  has_official = true,
  is_pinned = true,
  replies_count = 2,
  votes = 5;

-- رد 1 من الأستاذة مريم عدايكة
INSERT INTO public.forum_replies (
  id, topic_id, author_id, author_name, author_role, body, is_official, votes, created_at
)
VALUES (
  'de111111-1111-1111-1111-111111111111',
  'f1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'الأستاذة مريم عدايكة',
  'teacher',
  'وعليكم السلام ورحمة الله أستاذ بلقاسم.

من واقع تجربتي الميدانية في متوسطة عبد الحميد بن باديس، نعتمد نشاط "الميزان ذي الكفتين" والأكياس المجهولة:
نضع في كفة 3 كريات معلومة وكيس مجهول وزنه، وفي الكفة الأخرى 8 كريات متطابقة، ونطلب من التلميذ التعبير عن توازن الكفتين. هذا يعطي الحرف x دلالة واقعية محسوسة تجعله يدرك أن الحرف هو مجرد غطاء لقيمة عددية نبحث عنها.',
  false,
  3,
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE SET body = EXCLUDED.body;

-- رد 2 من مفتش المقاطعة 1: عبد القادر لعموري (توجيه رسمي معتمد 👑)
INSERT INTO public.forum_replies (
  id, topic_id, author_id, author_name, author_role, body, is_official, votes, created_at
)
VALUES (
  'de222222-2222-2222-2222-222222222222',
  'f1111111-1111-1111-1111-111111111111',
  'b1111111-1111-1111-1111-111111111111',
  'الأستاذ عبد القادر لعموري',
  'inspector',
  'تحية تربوية تقديرية للأستاذ بلقاسم قدوري على فتح هذا النقاش البيداغوجي الجوهري، وشكراً للأستاذة مريم على مساهمتها القيمة.

توجيه بيداغوجي رسمي معتمد:
وفقاً للتدرجات السنوية لمناهج مادة الرياضيات الصادرة عن المفتشية العامة للبيداغوجيا (سبتمبر 2024)، يُرجى من كافة أساتذة المقاطعة الالتزام بما يلي:

1. تنويع الحروف الأبجدية (a, b, m, x) وتفادي حصر الحساب الحرفي في x منعاً لتداخله البصري مع رمز الضرب.
2. استخدام اتفاقيات الكتابة الرياضية بالتدريج (كحذف رمز الضرب قبل الحرف أو القوس: 3x بدلاً من 3 × x) وتبرير ذلك اقتصاداً في الكتابة الرياضية.
3. الانطلاق من وضعيات هندسية معلومة (محيط مستطيل أبعاده 5 و a، مساحة مربع طول ضلعه x) لتثبيت دور الحرف كمتغير.
4. عدم القفز إلى حل المعادلات بالقواعد الجبرية الصرفة، بل تثبيت مفهوم "المساواة" والتعويض العددي أولاً للتأكد من صحتها.

سيتم تعميق هذه التوجيهات خلال الندوة التربوية المقبلة للمقاطعة بمشيئة الله.',
  true,
  8,
  NOW() - INTERVAL '18 hours'
)
ON CONFLICT (id) DO UPDATE SET
  body = EXCLUDED.body,
  is_official = true,
  votes = 8;

-- موضوع 2: بنك الوضعيات لشهادة BEM (الأستاذ إبراهيم التجاني)
INSERT INTO public.forum_topics (
  id, author_id, author_name, author_role, kind, category, level,
  title, body, votes, replies_count, has_official, is_pinned, created_at, updated_at
)
VALUES (
  'f2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333',
  'الأستاذ إبراهيم التجاني',
  'teacher',
  'resource',
  'situations',
  4,
  'بنك الوضعيات: وضعية انطلاقية مركبة في الهندسة الفضائية وحساب الحجوم (تحضير BEM 2026)',
  'زميلاتي وزملائي الكرام، أضع بين أيديكم وضعية انطلاقية مركبة تم إعدادها لتلاميذ السنة الرابعة متوسط بمتوسطة مالك بن نبي بالوادي.

تدمج الوضعية بين:
- حساب حجم خزان مائي مركب من أسطوانة دوران ونصف كرة.
- توظيف النسب المثلثية وحساب الزوايا وأطوال الارتفاعات.
- دراسة تكلفة طلاء الخزان وترشيد الاستهلاك مع دالة خطية.

الوضعية مجربة وممتازة لقياس كفاءة الإدماج والتحضير لشهادة التعليم المتوسط، وأدعوكم لمشاركتنا ملاحظاتكم لتحسينها.',
  4,
  0,
  false,
  false,
  NOW() - INTERVAL '1 day',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body;

-- --------------------------------------------------------------------
-- 7. منشور رسمي من مفتش المقاطعة 1 إلى أساتذة المقاطعة
-- --------------------------------------------------------------------
ALTER TABLE public.inspector_circulars
  ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS event_place TEXT;

INSERT INTO public.inspector_circulars (
  id, inspector_id, district_id, title, content, event_date, event_place, created_at
)
VALUES (
  'c1111111-1111-1111-1111-111111111111',
  'b1111111-1111-1111-1111-111111111111',
  1,
  'منشور تفتيشي رقم 01/2026: انعقاد الندوة التربوية الأولى لمقاطعة الوادي 1',
  'إلى السيدات والسادة أساتذة مادة الرياضيات لمرحلة التعليم المتوسط — المقاطعة التفتيشية الأولى (ولاية الوادي 1):

يشرفنا إعلامكم بتنظيم الندوة التربوية البيداغوجية الأولى للموسم الدراسي الحالي تحت عنوان:
«هندسة التعلمات وبناء الوضعية المشكلة وفق التدرجات السنوية 2024/2025».

المكان: مدرج متوسطة الشهيد حمة الأخضر — حي 19 مارس بالوادي.
التاريخ: يوم الخميس 06 نوفمبر 2026 ابتداءً من الساعة 08:30 صباحاً.

حضور جميع أساتذة المقاطعة إلزامي، مع إحضار دفاتر النصوص ودفاتر التحضير اليومية.',
  '2026-11-06',
  'متوسطة الشهيد حمة الأخضر — الوادي',
  NOW() - INTERVAL '3 days'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content;

-- --------------------------------------------------------------------
-- 8. وثائق الملف البيداغوجي للأستاذ 1 مع مراجعة المفتش واعتمادها
-- --------------------------------------------------------------------
ALTER TABLE public.pedagogical_notes
  ADD COLUMN IF NOT EXISTS doc_type TEXT NOT NULL DEFAULT 'lesson_plan',
  ADD COLUMN IF NOT EXISTS field TEXT,
  ADD COLUMN IF NOT EXISTS section TEXT,
  ADD COLUMN IF NOT EXISTS session_number INTEGER;

INSERT INTO public.pedagogical_notes (
  id, teacher_id, district_id, level, semester, lesson_title, file_path, file_name,
  doc_type, status, inspector_feedback, reviewed_at, created_at
)
VALUES (
  'ed111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  1,
  1,
  1,
  'مذكرة الدرس 01: قراءة وكتابة وتفكيك الأعداد الطبيعية والعشرية',
  'a1111111-1111-1111-1111-111111111111/note_01_decimaux.pdf',
  'note_01_decimaux.pdf',
  'lesson_plan',
  'reviewed',
  'مذكرة تربوية جيدة ومطابقة لمؤشرات الكفاءة الختامية للمقطع. التوزيع الزمني مناسب جداً، وحبذا تكثيف أنشطة التعلم الذاتي في المرحلة الثانية. عمل موفق ومشكور.',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '5 days'
),
(
  'ed222222-2222-2222-2222-222222222222',
  'a1111111-1111-1111-1111-111111111111',
  1,
  4,
  1,
  'التوزيع السنوي الرسمي لمادة الرياضيات — السنة الرابعة متوسط 2024/2025',
  'a1111111-1111-1111-1111-111111111111/repartition_annuelle_4am.pdf',
  'repartition_annuelle_4am.pdf',
  'annual_distribution',
  'reviewed',
  'التوزيع السنوي معتمد رسمياً ومطابق للحجم الساعي الأسبوعي (4.5 ساعات). يُرجى مراعاة فترات التقويم التشخيصي والمعالجة البيداغوجية.',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '7 days'
)
ON CONFLICT (id) DO UPDATE SET
  lesson_title = EXCLUDED.lesson_title,
  file_path = EXCLUDED.file_path,
  file_name = EXCLUDED.file_name,
  doc_type = EXCLUDED.doc_type,
  status = EXCLUDED.status,
  inspector_feedback = EXCLUDED.inspector_feedback,
  reviewed_at = EXCLUDED.reviewed_at;
