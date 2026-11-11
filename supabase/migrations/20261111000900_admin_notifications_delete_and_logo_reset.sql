-- Migration 0009: Allow active admins to delete notifications & clear stale test logo reference

GRANT DELETE ON TABLE public.admin_notifications TO authenticated;

CREATE POLICY admin_notifications_admin_delete
  ON public.admin_notifications
  FOR DELETE
  TO authenticated
  USING ((SELECT private.is_active_admin()));

UPDATE public.event_settings
SET event_logo_url = NULL,
    event_logo_path = NULL
WHERE singleton_key = true
  AND event_logo_path IS NOT NULL;
