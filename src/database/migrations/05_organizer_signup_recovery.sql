-- Allow an authenticated organizer to create the initial account row before
-- completing the public organization profile.
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizer Signup Insert Policy" ON public.organizers;
CREATE POLICY "Organizer Signup Insert Policy"
  ON public.organizers
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid()::text);

-- Recovery lookup must include incomplete organizer accounts as well.
DROP POLICY IF EXISTS "Public Organizers Read Policy" ON public.organizers;
CREATE POLICY "Public Organizers Read Policy"
  ON public.organizers
  FOR SELECT
  USING (true);
