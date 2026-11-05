-- ====================================================================
-- تبسيط لوحة المشرف العام وإلغاء قيود التحقق واعتماد التسجيل المباشر
-- 1) جعل الحسابات مفعلة ومعتمدة فورياً دون انتظار أي موافقة
-- 2) إضافة أعمدة email و initial_password و subject لجدول profiles
-- 3) تحديث محفز المستخدم الجديد لمزامنة البريد وتفعيل الحساب مباشرة
-- ====================================================================

-- 1. إضافة الأعمدة المطلوبة لجدول profiles إن لم تكن موجودة
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initial_password TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'mathematics';

-- 2. إلغاء أي حالة انتظار موافقة واعتماد كل الحسابات فورياً
ALTER TABLE public.profiles ALTER COLUMN is_verified SET DEFAULT TRUE;
ALTER TABLE public.profiles ALTER COLUMN verification_status SET DEFAULT 'approved';

-- تحديث كافة الحسابات الحالية لتكون مفعلة ومعتمدة مباشرة
UPDATE public.profiles
SET is_verified = TRUE, verification_status = 'approved'
WHERE is_verified IS NOT TRUE OR verification_status <> 'approved';

-- 3. مزامنة البريد الإلكتروني لكافة الحسابات من جدول auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- 4. تحديث دالة ومحفز المستخدم الجديد handle_new_user ليعتمد الحساب ويسجل البريد والمادة فوراً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  meta   JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_slug TEXT  := COALESCE(NULLIF(meta->>'slug', ''), 'prof-' || SUBSTRING(NEW.id::text, 1, 6));
  v_code TEXT  := COALESCE(NULLIF(meta->>'teacher_code', ''), 'MTH-' || UPPER(SUBSTRING(NEW.id::text, 1, 4)));
  v_subject TEXT := COALESCE(NULLIF(meta->>'subject', ''), 'mathematics');
  v_levels SMALLINT[];
BEGIN
  -- ضمان فرادة الرابط والكود
  IF EXISTS (SELECT 1 FROM public.profiles WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || SUBSTRING(NEW.id::text, 1, 4);
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE teacher_code = v_code) THEN
    v_code := v_code || '-' || UPPER(SUBSTRING(NEW.id::text, 1, 3));
  END IF;

  -- استخراج المستويات التي يدرسها
  IF jsonb_typeof(meta->'levels_taught') = 'array' THEN
    SELECT array_agg(DISTINCT lvl::SMALLINT ORDER BY lvl::SMALLINT)
    INTO v_levels
    FROM jsonb_array_elements_text(meta->'levels_taught') AS lvl
    WHERE lvl IN ('1', '2', '3', '4');
  END IF;

  -- إدراج الحساب مفعل ومعتمد مباشرة وبالمادة والبريد
  INSERT INTO public.profiles (
    id, email, role, full_name, phone, district_id, middle_school_id,
    school_custom_name, teacher_code, slug, levels_taught, subject,
    is_verified, verification_status, initial_password
  )
  VALUES (
    NEW.id,
    NEW.email,
    'teacher',
    COALESCE(NULLIF(meta->>'full_name', ''), 'أستاذ مسجل'),
    meta->>'phone',
    NULLIF(meta->>'district_id', '')::INTEGER,
    NULLIF(meta->>'middle_school_id', '')::UUID,
    meta->>'school_custom_name',
    v_code,
    v_slug,
    COALESCE(v_levels, ARRAY[1, 2, 3, 4]::SMALLINT[]),
    v_subject,
    TRUE,
    'approved',
    meta->>'initial_password'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    subject = COALESCE(NULLIF(EXCLUDED.subject, ''), public.profiles.subject),
    is_verified = TRUE,
    verification_status = 'approved';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
