-- Index the highest-traffic public and portal query paths.
CREATE INDEX IF NOT EXISTS idx_conferences_status_start_date
  ON public.conferences(status, start_date);

CREATE INDEX IF NOT EXISTS idx_conferences_organizer_status
  ON public.conferences(organizer_id, status);

CREATE INDEX IF NOT EXISTS idx_conferences_live_status_start_date
  ON public.conferences(live_status, start_date);

CREATE INDEX IF NOT EXISTS idx_feedback_status_created
  ON public.user_feedbacks(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_organizer_created
  ON public.notifications(organizer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status_created
  ON public.contact_inquiries(status, created_at DESC);
