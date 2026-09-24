CREATE OR REPLACE FUNCTION public.prevent_duplicate_organizer_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_new_name text;
  normalized_old_name text;
BEGIN
  normalized_new_name := lower(btrim(COALESCE(NEW.name, '')));

  IF TG_OP = 'UPDATE' THEN
    normalized_old_name := lower(btrim(COALESCE(OLD.name, '')));

    IF normalized_new_name = normalized_old_name THEN
      RETURN NEW;
    END IF;
  END IF;

  IF normalized_new_name = '' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.organizers o
    WHERE o.id <> NEW.id
      AND lower(btrim(COALESCE(o.name, ''))) = normalized_new_name
  ) THEN
    RAISE EXCEPTION
      'This organizer name is already used. Please enter a different organizer name.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_organizer_name
ON public.organizers;

CREATE TRIGGER trg_prevent_duplicate_organizer_name
BEFORE INSERT OR UPDATE OF name
ON public.organizers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_organizer_name();