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

ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow_Public_Insert_contact_inquiries" ON public.contact_inquiries;
CREATE POLICY "Allow_Public_Insert_contact_inquiries"
  ON public.contact_inquiries
  FOR INSERT
  WITH CHECK (true);
