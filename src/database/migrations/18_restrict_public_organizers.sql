CREATE OR REPLACE VIEW public.organizers_public
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
WHERE
  COALESCE(is_suspended, false) = false
  AND COALESCE(is_profile_complete, false) = true
  AND COALESCE(is_verified, false) = true;