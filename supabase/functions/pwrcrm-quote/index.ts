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

const PRIMARY_COVERAGE_KEYS = [
  "colisão",
  "roubo",
  "incêndio",
  "fenômenos",
  "rcf",
  "assistência",
];

function parseMoney(s: string): number | null {
  const m = s.replace(/\u00a0/g, " ").match(/([0-9]+(?:\.[0-9]{3})*,[0-9]{2})/);
  if (!m) return null;
  return Number(m[1].replace(/\./g, "").replace(",", "."));
}

function txt(el: Element | null | undefined): string {
  return (el?.textContent || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function parseCellValue(cellValue: Element | null): boolean | string {
  if (!cellValue) return "";
  const img = cellValue.querySelector("img");
  if (img) {
    const alt = (img.getAttribute("alt") || "").toLowerCase();
    if (alt.includes("nao") || alt.includes("não")) return false;
    if (alt.includes("tem")) return true;
  }
  const t = txt(cellValue);
  if (!t) return false;
  return t;
}

function parsePlansFromHtml(html: string, qttnCd: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return { plans: [], coverages: [], client: null };

  const h2 = doc.querySelector("h2");
  const clientName = txt(h2).replace(/^Olá,\s*/i, "") || null;
  const vehicleDescription = txt(doc.querySelector(".corPrimary")) || null;
  const fipeFormatted = txt(doc.querySelector(".corSecondary")) || null;
  const fipeValue = fipeFormatted ? parseMoney(fipeFormatted) : null;

  const firstRow = doc.querySelector(".t-first-row");
  const headerCells = firstRow
    ? Array.from(firstRow.querySelectorAll(".t-row-cell"))
    : [];

  const headers = headerCells.map((cell) => {
    const el = cell as Element;
    const name = txt(el.querySelector(".name_plan")).toUpperCase();
    const priceTxt = txt(el.querySelector(".price_plan"));
    const a = el.querySelector("a.open_modal_contratar");
    return {
      name,
      monthlyPrice: parseMoney(priceTxt),
      planId: a?.getAttribute("planid") || null,
      tppId: a?.getAttribute("tppid") || null,
    };
  });

  const wrappers = Array.from(doc.querySelectorAll(".t-row-content-wrapper")).slice(1);

  const adhesionByCol: (number | null)[] = headers.map(() => null);
  const participationByCol: (string | null)[] = headers.map(() => null);
  const coverages: { label: string; values: (boolean | string)[]; highlight: boolean }[] = [];

  for (const wrap of wrappers) {
    const wrapEl = wrap as Element;
    const label = txt(wrapEl.querySelector(".t-row-desc .t-cell-desc-l"));
    if (!label) continue;
    const cells = Array.from(wrapEl.querySelectorAll(".t-row-values .t-row-cell"));
    const values = cells.map((c) => parseCellValue((c as Element).querySelector(".t-cell-value")));

    const lower = label.toLowerCase();
    if (lower.startsWith("adesão") || lower.startsWith("adesao")) {
      values.forEach((v, i) => { if (typeof v === "string") adhesionByCol[i] = parseMoney(v); });
      continue;
    }
    if (lower.startsWith("cota") || lower.includes("participação") || lower.includes("participacao")) {
      values.forEach((v, i) => { if (typeof v === "string") participationByCol[i] = v; });
      continue;
    }
    coverages.push({
      label,
      values,
      highlight: PRIMARY_COVERAGE_KEYS.some((k) => lower.includes(k)),
    });
  }

  const plans = headers.map((h, i) => ({
    name: h.name,
    monthlyPrice: h.monthlyPrice ?? 0,
    annualPrice: (h.monthlyPrice ?? 0) * 12,
    adhesion: adhesionByCol[i],
    participation: participationByCol[i],
    planId: h.planId,
    tppId: h.tppId,
    acceptUrl: `${PWRCRM_BASE}/compareTables?h=${encodeURIComponent(qttnCd)}&plan=${h.name}`,
  }));

  return {
    plans,
    coverages,
    planNames: headers.map((h) => h.name),
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
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            },
          });
          console.log("scrape", url, "status=", r.status);
          if (!r.ok) continue;
          const html = await r.text();
          console.log("scrape html length", html.length, "has t-first-row=", html.includes("t-first-row"));
          const p = parsePlansFromHtml(html, String(qttnCd));
          console.log("parsed plans=", p.plans.length, "coverages=", p.coverages.length);
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
