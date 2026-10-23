-- ====================================================================
-- الحل الجذري النهائي: السماح بإنشاء حسابات الأساتذة فورياً بدون موافقة
-- وتجاوز حارس التوثيق guard_profile_privileges ودون إرسال رسائل أو Rate Limit
-- ====================================================================
-- انسخ هذا الملف بالكامل وألصقه في:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. التأكد من وجود عمود subject في profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subject TEXT;

-- 2. تحديث حارس الصلاحيات guard_profile_privileges للسماح بالـ bypass أثناء التسجيل المعتمد
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger AS $$
BEGIN
  -- السماح إذا كانت المعاملة من داخل دالة نظام موثوقة (app.bypass_guard) أو المشرف العام أو بدون مستخدم
  IF current_setting('app.bypass_guard', true) = 'on'
     OR auth.uid() IS NULL 
     OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.district_id IS DISTINCT FROM OLD.district_id
     OR NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'غير مسموح بتغيير الدور أو المقاطعة أو حالة التوثيق إلا من طرف المشرف العام'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. تحديث دالة إنشاء الحساب التلقائي handle_new_user لتعتمد الحساب فورياً للأستاذ
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  meta   JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_slug TEXT  := COALESCE(NULLIF(meta->>'slug', ''), 'prof-' || SUBSTRING(NEW.id::text, 1, 6));
  v_code TEXT  := COALESCE(NULLIF(meta->>'teacher_code', ''), 'MTH-' || UPPER(SUBSTRING(NEW.id::text, 1, 4)));
  v_levels SMALLINT[];
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || SUBSTRING(NEW.id::text, 1, 4);
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE teacher_code = v_code) THEN
    v_code := v_code || '-' || UPPER(SUBSTRING(NEW.id::text, 1, 3));
  END IF;

  IF jsonb_typeof(meta->'levels_taught') = 'array' THEN
    SELECT array_agg(DISTINCT lvl::SMALLINT ORDER BY lvl::SMALLINT)
    INTO v_levels
    FROM jsonb_array_elements_text(meta->'levels_taught') AS lvl
    WHERE lvl IN ('1', '2', '3', '4');
  END IF;

  INSERT INTO public.profiles (
    id, role, full_name, district_id, middle_school_id,
    school_custom_name, teacher_code, slug, levels_taught,
    is_verified, verification_status, submitted_at, subject
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(meta->>'role', ''), 'teacher'),
    COALESCE(NULLIF(meta->>'full_name', ''), 'أستاذ جديد'),
    NULLIF(meta->>'district_id', '')::INTEGER,
    NULLIF(meta->>'middle_school_id', '')::UUID,
    meta->>'school_custom_name',
    v_code,
    v_slug,
    COALESCE(v_levels, ARRAY[1, 2, 3, 4]::SMALLINT[]),
    true, -- تفعيل فوري معتمد بدون انتظار مراجعة وثائق
    'approved',
    NOW(),
    meta->>'subject'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    district_id = EXCLUDED.district_id,
    school_custom_name = EXCLUDED.school_custom_name,
    teacher_code = EXCLUDED.teacher_code,
    slug = EXCLUDED.slug,
    is_verified = true,
    verification_status = 'approved',
    subject = EXCLUDED.subject;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. دالة التسجيل الفوري register_teacher_instant
CREATE OR REPLACE FUNCTION public.register_teacher_instant(
  p_email text,
  p_password text,
  p_full_name text,
  p_subject text DEFAULT 'mathematics',
  p_district_id int DEFAULT 1,
  p_school_custom_name text DEFAULT 'متوسطة ولاية الوادي',
  p_teacher_code text DEFAULT '',
  p_slug text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
  v_code text := p_teacher_code;
  v_slug text := p_slug;
BEGIN
  -- تجاوز حارس الصلاحيات أثناء التسجيل المعتمد
  PERFORM set_config('app.bypass_guard', 'on', true);

  p_email := lower(trim(p_email));
  
  IF p_email = '' OR p_password = '' OR p_full_name = '' THEN
    RETURN json_build_object('success', false, 'error', 'يرجى ملء جميع الحقول الإلزامية');
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = p_email) THEN
    RETURN json_build_object('success', false, 'error', 'البريد الإلكتروني مسجل مسبقاً في المنصة');
  END IF;

  IF v_code = '' THEN
    v_code := 'MTH-' || floor(100 + random() * 900)::text;
  END IF;
  IF v_slug = '' THEN
    v_slug := 'prof-' || substr(md5(random()::text), 1, 6);
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- إدراج المستخدم في auth.users
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, reauthentication_token
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    v_encrypted_pw,
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    json_build_object(
      'full_name', p_full_name,
      'role', 'teacher',
      'subject', p_subject,
      'district_id', p_district_id,
      'school_custom_name', p_school_custom_name,
      'teacher_code', v_code,
      'slug', v_slug,
      'is_verified', true,
      'verification_status', 'approved'
    )::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '', '', '', '', '', ''
  );

  -- تحديث أو إدراج الملف الشخصي للتأكيد
  INSERT INTO public.profiles (
    id, role, full_name, district_id, school_custom_name,
    teacher_code, slug, levels_taught, is_verified, verification_status, subject
  )
  VALUES (
    v_user_id,
    'teacher',
    p_full_name,
    p_district_id,
    p_school_custom_name,
    v_code,
    v_slug,
    ARRAY[1, 2, 3, 4],
    true,
    'approved',
    p_subject
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'teacher',
    full_name = EXCLUDED.full_name,
    district_id = EXCLUDED.district_id,
    school_custom_name = EXCLUDED.school_custom_name,
    teacher_code = EXCLUDED.teacher_code,
    slug = EXCLUDED.slug,
    is_verified = true,
    verification_status = 'approved',
    subject = EXCLUDED.subject;

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email,
    'teacher_code', v_code,
    'slug', v_slug
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_teacher_instant TO anon, authenticated;
