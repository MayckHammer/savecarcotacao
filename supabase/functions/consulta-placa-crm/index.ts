import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  personal: z.object({
    name: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(255).optional().or(z.literal("")),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    cpf: z.string().trim().max(20).optional().or(z.literal("")),
  }),
  plate: z.string().trim().min(6).max(10),
  vehicleType: z.enum(["carro", "moto", "caminhao"]).optional().default("carro"),
});

const CRM_BASE = "https://api.powercrm.com.br/api";

// ===== Vehicle type → CRM mapping =====
type CrmVehicleType = { id: number | string; name?: string; nm?: string; label?: string; description?: string; ds?: string };
let vehicleTypesCache: CrmVehicleType[] | null = null;

const TYPE_KEYWORDS: Record<string, string[]> = {
  carro: ["carro", "utilitário pequeno", "utilitario pequeno", "automóvel", "automovel", "passeio"],
  moto: ["moto", "motocicleta", "motoneta", "scooter"],
  caminhao: ["caminhão", "caminhao", "micro-ônibus", "micro onibus", "microonibus", "ônibus", "onibus", "truck"],
};

async function loadVehicleTypes(token: string): Promise<CrmVehicleType[]> {
  if (vehicleTypesCache) return vehicleTypesCache;
  try {
    const res = await fetch(`${CRM_BASE}/quotation/vehicleTypes`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    vehicleTypesCache = Array.isArray(data) ? data : (data?.data || []);
    return vehicleTypesCache!;
  } catch (e) {
    console.error("loadVehicleTypes error:", e);
    return [];
  }
}

function resolveVehicleTypeId(types: CrmVehicleType[], userType: string): number | string | null {
  const keywords = TYPE_KEYWORDS[userType] || TYPE_KEYWORDS.carro;
  for (const t of types) {
    const label = ((t.label || t.name || t.nm || t.description || t.ds || "") + "").toLowerCase();
    if (!label) continue;
    if (keywords.some((kw) => label.includes(kw))) return t.id;
  }
  return null;
}

// ===== Helpers =====
const parseFipeValue = (raw: unknown): number => {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

type Vehicle = {
  brand: string;
  model: string;
  year: string;
  color: string;
  fipeCode: string;
  fipeValue: number;
  type: string;
  city?: string;
  brandRaw?: string;  // original from /plates (e.g. "CITROEN C3 AIRC TENDANCE")
  modelRaw?: string;  // original from /plates if available
  crmBrandId?: number | null;
  crmModelId?: number | null;
  crmYearId?: number | null;
};

// ===== CRM brand/model/year resolution =====
type CrmItem = { id: number; nm?: string; name?: string; description?: string; ds?: string; text?: string };
const brandsCache = new Map<string | number, CrmItem[]>(); // key: vehicleTypeId
const modelsCache = new Map<number, CrmItem[]>(); // key: brandId
const yearsCache = new Map<number, CrmItem[]>(); // key: modelId

const labelOf = (it: CrmItem): string =>
  (it.text || it.nm || it.name || it.description || it.ds || "").toString();

const normalize = (s: string): string =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Score how well two strings match: exact > startsWith > all tokens included > token overlap
function matchScore(target: string, candidate: string): number {
  const t = normalize(target);
  const c = normalize(candidate);
  if (!t || !c) return 0;
  if (t === c) return 1000;
  if (c.startsWith(t) || t.startsWith(c)) return 800;
  const tTokens = t.split(" ").filter((x) => x.length > 1);
  const cTokens = c.split(" ").filter((x) => x.length > 1);
  if (tTokens.every((tk) => cTokens.includes(tk))) return 600;
  const overlap = tTokens.filter((tk) => cTokens.includes(tk)).length;
  if (overlap > 0) return 100 + overlap * 50;
  return 0;
}

function pickBestMatch(items: CrmItem[], target: string): CrmItem | null {
  if (!items?.length || !target) return null;
  let best: { item: CrmItem; score: number } | null = null;
  for (const it of items) {
    const s = matchScore(target, labelOf(it));
    if (s > 0 && (!best || s > best.score)) best = { item: it, score: s };
  }
  return best?.item ?? null;
}

async function fetchCrmBrands(token: string, vehicleTypeId: string | number): Promise<CrmItem[]> {
  if (brandsCache.has(vehicleTypeId)) return brandsCache.get(vehicleTypeId)!;
  try {
    const r = await fetch(`${CRM_BASE}/quotation/cb?type=${encodeURIComponent(String(vehicleTypeId))}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!r.ok) return [];
    const data = await r.json();
    const arr: CrmItem[] = Array.isArray(data) ? data : (data?.data || []);
    brandsCache.set(vehicleTypeId, arr);
    return arr;
  } catch (e) { console.error("fetchCrmBrands error:", e); return []; }
}

async function fetchCrmModels(token: string, brandId: number): Promise<CrmItem[]> {
  if (modelsCache.has(brandId)) return modelsCache.get(brandId)!;
  try {
    const r = await fetch(`${CRM_BASE}/quotation/cm?cb=${brandId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!r.ok) return [];
    const data = await r.json();
    const arr: CrmItem[] = Array.isArray(data) ? data : (data?.data || []);
    modelsCache.set(brandId, arr);
    return arr;
  } catch (e) { console.error("fetchCrmModels error:", e); return []; }
}

async function fetchCrmYears(token: string, modelId: number): Promise<CrmItem[]> {
  if (yearsCache.has(modelId)) return yearsCache.get(modelId)!;
  try {
    const r = await fetch(`${CRM_BASE}/quotation/cmy?cm=${modelId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!r.ok) return [];
    const data = await r.json();
    const arr: CrmItem[] = Array.isArray(data) ? data : (data?.data || []);
    yearsCache.set(modelId, arr);
    return arr;
  } catch (e) { console.error("fetchCrmYears error:", e); return []; }
}

export async function resolveCrmIds(
  token: string,
  vehicleTypeId: string | number,
  brand: string,
  model: string,
  year: string,
  rawPlateName?: string,  // e.g. "CITROEN C3 AIRC TENDANCE" — has distinctive tokens
): Promise<{ crmBrandId: number | null; crmModelId: number | null; crmYearId: number | null }> {
  const out = { crmBrandId: null as number | null, crmModelId: null as number | null, crmYearId: null as number | null };
  if (!brand) return out;

  // Brand: try with full name, then with first word (e.g. "SHINERAY XY150-8" → "SHINERAY")
  const brands = await fetchCrmBrands(token, vehicleTypeId);
  let brandMatch = pickBestMatch(brands, brand);
  if (!brandMatch) {
    const firstWord = brand.split(/\s+/)[0];
    if (firstWord && firstWord !== brand) brandMatch = pickBestMatch(brands, firstWord);
  }
  if (!brandMatch) {
    console.log(`CRM brand not found for "${brand}"`);
    return out;
  }
  out.crmBrandId = brandMatch.id;
  console.log(`CRM brand matched: "${brand}" → ${labelOf(brandMatch)} (id=${brandMatch.id})`);

  if (!model && !rawPlateName) return out;
  const models = await fetchCrmModels(token, brandMatch.id);

  // Extract distinctive tokens from raw plate name (e.g. "AIRC", "AIRCROSS", "CROSS")
  // and use them to bias the match. Skip the brand word itself.
  const brandTokens = new Set(normalize(brandMatch.name || brandMatch.nm || "").split(" "));
  const rawTokens = rawPlateName
    ? normalize(rawPlateName).split(" ").filter((t) => t.length >= 3 && !brandTokens.has(t))
    : [];
  // Expand AIRC -> AIRCROSS etc. Common Citroën abbreviation
  const expandedTokens = new Set<string>(rawTokens);
  if (rawTokens.includes("airc")) expandedTokens.add("aircross");

  let bestModel: { item: CrmItem; score: number } | null = null;
  for (const m of models) {
    const label = labelOf(m);
    const baseScore = matchScore(model || rawPlateName || "", label);
    let bonus = 0;
    const labelNorm = normalize(label);
    for (const tok of expandedTokens) {
      if (labelNorm.includes(tok)) bonus += 250;
    }
    const total = baseScore + bonus;
    if (total > 0 && (!bestModel || total > bestModel.score)) bestModel = { item: m, score: total };
  }
  if (!bestModel) {
    console.log(`CRM model not found for "${model}" (raw="${rawPlateName ?? ""}") under brand ${labelOf(brandMatch)}`);
    return out;
  }
  out.crmModelId = bestModel.item.id;
  console.log(`CRM model matched: "${model}" raw="${rawPlateName ?? ""}" → ${labelOf(bestModel.item)} (id=${bestModel.item.id}, score=${bestModel.score})`);

  if (!year) return out;
  const targetYear = String(year).split("/")[0].trim();
  const years = await fetchCrmYears(token, bestModel.item.id);
  // year items typically have label like "2025" or "2025 Gasolina"
  let yearMatch = years.find((y) => normalize(labelOf(y)).startsWith(targetYear));
  if (!yearMatch) yearMatch = years.find((y) => normalize(labelOf(y)).includes(targetYear));
  if (!yearMatch && years.length) yearMatch = years[0]; // fallback to most recent
  if (yearMatch) {
    out.crmYearId = yearMatch.id;
    console.log(`CRM year matched: "${targetYear}" → ${labelOf(yearMatch)} (id=${yearMatch.id})`);
  }
  return out;
}

// Generic extractor — accepts CRM data wrapped in many shapes (object, {body}, {data}, [array])
function extractVehicleFromAny(input: unknown, fallbackType: string): Vehicle | null {
  if (!input) return null;

  // Try common envelope shapes recursively
  const candidates: Record<string, unknown>[] = [];
  const visit = (val: unknown) => {
    if (!val) return;
    if (Array.isArray(val)) {
      for (const item of val) visit(item);
      return;
    }
    if (typeof val !== "object") return;
    candidates.push(val as Record<string, unknown>);
    const obj = val as Record<string, unknown>;
    if (obj.body) visit(obj.body);
    if (obj.data) visit(obj.data);
    if (obj.vehicle) visit(obj.vehicle);
    if (obj.negotiation) visit(obj.negotiation);
  };
  visit(input);

  for (const c of candidates) {
    const brand = (c.brand ?? c.marca ?? c.brandName ?? c.nmMarca ?? "") as string;
    const model = (c.model ?? c.modelo ?? c.modelName ?? c.carModel ?? c.mdl ?? c.nmModelo ?? c.name ?? "") as string;
    const year = (c.year ?? c.ano ?? c.modelYear ?? c.mdlYr ?? c.carModelYear ?? c.fabricationYear ?? "") as string | number;
    const color = (c.color ?? c.cor ?? "") as string;
    const fipeCode = (c.fipeCode ?? c.codFipe ?? c.codeFipe ?? c.codigoFipe ?? c.cdFp ?? "") as string;
    const fipeValue = parseFipeValue(
      c.fipeValue ?? c.vlFipe ?? c.valorFipe ?? c.protectedValue ?? c.value,
    );
    const city = (c.city ?? c.cidade ?? "") as string;

    if ((brand && String(brand).trim()) || (model && String(model).trim()) || (year && String(year).trim())) {
      const brandStr = String(brand || "");
      const modelStr = String(model || "");
      return {
        brand: brandStr,
        model: modelStr,
        year: String(year || ""),
        color: String(color || ""),
        fipeCode: String(fipeCode || ""),
        fipeValue,
        type: fallbackType,
        city: String(city || ""),
        // Preserve raw names for later CRM matching (e.g. "CITROEN C3 AIRC TENDANCE" carries "AIRC"/"AIRCROSS" hint)
        brandRaw: brandStr,
        modelRaw: modelStr,
      };
    }
  }
  return null;
}

async function fetchPlateFromCrm(token: string, plate: string, fallbackType: string): Promise<Vehicle | null> {
  try {
    const r = await fetch(`${CRM_BASE}/quotation/plates/${encodeURIComponent(plate)}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    const text = await r.text();
    console.log(`/plates/${plate} → ${r.status} ${text.substring(0, 400)}`);
    if (!r.ok) return null;
    let data: unknown;
    try { data = JSON.parse(text); } catch { return null; }
    return extractVehicleFromAny(data, fallbackType);
  } catch (e) {
    console.error("fetchPlateFromCrm error:", e);
    return null;
  }
}

// ===== FIPE enrichment via Parallelum API by FIPE code =====
const FIPE_BASE = "https://fipe.parallelum.com.br/api/v2";
const FIPE_TYPE_PATH: Record<string, string> = {
  carro: "cars",
  moto: "motorcycles",
  caminhao: "trucks",
};

const parsePriceBrl = (raw: string): number => {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

async function enrichFromFipeByCode(
  fipeCode: string,
  vehicleType: string,
  plateYear: string,
): Promise<Partial<Vehicle> | null> {
  const token = Deno.env.get("FIPE_ONLINE_TOKEN");
  if (!token || !fipeCode) return null;
  const typePath = FIPE_TYPE_PATH[vehicleType] || "cars";
  const headers = { "X-Subscription-Token": token };

  try {
    const yearsRes = await fetch(`${FIPE_BASE}/${typePath}/${fipeCode}/years`, { headers });
    if (!yearsRes.ok) {
      console.log(`FIPE years lookup failed: ${yearsRes.status}`);
      return null;
    }
    const years = (await yearsRes.json()) as { code: string; name: string }[];
    if (!Array.isArray(years) || years.length === 0) return null;

    // Pick year matching the plate year (e.g. "2025/2025" or "2025"); fallback to first
    const targetYear = (plateYear || "").split("/")[0]?.trim();
    const yearMatch = targetYear
      ? years.find((y) => y.code?.startsWith(`${targetYear}-`)) || years.find((y) => y.code?.startsWith(targetYear))
      : null;
    const yearId = (yearMatch || years[0]).code;

    const detailRes = await fetch(`${FIPE_BASE}/${typePath}/${fipeCode}/years/${yearId}`, { headers });
    if (!detailRes.ok) {
      console.log(`FIPE detail lookup failed: ${detailRes.status}`);
      return null;
    }
    const detail = await detailRes.json() as Record<string, unknown>;
    const fipeValue = parsePriceBrl(String(detail.price ?? ""));
    return {
      brand: String(detail.brand ?? ""),
      model: String(detail.model ?? ""),
      year: String(detail.modelYear ?? yearId),
      fipeCode: String(detail.codeFipe ?? fipeCode),
      fipeValue,
    };
  } catch (e) {
    console.error("enrichFromFipeByCode error:", e);
    return null;
  }
}

async function getQuotation(token: string, code: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${CRM_BASE}/quotation/${code}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getNegotiation(token: string, code: string): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(`${CRM_BASE}/negotiation/${code}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function getQuotationFipe(token: string, code: string): Promise<unknown | null> {
  try {
    const r = await fetch(`${CRM_BASE}/quotation/quotationFipeApi?quotationCode=${code}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const t = await r.text();
    try { return JSON.parse(t); } catch { return null; }
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const raw = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { personal, plate, vehicleType } = parsed.data;
    const token = Deno.env.get("POWERCRM_API_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ error: "POWERCRM_API_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = (personal.phone || "").replace(/\D/g, "");
    const cpfDigits = (personal.cpf || "").replace(/\D/g, "");
    const workVehicle = vehicleType === "caminhao";

    // Resolve vehicleTypeId for later persistence
    const types = await loadVehicleTypes(token);
    const vehicleTypeId = resolveVehicleTypeId(types, vehicleType);
    console.log(`Resolved vehicleType="${vehicleType}" → id=${vehicleTypeId}`);

    // 1. Try to fetch the vehicle by plate FIRST (independent of any quotation)
    let vehicle: Vehicle | null = await fetchPlateFromCrm(token, plate, vehicleType);
    if (vehicle) {
      console.log("Vehicle resolved from /plates endpoint:", JSON.stringify(vehicle));
    }

    // 2. Create quotation in CRM (always, so we get a card to follow up with)
    const crmPayload: Record<string, unknown> = {
      name: personal.name || "",
      phone,
      email: personal.email || "",
      registration: cpfDigits,
      plts: plate || "",
      plates: plate || "",
      workVehicle,
    };
    if (vehicleTypeId != null) {
      // Sent as reinforcement; CRM accepts via the same field name as its UI uses.
      crmPayload.vhclType = vehicleTypeId;
      crmPayload.vehicleType = vehicleTypeId;
    }

    console.log("Creating CRM quotation with payload:", JSON.stringify(crmPayload));
    const crmRes = await fetch(`${CRM_BASE}/quotation/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(crmPayload),
    });
    const crmData = await crmRes.json();
    console.log("CRM quotation response keys:", Object.keys(crmData || {}).slice(0, 20).join(","));

    if (!crmData.quotationCode) {
      return new Response(JSON.stringify({
        error: "Não foi possível criar a cotação no CRM",
        details: crmData.message || crmData.error || "Unknown error",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const quotationCode = crmData.quotationCode;
    const negotiationCode = crmData.negotiationCode || crmData.negotationCode || null;

    // 3. Update with vehicle type explicitly
    if (vehicleTypeId != null) {
      try {
        await fetch(`${CRM_BASE}/quotation/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ code: quotationCode, workVehicle, vhclType: vehicleTypeId, plates: plate, plts: plate }),
        });
      } catch (e) { console.error("update vhclType error:", e); }
    }

    // 4. Add tag 23323 ("30 seg")
    try {
      await fetch(`${CRM_BASE}/quotation/add-tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ quotationCode, tagId: 23323 }),
      });
    } catch (e) { console.error("Error adding tag:", e); }

    // 5. If we don't have vehicle data yet, poll the quotation/negotiation endpoints (data may arrive
    //    after CRM's internal DENATRAN/FIPE lookup completes).
    if (!vehicle) {
      const intervals = [1500, 2000, 2500, 3500, 4500, 6000];
      for (let i = 0; i < intervals.length; i++) {
        await new Promise((r) => setTimeout(r, intervals[i]));
        console.log(`Polling vehicle data attempt ${i + 1}/${intervals.length}`);

        // Re-try the direct plate endpoint each cycle (cheap and authoritative)
        vehicle = await fetchPlateFromCrm(token, plate, vehicleType);
        if (vehicle) break;

        const fipeData = await getQuotationFipe(token, quotationCode);
        vehicle = extractVehicleFromAny(fipeData, vehicleType);
        if (vehicle) break;

        if (negotiationCode) {
          const neg = await getNegotiation(token, negotiationCode);
          vehicle = extractVehicleFromAny(neg, vehicleType);
          if (vehicle) break;
        }

        const qttn = await getQuotation(token, quotationCode);
        vehicle = extractVehicleFromAny(qttn, vehicleType);
        if (vehicle) break;
      }
      if (vehicle) console.log("Vehicle resolved via polling:", JSON.stringify(vehicle));
    }

    // 6. Enrich with FIPE API by code (vehicle.fipeCode) when model/value missing
    if (vehicle && vehicle.fipeCode && (!vehicle.model || !vehicle.fipeValue)) {
      console.log(`Enriching via FIPE API by code: ${vehicle.fipeCode}`);
      const enriched = await enrichFromFipeByCode(vehicle.fipeCode, vehicleType, vehicle.year);
      if (enriched) {
        console.log("FIPE enrichment result:", JSON.stringify(enriched));
        vehicle = {
          ...vehicle,
          brand: enriched.brand || vehicle.brand,
          model: enriched.model || vehicle.model,
          year: enriched.year || vehicle.year,
          fipeCode: enriched.fipeCode || vehicle.fipeCode,
          fipeValue: enriched.fipeValue || vehicle.fipeValue,
        };
      }
    }

    // 7. Resolve internal CRM brand/model/year IDs (so the card and plansQuotation can use them)
    if (vehicle && vehicleTypeId != null && vehicle.brand) {
      try {
        // Use the raw plate name (preserved before FIPE enrichment) for distinctive token matching
        const rawHint = `${vehicle.brandRaw || ""} ${vehicle.modelRaw || ""}`.trim() || undefined;
        const ids = await resolveCrmIds(token, vehicleTypeId, vehicle.brand, vehicle.model, vehicle.year, rawHint);
        vehicle.crmBrandId = ids.crmBrandId;
        vehicle.crmModelId = ids.crmModelId;
        vehicle.crmYearId = ids.crmYearId;

        // 8. Push these IDs + FIPE value into the quotation immediately so the CRM card is populated
        if (ids.crmModelId || ids.crmYearId || vehicle.fipeValue) {
          const updateBody: Record<string, unknown> = { code: quotationCode };
          if (ids.crmModelId) {
            updateBody.mdl = ids.crmModelId;
            updateBody.carModel = ids.crmModelId;
          }
          if (ids.crmYearId) {
            updateBody.mdlYr = ids.crmYearId;
            updateBody.carModelYear = ids.crmYearId;
          }
          if (vehicle.color) updateBody.color = vehicle.color;
          if (vehicle.year) {
            const yr = parseInt(String(vehicle.year).split("/")[0], 10);
            if (yr) updateBody.fabricationYear = yr;
          }
          // Send FIPE value with all known aliases — the card field is `vhclFipeVl`
          if (vehicle.fipeValue) {
            updateBody.protectedValue = vehicle.fipeValue;
            updateBody.vhclFipeVl     = vehicle.fipeValue;
            updateBody.vlFipe         = vehicle.fipeValue;
            updateBody.fipeValue      = vehicle.fipeValue;
          }
          if (vehicle.fipeCode) {
            updateBody.cdFp    = vehicle.fipeCode;
            updateBody.codFipe = vehicle.fipeCode;
          }
          updateBody.plates = plate;
          updateBody.plts = plate;
          if (vehicleTypeId != null) updateBody.vhclType = vehicleTypeId;

          try {
            const upd = await fetch(`${CRM_BASE}/quotation/update`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              body: JSON.stringify(updateBody),
            });
            console.log(`Early CRM update with mdl/mdlYr/FIPE → ${upd.status}`);

            // Verify what actually persisted in the card
            await new Promise((r) => setTimeout(r, 1200));
            const verify = await getQuotation(token, quotationCode);
            if (verify) {
              const v = verify as Record<string, unknown>;
              console.log(`Post-update verify — mdl=${v.mdl} mdlYr=${v.mdlYr} vhclFipeVl=${v.vhclFipeVl} protectedValue=${v.protectedValue}`);
            }
          } catch (e) { console.error("Early CRM update error:", e); }
        }

    return new Response(JSON.stringify({
      quotationCode,
      negotiationCode,
      vehicle,
      vehicleType,
      vehicleTypeId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
