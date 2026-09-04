-- Migration 11: Add State/Province support to conferences.
-- Safe to run multiple times.

ALTER TABLE public.conferences
ADD COLUMN IF NOT EXISTS state TEXT;