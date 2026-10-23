-- ====================================================================
-- دالة التسجيل الفوري للأساتذة بدون رسائل تأكيد وبدون قيود Rate Limit
-- ====================================================================
-- تتيح هذه الدالة تسجيل أي أستاذ فورياً وبأي بريد إلكتروني (حتى لو كان افتراضياً)
-- مع تفعيل فوري واعتماد رسمي دون انتظار بريد أو قيود
-- ====================================================================
-- انسخ هذا الاستعلام بالكامل وألصقه في:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

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
  -- 1. تنظيف البريد
  p_email := lower(trim(p_email));
  
  IF p_email = '' OR p_password = '' OR p_full_name = '' THEN
    RETURN json_build_object('success', false, 'error', 'يرجى ملء جميع الحقول الإلزامية');
  END IF;

  -- 2. التحقق من عدم وجود المستخدم مسبقاً
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = p_email) THEN
    RETURN json_build_object('success', false, 'error', 'البريد الإلكتروني مسجل مسبقاً في المنصة');
  END IF;

  -- 3. توليد الكود والـ slug إذا لم يوفرا
  IF v_code = '' THEN
    v_code := 'MTH-' || floor(100 + random() * 900)::text;
  END IF;
  IF v_slug = '' THEN
    v_slug := 'prof-' || substr(md5(random()::text), 1, 6);
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- 4. إدراج المستخدم في auth.users مفعل ومؤكد فوراً بدون إرسال أي إيميل
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
      'teacher_code', v_code,
      'slug', v_slug
    )::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '', '', '', '', '', ''
  );

  -- 5. إدراج أو تحديث الملف الشخصي في profiles
  INSERT INTO public.profiles (
    id, role, full_name, subject, district_id, school_custom_name,
    teacher_code, slug, levels_taught, is_verified, verification_status
  )
  VALUES (
    v_user_id,
    'teacher',
    p_full_name,
    p_subject,
    p_district_id,
    p_school_custom_name,
    v_code,
    v_slug,
    ARRAY[1, 2, 3, 4],
    true,
    'approved'
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'teacher',
    full_name = EXCLUDED.full_name,
    subject = EXCLUDED.subject,
    district_id = EXCLUDED.district_id,
    school_custom_name = EXCLUDED.school_custom_name,
    teacher_code = EXCLUDED.teacher_code,
    slug = EXCLUDED.slug,
    is_verified = true,
    verification_status = 'approved';

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

-- منح الإذن للمستخدمين المجهولين (anon) لتشغيل دالة التسجيل الفوري
GRANT EXECUTE ON FUNCTION public.register_teacher_instant TO anon, authenticated;
