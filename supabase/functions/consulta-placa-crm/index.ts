const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { personal, plate } = await req.json();
    const token = Deno.env.get("POWERCRM_API_TOKEN");

    if (!token) {
      return new Response(JSON.stringify({ error: "POWERCRM_API_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = (personal.phone || "").replace(/\D/g, "");
    const cpfDigits = (personal.cpf || "").replace(/\D/g, "");

    // 1. Create minimal quotation in CRM
    const crmPayload = {
      name: personal.name || "",
      phone,
      email: personal.email || "",
      registration: cpfDigits,
      plts: plate || "",
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

    // 2. Add tag 23323 ("30 seg")
    try {
      const tagRes = await fetch("https://api.powercrm.com.br/api/quotation/add-tag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ quotationCode, tagId: 23323 }),
      });
      const tagData = await tagRes.json();
      console.log("Tag response:", JSON.stringify(tagData));
    } catch (e) {
      console.error("Error adding tag:", e);
    }

    // 3. Open inspection
    try {
      const inspRes = await fetch("https://api.powercrm.com.br/api/quotation/open-inspection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ quotationCode }),
      });
      const inspData = await inspRes.json();
      console.log("Open inspection response:", JSON.stringify(inspData));
    } catch (e) {
      console.error("Error opening inspection:", e);
    }

    // 4. GET quotation details to extract vehicle data
    let vehicle = null;
    try {
      const qttnRes = await fetch(`https://api.powercrm.com.br/api/quotation/${quotationCode}`, {
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (qttnRes.ok) {
        const qttnData = await qttnRes.json();
        console.log("Quotation details:", JSON.stringify(qttnData));

        // Extract vehicle data from quotation response
        const v = qttnData?.vehicle || qttnData?.data?.vehicle || qttnData;
        const negotiation = qttnData?.negotiation || qttnData?.data?.negotiation || {};

        // Try multiple possible field paths
        const brand = v?.brand || v?.brandName || v?.marca || negotiation?.brand || "";
        const model = v?.model || v?.modelName || v?.modelo || negotiation?.model || "";
        const year = v?.year || v?.ano || v?.modelYear || negotiation?.year || "";
        const color = v?.color || v?.cor || negotiation?.color || "";
        const fipeCode = v?.fipeCode || v?.cdFp || "";
        const city = v?.city || v?.cidade || "";

        // Determine vehicle type from model/brand hints
        let type = "carro";
        const modelLower = (model + " " + brand).toLowerCase();
        if (modelLower.match(/moto|honda cg|yamaha|suzuki|kawasaki|dafra|shineray|haojue|bmw gs/)) {
          type = "moto";
        } else if (modelLower.match(/caminh|truck|iveco|scania|volvo fh|man tgx/)) {
          type = "caminhao";
        }

        vehicle = { brand, model, year: String(year), color, type, city, fipeCode };
      }
    } catch (e) {
      console.error("Error fetching quotation details:", e);
    }

    return new Response(JSON.stringify({
      quotationCode,
      negotiationCode,
      vehicle,
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
