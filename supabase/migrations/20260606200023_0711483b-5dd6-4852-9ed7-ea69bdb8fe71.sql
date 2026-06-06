
-- Attendants table for personalized WhatsApp routing
CREATE TABLE public.attendants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT attendants_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  CONSTRAINT attendants_phone_digits CHECK (phone ~ '^[0-9]{10,15}$')
);

GRANT ALL ON public.attendants TO service_role;
-- No anon/authenticated grants: access only via edge functions.

ALTER TABLE public.attendants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny client access to attendants"
  ON public.attendants FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE TRIGGER update_attendants_updated_at
  BEFORE UPDATE ON public.attendants
  FOR EACH ROW EXECUTE FUNCTION public.update_quotes_updated_at();

-- Add attendant tracking column on quotes
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS attendant_slug TEXT;

-- Seed first attendant: Josi
INSERT INTO public.attendants (slug, name, phone)
VALUES ('josi', 'Josi', '5534992621339')
ON CONFLICT (slug) DO NOTHING;
