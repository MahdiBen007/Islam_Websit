-- Migration 0004: Explicit Grants, Strict Row Level Security (RLS), and Storage Policies

-- 1. Least-Privilege Schema & Table Grants
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Public anon read-only grants ONLY on public display tables
GRANT SELECT ON TABLE public.specializations TO anon;
GRANT SELECT ON TABLE public.event_settings TO anon;
GRANT SELECT ON TABLE public.page_settings TO anon;

-- Authenticated baseline grants (gated tightly by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.specializations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.registrations TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.event_settings TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.page_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_notes TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.admin_notifications TO authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

-- Sequences for registration numbering
GRANT USAGE, SELECT ON SEQUENCE public.registration_number_seq TO authenticated, service_role;

-- Service role keeps full backend administrative access
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 2. Enable RLS & Force RLS on every public table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.students FORCE ROW LEVEL SECURITY;
ALTER TABLE public.specializations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.registrations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.event_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.page_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications FORCE ROW LEVEL SECURITY;

-- 3. RLS Policies: public.profiles
CREATE POLICY profiles_select_own_or_admin
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (SELECT private.is_active_admin())
  );

CREATE POLICY profiles_insert_super_admin
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.is_super_admin()));

CREATE POLICY profiles_update_super_admin
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_super_admin()))
  WITH CHECK ((SELECT private.is_super_admin()));

CREATE POLICY profiles_delete_super_admin
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (
    (SELECT private.is_super_admin())
    AND id <> (SELECT auth.uid())
  );

-- 4. RLS Policies: public.students (Admin-only; ZERO anon/ordinary user access)
CREATE POLICY students_admin_all
  ON public.students
  FOR ALL
  TO authenticated
  USING ((SELECT private.is_active_admin()))
  WITH CHECK ((SELECT private.is_active_admin()));

-- 5. RLS Policies: public.specializations
CREATE POLICY specializations_anon_select_active
  ON public.specializations
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY specializations_auth_select
  ON public.specializations
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR (SELECT private.is_active_admin())
  );

CREATE POLICY specializations_admin_insert
  ON public.specializations
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.is_active_admin()));

CREATE POLICY specializations_admin_update
  ON public.specializations
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_active_admin()))
  WITH CHECK ((SELECT private.is_active_admin()));

CREATE POLICY specializations_admin_delete
  ON public.specializations
  FOR DELETE
  TO authenticated
  USING ((SELECT private.is_active_admin()));

-- 6. RLS Policies: public.registrations (Admin-only; public uses submit-registration Edge Function)
CREATE POLICY registrations_admin_all
  ON public.registrations
  FOR ALL
  TO authenticated
  USING ((SELECT private.is_active_admin()))
  WITH CHECK ((SELECT private.is_active_admin()));

-- 7. RLS Policies: public.event_settings
CREATE POLICY event_settings_anon_select_active
  ON public.event_settings
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY event_settings_auth_select
  ON public.event_settings
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR (SELECT private.is_active_admin())
  );

CREATE POLICY event_settings_admin_update
  ON public.event_settings
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_active_admin()))
  WITH CHECK ((SELECT private.is_active_admin()));

-- 8. RLS Policies: public.page_settings
CREATE POLICY page_settings_anon_select_active
  ON public.page_settings
  FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY page_settings_auth_select
  ON public.page_settings
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    OR (SELECT private.is_active_admin())
  );

CREATE POLICY page_settings_admin_update
  ON public.page_settings
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_active_admin()))
  WITH CHECK ((SELECT private.is_active_admin()));

-- 9. RLS Policies: public.admin_notes (Admin-only)
CREATE POLICY admin_notes_admin_all
  ON public.admin_notes
  FOR ALL
  TO authenticated
  USING ((SELECT private.is_active_admin()))
  WITH CHECK ((SELECT private.is_active_admin()));

-- 10. RLS Policies: public.admin_notifications (Admin-only)
CREATE POLICY admin_notifications_admin_select
  ON public.admin_notifications
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_active_admin()));

CREATE POLICY admin_notifications_admin_update
  ON public.admin_notifications
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_active_admin()))
  WITH CHECK ((SELECT private.is_active_admin()));

-- 11. RLS Policies: public.audit_logs (Immutable log - Admins can ONLY read)
CREATE POLICY audit_logs_admin_select
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING ((SELECT private.is_active_admin()));

-- 12. Storage Buckets & Strict RLS on storage.objects
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'club-logos',
    'club-logos',
    true,
    2097152,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  ),
  (
    'event-assets',
    'event-assets',
    true,
    5242880,
    ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY public_read_club_and_event_assets
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id IN ('club-logos', 'event-assets'));

CREATE POLICY admin_insert_club_and_event_assets
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('club-logos', 'event-assets')
    AND (SELECT private.is_active_admin())
  );

CREATE POLICY admin_update_club_and_event_assets
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('club-logos', 'event-assets')
    AND (SELECT private.is_active_admin())
  )
  WITH CHECK (
    bucket_id IN ('club-logos', 'event-assets')
    AND (SELECT private.is_active_admin())
  );

CREATE POLICY admin_delete_club_and_event_assets
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('club-logos', 'event-assets')
    AND (SELECT private.is_active_admin())
  );
