-- ====================================================================
-- نظام التحقق والاعتماد الصارم للأساتذة (Teacher CV & Identity Verification)
-- 1) حقول التحقق من الوثائق (verification_doc_url, verification_status, rejection_reason)
-- 2) الحساب الجديد مغلق افتراضياً (is_verified = FALSE) وينتظر اعتماد المشرف العام
-- 3) مخزن سحابي خاص ومحمي للوثائق والسير الذاتية (verification-docs)
-- 4) دوال آمنة للأدمن للاعتماد أو الرفض
-- ====================================================================

-- 1. إضافة أعمدة التحقق لجدول profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_doc_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- تغيير القيمة الافتراضية لـ is_verified إلى FALSE (للحسابات الجديدة مستقبلاً)
ALTER TABLE public.profiles ALTER COLUMN is_verified SET DEFAULT FALSE;

-- 2. مخزن السير الذاتية والوثائق الإثباتية الخاص
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Teacher upload own verification doc" ON storage.objects;
CREATE POLICY "Teacher upload own verification doc" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Teacher and Admin read verification doc" ON storage.objects;
CREATE POLICY "Teacher and Admin read verification doc" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

DROP POLICY IF EXISTS "Admin and Teacher delete verification doc" ON storage.objects;
CREATE POLICY "Admin and Teacher delete verification doc" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'verification-docs'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

-- 3. تحديث محفز المستخدم الجديد لتعطيل الحساب افتراضياً وتخزين رابط الوثيقة
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
    is_verified, verification_status, verification_doc_url, submitted_at
  )
  VALUES (
    NEW.id,
    'teacher',
    COALESCE(NULLIF(meta->>'full_name', ''), 'أستاذ جديد'),
    NULLIF(meta->>'district_id', '')::INTEGER,
    NULLIF(meta->>'middle_school_id', '')::UUID,
    meta->>'school_custom_name',
    v_code,
    v_slug,
    COALESCE(v_levels, ARRAY[1, 2, 3, 4]::SMALLINT[]),
    false, -- الحساب مغلق افتراضياً لحين مراجعة الوثيقة واعتماده من المشرف
    'pending',
    NULLIF(meta->>'verification_doc_url', ''),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  IF NULLIF(btrim(COALESCE(meta->>'phone', '')), '') IS NOT NULL THEN
    INSERT INTO public.profile_contacts (id, phone)
    VALUES (NEW.id, btrim(meta->>'phone'))
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. دوال المشرف العام لاعتماد أو رفض الأساتذة
CREATE OR REPLACE FUNCTION public.approve_teacher(target_teacher_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح: المشرف العام فقط يمكنه اعتماد الأساتذة';
  END IF;

  UPDATE public.profiles
  SET is_verified = TRUE, verification_status = 'approved', rejection_reason = NULL
  WHERE id = target_teacher_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_teacher(target_teacher_id UUID, p_reason TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح: المشرف العام فقط يمكنه رفض طلبات الأساتذة';
  END IF;

  UPDATE public.profiles
  SET is_verified = FALSE, verification_status = 'rejected', rejection_reason = p_reason
  WHERE id = target_teacher_id;
END;
$$;
