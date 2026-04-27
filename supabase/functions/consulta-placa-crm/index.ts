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
        // "R$ 45.000,00" or "45000.00"
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
