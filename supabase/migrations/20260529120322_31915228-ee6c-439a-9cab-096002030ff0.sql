-- Explicitly deny SELECT/UPDATE/DELETE on quotes for client roles.
-- All reads/updates must go through edge functions using service_role.
-- This makes the access model explicit (defense in depth on top of RLS-without-policies).

REVOKE SELECT, UPDATE, DELETE ON public.quotes FROM anon, authenticated;

CREATE POLICY "Deny client SELECT on quotes"
ON public.quotes
AS RESTRICTIVE
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "Deny client UPDATE on quotes"
ON public.quotes
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny client DELETE on quotes"
ON public.quotes
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);