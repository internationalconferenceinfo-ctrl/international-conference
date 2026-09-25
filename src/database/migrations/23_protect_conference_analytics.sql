-- Prevent authenticated Organizers from directly modifying
-- system-controlled conference analytics counters.

CREATE OR REPLACE FUNCTION public.guard_organizer_conference_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.organizers o
       WHERE o.id = OLD.organizer_id
         AND o.auth_user_id = auth.uid()
     )
  THEN
    NEW.views_count := OLD.views_count;
    NEW.registration_clicks := OLD.registration_clicks;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_organizer_conference_analytics
ON public.conferences;

CREATE TRIGGER trg_guard_organizer_conference_analytics
BEFORE UPDATE ON public.conferences
FOR EACH ROW
EXECUTE FUNCTION public.guard_organizer_conference_analytics();