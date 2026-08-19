-- Preserve organizer password recovery credentials and lockout state.
ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS reset_pin_hash TEXT;

ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS failed_pin_attempts INTEGER DEFAULT 0;

ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS pin_lockout_until BIGINT DEFAULT 0;
