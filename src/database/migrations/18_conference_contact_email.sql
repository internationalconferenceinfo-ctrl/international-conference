BEGIN;

ALTER TABLE public.conferences
ADD COLUMN IF NOT EXISTS contact_email TEXT;

UPDATE public.conferences AS c
SET contact_email = c.organizer_email
WHERE
  (c.contact_email IS NULL OR BTRIM(c.contact_email) = '')
  AND c.organizer_email IS NOT NULL
  AND BTRIM(c.organizer_email) <> ''
  AND c.organizer_id IS NOT NULL
  AND BTRIM(c.organizer_id) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.organizers AS o
    WHERE o.id = c.organizer_id
      AND o.email IS NOT NULL
      AND BTRIM(o.email) <> ''
      AND LOWER(BTRIM(o.email)) = LOWER(BTRIM(c.organizer_email))
  );

DROP VIEW IF EXISTS public.conferences_public;

CREATE VIEW public.conferences_public
WITH (security_barrier = true)
AS
SELECT
  id,
  title,
  short_title,
  category,
  sub_category,
  slug,
  country,
  state,
  city,
  location,
  address,
  start_date,
  end_date,
  deadline,
  time_zone,
  description,
  full_description,
  status,
  live_status,
  is_deactivated,
  is_featured,
  is_verified,
  organizer_id,
  organizer_name,
  contact_email,
  organizer_website,
  conference_website,
  event_url,
  registration_url,
  registration_link,
  banner_image,
  views_count,
  registration_clicks,
  attendance_type,
  is_online,
  created_at,
  updated_at
FROM public.conferences
WHERE
  status = 'Approved'
  AND COALESCE(is_deactivated, false) = false;

REVOKE ALL
ON TABLE public.conferences_public
FROM PUBLIC;

GRANT SELECT
ON TABLE public.conferences_public
TO anon, authenticated;

COMMENT ON VIEW public.conferences_public IS
'Safe public conferences. Exposes conference contact_email; excludes organizer_email, organizer_phone, rejection_reason and internal history.';

COMMIT;