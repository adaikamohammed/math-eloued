-- ====================================================================
-- ط¥طµظ„ط§ط­ط§طھ ط£ظ…ظ†ظٹط© ط­ط±ط¬ط© (PROJECT_REVIEW.md #4 - #6)
-- 1) ظ…ظ†ط¹ ط§ط®طھظٹط§ط± ط§ظ„ط¯ظˆط± (admin / inspector) ط¹ظ†ط¯ ط§ظ„طھط³ط¬ظٹظ„
-- 2) ظ…ظ†ط¹ ط§ظ„ط£ط³طھط§ط° ظ…ظ† طھط±ظ‚ظٹط© ظ†ظپط³ظ‡ ط£ظˆ طھط؛ظٹظٹط± ظ…ظ‚ط§ط·ط¹طھظ‡
-- 3) ط¹ط²ظ„ ط§ظ„ظ…ط°ظƒط±ط§طھ ظˆط§ظ„ظ…ط®ط§ط²ظ† ط§ظ„ط®ط§طµط© ط­ط³ط¨ طµط§ط­ط¨ظ‡ط§ ظˆظ…ظ‚ط§ط·ط¹طھظ‡
-- + ط¯ظˆط§ظ„ ظ…ط³ط§ط¹ط¯ط© SECURITY DEFINER ظ„طھظپط§ط¯ظٹ ط§ظ„طھظƒط±ط§ط± ط§ظ„ظ„ط§ظ†ظ‡ط§ط¦ظٹ ظپظٹ ط³ظٹط§ط³ط§طھ profiles
-- ظٹظڈط·ط¨ظژظ‘ظ‚ ظ…ط±ط© ظˆط§ط­ط¯ط© ظپظٹ: Supabase > SQL Editor > Run (ط¢ظ…ظ† ظ„ط¥ط¹ط§ط¯ط© ط§ظ„طھط´ط؛ظٹظ„)
-- ====================================================================

-- --------------------------------------------------------------------
-- ط£) ط¯ظˆط§ظ„ ظ…ط³ط§ط¹ط¯ط© (طھطھط¬ط§ظˆط² RLS ظ„ظ‚ط±ط§ط،ط© ط¯ظˆط± ط§ظ„ظ…ط³طھط®ط¯ظ… ط§ظ„ط­ط§ظ„ظٹ ظپظ‚ط·)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.my_district()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT district_id FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()), false) $$;

-- --------------------------------------------------------------------
-- ط¨) #4 ط§ظ„ظ…ط­ظپط²: ظƒظ„ ط­ط³ط§ط¨ ط¬ط¯ظٹط¯ ط£ط³طھط§ط° ط¯ط§ط¦ظ…ط§ظ‹ (طھط¬ط§ظ‡ظ„ role ط§ظ„ظ‚ط§ط¯ظ… ظ…ظ† ط§ظ„ظ…طھطµظپط­)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    phone,
    district_id,
    middle_school_id,
    school_custom_name,
    teacher_code,
    slug,
    levels_taught
  )
  VALUES (
    NEW.id,
    'teacher', -- ظ„ط§ ظٹظڈظ‚ط¨ظ„ ط§ظ„ط¯ظˆط± ظ…ظ† ط¨ظٹط§ظ†ط§طھ ط§ظ„طھط³ط¬ظٹظ„ط› ط§ظ„طھط±ظ‚ظٹط© ط­طµط±ط§ظ‹ ط¹ط¨ط± ط§ظ„ظ…ط´ط±ظپ ط§ظ„ط¹ط§ظ…
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'ط£ط³طھط§ط° ط¬ط¯ظٹط¯'),
    NEW.raw_user_meta_data->>'phone',
    NULLIF(NEW.raw_user_meta_data->>'district_id', '')::INTEGER,
    CASE
      WHEN NEW.raw_user_meta_data->>'middle_school_id' IS NOT NULL AND NEW.raw_user_meta_data->>'middle_school_id' <> ''
      THEN (NEW.raw_user_meta_data->>'middle_school_id')::UUID
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'school_custom_name',
    COALESCE(NEW.raw_user_meta_data->>'teacher_code', 'MTH-' || UPPER(SUBSTRING(NEW.id::text, 1, 4))),
    COALESCE(NEW.raw_user_meta_data->>'slug', 'prof-' || SUBSTRING(NEW.id::text, 1, 6)),
    ARRAY[1, 2, 3, 4]::SMALLINT[]
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- طھطµط­ظٹط­ ط£ظٹ ط­ط³ط§ط¨ ط³ط¨ظ‚ ط£ظ† ط³ط¬ظ‘ظ„ ظ†ظپط³ظ‡ ط¨ط¯ظˆط± ظ…ط±طھظپط¹: ط±ط§ط¬ط¹ ط§ظ„ظ†طھظٹط¬ط© ظٹط¯ظˆظٹط§ظ‹ ظ‚ط¨ظ„ ط§ظ„طھط®ظپظٹط¶
-- SELECT id, full_name, role, created_at FROM public.profiles WHERE role IN ('admin', 'inspector');

-- --------------------------------------------------------------------
-- ط¬) #5 ط³ظٹط§ط³ط§طھ profiles: طھط¹ط¯ظٹظ„ ط§ظ„ظ…ظ„ظپ ط§ظ„ط´ط®طµظٹ ط¯ظˆظ† ط§ظ„ط¯ظˆط±/ط§ظ„ظ…ظ‚ط§ط·ط¹ط©/ط§ظ„طھظˆط«ظٹظ‚
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_self_read_write" ON public.profiles;
DROP POLICY IF EXISTS "profiles_inspector_read_district" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_staff_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_delete" ON public.profiles;

CREATE POLICY "profiles_self_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_staff_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.my_role() = 'inspector' AND district_id = public.my_district())
  );

CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "profiles_admin_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ط­ط§ط±ط³ ط§ظ„ط£ط¹ظ…ط¯ط© ط§ظ„ط­ط³ط§ط³ط©: ظپظ‚ط· ط§ظ„ظ…ط´ط±ظپ ط§ظ„ط¹ط§ظ… (ط£ظˆ SQL Editor / service_role) ظٹط؛ظٹظ‘ط± ط§ظ„ط¯ظˆط± ظˆط§ظ„ظ…ظ‚ط§ط·ط¹ط© ظˆط§ظ„طھظˆط«ظٹظ‚
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger AS $$
BEGIN
  -- auth.uid() ظپط§ط±ط؛ ط¹ظ†ط¯ ط§ظ„طھظ†ظپظٹط° ظ…ظ† SQL Editor ط£ظˆ ط¨ظ…ظپطھط§ط­ service_role (ط§ظ„ط²ظˆط§ط± anon ظ…ظ…ظ†ظˆط¹ظˆظ† ظ…ظ† ط§ظ„طھط¹ط¯ظٹظ„ ط¨ط§ظ„ظ€ RLS)
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.district_id IS DISTINCT FROM OLD.district_id
     OR NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'ط؛ظٹط± ظ…ط³ظ…ظˆط­ ط¨طھط؛ظٹظٹط± ط§ظ„ط¯ظˆط± ط£ظˆ ط§ظ„ظ…ظ‚ط§ط·ط¹ط© ط£ظˆ ط­ط§ظ„ط© ط§ظ„طھظˆط«ظٹظ‚ ط¥ظ„ط§ ظ…ظ† ط·ط±ظپ ط§ظ„ظ…ط´ط±ظپ ط§ظ„ط¹ط§ظ…'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS guard_profile_privileges ON public.profiles;
CREATE TRIGGER guard_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();

-- ط³ظٹط§ط³ط© ط§ظ„ظ…ظپطھط´ ط¹ظ„ظ‰ ط§ظ„ط¯ط±ظˆط³ ط¨ط¯ظˆظ† ط§ط³طھط¹ظ„ط§ظ… ظ…طھط¯ط§ط®ظ„ ط¹ظ„ظ‰ profiles
DROP POLICY IF EXISTS "lessons_inspector_read" ON public.lessons;
CREATE POLICY "lessons_inspector_read" ON public.lessons
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      public.my_role() = 'inspector'
      AND EXISTS (
        SELECT 1 FROM public.profiles teacher_p
        WHERE teacher_p.id = lessons.teacher_id
          AND teacher_p.district_id = public.my_district()
      )
    )
  );

-- --------------------------------------------------------------------
-- ط¯) #6 ط§ظ„ظ…ط°ظƒط±ط§طھ ط§ظ„طھط±ط¨ظˆظٹط©: ط§ظ„ط£ط³طھط§ط° ط¯ط§ط®ظ„ ظ…ظ‚ط§ط·ط¹طھظ‡ ظپظ‚ط·طŒ ظˆط§ظ„ظ…ظپطھط´ ظ‚ط±ط§ط،ط© + طھظˆط¬ظٹظ‡
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "notes_teacher_all" ON public.pedagogical_notes;
DROP POLICY IF EXISTS "notes_inspector_access" ON public.pedagogical_notes;
DROP POLICY IF EXISTS "notes_inspector_read" ON public.pedagogical_notes;
DROP POLICY IF EXISTS "notes_inspector_review" ON public.pedagogical_notes;

CREATE POLICY "notes_teacher_all" ON public.pedagogical_notes
  FOR ALL TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id AND district_id = public.my_district());

CREATE POLICY "notes_inspector_read" ON public.pedagogical_notes
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (public.my_role() = 'inspector' AND district_id = public.my_district())
  );

CREATE POLICY "notes_inspector_review" ON public.pedagogical_notes
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.my_role() = 'inspector' AND district_id = public.my_district())
  )
  WITH CHECK (
    public.is_admin()
    OR (public.my_role() = 'inspector' AND district_id = public.my_district())
  );

-- ظ…ظ†ط§ط´ظٹط± ط§ظ„ظ…ظپطھط´: ط§ظ„ظ†ط´ط± ظ„ظ„ظ…ظپطھط´ ط¯ط§ط®ظ„ ظ…ظ‚ط§ط·ط¹طھظ‡ ظپظ‚ط· (ظƒط§ظ† ط¨ط¥ظ…ظƒط§ظ† ط£ظٹ ط£ط³طھط§ط° ط§ظ„ظ†ط´ط± ط¨ط§ط³ظ…ظ‡)
DROP POLICY IF EXISTS "circulars_inspector_all" ON public.inspector_circulars;
DROP POLICY IF EXISTS "circulars_teacher_read" ON public.inspector_circulars;

CREATE POLICY "circulars_inspector_all" ON public.inspector_circulars
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR (auth.uid() = inspector_id AND public.my_role() = 'inspector' AND district_id = public.my_district())
  )
  WITH CHECK (
    public.is_admin()
    OR (auth.uid() = inspector_id AND public.my_role() = 'inspector' AND district_id = public.my_district())
  );

CREATE POLICY "circulars_teacher_read" ON public.inspector_circulars
  FOR SELECT TO authenticated
  USING (
    public.my_role() = 'teacher'
    AND district_id = public.my_district()
    AND (target_teacher_id IS NULL OR target_teacher_id = auth.uid())
    AND (
      target_school_id IS NULL
      OR target_school_id = (SELECT middle_school_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- --------------------------------------------------------------------
-- ظ‡ظ€) #6 ط³ظٹط§ط³ط§طھ ط§ظ„طھط®ط²ظٹظ†: ظƒظ„ ظ…ظ„ظپ ط¯ط§ط®ظ„ ظ…ط¬ظ„ط¯ طµط§ط­ط¨ظ‡
--   public-lesson-media        : <teacher_id>/...
--   private-pedagogical-notes  : <teacher_id>/...
--   private-inspector-docs     : <district_id>/...
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated upload lesson media" ON storage.objects;
DROP POLICY IF EXISTS "Teacher manage own lesson media" ON storage.objects;
DROP POLICY IF EXISTS "Teacher update own lesson media" ON storage.objects;
DROP POLICY IF EXISTS "Teacher delete own lesson media" ON storage.objects;

CREATE POLICY "Teacher manage own lesson media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'public-lesson-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teacher update own lesson media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'public-lesson-media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'public-lesson-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teacher delete own lesson media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'public-lesson-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Teacher and Inspector read private notes" ON storage.objects;
DROP POLICY IF EXISTS "Teacher upload private notes" ON storage.objects;
DROP POLICY IF EXISTS "Teacher delete own private notes" ON storage.objects;

CREATE POLICY "Teacher and Inspector read private notes" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'private-pedagogical-notes'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
      OR (
        public.my_role() = 'inspector'
        AND EXISTS (
          SELECT 1 FROM public.profiles teacher_p
          WHERE teacher_p.id::text = (storage.foldername(name))[1]
            AND teacher_p.district_id = public.my_district()
        )
      )
    )
  );

CREATE POLICY "Teacher upload private notes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'private-pedagogical-notes' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teacher delete own private notes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'private-pedagogical-notes' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "District read inspector docs" ON storage.objects;
DROP POLICY IF EXISTS "Inspector upload inspector docs" ON storage.objects;
DROP POLICY IF EXISTS "Inspector delete inspector docs" ON storage.objects;

CREATE POLICY "District read inspector docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'private-inspector-docs'
    AND (public.is_admin() OR (storage.foldername(name))[1] = public.my_district()::text)
  );

CREATE POLICY "Inspector upload inspector docs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'private-inspector-docs'
    AND (
      public.is_admin()
      OR (public.my_role() = 'inspector' AND (storage.foldername(name))[1] = public.my_district()::text)
    )
  );

CREATE POLICY "Inspector delete inspector docs" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'private-inspector-docs'
    AND (
      public.is_admin()
      OR (public.my_role() = 'inspector' AND (storage.foldername(name))[1] = public.my_district()::text)
    )
  );
-- ====================================================================
-- ظپط¶ط§ط، ظƒظ„ ط£ط³طھط§ط° ط§ظ„ظ…ط³طھظ‚ظ„ (Multi-Tenant Teacher Workspaces)
-- ظٹط­ظ„ ظ…ط­ظ„ ظ…ظ„ظپ lessons-db.json ط§ظ„ظ…ط´طھط±ظƒ: ظ„ظƒظ„ ط£ط³طھط§ط° ط¨ظٹط§ظ†ط§طھظ‡ ط§ظ„ط®ط§طµط©
--   teacher_public_data  : ط§ظ„ط¯ط±ظˆط³طŒ ظ„ظˆط­ط© ط§ظ„ط´ط±ظپطŒ ط§ظ„ط¥ط¹ظ„ط§ظ†ط§طھطŒ ط§ظ„ط§ط³طھط¯ط¹ط§ط،ط§طھ (ظٹظ‚ط±ط¤ظ‡ط§ ط§ظ„ط£ظˆظ„ظٹط§ط،)
--   teacher_private_data : ط§ظ„طھظ‚ظˆظٹظ…طŒ ط§ظ„ط¹ظ‚ظˆط¨ط§طھطŒ ظ‚ط§ط¦ظ…ط© ط§ظ„طھظ„ط§ظ…ظٹط°طŒ ط¬ظ„ط³ط§طھ ط§ظ„ظ…ط±ط§ظ‚ط¨ط©طŒ ط§ظ„ط±ط³ط§ط¦ظ„ ط§ظ„ظ…ط¬ظ‡ظˆظ„ط©
-- ظٹظڈط·ط¨ظژظ‘ظ‚ ط¨ط¹ط¯ 20261017000001_security_fixes.sql (ظٹط¹طھظ…ط¯ ط¹ظ„ظ‰ public.is_admin / my_role / my_district)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.teacher_public_data (
  teacher_id  UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teacher_private_data (
  teacher_id  UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.teacher_public_data  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_private_data ENABLE ROW LEVEL SECURITY;

-- ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط¹ط§ظ…ط©: ظٹظ‚ط±ط¤ظ‡ط§ ط§ظ„ط¬ظ…ظٹط¹طŒ ظˆظٹظƒطھط¨ظ‡ط§ طµط§ط­ط¨ظ‡ط§ ظپظ‚ط·
DROP POLICY IF EXISTS "public_data_read" ON public.teacher_public_data;
CREATE POLICY "public_data_read" ON public.teacher_public_data
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_data_owner_write" ON public.teacher_public_data;
CREATE POLICY "public_data_owner_write" ON public.teacher_public_data
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط®ط§طµط©: طµط§ط­ط¨ظ‡ط§ ظپظ‚ط· (ظ„ط§ ظٹط±ط§ظ‡ط§ ط§ظ„ط£ظˆظ„ظٹط§ط، ظˆظ„ط§ ط§ظ„ظ…ظپطھط´)
DROP POLICY IF EXISTS "private_data_owner_all" ON public.teacher_private_data;
CREATE POLICY "private_data_owner_all" ON public.teacher_private_data
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- ط¥ط±ط³ط§ظ„ ط±ط³ط§ظ„ط© ظ…ط¬ظ‡ظˆظ„ط© ظ„ط£ط³طھط§ط° (طھظ„ظ…ظٹط° / ظˆظ„ظٹ ط¨ط¯ظˆظ† ط­ط³ط§ط¨) ط¯ظˆظ† ظ…ظ†ط­ظ‡ ط£ظٹ طµظ„ط§ط­ظٹط© ظ‚ط±ط§ط،ط©
CREATE OR REPLACE FUNCTION public.post_anonymous_message(p_teacher_id UUID, p_message JSONB)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  msg_content TEXT := btrim(COALESCE(p_message->>'content', ''));
BEGIN
  IF length(msg_content) < 3 OR length(msg_content) > 3000 THEN
    RAISE EXCEPTION 'invalid message length' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_teacher_id AND role = 'teacher') THEN
    RAISE EXCEPTION 'teacher not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.teacher_private_data (teacher_id, data)
  VALUES (p_teacher_id, '{}'::jsonb)
  ON CONFLICT (teacher_id) DO NOTHING;

  UPDATE public.teacher_private_data
  SET data = jsonb_set(
        data,
        '{anonymousMessages}',
        jsonb_build_array(
          jsonb_build_object(
            'id', 'msg_' || floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint || '_' || substr(md5(random()::text), 1, 4),
            'category', COALESCE(NULLIF(p_message->>'category', ''), 'other'),
            'targetLevel', NULLIF(btrim(COALESCE(p_message->>'targetLevel', '')), ''),
            'content', msg_content,
            'createdAt', to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
            'read', false
          )
        ) || COALESCE(data->'anonymousMessages', '[]'::jsonb)
      ),
      updated_at = NOW()
  WHERE teacher_id = p_teacher_id;
END;
$$;

REVOKE ALL ON FUNCTION public.post_anonymous_message(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_anonymous_message(UUID, JSONB) TO anon, authenticated;
-- ====================================================================
-- ط¥طµظ„ط§ط­ ط§ظ„طھط³ط¬ظٹظ„: ط§ط­طھط±ط§ظ… ط§ظ„ظ…ط³طھظˆظٹط§طھ ط§ظ„ظ…ط®طھط§ط±ط©طŒ ظˆظ…ظ†ط¹ ظپط´ظ„ ط§ظ„طھط³ط¬ظٹظ„ ط¹ظ†ط¯ طھظƒط±ط§ط± ط§ظ„ط±ط§ط¨ط· ط£ظˆ ط§ظ„ظƒظˆط¯
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  meta   JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_slug TEXT  := COALESCE(NULLIF(meta->>'slug', ''), 'prof-' || SUBSTRING(NEW.id::text, 1, 6));
  v_code TEXT  := COALESCE(NULLIF(meta->>'teacher_code', ''), 'MTH-' || UPPER(SUBSTRING(NEW.id::text, 1, 4)));
  v_levels SMALLINT[];
BEGIN
  -- ط§ظ„ط±ط§ط¨ط· ظˆط§ظ„ظƒظˆط¯ ظپط±ظٹط¯ط§ظ†: ط¹ظ†ط¯ ط§ظ„طھظƒط±ط§ط± ظ†ط¶ظٹظپ ظ„ط§ط­ظ‚ط© ظ…ظ† ظ…ط¹ط±ظ‘ظپ ط§ظ„ط­ط³ط§ط¨ ط¨ط¯ظ„ ط¥ظپط´ط§ظ„ ط§ظ„طھط³ط¬ظٹظ„
  IF EXISTS (SELECT 1 FROM public.profiles WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || SUBSTRING(NEW.id::text, 1, 4);
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE teacher_code = v_code) THEN
    v_code := v_code || '-' || UPPER(SUBSTRING(NEW.id::text, 1, 3));
  END IF;

  -- ط§ظ„ظ…ط³طھظˆظٹط§طھ ط§ظ„طھظٹ ظٹط¯ط±ط³ظ‡ط§ (1 ط¥ظ„ظ‰ 4) ظƒظ…ط§ ط§ط®طھط§ط±ظ‡ط§ ط§ظ„ط£ط³طھط§ط° ظپظٹ ط§ط³طھظ…ط§ط±ط© ط§ظ„طھط³ط¬ظٹظ„
  IF jsonb_typeof(meta->'levels_taught') = 'array' THEN
    SELECT array_agg(DISTINCT lvl::SMALLINT ORDER BY lvl::SMALLINT)
    INTO v_levels
    FROM jsonb_array_elements_text(meta->'levels_taught') AS lvl
    WHERE lvl IN ('1', '2', '3', '4');
  END IF;

  INSERT INTO public.profiles (
    id, role, full_name, phone, district_id, middle_school_id,
    school_custom_name, teacher_code, slug, levels_taught
  )
  VALUES (
    NEW.id,
    'teacher', -- ظ„ط§ ظٹظڈظ‚ط¨ظ„ ط§ظ„ط¯ظˆط± ظ…ظ† ط¨ظٹط§ظ†ط§طھ ط§ظ„طھط³ط¬ظٹظ„ط› ط§ظ„طھط±ظ‚ظٹط© ط­طµط±ط§ظ‹ ط¹ط¨ط± ط§ظ„ظ…ط´ط±ظپ ط§ظ„ط¹ط§ظ…
    COALESCE(NULLIF(meta->>'full_name', ''), 'ط£ط³طھط§ط° ط¬ط¯ظٹط¯'),
    meta->>'phone',
    NULLIF(meta->>'district_id', '')::INTEGER,
    NULLIF(meta->>'middle_school_id', '')::UUID,
    meta->>'school_custom_name',
    v_code,
    v_slug,
    COALESCE(v_levels, ARRAY[1, 2, 3, 4]::SMALLINT[])
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- ====================================================================
-- ط§ظ„ظ…ظ„ظپ ط§ظ„ط¨ظٹط¯ط§ط؛ظˆط¬ظٹ ظ„ظ„ط£ط³طھط§ط° (ط¨ظٹظ† ط§ظ„ط£ط³طھط§ط° ظˆظ…ظپطھط´ ظ…ظ‚ط§ط·ط¹طھظ‡ ظپظ‚ط·)
--   1) ط£ظ†ظˆط§ط¹ ط§ظ„ظˆط«ط§ط¦ظ‚: ظ…ط°ظƒط±ط© ط­طµط©طŒ طھظˆط²ظٹط¹ ط³ظ†ظˆظٹطŒ ط¯ظپطھط± ط§ظ„ظ†طµظˆطµطŒ طھظ‚ظˆظٹظ… طھط´ط®ظٹطµظٹطŒ ط£ط®ط±ظ‰
--   2) ط¬ط¯ظˆظ„ ط§ظ„طھظˆظ‚ظٹطھ ط§ظ„ط£ط³ط¨ظˆط¹ظٹ (ظ„ط¨ط±ظ…ط¬ط© ط²ظٹط§ط±ط§طھ ط§ظ„طھظپطھظٹط´)
--   3) ط¥ط´ط¹ط§ط±ط§طھ ط§ظ„ظ‚ط±ط§ط،ط© ظ„ظ„ظ…ظ†ط§ط´ظٹط± (circular_reads)
-- ====================================================================

-- 1) طھظˆط³ظٹط¹ ط¬ط¯ظˆظ„ ط§ظ„ظ…ط°ظƒط±ط§طھ ظ„ظٹط´ظ…ظ„ ظƒظ„ ط§ظ„ظˆط«ط§ط¦ظ‚ ط§ظ„ط¨ظٹط¯ط§ط؛ظˆط¬ظٹط©
ALTER TABLE public.pedagogical_notes
  ADD COLUMN IF NOT EXISTS doc_type TEXT NOT NULL DEFAULT 'lesson_plan',
  ADD COLUMN IF NOT EXISTS field TEXT,             -- ط§ظ„ظ…ظٹط¯ط§ظ†
  ADD COLUMN IF NOT EXISTS section TEXT,           -- ط§ظ„ظ…ظ‚ط·ط¹
  ADD COLUMN IF NOT EXISTS session_number INTEGER; -- ط±ظ‚ظ… ط§ظ„ط­طµط©

ALTER TABLE public.pedagogical_notes DROP CONSTRAINT IF EXISTS pedagogical_notes_doc_type_check;
ALTER TABLE public.pedagogical_notes ADD CONSTRAINT pedagogical_notes_doc_type_check
  CHECK (doc_type IN ('lesson_plan', 'annual_distribution', 'cahier_textes', 'diagnostic', 'other'));

-- 2) ط¬ط¯ظˆظ„ ط§ظ„طھظˆظ‚ظٹطھ ط§ظ„ط£ط³ط¨ظˆط¹ظٹ
CREATE TABLE IF NOT EXISTS public.teacher_timetables (
  teacher_id  UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- [{ "day": "ط§ظ„ط£ط­ط¯", "start": "08:00", "end": "09:00", "className": "2ظ…1", "room": "04" }]
  slots       JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_path  TEXT,  -- طµظˆط±ط© ط§ط®طھظٹط§ط±ظٹط© ظ„ط¬ط¯ظˆظ„ ط§ظ„ط­طµطµ ط§ظ„ظ…ط¹طھظ…ط¯ (ظپظٹ ط§ظ„ظ…ط®ط²ظ† ط§ظ„ط®ط§طµ ظ„ظ„ظ…ط°ظƒط±ط§طھ)
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.teacher_timetables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timetable_owner_all" ON public.teacher_timetables;
CREATE POLICY "timetable_owner_all" ON public.teacher_timetables
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "timetable_inspector_read" ON public.teacher_timetables;
CREATE POLICY "timetable_inspector_read" ON public.teacher_timetables
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      public.my_role() = 'inspector'
      AND EXISTS (
        SELECT 1 FROM public.profiles t
        WHERE t.id = teacher_timetables.teacher_id AND t.district_id = public.my_district()
      )
    )
  );

-- 3) ط¥ط´ط¹ط§ط±ط§طھ ظ‚ط±ط§ط،ط© ط§ظ„ظ…ظ†ط§ط´ظٹط±
DROP POLICY IF EXISTS "reads_teacher_insert" ON public.circular_reads;
CREATE POLICY "reads_teacher_insert" ON public.circular_reads
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    -- ظ„ط§ ظٹط³ط¬ظ„ ط§ظ„ط£ط³طھط§ط° ظ‚ط±ط§ط،ط© ط¥ظ„ط§ ظ„ظ…ظ†ط´ظˆط± ظٹط­ظ‚ ظ„ظ‡ ط±ط¤ظٹطھظ‡ (طھط·ط¨ظ‚ ط³ظٹط§ط³ط§طھ inspector_circulars)
    AND EXISTS (SELECT 1 FROM public.inspector_circulars c WHERE c.id = circular_reads.circular_id)
  );

DROP POLICY IF EXISTS "reads_teacher_select" ON public.circular_reads;
CREATE POLICY "reads_teacher_select" ON public.circular_reads
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "reads_inspector_select" ON public.circular_reads;
CREATE POLICY "reads_inspector_select" ON public.circular_reads
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.inspector_circulars c
      WHERE c.id = circular_reads.circular_id
        AND c.district_id = public.my_district()
        AND public.my_role() = 'inspector'
    )
  );

-- 4) ظٹط­ظ‚ ظ„ظ„ط£ط³طھط§ط° ط¥ط¹ط§ط¯ط© ط±ظپط¹ ظˆط«ظٹظ‚ط© ط·ظڈظ„ط¨ طھط¹ط¯ظٹظ„ظ‡ط§: ط¥ط¹ط§ط¯ط© ط§ظ„ط­ط§ظ„ط© ط¥ظ„ظ‰ "ظ‚ظٹط¯ ط§ظ„ظ…ط±ط§ط¬ط¹ط©" ظ…ط³ظ…ظˆط­ط©
--    (ط³ظٹط§ط³ط© notes_teacher_all طھط؛ط·ظٹ ط§ظ„طھط¹ط¯ظٹظ„ط› ظ†ظ…ظ†ط¹ ظپظ‚ط· طھط²ظˆظٹط± ظ…ظ„ط§ط­ط¸ط§طھ ط§ظ„ظ…ظپطھط´)
CREATE OR REPLACE FUNCTION public.guard_note_review_fields()
RETURNS trigger AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() OR public.my_role() = 'inspector' THEN
    RETURN NEW;
  END IF;
  -- ط§ظ„ط£ط³طھط§ط° ظ„ط§ ظٹظƒطھط¨ طھظˆط¬ظٹظ‡ ط§ظ„ظ…ظپطھط´ ظˆظ„ط§ ظٹط¹طھظ…ط¯ ظˆط«ظٹظ‚طھظ‡ ط¨ظ†ظپط³ظ‡
  IF NEW.inspector_feedback IS DISTINCT FROM OLD.inspector_feedback
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'submitted') THEN
    RAISE EXCEPTION 'ظ„ط§ ظٹظ…ظƒظ† ظ„ظ„ط£ط³طھط§ط° طھط¹ط¯ظٹظ„ ط­ط§ظ„ط© ط§ظ„ظ…ط±ط§ط¬ط¹ط© ط£ظˆ طھظˆط¬ظٹظ‡ط§طھ ط§ظ„ظ…ظپطھط´' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS guard_note_review_fields ON public.pedagogical_notes;
CREATE TRIGGER guard_note_review_fields
  BEFORE UPDATE ON public.pedagogical_notes
  FOR EACH ROW EXECUTE FUNCTION public.guard_note_review_fields();

-- ظ…ظ†ط¹ ط§ظ„ط£ط³طھط§ط° ظ…ظ† ط¥ط¯ط±ط§ط¬ ظˆط«ظٹظ‚ط© "ظ…ط¹طھظ…ط¯ط©" ظ…ط³ط¨ظ‚ط§ظ‹
CREATE OR REPLACE FUNCTION public.guard_note_insert()
RETURNS trigger AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    NEW.status := 'submitted';
    NEW.inspector_feedback := NULL;
    NEW.reviewed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS guard_note_insert ON public.pedagogical_notes;
CREATE TRIGGER guard_note_insert
  BEFORE INSERT ON public.pedagogical_notes
  FOR EACH ROW EXECUTE FUNCTION public.guard_note_insert();
-- ====================================================================
-- ط£ط¯ظˆط§طھ ط§ظ„ظ…ظپطھط´: ط±ظˆط²ظ†ط§ظ…ط© ط§ظ„ظ†ط¯ظˆط§طھ ط§ظ„طھظƒظˆظٹظ†ظٹط© (طھط§ط±ظٹط® ظˆظ…ظƒط§ظ† ط§ظ„ظ†ط¯ظˆط©)
-- ====================================================================

ALTER TABLE public.inspector_circulars
  ADD COLUMN IF NOT EXISTS event_date  TIMESTAMPTZ, -- ظ…ظˆط¹ط¯ ط§ظ„ظ†ط¯ظˆط© / ط§ظ„ظ…ظ„طھظ‚ظ‰
  ADD COLUMN IF NOT EXISTS event_place TEXT;        -- ط§ظ„ظ…طھظˆط³ط·ط© ط§ظ„ظ…ط³طھظ‚ط¨ظ„ط© ط£ظˆ ظ…ظƒط§ظ† ط§ظ„ط§ظ†ط¹ظ‚ط§ط¯

CREATE INDEX IF NOT EXISTS idx_circulars_event_date
  ON public.inspector_circulars(district_id, event_date)
  WHERE event_date IS NOT NULL;
-- ====================================================================
-- ظپط¶ط§ط، ط§ظ„ظˆظ„ظٹ: ط¨ط·ط§ظ‚ط© ط§ظ„ط§ط³طھظ‚ط¨ط§ظ„ ط§ظ„ط±ط³ظ…ظٹط© ظ„ظ„ط£ط³طھط§ط° (ظ‚ط§ط¨ظ„ط© ظ„ظ„طھط¹ط¯ظٹظ„ ظ…ظ† ظ„ظˆط­طھظ‡)
-- {"officialDay":"ط§ظ„ط£ط±ط¨ط¹ط§ط،","officialTime":"10:00 - 11:00","extraDay":"","extraTime":"",
--  "location":"ظ‚ط§ط¹ط© ط§ظ„ط£ط³ط§طھط°ط©","guidance":"طھظˆط¬ظٹظ‡ط§طھ ط§ظ„ط£ط³طھط§ط° ظ„ظ„ط£ظˆظ„ظٹط§ط،..."}
-- ====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reception JSONB;

-- ط¥ط®ظپط§ط، ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ط¹ظ† ط§ظ„ط²ظˆط§ط± (ط§ظ„ظ…ط¹ظ„ظˆظ…ط§طھ ط§ظ„ط¹ط§ظ…ط© ظ„ظ„ط£ط³طھط§ط° ظپظ‚ط·)
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, role, full_name, district_id, middle_school_id, school_custom_name,
  teacher_code, slug, levels_taught, avatar_url, bio, is_verified, reception, created_at
) ON public.profiles TO anon;
-- ====================================================================
-- ط£ط¯ظˆط§طھ ط§ظ„ظ…ط´ط±ظپ ط§ظ„ط¹ط§ظ…: ط¥ط¯ط§ط±ط© ظ‚ط§ط¦ظ…ط© ط§ظ„ظ…طھظˆط³ط·ط§طھ ط§ظ„ظ…ط¹طھظ…ط¯ط© ظ„ظƒظ„ ظ…ظ‚ط§ط·ط¹ط©
-- ====================================================================

DROP POLICY IF EXISTS "middle_schools_admin_write" ON public.middle_schools;
CREATE POLICY "middle_schools_admin_write" ON public.middle_schools
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ظ…ظ†ط¹ طھظƒط±ط§ط± ظ†ظپط³ ط§ظ„ظ…طھظˆط³ط·ط© ظپظٹ ظ†ظپط³ ط§ظ„ط¨ظ„ط¯ظٹط©
CREATE UNIQUE INDEX IF NOT EXISTS uq_middle_schools_name_commune
  ON public.middle_schools(district_id, lower(name), lower(commune));
-- ====================================================================
-- ط­ط¯ظˆط¯ ظ…ط®ط§ط²ظ† ط§ظ„ظ…ظ„ظپط§طھ: طµظˆط± ظˆ PDF ظپظ‚ط·طŒ ظˆط¨ط­ط¯ ط£ظ‚طµظ‰ 10 ظ…ظٹط؛ط§ط¨ط§ظٹطھ ظ„ظ„ظ…ظ„ظپ
-- (ط­ظ…ط§ظٹط© ط¥ط¶ط§ظپظٹط© ظ„ظ„ط±ظپط¹ ط§ظ„ظ…ط¨ط§ط´ط± ظ…ظ† ط§ظ„ظ…طھطµظپط­ ط¥ظ„ظ‰ Supabase Storage)
-- ====================================================================

UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id IN ('public-lesson-media', 'private-pedagogical-notes', 'private-inspector-docs');
-- ====================================================================
-- ظ…ظ„طھظ‚ظ‰ ط§ظ„ط£ط³ط§طھط°ط© ط§ظ„طھظپط§ط¹ظ„ظٹ ظˆط¨ظ†ظƒ ط§ظ„ظˆط¶ط¹ظٹط§طھ (ظ„ظ„ط£ط³ط§طھط°ط© ظˆط§ظ„ظ…ظپطھط´ظٹظ† ظپظ‚ط· â€” ظ„ط§ ظٹط±ط§ظ‡ ط§ظ„ط£ظˆظ„ظٹط§ط،)
--   forum_topics  : ط³ط¤ط§ظ„/ط¥ط´ظƒط§ظ„ظٹط© ط¨ظٹط¯ط§ط؛ظˆط¬ظٹط© ط£ظˆ ظ…ظˆط±ط¯ ظ…ط´طھط±ظƒ (ظˆط¶ط¹ظٹط© ط§ظ†ط·ظ„ط§ظ‚ظٹط©طŒ طھظ‚ظˆظٹظ… طھط´ط®ظٹطµظٹ...)
--   forum_replies : ط§ظ„ط¥ط¬ط§ط¨ط§طھ (ط¥ط¬ط§ط¨ط© ط§ظ„ظ…ظپطھط´ طھظڈط¹ظ„ظژظ‘ظ… "طھظˆط¬ظٹظ‡ ط±ط³ظ…ظٹ ظ…ط¹طھظ…ط¯" ظˆطھط«ط¨طھ ط£ظˆظ„ط§ظ‹)
--   forum_votes   : ط£طµظˆط§طھ ط§ظ„طھط£ظٹظٹط¯ (طµظˆطھ ظˆط§ط­ط¯ ظ„ظƒظ„ ط¹ط¶ظˆطŒ ظˆظ„ط§ طھطµظˆظٹطھ ط¹ظ„ظ‰ ظ…ط´ط§ط±ظƒطھظ‡)
-- ====================================================================

-- ط¹ط¶ظˆ ط§ظ„ظ…ظ„طھظ‚ظ‰: ط£ط³طھط§ط° ظ…ظˆط«ظ‚ ط£ظˆ ظ…ظپطھط´ ط£ظˆ ظ…ط´ط±ظپ
CREATE OR REPLACE FUNCTION public.is_forum_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT role IN ('teacher', 'inspector', 'admin') AND is_verified
    FROM public.profiles WHERE id = auth.uid()
  ), false)
$$;

CREATE TABLE IF NOT EXISTS public.forum_topics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name     TEXT NOT NULL DEFAULT '',
  author_role     TEXT NOT NULL DEFAULT 'teacher',
  kind            TEXT NOT NULL DEFAULT 'question' CHECK (kind IN ('question', 'resource')),
  category        TEXT NOT NULL DEFAULT 'other'
                  CHECK (category IN ('situations', 'difficulties', 'assessments', 'diagnostic', 'tools', 'classroom', 'other')),
  level           SMALLINT CHECK (level BETWEEN 1 AND 4),
  title           TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 3 AND 200),
  body            TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 3 AND 10000),
  attachment_path TEXT,
  attachment_name TEXT,
  votes           INTEGER NOT NULL DEFAULT 0,
  replies_count   INTEGER NOT NULL DEFAULT 0,
  has_official    BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forum_topics_recent ON public.forum_topics(is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_kind ON public.forum_topics(kind, category, level);

CREATE TABLE IF NOT EXISTS public.forum_replies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id     UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name  TEXT NOT NULL DEFAULT '',
  author_role  TEXT NOT NULL DEFAULT 'teacher',
  body         TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 2 AND 10000),
  is_official  BOOLEAN NOT NULL DEFAULT FALSE,
  votes        INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forum_replies_topic ON public.forum_replies(topic_id, is_official DESC, created_at);

CREATE TABLE IF NOT EXISTS public.forum_votes (
  target_type  TEXT NOT NULL CHECK (target_type IN ('topic', 'reply')),
  target_id    UUID NOT NULL,
  voter_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (target_type, target_id, voter_id)
);

ALTER TABLE public.forum_topics  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_votes   ENABLE ROW LEVEL SECURITY;

-- ط§ظ„ظ‚ط±ط§ط،ط©: ط£ط¹ط¶ط§ط، ط§ظ„ظ…ظ„طھظ‚ظ‰ ظپظ‚ط·
DROP POLICY IF EXISTS "forum_topics_read" ON public.forum_topics;
CREATE POLICY "forum_topics_read" ON public.forum_topics FOR SELECT TO authenticated USING (public.is_forum_member());
DROP POLICY IF EXISTS "forum_replies_read" ON public.forum_replies;
CREATE POLICY "forum_replies_read" ON public.forum_replies FOR SELECT TO authenticated USING (public.is_forum_member());
DROP POLICY IF EXISTS "forum_votes_read" ON public.forum_votes;
CREATE POLICY "forum_votes_read" ON public.forum_votes FOR SELECT TO authenticated USING (public.is_forum_member());

-- ط§ظ„ظƒطھط§ط¨ط©: طµط§ط­ط¨ ط§ظ„ظ…ط´ط§ط±ظƒط© (ظˆط§ظ„ظ…ط´ط±ظپ ظ„ظ„ط­ط°ظپ ظˆط§ظ„طھط«ط¨ظٹطھ)
DROP POLICY IF EXISTS "forum_topics_insert" ON public.forum_topics;
CREATE POLICY "forum_topics_insert" ON public.forum_topics FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_forum_member());
DROP POLICY IF EXISTS "forum_topics_update" ON public.forum_topics;
CREATE POLICY "forum_topics_update" ON public.forum_topics FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin() OR public.my_role() = 'inspector')
  WITH CHECK (author_id = auth.uid() OR public.is_admin() OR public.my_role() = 'inspector');
DROP POLICY IF EXISTS "forum_topics_delete" ON public.forum_topics;
CREATE POLICY "forum_topics_delete" ON public.forum_topics FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "forum_replies_insert" ON public.forum_replies;
CREATE POLICY "forum_replies_insert" ON public.forum_replies FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_forum_member());
DROP POLICY IF EXISTS "forum_replies_update" ON public.forum_replies;
CREATE POLICY "forum_replies_update" ON public.forum_replies FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
DROP POLICY IF EXISTS "forum_replies_delete" ON public.forum_replies;
CREATE POLICY "forum_replies_delete" ON public.forum_replies FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "forum_votes_insert" ON public.forum_votes;
CREATE POLICY "forum_votes_insert" ON public.forum_votes FOR INSERT TO authenticated
  WITH CHECK (voter_id = auth.uid() AND public.is_forum_member());
DROP POLICY IF EXISTS "forum_votes_delete" ON public.forum_votes;
CREATE POLICY "forum_votes_delete" ON public.forum_votes FOR DELETE TO authenticated
  USING (voter_id = auth.uid());

-- طھط¹ط¨ط¦ط© ط§ط³ظ… ظˆط¯ظˆط± ط§ظ„ظƒط§طھط¨ ظ…ظ† ظ…ظ„ظپظ‡طŒ ظˆطھط¹ظ„ظٹظ… ط¥ط¬ط§ط¨ط© ط§ظ„ظ…ظپطھط´ ط±ط³ظ…ظٹط© (ظ„ط§ ظٹظ…ظƒظ† طھط²ظˆظٹط±ظ‡ط§ ظ…ظ† ط§ظ„ظ…طھطµظپط­)
CREATE OR REPLACE FUNCTION public.forum_stamp_author()
RETURNS trigger AS $$
DECLARE
  p RECORD;
BEGIN
  SELECT full_name, role INTO p FROM public.profiles WHERE id = NEW.author_id;
  NEW.author_name := COALESCE(p.full_name, 'ط¹ط¶ظˆ');
  NEW.author_role := COALESCE(p.role, 'teacher');
  IF TG_TABLE_NAME = 'forum_replies' THEN
    NEW.is_official := (p.role = 'inspector');
    NEW.votes := 0;
  ELSE
    NEW.votes := 0;
    NEW.replies_count := 0;
    NEW.has_official := FALSE;
    NEW.is_pinned := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS forum_topics_stamp ON public.forum_topics;
CREATE TRIGGER forum_topics_stamp BEFORE INSERT ON public.forum_topics
  FOR EACH ROW EXECUTE FUNCTION public.forum_stamp_author();
DROP TRIGGER IF EXISTS forum_replies_stamp ON public.forum_replies;
CREATE TRIGGER forum_replies_stamp BEFORE INSERT ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.forum_stamp_author();

-- ط§ظ„ط­ظ‚ظˆظ„ ط§ظ„ظ…ط­ط³ظˆط¨ط© ظ„ط§ ظٹط؛ظٹط±ظ‡ط§ ط§ظ„ظƒط§طھط¨ط› ط§ظ„طھط«ط¨ظٹطھ ظ„ظ„ظ…ظپطھط´ ظˆط§ظ„ظ…ط´ط±ظپ ظپظ‚ط·
CREATE OR REPLACE FUNCTION public.forum_guard_topic_update()
RETURNS trigger AS $$
BEGIN
  IF current_setting('forum.internal', true) = 'on' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.votes := OLD.votes;
  NEW.replies_count := OLD.replies_count;
  NEW.has_official := OLD.has_official;
  NEW.author_id := OLD.author_id;
  NEW.author_name := OLD.author_name;
  NEW.author_role := OLD.author_role;
  IF NOT (public.is_admin() OR public.my_role() = 'inspector') THEN
    NEW.is_pinned := OLD.is_pinned;
  END IF;
  -- ط§ظ„ظ…ظپطھط´ (ط؛ظٹط± ط§ظ„ظƒط§طھط¨) ظٹط«ط¨طھ ط§ظ„ظ…ظˆط¶ظˆط¹ ظپظ‚ط· ظˆظ„ط§ ظٹط¹ط¯ظ„ ظ…ط­طھظˆط§ظ‡
  IF OLD.author_id <> auth.uid() AND NOT public.is_admin() THEN
    NEW.title := OLD.title;
    NEW.body := OLD.body;
    NEW.kind := OLD.kind;
    NEW.category := OLD.category;
    NEW.level := OLD.level;
    NEW.attachment_path := OLD.attachment_path;
    NEW.attachment_name := OLD.attachment_name;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS forum_topics_guard ON public.forum_topics;
CREATE TRIGGER forum_topics_guard BEFORE UPDATE ON public.forum_topics
  FOR EACH ROW EXECUTE FUNCTION public.forum_guard_topic_update();

CREATE OR REPLACE FUNCTION public.forum_guard_reply_update()
RETURNS trigger AS $$
BEGIN
  IF current_setting('forum.internal', true) = 'on' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.votes := OLD.votes;
  NEW.is_official := OLD.is_official;
  NEW.topic_id := OLD.topic_id;
  NEW.author_id := OLD.author_id;
  NEW.author_name := OLD.author_name;
  NEW.author_role := OLD.author_role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS forum_replies_guard ON public.forum_replies;
CREATE TRIGGER forum_replies_guard BEFORE UPDATE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.forum_guard_reply_update();

-- ط¹ط¯ط§ط¯ط§طھ ط§ظ„ط¥ط¬ط§ط¨ط§طھ ظˆط§ظ„طھظˆط¬ظٹظ‡ ط§ظ„ط±ط³ظ…ظٹ
CREATE OR REPLACE FUNCTION public.forum_reply_counters()
RETURNS trigger AS $$
DECLARE
  t UUID := COALESCE(NEW.topic_id, OLD.topic_id);
BEGIN
  PERFORM set_config('forum.internal', 'on', true);
  UPDATE public.forum_topics
  SET replies_count = (SELECT count(*) FROM public.forum_replies WHERE topic_id = t),
      has_official  = EXISTS (SELECT 1 FROM public.forum_replies WHERE topic_id = t AND is_official)
  WHERE id = t;
  PERFORM set_config('forum.internal', 'off', true);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS forum_replies_counters ON public.forum_replies;
CREATE TRIGGER forum_replies_counters AFTER INSERT OR DELETE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.forum_reply_counters();

-- ظ…ظ†ط¹ ط§ظ„طھطµظˆظٹطھ ط¹ظ„ظ‰ ط§ظ„ظ…ط´ط§ط±ظƒط© ط§ظ„ط´ط®طµظٹط© + طھط­ط¯ظٹط« ط¹ط¯ط¯ ط§ظ„ط£طµظˆط§طھ
CREATE OR REPLACE FUNCTION public.forum_vote_check()
RETURNS trigger AS $$
DECLARE
  owner UUID;
BEGIN
  IF NEW.target_type = 'topic' THEN
    SELECT author_id INTO owner FROM public.forum_topics WHERE id = NEW.target_id;
  ELSE
    SELECT author_id INTO owner FROM public.forum_replies WHERE id = NEW.target_id;
  END IF;
  IF owner IS NULL THEN
    RAISE EXCEPTION 'ط§ظ„ظ…ط´ط§ط±ظƒط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©' USING ERRCODE = 'P0002';
  END IF;
  IF owner = NEW.voter_id THEN
    RAISE EXCEPTION 'ظ„ط§ ظٹظ…ظƒظ† ط§ظ„طھطµظˆظٹطھ ط¹ظ„ظ‰ ظ…ط´ط§ط±ظƒطھظƒ' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS forum_votes_check ON public.forum_votes;
CREATE TRIGGER forum_votes_check BEFORE INSERT ON public.forum_votes
  FOR EACH ROW EXECUTE FUNCTION public.forum_vote_check();

CREATE OR REPLACE FUNCTION public.forum_vote_counters()
RETURNS trigger AS $$
DECLARE
  tt TEXT := COALESCE(NEW.target_type, OLD.target_type);
  tid UUID := COALESCE(NEW.target_id, OLD.target_id);
  n INTEGER;
BEGIN
  SELECT count(*) INTO n FROM public.forum_votes WHERE target_type = tt AND target_id = tid;
  PERFORM set_config('forum.internal', 'on', true);
  IF tt = 'topic' THEN
    UPDATE public.forum_topics SET votes = n WHERE id = tid;
  ELSE
    UPDATE public.forum_replies SET votes = n WHERE id = tid;
  END IF;
  PERFORM set_config('forum.internal', 'off', true);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS forum_votes_counters ON public.forum_votes;
CREATE TRIGGER forum_votes_counters AFTER INSERT OR DELETE ON public.forum_votes
  FOR EACH ROW EXECUTE FUNCTION public.forum_vote_counters();

-- ظ†ظ‚ط§ط· ط§ظ„طھظپط§ط¹ظ„: 10 ظ„ظƒظ„ طµظˆطھ طھط£ظٹظٹط¯طŒ 5 ظ„ظƒظ„ ظ…ظˆط±ط¯ ظ…ط´طھط±ظƒطŒ 2 ظ„ظƒظ„ ط¥ط¬ط§ط¨ط©طŒ 1 ظ„ظƒظ„ ط³ط¤ط§ظ„
CREATE OR REPLACE FUNCTION public.forum_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (author_id UUID, author_name TEXT, author_role TEXT, points BIGINT, posts BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH contributions AS (
    SELECT author_id, author_name, author_role,
           votes * 10 + CASE WHEN kind = 'resource' THEN 5 ELSE 1 END AS pts
    FROM public.forum_topics
    UNION ALL
    SELECT author_id, author_name, author_role, votes * 10 + 2 FROM public.forum_replies
  )
  SELECT author_id, max(author_name), max(author_role), sum(pts)::BIGINT, count(*)::BIGINT
  FROM contributions
  WHERE public.is_forum_member()
  GROUP BY author_id
  ORDER BY sum(pts) DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
$$;
GRANT EXECUTE ON FUNCTION public.forum_leaderboard(INTEGER) TO authenticated;

-- ظ…ط±ظپظ‚ط§طھ ط§ظ„ظ…ظ„طھظ‚ظ‰ (ظ…ط°ظƒط±ط§طھ ظ†ظ…ظˆط°ط¬ظٹط©طŒ ط³ظ„ط§ط³ظ„طŒ ظˆط¶ط¹ظٹط§طھ): ظ„ظ„ط£ط¹ط¶ط§ط، ظپظ‚ط·طŒ ظپظٹ ظ…ط¬ظ„ط¯ طµط§ط­ط¨ظ‡ط§
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('forum-files', 'forum-files', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Forum members read files" ON storage.objects;
CREATE POLICY "Forum members read files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'forum-files' AND public.is_forum_member());
DROP POLICY IF EXISTS "Forum members upload own files" ON storage.objects;
CREATE POLICY "Forum members upload own files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'forum-files' AND public.is_forum_member() AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Forum members delete own files" ON storage.objects;
CREATE POLICY "Forum members delete own files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'forum-files' AND (storage.foldername(name))[1] = auth.uid()::text);
-- ====================================================================
-- ط­ط¬ط¨ ط§ظ„ط­ظ„ ط§ظ„ظ†ظ…ظˆط°ط¬ظٹ ط­طھظ‰ ظ…ظˆط¹ط¯ ظ†ط´ط±ظ‡ ط¹ظ„ظ‰ ظ…ط³طھظˆظ‰ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ
-- (ظƒط§ظ† ط§ظ„ط­ط¬ط¨ ظپظٹ ظˆط§ط¬ظ‡ط© Next.js ظپظ‚ط·طŒ ط¨ظٹظ†ظ…ط§ ظٹظ…ظƒظ† ظ‚ط±ط§ط،ط© teacher_public_data ظ…ط¨ط§ط´ط±ط© ط¹ط¨ط± REST)
-- ====================================================================

-- 1) ظ„ط§ ظ‚ط±ط§ط،ط© ظ…ط¨ط§ط´ط±ط© ظ„ظ„ط¬ط¯ظˆظ„ ط¥ظ„ط§ ظ„طµط§ط­ط¨ظ‡ ظˆظ„ظ„ظ…ظپطھط´ (ظ…ظ‚ط§ط·ط¹طھظ‡) ظˆط§ظ„ظ…ط´ط±ظپ
DROP POLICY IF EXISTS "public_data_read" ON public.teacher_public_data;
DROP POLICY IF EXISTS "public_data_staff_read" ON public.teacher_public_data;
CREATE POLICY "public_data_staff_read" ON public.teacher_public_data
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_admin()
    OR (
      public.my_role() = 'inspector'
      AND EXISTS (
        SELECT 1 FROM public.profiles t
        WHERE t.id = teacher_public_data.teacher_id AND t.district_id = public.my_district()
      )
    )
  );

-- 2) ط§ظ„ظ‚ط±ط§ط،ط© ط§ظ„ط¹ط§ظ…ط© (ط§ظ„ط£ظˆظ„ظٹط§ط، ظˆط§ظ„طھظ„ط§ظ…ظٹط°) ط¹ط¨ط± ط¯ط§ظ„ط© طھط­ط°ظپ طµظˆط± ط§ظ„ط­ظ„ ظ‚ط¨ظ„ ظ…ظˆط¹ط¯ ظ†ط´ط±ظ‡
CREATE OR REPLACE FUNCTION public.get_teacher_public_data(p_teacher_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN d.data IS NULL THEN NULL
    WHEN jsonb_typeof(d.data->'lessons') <> 'array' THEN d.data
    ELSE jsonb_set(
      d.data,
      '{lessons}',
      COALESCE((
        SELECT jsonb_agg(
          CASE
            WHEN (l->>'solutionPublishAt') IS NOT NULL
             AND (l->>'solutionPublishAt')::timestamptz > now()
            THEN l || jsonb_build_object('homeworkImages', '[]'::jsonb, 'solutionLocked', true)
            ELSE l
          END
          ORDER BY ord
        )
        FROM jsonb_array_elements(d.data->'lessons') WITH ORDINALITY AS e(l, ord)
      ), '[]'::jsonb)
    )
  END
  FROM public.teacher_public_data d
  JOIN public.profiles p ON p.id = d.teacher_id
  WHERE d.teacher_id = p_teacher_id
    AND p.role = 'teacher'
    AND p.is_verified
$$;

REVOKE ALL ON FUNCTION public.get_teacher_public_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_teacher_public_data(UUID) TO anon, authenticated;

-- 3) ظ…ظ†ط¹ ط³ط±ط¯ ظ…ظ„ظپط§طھ ط§ظ„ظ…ط®ط²ظ† ط§ظ„ط¹ط§ظ… (ط§ظ„طھط­ظ…ظٹظ„ ط¨ط§ظ„ط±ط§ط¨ط· ط§ظ„ط¹ط§ظ… ظٹط¨ظ‚ظ‰ ظٹط¹ظ…ظ„ ظ„ط£ظ† ط§ظ„ظ…ط®ط²ظ† public)
DROP POLICY IF EXISTS "Public read lesson media" ON storage.objects;
DROP POLICY IF EXISTS "Teacher list own lesson media" ON storage.objects;
CREATE POLICY "Teacher list own lesson media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'public-lesson-media' AND (storage.foldername(name))[1] = auth.uid()::text);
-- ====================================================================
-- ظ†ظ‚ظ„ ط±ظ‚ظ… ط§ظ„ظ‡ط§طھظپ ط¥ظ„ظ‰ ط¬ط¯ظˆظ„ ط®ط§طµ (ظƒط§ظ† ظٹظ‚ط±ط¤ظ‡ ط£ظٹ ظ…ط³طھط®ط¯ظ… ظ…ط³ط¬ظ„ ط¹ط¨ط± ط³ظٹط§ط³ط© ط§ظ„ظ‚ط±ط§ط،ط© ط§ظ„ط¹ط§ظ…ط© ظ„ظ€ profiles)
-- ظٹظ‚ط±ط¤ظ‡: طµط§ط­ط¨ظ‡طŒ ظˆط§ظ„ظ…ط´ط±ظپ ط§ظ„ط¹ط§ظ…طŒ ظˆظ…ظپطھط´ ظ…ظ‚ط§ط·ط¹طھظ‡ ظپظ‚ط·
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.profile_contacts (
  id          UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_self_all" ON public.profile_contacts;
CREATE POLICY "contacts_self_all" ON public.profile_contacts
  FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "contacts_staff_read" ON public.profile_contacts;
CREATE POLICY "contacts_staff_read" ON public.profile_contacts
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR (
      public.my_role() = 'inspector'
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = profile_contacts.id AND p.district_id = public.my_district())
    )
  );

-- ظ†ظ‚ظ„ ط§ظ„ط£ط±ظ‚ط§ظ… ط§ظ„ط­ط§ظ„ظٹط© ط«ظ… ط­ط°ظپ ط§ظ„ط¹ظ…ظˆط¯ ظ…ظ† profiles (ط¢ظ…ظ† ظ„ط¥ط¹ط§ط¯ط© ط§ظ„طھط´ط؛ظٹظ„)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    INSERT INTO public.profile_contacts (id, phone)
    SELECT id, phone FROM public.profiles WHERE phone IS NOT NULL AND btrim(phone) <> ''
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone;
    ALTER TABLE public.profiles DROP COLUMN phone;
  END IF;
END $$;

-- ط§ظ„ظ…ط­ظپط²: ظٹط­ظپط¸ ط§ظ„ظ‡ط§طھظپ ظپظٹ ط§ظ„ط¬ط¯ظˆظ„ ط§ظ„ط®ط§طµ
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
    school_custom_name, teacher_code, slug, levels_taught
  )
  VALUES (
    NEW.id,
    'teacher', -- ظ„ط§ ظٹظڈظ‚ط¨ظ„ ط§ظ„ط¯ظˆط± ظ…ظ† ط¨ظٹط§ظ†ط§طھ ط§ظ„طھط³ط¬ظٹظ„ط› ط§ظ„طھط±ظ‚ظٹط© ط­طµط±ط§ظ‹ ط¹ط¨ط± ط§ظ„ظ…ط´ط±ظپ ط§ظ„ط¹ط§ظ…
    COALESCE(NULLIF(meta->>'full_name', ''), 'ط£ط³طھط§ط° ط¬ط¯ظٹط¯'),
    NULLIF(meta->>'district_id', '')::INTEGER,
    NULLIF(meta->>'middle_school_id', '')::UUID,
    meta->>'school_custom_name',
    v_code,
    v_slug,
    COALESCE(v_levels, ARRAY[1, 2, 3, 4]::SMALLINT[])
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

-- طµظ„ط§ط­ظٹط§طھ ط§ظ„ط£ط¹ظ…ط¯ط© ظ„ظ„ط²ظˆط§ط± (ط¨ط¹ط¯ ط­ط°ظپ ط¹ظ…ظˆط¯ ط§ظ„ظ‡ط§طھظپ)
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, role, full_name, district_id, middle_school_id, school_custom_name,
  teacher_code, slug, levels_taught, avatar_url, bio, is_verified, reception, created_at
) ON public.profiles TO anon;
-- ====================================================================
-- ظ„ظˆط­ط© ط§ظ„ظ…ط´ط±ظپ ط§ظ„ط¹ط§ظ…: ظ…ظ†ط´ظˆط± ظˆظ„ط§ط¦ظٹطŒ ط³ط¬ظ„ ط§ظ„ط¹ظ…ظ„ظٹط§طھطŒ ط¥ط­طµط§ط¦ظٹط§طھ ظ…ظ† ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ
-- ظٹظڈط·ط¨ظ‘ظ‚ ط¨ط¹ط¯ 20261017000011. ظ‚ط§ط¨ظ„ ظ„ط¥ط¹ط§ط¯ط© ط§ظ„طھط´ط؛ظٹظ„.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1) ط§ظ„ظ…ظ†ط´ظˆط± ط§ظ„ظˆظ„ط§ط¦ظٹ: district_id = NULL ظٹط¹ظ†ظٹ ظƒظ„ ط§ظ„ظ…ظ‚ط§ط·ط¹ط§طھ (ظ„ظ„ظ…ط´ط±ظپ ظˆط­ط¯ظ‡)
-- --------------------------------------------------------------------
ALTER TABLE public.inspector_circulars ALTER COLUMN district_id DROP NOT NULL;
-- ط§ظ„ظ…ظ†ط´ظˆط± ط§ظ„ظˆظ„ط§ط¦ظٹ ظ…ظˆط¬ظ‘ظ‡ ظ„ظ„ط¬ظ…ظٹط¹: ظ„ط§ ط§ط³طھظ‡ط¯ط§ظپ ظ„ط£ط³طھط§ط° ط£ظˆ ظ…طھظˆط³ط·ط©
ALTER TABLE public.inspector_circulars DROP CONSTRAINT IF EXISTS circulars_wilaya_untargeted;
ALTER TABLE public.inspector_circulars ADD CONSTRAINT circulars_wilaya_untargeted
  CHECK (district_id IS NOT NULL OR (target_teacher_id IS NULL AND target_school_id IS NULL));

DROP POLICY IF EXISTS "circulars_inspector_all" ON public.inspector_circulars;
CREATE POLICY "circulars_inspector_all" ON public.inspector_circulars
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR (auth.uid() = inspector_id AND public.my_role() = 'inspector'
        AND district_id IS NOT NULL AND district_id = public.my_district())
  )
  WITH CHECK (
    public.is_admin()
    OR (auth.uid() = inspector_id AND public.my_role() = 'inspector'
        AND district_id IS NOT NULL AND district_id = public.my_district())
  );

DROP POLICY IF EXISTS "circulars_teacher_read" ON public.inspector_circulars;
CREATE POLICY "circulars_teacher_read" ON public.inspector_circulars
  FOR SELECT TO authenticated
  USING (
    public.my_role() = 'teacher'
    AND (district_id IS NULL OR district_id = public.my_district())
    AND (target_teacher_id IS NULL OR target_teacher_id = auth.uid())
    AND (
      target_school_id IS NULL
      OR target_school_id = (SELECT middle_school_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "circulars_inspector_read_wilaya" ON public.inspector_circulars;
CREATE POLICY "circulars_inspector_read_wilaya" ON public.inspector_circulars
  FOR SELECT TO authenticated
  USING (public.my_role() = 'inspector' AND district_id IS NULL);

-- ظ…ط±ظپظ‚ط§طھ ط§ظ„ظ…ظ†ط´ظˆط± ط§ظ„ظˆظ„ط§ط¦ظٹ ظپظٹ ط§ظ„ظ…ط¬ظ„ط¯ wilaya/ ظٹظ‚ط±ط¤ظ‡ط§ ظƒظ„ ط§ظ„ط£ط³ط§طھط°ط© ظˆط§ظ„ظ…ظپطھط´ظٹظ†
DROP POLICY IF EXISTS "District read inspector docs" ON storage.objects;
CREATE POLICY "District read inspector docs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'private-inspector-docs'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = public.my_district()::text
      OR ((storage.foldername(name))[1] = 'wilaya' AND public.my_role() IN ('teacher', 'inspector'))
    )
  );

-- --------------------------------------------------------------------
-- 2) ط³ط¬ظ„ ط§ظ„ط¹ظ…ظ„ظٹط§طھ: ظٹظ…ظ„ط¤ظ‡ ط§ظ„ظ…ط­ظپط² ظپظ‚ط·طŒ ظˆظٹظ‚ط±ط¤ظ‡ ط§ظ„ظ…ط´ط±ظپ ظˆط­ط¯ظ‡
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT,
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_admin_read" ON public.admin_audit_log;
CREATE POLICY "audit_admin_read" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.admin_audit_log FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_admin_action(p_action TEXT, p_target_type TEXT, p_target_id TEXT, p_details JSONB)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, COALESCE(p_details, '{}'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.log_admin_action(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- طھط؛ظٹظٹط±ط§طھ ط§ظ„ظ…ظ„ظپ ط§ظ„ط´ط®طµظٹ ط§ظ„طھظٹ ظٹط¬ط±ظٹظ‡ط§ ط؛ظٹط± طµط§ط­ط¨ظ‡ (طھط±ظ‚ظٹط©طŒ ظ†ظ‚ظ„ ظ…ظ‚ط§ط·ط¹ط©طŒ طھط¹ظ„ظٹظ‚)
CREATE OR REPLACE FUNCTION public.audit_profile_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() = NEW.id THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    PERFORM public.log_admin_action('role_changed', 'profile', NEW.id::text,
      jsonb_build_object('from', OLD.role, 'to', NEW.role, 'full_name', NEW.full_name));
  END IF;
  IF NEW.district_id IS DISTINCT FROM OLD.district_id THEN
    PERFORM public.log_admin_action('district_changed', 'profile', NEW.id::text,
      jsonb_build_object('from', OLD.district_id, 'to', NEW.district_id, 'full_name', NEW.full_name));
  END IF;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    PERFORM public.log_admin_action(
      CASE WHEN NEW.is_verified THEN 'account_reactivated' ELSE 'account_suspended' END,
      'profile', NEW.id::text, jsonb_build_object('full_name', NEW.full_name));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_profile_change ON public.profiles;
CREATE TRIGGER trg_audit_profile_change
  AFTER UPDATE OF role, district_id, is_verified ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_profile_change();

CREATE OR REPLACE FUNCTION public.audit_school_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.middle_schools;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN NULL;
  END IF;
  r := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  PERFORM public.log_admin_action(
    CASE TG_OP WHEN 'INSERT' THEN 'school_added' WHEN 'UPDATE' THEN 'school_updated' ELSE 'school_deleted' END,
    'school', r.id::text,
    jsonb_build_object('name', r.name, 'commune', r.commune, 'district_id', r.district_id));
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_audit_school_change ON public.middle_schools;
CREATE TRIGGER trg_audit_school_change
  AFTER INSERT OR UPDATE OR DELETE ON public.middle_schools
  FOR EACH ROW EXECUTE FUNCTION public.audit_school_change();

CREATE OR REPLACE FUNCTION public.audit_wilaya_circular()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.inspector_circulars;
BEGIN
  r := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  IF r.district_id IS NULL THEN
    PERFORM public.log_admin_action(
      CASE TG_OP WHEN 'INSERT' THEN 'wilaya_circular_published' ELSE 'wilaya_circular_deleted' END,
      'circular', r.id::text, jsonb_build_object('title', r.title));
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_audit_wilaya_circular ON public.inspector_circulars;
CREATE TRIGGER trg_audit_wilaya_circular
  AFTER INSERT OR DELETE ON public.inspector_circulars
  FOR EACH ROW EXECUTE FUNCTION public.audit_wilaya_circular();

-- ط­ط°ظپ ط§ظ„ظ…ط´ط±ظپ ظ„ظ…ط´ط§ط±ظƒط§طھ ط؛ظٹط±ظ‡ ظپظٹ ط§ظ„ظ…ظ„طھظ‚ظ‰ (ظ…ط±ط§ظ‚ط¨ط© ط§ظ„ظ…ط­طھظˆظ‰)
CREATE OR REPLACE FUNCTION public.audit_forum_delete()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() OR OLD.author_id = auth.uid() THEN
    RETURN NULL;
  END IF;
  IF TG_TABLE_NAME = 'forum_topics' THEN
    PERFORM public.log_admin_action('forum_topic_deleted', 'forum_topic', OLD.id::text,
      jsonb_build_object('title', OLD.title, 'author_name', OLD.author_name));
  -- ط§ظ„ط±ط¯ ط§ظ„ظ…ط­ط°ظˆظپ طھط¨ط¹ط§ظ‹ ظ„ط­ط°ظپ ظ…ظˆط¶ظˆط¹ظ‡ (ط§ظ„ظ…ظˆط¶ظˆط¹ ظ„ظ… ظٹط¹ط¯ ظ…ظˆط¬ظˆط¯ط§ظ‹) ط³ظڈط¬ظ‘ظ„ ظ…ط¹ ط§ظ„ظ…ظˆط¶ظˆط¹
  ELSIF EXISTS (SELECT 1 FROM public.forum_topics t WHERE t.id = OLD.topic_id) THEN
    PERFORM public.log_admin_action('forum_reply_deleted', 'forum_reply', OLD.id::text,
      jsonb_build_object('author_name', OLD.author_name, 'excerpt', left(OLD.body, 120)));
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_audit_forum_topic_delete ON public.forum_topics;
CREATE TRIGGER trg_audit_forum_topic_delete
  AFTER DELETE ON public.forum_topics
  FOR EACH ROW EXECUTE FUNCTION public.audit_forum_delete();

DROP TRIGGER IF EXISTS trg_audit_forum_reply_delete ON public.forum_replies;
CREATE TRIGGER trg_audit_forum_reply_delete
  AFTER DELETE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.audit_forum_delete();

-- --------------------------------------------------------------------
-- 3) ط¥ط­طµط§ط¦ظٹط§طھ ط§ظ„ظˆظ„ط§ظٹط© ظ…ط­ط³ظˆط¨ط© ظپظٹ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ (ظ„ظ„ظ…ط´ط±ظپ ظˆط­ط¯ظ‡)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_wilaya_stats()
RETURNS TABLE (
  district_id INT, district_name TEXT, inspector_name TEXT,
  teachers INT, inspectors INT, active_teachers INT, lessons INT,
  notes_submitted INT, notes_reviewed INT, circulars INT, suspended INT, new_this_week INT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    (SELECT p.full_name FROM public.profiles p WHERE p.role = 'inspector' AND p.district_id = d.id ORDER BY p.created_at LIMIT 1),
    (SELECT count(*)::int FROM public.profiles p WHERE p.role = 'teacher' AND p.district_id = d.id),
    (SELECT count(*)::int FROM public.profiles p WHERE p.role = 'inspector' AND p.district_id = d.id),
    (SELECT count(*)::int FROM public.profiles p
       LEFT JOIN public.teacher_public_data pub ON pub.teacher_id = p.id
       LEFT JOIN public.teacher_private_data prv ON prv.teacher_id = p.id
      WHERE p.role = 'teacher' AND p.district_id = d.id
        AND GREATEST(pub.updated_at, prv.updated_at) > now() - interval '7 days'),
    (SELECT COALESCE(sum(CASE WHEN jsonb_typeof(pub.data->'lessons') = 'array'
                              THEN jsonb_array_length(pub.data->'lessons') ELSE 0 END), 0)::int
       FROM public.teacher_public_data pub JOIN public.profiles p ON p.id = pub.teacher_id
      WHERE p.role = 'teacher' AND p.district_id = d.id),
    (SELECT count(*)::int FROM public.pedagogical_notes n WHERE n.district_id = d.id),
    (SELECT count(*)::int FROM public.pedagogical_notes n WHERE n.district_id = d.id AND n.status <> 'submitted'),
    (SELECT count(*)::int FROM public.inspector_circulars c WHERE c.district_id = d.id),
    (SELECT count(*)::int FROM public.profiles p WHERE p.district_id = d.id AND NOT p.is_verified),
    (SELECT count(*)::int FROM public.profiles p WHERE p.district_id = d.id AND p.created_at > now() - interval '7 days')
  FROM public.districts d
  ORDER BY d.id;
END $$;

REVOKE ALL ON FUNCTION public.admin_wilaya_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_wilaya_stats() TO authenticated;

-- طھط­ظˆظٹظ„ طھط§ط±ظٹط® ظٹظƒطھط¨ظ‡ ط§ظ„ط£ط³طھط§ط° ظپظٹ JSON ط¯ظˆظ† ط¥ط³ظ‚ط§ط· ط§ظ„ط§ط³طھط¹ظ„ط§ظ… ط¹ظ†ط¯ ظ‚ظٹظ…ط© ط؛ظٹط± طµط§ظ„ط­ط©
CREATE OR REPLACE FUNCTION public.try_timestamptz(p TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql STABLE SET search_path = public
AS $$
BEGIN
  RETURN p::timestamptz;
EXCEPTION WHEN others THEN
  RETURN NULL;
END $$;

-- ط¢ط®ط± ط¥ط¹ظ„ط§ظ†ط§طھ ط§ظ„ط£ط³ط§طھط°ط© ط§ظ„ط¹ط§ظ…ط© ظ„ظ…ط±ط§ظ‚ط¨ط© ط§ظ„ظ…ط­طھظˆظ‰ (ظ‚ط±ط§ط،ط© ظپظ‚ط·)
CREATE OR REPLACE FUNCTION public.admin_recent_announcements(p_limit INT DEFAULT 50)
RETURNS TABLE (
  teacher_id UUID, teacher_name TEXT, slug TEXT, title TEXT, content TEXT, category TEXT, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.slug, a->>'title', a->>'content', a->>'category',
         public.try_timestamptz(a->>'createdAt') AS created
  FROM public.teacher_public_data pub
  JOIN public.profiles p ON p.id = pub.teacher_id
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(pub.data->'announcements') = 'array' THEN pub.data->'announcements' ELSE '[]'::jsonb END
  ) AS a
  WHERE COALESCE(a->>'active', 'true') <> 'false'
  ORDER BY created DESC NULLS LAST
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
END $$;

REVOKE ALL ON FUNCTION public.admin_recent_announcements(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recent_announcements(INT) TO authenticated;
