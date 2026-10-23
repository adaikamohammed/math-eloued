-- ====================================================================
-- حل فوري لمشكلة: AuthRetryableFetchError (Database error querying schema)
-- مع الحفاظ على قيد الفرادة users_phone_key (حقل phone يجب أن يبقى NULL)
-- ====================================================================
-- انسخ هذا الاستعلام بالكامل والصقه في:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. إعادة phone إلى NULL في حال تم تعيينه كنص فارغ سابقاً
-- (في PostgreSQL: الـ NULL مسموح تكراره في الـ UNIQUE constraint، بينما '' يسبب duplicate key)
UPDATE auth.users
SET phone = NULL
WHERE phone = '';

-- 2. ضبط حقول الرموز فقط التي يطلبها محرك GoTrue كنصوص فارغة
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE 
  confirmation_token IS NULL
  OR recovery_token IS NULL
  OR email_change IS NULL
  OR email_change_token_new IS NULL;

-- 3. تأكيد البريد الإلكتروني لحسابات العرض التجريبي للدخول الفوري
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  confirmed_at = COALESCE(confirmed_at, NOW())
WHERE 
  email LIKE '%@eloued-math.dz';

-- 4. إظهار النتيجة للتأكد
SELECT id, email, role, email_confirmed_at, confirmation_token, phone 
FROM auth.users;
