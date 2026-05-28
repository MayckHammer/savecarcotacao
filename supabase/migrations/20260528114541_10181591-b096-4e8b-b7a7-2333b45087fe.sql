
DROP POLICY IF EXISTS "Anyone can read quotes by session_id" ON public.quotes;
DROP POLICY IF EXISTS "Anyone can update quotes" ON public.quotes;

-- INSERT policy stays (anyone can create their own quote during onboarding)
-- No SELECT/UPDATE policy = no anon access; edge functions use service role.

REVOKE SELECT, UPDATE, DELETE ON public.quotes FROM anon, authenticated;
GRANT INSERT ON public.quotes TO anon, authenticated;
GRANT ALL ON public.quotes TO service_role;
