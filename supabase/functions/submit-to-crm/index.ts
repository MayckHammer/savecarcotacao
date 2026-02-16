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

    // Build observation with full vehicle details
    const observation = [
      `Marca: ${vehicle.brand || "N/A"}`,
      `Modelo: ${vehicle.model || "N/A"}`,
      `Ano: ${vehicle.year || "N/A"}`,
      `Cor: ${vehicle.color || "N/A"}`,
      `Valor FIPE: ${vehicle.fipeFormatted || "N/A"}`,
      `Uso: ${vehicle.usage || "N/A"}`,
      `CPF: ${personal.cpf || "N/A"}`,
      `Email: ${personal.email || "N/A"}`,
      `Endereço: ${address.street || ""}, ${address.number || "S/N"} - ${address.neighborhood || ""}, ${address.city || ""}/${address.state || ""}`,
      `CEP: ${address.cep || "N/A"}`,
      `Plano: ${plan?.billingPeriod === "annual" ? "Anual" : "Mensal"}`,
      `Valor: R$ ${plan?.total?.toFixed(2) || "N/A"}`,
      plan?.coverages ? `Coberturas: ${plan.coverages.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    // Resolve state code from Power CRM API
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
          // Fetch city
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

    // Phone: digits only
    const phone = (personal.phone || "").replace(/\D/g, "");
    const cpfDigits = (personal.cpf || "").replace(/\D/g, "");

    // Build CRM payload
    const crmPayload: Record<string, unknown> = {
      companyHash: "Sav3c4r1Czwe3",
      formCode: "3QgRKwOx",
      pipelineColumn: "1",
      funnelStage: "6834bcae-ecd3-4387-8bc2-dfd03dbaea0c",
      pwrClntNm: personal.name || "",
      pwrCltPhn: phone,
      pwrClntCpf: cpfDigits,
      pwrClntEml: personal.email || "",
      pwrVhclPlt: vehicle.plate || "",
      pwrVhclTyp: VEHICLE_TYPE_MAP[vehicle.type?.toLowerCase()] || 1,
      pwrVhclSWrk: vehicle.usage === "aplicativo",
      observation,
    };

    if (stateCode) crmPayload.pwrStt = stateCode;
    if (cityCode) crmPayload.pwrCt = cityCode;

    // Submit to Power CRM
    let crmSuccess = false;
    let crmQuotationCode: string | null = null;
    let crmError: string | null = null;

    try {
      const crmRes = await fetch("https://app.powercrm.com.br/svQttnDynmcFrm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(crmPayload),
      });

      const crmData = await crmRes.json();
      console.log("CRM response:", crmData);

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
