-- Migration 0007: Explicit Service-Role Policy on Rate Limits & Specialization Registration Counts Helper

CREATE POLICY rate_limits_service_role_only
  ON private.registration_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_specialization_counts()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_counts JSONB;
BEGIN
  IF NOT (SELECT private.is_active_admin()) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(spec_id::text, cnt),
    '{}'::jsonb
  )
  INTO v_counts
  FROM (
    SELECT r.specialization_id AS spec_id, count(*)::bigint AS cnt
    FROM public.registrations r
    GROUP BY r.specialization_id
  ) sub;

  RETURN v_counts;
END;
$$;

REVOKE ALL ON FUNCTION public.get_specialization_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_specialization_counts() TO authenticated, service_role;
