DROP VIEW IF EXISTS public.organizers_public;

CREATE VIEW public.organizers_public
WITH (security_barrier = true)
AS
SELECT
  id,
  name,
  contact_person,
  email,
  phone,
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
'Public organizer profiles including organizer contact details. Internal auth_user_id and suspension state are excluded.';