-- ============================================================
-- ISSUE 3 SECURITY FIX
-- Protect Organizer/Conference private fields from public reads
-- ============================================================

-- ------------------------------------------------------------
-- 1. Backfill organizer_id for older conference records
--    before organizer email is removed from public reads.
--    Only unique organizer emails are used.
-- ------------------------------------------------------------

UPDATE public.conferences AS c
SET organizer_id = matched.id
FROM (
  SELECT
    LOWER(BTRIM(email)) AS email_key,
    MIN(id) AS id
  FROM public.organizers
  WHERE email IS NOT NULL
    AND BTRIM(email) <> ''
  GROUP BY LOWER(BTRIM(email))
  HAVING COUNT(*) = 1
) AS matched
WHERE
  (c.organizer_id IS NULL OR BTRIM(c.organizer_id) = '')
  AND c.organizer_email IS NOT NULL
  AND BTRIM(c.organizer_email) <> ''
  AND LOWER(BTRIM(c.organizer_email)) = matched.email_key;


-- ------------------------------------------------------------
-- 2. ORGANIZERS
-- ------------------------------------------------------------

ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public organizers read"
  ON public.organizers;

DROP POLICY IF EXISTS "Organizer read own profile"
  ON public.organizers;

DROP POLICY IF EXISTS "Organizer update own profile"
  ON public.organizers;


-- Logged-in Organizer may read only their own PRIVATE profile.
CREATE POLICY "Organizer read own profile"
  ON public.organizers
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());


-- Logged-in Organizer may update only their own profile.
CREATE POLICY "Organizer update own profile"
  ON public.organizers
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());


-- Anonymous visitors must NOT read the private table.
REVOKE SELECT ON TABLE public.organizers FROM anon;

-- Authenticated users need table SELECT permission;
-- RLS above limits them to their own private record.
GRANT SELECT ON TABLE public.organizers TO authenticated;


-- ------------------------------------------------------------
-- 3. Safe public Organizer view
-- ------------------------------------------------------------

DROP VIEW IF EXISTS public.organizers_public;

CREATE VIEW public.organizers_public
WITH (security_barrier = true)
AS
SELECT
  id,
  name,
  website,
  about_organization,
  logo,
  cover_image,
  country,
  city,
  is_verified,
  is_featured,
  is_profile_complete,
  slug,
  twitter,
  linkedin,
  facebook,
  instagram,
  youtube,
  whatsapp,
  telegram,
  tiktok,
  github,
  pinterest,
  gallery_images,
  created_at,
  updated_at
FROM public.organizers
WHERE COALESCE(is_suspended, false) = false;


REVOKE ALL
ON TABLE public.organizers_public
FROM PUBLIC;

GRANT SELECT
ON TABLE public.organizers_public
TO anon, authenticated;


COMMENT ON VIEW public.organizers_public IS
'Safe public Organizer profiles. Excludes email, phone, contact_person, auth_user_id and suspension state.';


-- ------------------------------------------------------------
-- 4. CONFERENCES
-- ------------------------------------------------------------

ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public approved conferences read"
  ON public.conferences;

DROP POLICY IF EXISTS "Authenticated approved conferences read"
  ON public.conferences;

DROP POLICY IF EXISTS "Organizer conferences read"
  ON public.conferences;


-- Authenticated Organizers may see all public Approved conferences.
CREATE POLICY "Authenticated approved conferences read"
  ON public.conferences
  FOR SELECT
  TO authenticated
  USING (
    status = 'Approved'
    AND COALESCE(is_deactivated, false) = false
  );


-- Organizer may additionally read their own conferences,
-- including Draft / Pending / Rejected records.
CREATE POLICY "Organizer conferences read"
  ON public.conferences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organizers o
      WHERE o.id = conferences.organizer_id
        AND o.auth_user_id = auth.uid()
    )
  );


-- Anonymous visitors must NOT read the raw conference table.
REVOKE SELECT ON TABLE public.conferences FROM anon;

GRANT SELECT ON TABLE public.conferences TO authenticated;


-- ------------------------------------------------------------
-- 5. Safe public Conference view
-- ------------------------------------------------------------

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
'Safe public conferences. Excludes organizer_email, organizer_phone, rejection_reason and internal history.';