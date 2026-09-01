-- ============================================================================
-- Complete Supabase PostgreSQL Database Schema & RLS Setup
-- Application: Global Conference Hub
-- Instructions: Copy and execute this script in the Supabase SQL Editor
-- (https://supabase.com/dashboard/project/_/sql)
-- ============================================================================

-- Enable required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Helper Function for Automatic updated_at Timestamps
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ----------------------------------------------------------------------------
-- 2. Key-Value Storage Tables (for generic application state synchronization)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_store (
    key TEXT PRIMARY KEY,
    data JSONB,
    payload JSONB,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_state (
    key TEXT PRIMARY KEY,
    data JSONB,
    payload JSONB,
    value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. Core Relational & Application Entity Tables
-- ----------------------------------------------------------------------------

-- Organizers Table
CREATE TABLE IF NOT EXISTS public.organizers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    about_organization TEXT,
    logo TEXT,
    cover_image TEXT,
    country TEXT,
    city TEXT,
    auth_user_id UUID UNIQUE,
    is_verified BOOLEAN DEFAULT false,
    is_suspended BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_profile_complete BOOLEAN DEFAULT false,
    slug TEXT,
    twitter TEXT,
    linkedin TEXT,
    facebook TEXT,
    instagram TEXT,
    youtube TEXT,
    whatsapp TEXT,
    telegram TEXT,
    tiktok TEXT,
    github TEXT,
    pinterest TEXT,
    gallery_images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizer credentials are managed by Supabase Auth. Only the recovery PIN
-- verifier remains here, isolated in a service-role-only table.
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

-- Conferences Table
CREATE TABLE IF NOT EXISTS public.conferences (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    short_title TEXT,
    category TEXT,
    sub_category TEXT,
    slug TEXT,
    country TEXT,
    city TEXT,
    location TEXT,
    address TEXT,
    start_date TEXT,
    end_date TEXT,
    deadline TEXT,
    time_zone TEXT DEFAULT 'GMT',
    description TEXT,
    full_description TEXT,
    status TEXT DEFAULT 'Pending',
    live_status TEXT DEFAULT 'Upcoming',
    rejection_reason TEXT,
    is_deactivated BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    organizer_id TEXT REFERENCES public.organizers(id) ON DELETE CASCADE ON UPDATE CASCADE,
    organizer_email TEXT,
    organizer_name TEXT,
    organizer_phone TEXT,
    organizer_website TEXT,
    conference_website TEXT,
    event_url TEXT,
    registration_url TEXT,
    registration_link TEXT,
    banner_image TEXT,
    views_count INT DEFAULT 0,
    registration_clicks INT DEFAULT 0,
    attendance_type TEXT DEFAULT 'Offline',
    is_online BOOLEAN DEFAULT false,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories / Topics Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Sparkles',
    count INT DEFAULT 0,
    description TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Banners Table
CREATE TABLE IF NOT EXISTS public.banners (
    id TEXT PRIMARY KEY,
    title TEXT,
    image_url TEXT,
    link_url TEXT,
    active BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'Approved',
    place INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Banner Contents Table
CREATE TABLE IF NOT EXISTS public.banner_contents (
    id TEXT PRIMARY KEY,
    banner_id TEXT REFERENCES public.banners(id) ON DELETE SET NULL ON UPDATE CASCADE,
    title TEXT,
    subtitle TEXT,
    content TEXT,
    active BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'Approved',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Feedbacks & Testimonials Table
CREATE TABLE IF NOT EXISTS public.user_feedbacks (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    organization TEXT,
    country TEXT,
    image TEXT,
    text TEXT,
    message TEXT,
    rating INT DEFAULT 5,
    status TEXT DEFAULT 'Pending',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriber Emails Table
CREATE TABLE IF NOT EXISTS public.subscriber_emails (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    email TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contact_inquiries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT DEFAULT 'General inquiry',
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Countries Reference Table
CREATE TABLE IF NOT EXISTS public.countries (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT UNIQUE NOT NULL,
    code TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cities Reference Table
CREATE TABLE IF NOT EXISTS public.cities (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    country TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inactive Countries Filter Table
CREATE TABLE IF NOT EXISTS public.inactive_countries (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inactive Cities Filter Table
CREATE TABLE IF NOT EXISTS public.inactive_cities (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inactive Topics Filter Table
CREATE TABLE IF NOT EXISTS public.inactive_topics (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media Partners Table
CREATE TABLE IF NOT EXISTS public.media_partners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT DEFAULT 'Media Distribution & Outreach Partner',
    type TEXT DEFAULT 'Media Partner',
    description TEXT,
    logo TEXT,
    website TEXT,
    email TEXT,
    status TEXT DEFAULT 'Pending',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Academic & Scientific Associates Table
CREATE TABLE IF NOT EXISTS public.associates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT DEFAULT 'Academic & Scientific Associate',
    category TEXT DEFAULT 'Associates',
    description TEXT,
    logo TEXT,
    website TEXT,
    email TEXT,
    status TEXT DEFAULT 'Pending',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact Info Table
CREATE TABLE IF NOT EXISTS public.contact_info (
    id TEXT PRIMARY KEY DEFAULT 'primary',
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social Links Table
CREATE TABLE IF NOT EXISTS public.social_links (
    id TEXT PRIMARY KEY DEFAULT 'primary',
    facebook TEXT,
    instagram TEXT,
    linkedin TEXT,
    twitter TEXT,
    youtube TEXT,
    whatsapp TEXT,
    telegram TEXT,
    other TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Privacy Policy Table
CREATE TABLE IF NOT EXISTS public.privacy_policy (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Privacy Policy',
    content TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Terms of Service Table
CREATE TABLE IF NOT EXISTS public.terms_of_service (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Terms of Service',
    content TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. Triggers for Automatic updated_at Updates
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS set_app_store_updated_at ON public.app_store;
CREATE TRIGGER set_app_store_updated_at BEFORE UPDATE ON public.app_store FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_app_state_updated_at ON public.app_state;
CREATE TRIGGER set_app_state_updated_at BEFORE UPDATE ON public.app_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_organizers_updated_at ON public.organizers;
CREATE TRIGGER set_organizers_updated_at BEFORE UPDATE ON public.organizers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_conferences_updated_at ON public.conferences;
CREATE TRIGGER set_conferences_updated_at BEFORE UPDATE ON public.conferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_categories_updated_at ON public.categories;
CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_banners_updated_at ON public.banners;
CREATE TRIGGER set_banners_updated_at BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_banner_contents_updated_at ON public.banner_contents;
CREATE TRIGGER set_banner_contents_updated_at BEFORE UPDATE ON public.banner_contents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_user_feedbacks_updated_at ON public.user_feedbacks;
CREATE TRIGGER set_user_feedbacks_updated_at BEFORE UPDATE ON public.user_feedbacks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_subscriber_emails_updated_at ON public.subscriber_emails;
CREATE TRIGGER set_subscriber_emails_updated_at BEFORE UPDATE ON public.subscriber_emails FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_countries_updated_at ON public.countries;
CREATE TRIGGER set_countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_cities_updated_at ON public.cities;
CREATE TRIGGER set_cities_updated_at BEFORE UPDATE ON public.cities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_media_partners_updated_at ON public.media_partners;
CREATE TRIGGER set_media_partners_updated_at BEFORE UPDATE ON public.media_partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_associates_updated_at ON public.associates;
CREATE TRIGGER set_associates_updated_at BEFORE UPDATE ON public.associates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_contact_info_updated_at ON public.contact_info;
CREATE TRIGGER set_contact_info_updated_at BEFORE UPDATE ON public.contact_info FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_social_links_updated_at ON public.social_links;
CREATE TRIGGER set_social_links_updated_at BEFORE UPDATE ON public.social_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5. Performance Indexes
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_conferences_organizer_id ON public.conferences(organizer_id);
CREATE INDEX IF NOT EXISTS idx_conferences_category ON public.conferences(category);
CREATE INDEX IF NOT EXISTS idx_conferences_country ON public.conferences(country);
CREATE INDEX IF NOT EXISTS idx_conferences_city ON public.conferences(city);
CREATE INDEX IF NOT EXISTS idx_conferences_status ON public.conferences(status);
CREATE INDEX IF NOT EXISTS idx_conferences_slug ON public.conferences(slug);
CREATE INDEX IF NOT EXISTS idx_conferences_start_date ON public.conferences(start_date);
CREATE INDEX IF NOT EXISTS idx_conferences_status_start_date ON public.conferences(status, start_date);
CREATE INDEX IF NOT EXISTS idx_conferences_organizer_status ON public.conferences(organizer_id, status);
CREATE INDEX IF NOT EXISTS idx_conferences_live_status_start_date ON public.conferences(live_status, start_date);
CREATE INDEX IF NOT EXISTS idx_organizers_slug ON public.organizers(slug);
CREATE INDEX IF NOT EXISTS idx_organizers_email ON public.organizers(email);
CREATE INDEX IF NOT EXISTS idx_cities_country ON public.cities(country);

CREATE INDEX IF NOT EXISTS idx_cities_country_name
ON public.cities(country, name);

CREATE INDEX IF NOT EXISTS idx_media_partners_status ON public.media_partners(status);
CREATE INDEX IF NOT EXISTS idx_associates_status ON public.associates(status);
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_status ON public.user_feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON public.user_feedbacks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_organizer_created ON public.notifications(organizer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status_created ON public.contact_inquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriber_emails_email ON public.subscriber_emails(email);

-- ----------------------------------------------------------------------------
-- 6. Enable Row Level Security (RLS) & Define Production Access Policies
-- ----------------------------------------------------------------------------

-- Server-only application stores.
ALTER TABLE public.app_store ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow_Public_Full_Access_app_store" ON public.app_store;
REVOKE ALL ON TABLE public.app_store FROM anon, authenticated;

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow_Public_Full_Access_app_state" ON public.app_state;
REVOKE ALL ON TABLE public.app_state FROM anon, authenticated;

-- Organizer authentication uses Supabase Auth. Profiles contain no password
-- material and are public-readable; only their authenticated owner may update.
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow_Public_Full_Access_organizers" ON public.organizers;
CREATE POLICY "Public organizers read" ON public.organizers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Organizer update own profile" ON public.organizers FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

ALTER TABLE public.organizer_auth_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.organizer_auth_secrets FROM anon, authenticated;

ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow_Public_Full_Access_conferences" ON public.conferences;
CREATE POLICY "Public approved conferences read" ON public.conferences FOR SELECT TO anon, authenticated USING (status = 'Approved' AND COALESCE(is_deactivated, false) = false);
CREATE POLICY "Organizer conferences read" ON public.conferences FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = conferences.organizer_id AND o.auth_user_id = auth.uid()));
CREATE POLICY "Organizer conference insert" ON public.conferences FOR INSERT TO authenticated WITH CHECK (status IN ('Draft','Pending Review') AND EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = conferences.organizer_id AND o.auth_user_id = auth.uid() AND NOT o.is_suspended));
CREATE POLICY "Organizer conference update" ON public.conferences FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = conferences.organizer_id AND o.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = conferences.organizer_id AND o.auth_user_id = auth.uid() AND NOT o.is_suspended));
CREATE POLICY "Organizer conference delete" ON public.conferences FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = conferences.organizer_id AND o.auth_user_id = auth.uid()));

-- Public reference/content tables: read-only from browsers; Admin writes use
-- the authenticated server with the Supabase service-role key.
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public categories read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public banners read" ON public.banners FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.banner_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public banner contents read" ON public.banner_contents FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public countries read" ON public.countries FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public cities read" ON public.cities FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.inactive_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public inactive countries read" ON public.inactive_countries FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.inactive_cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public inactive cities read" ON public.inactive_cities FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.inactive_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public inactive topics read" ON public.inactive_topics FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public contact info read" ON public.contact_info FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public social links read" ON public.social_links FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.privacy_policy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read privacy policy" ON public.privacy_policy;
CREATE POLICY "Public can read privacy policy"
ON public.privacy_policy
FOR SELECT
TO anon, authenticated
USING (true);

ALTER TABLE public.terms_of_service ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read terms of service" ON public.terms_of_service;
CREATE POLICY "Public can read terms of service"
ON public.terms_of_service
FOR SELECT
TO anon, authenticated
USING (true);

-- Public submission tables: browser can submit, but cannot edit/delete.
ALTER TABLE public.user_feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public feedback insert" ON public.user_feedbacks FOR INSERT TO anon, authenticated WITH CHECK (status = 'Pending');
CREATE POLICY "Public feedback read approved" ON public.user_feedbacks FOR SELECT TO anon, authenticated USING (status IN ('Approved','Active'));

ALTER TABLE public.subscriber_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public subscriber insert" ON public.subscriber_emails FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public contact inquiry insert" ON public.contact_inquiries FOR INSERT TO anon, authenticated WITH CHECK (status = 'Open');

ALTER TABLE public.media_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public media partner insert" ON public.media_partners FOR INSERT TO anon, authenticated WITH CHECK (status = 'Pending');
CREATE POLICY "Public media partner read approved" ON public.media_partners FOR SELECT TO anon, authenticated USING (status = 'Approved' AND COALESCE(is_deactivated, false) = false);

ALTER TABLE public.associates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public associate insert" ON public.associates FOR INSERT TO anon, authenticated WITH CHECK (status = 'Pending');
CREATE POLICY "Public associate read approved" ON public.associates FOR SELECT TO anon, authenticated USING (status = 'Approved' AND COALESCE(is_deactivated, false) = false);

-- Audit data is server-only.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7. Grant Schema Permissions to Anonymous and Authenticated Roles
-- ----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;


-- Protect Admin-only conference fields from authenticated Organizer writes.
CREATE OR REPLACE FUNCTION public.guard_organizer_conference_update()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organizers o WHERE o.id = OLD.organizer_id AND o.auth_user_id = auth.uid()
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
CREATE TRIGGER trg_guard_organizer_conference_update BEFORE UPDATE ON public.conferences
FOR EACH ROW EXECUTE FUNCTION public.guard_organizer_conference_update();


-- FINAL ORGANIZER AUTH HARDENING (same as migration 08)
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

