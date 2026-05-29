
REVOKE EXECUTE ON FUNCTION public.log_quote_audit(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_quote_audit(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_quote_audit(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_quote_audit(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.audit_quotes_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.audit_quotes_changes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_quotes_changes() FROM authenticated;
