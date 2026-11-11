-- Migration 0006: Covering FK Index, Private Rate-Limit RLS Hardening, and Server-Side Search/Pagination RPC

-- 1. Covering index for admin_notifications(registration_id) FK
CREATE INDEX IF NOT EXISTS admin_notifications_registration_id_idx
  ON public.admin_notifications (registration_id)
  WHERE registration_id IS NOT NULL;

-- 2. Defense-in-depth RLS on private.registration_rate_limits (accessed only via SECURITY DEFINER submit_public_registration)
ALTER TABLE private.registration_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.registration_rate_limits FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.registration_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE private.registration_rate_limits TO service_role;

-- 3. Server-side search, filtering, and pagination RPC for Admin Dashboard & Registrations Management
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
      (v_specialization_id IS NULL OR r.specialization_id = v_specialization_id)
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
      (v_specialization_id IS NULL OR r.specialization_id = v_specialization_id)
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

REVOKE ALL ON FUNCTION public.admin_list_registrations(INTEGER, INTEGER, TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_registrations(INTEGER, INTEGER, TEXT, UUID, TEXT, TEXT) TO authenticated, service_role;
