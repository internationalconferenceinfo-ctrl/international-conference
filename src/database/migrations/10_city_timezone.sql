-- Migration 10: Add IANA timezone support to cities.
-- Safe to run multiple times.

ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS time_zone TEXT;