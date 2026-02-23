const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quotationCode } = await req.json();

    if (!quotationCode) {
      return new Response(JSON.stringify({ error: "quotationCode required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = Deno.env.get("POWERCRM_API_TOKEN");

    const res = await fetch(
      `https://api.powercrm.com.br/api/quotation/plansQuotation?quotationCode=${quotationCode}`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      }
    );

    const data = await res.json();
    console.log("CRM plans response:", JSON.stringify(data, null, 2));

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch CRM plans", details: data }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize plans - the CRM may return different structures
    const rawPlans = Array.isArray(data) ? data : (data?.plans || data?.data || []);

    const plans = rawPlans.map((p: Record<string, unknown>) => ({
      id: p.id || p.planId || null,
      name: p.name || p.planName || p.nm || "",
      monthlyPrice: p.monthlyPrice || p.monthlyValue || p.vlMnthly || 0,
      annualPrice: p.annualPrice || p.annualValue || p.vlAnnl || 0,
      coverages: p.coverages || p.items || [],
    }));

    return new Response(JSON.stringify({ plans }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error fetching CRM plans:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
