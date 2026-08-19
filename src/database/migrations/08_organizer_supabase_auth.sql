-- Migrate Organizer authentication to Supabase Auth.
-- Passwords are owned by auth.users. Recovery PIN secrets are server-only.

ALTER TABLE public.organizers
  ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_organizers_auth_user_id ON public.organizers(auth_user_id);

CREATE TABLE IF NOT EXISTS public.organizer_auth_secrets (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organizer_id TEXT NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  reset_pin_hash TEXT NOT NULL,
  failed_pin_attempts INTEGER NOT NULL DEFAULT 0,
  pin_lockout_until TIMESTAMPTZ,
  reset_token_nonce TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.organizer_auth_secrets ADD COLUMN IF NOT EXISTS organizer_id TEXT REFERENCES public.organizers(id) ON DELETE CASCADE;
ALTER TABLE public.organizer_auth_secrets ADD COLUMN IF NOT EXISTS reset_token_nonce TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizer_auth_secrets_organizer ON public.organizer_auth_secrets(organizer_id);

-- Temporary server-only table used only to migrate accounts created by the old
-- browser-side password-hash implementation. Rows are deleted as accounts move
-- to Supabase Auth.
CREATE TABLE IF NOT EXISTS public.organizer_legacy_auth (
  organizer_id TEXT PRIMARY KEY REFERENCES public.organizers(id) ON DELETE CASCADE,
  password_hash TEXT,
  reset_pin_hash TEXT,
  failed_pin_attempts INTEGER NOT NULL DEFAULT 0,
  pin_lockout_until BIGINT NOT NULL DEFAULT 0,
  reset_token_nonce TEXT,
  migrated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.organizer_legacy_auth ADD COLUMN IF NOT EXISTS reset_token_nonce TEXT;

-- Copy old secrets before removing them from the public profile table. Dynamic
-- SQL keeps this migration idempotent on both older and freshly-created DBs.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='organizers' AND column_name='password_hash'
  ) THEN
    EXECUTE $copy$
      INSERT INTO public.organizer_legacy_auth
        (organizer_id, password_hash, reset_pin_hash, failed_pin_attempts, pin_lockout_until)
      SELECT id,
             password_hash,
             reset_pin_hash,
             COALESCE(failed_pin_attempts, 0),
             COALESCE(pin_lockout_until, 0)
      FROM public.organizers
      WHERE auth_user_id IS NULL
        AND (COALESCE(password_hash, '') <> '' OR COALESCE(reset_pin_hash, '') <> '')
      ON CONFLICT (organizer_id) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        reset_pin_hash = EXCLUDED.reset_pin_hash,
        failed_pin_attempts = EXCLUDED.failed_pin_attempts,
        pin_lockout_until = EXCLUDED.pin_lockout_until
    $copy$;
  END IF;
END $$;

ALTER TABLE public.organizers DROP COLUMN IF EXISTS password_hash;
ALTER TABLE public.organizers DROP COLUMN IF EXISTS reset_pin_hash;
ALTER TABLE public.organizers DROP COLUMN IF EXISTS failed_pin_attempts;
ALTER TABLE public.organizers DROP COLUMN IF EXISTS pin_lockout_until;

-- Secret tables are service-role only.
ALTER TABLE public.organizer_auth_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_legacy_auth ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.organizer_auth_secrets FROM anon, authenticated;
REVOKE ALL ON TABLE public.organizer_legacy_auth FROM anon, authenticated;

-- Organizer profiles are public-readable because they contain only public
-- profile data after this migration. Only the authenticated owner may update.
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow_Public_Full_Access_organizers" ON public.organizers;
DROP POLICY IF EXISTS "Public organizers read" ON public.organizers;
DROP POLICY IF EXISTS "Organizer update own profile" ON public.organizers;
CREATE POLICY "Public organizers read"
  ON public.organizers FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Organizer update own profile"
  ON public.organizers FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Conference ownership follows the Organizer profile -> Supabase Auth mapping.
ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow_Public_Full_Access_conferences" ON public.conferences;
DROP POLICY IF EXISTS "Public approved conferences read" ON public.conferences;
DROP POLICY IF EXISTS "Organizer conferences read" ON public.conferences;
DROP POLICY IF EXISTS "Organizer conference insert" ON public.conferences;
DROP POLICY IF EXISTS "Organizer conference update" ON public.conferences;
DROP POLICY IF EXISTS "Organizer conference delete" ON public.conferences;
CREATE POLICY "Public approved conferences read"
  ON public.conferences FOR SELECT TO anon, authenticated
  USING (status = 'Approved' AND COALESCE(is_deactivated, false) = false);
CREATE POLICY "Organizer conferences read"
  ON public.conferences FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = conferences.organizer_id AND o.auth_user_id = auth.uid()
  ));
CREATE POLICY "Organizer conference insert"
  ON public.conferences FOR INSERT TO authenticated
  WITH CHECK (
    status IN ('Draft', 'Pending Review') AND
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = conferences.organizer_id AND o.auth_user_id = auth.uid() AND NOT o.is_suspended
    )
  );
CREATE POLICY "Organizer conference update"
  ON public.conferences FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = conferences.organizer_id AND o.auth_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = conferences.organizer_id AND o.auth_user_id = auth.uid() AND NOT o.is_suspended
  ));
CREATE POLICY "Organizer conference delete"
  ON public.conferences FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = conferences.organizer_id AND o.auth_user_id = auth.uid()
  ));

-- RLS establishes ownership. This trigger protects Admin-only conference fields
-- while still allowing legitimate Organizer actions such as deactivation,
-- deletion, and resubmitting an Approved/Rejected record for review.
CREATE OR REPLACE FUNCTION public.guard_organizer_conference_update()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = OLD.organizer_id AND o.auth_user_id = auth.uid()
  ) THEN
    IF NEW.organizer_id IS DISTINCT FROM OLD.organizer_id THEN
      RAISE EXCEPTION 'Organizer cannot reassign conference ownership';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('Draft', 'Pending Review') THEN
      RAISE EXCEPTION 'Organizer cannot set an Admin-controlled conference status';
    END IF;
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified OR NEW.is_featured IS DISTINCT FROM OLD.is_featured THEN
      RAISE EXCEPTION 'Organizer cannot change Admin verification or feature flags';
    END IF;
    IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason AND NEW.rejection_reason IS NOT NULL THEN
      RAISE EXCEPTION 'Organizer cannot set an Admin rejection reason';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_guard_organizer_conference_update ON public.conferences;
CREATE TRIGGER trg_guard_organizer_conference_update
BEFORE UPDATE ON public.conferences
FOR EACH ROW EXECUTE FUNCTION public.guard_organizer_conference_update();

-- Organizer notifications are private. Organizers can read/update their own
-- notifications and may create their own/admin workflow notifications.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow_Public_Full_Access_notifications" ON public.notifications;
DROP POLICY IF EXISTS "Organizer notifications read" ON public.notifications;
DROP POLICY IF EXISTS "Organizer notifications insert" ON public.notifications;
DROP POLICY IF EXISTS "Organizer notifications update" ON public.notifications;
CREATE POLICY "Organizer notifications read"
  ON public.notifications FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = notifications.organizer_id AND o.auth_user_id = auth.uid()
  ));
CREATE POLICY "Organizer notifications insert"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    organizer_id = 'ADMIN' OR EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = notifications.organizer_id AND o.auth_user_id = auth.uid()
    )
  );
CREATE POLICY "Organizer notifications update"
  ON public.notifications FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = notifications.organizer_id AND o.auth_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = notifications.organizer_id AND o.auth_user_id = auth.uid()
  ));
