-- ====================================================================
-- حل فوري لمشكلة: AuthRetryableFetchError (Database error querying schema)
-- ====================================================================
-- انسخ هذا الاستعلام بالكامل والصقه في:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. إعادة phone إلى NULL في حال تم إسناد نص فارغ سابقاً لتفادي انتهاك users_phone_key
UPDATE auth.users
SET phone = NULL
WHERE phone = '';

-- 2. ضبط حقول الرموز التي يطلبها محرك GoTrue كنصوص فارغة
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

-- 3. تأكيد البريد الإلكتروني لحسابات العرض التجريبي للدخول المباشر
-- (ملاحظة: confirmed_at هو عمود يتم توليده تلقائياً من Postgres لذا نحدث فقط email_confirmed_at)
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE 
  email LIKE '%@eloued-math.dz';

-- 4. إظهار النتيجة للتأكد
SELECT id, email, role, email_confirmed_at, confirmation_token 
FROM auth.users;
