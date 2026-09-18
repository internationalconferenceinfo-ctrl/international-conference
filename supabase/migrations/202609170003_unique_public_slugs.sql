-- Prevent duplicate public URLs caused by duplicate conference or organizer slugs.
-- Comparison is case-insensitive and ignores leading/trailing whitespace.

CREATE UNIQUE INDEX IF NOT EXISTS idx_conferences_slug_unique_normalized
  ON public.conferences (lower(btrim(slug)))
  WHERE slug IS NOT NULL AND btrim(slug) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizers_slug_unique_normalized
  ON public.organizers (lower(btrim(slug)))
  WHERE slug IS NOT NULL AND btrim(slug) <> '';
