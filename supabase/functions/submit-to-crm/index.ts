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

const VEHICLE_TYPE_MAP: Record<string, number> = {
  carro: 1, moto: 2, caminhao: 3, caminhão: 3,
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
      plan_data: plan,
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

    // Build rich observation
    const observation = [
      `=== PLANO: ${planName} ===`,
      `Valor: R$ ${totalValue.toFixed(2).replace(".", ",")}/${billingLabel === "Anual" ? "ano" : "mês"}`,
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
      plan?.coverages ? plan.coverages.join(", ") : "N/A",
    ].join("\n");

    // Resolve state/city codes
    let stateCode: number | null = null;
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
          stateCode = found.id;
          const citiesRes = await fetch(`https://utilities.powercrm.com.br/city/ct?st=${stateCode}`);
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

    // Build CRM payload (API REST oficial — sem companyHash/formCode)
    const crmPayload: Record<string, unknown> = {
      pwrClntNm: personal.name || "",
      pwrClntPhn: phone,
      pwrClntCpf: cpfDigits,
      pwrClntEml: personal.email || "",
      pwrVhclPlt: vehicle.plate || "",
      pwrVhclTyp: VEHICLE_TYPE_MAP[vehicle.type?.toLowerCase()] || 1,
      pwrVhclSWrk: vehicle.usage === "aplicativo",
      pwrQttnVl: totalValue,
      observation,
    };

    if (stateCode) crmPayload.pwrStt = stateCode;
    if (cityCode) crmPayload.pwrCt = cityCode;

    // Log full payload for debugging
    console.log("CRM payload:", JSON.stringify(crmPayload, null, 2));

    // Submit to Power CRM (API REST oficial)
    const token = Deno.env.get("POWERCRM_API_TOKEN");
    let crmSuccess = false;
    let crmQuotationCode: string | null = null;
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
      JSON.stringify({ session_id: sessionId, crm_submitted: crmSuccess, crm_error: crmError }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
