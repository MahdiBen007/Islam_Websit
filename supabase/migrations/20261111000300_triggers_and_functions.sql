-- Migration 0003: Role Helpers, Normalization Triggers, Audit Logging, and Transactional Functions

-- 1. Non-recursive active admin & super_admin role check helpers in private schema
CREATE OR REPLACE FUNCTION private.is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.is_active = true
      AND p.role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.is_active = true
      AND p.role = 'super_admin'
  );
$$;

REVOKE ALL ON FUNCTION private.is_active_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_active_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION private.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated, service_role;

-- 2. Field Normalization Triggers
CREATE OR REPLACE FUNCTION private.normalize_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.full_name := pg_catalog.btrim(NEW.full_name);
  NEW.email := pg_catalog.lower(pg_catalog.btrim(NEW.email));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_profiles_normalize
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.normalize_profile_fields();

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE OR REPLACE FUNCTION private.normalize_student_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_clean_handle TEXT;
BEGIN
  NEW.first_name := pg_catalog.btrim(NEW.first_name);
  NEW.last_name := pg_catalog.btrim(NEW.last_name);

  v_clean_handle := pg_catalog.regexp_replace(
    pg_catalog.lower(pg_catalog.btrim(NEW.instagram_username)),
    '^@+',
    ''
  );
  NEW.instagram_username := CASE
    WHEN v_clean_handle = '' THEN ''
    ELSE '@' || v_clean_handle
  END;

  IF NEW.phone IS NOT NULL THEN
    NEW.phone := pg_catalog.nullif(pg_catalog.btrim(NEW.phone), '');
  END IF;
  IF NEW.university IS NOT NULL THEN
    NEW.university := pg_catalog.nullif(pg_catalog.btrim(NEW.university), '');
  END IF;
  IF NEW.email IS NOT NULL THEN
    NEW.email := pg_catalog.nullif(pg_catalog.lower(pg_catalog.btrim(NEW.email)), '');
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_students_normalize
  BEFORE INSERT OR UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION private.normalize_student_fields();

CREATE OR REPLACE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE OR REPLACE TRIGGER trg_specializations_updated_at
  BEFORE UPDATE ON public.specializations
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

-- 3. Registration Number Generator, Specialization Snapshot & Review Tracking
CREATE OR REPLACE FUNCTION private.prepare_registration_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_spec RECORD;
  v_reviewer_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.registration_number IS NULL OR pg_catalog.btrim(NEW.registration_number) = '' THEN
      NEW.registration_number := 'REG-' || pg_catalog.lpad(
        pg_catalog.nextval('public.registration_number_seq')::text,
        6,
        '0'
      );
    END IF;

    SELECT s.name_ar, s.name_en
    INTO v_spec
    FROM public.specializations s
    WHERE s.id = NEW.specialization_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Specialization not found' USING ERRCODE = '23503';
    END IF;

    NEW.specialization_name_ar := COALESCE(NULLIF(pg_catalog.btrim(NEW.specialization_name_ar), ''), v_spec.name_ar);
    NEW.specialization_name_en := COALESCE(NULLIF(pg_catalog.btrim(NEW.specialization_name_en), ''), v_spec.name_en);

    IF NEW.submitted_at IS NULL THEN
      NEW.submitted_at := pg_catalog.now();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.specialization_id IS DISTINCT FROM OLD.specialization_id THEN
      SELECT s.name_ar, s.name_en
      INTO v_spec
      FROM public.specializations s
      WHERE s.id = NEW.specialization_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Specialization not found' USING ERRCODE = '23503';
      END IF;

      NEW.specialization_name_ar := v_spec.name_ar;
      NEW.specialization_name_en := v_spec.name_en;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('under_review', 'accepted', 'rejected') THEN
      NEW.reviewed_at := pg_catalog.now();
      SELECT p.id INTO v_reviewer_id
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.is_active = true;
      IF v_reviewer_id IS NOT NULL THEN
        NEW.reviewed_by := v_reviewer_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_registrations_prepare
  BEFORE INSERT OR UPDATE ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION private.prepare_registration_row();

CREATE OR REPLACE TRIGGER trg_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE OR REPLACE TRIGGER trg_event_settings_updated_at
  BEFORE UPDATE ON public.event_settings
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE OR REPLACE TRIGGER trg_page_settings_updated_at
  BEFORE UPDATE ON public.page_settings
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

CREATE OR REPLACE TRIGGER trg_admin_notes_updated_at
  BEFORE UPDATE ON public.admin_notes
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

-- 4. Keep is_registration_open synchronized across event_settings & page_settings
CREATE OR REPLACE FUNCTION private.sync_registration_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF pg_catalog.pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'event_settings' AND NEW.is_registration_open IS DISTINCT FROM OLD.is_registration_open THEN
    UPDATE public.page_settings
    SET is_registration_open = NEW.is_registration_open
    WHERE singleton_key = true;
  ELSIF TG_TABLE_NAME = 'page_settings' AND NEW.is_registration_open IS DISTINCT FROM OLD.is_registration_open THEN
    UPDATE public.event_settings
    SET is_registration_open = NEW.is_registration_open
    WHERE singleton_key = true;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_sync_availability_from_event
  AFTER UPDATE OF is_registration_open ON public.event_settings
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_registration_availability();

CREATE OR REPLACE TRIGGER trg_sync_availability_from_page
  AFTER UPDATE OF is_registration_open ON public.page_settings
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_registration_availability();

-- 5. Immutable Administrative Audit Triggers
CREATE OR REPLACE FUNCTION private.write_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id UUID;
  v_action TEXT;
  v_entity_id TEXT;
  v_details JSONB := '{}'::jsonb;
BEGIN
  SELECT p.id INTO v_admin_id
  FROM public.profiles p
  WHERE p.id = (SELECT auth.uid());

  IF TG_TABLE_NAME = 'registrations' THEN
    IF TG_OP = 'INSERT' THEN
      v_entity_id := NEW.id::text;
      v_action := CASE WHEN v_admin_id IS NULL THEN 'registration_submitted' ELSE 'registration_created_by_admin' END;
      v_details := jsonb_build_object(
        'registration_number', NEW.registration_number,
        'status', NEW.status,
        'specialization_id', NEW.specialization_id
      );
    ELSIF TG_OP = 'UPDATE' THEN
      v_entity_id := NEW.id::text;
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        v_action := CASE NEW.status
          WHEN 'accepted' THEN 'registration_accepted'
          WHEN 'rejected' THEN 'registration_rejected'
          WHEN 'under_review' THEN 'registration_under_review'
          ELSE 'registration_status_changed'
        END;
        v_details := jsonb_build_object(
          'registration_number', NEW.registration_number,
          'from_status', OLD.status,
          'to_status', NEW.status,
          'rejection_reason', NEW.rejection_reason
        );
      ELSE
        v_action := 'registration_updated';
        v_details := jsonb_build_object(
          'registration_number', NEW.registration_number,
          'specialization_id', NEW.specialization_id
        );
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      v_entity_id := OLD.id::text;
      v_action := 'registration_deleted';
      v_details := jsonb_build_object(
        'registration_number', OLD.registration_number,
        'student_id', OLD.student_id,
        'status', OLD.status
      );
    END IF;
  ELSIF TG_TABLE_NAME = 'students' THEN
    IF TG_OP = 'UPDATE' THEN
      v_entity_id := NEW.id::text;
      v_action := 'student_updated';
      v_details := jsonb_build_object(
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'instagram_username', NEW.instagram_username
      );
    ELSIF TG_OP = 'DELETE' THEN
      v_entity_id := OLD.id::text;
      v_action := 'student_deleted';
      v_details := jsonb_build_object('instagram_username', OLD.instagram_username);
    ELSE
      RETURN COALESCE(NEW, OLD);
    END IF;
  ELSIF TG_TABLE_NAME = 'specializations' THEN
    v_entity_id := COALESCE(NEW.id, OLD.id)::text;
    IF TG_OP = 'INSERT' THEN
      v_action := 'specialization_created';
      v_details := jsonb_build_object('name_ar', NEW.name_ar, 'name_en', NEW.name_en, 'is_active', NEW.is_active);
    ELSIF TG_OP = 'UPDATE' THEN
      v_action := CASE
        WHEN NEW.is_active IS DISTINCT FROM OLD.is_active THEN 'specialization_toggled'
        ELSE 'specialization_updated'
      END;
      v_details := jsonb_build_object('name_ar', NEW.name_ar, 'name_en', NEW.name_en, 'is_active', NEW.is_active);
    ELSE
      v_action := 'specialization_deleted';
      v_details := jsonb_build_object('name_ar', OLD.name_ar, 'name_en', OLD.name_en);
    END IF;
  ELSIF TG_TABLE_NAME = 'event_settings' AND TG_OP = 'UPDATE' THEN
    v_entity_id := 'singleton';
    IF NEW.is_registration_open IS DISTINCT FROM OLD.is_registration_open THEN
      v_action := 'registration_availability_changed';
      v_details := jsonb_build_object(
        'from_open', OLD.is_registration_open,
        'to_open', NEW.is_registration_open
      );
    ELSE
      v_action := 'event_settings_updated';
      v_details := jsonb_build_object(
        'event_name_ar', NEW.event_name_ar,
        'event_name_en', NEW.event_name_en,
        'event_logo_url', NEW.event_logo_url
      );
    END IF;
  ELSIF TG_TABLE_NAME = 'page_settings' AND TG_OP = 'UPDATE' THEN
    v_entity_id := 'singleton';
    IF NEW.is_registration_open IS DISTINCT FROM OLD.is_registration_open THEN
      v_action := 'registration_availability_changed';
      v_details := jsonb_build_object(
        'from_open', OLD.is_registration_open,
        'to_open', NEW.is_registration_open
      );
    ELSE
      v_action := 'page_settings_updated';
      v_details := jsonb_build_object('hero_title_ar', NEW.hero_title_ar);
    END IF;
  ELSIF TG_TABLE_NAME = 'admin_notes' THEN
    v_entity_id := COALESCE(NEW.registration_id, OLD.registration_id)::text;
    v_action := 'admin_note_' || pg_catalog.lower(TG_OP);
    v_details := jsonb_build_object('note_id', COALESCE(NEW.id, OLD.id));
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (v_admin_id, v_action, TG_TABLE_NAME, v_entity_id, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER trg_audit_registrations
  AFTER INSERT OR UPDATE OR DELETE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();

CREATE OR REPLACE TRIGGER trg_audit_students
  AFTER UPDATE OR DELETE ON public.students
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();

CREATE OR REPLACE TRIGGER trg_audit_specializations
  AFTER INSERT OR UPDATE OR DELETE ON public.specializations
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();

CREATE OR REPLACE TRIGGER trg_audit_event_settings
  AFTER UPDATE ON public.event_settings
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();

CREATE OR REPLACE TRIGGER trg_audit_page_settings
  AFTER UPDATE ON public.page_settings
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();

CREATE OR REPLACE TRIGGER trg_audit_admin_notes
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_notes
  FOR EACH ROW EXECUTE FUNCTION private.write_audit_log();

-- 6. Server-Only Public Registration RPC (callable ONLY by service_role from Edge Function)
CREATE OR REPLACE FUNCTION public.submit_public_registration(
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_specialization_id UUID,
  p_instagram_username TEXT,
  p_confirmed_attendance BOOLEAN DEFAULT true,
  p_ip_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_open BOOLEAN;
  v_spec RECORD;
  v_clean_handle TEXT;
  v_clean_phone TEXT;
  v_digits TEXT;
  v_student_id UUID;
  v_reg RECORD;
  v_bucket TIMESTAMPTZ;
  v_attempt_count INTEGER;
BEGIN
  -- 1. Rate limiting per IP hash (12 attempts per 15-minute window)
  IF p_ip_hash IS NOT NULL AND pg_catalog.btrim(p_ip_hash) <> '' THEN
    v_bucket := date_trunc('hour', pg_catalog.now())
      + floor(extract(minute FROM pg_catalog.now()) / 15)::int * interval '15 minutes';

    INSERT INTO private.registration_rate_limits (ip_hash, window_bucket, attempt_count)
    VALUES (p_ip_hash, v_bucket, 1)
    ON CONFLICT (ip_hash, window_bucket)
    DO UPDATE SET attempt_count = private.registration_rate_limits.attempt_count + 1
    RETURNING attempt_count INTO v_attempt_count;

    IF v_attempt_count > 12 THEN
      RAISE EXCEPTION 'RATE_LIMITED: Too many registration attempts. Please try again shortly.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 2. Check global registration availability
  SELECT COALESCE(es.is_registration_open AND ps.is_registration_open, true)
  INTO v_is_open
  FROM public.event_settings es
  CROSS JOIN public.page_settings ps
  WHERE es.singleton_key = true AND ps.singleton_key = true;

  IF v_is_open IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'REGISTRATION_CLOSED: Registration is currently closed.'
      USING ERRCODE = 'P0002';
  END IF;

  -- 3. Validate attendance confirmation & inputs
  IF COALESCE(p_confirmed_attendance, false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'CONFIRMATION_REQUIRED: Attendance confirmation is required.'
      USING ERRCODE = 'P0003';
  END IF;

  IF char_length(pg_catalog.btrim(COALESCE(p_first_name, ''))) < 2 OR
     char_length(pg_catalog.btrim(COALESCE(p_last_name, ''))) < 2 THEN
    RAISE EXCEPTION 'INVALID_NAME: First and last name must be at least 2 characters.'
      USING ERRCODE = 'P0004';
  END IF;

  v_clean_phone := pg_catalog.btrim(COALESCE(p_phone, ''));
  v_digits := pg_catalog.regexp_replace(v_clean_phone, '[^0-9]', '', 'g');
  IF v_clean_phone !~ '^[+\d\s()-]+$' OR char_length(v_digits) < 8 OR char_length(v_digits) > 15 THEN
    RAISE EXCEPTION 'INVALID_PHONE: Valid phone number (8-15 digits) is required.'
      USING ERRCODE = 'P0005';
  END IF;

  v_clean_handle := '@' || pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(COALESCE(p_instagram_username, ''))), '^@+', '');
  IF v_clean_handle !~ '^@[a-z0-9._]{1,30}$'
     OR right(v_clean_handle, 1) = '.'
     OR position('..' in v_clean_handle) > 0 THEN
    RAISE EXCEPTION 'INVALID_INSTAGRAM: Valid Instagram username is required.'
      USING ERRCODE = 'P0006';
  END IF;

  -- 4. Verify active specialization
  SELECT s.id, s.name_ar, s.name_en, s.is_active
  INTO v_spec
  FROM public.specializations s
  WHERE s.id = p_specialization_id;

  IF NOT FOUND OR v_spec.is_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'SPECIALIZATION_UNAVAILABLE: Selected specialization is invalid or disabled.'
      USING ERRCODE = 'P0007';
  END IF;

  -- 5. Upsert student identity & prevent duplicate active registrations
  SELECT st.id INTO v_student_id
  FROM public.students st
  WHERE pg_catalog.lower(st.instagram_username) = v_clean_handle
  FOR UPDATE;

  IF v_student_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.registrations r
      WHERE r.student_id = v_student_id
        AND r.status IN ('new', 'under_review', 'accepted')
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_REGISTRATION: A registration with this Instagram username already exists.'
        USING ERRCODE = 'P0008';
    END IF;

    UPDATE public.students
    SET first_name = pg_catalog.btrim(p_first_name),
        last_name = pg_catalog.btrim(p_last_name),
        phone = v_clean_phone
    WHERE id = v_student_id;
  ELSE
    INSERT INTO public.students (first_name, last_name, phone, instagram_username)
    VALUES (
      pg_catalog.btrim(p_first_name),
      pg_catalog.btrim(p_last_name),
      v_clean_phone,
      v_clean_handle
    )
    RETURNING id INTO v_student_id;
  END IF;

  -- 6. Insert registration record
  INSERT INTO public.registrations (
    student_id,
    specialization_id,
    specialization_name_ar,
    specialization_name_en,
    status,
    confirmed_attendance
  )
  VALUES (
    v_student_id,
    v_spec.id,
    v_spec.name_ar,
    v_spec.name_en,
    'new',
    true
  )
  RETURNING * INTO v_reg;

  -- 7. Notify admins
  INSERT INTO public.admin_notifications (
    title_ar,
    title_en,
    message_ar,
    message_en,
    registration_id
  )
  VALUES (
    'طلب تسجيل جديد',
    'New Registration Request',
    pg_catalog.btrim(p_first_name) || ' ' || pg_catalog.btrim(p_last_name) || ' (' || v_clean_handle || ') قدّم طلب تسجيل جديد.',
    pg_catalog.btrim(p_first_name) || ' ' || pg_catalog.btrim(p_last_name) || ' (' || v_clean_handle || ') submitted a new registration.',
    v_reg.id
  );

  RETURN jsonb_build_object(
    'id', v_reg.id,
    'referenceId', v_reg.registration_number,
    'firstName', pg_catalog.btrim(p_first_name),
    'lastName', pg_catalog.btrim(p_last_name),
    'phone', v_clean_phone,
    'specializationId', v_spec.id,
    'specializationNameAr', v_spec.name_ar,
    'specializationNameEn', v_spec.name_en,
    'instagramHandle', v_clean_handle,
    'status', v_reg.status,
    'confirmedAttendance', v_reg.confirmed_attendance,
    'createdAt', v_reg.created_at,
    'updatedAt', v_reg.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_registration(TEXT, TEXT, TEXT, UUID, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_registration(TEXT, TEXT, TEXT, UUID, TEXT, BOOLEAN, TEXT) TO service_role;

-- 7. Authenticated Admin Transactional Helpers (SECURITY INVOKER - RLS applies!)
CREATE OR REPLACE FUNCTION public.get_registration_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_total BIGINT;
  v_new BIGINT;
  v_under_review BIGINT;
  v_accepted BIGINT;
  v_rejected BIGINT;
  v_today BIGINT;
BEGIN
  IF NOT (SELECT private.is_active_admin()) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'new'),
    count(*) FILTER (WHERE status = 'under_review'),
    count(*) FILTER (WHERE status = 'accepted'),
    count(*) FILTER (WHERE status = 'rejected'),
    count(*) FILTER (WHERE submitted_at >= date_trunc('day', pg_catalog.now()))
  INTO v_total, v_new, v_under_review, v_accepted, v_rejected, v_today
  FROM public.registrations;

  RETURN jsonb_build_object(
    'total', v_total,
    'newCount', v_new,
    'underReviewCount', v_under_review,
    'acceptedCount', v_accepted,
    'rejectedCount', v_rejected,
    'todayCount', v_today
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_registration_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_registration_stats() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_create_registration(
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_specialization_id UUID,
  p_instagram_username TEXT,
  p_university TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'under_review'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_clean_handle TEXT;
  v_student_id UUID;
  v_spec RECORD;
  v_reg_id UUID;
BEGIN
  IF NOT (SELECT private.is_active_admin()) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_status NOT IN ('new', 'under_review', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status value' USING ERRCODE = '22023';
  END IF;

  SELECT s.id, s.name_ar, s.name_en
  INTO v_spec
  FROM public.specializations s
  WHERE s.id = p_specialization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Specialization not found' USING ERRCODE = '23503';
  END IF;

  v_clean_handle := '@' || pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(p_instagram_username)), '^@+', '');

  SELECT st.id INTO v_student_id
  FROM public.students st
  WHERE pg_catalog.lower(st.instagram_username) = v_clean_handle
  FOR UPDATE;

  IF v_student_id IS NOT NULL THEN
    UPDATE public.students
    SET first_name = p_first_name,
        last_name = p_last_name,
        phone = p_phone,
        university = p_university,
        email = p_email
    WHERE id = v_student_id;
  ELSE
    INSERT INTO public.students (first_name, last_name, phone, instagram_username, university, email)
    VALUES (p_first_name, p_last_name, p_phone, v_clean_handle, p_university, p_email)
    RETURNING id INTO v_student_id;
  END IF;

  INSERT INTO public.registrations (
    student_id,
    specialization_id,
    specialization_name_ar,
    specialization_name_en,
    status,
    confirmed_attendance
  )
  VALUES (
    v_student_id,
    v_spec.id,
    v_spec.name_ar,
    v_spec.name_en,
    p_status,
    true
  )
  RETURNING id INTO v_reg_id;

  RETURN v_reg_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_registration(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_registration(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_update_registration(
  p_registration_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_instagram_username TEXT DEFAULT NULL,
  p_university TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_specialization_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_reg RECORD;
  v_note_id UUID;
BEGIN
  IF NOT (SELECT private.is_active_admin()) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_reg
  FROM public.registrations
  WHERE id = p_registration_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_first_name IS NOT NULL OR p_last_name IS NOT NULL OR p_phone IS NOT NULL
     OR p_instagram_username IS NOT NULL OR p_university IS NOT NULL OR p_email IS NOT NULL THEN
    UPDATE public.students
    SET first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        phone = COALESCE(p_phone, phone),
        instagram_username = COALESCE(p_instagram_username, instagram_username),
        university = CASE WHEN p_university IS NULL THEN university ELSE pg_catalog.nullif(pg_catalog.btrim(p_university), '') END,
        email = CASE WHEN p_email IS NULL THEN email ELSE pg_catalog.nullif(pg_catalog.btrim(p_email), '') END
    WHERE id = v_reg.student_id;
  END IF;

  IF p_specialization_id IS NOT NULL OR p_status IS NOT NULL OR p_rejection_reason IS NOT NULL THEN
    UPDATE public.registrations
    SET specialization_id = COALESCE(p_specialization_id, specialization_id),
        status = COALESCE(p_status, status),
        rejection_reason = COALESCE(p_rejection_reason, rejection_reason)
    WHERE id = p_registration_id;
  END IF;

  IF p_admin_note IS NOT NULL THEN
    SELECT id INTO v_note_id
    FROM public.admin_notes
    WHERE registration_id = p_registration_id
    ORDER BY updated_at DESC
    LIMIT 1;

    IF v_note_id IS NOT NULL THEN
      UPDATE public.admin_notes
      SET note = p_admin_note,
          admin_id = (SELECT auth.uid())
      WHERE id = v_note_id;
    ELSE
      INSERT INTO public.admin_notes (registration_id, admin_id, note)
      VALUES (p_registration_id, (SELECT auth.uid()), p_admin_note);
    END IF;
  END IF;

  RETURN p_registration_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_registration(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_registration(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
