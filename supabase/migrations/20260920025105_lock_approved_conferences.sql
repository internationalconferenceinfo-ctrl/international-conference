CREATE OR REPLACE FUNCTION public.guard_organizer_conference_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF LOWER(BTRIM(COALESCE(OLD.status, ''))) = 'approved' THEN
    IF
      NEW.id IS DISTINCT FROM OLD.id OR
      NEW.title IS DISTINCT FROM OLD.title OR
      NEW.short_title IS DISTINCT FROM OLD.short_title OR
      NEW.category IS DISTINCT FROM OLD.category OR
      NEW.sub_category IS DISTINCT FROM OLD.sub_category OR
      NEW.slug IS DISTINCT FROM OLD.slug OR
      NEW.country IS DISTINCT FROM OLD.country OR
      NEW.state IS DISTINCT FROM OLD.state OR
      NEW.city IS DISTINCT FROM OLD.city OR
      NEW.location IS DISTINCT FROM OLD.location OR
      NEW.address IS DISTINCT FROM OLD.address OR
      NEW.start_date IS DISTINCT FROM OLD.start_date OR
      NEW.end_date IS DISTINCT FROM OLD.end_date OR
      NEW.deadline IS DISTINCT FROM OLD.deadline OR
      NEW.time_zone IS DISTINCT FROM OLD.time_zone OR
      NEW.description IS DISTINCT FROM OLD.description OR
      NEW.full_description IS DISTINCT FROM OLD.full_description OR
      NEW.status IS DISTINCT FROM OLD.status OR
      NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason OR
      NEW.organizer_id IS DISTINCT FROM OLD.organizer_id OR
      NEW.organizer_email IS DISTINCT FROM OLD.organizer_email OR
      NEW.organizer_name IS DISTINCT FROM OLD.organizer_name OR
      NEW.organizer_phone IS DISTINCT FROM OLD.organizer_phone OR
      NEW.organizer_website IS DISTINCT FROM OLD.organizer_website OR
      NEW.conference_website IS DISTINCT FROM OLD.conference_website OR
      NEW.event_url IS DISTINCT FROM OLD.event_url OR
      NEW.registration_url IS DISTINCT FROM OLD.registration_url OR
      NEW.registration_link IS DISTINCT FROM OLD.registration_link OR
      NEW.banner_image IS DISTINCT FROM OLD.banner_image OR
      NEW.attendance_type IS DISTINCT FROM OLD.attendance_type OR
      NEW.is_online IS DISTINCT FROM OLD.is_online OR
      NEW.history IS DISTINCT FROM OLD.history OR
      NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION
        'Approved conference content is locked and cannot be edited';
    END IF;
  END IF;

  IF auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.organizers o
       WHERE o.id = OLD.organizer_id
         AND o.auth_user_id = auth.uid()
     )
  THEN
    IF NEW.organizer_id IS DISTINCT FROM OLD.organizer_id THEN
      RAISE EXCEPTION
        'Organizer cannot reassign conference ownership';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status NOT IN ('Draft', 'Pending Review')
    THEN
      RAISE EXCEPTION
        'Organizer cannot set an Admin-controlled conference status';
    END IF;

    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
    THEN
      RAISE EXCEPTION
        'Organizer cannot change Admin verification or feature flags';
    END IF;

    IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
       AND NEW.rejection_reason IS NOT NULL
    THEN
      RAISE EXCEPTION
        'Organizer cannot set an Admin rejection reason';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;