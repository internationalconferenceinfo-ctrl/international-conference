-- Production RLS hardening for tables that do not depend on Organizer auth.
-- IMPORTANT: conferences, organizers and organizer-scoped notifications are
-- intentionally not fully locked down here because the current Organizer auth
-- design is deferred. Complete those policies when Organizer auth is redesigned.

-- Admin-managed reference/content tables: public read, server(service-role) write.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'categories','banners','banner_contents','countries','cities',
    'inactive_countries','inactive_cities','inactive_topics','contact_info','social_links'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow_Public_Full_Access_%s" ON public.%I', t, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Public Categories Read Policy" ON public.categories;
DROP POLICY IF EXISTS "Public categories read" ON public.categories;
CREATE POLICY "Public categories read" ON public.categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Banners Read Policy" ON public.banners;
DROP POLICY IF EXISTS "Banners Insert Policy" ON public.banners;
DROP POLICY IF EXISTS "Banners Update Policy" ON public.banners;
DROP POLICY IF EXISTS "Banners Delete Policy" ON public.banners;
DROP POLICY IF EXISTS "Public banners read" ON public.banners;
CREATE POLICY "Public banners read" ON public.banners FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Banner Contents Read Policy" ON public.banner_contents;
DROP POLICY IF EXISTS "Banner Contents Insert Policy" ON public.banner_contents;
DROP POLICY IF EXISTS "Banner Contents Update Policy" ON public.banner_contents;
DROP POLICY IF EXISTS "Banner Contents Delete Policy" ON public.banner_contents;
DROP POLICY IF EXISTS "Public banner contents read" ON public.banner_contents;
CREATE POLICY "Public banner contents read" ON public.banner_contents FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Countries Read Policy" ON public.countries;
DROP POLICY IF EXISTS "Public countries read" ON public.countries;
CREATE POLICY "Public countries read" ON public.countries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public Cities Read Policy" ON public.cities;
DROP POLICY IF EXISTS "Public cities read" ON public.cities;
CREATE POLICY "Public cities read" ON public.cities FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public inactive countries read" ON public.inactive_countries;
CREATE POLICY "Public inactive countries read" ON public.inactive_countries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public inactive cities read" ON public.inactive_cities;
CREATE POLICY "Public inactive cities read" ON public.inactive_cities FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public inactive topics read" ON public.inactive_topics;
CREATE POLICY "Public inactive topics read" ON public.inactive_topics FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public contact info read" ON public.contact_info;
CREATE POLICY "Public contact info read" ON public.contact_info FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public social links read" ON public.social_links;
CREATE POLICY "Public social links read" ON public.social_links FOR SELECT TO anon, authenticated USING (true);

-- Public submission tables: insert allowed; only approved/active rows are public.
ALTER TABLE public.user_feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow_Public_Full_Access_user_feedbacks" ON public.user_feedbacks;
DROP POLICY IF EXISTS "Public Feedbacks Insert Policy" ON public.user_feedbacks;
DROP POLICY IF EXISTS "Public feedback insert" ON public.user_feedbacks;
CREATE POLICY "Public feedback insert" ON public.user_feedbacks FOR INSERT TO anon, authenticated WITH CHECK (status = 'Pending');
DROP POLICY IF EXISTS "Public feedback read approved" ON public.user_feedbacks;
CREATE POLICY "Public feedback read approved" ON public.user_feedbacks FOR SELECT TO anon, authenticated USING (status IN ('Approved','Active'));

ALTER TABLE public.subscriber_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow_Public_Full_Access_subscriber_emails" ON public.subscriber_emails;
DROP POLICY IF EXISTS "Public Subscribers Insert Policy" ON public.subscriber_emails;
DROP POLICY IF EXISTS "Public subscriber insert" ON public.subscriber_emails;
CREATE POLICY "Public subscriber insert" ON public.subscriber_emails FOR INSERT TO anon, authenticated WITH CHECK (true);

ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow_Public_Insert_contact_inquiries" ON public.contact_inquiries;
DROP POLICY IF EXISTS "Public contact inquiry insert" ON public.contact_inquiries;
CREATE POLICY "Public contact inquiry insert" ON public.contact_inquiries FOR INSERT TO anon, authenticated WITH CHECK (status = 'Open');

ALTER TABLE public.media_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow_Public_Full_Access_media_partners" ON public.media_partners;
DROP POLICY IF EXISTS "Public Media Partners Insert Policy" ON public.media_partners;
DROP POLICY IF EXISTS "Public media partner insert" ON public.media_partners;
CREATE POLICY "Public media partner insert" ON public.media_partners FOR INSERT TO anon, authenticated WITH CHECK (status = 'Pending');
DROP POLICY IF EXISTS "Public media partner read approved" ON public.media_partners;
CREATE POLICY "Public media partner read approved" ON public.media_partners FOR SELECT TO anon, authenticated USING (status = 'Approved');

ALTER TABLE public.associates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow_Public_Full_Access_associates" ON public.associates;
DROP POLICY IF EXISTS "Public Associates Insert Policy" ON public.associates;
DROP POLICY IF EXISTS "Public associate insert" ON public.associates;
CREATE POLICY "Public associate insert" ON public.associates FOR INSERT TO anon, authenticated WITH CHECK (status = 'Pending');
DROP POLICY IF EXISTS "Public associate read approved" ON public.associates;
CREATE POLICY "Public associate read approved" ON public.associates FOR SELECT TO anon, authenticated USING (status = 'Approved');

-- Audit data is server-only.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit Logs Read Policy" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit Logs Insert Policy" ON public.audit_logs;
REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated;

-- Legacy application state is used by the backend only.
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow_Public_Full_Access_app_state" ON public.app_state;
REVOKE ALL ON TABLE public.app_state FROM anon, authenticated;
