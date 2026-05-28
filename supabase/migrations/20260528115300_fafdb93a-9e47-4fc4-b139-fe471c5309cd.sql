
DROP POLICY IF EXISTS "Anyone can insert quotes" ON public.quotes;

CREATE POLICY "Insert quotes with valid session_id"
ON public.quotes
FOR INSERT
TO anon, authenticated
WITH CHECK (
  session_id IS NOT NULL
  AND length(session_id) BETWEEN 8 AND 100
);
