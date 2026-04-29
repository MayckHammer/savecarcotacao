const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UF_MAP: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul",
  MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco",
  PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul",
  SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo", TO: "Tocantins",
};

const normalizeText = (s: string): string =>
  String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

let statesListCache: { nm: string; id: number }[] | null = null;
const stateCityCache = new Map<string, number>();

async function resolveCityCode(stateRaw: string, cityRaw: string): Promise<number | null> {
  if (!stateRaw || !cityRaw) return null;
  const stateName = UF_MAP[String(stateRaw).trim().toUpperCase()] || stateRaw;
  const cacheKey = `${normalizeText(stateName)}|${normalizeText(cityRaw)}`;
  if (stateCityCache.has(cacheKey)) return stateCityCache.get(cacheKey)!;
  try {
    if (!statesListCache) {
      const statesRes = await fetch("https://utilities.powercrm.com.br/state/stt");
      if (!statesRes.ok) return null;
      statesListCache = await statesRes.json();
    }
    const found = statesListCache!.find((s) => normalizeText(s.nm) === normalizeText(stateName));
    if (!found) return null;
    const citiesRes = await fetch(`https://utilities.powercrm.com.br/city/ct?st=${found.id}`);
    if (!citiesRes.ok) return null;
    const cities = await citiesRes.json() as { nm: string; id: number }[];
    const city = cities.find((c) => normalizeText(c.nm) === normalizeText(cityRaw));
    if (!city) return null;
    stateCityCache.set(cacheKey, city.id);
    return city.id;
  } catch (e) {
    console.error("resolveCityCode error:", e);
    return null;
  }
}

type PlanContext = {
  vehicle?: Record<string, unknown>;
  address?: Record<string, unknown>;
};

function findFirstArray(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (!input || typeof input !== "object") return [];
  const obj = input as Record<string, unknown>;
  for (const key of ["plans", "data", "body", "items", "content", "result"]) {
    const found = findFirstArray(obj[key]);
    if (found.length) return found;
  }
  return [];
}

function normalizePlans(data: unknown) {
  return findFirstArray(data).map((raw) => {
    const p = raw as Record<string, unknown>;
    const monthlyPrice = Number(p.monthlyPrice || p.monthlyValue || p.vlMnthly || p.value || p.price || p.total || 0);
    return {
      id: p.id || p.planId || p.tppId || null,
      name: p.name || p.planName || p.nm || p.description || p.ds || "",
      monthlyPrice,
      annualPrice: Number(p.annualPrice || p.annualValue || p.vlAnnl || 0) || monthlyPrice * 12,
      coverages: p.coverages || p.items || p.optionals || [],
    };
  }).filter((p) => p.name || p.monthlyPrice > 0);
}

async function fetchQuotationWithRetry(quotationCode: string, token: string, attempts = 4): Promise<Record<string, unknown> | null> {
  const delays = [1200, 2000, 3000, 4500];
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const qRes = await fetch(`https://api.powercrm.com.br/api/quotation/${quotationCode}`, {
        headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
      });
      const text = await qRes.text();
      console.log(`Quotation check attempt ${attempt}/${attempts} → ${qRes.status} ${text.substring(0, 250)}`);
      if (qRes.ok) {
        try { return JSON.parse(text) as Record<string, unknown>; } catch { return null; }
      }
    } catch (e) {
      console.error(`Quotation check error attempt ${attempt}:`, e);
    }
    if (attempt < attempts) await new Promise((r) => setTimeout(r, delays[attempt - 1] || 3000));
  }
  return null;
}

async function fetchPlansByModelRequest(quotationCode: string, token: string, context: PlanContext = {}): Promise<{ plans: unknown[]; error?: string }> {
  try {
    const qData = await fetchQuotationWithRetry(quotationCode, token);
    const nested = (qData?.data || {}) as Record<string, unknown>;
    const vehicle = context.vehicle || {};
    const address = context.address || {};

    const carModelId = Number(qData?.mdl ?? qData?.carModel ?? nested?.mdl ?? vehicle.crmModelId ?? 0);
    const carModelYearId = Number(qData?.mdlYr ?? qData?.carModelYear ?? nested?.mdlYr ?? vehicle.crmYearId ?? 0);
    let cityId = Number(qData?.city ?? nested?.city ?? 0);
    if (!cityId && address.state && address.city) {
      cityId = Number(await resolveCityCode(String(address.state), String(address.city)) || 0);
    }
    const workVehicle = Boolean(qData?.workVehicle ?? nested?.workVehicle ?? (vehicle.type === "caminhao" || vehicle.usage === "aplicativo"));
    const fipe = Number(qData?.protectedValue ?? qData?.vhclFipeVl ?? nested?.protectedValue ?? nested?.vhclFipeVl ?? vehicle.fipeValue ?? 0);
    const missing: string[] = [];
    if (!carModelId) missing.push("modelo");
    if (!carModelYearId) missing.push("ano");
    if (!cityId) missing.push("cidade");

    // AUTO-CURA: se a cotação está sem cidade no CRM mas temos cityId resolvido localmente,
    // empurra um /quotation/update + endereço completo para o CRM persistir e tenta de novo
    // o plansQuotation V2 antes de cair no fallback /api/plans (que é menos confiável).
    if (missing.includes("cidade") && cityId && address?.state && address?.city) {
      try {
        const reinforceBody: Record<string, unknown> = {
          code: quotationCode,
          city: cityId,
          addressState: address.state,
          addressCity: address.city,
        };
        if (address.cep) reinforceBody.addressZipcode = String(address.cep).replace(/\D/g, "");
        if (address.street) reinforceBody.addressAddress = address.street;
        if (address.number) reinforceBody.addressNumber = address.number;
        if (address.neighborhood) reinforceBody.addressNeighborhood = address.neighborhood;
        if (address.complement) reinforceBody.addressComplement = address.complement;
        const rf = await fetch("https://api.powercrm.com.br/api/quotation/update", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify(reinforceBody),
        });
        console.log(`get-crm-plans auto-cura cidade /quotation/update → ${rf.status}`);
        // Aguarda um pouco e tenta o V2 novamente antes do fallback
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const v2 = await fetch(
            `https://api.powercrm.com.br/api/quotation/plansQuotation?quotationCode=${quotationCode}`,
            { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
          );
          const v2Text = await v2.text();
          console.log(`Auto-cura plansQuotation V2 → ${v2.status} ${v2Text.substring(0, 200)}`);
          if (v2.ok) {
            try {
              const v2Data = JSON.parse(v2Text);
              const v2Plans = normalizePlans(v2Data);
              if (v2Plans.length) return { plans: v2Plans };
            } catch { /* ignore */ }
          }
        } catch (e) { console.error("Auto-cura V2 retry error:", e); }
        // Considera cidade resolvida — segue para o fallback /api/plans.
        const idx = missing.indexOf("cidade");
        if (idx >= 0) missing.splice(idx, 1);
      } catch (e) {
        console.error("Auto-cura cidade falhou:", e);
      }
    }

    if (missing.length) return { plans: [], error: `Cotação incompleta no CRM (faltando: ${missing.join(", ")})` };

    console.log("Fallback /api/plans request:", JSON.stringify({ carModelId, carModelYearId, cityId, workVehicle, fipe }));
      const plansRes = await fetch("https://api.powercrm.com.br/api/plans/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ carModelId, carModelYearId, cityId, quotationWorkVehicle: workVehicle, protectedValue: fipe, token }),
    });
    const text = await plansRes.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }
    console.log("Fallback /api/plans response:", plansRes.status, JSON.stringify(data).substring(0, 1000));
    const plans = normalizePlans(data);
    return { plans, error: plans.length ? undefined : "Nenhum plano real retornado pelo CRM" };
  } catch (e) {
    console.error("Fallback /api/plans error:", e);
    return { plans: [], error: e.message };
  }
}

async function fetchPlansWithRetry(quotationCode: string, token: string, maxAttempts = 3, context: PlanContext = {}): Promise<{ plans: unknown[]; error?: string }> {
  // Reduced from 4→3 attempts (delays 2s/4s/6s = ~12s) — consulta-placa-crm now pre-warms the V2 endpoint.
  const delays = [2000, 4000, 6000];
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
          const delay = delays[attempt - 1] || 6000;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        return { plans: [], error: "CRM returned invalid response" };
      }

      console.log(`CRM plans response (attempt ${attempt}) status=${res.status}:`, JSON.stringify(data).substring(0, 500));

      // 404 = "Cotação não encontrada" — pode ser temporário (CRM ainda persistindo).
      // Tratamos igual a "Nenhum plano": retry com backoff, fallback no fim.
      if (res.status === 404) {
        if (attempt < maxAttempts) {
          const delay = delays[attempt - 1] || 6000;
          console.log(`Quotation not found yet (404), retrying in ${delay / 1000}s...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        const fallback = await fetchPlansByModelRequest(quotationCode, token, context);
        if (fallback.plans.length) return fallback;
        return { plans: [], error: fallback.error || "Cotação não encontrada no CRM (V2 retornou 404)" };
      }

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
        const fallback = await fetchPlansByModelRequest(quotationCode, token, context);
        if (fallback.plans.length) return fallback;
        // Final attempt failed — diagnose quotation state
        let diagnostic = fallback.error || "Nenhum plano disponível para esta cotação";
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
      const plans = normalizePlans(data);

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
    if (!token) {
      return new Response(JSON.stringify({ plans: [], error: "POWERCRM_API_TOKEN not configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = await fetchPlansWithRetry(quotationCode, token, 3, { vehicle: body?.vehicle, address: body?.address });

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
