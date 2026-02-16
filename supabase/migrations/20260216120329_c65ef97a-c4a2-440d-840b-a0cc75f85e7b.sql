
-- Create quotes table for tracking CRM submissions and inspection status
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  crm_quotation_code TEXT,
  crm_submitted BOOLEAN NOT NULL DEFAULT false,
  crm_error TEXT,
  inspection_status TEXT NOT NULL DEFAULT 'pending',
  inspection_link TEXT,
  personal_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  vehicle_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  address_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  plan_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Public read by session_id
CREATE POLICY "Anyone can read quotes by session_id"
ON public.quotes FOR SELECT
USING (true);

-- Public insert (edge function uses service role, but allow anon insert too)
CREATE POLICY "Anyone can insert quotes"
ON public.quotes FOR INSERT
WITH CHECK (true);

-- Public update by session_id (for admin/inspection updates)
CREATE POLICY "Anyone can update quotes"
ON public.quotes FOR UPDATE
USING (true);

-- Index on session_id for fast lookups
CREATE INDEX idx_quotes_session_id ON public.quotes (session_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_quotes_updated_at();
