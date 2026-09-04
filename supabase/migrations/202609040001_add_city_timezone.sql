-- Add IANA timezone support to cities.
-- Safe for existing databases and fresh deployments.

ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS time_zone TEXT;