-- Index for faster session_id lookups (used by Inspection, Result, get-inspection-link)
CREATE INDEX IF NOT EXISTS idx_quotes_session_id ON public.quotes(session_id);

-- Index for faster CRM quotation lookups
CREATE INDEX IF NOT EXISTS idx_quotes_crm_quotation_code ON public.quotes(crm_quotation_code);

-- Track last successful CRM sync for debugging
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS last_crm_sync_at TIMESTAMP WITH TIME ZONE;