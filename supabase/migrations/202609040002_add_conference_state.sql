-- Add State/Province support to conferences.
-- Safe for existing and future databases.

ALTER TABLE public.conferences
ADD COLUMN IF NOT EXISTS state TEXT;