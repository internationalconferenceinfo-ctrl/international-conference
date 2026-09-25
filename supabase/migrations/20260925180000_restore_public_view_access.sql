-- Restore public access through safe views while keeping
-- the underlying conferences and organizers tables private.

ALTER VIEW public.conferences_public
SET (security_invoker = false);

ALTER VIEW public.organizers_public
SET (security_invoker = false);

GRANT SELECT ON public.conferences_public
TO anon, authenticated;

GRANT SELECT ON public.organizers_public
TO anon, authenticated;