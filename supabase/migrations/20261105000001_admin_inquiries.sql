-- ====================================================================
-- جدول استفسارات وتذاكر التواصل مع إدارة المنصة (الأساتذة والزوار)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.admin_inquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code   TEXT NOT NULL UNIQUE,
  secret_token    TEXT NOT NULL,
  sender_type     TEXT NOT NULL CHECK (sender_type IN ('teacher', 'visitor')),
  is_anonymous    BOOLEAN NOT NULL DEFAULT FALSE,
  sender_name     TEXT,
  sender_email    TEXT,
  sender_phone    TEXT,
  sender_role     TEXT,                                  -- 'أستاذ', 'ولي أمر', 'تلميذ', 'زائر', 'مجهول'
  teacher_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  teacher_code    TEXT,
  subject_name    TEXT,
  school_name     TEXT,
  wilaya          TEXT,
  category        TEXT NOT NULL DEFAULT 'general',
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'closed')),
  admin_reply     TEXT,
  replied_at      TIMESTAMPTZ,
  replied_by      TEXT,
  read_by_sender  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- الفهارس لتسريع البحث والفلترة
CREATE INDEX IF NOT EXISTS idx_admin_inquiries_code ON public.admin_inquiries(tracking_code);
CREATE INDEX IF NOT EXISTS idx_admin_inquiries_status ON public.admin_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_admin_inquiries_teacher ON public.admin_inquiries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_admin_inquiries_created ON public.admin_inquiries(created_at DESC);

-- تفعيل سياسات الأمان على مستوى السطر (RLS)
ALTER TABLE public.admin_inquiries ENABLE ROW LEVEL SECURITY;

-- 1) السماح للجميع (زائر أو مسجل) بإرسال استفسار جديد
DROP POLICY IF EXISTS "admin_inquiries_public_insert" ON public.admin_inquiries;
CREATE POLICY "admin_inquiries_public_insert" ON public.admin_inquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 2) إتاحة كافة الصلاحيات للمشرف العام فقط
DROP POLICY IF EXISTS "admin_inquiries_admin_all" ON public.admin_inquiries;
CREATE POLICY "admin_inquiries_admin_all" ON public.admin_inquiries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- 3) إتاحة قراءة التذاكر المعلنة للأستاذ صاحب التذكرة
DROP POLICY IF EXISTS "admin_inquiries_teacher_read" ON public.admin_inquiries;
CREATE POLICY "admin_inquiries_teacher_read" ON public.admin_inquiries
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

-- دالة آمنة للاستعلام السري عن التذكرة بالرمز السري والكود (دون كشف أي تذاكر أخرى للزوار)
CREATE OR REPLACE FUNCTION public.get_admin_inquiry_by_token(p_code TEXT, p_token TEXT)
RETURNS SETOF public.admin_inquiries
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.admin_inquiries
  WHERE UPPER(TRIM(tracking_code)) = UPPER(TRIM(p_code))
    AND TRIM(secret_token) = TRIM(p_token)
  LIMIT 1;
$$;
