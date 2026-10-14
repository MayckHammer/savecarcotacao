CREATE TABLE public.lead_sheet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_lead date NOT NULL DEFAULT CURRENT_DATE,
  nome text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  canal text NOT NULL DEFAULT 'Site',
  campanha text NOT NULL DEFAULT '',
  tipo_veiculo text NOT NULL DEFAULT '',
  modelo_ano text NOT NULL DEFAULT '',
  consultora text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Novo',
  observacoes text NOT NULL DEFAULT '',
  origem_ref text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.lead_sheet TO service_role;
ALTER TABLE public.lead_sheet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny client access to lead sheet" ON public.lead_sheet AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER update_lead_sheet_updated_at BEFORE UPDATE ON public.lead_sheet FOR EACH ROW EXECUTE FUNCTION public.update_quotes_updated_at();