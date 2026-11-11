-- Migration 0010: Hardened Per-IP Sliding Rate Limiting, Anti-Bot / Fake-Input Checks, and Phone Duplicate Guard

-- 1. Single-row-per-IP throttle state table in private schema (prevents unbounded growth)
CREATE TABLE IF NOT EXISTS private.ip_throttles (
  ip_hash TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE private.ip_throttles ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ip_throttles FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.ip_throttles FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private.ip_throttles TO service_role;

CREATE POLICY ip_throttles_service_role_only
  ON private.ip_throttles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Functional index for normalized phone digits lookup
CREATE INDEX IF NOT EXISTS students_phone_digits_idx
  ON public.students ((pg_catalog.regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')))
  WHERE phone IS NOT NULL;

-- 2. Harden public.submit_public_registration
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
  v_event RECORD;
  v_page_open BOOLEAN;
  v_accepted_count BIGINT;
  v_spec RECORD;
  v_clean_first TEXT;
  v_clean_last TEXT;
  v_clean_handle TEXT;
  v_clean_phone TEXT;
  v_digits TEXT;
  v_student_id UUID;
  v_reg RECORD;
  v_throttle RECORD;
  v_now TIMESTAMPTZ := pg_catalog.now();
  v_max_attempts CONSTANT INTEGER := 10;
  v_window CONSTANT INTERVAL := interval '15 minutes';
  v_cooldown CONSTANT INTERVAL := interval '15 minutes';
BEGIN
  -- 1. Sliding-window IP rate limit + active block check (10 attempts / 15 min)
  IF p_ip_hash IS NOT NULL AND pg_catalog.btrim(p_ip_hash) <> '' THEN
    SELECT * INTO v_throttle
    FROM private.ip_throttles
    WHERE ip_hash = p_ip_hash
    FOR UPDATE;

    IF FOUND THEN
      IF v_throttle.blocked_until IS NOT NULL AND v_throttle.blocked_until > v_now THEN
        RAISE EXCEPTION 'RATE_LIMITED: Too many registration attempts. Please try again later.'
          USING ERRCODE = 'P0001';
      END IF;

      IF v_throttle.window_started_at + v_window <= v_now THEN
        UPDATE private.ip_throttles
        SET window_started_at = v_now,
            attempt_count = 1,
            blocked_until = NULL,
            updated_at = v_now
        WHERE ip_hash = p_ip_hash;
      ELSE
        IF v_throttle.attempt_count + 1 > v_max_attempts THEN
          UPDATE private.ip_throttles
          SET attempt_count = v_throttle.attempt_count + 1,
              blocked_until = v_now + v_cooldown,
              updated_at = v_now
          WHERE ip_hash = p_ip_hash;

          RAISE EXCEPTION 'RATE_LIMITED: Too many registration attempts. Please try again in 15 minutes.'
            USING ERRCODE = 'P0001';
        ELSE
          UPDATE private.ip_throttles
          SET attempt_count = v_throttle.attempt_count + 1,
              updated_at = v_now
          WHERE ip_hash = p_ip_hash;
        END IF;
      END IF;
    ELSE
      INSERT INTO private.ip_throttles (ip_hash, window_started_at, attempt_count, updated_at)
      VALUES (p_ip_hash, v_now, 1, v_now);
    END IF;
  END IF;

  -- 2. Check global registration availability & capacity
  SELECT es.is_registration_open, es.capacity
  INTO v_event
  FROM public.event_settings es
  WHERE es.singleton_key = true;

  SELECT ps.is_registration_open
  INTO v_page_open
  FROM public.page_settings ps
  WHERE ps.singleton_key = true;

  IF COALESCE(v_event.is_registration_open, false) IS DISTINCT FROM true
     OR COALESCE(v_page_open, false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'REGISTRATION_CLOSED: Registration is currently closed.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*) INTO v_accepted_count
  FROM public.registrations r
  WHERE r.status = 'accepted';

  IF v_event.capacity > 0 AND v_accepted_count >= v_event.capacity THEN
    RAISE EXCEPTION 'CAPACITY_REACHED: Event capacity has been reached.'
      USING ERRCODE = 'P0009';
  END IF;

  -- 3. Validate attendance confirmation & reject fake / spam inputs
  IF COALESCE(p_confirmed_attendance, false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'CONFIRMATION_REQUIRED: Attendance confirmation is required.'
      USING ERRCODE = 'P0003';
  END IF;

  v_clean_first := pg_catalog.regexp_replace(pg_catalog.btrim(COALESCE(p_first_name, '')), '\s+', ' ', 'g');
  v_clean_last := pg_catalog.regexp_replace(pg_catalog.btrim(COALESCE(p_last_name, '')), '\s+', ' ', 'g');

  IF char_length(v_clean_first) < 2 OR char_length(v_clean_first) > 60
     OR char_length(v_clean_last) < 2 OR char_length(v_clean_last) > 60
     OR v_clean_first !~ '[[:alpha:]]'
     OR v_clean_last !~ '[[:alpha:]]'
     OR v_clean_first ~* '(https?://|www\.|[<>@#\$%^&*={}\[\]\\|])'
     OR v_clean_last ~* '(https?://|www\.|[<>@#\$%^&*={}\[\]\\|])' THEN
    RAISE EXCEPTION 'INVALID_NAME: Please provide valid Arabic or Latin names.'
      USING ERRCODE = 'P0004';
  END IF;

  v_clean_phone := pg_catalog.btrim(COALESCE(p_phone, ''));
  v_digits := pg_catalog.regexp_replace(v_clean_phone, '[^0-9]', '', 'g');
  IF v_clean_phone !~ '^[+\d\s()-]+$'
     OR char_length(v_digits) < 8
     OR char_length(v_digits) > 15
     OR v_digits ~ '^(\d)\1+$'
     OR (SELECT count(DISTINCT ch) FROM pg_catalog.regexp_split_to_table(v_digits, '') AS ch) < 3 THEN
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

  -- 5. Prevent duplicate active registrations by normalized phone digits
  IF EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.students st ON st.id = r.student_id
    WHERE pg_catalog.regexp_replace(COALESCE(st.phone, ''), '[^0-9]', '', 'g') = v_digits
      AND r.status IN ('new', 'under_review', 'accepted')
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_REGISTRATION: A registration with this phone number already exists.'
      USING ERRCODE = 'P0008';
  END IF;

  -- 6. Upsert student identity & prevent duplicate active registrations by Instagram
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
    SET first_name = v_clean_first,
        last_name = v_clean_last,
        phone = v_clean_phone
    WHERE id = v_student_id;
  ELSE
    INSERT INTO public.students (first_name, last_name, phone, instagram_username)
    VALUES (
      v_clean_first,
      v_clean_last,
      v_clean_phone,
      v_clean_handle
    )
    RETURNING id INTO v_student_id;
  END IF;

  -- 7. Insert registration record
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

  -- 8. Notify admins
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
    v_clean_first || ' ' || v_clean_last || ' (' || v_clean_handle || ') قدّم طلب تسجيل جديد.',
    v_clean_first || ' ' || v_clean_last || ' (' || v_clean_handle || ') submitted a new registration.',
    v_reg.id
  );

  RETURN jsonb_build_object(
    'id', v_reg.id,
    'referenceId', v_reg.registration_number,
    'firstName', v_clean_first,
    'lastName', v_clean_last,
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
