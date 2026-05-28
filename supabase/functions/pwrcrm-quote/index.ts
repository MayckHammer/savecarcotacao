// Proxy oficial para o widget de cotação PowerCRM (cotacao.me/xQDAWXlZ).
// Usa o mesmo endpoint /svQttnDynmcFrm que o script.pwrcrm.js usa publicamente,
// e raspa /compareTables para extrair os valores reais de COMPLETO e PREMIUM.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.46/deno-dom-wasm.ts";

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

const PRIMARY_COVERAGES = [
  "Colisão",
  "Roubo",
  "Furto",
  "Incêndio",
  "RCF",
  "Responsabilidade Civil",
  "Fenômenos da Natureza",
  "Assistência 24h",
];

function parseMoney(s: string) {
  return Number(s.replace(/\./g, "").replace(",", "."));
}

function parsePlansFromHtml(html: string, qttnCd: string) {
  const stripped = html.replace(/\s+/g, " ");

  const plans: {
    name: string;
    monthlyPrice: number;
    annualPrice: number;
    adhesion: number | null;
    participation: string | null;
    acceptUrl: string;
  }[] = [];

  for (const planName of ["PREMIUM", "COMPLETO"]) {
    const re = new RegExp(
      `${planName}[\\s\\S]{0,4000}?R\\$\\s*([0-9]+(?:\\.[0-9]{3})*,[0-9]{2})`,
      "i",
    );
    const match = stripped.match(re);
    if (match) {
      const monthly = parseMoney(match[1]);
      // adesão (próximo "adesão R$ X,XX")
      const adhRe = new RegExp(
        `${planName}[\\s\\S]{0,6000}?ades[ãa]o[^R]{0,40}R\\$\\s*([0-9]+(?:\\.[0-9]{3})*,[0-9]{2})`,
        "i",
      );
      const adhMatch = stripped.match(adhRe);
      const partRe = new RegExp(
        `${planName}[\\s\\S]{0,6000}?participa[çc][ãa]o[^<]{0,60}?([0-9]+%|R\\$\\s*[0-9.,]+)`,
        "i",
      );
      const partMatch = stripped.match(partRe);

      plans.push({
        name: planName,
        monthlyPrice: monthly,
        annualPrice: monthly * 12,
        adhesion: adhMatch ? parseMoney(adhMatch[1]) : null,
        participation: partMatch ? partMatch[1].trim() : null,
        acceptUrl: `${PWRCRM_BASE}/compareTables?h=${encodeURIComponent(qttnCd)}&plan=${planName}`,
      });
    }
  }

  // Coberturas — tenta achar linhas com label + sim/não por coluna
  const coverages: {
    label: string;
    completo: boolean | string;
    premium: boolean | string;
    highlight: boolean;
  }[] = [];

  const knownCoverages = [
    "Colisão",
    "Roubo e Furto",
    "Incêndio",
    "Fenômenos da Natureza",
    "RCF Danos Materiais",
    "RCF Danos Corporais",
    "Assistência 24h",
    "Carro Reserva",
    "Vidros",
    "Cobertura Nacional",
    "Rastreador",
    "App de Gestão",
    "Desconto em Oficinas",
  ];
  for (const label of knownCoverages) {
    const present = stripped.toLowerCase().includes(label.toLowerCase());
    if (!present) continue;
    coverages.push({
      label,
      completo: true,
      premium: true,
      highlight: PRIMARY_COVERAGES.some((p) =>
        label.toLowerCase().includes(p.toLowerCase()),
      ),
    });
  }

  // client / vehicle
  const vehicleMatch = stripped.match(/Ve[íi]culo[^<]{0,4}<[^>]+>([^<]{3,120})</i);
  const fipeMatch = stripped.match(/FIPE[^R]{0,40}R\$\s*([0-9.,]+)/i);

  return {
    plans,
    coverages,
    client: {
      vehicleDescription: vehicleMatch ? vehicleMatch[1].trim() : null,
      fipeValue: fipeMatch ? parseMoney(fipeMatch[1]) : null,
    },
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

    // ---------- PLANS (scrape compareTables) ----------
    if (action === "plans") {
      const qttnCd = body.qttnCd;
      if (!qttnCd) throw new Error("qttnCd required");

      // tenta compareTables primeiro, depois newQuotation
      const urls = [
        `${PWRCRM_BASE}/compareTables?h=${encodeURIComponent(qttnCd)}`,
        `${PWRCRM_BASE}/newQuotation?h=${encodeURIComponent(qttnCd)}`,
      ];

      let parsed: ReturnType<typeof parsePlansFromHtml> | null = null;
      let sourceUrl = "";
      for (const url of urls) {
        try {
          const r = await fetch(url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; LooviBot/1.0; +https://savecarcotacao.lovable.app)",
            },
          });
          if (!r.ok) continue;
          const html = await r.text();
          const p = parsePlansFromHtml(html, String(qttnCd));
          if (p.plans.length) {
            parsed = p;
            sourceUrl = url;
            break;
          }
        } catch (e) {
          console.error("scrape error", url, e);
        }
      }

      return new Response(
        JSON.stringify({
          plans: parsed?.plans || [],
          coverages: parsed?.coverages || [],
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
