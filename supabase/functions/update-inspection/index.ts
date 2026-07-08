import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Auth: require ADMIN_PASSWORD (body) OR WEBHOOK_SECRET (header)
    const expectedAdmin = Deno.env.get("ADMIN_PASSWORD") || "";
    const expectedWebhook = Deno.env.get("WEBHOOK_SECRET") || "";
    const providedPassword = typeof body?.password === "string" ? body.password : "";
    const providedWebhook = req.headers.get("x-webhook-secret") || "";

    const adminOk = expectedAdmin && timingSafeEqual(providedPassword, expectedAdmin);
    const webhookOk = expectedWebhook && timingSafeEqual(providedWebhook, expectedWebhook);

    if (!adminOk && !webhookOk) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session_id = typeof body?.session_id === "string" ? body.session_id.trim() : "";
    const inspection_status = typeof body?.inspection_status === "string" ? body.inspection_status : "";
    const inspection_link = typeof body?.inspection_link === "string" ? body.inspection_link : undefined;

    if (!session_id || !inspection_status) {
      return new Response(
        JSON.stringify({ error: "session_id and inspection_status are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validStatuses = ["pending", "released", "approved", "rejected"];
    if (!validStatuses.includes(inspection_status)) {
      return new Response(
        JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const updateData: Record<string, unknown> = { inspection_status };
    if (inspection_link !== undefined) {
      updateData.inspection_link = inspection_link;
    }

    const { data, error } = await supabase
      .from("quotes")
      .update(updateData)
      .eq("session_id", session_id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, quote: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
