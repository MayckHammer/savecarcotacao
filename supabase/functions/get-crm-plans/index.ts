const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchPlansWithRetry(quotationCode: string, token: string, maxAttempts = 3): Promise<{ plans: unknown[]; error?: string }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Fetching plans attempt ${attempt}/${maxAttempts} for ${quotationCode}`);
    
    try {
      const res = await fetch(
        `https://api.powercrm.com.br/api/quotation/plansQuotation?quotationCode=${quotationCode}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
          },
        }
      );

      const text = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        console.error(`Non-JSON response (attempt ${attempt}):`, text.substring(0, 200));
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 3000 * attempt));
          continue;
        }
        return { plans: [], error: "CRM returned invalid response" };
      }

      console.log(`CRM plans response (attempt ${attempt}):`, JSON.stringify(data, null, 2));

      // Check if CRM says no plans available — may be temporary (FIPE not yet processed)
      const dataObj = data as Record<string, unknown>;
      const errors = dataObj?.errors as string[] | undefined;
      if (errors?.length && errors.some((e: string) => e.includes("Nenhum plano"))) {
        if (attempt < maxAttempts) {
          console.log(`No plans yet, retrying in ${3 * attempt}s...`);
          await new Promise(r => setTimeout(r, 3000 * attempt));
          continue;
        }
        return { plans: [], error: "Nenhum plano disponível para esta cotação" };
      }

      if (!res.ok) {
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 3000 * attempt));
          continue;
        }
        return { plans: [], error: `CRM error: ${res.status}` };
      }

      // Normalize plans
      const rawPlans = Array.isArray(data) ? data : ((dataObj?.plans || dataObj?.data || []) as unknown[]);
      const plans = rawPlans.map((p: Record<string, unknown>) => ({
        id: p.id || p.planId || null,
        name: p.name || p.planName || p.nm || "",
        monthlyPrice: p.monthlyPrice || p.monthlyValue || p.vlMnthly || 0,
        annualPrice: p.annualPrice || p.annualValue || p.vlAnnl || 0,
        coverages: p.coverages || p.items || [],
      }));

      return { plans };
    } catch (e) {
      console.error(`Fetch error (attempt ${attempt}):`, e.message);
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 3000 * attempt));
        continue;
      }
      return { plans: [], error: e.message };
    }
  }
  return { plans: [] };
}

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
    const result = await fetchPlansWithRetry(quotationCode, token!, 3);

    // Always return 200 — frontend will use fallback prices if plans is empty
    return new Response(JSON.stringify({ plans: result.plans, warning: result.error || null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error fetching CRM plans:", e);
    return new Response(JSON.stringify({ plans: [], error: e.message }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
