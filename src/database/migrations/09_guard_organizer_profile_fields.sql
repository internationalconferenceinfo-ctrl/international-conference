-- ============================================================================
-- Organizer Profile Admin-Field Protection
-- Prevent authenticated organizers from modifying Admin-controlled fields.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_organizer_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN

  IF auth.uid() IS NOT NULL
     AND OLD.auth_user_id = auth.uid()
  THEN

    -- Identity/account fields
    NEW.id := OLD.id;
    NEW.auth_user_id := OLD.auth_user_id;
    NEW.email := OLD.email;

    -- Admin-controlled fields
    NEW.is_verified := OLD.is_verified;
    NEW.is_suspended := OLD.is_suspended;
    NEW.is_featured := OLD.is_featured;

    -- Immutable creation timestamp
    NEW.created_at := OLD.created_at;

  END IF;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_guard_organizer_profile_update
ON public.organizers;


CREATE TRIGGER trg_guard_organizer_profile_update
BEFORE UPDATE ON public.organizers
FOR EACH ROW
EXECUTE FUNCTION public.guard_organizer_profile_update();