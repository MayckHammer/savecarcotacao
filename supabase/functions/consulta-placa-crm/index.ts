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

// ===== Vehicle type → CRM mapping =====
// IDs and names from CRM's GET /api/quotation/vehicleTypes ("Zapier" schema).
// We cache the full list once per worker boot and resolve by fuzzy name match.
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
    const res = await fetch("https://api.powercrm.com.br/api/quotation/vehicleTypes", {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) {
      console.error("vehicleTypes fetch failed:", res.status);
      return [];
    }
    const data = await res.json();
    vehicleTypesCache = Array.isArray(data) ? data : (data?.data || []);
    console.log("Loaded vehicleTypes:", JSON.stringify(vehicleTypesCache));
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
    if (keywords.some((kw) => label.includes(kw))) {
      return t.id;
    }
  }
  return null;
}

async function setVehicleTypeOnQuotation(
  token: string,
  quotationCode: string,
  userType: string,
): Promise<{ ok: boolean; vehicleTypeId: number | string | null }> {
  const types = await loadVehicleTypes(token);
  const vehicleTypeId = resolveVehicleTypeId(types, userType);
  if (!vehicleTypeId) {
    console.log("Could not resolve vehicleTypeId for", userType, "from", types.length, "types");
    return { ok: false, vehicleTypeId: null };
  }

  const workVehicle = userType === "caminhao";
  // Try multiple field shapes — CRM versions accept different keys
  const payloads = [
    { code: quotationCode, vehicleType: vehicleTypeId, workVehicle },
    { code: quotationCode, vehicleTypeId, workVehicle },
    { code: quotationCode, type: vehicleTypeId, workVehicle },
  ];

  for (const payload of payloads) {
    try {
      const res = await fetch("https://api.powercrm.com.br/api/quotation/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      console.log("setVehicleType payload:", JSON.stringify(payload), "→", res.status, text.substring(0, 200));
      if (res.ok) {
        return { ok: true, vehicleTypeId };
      }
    } catch (e) {
      console.error("setVehicleType attempt error:", e);
    }
  }
  return { ok: false, vehicleTypeId };
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

    // 1. Create minimal quotation in CRM (with workVehicle hint)
    const crmPayload = {
      name: personal.name || "",
      phone,
      email: personal.email || "",
      registration: cpfDigits,
      plts: plate || "",
      workVehicle: vehicleType === "caminhao",
    };

    console.log("Creating CRM quotation with payload:", JSON.stringify(crmPayload));

    const crmRes = await fetch("https://api.powercrm.com.br/api/quotation/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(crmPayload),
    });

    const crmData = await crmRes.json();
    console.log("CRM quotation response:", JSON.stringify(crmData));

    if (!crmData.quotationCode) {
      return new Response(JSON.stringify({
        error: "Não foi possível criar a cotação no CRM",
        details: crmData.message || crmData.error || "Unknown error",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quotationCode = crmData.quotationCode;
    const negotiationCode = crmData.negotiationCode || crmData.negotationCode || null;

    // 2. Set vehicle type on the quotation BEFORE DENATRAN poll — this is what
    //    triggers the CRM to dispatch the correct DENATRAN/FIPE lookup.
    const typeResult = await setVehicleTypeOnQuotation(token, quotationCode, vehicleType);
    console.log("Vehicle type set result:", JSON.stringify(typeResult));

    // 3. Add tag 23323 ("30 seg") — response is plain text
    try {
      const tagRes = await fetch("https://api.powercrm.com.br/api/quotation/add-tag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ quotationCode, tagId: 23323 }),
      });
      const tagText = await tagRes.text();
      console.log("Tag response:", tagText);
    } catch (e) {
      console.error("Error adding tag:", e);
    }

    // NOTE: Inspection is NOT opened here. CRM rejects with 500 because the quotation
    // doesn't have FIPE/address yet. Inspection is opened later in submit-to-crm.

    // Helpers
    const detectType = (brand: string, model: string): string => {
      const modelLower = (model + " " + brand).toLowerCase();
      if (modelLower.match(/moto|honda cg|yamaha|suzuki|kawasaki|dafra|shineray|haojue|bmw gs/)) return "moto";
      if (modelLower.match(/caminh|truck|iveco|scania|volvo fh|man tgx/)) return "caminhao";
      return "carro";
    };

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

    const tryNegotiation = async () => {
      if (!negotiationCode) return null;
      try {
        const negRes = await fetch(
          `https://api.powercrm.com.br/api/negotiation/${negotiationCode}`,
          { headers: { "Authorization": `Bearer ${token}` } }
        );
        if (!negRes.ok) return null;
        const negData = await negRes.json();
        const v = negData?.vehicle || negData?.data?.vehicle || {};
        const brand = v?.brand || v?.brandName || v?.marca || negData?.carModel || "";
        const model = v?.model || v?.modelName || v?.modelo || negData?.carModel || "";
        const year = v?.year || v?.ano || v?.modelYear || negData?.carModelYear || "";
        const color = v?.color || v?.cor || negData?.color || "";
        const fipeCode = v?.fipeCode || v?.cdFp || "";
        const fipeValue = parseFipeValue(v?.fipeValue ?? v?.vlFipe ?? v?.valorFipe ?? negData?.fipeValue ?? negData?.vlFipe);
        const city = v?.city || v?.cidade || "";
        if (brand || model || year) {
          return { brand, model, year: String(year), color, type: detectType(brand, model), city, fipeCode, fipeValue };
        }
        return null;
      } catch (e) {
        console.error("negotiation error:", e);
        return null;
      }
    };

    const tryFipeApi = async () => {
      try {
        const fipeRes = await fetch(
          `https://api.powercrm.com.br/api/quotation/quotationFipeApi?quotationCode=${quotationCode}`,
          { headers: { "Authorization": `Bearer ${token}` } }
        );
        if (!fipeRes.ok) return null;
        const fipeText = await fipeRes.text();
        let fipeData: unknown;
        try { fipeData = JSON.parse(fipeText); } catch { return null; }
        const items = Array.isArray(fipeData)
          ? fipeData
          : (fipeData as Record<string, unknown>)?.data
            ? (Array.isArray((fipeData as Record<string, unknown>).data)
                ? (fipeData as { data: unknown[] }).data
                : [(fipeData as { data: unknown }).data])
            : [fipeData];
        for (const item of items as Record<string, unknown>[]) {
          const brand = (item?.brand || item?.marca || item?.brandName || "") as string;
          const model = (item?.model || item?.modelo || item?.modelName || item?.name || "") as string;
          const year = (item?.year || item?.ano || item?.modelYear || "") as string | number;
          const color = (item?.color || item?.cor || "") as string;
          const fipeCode = (item?.fipeCode || item?.cdFp || item?.code || "") as string;
          const fipeValue = parseFipeValue(item?.fipeValue ?? item?.vlFipe ?? item?.valorFipe ?? item?.value);
          if (brand || model || year) {
            return { brand, model, year: String(year), color, type: detectType(brand, model), city: "", fipeCode, fipeValue };
          }
        }
        return null;
      } catch (e) {
        console.error("quotationFipeApi error:", e);
        return null;
      }
    };

    const tryQuotation = async () => {
      try {
        const qttnRes = await fetch(`https://api.powercrm.com.br/api/quotation/${quotationCode}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (!qttnRes.ok) return null;
        const qttnData = await qttnRes.json();
        const v = qttnData?.vehicle || qttnData?.data?.vehicle || {};
        const brand = v?.brand || v?.brandName || v?.marca || qttnData?.carModel || "";
        const model = v?.model || v?.modelName || v?.modelo || qttnData?.carModel || "";
        const year = v?.year || v?.ano || v?.modelYear || qttnData?.carModelYear || "";
        const color = v?.color || v?.cor || qttnData?.color || "";
        const fipeCode = v?.fipeCode || v?.cdFp || "";
        const fipeValue = parseFipeValue(v?.fipeValue ?? v?.vlFipe ?? v?.valorFipe ?? qttnData?.protectedValue);
        const city = v?.city || v?.cidade || "";
        if (brand || model || year) {
          return { brand, model, year: String(year), color, type: detectType(brand, model), city, fipeCode, fipeValue };
        }
        return null;
      } catch (e) {
        console.error("quotation error:", e);
        return null;
      }
    };

    // Adaptive polling: try every 2s up to 15s total. Returns as soon as we have data.
    let vehicle: Record<string, unknown> | null = null;
    const pollDeadline = Date.now() + 15000;
    let pollAttempt = 0;

    // Initial small wait to let DENATRAN start
    await new Promise((r) => setTimeout(r, 1500));

    while (!vehicle && Date.now() < pollDeadline) {
      pollAttempt++;
      console.log(`Polling vehicle data attempt ${pollAttempt}`);
      vehicle = (await tryNegotiation()) || (await tryFipeApi()) || (await tryQuotation());
      if (vehicle) {
        console.log("Vehicle resolved on attempt", pollAttempt, JSON.stringify(vehicle));
        break;
      }
      if (Date.now() < pollDeadline) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return new Response(JSON.stringify({
      quotationCode,
      negotiationCode,
      vehicle,
      vehicleType,
      vehicleTypeId: typeResult.vehicleTypeId,
      vehicleTypeSet: typeResult.ok,
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
