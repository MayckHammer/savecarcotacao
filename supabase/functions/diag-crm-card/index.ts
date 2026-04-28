const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const code = url.searchParams.get("quotationCode") || "";
  const token = Deno.env.get("POWERCRM_API_TOKEN")!;

  const results: Record<string, unknown> = {};

  // 1. GET quotation
  const r1 = await fetch(`https://api.powercrm.com.br/api/quotation/${code}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const t1 = await r1.text();
  results.getQuotation = { status: r1.status, body: safeParse(t1) };

  // 2. plansQuotation
  const r2 = await fetch(`https://api.powercrm.com.br/api/quotation/plansQuotation?quotationCode=${code}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const t2 = await r2.text();
  results.plansQuotation = { status: r2.status, body: safeParse(t2) };

  // 3. quotationFipeApi
  const r3 = await fetch(`https://api.powercrm.com.br/api/quotation/quotationFipeApi?quotationCode=${code}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const t3 = await r3.text();
  results.quotationFipeApi = { status: r3.status, body: safeParse(t3) };

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return s.substring(0, 1500); }
}
