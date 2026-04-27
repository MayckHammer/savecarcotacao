const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchPlansWithRetry(quotationCode: string, token: string, maxAttempts = 4): Promise<{ plans: unknown[]; error?: string }> {
  const delays = [3000, 5000, 7000, 9000]; // progressive delays in ms (~24s total)
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
          const delay = delays[attempt - 1] || 10000;
          await new Promise(r => setTimeout(r, delay));
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
          const delay = delays[attempt - 1] || 10000;
          console.log(`No plans yet, retrying in ${delay / 1000}s...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        // Final attempt failed — diagnose quotation state
        let diagnostic = "Nenhum plano disponível para esta cotação";
        try {
          const qRes = await fetch(`https://api.powercrm.com.br/api/quotation/${quotationCode}`, {
            headers: { "Authorization": `Bearer ${token}` },
          });
          if (qRes.ok) {
            const qData = await qRes.json() as Record<string, unknown>;
            const pv = Number(qData?.protectedValue ?? 0);
            const fipeVl = Number(qData?.vhclFipeVl ?? 0);
            const hasAddr = !!(qData?.addressZipcode || qData?.addressAddress);
            const hasCity = !!qData?.city;
            const mdl = qData?.mdl;
            const mdlYr = qData?.mdlYr;
            const missing: string[] = [];
            if (pv === 0 && fipeVl === 0) missing.push("valor FIPE");
            if (!hasAddr) missing.push("endereço");
            if (!hasCity) missing.push("cidade");
            if (!mdl) missing.push("modelo");
            if (!mdlYr) missing.push("ano");
            console.log(
              "Quotation diagnostic — protectedValue:", pv,
              "vhclFipeVl:", fipeVl,
              "mdl:", mdl, "mdlYr:", mdlYr,
              "hasAddress:", hasAddr, "hasCity:", hasCity,
            );
            if (missing.length) {
              diagnostic = `Cotação incompleta no CRM (faltando: ${missing.join(", ")})`;
            }
          }
        } catch (diagErr) {
          console.error("Diagnostic fetch error:", diagErr);
        }
        return { plans: [], error: diagnostic };
      }

      if (!res.ok) {
        if (attempt < maxAttempts) {
          const delay = delays[attempt - 1] || 10000;
          await new Promise(r => setTimeout(r, delay));
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
    const body = await req.json().catch(() => ({}));
    const quotationCode = typeof body?.quotationCode === "string" ? body.quotationCode.trim() : "";

    if (!quotationCode || quotationCode.length > 100) {
      return new Response(JSON.stringify({ error: "Valid quotationCode required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = Deno.env.get("POWERCRM_API_TOKEN");
    const result = await fetchPlansWithRetry(quotationCode, token!, 4);

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
