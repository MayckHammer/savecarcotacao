// Shared audit logger for quotes-related edge functions.
// Writes to public.quotes_audit_log via the service_role-only RPC log_quote_audit.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

let cached: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  return cached;
}

export interface AuditInput {
  action: string; // edge_fn_call | edge_fn_denied | select_denied | etc.
  functionName: string;
  req?: Request;
  sessionId?: string | null;
  quoteId?: string | null;
  details?: Record<string, unknown>;
}

export async function logQuoteAudit(input: AuditInput): Promise<void> {
  try {
    const h = input.req?.headers;
    const ip =
      h?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h?.get("cf-connecting-ip") ||
      h?.get("x-real-ip") ||
      null;
    const ua = h?.get("user-agent") || null;

    await getClient().rpc("log_quote_audit", {
      p_action: input.action,
      p_function_name: input.functionName,
      p_session_id: input.sessionId ?? null,
      p_quote_id: input.quoteId ?? null,
      p_ip: ip,
      p_user_agent: ua,
      p_details: input.details ?? {},
    });
  } catch (e) {
    // Never break the request flow because of audit logging.
    console.error("[audit] failed to log", input.action, e);
  }
}
