-- Migration 0002: Core Relational Schema, Constraints, Foreign Keys, and Indexes

-- 1. Administrator Profiles (linked 1:1 to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 120),
  email TEXT NOT NULL UNIQUE CHECK (email = lower(btrim(email))),
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Students Identity Records
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL CHECK (char_length(btrim(first_name)) BETWEEN 2 AND 100),
  last_name TEXT NOT NULL CHECK (char_length(btrim(last_name)) BETWEEN 2 AND 100),
  instagram_username TEXT NOT NULL CHECK (
    instagram_username ~ '^@[a-z0-9._]{1,30}$'
    AND right(instagram_username, 1) <> '.'
    AND position('..' in instagram_username) = 0
  ),
  phone TEXT CHECK (phone IS NULL OR char_length(btrim(phone)) <= 30),
  university TEXT CHECK (university IS NULL OR char_length(btrim(university)) <= 150),
  email TEXT CHECK (email IS NULL OR char_length(btrim(email)) <= 150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS students_instagram_username_uidx
  ON public.students (lower(instagram_username));

CREATE INDEX IF NOT EXISTS students_phone_idx
  ON public.students (phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS students_name_idx
  ON public.students (first_name, last_name);

CREATE INDEX IF NOT EXISTS students_instagram_trgm_idx
  ON public.students USING gin (instagram_username extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS students_fullname_trgm_idx
  ON public.students USING gin ((first_name || ' ' || last_name) extensions.gin_trgm_ops);

-- 3. Academic Specializations
CREATE TABLE IF NOT EXISTS public.specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL CHECK (char_length(btrim(name_ar)) BETWEEN 2 AND 150),
  name_en TEXT NOT NULL CHECK (char_length(btrim(name_en)) BETWEEN 2 AND 150),
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'terminal' CHECK (
    icon IN ('terminal', 'engineering', 'campaign', 'science', 'analytics', 'palette', 'cpu', 'book')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS specializations_name_ar_uidx
  ON public.specializations (lower(btrim(name_ar)));

CREATE UNIQUE INDEX IF NOT EXISTS specializations_name_en_uidx
  ON public.specializations (lower(btrim(name_en)));

CREATE INDEX IF NOT EXISTS specializations_active_order_idx
  ON public.specializations (is_active, display_order, created_at);

-- 4. Event Registrations
CREATE SEQUENCE IF NOT EXISTS public.registration_number_seq
  AS BIGINT
  START WITH 1251
  INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  specialization_id UUID NOT NULL REFERENCES public.specializations(id) ON DELETE RESTRICT,
  specialization_name_ar TEXT NOT NULL,
  specialization_name_en TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'under_review', 'accepted', 'rejected')),
  confirmed_attendance BOOLEAN NOT NULL DEFAULT true,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate active (non-rejected) registrations per student
CREATE UNIQUE INDEX IF NOT EXISTS registrations_active_student_uidx
  ON public.registrations (student_id)
  WHERE status IN ('new', 'under_review', 'accepted');

CREATE INDEX IF NOT EXISTS registrations_student_id_idx
  ON public.registrations (student_id);

CREATE INDEX IF NOT EXISTS registrations_specialization_id_idx
  ON public.registrations (specialization_id);

CREATE INDEX IF NOT EXISTS registrations_status_submitted_idx
  ON public.registrations (status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS registrations_submitted_at_idx
  ON public.registrations (submitted_at DESC);

CREATE INDEX IF NOT EXISTS registrations_reviewed_by_idx
  ON public.registrations (reviewed_by)
  WHERE reviewed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS registrations_number_trgm_idx
  ON public.registrations USING gin (registration_number extensions.gin_trgm_ops);

-- 5. Event Settings (Controlled Single-Event Configuration)
CREATE TABLE IF NOT EXISTS public.event_settings (
  singleton_key BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton_key = true),
  club_name_ar TEXT NOT NULL,
  club_name_en TEXT NOT NULL,
  club_subtitle_ar TEXT NOT NULL,
  club_subtitle_en TEXT NOT NULL,
  event_name_ar TEXT NOT NULL,
  event_name_en TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  event_date_ar TEXT NOT NULL,
  event_date_en TEXT NOT NULL,
  event_time_ar TEXT NOT NULL,
  event_time_en TEXT NOT NULL,
  event_location_ar TEXT NOT NULL,
  event_location_en TEXT NOT NULL,
  organizer_ar TEXT NOT NULL,
  organizer_en TEXT NOT NULL,
  organizer_summary_ar TEXT NOT NULL,
  organizer_summary_en TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL DEFAULT '',
  contact_address_ar TEXT NOT NULL,
  contact_address_en TEXT NOT NULL,
  instagram_url TEXT NOT NULL DEFAULT '',
  facebook_url TEXT NOT NULL DEFAULT '',
  event_logo_url TEXT,
  event_logo_path TEXT,
  capacity INTEGER NOT NULL DEFAULT 150 CHECK (capacity > 0 AND capacity <= 100000),
  is_registration_open BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Public Landing & Success Page Settings (Controlled Singleton)
CREATE TABLE IF NOT EXISTS public.page_settings (
  singleton_key BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton_key = true),
  is_registration_open BOOLEAN NOT NULL DEFAULT true,
  hero_badge_ar TEXT NOT NULL,
  hero_badge_en TEXT NOT NULL,
  hero_title_ar TEXT NOT NULL,
  hero_title_en TEXT NOT NULL,
  hero_subtitle_ar TEXT NOT NULL,
  hero_subtitle_en TEXT NOT NULL,
  cta_button_label_ar TEXT NOT NULL,
  cta_button_label_en TEXT NOT NULL,
  success_title_ar TEXT NOT NULL,
  success_title_en TEXT NOT NULL,
  success_message_ar TEXT NOT NULL,
  success_message_en TEXT NOT NULL,
  show_metrics_bar BOOLEAN NOT NULL DEFAULT true,
  show_about_section BOOLEAN NOT NULL DEFAULT true,
  show_capcut_banner BOOLEAN NOT NULL DEFAULT true,
  show_privacy_note BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Internal Administrator Notes on Registrations
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_notes_registration_id_idx
  ON public.admin_notes (registration_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS admin_notes_admin_id_idx
  ON public.admin_notes (admin_id)
  WHERE admin_id IS NOT NULL;

-- 8. Immutable Administrative Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx
  ON public.audit_logs (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_admin_id_idx
  ON public.audit_logs (admin_id, created_at DESC)
  WHERE admin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON public.audit_logs (created_at DESC);

-- 9. Administrator Topbar Notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  message_ar TEXT NOT NULL,
  message_en TEXT NOT NULL,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_notifications_unread_idx
  ON public.admin_notifications (is_read, created_at DESC);

-- 10. Private Rate-Limiting Buckets for Edge Functions (not exposed in Data API)
CREATE TABLE IF NOT EXISTS private.registration_rate_limits (
  ip_hash TEXT NOT NULL,
  window_bucket TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash, window_bucket)
);
