DROP POLICY IF EXISTS "Deny client access to attendants" ON public.attendants;
CREATE POLICY "Deny client access to attendants" ON public.attendants AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.attendants FROM anon, authenticated;
GRANT ALL ON public.attendants TO service_role;