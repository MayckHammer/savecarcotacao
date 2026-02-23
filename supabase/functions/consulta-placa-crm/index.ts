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

    // 2. Add tag 23323 ("30 seg") — response is plain text
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

    // 3. Open inspection — response is plain text
    try {
      const inspRes = await fetch("https://api.powercrm.com.br/api/quotation/open-inspection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ quotationCode }),
      });
      const inspText = await inspRes.text();
      console.log("Open inspection response:", inspText);
    } catch (e) {
      console.error("Error opening inspection:", e);
    }

    // 4. Wait 5 seconds for DENATRAN async processing
    await new Promise((r) => setTimeout(r, 5000));

    // 5. Try negotiation endpoint first (has vehicle data after DENATRAN lookup)
    let vehicle = null;

    if (negotiationCode) {
      try {
        const negRes = await fetch(
          `https://api.powercrm.com.br/api/negotiation/${negotiationCode}`,
          { headers: { "Authorization": `Bearer ${token}` } }
        );
        if (negRes.ok) {
          const negData = await negRes.json();
          console.log("Negotiation details:", JSON.stringify(negData));

          const v = negData?.vehicle || negData?.data?.vehicle || {};
          const brand = v?.brand || v?.brandName || v?.marca || negData?.carModel || "";
          const model = v?.model || v?.modelName || v?.modelo || negData?.carModel || "";
          const year = v?.year || v?.ano || v?.modelYear || negData?.carModelYear || "";
          const color = v?.color || v?.cor || negData?.color || "";
          const fipeCode = v?.fipeCode || v?.cdFp || "";
          const city = v?.city || v?.cidade || "";

          let type = "carro";
          const modelLower = (model + " " + brand).toLowerCase();
          if (modelLower.match(/moto|honda cg|yamaha|suzuki|kawasaki|dafra|shineray|haojue|bmw gs/)) {
            type = "moto";
          } else if (modelLower.match(/caminh|truck|iveco|scania|volvo fh|man tgx/)) {
            type = "caminhao";
          }

          if (brand || model || year) {
            vehicle = { brand, model, year: String(year), color, type, city, fipeCode };
          }
        }
      } catch (e) {
        console.error("Error fetching negotiation details:", e);
      }
    }

    // 6. Attempt 2: quotationFipeApi (FIPE vehicle data)
    if (!vehicle) {
      try {
        const fipeRes = await fetch(
          `https://api.powercrm.com.br/api/quotation/quotationFipeApi?quotationCode=${quotationCode}`,
          { headers: { "Authorization": `Bearer ${token}` } }
        );
        const fipeText = await fipeRes.text();
        console.log("quotationFipeApi status:", fipeRes.status, "body:", fipeText);
        if (fipeRes.ok) {
          const fipeData = JSON.parse(fipeText);

          // Try to extract vehicle info from FIPE response
          const items = Array.isArray(fipeData) ? fipeData : fipeData?.data ? (Array.isArray(fipeData.data) ? fipeData.data : [fipeData.data]) : [fipeData];
          for (const item of items) {
            const brand = item?.brand || item?.marca || item?.brandName || "";
            const model = item?.model || item?.modelo || item?.modelName || item?.name || "";
            const year = item?.year || item?.ano || item?.modelYear || "";
            const color = item?.color || item?.cor || "";
            const fipeCode = item?.fipeCode || item?.cdFp || item?.code || "";

            if (brand || model || year) {
              let type = "carro";
              const modelLower = (model + " " + brand).toLowerCase();
              if (modelLower.match(/moto|honda cg|yamaha|suzuki|kawasaki|dafra|shineray|haojue|bmw gs/)) {
                type = "moto";
              } else if (modelLower.match(/caminh|truck|iveco|scania|volvo fh|man tgx/)) {
                type = "caminhao";
              }
              vehicle = { brand, model, year: String(year), color, type, city: "", fipeCode };
              break;
            }
          }
        }
      } catch (e) {
        console.error("Error fetching quotationFipeApi:", e);
      }
    }

    // 7. Fallback: quotation endpoint
    if (!vehicle) {
      try {
        const qttnRes = await fetch(`https://api.powercrm.com.br/api/quotation/${quotationCode}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });

        if (qttnRes.ok) {
          const qttnData = await qttnRes.json();
          console.log("Quotation details (fallback):", JSON.stringify(qttnData));

          const v = qttnData?.vehicle || qttnData?.data?.vehicle || {};
          const brand = v?.brand || v?.brandName || v?.marca || qttnData?.carModel || "";
          const model = v?.model || v?.modelName || v?.modelo || qttnData?.carModel || "";
          const year = v?.year || v?.ano || v?.modelYear || qttnData?.carModelYear || "";
          const color = v?.color || v?.cor || qttnData?.color || "";
          const fipeCode = v?.fipeCode || v?.cdFp || "";
          const city = v?.city || v?.cidade || "";

          let type = "carro";
          const modelLower = (model + " " + brand).toLowerCase();
          if (modelLower.match(/moto|honda cg|yamaha|suzuki|kawasaki|dafra|shineray|haojue|bmw gs/)) {
            type = "moto";
          } else if (modelLower.match(/caminh|truck|iveco|scania|volvo fh|man tgx/)) {
            type = "caminhao";
          }

          if (brand || model || year) {
            vehicle = { brand, model, year: String(year), color, type, city, fipeCode };
          }
        }
      } catch (e) {
        console.error("Error fetching quotation details:", e);
      }
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
