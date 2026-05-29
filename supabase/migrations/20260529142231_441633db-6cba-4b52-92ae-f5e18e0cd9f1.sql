
-- Audit log table for quotes operations and denied access attempts
CREATE TABLE public.quotes_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID,
  session_id TEXT,
  action TEXT NOT NULL, -- 'insert','update','delete','select_denied','update_denied','delete_denied','edge_fn_call','edge_fn_denied'
  source TEXT NOT NULL, -- 'db_trigger','edge_function','rls'
  function_name TEXT,
  actor_role TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log is service-role only (sensitive). No client access.
GRANT ALL ON public.quotes_audit_log TO service_role;

ALTER TABLE public.quotes_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny client access to audit log"
ON public.quotes_audit_log
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE INDEX idx_quotes_audit_log_quote_id ON public.quotes_audit_log(quote_id);
CREATE INDEX idx_quotes_audit_log_session_id ON public.quotes_audit_log(session_id);
CREATE INDEX idx_quotes_audit_log_action ON public.quotes_audit_log(action);
CREATE INDEX idx_quotes_audit_log_created_at ON public.quotes_audit_log(created_at DESC);

-- Trigger function to audit data changes on quotes
CREATE OR REPLACE FUNCTION public.audit_quotes_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_quote_id UUID;
  v_session_id TEXT;
  v_details JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    v_quote_id := NEW.id;
    v_session_id := NEW.session_id;
    v_details := jsonb_build_object(
      'crm_submitted', NEW.crm_submitted,
      'inspection_status', NEW.inspection_status,
      'vehicle_type', NEW.vehicle_type
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_quote_id := NEW.id;
    v_session_id := NEW.session_id;
    v_details := jsonb_build_object(
      'changed_fields', (
        SELECT jsonb_object_agg(key, jsonb_build_object('old', o.value, 'new', n.value))
        FROM jsonb_each(to_jsonb(OLD)) o
        JOIN jsonb_each(to_jsonb(NEW)) n USING (key)
        WHERE o.value IS DISTINCT FROM n.value
          AND key NOT IN ('updated_at','personal_data','address_data')
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_quote_id := OLD.id;
    v_session_id := OLD.session_id;
    v_details := jsonb_build_object('deleted_status', OLD.inspection_status);
  END IF;

  INSERT INTO public.quotes_audit_log (quote_id, session_id, action, source, actor_role, details)
  VALUES (v_quote_id, v_session_id, v_action, 'db_trigger', current_user, COALESCE(v_details, '{}'::jsonb));

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER quotes_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.audit_quotes_changes();

-- RPC for edge functions to log custom events (denied access, fn calls)
CREATE OR REPLACE FUNCTION public.log_quote_audit(
  p_action TEXT,
  p_function_name TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_quote_id UUID DEFAULT NULL,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.quotes_audit_log
    (quote_id, session_id, action, source, function_name, actor_role, ip_address, user_agent, details)
  VALUES
    (p_quote_id, p_session_id, p_action, 'edge_function', p_function_name, current_user, p_ip, p_user_agent, COALESCE(p_details, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_quote_audit(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_quote_audit(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, JSONB) TO service_role;
