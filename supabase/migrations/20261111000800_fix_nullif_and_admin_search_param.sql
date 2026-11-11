-- Migration 0008: Replace pg_catalog.nullif syntactic construct with SQL NULLIF, fix p_specialization_id reference, and ensure default specialization #1 is seeded

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
    NEW.phone := NULLIF(pg_catalog.btrim(NEW.phone), '');
  END IF;
  IF NEW.university IS NOT NULL THEN
    NEW.university := NULLIF(pg_catalog.btrim(NEW.university), '');
  END IF;
  IF NEW.email IS NOT NULL THEN
    NEW.email := NULLIF(pg_catalog.lower(pg_catalog.btrim(NEW.email)), '');
  END IF;

  RETURN NEW;
END;
$$;

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
        university = CASE WHEN p_university IS NULL THEN university ELSE NULLIF(pg_catalog.btrim(p_university), '') END,
        email = CASE WHEN p_email IS NULL THEN email ELSE NULLIF(pg_catalog.lower(pg_catalog.btrim(p_email)), '') END
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

CREATE OR REPLACE FUNCTION public.admin_list_registrations(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10,
  p_search TEXT DEFAULT '',
  p_specialization_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT '',
  p_date_filter TEXT DEFAULT 'all'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_page INTEGER := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size INTEGER := LEAST(GREATEST(COALESCE(p_page_size, 10), 1), 200);
  v_offset INTEGER := (v_page - 1) * v_page_size;
  v_search TEXT := pg_catalog.btrim(COALESCE(p_search, ''));
  v_status TEXT := pg_catalog.btrim(COALESCE(p_status, ''));
  v_date_filter TEXT := COALESCE(NULLIF(pg_catalog.btrim(p_date_filter), ''), 'all');
  v_since TIMESTAMPTZ := NULL;
  v_items JSONB := '[]'::jsonb;
  v_total BIGINT := 0;
BEGIN
  IF NOT (SELECT private.is_active_admin()) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_date_filter = 'today' THEN
    v_since := date_trunc('day', pg_catalog.now());
  ELSIF v_date_filter = 'week' THEN
    v_since := pg_catalog.now() - interval '7 days';
  ELSIF v_date_filter = 'month' THEN
    v_since := pg_catalog.now() - interval '30 days';
  END IF;

  WITH filtered AS (
    SELECT
      r.id,
      r.registration_number,
      r.student_id,
      r.specialization_id,
      r.specialization_name_ar,
      r.specialization_name_en,
      r.status,
      r.confirmed_attendance,
      r.rejection_reason,
      r.submitted_at,
      r.reviewed_at,
      r.reviewed_by,
      r.created_at,
      r.updated_at,
      st.first_name,
      st.last_name,
      st.phone,
      st.instagram_username,
      st.university,
      st.email,
      latest_note.note AS admin_note,
      count(*) OVER () AS total_count
    FROM public.registrations r
    JOIN public.students st ON st.id = r.student_id
    LEFT JOIN LATERAL (
      SELECT an.note
      FROM public.admin_notes an
      WHERE an.registration_id = r.id
      ORDER BY an.updated_at DESC
      LIMIT 1
    ) latest_note ON true
    WHERE
      (p_specialization_id IS NULL OR r.specialization_id = p_specialization_id)
      AND (v_status = '' OR r.status = v_status)
      AND (v_since IS NULL OR r.submitted_at >= v_since)
      AND (
        v_search = ''
        OR r.registration_number ILIKE ('%' || v_search || '%')
        OR (st.first_name || ' ' || st.last_name) ILIKE ('%' || v_search || '%')
        OR st.instagram_username ILIKE ('%' || v_search || '%')
        OR COALESCE(st.phone, '') ILIKE ('%' || v_search || '%')
      )
    ORDER BY r.submitted_at DESC, r.created_at DESC
    LIMIT v_page_size
    OFFSET v_offset
  )
  SELECT
    COALESCE(MAX(f.total_count), 0),
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'referenceId', f.registration_number,
          'studentId', f.student_id,
          'firstName', f.first_name,
          'lastName', f.last_name,
          'phone', f.phone,
          'instagramHandle', f.instagram_username,
          'university', f.university,
          'email', f.email,
          'specializationId', f.specialization_id,
          'specializationNameAr', f.specialization_name_ar,
          'specializationNameEn', f.specialization_name_en,
          'status', f.status,
          'confirmedAttendance', f.confirmed_attendance,
          'rejectionReason', f.rejection_reason,
          'adminNotes', f.admin_note,
          'submittedAt', f.submitted_at,
          'reviewedAt', f.reviewed_at,
          'reviewedBy', f.reviewed_by,
          'createdAt', f.created_at,
          'updatedAt', f.updated_at
        )
      ),
      '[]'::jsonb
    )
  INTO v_total, v_items
  FROM filtered f;

  IF v_total = 0 THEN
    SELECT count(*)
    INTO v_total
    FROM public.registrations r
    JOIN public.students st ON st.id = r.student_id
    WHERE
      (p_specialization_id IS NULL OR r.specialization_id = p_specialization_id)
      AND (v_status = '' OR r.status = v_status)
      AND (v_since IS NULL OR r.submitted_at >= v_since)
      AND (
        v_search = ''
        OR r.registration_number ILIKE ('%' || v_search || '%')
        OR (st.first_name || ' ' || st.last_name) ILIKE ('%' || v_search || '%')
        OR st.instagram_username ILIKE ('%' || v_search || '%')
        OR COALESCE(st.phone, '') ILIKE ('%' || v_search || '%')
      );
  END IF;

  RETURN jsonb_build_object(
    'items', v_items,
    'totalCount', v_total,
    'page', v_page,
    'pageSize', v_page_size
  );
END;
$$;

INSERT INTO public.specializations (id, name_ar, name_en, description, icon, is_active, display_order)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'هندسة البرمجيات وتكنولوجيا المعلومات', 'Software Engineering & IT', 'Software architecture, full-stack web engineering, and systems development.', 'terminal', true, 1)
ON CONFLICT (id) DO NOTHING;
