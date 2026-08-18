import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logQuoteAudit } from "../_shared/audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";
    const expected = Deno.env.get("ADMIN_PASSWORD") || "";

    if (!expected || !timingSafeEqual(password, expected)) {
      await logQuoteAudit({
        action: "edge_fn_denied",
        functionName: "admin-list-quotes",
        req,
        details: { reason: "bad_password", attempted_length: password.length },
      });
      // Return 200 with an explicit flag so the client can show "wrong password"
      // without the SDK surfacing a runtime HTTP error.
      return new Response(JSON.stringify({ authorized: false, error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logQuoteAudit({
      action: "edge_fn_call",
      functionName: "admin-list-quotes",
      req,
      details: { count: data?.length ?? 0 },
    });

    return new Response(JSON.stringify({ quotes: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
