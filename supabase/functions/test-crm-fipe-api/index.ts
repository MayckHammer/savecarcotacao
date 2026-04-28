const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const quotationCode = url.searchParams.get("quotationCode") || "q11LLmpq";
  const token = Deno.env.get("POWERCRM_API_TOKEN");

  if (!token) {
    return new Response(
      JSON.stringify({ error: "POWERCRM_API_TOKEN not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const targetUrl = `https://api.powercrm.com.br/api/quotation/quotationFipeApi?quotationCode=${encodeURIComponent(quotationCode)}`;
  console.log(`Calling: ${targetUrl}`);

  try {
    const crmRes = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const text = await crmRes.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* keep raw text */ }

    const headersObj = Object.fromEntries(crmRes.headers.entries());
    console.log(`Status: ${crmRes.status}`);
    console.log(`Headers: ${JSON.stringify(headersObj)}`);
    console.log(`Body (first 3000): ${text.substring(0, 3000)}`);

    return new Response(
      JSON.stringify({
        status: crmRes.status,
        ok: crmRes.ok,
        url: targetUrl,
        headers: headersObj,
        body,
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Fetch error:", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
