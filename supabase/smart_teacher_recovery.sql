-- ====================================================================
-- نظام استرجاع الحساب وتعيين كلمة المرور الذكي لأساتذة منصة جسور
-- يتيح للأستاذ استعادة حسابه حتى لو نسي بريده أو كلمة المرور أو كلاهما
-- عبر استخدام كود الأستاذ (مثل MTH-704) أو البريد الإلكتروني أو الاسم
-- ====================================================================
-- التعليمات:
-- انسخ هذا الملف بالكامل والصقه في:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. دالة البحث الذكي عن حساب الأستاذ لمعاينة بياناته قبل الاسترجاع
CREATE OR REPLACE FUNCTION public.smart_find_teacher_account(
  p_query text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_rec record;
  v_masked_email text;
  v_at_idx int;
BEGIN
  p_query := trim(p_query);

  IF p_query = '' THEN
    RETURN json_build_object('found', false, 'error', 'يرجى إدخال كود الأستاذ أو البريد الإلكتروني أو الاسم');
  END IF;

  SELECT 
    p.id,
    p.full_name,
    p.teacher_code,
    p.school_custom_name,
    p.slug,
    p.levels_taught,
    p.subject,
    u.email
  INTO v_rec
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = lower(p_query)
     OR upper(p.teacher_code) = upper(p_query)
     OR lower(p.slug) = lower(p_query)
     OR p.full_name ILIKE '%' || p_query || '%'
  LIMIT 1;

  IF v_rec.id IS NULL THEN
    RETURN json_build_object('found', false, 'error', 'لم يتم العثور على أي حساب مسجل بهذه البيانات');
  END IF;

  -- إظهار البريد للأستاذ ليساعده على تذكره
  v_at_idx := position('@' in v_rec.email);
  IF v_at_idx > 3 THEN
    v_masked_email := substring(v_rec.email from 1 for 2) || '••••' || substring(v_rec.email from v_at_idx - 1);
  ELSE
    v_masked_email := v_rec.email;
  END IF;

  RETURN json_build_object(
    'found', true,
    'id', v_rec.id,
    'full_name', v_rec.full_name,
    'teacher_code', v_rec.teacher_code,
    'school_custom_name', COALESCE(v_rec.school_custom_name, 'متوسطة'),
    'slug', v_rec.slug,
    'subject', COALESCE(v_rec.subject, 'mathematics'),
    'email_hint', v_masked_email,
    'email_exact', v_rec.email
  );
END;
$$;

-- 2. دالة التعيين الذكي لكلمة المرور بواسطة كود الأستاذ أو البريد
CREATE OR REPLACE FUNCTION public.smart_reset_teacher_password(
  p_identifier text,
  p_new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_encrypted_pw text;
BEGIN
  p_identifier := trim(p_identifier);

  IF length(p_new_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل');
  END IF;

  -- تحديد صاحب الحساب
  SELECT p.id, u.email INTO v_user_id, v_email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(u.email) = lower(p_identifier)
     OR upper(p.teacher_code) = upper(p_identifier)
     OR lower(p.slug) = lower(p_identifier)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'لم يتم العثور على حساب أستاذ مطابق لكود الأستاذ أو البريد المدخل');
  END IF;

  -- تشفير كلمة المرور بـ bcrypt
  v_encrypted_pw := extensions.crypt(p_new_password, extensions.gen_salt('bf'));

  -- تحديث كلمة المرور في جدول auth.users
  UPDATE auth.users
  SET encrypted_password = v_encrypted_pw,
      updated_at = NOW(),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تم تعيين كلمة المرور الجديدة بنجاح',
    'email', v_email,
    'user_id', v_user_id
  );
END;
$$;

-- منح صلاحيات الاستدعاء للزوار (المصرح وغير المصرح) لاستعادة الحساب
GRANT EXECUTE ON FUNCTION public.smart_find_teacher_account(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.smart_reset_teacher_password(text, text) TO anon, authenticated;

-- 3. دالة التحديث المباشر للبريد الإلكتروني للأستاذ المسجل دخوله
CREATE OR REPLACE FUNCTION public.smart_update_teacher_email(
  p_new_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'يجب تسجيل الدخول أولاً');
  END IF;

  p_new_email := lower(trim(p_new_email));
  IF position('@' in p_new_email) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'البريد الإلكتروني غير صالح');
  END IF;

  UPDATE auth.users
  SET email = p_new_email,
      updated_at = NOW(),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'message', 'تم تحديث البريد الإلكتروني بنجاح', 'email', p_new_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.smart_update_teacher_email(text) TO authenticated;

