import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UF_MAP: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul",
  MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco",
  PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul",
  SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo", TO: "Tocantins",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { personal, vehicle, address, plan } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sessionId = crypto.randomUUID();

    // Save quote to DB
    const { error: dbError } = await supabase.from("quotes").insert({
      session_id: sessionId,
      personal_data: personal,
      vehicle_data: vehicle,
      address_data: address,
      plan_data: plan || {},
      inspection_status: "pending",
      crm_submitted: false,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to save quote", session_id: sessionId }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Phone & CPF: digits only
    const phone = (personal.phone || "").replace(/\D/g, "");
    const cpfDigits = (personal.cpf || "").replace(/\D/g, "");

    const planName = plan?.planName || "COMPLETO";
    const totalValue = plan?.total || 0;
    const billingLabel = plan?.billingPeriod === "annual" ? "Anual" : "Mensal";

    // Build rich observation with TAG 30 seg
    const observation = [
      `[TAG: 30 seg]`,
      ``,
      `=== PLANO: ${planName} ===`,
      `Valor: R$ ${totalValue ? totalValue.toFixed(2).replace(".", ",") : "A definir"}/${billingLabel === "Anual" ? "ano" : "mês"}`,
      `Forma de pagamento: ${plan?.paymentMethod === "credit" ? "Cartão de Crédito" : "PIX / Boleto"}`,
      ``,
      `=== ASSOCIADO ===`,
      `Nome: ${personal.name || "N/A"}`,
      `Telefone: ${personal.phone || "N/A"}`,
      `CPF: ${personal.cpf || "N/A"}`,
      `Email: ${personal.email || "N/A"}`,
      ``,
      `=== VEÍCULO ===`,
      `Marca: ${vehicle.brand || "N/A"}`,
      `Modelo: ${vehicle.model || "N/A"}`,
      `Ano: ${vehicle.year || "N/A"}`,
      `Cor: ${vehicle.color || "N/A"}`,
      `Placa: ${vehicle.plate || "N/A"}`,
      `Valor FIPE: ${vehicle.fipeFormatted || "N/A"}`,
      `Uso: ${vehicle.usage || "N/A"}`,
      ``,
      `=== ENDEREÇO ===`,
      `${address.street || ""}, ${address.number || "S/N"} — ${address.neighborhood || ""}, ${address.city || ""}/${address.state || ""}`,
      `CEP: ${address.cep || "N/A"}`,
      ``,
      `=== COBERTURAS ===`,
      plan?.coverages ? plan.coverages.join(", ") : "A definir",
    ].join("\n");

    // Resolve state/city codes
    let cityCode: number | null = null;

    try {
      const stateName = UF_MAP[address.state?.toUpperCase()] || address.state;
      const statesRes = await fetch("https://utilities.powercrm.com.br/state/stt");
      if (statesRes.ok) {
        const states = await statesRes.json();
        const found = states.find((s: { nm: string; id: number }) =>
          s.nm?.toLowerCase() === stateName?.toLowerCase()
        );
        if (found) {
          const citiesRes = await fetch(`https://utilities.powercrm.com.br/city/ct?st=${found.id}`);
          if (citiesRes.ok) {
            const cities = await citiesRes.json();
            const cityFound = cities.find((c: { nm: string; id: number }) =>
              c.nm?.toLowerCase() === address.city?.toLowerCase()
            );
            if (cityFound) cityCode = cityFound.id;
          }
        }
      }
    } catch (e) {
      console.error("Error fetching state/city codes:", e);
    }

    // Build CRM payload
    const crmPayload: Record<string, unknown> = {
      name: personal.name || "",
      phone: phone,
      email: personal.email || "",
      registration: cpfDigits,
      plts: vehicle.plate || "",
      workVehicle: vehicle.usage === "aplicativo",
      observation,
    };

    if (cityCode) crmPayload.city = cityCode;

    console.log("CRM payload:", JSON.stringify(crmPayload, null, 2));

    // Submit to Power CRM
    const token = Deno.env.get("POWERCRM_API_TOKEN");
    let crmSuccess = false;
    let crmQuotationCode: string | null = null;
    let crmNegotiationCode: string | null = null;
    let crmError: string | null = null;

    try {
      const crmRes = await fetch("https://api.powercrm.com.br/api/quotation/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(crmPayload),
      });

      const crmData = await crmRes.json();
      console.log("CRM response:", JSON.stringify(crmData, null, 2));

      if (crmData.success) {
        crmSuccess = true;
        crmQuotationCode = crmData.qttnCd || null;
        crmNegotiationCode = crmData.ngttnCd || null;

        // Try to add tag "30 seg" via dedicated endpoint
        if (crmQuotationCode) {
          try {
            const tagRes = await fetch("https://api.powercrm.com.br/api/quotation/add-tag", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
              body: JSON.stringify({
                quotationCode: crmQuotationCode,
                tag: "30 seg",
              }),
            });
            const tagData = await tagRes.json();
            console.log("Tag response:", JSON.stringify(tagData, null, 2));
          } catch (tagErr) {
            console.error("Error adding tag:", tagErr);
          }
        }

        // Try to fetch inspection link from negotiation
        if (crmNegotiationCode) {
          try {
            const negRes = await fetch(`https://api.powercrm.com.br/api/negotiation/${crmNegotiationCode}`, {
              headers: { "Authorization": `Bearer ${token}` },
            });
            if (negRes.ok) {
              const negData = await negRes.json();
              console.log("Negotiation data:", JSON.stringify(negData, null, 2));
              // Look for inspection link in the negotiation response
              const inspLink = negData?.inspectionLink || negData?.inspection_link || negData?.data?.inspectionLink || null;
              if (inspLink) {
                await supabase.from("quotes").update({
                  inspection_link: inspLink,
                  inspection_status: "released",
                }).eq("session_id", sessionId);
              }
            }
          } catch (negErr) {
            console.error("Error fetching negotiation:", negErr);
          }
        }
      } else {
        crmError = crmData.message || "CRM submission failed";
      }
    } catch (e) {
      crmError = `CRM request error: ${e.message}`;
      console.error("CRM submission error:", e);
    }

    // Update quote with CRM result
    await supabase.from("quotes").update({
      crm_submitted: crmSuccess,
      crm_quotation_code: crmQuotationCode,
      crm_error: crmError,
    }).eq("session_id", sessionId);

    return new Response(
      JSON.stringify({
        session_id: sessionId,
        crm_submitted: crmSuccess,
        crm_quotation_code: crmQuotationCode,
        crm_negotiation_code: crmNegotiationCode,
        crm_error: crmError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
