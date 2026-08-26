// Proxy oficial para o widget de cotação PowerCRM (cotacao.me/xQDAWXlZ).
// Usa o mesmo endpoint /svQttnDynmcFrm que o script.pwrcrm.js usa publicamente,
// e raspa /compareTables para extrair os valores reais de COMPLETO e PREMIUM.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PWRCRM_BASE = "https://app.powercrm.com.br";
const PWRCRM_UTIL = "https://utilities.powercrm.com.br";

// Hashes oficiais do formulário público cotacao.me/xQDAWXlZ (Save Car Brasil).
const FORM_HASHES = {
  companyHash: "Sav3c4r1Czwe3",
  formCode: "xQDAWXlZ",
  pipelineColumn: "2",
  funnelStage: "3b586660-c63e-4f35-b40c-d8e62260945c",
  leadSource: "23684",
};

interface SubmitPayload {
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  clientCity: string | number; // CRM city id
  vehiclePlate?: string;
  vehicleType: string | number;
  vehicleBranch: string | number;
  vehicleModel: string | number;
  vehicleYear: string | number;
  vehicleIsWork?: boolean;
  observation?: string;
  utmParameters?: Record<string, string>;
  companyUserCode?: string;
  affiliateCode?: string;
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

const PRIMARY_COVERAGE_KEYS = [
  "colisão",
  "roubo",
  "incêndio",
  "fenômenos",
  "rcf",
  "assistência",
];

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&atilde;/g, "ã")
    .replace(/&otilde;/g, "õ").replace(/&ccedil;/g, "ç").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&Aacute;/g, "Á").replace(/&Eacute;/g, "É").replace(/&Atilde;/g, "Ã");
}

function parseMoney(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = String(s).replace(/\u00a0/g, " ").match(/([0-9]+(?:\.[0-9]{3})*,[0-9]{2})/);
  if (!m) return null;
  return Number(m[1].replace(/\./g, "").replace(",", "."));
}

interface ApiGroup {
  originalAccessPrice: number | null;
  forcedAccessPrice: number | null;
  plans: ApiPlan[];
  coverages?: Array<{ id: number; text: string; status: boolean | null }>;
  assistances?: Array<{ id: number; text: string; status: boolean | null }>;
  benefits?: Array<{ id: number; text: string; status: boolean | null }>;
  optionals?: Array<{ id: number; text: string; status: boolean | null }> | null;
}

interface ApiPlan {
  planId: number;
  name: string;
  tppId: number;
  price: string;
  priceValue: number;
  accessPrice: string;
  franchisePrice: string;
  coverages: Array<{ id: number; text: string; status: boolean | null }>;
}

async function fetchPlansData(qttnCd: string) {
  const pageUrl = `${PWRCRM_BASE}/compareTables?h=${encodeURIComponent(qttnCd)}`;
  const pageRes = await fetch(pageUrl, { headers: BROWSER_HEADERS });
  if (!pageRes.ok) throw new Error(`page fetch ${pageRes.status}`);
  const html = await pageRes.text();

  const idMatch = html.match(/\/quotationTablesAndPlans\?i=(\d+)/);
  if (!idMatch) throw new Error("internal quotation id not found in page");
  const internalId = idMatch[1];

  const clientNameMatch = html.match(/<h2[^>]*>\s*([^<]+?)\s*<\/h2>/);
  const clientName = clientNameMatch
    ? decodeEntities(clientNameMatch[1]).replace(/^Olá,\s*/i, "").trim()
    : null;
  const vehicleMatch = html.match(/class="corPrimary"[^>]*>([^<]+)</);
  const vehicleDescription = vehicleMatch ? decodeEntities(vehicleMatch[1]).trim() : null;
  const fipeMatch = html.match(/class="corSecondary"[^>]*>([^<]+)</);
  const fipeFormatted = fipeMatch ? decodeEntities(fipeMatch[1]).trim() : null;
  const fipeValue = parseMoney(fipeFormatted);

  const dataRes = await fetch(
    `${PWRCRM_BASE}/quotationTablesAndPlans?i=${internalId}`,
    { headers: BROWSER_HEADERS },
  );
  if (!dataRes.ok) throw new Error(`data fetch ${dataRes.status}`);
  const groups: ApiGroup[] = await dataRes.json();

  // Flatten: cada plano herda coverages/assistances/benefits do seu grupo
  type FlatPlan = ApiPlan & {
    _coverages: { id: number; text: string; status: boolean | null }[];
  };
  const flat: FlatPlan[] = [];
  for (const g of groups) {
    const groupItems = [
      ...(g.coverages || []),
      ...(g.assistances || []),
      ...(g.benefits || []),
    ];
    for (const p of g.plans || []) {
      flat.push({ ...p, _coverages: groupItems });
    }
  }

  const planNames = flat.map((p) => (p.name || "").toUpperCase());

  const plans = flat.map((p) => {
    const priceValue = Number(p.priceValue) || parseMoney(p.price) || 0;
    return {
      name: (p.name || "").toUpperCase(),
      monthlyPrice: priceValue,
      annualPrice: priceValue * 12,
      adhesion: parseMoney(p.accessPrice),
      participation: p.franchisePrice || null,
      planId: String(p.planId),
      tppId: String(p.tppId),
      acceptUrl: `${PWRCRM_BASE}/compareTables?h=${encodeURIComponent(qttnCd)}&plan=${(p.name || "").toUpperCase()}`,
    };
  });

  const seen = new Set<number>();
  const ordered: { id: number; text: string }[] = [];
  for (const p of flat) {
    for (const c of p._coverages) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        ordered.push({ id: c.id, text: c.text });
      }
    }
  }

  const coverages = ordered.map(({ id, text }) => {
    const values = flat.map((p) => {
      const found = p._coverages.find((c) => c.id === id);
      // status pode vir null — presença no grupo do plano já significa "incluso"
      return !!found && found.status !== false;
    });
    const lower = text.toLowerCase();
    return {
      label: text,
      values,
      highlight: PRIMARY_COVERAGE_KEYS.some((k) => lower.includes(k)),
    };
  });


  return {
    plans,
    coverages,
    planNames,
    client: { name: clientName, vehicleDescription, fipeValue, fipeFormatted },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim();

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing 'action'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- DROPDOWNS ----------
    if (action === "states") {
      const r = await fetchJson(`${PWRCRM_UTIL}/state/stt`);
      return new Response(JSON.stringify({ data: r.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "cities") {
      const st = body.stateId;
      if (!st) throw new Error("stateId required");
      const r = await fetchJson(
        `${PWRCRM_UTIL}/city/ct?${new URLSearchParams({ st: String(st) })}`,
      );
      return new Response(JSON.stringify({ data: r.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "brands") {
      const type = body.vehicleType;
      if (!type) throw new Error("vehicleType required");
      const r = await fetchJson(
        `${PWRCRM_BASE}/cb/?${new URLSearchParams({ type: String(type) })}`,
      );
      const arr = Array.isArray(r.data) ? r.data : [];
      return new Response(
        JSON.stringify({
          data: arr.map((b: any) => ({ id: b.id, text: b.text })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "years") {
      const cb = body.branchId;
      if (!cb) throw new Error("branchId required");
      const r = await fetchJson(
        `${PWRCRM_BASE}/bmy/?${new URLSearchParams({ cb: String(cb) })}`,
      );
      const arr = Array.isArray(r.data) ? r.data : [];
      return new Response(
        JSON.stringify({
          data: arr.map((y: any) => ({ id: y.id, text: y.text })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "models") {
      const cb = body.branchId;
      const cy = body.year;
      if (!cb || !cy) throw new Error("branchId and year required");
      const r = await fetchJson(
        `${PWRCRM_BASE}/cmby/?${new URLSearchParams({
          cb: String(cb),
          cy: String(cy),
        })}`,
      );
      const arr = Array.isArray(r.data) ? r.data : [];
      return new Response(
        JSON.stringify({
          data: arr.map((m: any) => ({ id: m.id, text: m.text })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------- SUBMIT PARCIAL (passo 1) ----------
    // Cria o card no CRM assim que temos nome + telefone, mesmo que o usuário
    // não conclua as etapas 2 e 3. Usa placeholders de veículo/cidade exigidos
    // pelo formulário oficial do PowerCRM.
    if (action === "submit_lead") {
      const p = (body.payload || {}) as Partial<SubmitPayload>;
      const phone = String(p.clientPhone || "").replace(/\D/g, "");
      if (!p.clientName || phone.length < 10) {
        return new Response(JSON.stringify({ error: "Nome e telefone obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const partialBody = {
        ...FORM_HASHES,
        clientName: String(p.clientName),
        clientEmail: p.clientEmail || "",
        clientPhone: phone,
        clientCity: String(p.clientCity || 2389), // Uberlândia/MG (placeholder)
        vehiclePlate: (p.vehiclePlate || "").toUpperCase(),
        vehicleType: String(p.vehicleType || 1),
        vehicleBranch: String(p.vehicleBranch || 27), // Fiat
        vehicleModel: String(p.vehicleModel || 917), // Argo 1.0
        vehicleYear: String(p.vehicleYear || 2020),
        vehicleIsWork: false,
        observation: "",
        companyUserCode: "",
        affiliateCode: "",
        utmParameters: p.utmParameters || {},
      };

      const r = await fetch(`${PWRCRM_BASE}/svQttnDynmcFrm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partialBody),
      });
      const text = await r.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!r.ok || !data?.success) {
        return new Response(
          JSON.stringify({ error: data?.message || "Falha ao criar lead no CRM" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      try {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await sb.rpc("log_quote_audit", {
          p_action: "crm_partial_lead",
          p_function_name: "pwrcrm-quote",
          p_session_id: String(body.sessionId || data.qttnCd || ""),
          p_ip: req.headers.get("x-forwarded-for") || null,
          p_user_agent: req.headers.get("user-agent") || null,
          p_details: {
            attendant_slug: typeof body.attendantSlug === "string" ? body.attendantSlug : null,
            qttnCd: data.qttnCd,
          },
        });
      } catch (e) {
        console.error("audit log failed:", e);
      }

      return new Response(JSON.stringify({ qttnCd: data.qttnCd, ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- SUBMIT ----------
    if (action === "submit") {

      const p = body.payload as SubmitPayload;
      if (
        !p ||
        !p.clientName ||
        !p.clientPhone ||
        !p.vehicleType ||
        !p.vehicleBranch ||
        !p.vehicleModel ||
        !p.vehicleYear ||
        !p.clientCity
      ) {
        return new Response(
          JSON.stringify({ error: "Campos obrigatórios faltando" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const submitBody = {
        ...FORM_HASHES,
        clientName: p.clientName,
        clientEmail: p.clientEmail || "",
        clientPhone: p.clientPhone.replace(/\D/g, ""),
        clientCity: String(p.clientCity),
        vehiclePlate: (p.vehiclePlate || "").toUpperCase(),
        vehicleType: String(p.vehicleType),
        vehicleBranch: String(p.vehicleBranch),
        vehicleModel: String(p.vehicleModel),
        vehicleYear: String(p.vehicleYear),
        vehicleIsWork: Boolean(p.vehicleIsWork),
        observation: p.observation || "",
        companyUserCode: p.companyUserCode || "",
        affiliateCode: p.affiliateCode || "",
        utmParameters: p.utmParameters || {},
      };

      const r = await fetch(`${PWRCRM_BASE}/svQttnDynmcFrm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitBody),
      });
      const text = await r.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!r.ok || !data?.success) {
        return new Response(
          JSON.stringify({
            error: data?.message || "Falha ao enviar cotação ao CRM",
            status: r.status,
            data,
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Audit: log attendant attribution (best-effort)
      const attendantSlug = typeof body.attendantSlug === "string" ? body.attendantSlug : null;
      if (data?.qttnCd) {
        try {
          const sb = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          );
          await sb.rpc("log_quote_audit", {
            p_action: "crm_submit",
            p_function_name: "pwrcrm-quote",
            p_session_id: String(data.qttnCd),
            p_ip: req.headers.get("x-forwarded-for") || null,
            p_user_agent: req.headers.get("user-agent") || null,
            p_details: { attendant_slug: attendantSlug, qttnCd: data.qttnCd },
          });
        } catch (e) {
          console.error("audit log failed:", e);
        }
      }

      return new Response(
        JSON.stringify({
          qttnCd: data.qttnCd,
          isPlan: data.isPlan,
          planPriority: data.planPriority,
          specificTable: data.specificTable,
          redirecTo: data.redirecTo,
          keywordsQuotation: data.keywordsQuotation,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------- PLANS (oficial CRM data) ----------
    if (action === "plans") {
      const qttnCd = body.qttnCd;
      if (!qttnCd) throw new Error("qttnCd required");

      let parsed: Awaited<ReturnType<typeof fetchPlansData>> | null = null;
      let sourceUrl = "";
      try {
        parsed = await fetchPlansData(String(qttnCd));
        sourceUrl = `${PWRCRM_BASE}/compareTables?h=${encodeURIComponent(String(qttnCd))}`;
      } catch (e) {
        console.error("fetchPlansData error", e);
      }

      return new Response(
        JSON.stringify({
          plans: parsed?.plans || [],
          coverages: parsed?.coverages || [],
          planNames: parsed?.planNames || [],
          client: parsed?.client || null,
          sourceUrl,
          fallbackUrl: `${PWRCRM_BASE}/compareTables?h=${encodeURIComponent(String(qttnCd))}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pwrcrm-quote error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
