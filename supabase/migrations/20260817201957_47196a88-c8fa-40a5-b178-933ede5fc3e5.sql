CREATE TABLE public.partial_leads (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  name text,
  phone text not null,
  email text,
  vehicle_info jsonb not null default '{}'::jsonb,
  attendant_slug text,
  lgpd_consent boolean not null default false,
  converted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT ALL ON public.partial_leads TO service_role;

ALTER TABLE public.partial_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny client access to partial leads"
ON public.partial_leads AS RESTRICTIVE FOR ALL
TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE TRIGGER update_partial_leads_updated_at
BEFORE UPDATE ON public.partial_leads
FOR EACH ROW EXECUTE FUNCTION public.update_quotes_updated_at();