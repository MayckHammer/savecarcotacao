import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  let slug = url.searchParams.get("slug") || "";
  if (!slug && (req.method === "POST")) {
    try {
      const body = await req.json();
      slug = body?.slug || "";
    } catch {
      // ignore
    }
  }
  slug = String(slug).trim().toLowerCase();
  if (!slug || !/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) {
    return new Response(JSON.stringify({ error: "invalid slug" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase
    .from("attendants")
    .select("slug, name, phone, active")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: "db error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!data) {
    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ slug: data.slug, name: data.name, phone: data.phone }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    },
  );
});
