import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { logQuoteAudit } from "../_shared/audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  session_id: z.string().trim().min(1).max(100),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      await logQuoteAudit({
        action: "edge_fn_denied",
        functionName: "get-quote-status",
        req,
        details: { reason: "invalid_body" },
      });
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Only return non-sensitive status fields — never PII.
    const { data, error } = await supabase
      .from("quotes")
      .select("crm_quotation_code, inspection_status, inspection_link")
      .eq("session_id", parsed.data.session_id)
      .maybeSingle();

    if (error) {
      await logQuoteAudit({
        action: "edge_fn_error",
        functionName: "get-quote-status",
        req,
        sessionId: parsed.data.session_id,
        details: { error: error.message },
      });
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logQuoteAudit({
      action: "edge_fn_call",
      functionName: "get-quote-status",
      req,
      sessionId: parsed.data.session_id,
      details: { found: !!data, fields: ["crm_quotation_code", "inspection_status", "inspection_link"] },
    });

    return new Response(JSON.stringify(data ?? null), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
