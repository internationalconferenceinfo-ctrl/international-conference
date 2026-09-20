-- Public submissions must go through the rate-limited backend endpoints.
-- Prevent direct anonymous Supabase inserts from bypassing server protections.

REVOKE INSERT ON TABLE public.user_feedbacks FROM anon;
REVOKE INSERT ON TABLE public.subscriber_emails FROM anon;
REVOKE INSERT ON TABLE public.media_partners FROM anon;
REVOKE INSERT ON TABLE public.associates FROM anon;

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT
      schemaname,
      tablename,
      policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'user_feedbacks',
        'subscriber_emails',
        'media_partners',
        'associates'
      )
      AND cmd = 'INSERT'
      AND 'anon' = ANY(roles)
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      p.policyname,
      p.schemaname,
      p.tablename
    );
  END LOOP;
END;
$$;