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
    if (keywords.some((kw) => label.includes(kw))) return t.id;
  }
  return null;
}

// Fetch full quotation as JSON (used for verifying which key the CRM accepted)
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

// CRM uses field name "vhclType" (discovered via the CRM UI's <select id="vhclType">).
// We POST to /quotation/update with that key and verify it persisted via GET.
async function setVehicleType(
  token: string,
  code: string,
  vehicleTypeId: number | string,
  workVehicle: boolean,
): Promise<{ ok: boolean }> {
  const payload = { code, workVehicle, vhclType: vehicleTypeId };
  try {
    const res = await fetch(`${CRM_BASE}/quotation/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log(`setVehicleType vhclType=${vehicleTypeId} status=${res.status} resp=${text.substring(0, 300)}`);

    if (!res.ok) return { ok: false };

    const got = await getQuotation(token, code);
    if (got) {
      const target = String(vehicleTypeId);
      const persisted = Object.entries(got).some(([k, v]) => {
        if (v == null || k === "workVehicle") return false;
        return String(v) === target;
      });
      console.log(`vhclType persisted=${persisted}`);
      return { ok: persisted };
    }
    return { ok: true };
  } catch (e) {
    console.error("setVehicleType error:", e);
    return { ok: false };
  }
}

// After vhclType is set, ping quotationFipeApi (the same call the CRM UI's magnifier
// triggers). Returns true on 2xx; failures are non-fatal because polling will catch up.
async function triggerDenatranLookup(token: string, quotationCode: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${CRM_BASE}/quotation/quotationFipeApi?quotationCode=${quotationCode}`,
      { headers: { "Authorization": `Bearer ${token}` } },
    );
    const text = await res.text();
    console.log(`denatran trigger GET quotationFipeApi → ${res.status} ${text.substring(0, 200)}`);
    return res.ok;
  } catch (e) {
    console.error("triggerDenatranLookup error:", e);
    return false;
  }
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

    // Pre-resolve vehicleTypeId so we can include it on /add too
    const types = await loadVehicleTypes(token);
    const vehicleTypeId = resolveVehicleTypeId(types, vehicleType);
    const workVehicle = vehicleType === "caminhao";
    console.log(`Resolved vehicleType="${vehicleType}" → id=${vehicleTypeId}`);

    // 1. Create quotation in CRM — include vhclType on add (key discovered via CRM UI)
    const crmPayload: Record<string, unknown> = {
      name: personal.name || "",
      phone,
      email: personal.email || "",
      registration: cpfDigits,
      plts: plate || "",
      workVehicle,
    };
    if (vehicleTypeId != null) {
      crmPayload.vhclType = vehicleTypeId;
    }

    console.log("Creating CRM quotation with payload:", JSON.stringify(crmPayload));
    const crmRes = await fetch(`${CRM_BASE}/quotation/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(crmPayload),
    });
    const crmData = await crmRes.json();
    console.log("CRM quotation response:", JSON.stringify(crmData));

    if (!crmData.quotationCode) {
      return new Response(JSON.stringify({
        error: "Não foi possível criar a cotação no CRM",
        details: crmData.message || crmData.error || "Unknown error",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const quotationCode = crmData.quotationCode;
    const negotiationCode = crmData.negotiationCode || crmData.negotationCode || null;

    // 2. Reinforce vhclType via /update and verify it persisted
    let typeResult = { ok: false };
    if (vehicleTypeId != null) {
      typeResult = await setVehicleType(token, quotationCode, vehicleTypeId, workVehicle);
    }

    // 3. Add tag 23323 ("30 seg")
    try {
      const tagRes = await fetch(`${CRM_BASE}/quotation/add-tag`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ quotationCode, tagId: 23323 }),
      });
      console.log("Tag response:", await tagRes.text());
    } catch (e) {
      console.error("Error adding tag:", e);
    }

    // 4. Trigger DENATRAN lookup (same call CRM UI's magnifier makes). Non-fatal.
    const denatranOk = await triggerDenatranLookup(token, quotationCode);
    console.log("DENATRAN trigger ok:", denatranOk);

    // ===== Helpers for vehicle data extraction =====
    const detectType = (brand: string, model: string): string => {
      const ml = (model + " " + brand).toLowerCase();
      if (ml.match(/moto|honda cg|yamaha|suzuki|kawasaki|dafra|shineray|haojue|bmw gs/)) return "moto";
      if (ml.match(/caminh|truck|iveco|scania|volvo fh|man tgx/)) return "caminhao";
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
        const r = await fetch(`${CRM_BASE}/negotiation/${negotiationCode}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (!r.ok) return null;
        const d = await r.json();
        const v = d?.vehicle || d?.data?.vehicle || {};
        const brand = v?.brand || v?.brandName || v?.marca || d?.carModel || "";
        const model = v?.model || v?.modelName || v?.modelo || d?.carModel || "";
        const year = v?.year || v?.ano || v?.modelYear || d?.carModelYear || "";
        const color = v?.color || v?.cor || d?.color || "";
        const fipeCode = v?.fipeCode || v?.cdFp || "";
        const fipeValue = parseFipeValue(v?.fipeValue ?? v?.vlFipe ?? v?.valorFipe ?? d?.fipeValue);
        const city = v?.city || v?.cidade || "";
        if (brand || model || year) {
          return { brand, model, year: String(year), color, type: detectType(brand, model), city, fipeCode, fipeValue };
        }
      } catch (e) { console.error("negotiation error:", e); }
      return null;
    };

    const tryFipeApi = async () => {
      try {
        const r = await fetch(`${CRM_BASE}/quotation/quotationFipeApi?quotationCode=${quotationCode}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (!r.ok) return null;
        const t = await r.text();
        let d: unknown; try { d = JSON.parse(t); } catch { return null; }
        const items = Array.isArray(d)
          ? d
          : (d as Record<string, unknown>)?.data
            ? (Array.isArray((d as Record<string, unknown>).data)
                ? (d as { data: unknown[] }).data
                : [(d as { data: unknown }).data])
            : [d];
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
      } catch (e) { console.error("quotationFipeApi error:", e); }
      return null;
    };

    const tryQuotation = async () => {
      try {
        const d = await getQuotation(token, quotationCode);
        if (!d) return null;
        const v = (d?.vehicle as Record<string, unknown>) || (d?.data as Record<string, unknown>)?.vehicle as Record<string, unknown> || {};
        const brand = v?.brand || v?.brandName || v?.marca || d?.carModel || "";
        const model = v?.model || v?.modelName || v?.modelo || d?.carModel || "";
        const year = v?.year || v?.ano || v?.modelYear || d?.carModelYear || "";
        const color = v?.color || v?.cor || d?.color || "";
        const fipeCode = v?.fipeCode || v?.cdFp || "";
        const fipeValue = parseFipeValue(v?.fipeValue ?? v?.vlFipe ?? v?.valorFipe ?? d?.protectedValue);
        const city = v?.city || v?.cidade || "";
        if (brand || model || year) {
          return { brand: String(brand), model: String(model), year: String(year), color: String(color), type: detectType(String(brand), String(model)), city: String(city), fipeCode: String(fipeCode), fipeValue };
        }
      } catch (e) { console.error("quotation error:", e); }
      return null;
    };

    // 5. Adaptive polling — extended to ~25s with backoff
    let vehicle: Record<string, unknown> | null = null;
    const intervals = [1500, 2000, 2500, 3000, 3500, 4000, 7000];
    for (let i = 0; i < intervals.length; i++) {
      await new Promise((r) => setTimeout(r, intervals[i]));
      console.log(`Polling vehicle data attempt ${i + 1}/${intervals.length}`);
      vehicle = (await tryNegotiation()) || (await tryFipeApi()) || (await tryQuotation());
      if (vehicle) {
        console.log("Vehicle resolved on attempt", i + 1, JSON.stringify(vehicle));
        break;
      }
    }

    return new Response(JSON.stringify({
      quotationCode,
      negotiationCode,
      vehicle,
      vehicleType,
      vehicleTypeId,
      vehicleTypeSet: typeResult.ok,
      vehicleTypeKeyUsed: typeResult.keyUsed,
      denatranEndpoint,
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
