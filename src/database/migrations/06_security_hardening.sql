-- Security hardening for sensitive server-only data and high-volume lookups.
-- Run this migration in Supabase after configuring SUPABASE_SERVICE_ROLE_KEY
-- on the Express server. The service role bypasses RLS; browsers cannot read
-- or overwrite Admin credentials/profile data stored in app_store.

ALTER TABLE public.app_store ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow_Public_Full_Access_app_store" ON public.app_store;
DROP POLICY IF EXISTS "App Store Read Policy" ON public.app_store;
DROP POLICY IF EXISTS "App Store Write Policy" ON public.app_store;
REVOKE ALL ON TABLE public.app_store FROM anon, authenticated;

-- Indexes used by public conference discovery and Organizer/Admin dashboards.
CREATE INDEX IF NOT EXISTS idx_conferences_public_listing
  ON public.conferences (status, is_deactivated, start_date);
CREATE INDEX IF NOT EXISTS idx_conferences_organizer_status
  ON public.conferences (organizer_id, status);
CREATE INDEX IF NOT EXISTS idx_conferences_slug
  ON public.conferences (slug);
CREATE INDEX IF NOT EXISTS idx_conferences_title_lower
  ON public.conferences (lower(title));
CREATE INDEX IF NOT EXISTS idx_organizers_email_lower
  ON public.organizers (lower(email));
CREATE INDEX IF NOT EXISTS idx_feedback_status_created
  ON public.user_feedbacks (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_organizer_created
  ON public.notifications (organizer_id, created_at DESC);
