-- ====================================================================
-- حل فوري لمشكلة: AuthRetryableFetchError (Database error querying schema)
-- السبب: وجود حقول NULL في جدول auth.users بدلاً من نصوص فارغة ''
-- انسخ هذا الاستعلام بالكامل وألصقه في:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. إصلاح الحقول التي يطلبها محرك GoTrue في auth.users
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone = COALESCE(phone, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE 
  confirmation_token IS NULL
  OR recovery_token IS NULL
  OR email_change IS NULL
  OR phone IS NULL;

-- 2. تأكيد تأكيد البريد الإلكتروني لحسابات العرض التجريبي لتسجيل الدخول المباشر
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  confirmed_at = COALESCE(confirmed_at, NOW())
WHERE 
  email LIKE '%@eloued-math.dz';

-- 3. التحقق من النتيجة
SELECT id, email, role, email_confirmed_at, confirmation_token, phone 
FROM auth.users;
