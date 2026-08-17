import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));

    const sessionId = String(body?.sessionId ?? "").trim();
    const phoneDigits = String(body?.phone ?? "").replace(/\D/g, "");
    const consent = Boolean(body?.lgpdConsent);

    if (sessionId.length < 8 || sessionId.length > 100) {
      return json({ error: "sessionId inválido" }, 400);
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      return json({ error: "telefone inválido" }, 400);
    }
    if (!consent) return json({ error: "consentimento LGPD obrigatório" }, 400);

    const clean = (v: unknown, max = 255) =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("partial_leads")
      .upsert(
        {
          session_id: sessionId,
          phone: phoneDigits,
          name: clean(body?.name, 120),
          email: clean(body?.email),
          attendant_slug: clean(body?.attendantSlug, 60),
          vehicle_info: typeof body?.vehicleInfo === "object" && body?.vehicleInfo ? body.vehicleInfo : {},
          lgpd_consent: true,
          converted: Boolean(body?.converted),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id" }
      );

    if (error) return json({ error: error.message }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
